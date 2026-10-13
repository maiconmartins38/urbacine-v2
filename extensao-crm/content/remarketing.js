// Botão "Remarketing" da conversa (no lugar de "Mensagens de Renovação"):
// escolhe as mensagens padrão do ciclo, iguais para todos os clientes — a de NUTRIR (mensagem
// rápida) e a de REMARKTING (texto, mídia, áudio ou mensagem rápida) —, em que dia saem, e
// mostra quem está em NUTRIR e em REMARKTING.
// O ciclo em si fica em renewals.js; o envio, no motor das mensagens agendadas.
CRM.remarketing = (() => {
  const { esc, uid, formatDateTime, formatDuration, toTimestamp } = CRM.util;
  const { icon, modal, toast, notice, attachEmoji, textareaHTML, infoHTML } = CRM.ui;
  const store = CRM.store;
  const R = () => CRM.renewals;

  const CSS = `
    .rm-flow { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; margin: -4px 0 14px; color: #3b4a54; }
    .rm-flow b { background: #eef0f3; border-radius: 6px; padding: 3px 7px; color: #111b21; display: inline-flex; align-items: center; gap: 4px; }
    .rm-flow b svg, .rm-section h3 svg, .rm-box .label svg { color: var(--teal); }
    .rm-flow .arrow { color: var(--muted); }
    .rm-days { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 12.5px; color: #3b4a54; }
    .rm-days input { width: 70px; }
    .rm-box { border: 1px solid #e3e8ea; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; }
    .rm-box > .label { font-weight: 700; color: #111b21; font-size: 13.5px; }
    .rm-section { margin-top: 18px; border-top: 1px solid #eef0f2; padding-top: 12px; }
    .rm-section h3 { font-size: 14px; margin: 0 0 8px; display: flex; align-items: center; gap: 6px; }
    .rm-row { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border: 1px solid #e9edef; border-radius: 8px; margin-bottom: 6px; font-size: 12.5px; }
    .rm-row.me { border-color: var(--teal); background: var(--teal-soft); }
    .rm-row .who { font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
    .rm-row .when { color: var(--muted); font-size: 12px; text-align: right; }
    .rm-empty { color: var(--muted); font-size: 12.5px; padding: 4px 2px 8px; }
  `;

  let recorder = null;
  const stopRecording = () => {
    if (recorder) recorder.cancel();
    recorder = null;
  };

  async function open() {
    const cfg = await R().remarketingConfig();
    const msg = cfg.message || {};
    const state = {
      type: msg.type || 'quick',
      text: msg.text || '',
      media: null, // { dataUrl, name, mime } arquivo novo
      audio: null, // { dataUrl, seconds } áudio novo
      quickId: msg.quickReplyId || '',
    };
    let replies = await CRM.quick.list();
    const renewals = await store.getRenewals();
    const schedules = await store.getSchedules();
    const chat = CRM.wa.state.activeChat;
    const at = (r, day) => esc(formatDateTime(toTimestamp(R().addDays(r.dueDate, day), r.time)));

    const rowHTML = (r, when) => `<div class="rm-row ${chat && chat.id === r.chatId ? 'me' : ''}">
        <span class="who">${esc(r.chatName || r.chatPhone || 'Contato')}</span>
        <span class="when">venceu ${esc(R().shortDate(r.dueDate))}<br>${when}</span>
        <button class="icon-btn danger" data-stop="${r.id}" title="Tirar da automação">${icon('close', 15, 2)}</button></div>`;
    const remk = renewals.filter((r) => R().stageOf(r) === 'remarketing').map((r) => {
      const s = schedules.find((x) => x.id === r.id + ':remarketing');
      const when = s ? (s.status === 'pending' ? 'mensagem em ' : (CRM.schedules.STATUS_LABEL[s.status] || s.status) + ' · ') + esc(formatDateTime(s.status === 'pending' ? s.nextAt : s.lastRunAt || s.nextAt)) : '';
      return rowHTML(r, when);
    });
    const nutrir = renewals.filter((r) => R().stageOf(r) === 'nutrir')
      .map((r) => rowHTML(r, `mensagem de NUTRIR ${at(r, cfg.nutrirDay)} · REMARKTING ${at(r, cfg.remarketingDay)}`));

    const el = modal(`<style>${CSS}</style>
      <div class="modal-head"><h2 class="modal-title">Remarketing</h2></div>
      <div class="rm-flow"><b>${icon('folderGo', 13)}Aba do mês</b><span class="arrow">→ 1 dia depois →</span><b>${icon('sprout', 13)}NUTRIR</b><span class="muted">(valor zerado)</span>
        <span class="arrow">→ dia ${cfg.nutrirDay}: mensagem de NUTRIR → dia ${cfg.remarketingDay} →</span><b>${icon('megaphone', 13)}REMARKTING</b><span class="muted">+ mensagem de remarketing</span></div>
      <div class="rm-box" data-nutrir-box>
        <div class="label">${icon('sprout', 14)} Mensagem de NUTRIR ${infoHTML('Padrão para todos os clientes que estão na aba NUTRIR. Se mudar aqui, muda para todo mundo.')}</div>
        <div data-nutrir-pick></div>
        <div class="rm-days">Enviar <input class="input" type="number" min="2" max="60" name="nutrirDay" value="${esc(cfg.nutrirDay)}"> dias depois do vencimento, no mesmo horário.</div>
      </div>
      <div class="rm-box">
        <div class="label">${icon('megaphone', 14)} Mensagem de remarketing ${infoHTML('Padrão para todos que entram na aba REMARKTING. Use <b>{nome}</b> para o primeiro nome do contato.')}</div>
        <div class="tabs">
          <button class="tab" data-type="text">Criar texto</button>
          <button class="tab" data-type="media">Mídia</button>
          <button class="tab" data-type="audio">Áudio</button>
          <button class="tab" data-type="quick">Selecionar mensagem rápida</button>
        </div>
        <div class="field" data-pane style="margin-top:10px"></div>
        <div class="rm-days">Ir para REMARKTING e enviar <input class="input" type="number" min="3" max="90" name="remarketingDay" value="${esc(cfg.remarketingDay)}"> dias depois do vencimento, no mesmo horário.</div>
        <button type="button" class="check ${cfg.repeat ? 'on' : ''}" data-repeat style="margin-top:10px"><span class="dot">${icon('check', 11, 3)}</span>Repetir a cada 30 dias enquanto o cliente estiver em REMARKTING</button>
      </div>
      <div class="error-msg" data-error></div>
      <div class="actions"><button class="btn" data-cancel>Fechar</button><button class="btn" data-save>Salvar</button></div>
      <div class="rm-section"><h3>${icon('megaphone', 16)}Em REMARKTING (${remk.length})</h3>${remk.join('') || '<div class="rm-empty">Ninguém por enquanto.</div>'}</div>
      <div class="rm-section"><h3>${icon('sprout', 16)}Em NUTRIR (${nutrir.length})</h3>${nutrir.join('') || '<div class="rm-empty">Ninguém por enquanto.</div>'}</div>`,
      { wide: true, onClose: stopRecording });

    const pane = el.querySelector('[data-pane]');
    const errorBox = el.querySelector('[data-error]');
    let nutrirQuickId = cfg.nutrirQuickId || '';

    function renderNutrir() {
      const box = el.querySelector('[data-nutrir-pick]');
      box.innerHTML = CRM.quick.selectHTML({ name: 'nutrirQuick', label: 'Mensagem rápida', selectedId: nutrirQuickId, replies });
      CRM.quick.bindPreview(box, replies);
      box.querySelector('select').onchange = (e) => (nutrirQuickId = e.target.value);
      box.querySelector('[data-new-quick]').onclick = () => CRM.quick.openQuickForm(async (item) => {
        replies = await CRM.quick.list();
        nutrirQuickId = item.id;
        renderNutrir();
        renderPane();
      });
    }

    function mediaChip() {
      if (state.media) {
        return state.media.mime.startsWith('image/') ? `<img class="thumb" src="${state.media.dataUrl}" alt="">`
          : `<div class="file-chip">${icon('file', 16)}<span>${esc(state.media.name)}</span></div>`;
      }
      return msg.type === 'media' && msg.mediaId ? `<div class="file-chip">${icon('file', 16)}<span>${esc(msg.mediaName || 'Arquivo')}</span></div>` : '';
    }

    async function audioPreview() {
      const box = pane.querySelector('[data-audio-preview]');
      if (!box) return;
      if (state.audio) box.innerHTML = `<audio controls src="${state.audio.dataUrl}"></audio><div class="muted" style="font-size:12px">${formatDuration(state.audio.seconds)} · pronto</div>`;
      else if (msg.type === 'audio' && msg.audioId) {
        const m = await store.getMedia(msg.audioId);
        if (m && pane.contains(box)) box.innerHTML = `<audio controls src="${m.dataUrl}"></audio>`;
      } else box.innerHTML = '';
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
      audioPreview();
    }

    function renderPane() {
      el.querySelectorAll('[data-type]').forEach((b) => b.classList.toggle('on', b.dataset.type === state.type));
      const area = textareaHTML({ name: 'rmtext', placeholder: 'Insira sua mensagem', value: state.text });
      if (state.type === 'text') {
        pane.innerHTML = `<div class="label">Mensagem</div>${area}`;
      } else if (state.type === 'media') {
        pane.innerHTML = `<div class="import-row"><button type="button" class="import-card" data-import>${icon('download', 22, 2)}Importar</button>
            <div style="flex:1;min-width:0"><div class="label">Legenda (opcional)</div>${area}</div></div>
          <input type="file" hidden data-file><div data-media style="margin-top:8px">${mediaChip()}</div>`;
        const input = pane.querySelector('[data-file]');
        pane.querySelector('[data-import]').onclick = () => input.click();
        input.onchange = async () => {
          const f = input.files[0];
          if (!f) return;
          if (f.size > 60 * 1024 * 1024) return (errorBox.textContent = 'Arquivo muito grande (máximo 60 MB).');
          state.media = { dataUrl: await CRM.util.readFileAsDataURL(f), name: f.name, mime: f.type || 'application/octet-stream' };
          pane.querySelector('[data-media]').innerHTML = mediaChip();
        };
      } else if (state.type === 'audio') {
        pane.innerHTML = `<div class="row"><div style="flex:0 0 46%"><div class="label">Áudio (chega como mensagem de voz)</div>
            <div class="audio-btns"><button type="button" class="audio-btn" data-audio-import>${icon('upload', 17, 2)}Importar Audio</button>
            <button type="button" class="audio-btn ${recorder ? 'rec' : ''}" data-audio-rec>${recorder ? icon('stop', 15) + 'Parar gravação' : icon('mic', 17, 2) + 'Gravar Audio'}</button></div>
            <input type="file" accept="audio/*" hidden data-audio-file><div data-audio-preview></div></div>
          <div><div class="label">Texto depois do áudio (opcional)</div>${area}</div></div>`;
        const input = pane.querySelector('[data-audio-file]');
        pane.querySelector('[data-audio-import]').onclick = () => input.click();
        input.onchange = () => input.files[0] && pickAudio(input.files[0]);
        pane.querySelector('[data-audio-rec]').onclick = async () => {
          if (recorder) {
            const rec = recorder;
            recorder = null;
            renderPane();
            return pickAudio(await rec.stop());
          }
          try {
            recorder = await CRM.audio.startRecording();
            renderPane();
          } catch (err) {
            errorBox.textContent = 'Não consegui usar o microfone: ' + err.message;
          }
        };
        audioPreview();
      } else {
        pane.innerHTML = CRM.quick.selectHTML({ name: 'rmquick', label: 'Selecione uma resposta rápida', selectedId: state.quickId, replies });
        const sel = pane.querySelector('select');
        sel.onchange = () => (state.quickId = sel.value);
        CRM.quick.bindPreview(pane, replies);
        pane.querySelector('[data-new-quick]').onclick = () => CRM.quick.openQuickForm(async (item) => {
          replies = await CRM.quick.list();
          state.quickId = item.id;
          renderPane();
        });
      }
      const ta = pane.querySelector('textarea');
      if (ta) {
        ta.addEventListener('input', () => (state.text = ta.value));
        attachEmoji(pane.querySelector('[data-emoji]'), ta);
      }
    }

    el.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
      stopRecording();
      state.type = b.dataset.type;
      errorBox.textContent = '';
      renderPane();
    }));
    const repeatBtn = el.querySelector('[data-repeat]');
    repeatBtn.addEventListener('click', () => repeatBtn.classList.toggle('on'));
    el.querySelector('[data-cancel]').addEventListener('click', CRM.ui.closeModal);

    el.querySelectorAll('[data-stop]').forEach((b) => b.addEventListener('click', async () => {
      const r = renewals.find((x) => x.id === b.dataset.stop);
      if (!confirm(`Tirar ${r.chatName || 'este contato'} da automação? As mensagens que faltam (remarketing) não serão enviadas. Ele continua na aba onde está.`)) return;
      await store.updateRenewals((list) => list.map((x) => (x.id === r.id ? { ...x, stage: 'stopped', stageAt: Date.now() } : x)));
      await store.updateSchedules((list) => list.filter((s) => !(s.renewalId === r.id && s.status === 'pending')));
      notice('Contato tirado da automação');
      open();
    }));

    el.querySelector('[data-save]').addEventListener('click', async () => {
      const fail = (m) => (errorBox.textContent = m);
      if (recorder) return fail('Pare a gravação antes de salvar.');
      const nutrirDay = parseInt(el.querySelector('[name="nutrirDay"]').value, 10);
      const remarketingDay = parseInt(el.querySelector('[name="remarketingDay"]').value, 10);
      if (!replies.some((q) => q.id === nutrirQuickId)) return fail('Escolha a mensagem de NUTRIR.');
      if (!(nutrirDay >= 2 && nutrirDay <= 60)) return fail('A mensagem de NUTRIR sai de 2 a 60 dias depois do vencimento.');
      if (!(remarketingDay > nutrirDay && remarketingDay <= 90)) return fail('O REMARKTING precisa ser depois da mensagem de NUTRIR (até 90 dias).');
      const text = state.text.trim();
      const message = { type: state.type, text };
      if (state.type === 'text' && !text) return fail('Escreva a mensagem.');
      if (state.type === 'media') {
        if (!state.media && !(msg.type === 'media' && msg.mediaId)) return fail('Importe o arquivo.');
        Object.assign(message, state.media ? {} : { mediaId: msg.mediaId, mediaName: msg.mediaName, mediaMime: msg.mediaMime });
      }
      if (state.type === 'audio') {
        if (!state.audio && !(msg.type === 'audio' && msg.audioId)) return fail('Grave ou importe o áudio.');
        if (!state.audio) Object.assign(message, { audioId: msg.audioId, audioSeconds: msg.audioSeconds });
      }
      if (state.type === 'quick') {
        const q = replies.find((x) => x.id === state.quickId);
        if (!q) return fail('Selecione uma mensagem rápida.');
        Object.assign(message, { quickReplyId: q.id, quickTitle: q.title || '' });
      }
      // Arquivos novos entram no banco; os antigos que não servem mais saem.
      if (state.type === 'media' && state.media) {
        message.mediaId = uid();
        message.mediaName = state.media.name;
        message.mediaMime = state.media.mime;
        await store.putMedia(message.mediaId, state.media);
      }
      if (state.type === 'audio' && state.audio) {
        message.audioId = uid();
        message.audioSeconds = state.audio.seconds;
        await store.putMedia(message.audioId, { dataUrl: state.audio.dataUrl, name: 'audio.ogg', mime: 'audio/ogg' });
      }
      if (msg.mediaId && msg.mediaId !== message.mediaId) await store.deleteMedia(msg.mediaId);
      if (msg.audioId && msg.audioId !== message.audioId) await store.deleteMedia(msg.audioId);

      const repeat = repeatBtn.classList.contains('on');
      const settings = await store.getSettings();
      const { nutrirDays, ...rest } = settings.remarketing || {};
      await store.saveSettings({ ...settings, remarketing: { ...rest, message, repeat, nutrirQuickId, nutrirDay, remarketingDay } });
      // Quem já está em NUTRIR passa a usar os dias novos.
      const renewalsNow = await store.getRenewals();
      await store.updateSchedules((list) => list.map((s) => {
        if (s.renewalStep !== 'nutrir' || s.status !== 'pending') return s;
        const r = renewalsNow.find((x) => x.id === s.renewalId);
        if (!r) return s;
        const date = R().addDays(r.dueDate, nutrirDay);
        return { ...s, date, nextAt: toTimestamp(date, r.time) };
      }));
      // A repetição vale também para quem já está em REMARKTING.
      await store.updateSchedules((list) => list.map((s) => (s.renewalStep === 'remarketing'
        ? { ...s, recurrence: repeat ? 'custom' : 'none', customDays: repeat ? R().RENEW_DAYS : null } : s)));
      toast('Mensagens de NUTRIR e remarketing salvas (valem para todos).', 'ok');
      CRM.ui.closeModal();
    });

    renderNutrir();
    renderPane();
  }

  return { open };
})();
