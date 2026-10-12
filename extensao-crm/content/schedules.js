// Mensagens agendadas: telas (lista, criar/editar, relatório, configurações)
// e o motor que envia cada mensagem na hora marcada.
CRM.schedules = (() => {
  const { esc, uid, toTimestamp, todayISO, formatDateTime, formatDuration, mediaKind, firstName } = CRM.util;
  const { icon, modal, toast, attachEmoji, textareaHTML, infoHTML } = CRM.ui;
  const store = CRM.store;

  const LATE_MS = 5 * 60 * 1000; // mais que isso de atraso = o WhatsApp estava fechado no horário
  const STUCK_MS = 5 * 60 * 1000;

  const RECURRENCES = [
    ['none', 'Nenhuma selecionada'],
    ['daily', 'Diária'],
    ['weekly', 'Semanal'],
    ['biweekly', 'Quinzenal'],
    ['monthly', 'Mensal'],
    ['quarterly', 'Trimestral'],
    ['semiannual', 'Semestral'],
    ['annual', 'Anual'],
  ];
  const STEP = {
    daily: { days: 1 },
    weekly: { days: 7 },
    biweekly: { days: 15 },
    monthly: { months: 1 },
    quarterly: { months: 3 },
    semiannual: { months: 6 },
    annual: { months: 12 },
  };

  const TYPE_ICON = { text: 'text', media: 'image', audio: 'audio', quick: 'bolt' };
  const STATUS_LABEL = { pending: 'Agendada', sending: 'Enviando…', sent: 'Enviada', error: 'Erro', late: 'Não enviada', skipped: 'Pulada' };

  // ---------- Recorrência ----------
  function stepOf(s) {
    if (s.recurrence === 'custom') return { days: Math.max(1, parseInt(s.customDays, 10) || 1) };
    return STEP[s.recurrence] || null;
  }

  function recurrenceLabel(s) {
    if (s.recurrence === 'custom') {
      const n = Math.max(1, parseInt(s.customDays, 10) || 1);
      return n === 1 ? 'Todo dia' : `A cada ${n} dias`;
    }
    const found = RECURRENCES.find(([v]) => v === s.recurrence);
    return found && s.recurrence !== 'none' ? found[1] : '';
  }

  function occurrence(s, k) {
    const base = new Date(toTimestamp(s.date, s.time));
    const step = stepOf(s);
    if (step.months) {
      const months = base.getMonth() + step.months * k;
      const target = new Date(base.getFullYear(), months, 1, base.getHours(), base.getMinutes());
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      target.setDate(Math.min(base.getDate(), lastDay));
      return target.getTime();
    }
    const d = new Date(base);
    d.setDate(d.getDate() + step.days * k);
    return d.getTime();
  }

  // Próximo horário depois de "after" (pula os que já passaram).
  function nextOccurrence(s, after) {
    const step = stepOf(s);
    if (!step) return null;
    let k = 1;
    if (step.days) {
      const anchor = toTimestamp(s.date, s.time);
      k = Math.max(1, Math.floor((after - anchor) / (step.days * 86400000)) - 1);
    }
    for (let i = 0; i < 100000; i++, k++) {
      const t = occurrence(s, k);
      if (t > after) return t;
    }
    return null;
  }

  // ---------- Envio ----------
  function fillVariables(text, s) {
    return String(text || '').replace(/\{nome\}/gi, firstName(s.chatName));
  }

  async function deliver(s) {
    const text = fillVariables(s.text, s).trim();
    if (s.type === 'text') {
      if (!text) throw new Error('Mensagem vazia.');
      await CRM.wa.sendText(s.chatId, text);
      return;
    }
    if (s.type === 'media') {
      const media = await store.getMedia(s.mediaId);
      if (!media) throw new Error('O arquivo desta mensagem não foi encontrado.');
      const kind = mediaKind(media.mime);
      if (kind === 'audio') {
        await CRM.wa.sendFile(s.chatId, media.dataUrl, { type: 'audio', filename: media.name });
        if (text) await CRM.wa.sendText(s.chatId, text);
      } else {
        await CRM.wa.sendFile(s.chatId, media.dataUrl, {
          type: kind,
          caption: text || undefined,
          filename: media.name,
        });
      }
      return;
    }
    if (s.type === 'audio') {
      const media = await store.getMedia(s.audioId);
      if (!media) throw new Error('O áudio desta mensagem não foi encontrado.');
      await CRM.wa.sendFile(s.chatId, media.dataUrl, { type: 'audio', isPtt: true, waveform: true });
      if (text) await CRM.wa.sendText(s.chatId, text);
      return;
    }
    if (s.type === 'quick') {
      const quick = await CRM.quick.get(s.quickReplyId);
      if (!quick) throw new Error('A mensagem rápida escolhida não existe mais (foi excluída?).');
      await CRM.quickRun.execute(quick, { chatId: s.chatId, chatName: s.chatName });
      return;
    }
    throw new Error('Tipo de mensagem desconhecido.');
  }

  function preview(s) {
    if (s.type === 'media') return (s.text || '').trim() || '📎 ' + (s.mediaName || 'Arquivo');
    if (s.type === 'audio') return '🎤 Áudio' + (s.audioSeconds ? ' (' + formatDuration(s.audioSeconds) + ')' : '') + ((s.text || '').trim() ? ' + ' + s.text.trim() : '');
    if (s.type === 'quick') return '⚡ ' + (s.quickTitle || 'Mensagem rápida');
    return (s.text || '').trim();
  }

  async function report(s, ok, error, extra = {}) {
    await store.addReport({
      id: uid(),
      at: Date.now(),
      scheduleId: s.id,
      chatName: s.chatName,
      chatPhone: s.chatPhone,
      title: s.title,
      preview: preview(s).slice(0, 140),
      ok,
      error: error || '',
      ...extra,
    });
  }

  // Marca o agendamento como "enviando" para não mandar duas vezes.
  async function claim(id, expectedNextAt) {
    let claimed = false;
    await store.updateSchedules((list) => {
      const s = list.find((x) => x.id === id);
      if (s && s.status === 'pending' && s.nextAt === expectedNextAt) {
        s.status = 'sending';
        s.sendingAt = Date.now();
        claimed = true;
      }
      return list;
    });
    return claimed;
  }

  async function finish(id, ok, error) {
    await store.updateSchedules((list) => {
      const s = list.find((x) => x.id === id);
      if (!s) return list;
      const now = Date.now();
      s.lastRunAt = now;
      s.lastResult = ok ? 'sent' : 'error';
      s.lastError = error || '';
      if (ok) s.sentCount = (s.sentCount || 0) + 1;
      const next = nextOccurrence(s, now);
      if (next) {
        s.nextAt = next;
        s.status = 'pending';
      } else {
        s.status = ok ? 'sent' : error && error.startsWith('Não enviada') ? 'late' : 'error';
      }
      delete s.sendingAt;
      return list;
    });
  }

  let busy = false;
  async function tick() {
    if (busy || !CRM.wa.state.ready) return;
    busy = true;
    try {
      const now = Date.now();
      const settings = await store.getSettings();

      // Envio que ficou pela metade (ex.: a página foi fechada no meio)
      await store.updateSchedules((list) => {
        list.forEach((s) => {
          if (s.status === 'sending' && now - (s.sendingAt || 0) > STUCK_MS) {
            s.status = 'error';
            s.lastError = 'O envio foi interrompido (a página foi fechada?). Confira a conversa.';
          }
        });
        return list;
      });

      const due = (await store.getSchedules())
        .filter((s) => s.status === 'pending' && s.nextAt <= now)
        .sort((a, b) => a.nextAt - b.nextAt);

      for (const s of due) {
        if (!(await claim(s.id, s.nextAt))) continue;
        const late = Date.now() - s.nextAt > LATE_MS;
        if (late && settings.lateMode === 'skip') {
          const msg = 'Não enviada: o WhatsApp Web estava fechado no horário (' + formatDateTime(s.nextAt) + ').';
          await report(s, false, msg, { skipped: true });
          await finish(s.id, false, msg);
          continue;
        }
        try {
          await deliver(s);
          await report(s, true, '', late ? { late: true, plannedAt: s.nextAt } : {});
          await finish(s.id, true);
          toast('Mensagem agendada enviada para ' + (s.chatName || 'o contato') + '.', 'ok');
        } catch (err) {
          await report(s, false, err.message);
          await finish(s.id, false, err.message);
          toast('Falha ao enviar mensagem agendada: ' + err.message, 'err');
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch (err) {
      console.warn('[CRM] erro no agendador', err);
    } finally {
      busy = false;
    }
  }

  async function sendNow(id) {
    const s = (await store.getSchedules()).find((x) => x.id === id);
    if (!s) return;
    try {
      await deliver(s);
      await report(s, true, '', { manual: true });
      if (!stepOf(s)) {
        await store.updateSchedules((list) => {
          const item = list.find((x) => x.id === id);
          if (item) {
            item.status = 'sent';
            item.lastRunAt = Date.now();
            item.lastResult = 'sent';
            item.sentCount = (item.sentCount || 0) + 1;
          }
          return list;
        });
      }
      toast('Mensagem enviada.', 'ok');
    } catch (err) {
      await report(s, false, err.message, { manual: true });
      toast('Falha ao enviar: ' + err.message, 'err');
    }
  }

  // ---------- Contadores ----------
  async function pendingCount(chatId) {
    if (!chatId) return 0;
    return (await store.getSchedules()).filter((s) => !s.renewalId && s.chatId === chatId && (s.status === 'pending' || s.status === 'sending')).length;
  }

  async function unseenReports() {
    const seenAt = await store.get('reportsSeenAt', 0);
    return (await store.getReports()).filter((r) => r.at > seenAt).length;
  }

  // ---------- Tela: lista ----------
  let showAll = false;

  // fresh: aberta pelo botão da conversa → mostra só o contato aberto ("Exibir Todos" volta a desligar).
  async function openList(opts) {
    if (opts && opts.fresh) showAll = false;
    const chat = CRM.wa.state.activeChat;
    if (!CRM.wa.state.ready) {
      modal(`<div class="modal-head"><h2 class="modal-title">Mensagens Agendadas</h2></div>
        <div class="empty"><p>O WhatsApp Web ainda está carregando. Espere alguns segundos e tente de novo.</p></div>`);
      return;
    }
    const all = (await store.getSchedules()).filter((s) => !s.renewalId);
    const list = (showAll || !chat ? all : all.filter((s) => s.chatId === chat.id)).sort((a, b) => {
      const order = (s) => (s.status === 'pending' || s.status === 'sending' ? 0 : 1);
      return order(a) - order(b) || (order(a) === 0 ? a.nextAt - b.nextAt : (b.lastRunAt || 0) - (a.lastRunAt || 0));
    });
    const unseen = await unseenReports();

    const head = `<div class="modal-head">
      <h2 class="modal-title">Mensagens Agendadas</h2>
      <div class="head-actions">
        <button class="chip-btn" data-report>Relatório ${icon('report', 13, 2)}<span class="chip-badge">${unseen}</span></button>
        <button class="pill-btn ${showAll ? 'on' : ''}" data-all>${showAll ? 'Exibindo Todos' : 'Exibir Todos'} ${icon('eye', 13, 2)}</button>
        <button class="icon-btn" data-settings title="Configurações">${icon('gear', 18)}</button>
      </div>
    </div>`;

    const body = list.length
      ? `<div class="list">${list.map((s) => itemHTML(s, showAll || !chat)).join('')}</div>
         <div class="center"><button class="btn" data-add ${chat ? '' : 'disabled'}>Adicionar</button></div>`
      : `<div class="empty">
          <div class="empty-icon">${icon('schedule', 24)}</div>
          <h3>Nenhum agendamento encontrado</h3>
          <p>Não há agendamentos programados no momento. Para adicionar um novo agendamento, clique no botão de criação.</p>
          <button class="btn" data-add ${chat ? '' : 'disabled'}>Adicionar</button>
        </div>`;

    const el = modal(head + body, { wide: true });
    el.querySelector('[data-report]').addEventListener('click', () => openReport(openList));
    el.querySelector('[data-settings]').addEventListener('click', () => openSettings(openList));
    el.querySelector('[data-all]').addEventListener('click', () => {
      showAll = !showAll;
      openList();
    });
    el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => openForm()));
    el.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => openForm(all.find((s) => s.id === b.dataset.edit)))
    );
    el.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Excluir este agendamento?')) return;
        const s = all.find((x) => x.id === b.dataset.del);
        await store.deleteSchedule(s.id);
        await store.deleteMedia(s.mediaId);
        await store.deleteMedia(s.audioId);
        openList();
      })
    );
    el.querySelectorAll('[data-send]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Enviar esta mensagem agora?')) return;
        b.disabled = true;
        await sendNow(b.dataset.send);
        openList();
      })
    );
  }

  function itemHTML(s, withContact) {
    const pending = s.status === 'pending' || s.status === 'sending';
    const title = s.title || preview(s) || 'Mensagem';
    const sub = s.title ? preview(s) : '';
    const when = pending ? formatDateTime(s.nextAt) : s.lastRunAt ? formatDateTime(s.lastRunAt) : formatDateTime(s.nextAt);
    const rec = recurrenceLabel(s);
    const status = s.status === 'pending' && s.lastResult === 'error' ? 'error' : s.status;
    const statusText = s.status === 'pending' && s.lastResult === 'error' ? 'Último envio falhou' : STATUS_LABEL[s.status] || s.status;
    return `<div class="item">
      <div class="item-icon">${icon(TYPE_ICON[s.type] || 'text', 18)}</div>
      <div class="item-body">
        <div class="item-title">${esc(title)}</div>
        ${sub ? `<div class="item-text clamp">${esc(sub)}</div>` : ''}
        <div class="item-meta">
          <span class="status ${status}">${esc(statusText)}</span>
          <span>${pending ? '📅 ' : '✓ '}${esc(when)}</span>
          ${rec ? `<span>🔁 ${esc(rec)}</span>` : ''}
          ${withContact ? `<span>👤 ${esc(s.chatName || s.chatPhone || 'Contato')}</span>` : ''}
        </div>
        ${s.lastError && s.status !== 'sent' ? `<div class="item-meta" style="color:#b03a35">${esc(s.lastError)}</div>` : ''}
      </div>
      <div class="item-actions">
        ${pending ? `<button class="icon-btn" data-send="${s.id}" title="Enviar agora">${icon('send', 17)}</button>` : ''}
        <button class="icon-btn" data-edit="${s.id}" title="Editar">${icon('edit', 17)}</button>
        <button class="icon-btn danger" data-del="${s.id}" title="Excluir">${icon('trash', 17)}</button>
      </div>
    </div>`;
  }

  // ---------- Tela: criar / editar ----------
  // preset: valores iniciais de um agendamento novo (ex.: vindo do menu ••• de uma resposta rápida).
  async function openForm(existing, preset) {
    const chat = CRM.wa.state.activeChat;
    if (!existing && !chat) return toast('Abra uma conversa para agendar uma mensagem.', 'err');

    const editing = !!existing;
    const s = existing || preset || {};
    const state = {
      type: s.type || 'text',
      media: null, // { dataUrl, name, mime } novo arquivo escolhido
      mediaName: s.mediaName || '',
      mediaMime: s.mediaMime || '',
      audio: null, // { dataUrl, seconds } novo áudio
      audioSeconds: s.audioSeconds || 0,
      hasStoredMedia: !!s.mediaId,
      hasStoredAudio: !!s.audioId,
      recorder: null,
      quickId: s.quickReplyId || '',
    };
    let replies = await CRM.quick.list();

    const custom = s.recurrence === 'custom';
    // Ao editar um agendamento pendente, parte do próximo horário (o original pode já ter passado).
    let dateValue = s.date || todayISO();
    let timeValue = s.time || '';
    if (editing && s.status === 'pending' && s.nextAt) {
      const d = new Date(s.nextAt);
      const p = CRM.util.pad;
      dateValue = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      timeValue = `${p(d.getHours())}:${p(d.getMinutes())}`;
    }
    const msgInfo = infoHTML('Use <b>{nome}</b> para colocar o primeiro nome do contato. Formatação do WhatsApp: *negrito*, _itálico_, ~riscado~.');

    const el = modal(
      `<div class="modal-head"><h2 class="modal-title">${editing ? 'Editar Agendamento' : 'Criar Agendamento'}</h2></div>
      <div class="field">
        <div class="label">Título (Opcional)</div>
        <input class="input" name="title" placeholder="Insira aqui o título" value="${esc(s.title || '')}">
      </div>
      <div class="field">
        <div class="label">Escolha um tipo</div>
        <div class="tabs">
          <button class="tab" data-type="text">Criar texto</button>
          <button class="tab" data-type="media">Mídia</button>
          <button class="tab" data-type="audio">Áudio</button>
          <button class="tab" data-type="quick">Selecionar mensagem rápida</button>
        </div>
      </div>
      <div class="field" data-pane></div>
      <div class="row field">
        <div><div class="label">Data</div><input class="input" type="date" name="date" value="${esc(dateValue)}"></div>
        <div><div class="label">Hora</div><input class="input" type="time" name="time" value="${esc(timeValue)}"></div>
      </div>
      <div class="field" data-rec-select ${custom ? 'hidden' : ''}>
        <div class="label">Recorrência</div>
        <select class="select" name="recurrence">
          ${RECURRENCES.map(([v, l]) => `<option value="${v}" ${(s.recurrence || 'none') === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <button type="button" class="check ${custom ? 'on' : ''}" data-custom><span class="dot">${icon('check', 11, 3)}</span>Adicionar recorrência personalizada</button>
      <div class="field" data-rec-custom style="margin-top:14px" ${custom ? '' : 'hidden'}>
        <div class="label">Recorrência Personalizada</div>
        <input class="input" type="number" min="1" step="1" name="customDays" placeholder="Insira de quantos em quantos dias deseja que a recorrência seja feita" value="${esc(s.customDays || '')}">
      </div>
      <div class="error-msg" data-error></div>
      <div class="actions"><button class="btn" data-cancel>Cancelar</button><button class="btn" data-save>${editing ? 'Salvar' : 'Criar'}</button></div>`,
      { onClose: stopRecording }
    );

    const pane = el.querySelector('[data-pane]');
    const errorBox = el.querySelector('[data-error]');
    let text = s.text || '';

    function stopRecording() {
      if (state.recorder) {
        state.recorder.cancel();
        state.recorder = null;
      }
    }

    function bindTextarea() {
      const area = pane.querySelector('textarea');
      if (!area) return;
      area.addEventListener('input', () => (text = area.value));
      attachEmoji(pane.querySelector('[data-emoji]'), area);
    }

    function mediaPreviewHTML() {
      if (state.media) {
        if (state.media.mime.startsWith('image/')) return `<img class="thumb" src="${state.media.dataUrl}" alt="">`;
        return `<div class="file-chip">${icon('file', 16)}<span>${esc(state.media.name)}</span></div>`;
      }
      if (state.hasStoredMedia) return `<div class="file-chip">${icon('file', 16)}<span>${esc(state.mediaName)}</span></div>`;
      return '';
    }

    function renderPane() {
      el.querySelectorAll('[data-type]').forEach((b) => b.classList.toggle('on', b.dataset.type === state.type));
      const area = textareaHTML({ name: 'text', placeholder: 'Insira sua mensagem', value: text });

      if (state.type === 'text') {
        pane.innerHTML = `<div class="label">Mensagem ${msgInfo}</div>${area}`;
      } else if (state.type === 'media') {
        pane.innerHTML = `<div class="import-row">
            <button type="button" class="import-card" data-import>${icon('download', 22, 2)}Importar</button>
            <div style="flex:1;min-width:0"><div class="label">Mensagem ${msgInfo}</div>${area}</div>
          </div>
          <input type="file" hidden data-file>
          <div data-media-preview style="margin-top:8px">${mediaPreviewHTML()}</div>`;
        const input = pane.querySelector('[data-file]');
        pane.querySelector('[data-import]').addEventListener('click', () => input.click());
        input.addEventListener('change', () => input.files[0] && pickMedia(input.files[0]));
        const row = pane.querySelector('.import-row');
        row.addEventListener('dragover', (e) => e.preventDefault());
        row.addEventListener('drop', (e) => {
          e.preventDefault();
          if (e.dataTransfer.files[0]) pickMedia(e.dataTransfer.files[0]);
        });
      } else if (state.type === 'audio') {
        pane.innerHTML = `<div class="row">
            <div style="flex:0 0 46%">
              <div class="label">Gravar Áudio ${infoHTML('O áudio chega como mensagem de voz, como se você tivesse gravado na hora. Grave aqui ou importe um arquivo de áudio (mp3, m4a, ogg, wav…).')}</div>
              <div class="audio-btns">
                <button type="button" class="audio-btn" data-audio-import>${icon('upload', 17, 2)}Importar Audio</button>
                <button type="button" class="audio-btn ${state.recorder ? 'rec' : ''}" data-audio-rec>${state.recorder ? icon('stop', 15) + 'Parar gravação' : icon('mic', 17, 2) + 'Gravar Audio'}</button>
              </div>
              <input type="file" accept="audio/*" hidden data-audio-file>
              <div data-audio-preview></div>
            </div>
            <div><div class="label">Mensagem ${infoHTML('Texto opcional. É enviado logo depois do áudio. Use <b>{nome}</b> para o primeiro nome do contato.')}</div>${area}</div>
          </div>`;
        const input = pane.querySelector('[data-audio-file]');
        pane.querySelector('[data-audio-import]').addEventListener('click', () => input.click());
        input.addEventListener('change', () => input.files[0] && pickAudio(input.files[0]));
        pane.querySelector('[data-audio-rec]').addEventListener('click', toggleRecording);
        renderAudioPreview();
      } else {
        pane.innerHTML = CRM.quick.selectHTML({ name: 'quick', label: 'Selecione uma resposta rápida', selectedId: state.quickId, replies });
        const sel = pane.querySelector('select');
        sel.addEventListener('change', () => (state.quickId = sel.value));
        CRM.quick.bindPreview(pane, replies);
        pane.querySelector('[data-new-quick]').addEventListener('click', () =>
          CRM.quick.openQuickForm(async (item) => {
            replies = await CRM.quick.list();
            state.quickId = item.id;
            renderPane();
          })
        );
      }
      bindTextarea();
    }

    async function renderAudioPreview() {
      const box = pane.querySelector('[data-audio-preview]');
      if (!box) return;
      if (state.audio) {
        box.innerHTML = `<audio controls src="${state.audio.dataUrl}"></audio><div class="muted" style="font-size:12px">${formatDuration(state.audio.seconds)} · pronto para enviar</div>`;
      } else if (state.hasStoredAudio) {
        const media = await store.getMedia(s.audioId);
        if (media && pane.contains(box)) box.innerHTML = `<audio controls src="${media.dataUrl}"></audio><div class="muted" style="font-size:12px">${formatDuration(state.audioSeconds)}</div>`;
      } else {
        box.innerHTML = '';
      }
    }

    async function pickMedia(file) {
      if (file.size > 60 * 1024 * 1024) return (errorBox.textContent = 'Arquivo muito grande (máximo 60 MB).');
      errorBox.textContent = '';
      state.media = { dataUrl: await CRM.util.readFileAsDataURL(file), name: file.name, mime: file.type || 'application/octet-stream' };
      const box = pane.querySelector('[data-media-preview]');
      if (box) box.innerHTML = mediaPreviewHTML();
    }

    async function pickAudio(blob) {
      errorBox.textContent = 'Convertendo áudio…';
      try {
        const out = await CRM.audio.toOggOpus(blob);
        state.audio = { dataUrl: await CRM.util.blobToDataURL(out.blob), seconds: out.seconds };
        errorBox.textContent = '';
      } catch (err) {
        errorBox.textContent = 'Não consegui ler este áudio: ' + err.message;
      }
      renderAudioPreview();
    }

    async function toggleRecording() {
      if (state.recorder) {
        const rec = state.recorder;
        state.recorder = null;
        renderPane();
        await pickAudio(await rec.stop());
        return;
      }
      try {
        state.recorder = await CRM.audio.startRecording();
        renderPane();
      } catch (err) {
        errorBox.textContent = 'Não consegui usar o microfone: ' + err.message;
      }
    }

    el.querySelectorAll('[data-type]').forEach((b) =>
      b.addEventListener('click', () => {
        stopRecording();
        state.type = b.dataset.type;
        errorBox.textContent = '';
        renderPane();
      })
    );

    const customBtn = el.querySelector('[data-custom]');
    customBtn.addEventListener('click', () => {
      const on = !customBtn.classList.contains('on');
      customBtn.classList.toggle('on', on);
      el.querySelector('[data-rec-select]').hidden = on;
      el.querySelector('[data-rec-custom]').hidden = !on;
    });

    el.querySelector('[data-cancel]').addEventListener('click', () => {
      stopRecording();
      openList();
    });

    el.querySelector('[data-save]').addEventListener('click', async () => {
      const get = (name) => el.querySelector(`[name="${name}"]`).value.trim();
      const date = get('date');
      const time = get('time');
      const isCustom = customBtn.classList.contains('on');
      const recurrence = isCustom ? 'custom' : get('recurrence');
      const customDays = isCustom ? parseInt(get('customDays'), 10) : null;

      const fail = (msg) => (errorBox.textContent = msg);
      if (state.recorder) return fail('Pare a gravação antes de salvar.');
      if (state.type === 'text' && !text.trim()) return fail('Escreva a mensagem.');
      if (state.type === 'media' && !state.media && !(editing && state.hasStoredMedia && s.type === 'media')) return fail('Importe o arquivo que será enviado.');
      if (state.type === 'audio' && !state.audio && !(editing && state.hasStoredAudio && s.type === 'audio')) return fail('Grave ou importe o áudio.');
      if (state.type === 'quick' && !replies.some((q) => q.id === state.quickId)) return fail('Selecione uma mensagem rápida.');
      if (!date || !time) return fail('Escolha a data e a hora.');
      if (isCustom && !(customDays >= 1)) return fail('Informe de quantos em quantos dias (1 ou mais).');
      const at = toTimestamp(date, time);
      if (at <= Date.now()) return fail('Escolha uma data e hora no futuro.');

      const item = {
        ...s,
        id: s.id || uid(),
        chatId: s.chatId || chat.id,
        chatName: s.chatName || chat.name || chat.pushname || '',
        chatPhone: s.chatPhone || chat.phone || '',
        title: get('title'),
        type: state.type,
        text,
        date,
        time,
        recurrence,
        customDays,
        nextAt: at,
        status: 'pending',
        lastError: '',
        lastResult: '',
        createdAt: s.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      if (state.type === 'quick') {
        item.quickReplyId = state.quickId;
        item.quickTitle = (replies.find((q) => q.id === state.quickId) || {}).title || '';
      } else {
        delete item.quickReplyId;
        delete item.quickTitle;
      }

      if (state.type === 'media') {
        if (state.media) {
          await store.deleteMedia(s.mediaId);
          item.mediaId = uid();
          item.mediaName = state.media.name;
          item.mediaMime = state.media.mime;
          await store.putMedia(item.mediaId, state.media);
        }
      } else if (s.mediaId) {
        await store.deleteMedia(s.mediaId);
        delete item.mediaId;
        delete item.mediaName;
        delete item.mediaMime;
      }

      if (state.type === 'audio') {
        if (state.audio) {
          await store.deleteMedia(s.audioId);
          item.audioId = uid();
          item.audioSeconds = state.audio.seconds;
          await store.putMedia(item.audioId, { dataUrl: state.audio.dataUrl, name: 'audio.ogg', mime: 'audio/ogg' });
        }
      } else if (s.audioId) {
        await store.deleteMedia(s.audioId);
        delete item.audioId;
        delete item.audioSeconds;
      }

      await store.upsertSchedule(item);
      toast(editing ? 'Agendamento atualizado.' : 'Mensagem agendada para ' + formatDateTime(at) + '.', 'ok');
      openList();
    });

    renderPane();
  }

  // ---------- Tela: relatório ----------
  async function openReport(back = openList) {
    await store.set('reportsSeenAt', Date.now());
    const reports = await store.getReports();
    const el = modal(
      `<div class="modal-head"><h2 class="modal-title">Relatório</h2>
        <div class="head-actions"><button class="pill-btn" data-back>Voltar</button></div></div>
      ${
        reports.length
          ? `<div class="list">${reports
              .map(
                (r) => `<div class="item">
              <div class="item-icon" style="color:${r.ok ? '#1e7e45' : '#b03a35'}">${icon(r.ok ? 'check' : 'close', 18, 2.4)}</div>
              <div class="item-body">
                <div class="item-title">${esc(r.chatName || r.chatPhone || 'Contato')}${r.title ? ' · ' + esc(r.title) : ''}</div>
                <div class="item-text clamp">${esc(r.preview)}</div>
                <div class="item-meta"><span>${esc(formatDateTime(r.at))}</span>${r.manual ? '<span>Enviada manualmente</span>' : ''}${r.late ? '<span>Enviada com atraso</span>' : ''}</div>
                ${r.error ? `<div class="item-meta" style="color:#b03a35">${esc(r.error)}</div>` : ''}
              </div></div>`
              )
              .join('')}</div>
            <div class="center"><button class="btn-outline" data-clear>Limpar relatório</button></div>`
          : `<div class="empty"><div class="empty-icon">${icon('report', 24)}</div><h3>Nenhum envio ainda</h3><p>Quando uma mensagem agendada for enviada (ou falhar), ela aparece aqui.</p></div>`
      }`,
      { wide: true }
    );
    el.querySelector('[data-back]').addEventListener('click', back);
    const clear = el.querySelector('[data-clear]');
    if (clear)
      clear.addEventListener('click', async () => {
        if (!confirm('Apagar todo o relatório?')) return;
        await store.clearReports();
        openReport(back);
      });
  }

  // ---------- Tela: configurações ----------
  async function openSettings(back = openList) {
    const settings = await store.getSettings();
    const el = modal(`<div class="modal-head"><h2 class="modal-title">Configurações</h2></div>
      <div class="label" style="font-size:13.5px;color:#111b21">Se o WhatsApp Web estiver fechado no horário de uma mensagem agendada:</div>
      <div class="radio-list">
        <label><input type="radio" name="late" value="send" ${settings.lateMode === 'send' ? 'checked' : ''}> Enviar assim que eu abrir o WhatsApp Web</label>
        <label><input type="radio" name="late" value="skip" ${settings.lateMode === 'skip' ? 'checked' : ''}> Não enviar (fica registrado no relatório)</label>
      </div>
      <div class="actions"><button class="btn" data-cancel>Cancelar</button><button class="btn" data-save>Salvar</button></div>`);
    el.querySelector('[data-cancel]').addEventListener('click', back);
    el.querySelector('[data-save]').addEventListener('click', async () => {
      const value = el.querySelector('input[name="late"]:checked').value;
      await store.saveSettings({ ...settings, lateMode: value });
      toast('Configurações salvas.', 'ok');
      back();
    });
  }

  // "Criar Agendamento" no menu ••• da resposta rápida: já vem com ela selecionada.
  const newFromQuick = (q) => openForm(null, { type: 'quick', quickReplyId: q.id, title: q.title || '' });

  return { openList, openReport, openSettings, newFromQuick, tick, pendingCount, unseenReports, nextOccurrence, STATUS_LABEL };
})();
