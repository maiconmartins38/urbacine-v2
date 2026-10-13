// Ciclo de renovação do cliente (preenchido no Cadastro) — um "follow-up" automático.
// Tudo no mesmo horário do vencimento (D = dia do vencimento):
//
//   1. Cadastro com vencimento → o cliente entra na aba do mês (ex.: 11/12 → DEZEMBRO).
//      D-1 e D: mensagem rápida 1 · D+1: mensagem rápida 2 (ex.: convite).
//   2. Depois da mensagem de D+1 → aba NUTRIR: o valor do cadastro é zerado e os envios da
//      renovação são cancelados. D+3 (padrão): mensagem de NUTRIR (botão "Remarketing").
//   3. D+4 (padrão, "o quarto dia") sem renovar → aba REMARKTING: a mensagem de NUTRIR some
//      e o cliente recebe a mensagem de remarketing (botão "Remarketing").
//   Renovou: botão "Renovado" (soma 1, 2, 3… meses) ou o Cadastro com a nova data → recomeça.
//   As mensagens de NUTRIR e de remarketing são as mesmas para todos (mudou lá, muda para todos).
//
// Os envios usam o mesmo motor das mensagens agendadas (ids "<renovação>:before|due|after|nutrir|remarketing").
CRM.renewals = (() => {
  const { esc, uid, toTimestamp, todayISO, formatDateTime, pad } = CRM.util;
  const { icon, toast, notice, infoHTML } = CRM.ui;
  const store = CRM.store;

  const RENEW_DAYS = 30;
  const DAY = 24 * 60 * 60 * 1000;
  const STEPS = [
    { key: 'before', offset: -1, label: '1 dia antes', quick: 'quick1Id' },
    { key: 'due', offset: 0, label: 'No dia', quick: 'quick1Id' },
    { key: 'after', offset: 1, label: '1 dia depois', quick: 'quick2Id' },
  ];
  const STAGE_LABEL = { active: 'Em dia', nutrir: 'NUTRIR', remarketing: 'REMARKTING', stopped: 'Parado' };

  function addDays(dateISO, days) {
    const [y, m, d] = dateISO.split('-').map(Number);
    const date = new Date(y, m - 1, d + days);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  const shortDate = (dateISO) => (dateISO ? dateISO.split('-').reverse().join('/') : '');
  const quickTitle = (q) => (q ? q.title || CRM.quick.summary(q).slice(0, 40) : 'Mensagem rápida');
  const monthTab = (dateISO) => CRM.tabs.MONTHS[Number(dateISO.slice(5, 7)) - 1];
  const stageOf = (r) => (r ? r.stage || 'active' : null);

  // Configuração do botão "Remarketing" (vale para todos os clientes).
  // nutrirDay / remarketingDay = dias depois do vencimento.
  async function remarketingConfig() {
    const saved = (await store.getSettings()).remarketing || {};
    const cfg = { nutrirDay: 3, remarketingDay: 4, repeat: false, nutrirQuickId: '', ...saved };
    if (saved.nutrirDays && !saved.remarketingDay) cfg.remarketingDay = 1 + saved.nutrirDays; // versão 0.10.0
    return cfg;
  }

  // ---------- Dados ----------
  async function forChat(chatId) {
    return (await store.getRenewals()).find((r) => r.chatId === chatId) || null;
  }

  // Recria os 3 envios da renovação (e tira o de remarketing). Horários que já passaram ficam como "Pulada".
  async function syncSchedules(r) {
    const replies = await CRM.quick.list();
    const now = Date.now();
    await store.updateSchedules((list) => {
      const others = list.filter((s) => s.renewalId !== r.id);
      const steps = STEPS.map((step) => {
        const date = addDays(r.dueDate, step.offset);
        const at = toTimestamp(date, r.time);
        const quickId = r[step.quick];
        return {
          id: r.id + ':' + step.key,
          renewalId: r.id,
          renewalStep: step.key,
          chatId: r.chatId,
          chatName: r.chatName,
          chatPhone: r.chatPhone,
          title: 'Renovação · ' + step.label,
          type: 'quick',
          quickReplyId: quickId,
          quickTitle: quickTitle(replies.find((q) => q.id === quickId)),
          text: '',
          date,
          time: r.time,
          recurrence: 'none',
          nextAt: at,
          status: at > now ? 'pending' : 'skipped',
          lastError: at > now ? '' : 'O horário já tinha passado quando o vencimento foi salvo.',
          createdAt: r.createdAt,
          updatedAt: now,
        };
      });
      return others.concat(steps);
    });
  }

  // Envio da etapa NUTRIR ou REMARKTING (a mensagem é lida da configuração na hora do envio).
  function stageSchedule(r, step, date, extra = {}) {
    const now = Date.now();
    return {
      id: r.id + ':' + step,
      renewalId: r.id,
      renewalStep: step,
      chatId: r.chatId,
      chatName: r.chatName,
      chatPhone: r.chatPhone,
      title: step === 'nutrir' ? 'NUTRIR' : 'Remarketing',
      type: step,
      text: '',
      date,
      time: r.time,
      recurrence: 'none',
      nextAt: toTimestamp(date, r.time),
      status: 'pending',
      lastError: '',
      createdAt: now,
      updatedAt: now,
      ...extra,
    };
  }

  // Grava (ou troca) o vencimento do cliente: o ciclo recomeça e ele vai para a aba do mês.
  async function saveCycle(chatId, chat, { dueDate, time, quick1Id, quick2Id }) {
    const old = await forChat(chatId);
    const now = Date.now();
    const renewed = old && old.dueDate && dueDate > old.dueDate;
    const r = {
      ...(old || {}),
      id: (old && old.id) || uid(),
      chatId,
      chatName: (chat && (chat.name || chat.pushname)) || (old && old.chatName) || '',
      chatPhone: (chat && chat.phone) || (old && old.chatPhone) || '',
      dueDate,
      time,
      quick1Id,
      quick2Id,
      stage: 'active',
      stageAt: now,
      renewCount: ((old && old.renewCount) || 0) + (renewed ? 1 : 0),
      history: ((old && old.history) || []).concat(old && old.dueDate !== dueDate ? [{ at: now, from: old.dueDate, to: dueDate, stage: stageOf(old) }] : []),
      createdAt: (old && old.createdAt) || now,
      updatedAt: now,
    };
    await store.updateRenewals((list) => list.filter((x) => x.chatId !== chatId).concat(r));
    await syncSchedules(r);
    await CRM.tabs.placeInStage(chatId, monthTab(dueDate));
    return r;
  }

  // Tira o vencimento (e os envios dele) do cliente.
  async function removeCycle(chatId) {
    const ids = new Set((await store.getRenewals()).filter((r) => r.chatId === chatId).map((r) => r.id));
    if (!ids.size) return;
    await store.updateRenewals((list) => list.filter((r) => !ids.has(r.id)));
    await store.updateSchedules((list) => list.filter((s) => !ids.has(s.renewalId)));
  }

  // ---------- Automação (roda junto com o agendador) ----------
  const setStage = (id, stage) =>
    store.updateRenewals((list) => list.map((r) => (r.id === id ? { ...r, stage, stageAt: Date.now(), updatedAt: Date.now() } : r)));

  // Entrou em NUTRIR: valor zerado, envios da renovação cancelados e a mensagem de NUTRIR agendada.
  async function toNutrir(r, cfg) {
    await CRM.tabs.placeInStage(r.chatId, 'NUTRIR');
    await store.updateClients((list) => list.map((c) => (c.chatId === r.chatId && c.valueCents != null
      ? { ...c, previousValueCents: c.valueCents || c.previousValueCents || 0, valueCents: null, updatedAt: Date.now() }
      : c)));
    await store.updateSchedules((list) => list.filter((s) => s.renewalId !== r.id)
      .concat(stageSchedule(r, 'nutrir', addDays(r.dueDate, cfg.nutrirDay))));
    await setStage(r.id, 'nutrir');
    notice(`${r.chatName || 'Cliente'} foi para NUTRIR`);
  }

  // Entrou em REMARKTING: a mensagem de NUTRIR some e a de remarketing sai no mesmo horário.
  async function toRemarketing(r, cfg) {
    // Se a pessoa já tirou o cliente da aba NUTRIR na mão, a automação para.
    if (!(await CRM.tabs.isInStage(r.chatId, 'NUTRIR'))) return setStage(r.id, 'stopped');
    await store.updateSchedules((list) => list.filter((s) => s.renewalId !== r.id)
      .concat(stageSchedule(r, 'remarketing', addDays(r.dueDate, cfg.remarketingDay),
        cfg.repeat ? { recurrence: 'custom', customDays: RENEW_DAYS } : {})));
    await CRM.tabs.placeInStage(r.chatId, 'REMARKTING');
    await setStage(r.id, 'remarketing');
    notice(`${r.chatName || 'Cliente'} foi para REMARKTING`);
  }

  let running = false;
  async function lifecycle() {
    if (running) return;
    running = true;
    try {
      const now = Date.now();
      const cfg = await remarketingConfig();
      const schedules = await store.getSchedules();
      for (const r of await store.getRenewals()) {
        const stage = stageOf(r);
        if (stage === 'active') {
          // Vai para NUTRIR quando a mensagem de 1 dia depois já saiu (ou não tem mais o que esperar).
          const after = schedules.find((s) => s.id === r.id + ':after');
          const afterAt = toTimestamp(addDays(r.dueDate, 1), r.time);
          if (now >= afterAt && !(after && (after.status === 'pending' || after.status === 'sending'))) await toNutrir(r, cfg);
        } else if (stage === 'nutrir' && now >= toTimestamp(addDays(r.dueDate, cfg.remarketingDay), r.time)) {
          // Espera terminar um envio que esteja saindo agora (ex.: a mensagem de NUTRIR).
          if (!schedules.some((s) => s.renewalId === r.id && s.status === 'sending')) await toRemarketing(r, cfg);
        }
      }
    } catch (err) {
      console.warn('[CRM] erro no ciclo de renovação', err);
    } finally {
      running = false;
    }
  }

  // ---------- Campos do ciclo dentro do Cadastro (janela e painel) ----------
  // state = { dueDate, time, quick1Id, quick2Id }. Data vazia = cliente sem vencimento.
  // Cliente novo começa vazio: vencimento, hora e mensagens são escolhidos para cada cliente.
  function initialState(r) {
    if (!r) return { dueDate: '', time: '', quick1Id: '', quick2Id: '' };
    return { dueDate: r.dueDate, time: r.time, quick1Id: r.quick1Id, quick2Id: r.quick2Id };
  }

  // Texto da etapa atual do cliente (para mostrar no cadastro).
  async function stageText(r) {
    if (!r) return '';
    const stage = stageOf(r);
    if (stage === 'active') return `📂 ${esc(monthTab(r.dueDate))} · vence ${esc(formatDateTime(toTimestamp(r.dueDate, r.time)))}`;
    if (stage === 'nutrir') {
      const cfg = await remarketingConfig();
      return `🌱 Em NUTRIR · mensagem de NUTRIR ${esc(formatDateTime(toTimestamp(addDays(r.dueDate, cfg.nutrirDay), r.time)))} · vai para REMARKTING ${esc(formatDateTime(toTimestamp(addDays(r.dueDate, cfg.remarketingDay), r.time)))} se não renovar`;
    }
    if (stage === 'remarketing') {
      const s = (await store.getSchedules()).find((x) => x.id === r.id + ':remarketing');
      return `📣 Em REMARKTING${s ? ` · mensagem de remarketing ${s.status === 'pending' ? 'em' : 'enviada'} ${esc(formatDateTime(s.status === 'pending' ? s.nextAt : s.lastRunAt || s.nextAt))}` : ''}`;
    }
    return '⏸ Automação parada (o cliente foi tirado da aba NUTRIR na mão).';
  }

  function fieldsHTML({ compact = false, stage = '' } = {}) {
    return `<div class="cycle">
      <div class="cycle-title">${icon('renew', 16)} Vencimento e mensagens de renovação
        ${infoHTML('Com a data, o cliente entra na aba do mês. Depois da mensagem de 1 dia depois ele vai para NUTRIR (o valor é zerado) e, se não renovar, para REMARKTING. Deixe a data vazia para não usar.')}</div>
      ${stage ? `<div class="cycle-stage">${stage}</div>` : ''}
      <div class="${compact ? '' : 'row '}field">
        <div><div class="label">Data do vencimento</div><input class="input" type="date" name="dueDate"></div>
        <div><div class="label">Hora</div><input class="input" type="time" name="dueTime"></div>
      </div>
      <div data-cquick></div>
      <div class="plan" data-cplan></div>
    </div>`;
  }

  // Liga os campos: mostra as mensagens rápidas e o plano de envios. onChange avisa quando algo muda.
  async function bindFields(root, state, onChange = () => {}) {
    let replies = await CRM.quick.list();
    const date = root.querySelector('[name="dueDate"]');
    const time = root.querySelector('[name="dueTime"]');
    const box = root.querySelector('[data-cquick]');
    const plan = root.querySelector('[data-cplan]');
    date.value = state.dueDate || '';
    time.value = state.time || '';

    function renderPlan() {
      const on = !!state.dueDate;
      box.hidden = !on;
      if (!on) {
        plan.innerHTML = 'Sem vencimento: o cliente fica fora do ciclo de renovação.';
        return;
      }
      if (!state.time) {
        plan.innerHTML = 'Escolha a hora para ver quando cada mensagem será enviada.';
        return;
      }
      const now = Date.now();
      plan.innerHTML = `<div><b>Vai para a aba ${esc(monthTab(state.dueDate))} e envia:</b></div>` +
        STEPS.map((step) => {
          const at = toTimestamp(addDays(state.dueDate, step.offset), state.time);
          const q = replies.find((x) => x.id === state[step.quick]);
          return `<div>• ${step.label}: ${esc(formatDateTime(at))} — ⚡ ${esc(q ? quickTitle(q) : 'escolha a mensagem')}${at <= now ? ' <i>(já passou, não será enviada)</i>' : ''}</div>`;
        }).join('') +
        '<div class="muted" style="margin-top:4px">Se não renovar: NUTRIR (valor zerado) e depois REMARKTING, com as mensagens do botão Remarketing.</div>';
    }

    function renderQuick() {
      box.innerHTML =
        CRM.quick.selectHTML({ name: 'quick1Id', label: 'Mensagem rápida — 1 dia antes e no dia do vencimento', selectedId: state.quick1Id, replies }) +
        CRM.quick.selectHTML({ name: 'quick2Id', label: 'Mensagem rápida — 1 dia depois do vencimento', selectedId: state.quick2Id, replies });
      CRM.quick.bindPreview(box, replies);
      box.querySelectorAll('select').forEach((sel) => sel.addEventListener('change', () => {
        state[sel.name] = sel.value;
        renderPlan();
        onChange();
      }));
      box.querySelectorAll('[data-new-quick]').forEach((b) => b.addEventListener('click', () =>
        CRM.quick.openQuickForm(async (item) => {
          replies = await CRM.quick.list();
          state[b.dataset.newQuick] = item.id;
          renderQuick();
          renderPlan();
          onChange();
        })));
    }

    date.addEventListener('input', () => {
      state.dueDate = date.value;
      renderPlan();
      onChange();
    });
    time.addEventListener('input', () => {
      state.time = time.value;
      renderPlan();
      onChange();
    });
    renderQuick();
    renderPlan();
    return { validate: () => validate(state, replies) };
  }

  function validate(state, replies) {
    if (!state.dueDate) return '';
    if (!state.time) return 'Escolha a hora do vencimento.';
    if (!replies.some((q) => q.id === state.quick1Id)) return 'Escolha a mensagem rápida de 1 dia antes e do dia.';
    if (!replies.some((q) => q.id === state.quick2Id)) return 'Escolha a mensagem rápida de 1 dia depois.';
    if (toTimestamp(state.dueDate, state.time) <= Date.now()) return 'O vencimento precisa ser no futuro.';
    return '';
  }

  // ---------- Botão "Renovado" ----------
  // Soma 1, 2, 3… meses (30 dias cada) ao vencimento e o ciclo recomeça na aba do mês.
  // Se o cliente já passou do vencimento (NUTRIR / REMARKTING), conta a partir de hoje.
  // A data e o valor podem ser mudados antes de confirmar.
  const PLANS = [1, 2, 3, 6, 12];

  async function markRenewed() {
    const chat = CRM.wa.state.activeChat;
    if (!CRM.wa.state.ready || !chat) return toast('Abra a conversa do cliente primeiro.', 'err');
    const r = await forChat(chat.id);
    if (!r) return toast('Este contato ainda não tem vencimento. Coloque a data no Cadastro.', 'err');
    const c = await CRM.clients.forChat(chat.id);
    const late = toTimestamp(r.dueDate, r.time) <= Date.now();
    const base = late ? todayISO() : r.dueDate;
    const cents = c && c.valueCents != null ? c.valueCents : c && c.previousValueCents != null ? c.previousValueCents : null;
    let months = 1;

    const el = CRM.ui.modal(`<div class="modal-head"><h2 class="modal-title">Renovado</h2></div>
      <div class="cycle-stage" style="margin-bottom:12px"><b>${esc((c && c.name) || r.chatName || 'Cliente')}</b> · ${await stageText(r)}</div>
      <div class="field"><div class="label">Renovou por</div>
        <div class="tabs">${PLANS.map((m) => `<button class="tab ${m === 1 ? 'on' : ''}" data-months="${m}">${m} ${m === 1 ? 'mês' : 'meses'}</button>`).join('')}</div></div>
      <div class="row field">
        <div><div class="label">Novo vencimento</div><input class="input" type="date" name="newDate"></div>
        <div><div class="label">Hora</div><input class="input" type="time" name="newTime" value="${esc(r.time)}"></div>
      </div>
      <div class="field"><div class="label">Valor (lucro)</div>
        <input class="input" name="newValue" inputmode="decimal" placeholder="R$ 0,00" value="${cents != null ? esc(CRM.clients.formatMoney(cents)) : ''}"></div>
      <div class="plan" data-rplan></div>
      <div class="error-msg" data-error></div>
      <div class="actions"><button class="btn" data-cancel>Cancelar</button><button class="btn" data-ok>Confirmar renovação</button></div>`);
    const date = el.querySelector('[name="newDate"]');
    const time = el.querySelector('[name="newTime"]');
    const value = el.querySelector('[name="newValue"]');
    const plan = el.querySelector('[data-rplan]');
    const renderPlan = () => {
      plan.innerHTML = date.value
        ? `Vai para a aba <b>${esc(monthTab(date.value))}</b> e as mensagens de renovação (1 dia antes, no dia e 1 dia depois) são agendadas de novo.`
        : 'Escolha a data do novo vencimento.';
    };
    const setMonths = (m) => {
      months = m;
      el.querySelectorAll('[data-months]').forEach((b) => b.classList.toggle('on', Number(b.dataset.months) === m));
      date.value = addDays(base, RENEW_DAYS * m);
      renderPlan();
    };
    el.querySelectorAll('[data-months]').forEach((b) => b.addEventListener('click', () => setMonths(Number(b.dataset.months))));
    date.addEventListener('input', renderPlan);
    value.addEventListener('blur', () => {
      const v = CRM.clients.parseMoney(value.value);
      if (v != null) value.value = CRM.clients.formatMoney(v);
    });
    el.querySelector('[data-cancel]').addEventListener('click', CRM.ui.closeModal);
    el.querySelector('[data-ok]').addEventListener('click', async () => {
      const fail = (m) => (el.querySelector('[data-error]').textContent = m);
      if (!date.value || !time.value) return fail('Escolha a data e a hora do novo vencimento.');
      if (toTimestamp(date.value, time.value) <= Date.now()) return fail('O novo vencimento precisa ser no futuro.');
      const v = value.value.trim() ? CRM.clients.parseMoney(value.value) : null;
      if (value.value.trim() && v == null) return fail('Valor inválido. Exemplo: 150,00');
      const name = (c && c.name) || r.chatName || chat.name || '';
      await CRM.clients.saveFor(chat.id, { name, phone: (c && c.phone) || r.chatPhone || chat.phone || '', valueCents: v, description: (c && c.description) || '' });
      const saved = await saveCycle(chat.id, { name, phone: r.chatPhone }, { dueDate: date.value, time: time.value, quick1Id: r.quick1Id, quick2Id: r.quick2Id });
      CRM.ui.closeModal();
      toast(`Renovado por ${months} ${months === 1 ? 'mês' : 'meses'}! Vence ${shortDate(saved.dueDate)} às ${saved.time} (aba ${monthTab(saved.dueDate)}).`, 'ok');
    });
    setMonths(1);
  }

  // Badge do botão Remarketing: 1 se o contato está em REMARKTING.
  async function inRemarketing(chatId) {
    return chatId && stageOf(await forChat(chatId)) === 'remarketing' ? 1 : 0;
  }

  return {
    STEPS, STAGE_LABEL, RENEW_DAYS, DAY, addDays, shortDate, monthTab, stageOf, forChat, saveCycle, removeCycle,
    lifecycle, remarketingConfig, initialState, stageText, fieldsHTML, bindFields, markRenewed, inRemarketing,
  };
})();
