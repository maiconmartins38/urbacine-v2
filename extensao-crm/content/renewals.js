// Mensagens de Renovação + botão "Renovado".
// Cada renovação gera 3 envios (usando o mesmo motor das mensagens agendadas):
//   1 dia antes do vencimento -> mensagem rápida 1
//   no dia do vencimento      -> mensagem rápida 1
//   1 dia depois              -> mensagem rápida 2
// "Renovado" empurra o vencimento (e os 3 envios) 30 dias para frente.
CRM.renewals = (() => {
  const { esc, uid, toTimestamp, todayISO, formatDateTime, pad } = CRM.util;
  const { icon, modal, toast } = CRM.ui;
  const store = CRM.store;

  const RENEW_DAYS = 30;
  const STEPS = [
    { key: 'before', offset: -1, label: '1 dia antes', quick: 'quick1Id' },
    { key: 'due', offset: 0, label: 'No dia', quick: 'quick1Id' },
    { key: 'after', offset: 1, label: '1 dia depois', quick: 'quick2Id' },
  ];

  function addDays(dateISO, days) {
    const [y, m, d] = dateISO.split('-').map(Number);
    const date = new Date(y, m - 1, d + days);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  const shortDate = (dateISO) => dateISO.split('-').reverse().join('/');
  const quickTitle = (q) => (q ? q.title || q.text.slice(0, 40) : 'Mensagem rápida');

  // Recria os 3 envios da renovação. Horários que já passaram ficam como "Pulada".
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
          lastError: at > now ? '' : 'O horário já tinha passado quando a renovação foi salva.',
          createdAt: r.createdAt,
          updatedAt: now,
        };
      });
      return others.concat(steps);
    });
  }

  async function forChat(chatId) {
    return (await store.getRenewals()).filter((r) => r.chatId === chatId);
  }

  async function activeCount(chatId) {
    if (!chatId) return 0;
    const ids = new Set((await forChat(chatId)).map((r) => r.id));
    if (!ids.size) return 0;
    const pending = (await store.getSchedules()).filter((s) => ids.has(s.renewalId) && s.status === 'pending');
    return new Set(pending.map((s) => s.renewalId)).size;
  }

  // ---------- Tela: lista ----------
  let showAll = false;

  async function openList() {
    const chat = CRM.wa.state.activeChat;
    if (!CRM.wa.state.ready) {
      modal(`<div class="modal-head"><h2 class="modal-title">Mensagens de Renovação</h2></div>
        <div class="empty"><p>O WhatsApp Web ainda está carregando. Espere alguns segundos e tente de novo.</p></div>`);
      return;
    }
    const all = await store.getRenewals();
    const list = (showAll || !chat ? all : all.filter((r) => r.chatId === chat.id)).sort((a, b) =>
      (a.dueDate + a.time).localeCompare(b.dueDate + b.time)
    );
    const schedules = await store.getSchedules();
    const canAdd = chat && !all.some((r) => r.chatId === chat.id);
    const unseen = await CRM.schedules.unseenReports();

    const head = `<div class="modal-head">
      <h2 class="modal-title">Mensagens de Renovação</h2>
      <div class="head-actions">
        <button class="chip-btn" data-report>Relatório ${icon('report', 13, 2)}<span class="chip-badge">${unseen}</span></button>
        <button class="pill-btn ${showAll ? 'on' : ''}" data-all>${showAll ? 'Exibindo Todos' : 'Exibir Todos'} ${icon('eye', 13, 2)}</button>
        <button class="icon-btn" data-settings title="Configurações">${icon('gear', 18)}</button>
      </div>
    </div>`;

    const addBtn = canAdd ? `<button class="btn" data-add>Adicionar</button>` : '';
    const body = list.length
      ? `<div class="list">${list.map((r) => itemHTML(r, schedules, showAll || !chat)).join('')}</div>
         <div class="center">${addBtn}</div>`
      : `<div class="empty">
          <div class="empty-icon">${icon('renew', 24)}</div>
          <h3>Nenhuma renovação encontrada</h3>
          <p>Cadastre o vencimento do cliente: ele recebe uma mensagem 1 dia antes, no dia e 1 dia depois.</p>
          ${chat ? `<button class="btn" data-add>Adicionar</button>` : ''}
        </div>`;

    const el = modal(head + body, { wide: true });
    el.querySelector('[data-report]').addEventListener('click', () => CRM.schedules.openReport(openList));
    el.querySelector('[data-settings]').addEventListener('click', () => CRM.schedules.openSettings(openList));
    el.querySelector('[data-all]').addEventListener('click', () => {
      showAll = !showAll;
      openList();
    });
    el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => openForm()));
    el.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => openForm(all.find((r) => r.id === b.dataset.edit)))
    );
    el.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Excluir esta renovação e os 3 envios dela?')) return;
        const id = b.dataset.del;
        await store.updateRenewals((l) => l.filter((r) => r.id !== id));
        await store.updateSchedules((l) => l.filter((s) => s.renewalId !== id));
        openList();
      })
    );
  }

  function itemHTML(r, schedules, withContact) {
    const steps = STEPS.map((step) => {
      const s = schedules.find((x) => x.id === r.id + ':' + step.key);
      const status = s ? s.status : 'skipped';
      return `<div class="step"><b>${step.label}</b>
        <span>${esc(formatDateTime(toTimestamp(addDays(r.dueDate, step.offset), r.time)))}</span>
        <span>⚡ ${esc(s ? s.quickTitle : '')}</span>
        <span class="status ${status}">${esc(CRM.schedules.STATUS_LABEL[status] || status)}</span></div>`;
    }).join('');
    return `<div class="item">
      <div class="item-icon">${icon('renew', 18)}</div>
      <div class="item-body">
        <div class="item-title">Vencimento: ${esc(formatDateTime(toTimestamp(r.dueDate, r.time)))}</div>
        <div class="item-meta">
          ${withContact ? `<span>👤 ${esc(r.chatName || r.chatPhone || 'Contato')}</span>` : ''}
          ${r.renewCount ? `<span>✅ Renovado ${r.renewCount}x</span>` : ''}
        </div>
        <div class="steps">${steps}</div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-edit="${r.id}" title="Editar">${icon('edit', 17)}</button>
        <button class="icon-btn danger" data-del="${r.id}" title="Excluir">${icon('trash', 17)}</button>
      </div>
    </div>`;
  }

  // ---------- Tela: criar / editar ----------
  async function openForm(existing) {
    const chat = CRM.wa.state.activeChat;
    if (!existing && !chat) return toast('Abra a conversa do cliente primeiro.', 'err');
    const editing = !!existing;
    const r = existing || {};
    let replies = await CRM.quick.list();
    const picked = { quick1: r.quick1Id || '', quick2: r.quick2Id || '' };

    const el = modal(`<div class="modal-head"><h2 class="modal-title">${editing ? 'Editar Renovação' : 'Criar Renovação'}</h2></div>
      <div class="row field">
        <div><div class="label">Data do vencimento</div><input class="input" type="date" name="date" value="${esc(r.dueDate || addDays(todayISO(), RENEW_DAYS))}"></div>
        <div><div class="label">Hora</div><input class="input" type="time" name="time" value="${esc(r.time || '')}"></div>
      </div>
      <div data-quick></div>
      <div class="plan" data-plan></div>
      <div class="error-msg" data-error></div>
      <div class="actions"><button class="btn" data-cancel>Cancelar</button><button class="btn" data-save>${editing ? 'Salvar' : 'Criar'}</button></div>`);

    const quickBox = el.querySelector('[data-quick]');
    const plan = el.querySelector('[data-plan]');
    const errorBox = el.querySelector('[data-error]');
    const dateInput = el.querySelector('[name="date"]');
    const timeInput = el.querySelector('[name="time"]');

    function renderQuick() {
      quickBox.innerHTML =
        CRM.quick.selectHTML({ name: 'quick1', label: 'Mensagem rápida — 1 dia antes e no dia do vencimento', selectedId: picked.quick1, replies }) +
        CRM.quick.selectHTML({ name: 'quick2', label: 'Mensagem rápida — 1 dia depois do vencimento', selectedId: picked.quick2, replies });
      CRM.quick.bindPreview(quickBox, replies);
      quickBox.querySelectorAll('select').forEach((sel) =>
        sel.addEventListener('change', () => {
          picked[sel.name] = sel.value;
          renderPlan();
        })
      );
      quickBox.querySelectorAll('[data-new-quick]').forEach((b) =>
        b.addEventListener('click', () =>
          CRM.quick.openQuickForm(async (item) => {
            replies = await CRM.quick.list();
            picked[b.dataset.newQuick] = item.id;
            renderQuick();
            renderPlan();
          })
        )
      );
    }

    function renderPlan() {
      const date = dateInput.value;
      const time = timeInput.value;
      if (!date || !time) {
        plan.innerHTML = 'Escolha a data do vencimento e a hora para ver quando cada mensagem será enviada.';
        return;
      }
      const now = Date.now();
      plan.innerHTML =
        '<div><b>Vai enviar:</b></div>' +
        STEPS.map((step) => {
          const at = toTimestamp(addDays(date, step.offset), time);
          const q = replies.find((x) => x.id === picked[step.quick === 'quick1Id' ? 'quick1' : 'quick2']);
          return `<div>• ${step.label}: ${esc(formatDateTime(at))} — ⚡ ${esc(q ? quickTitle(q) : 'escolha a mensagem')}${at <= now ? ' <i>(já passou, não será enviada)</i>' : ''}</div>`;
        }).join('');
    }

    dateInput.addEventListener('input', renderPlan);
    timeInput.addEventListener('input', renderPlan);
    el.querySelector('[data-cancel]').addEventListener('click', openList);
    el.querySelector('[data-save]').addEventListener('click', async () => {
      const fail = (msg) => (errorBox.textContent = msg);
      const date = dateInput.value;
      const time = timeInput.value;
      if (!date || !time) return fail('Escolha a data do vencimento e a hora.');
      if (!replies.some((q) => q.id === picked.quick1)) return fail('Escolha a mensagem rápida de 1 dia antes e do dia.');
      if (!replies.some((q) => q.id === picked.quick2)) return fail('Escolha a mensagem rápida de 1 dia depois.');
      if (toTimestamp(date, time) <= Date.now()) return fail('O vencimento precisa ser no futuro.');

      const renewal = {
        ...r,
        id: r.id || uid(),
        chatId: r.chatId || chat.id,
        chatName: r.chatName || chat.name || chat.pushname || '',
        chatPhone: r.chatPhone || chat.phone || '',
        dueDate: date,
        time,
        quick1Id: picked.quick1,
        quick2Id: picked.quick2,
        renewCount: r.renewCount || 0,
        history: r.history || [],
        createdAt: r.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      await store.updateRenewals((list) => list.filter((x) => x.id !== renewal.id).concat(renewal));
      await syncSchedules(renewal);
      toast(editing ? 'Renovação atualizada.' : 'Renovação criada: vencimento em ' + formatDateTime(toTimestamp(date, time)) + '.', 'ok');
      openList();
    });

    renderQuick();
    renderPlan();
  }

  // ---------- Botão "Renovado" ----------
  async function markRenewed() {
    const chat = CRM.wa.state.activeChat;
    if (!CRM.wa.state.ready || !chat) return toast('Abra a conversa do cliente primeiro.', 'err');
    const renewals = await forChat(chat.id);
    if (!renewals.length) {
      return toast('Este contato ainda não tem mensagem de renovação. Cadastre no botão logo abaixo.', 'err');
    }
    const r = renewals[0];
    const newDate = addDays(r.dueDate, RENEW_DAYS);
    const name = r.chatName || chat.name || 'O cliente';

    const el = modal(`<div class="modal-head"><h2 class="modal-title">Renovado</h2></div>
      <div class="confirm-text"><b>${esc(name)}</b> renovou?<br>
        O vencimento passa de <b>${shortDate(r.dueDate)}</b> para <b>${shortDate(newDate)}</b>, às ${esc(r.time)}.<br>
        <span class="muted">As mensagens de 1 dia antes, do dia e de 1 dia depois vão junto.</span></div>
      <div class="actions"><button class="btn" data-cancel>Cancelar</button><button class="btn" data-ok>Confirmar</button></div>`);
    el.querySelector('[data-cancel]').addEventListener('click', CRM.ui.closeModal);
    el.querySelector('[data-ok]').addEventListener('click', async () => {
      let updated = null;
      await store.updateRenewals((list) => {
        const item = list.find((x) => x.id === r.id);
        if (item) {
          const from = item.dueDate;
          item.dueDate = addDays(item.dueDate, RENEW_DAYS);
          item.renewCount = (item.renewCount || 0) + 1;
          item.history = (item.history || []).concat({ at: Date.now(), from, to: item.dueDate });
          item.updatedAt = Date.now();
          updated = { ...item };
        }
        return list;
      });
      if (!updated) return CRM.ui.closeModal();
      await syncSchedules(updated);
      CRM.ui.closeModal();
      toast('Renovado! Novo vencimento: ' + formatDateTime(toTimestamp(updated.dueDate, updated.time)) + '.', 'ok');
    });
  }

  return { openList, markRenewed, activeCount, addDays };
})();
