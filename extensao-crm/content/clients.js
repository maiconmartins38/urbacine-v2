// Cadastro do cliente: nome, telefone (puxado da conversa), descrição livre
// (ex.: nomes dos servidores) e valor de lucro.
// O campo "Kanban" coloca o cliente numa das abas do topo (kanbanColumnId = id da aba).
CRM.clients = (() => {
  const { esc, uid, formatDateTime } = CRM.util;
  const { icon, modal, toast } = CRM.ui;
  const store = CRM.store;

  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatMoney = (cents) => money.format((cents || 0) / 100);

  // "1.500,50" / "1500.5" / "R$ 150" -> centavos (ou null se inválido)
  function parseMoney(text) {
    let t = String(text || '').replace(/[^\d,.-]/g, '');
    if (!t) return null;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if ((t.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, '');
    const value = Number(t);
    return Number.isFinite(value) ? Math.round(value * 100) : null;
  }

  function formatPhone(digits) {
    const d = String(digits || '').replace(/\D/g, '');
    const m = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
    if (m) return `+55 ${m[1]} ${m[2]}-${m[3]}`;
    return d ? '+' + d : '';
  }

  async function forChat(chatId) {
    return (await store.getClients()).find((c) => c.chatId === chatId) || null;
  }

  async function countFor(chatId) {
    return chatId && (await forChat(chatId)) ? 1 : 0;
  }

  // ---------- Tela: lista ----------
  let showAll = false;

  async function openList() {
    const chat = CRM.wa.state.activeChat;
    if (!CRM.wa.state.ready) {
      modal(`<div class="modal-head"><h2 class="modal-title">Cadastro</h2></div>
        <div class="empty"><p>O WhatsApp Web ainda está carregando. Espere alguns segundos e tente de novo.</p></div>`);
      return;
    }
    const all = await store.getClients();
    const list = (showAll || !chat ? all : all.filter((c) => c.chatId === chat.id)).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR')
    );
    const canAdd = chat && !all.some((c) => c.chatId === chat.id);

    const head = `<div class="modal-head">
      <h2 class="modal-title">Cadastro</h2>
      <div class="head-actions">
        <button class="pill-btn ${showAll ? 'on' : ''}" data-all>${showAll ? 'Exibindo Todos' : 'Exibir Todos'} ${icon('eye', 13, 2)}</button>
      </div>
    </div>`;

    const body = list.length
      ? `<div class="list">${list.map(itemHTML).join('')}</div>
         <div class="center">${canAdd ? '<button class="btn" data-add>Adicionar</button>' : ''}</div>`
      : `<div class="empty">
          <div class="empty-icon">${icon('client', 24)}</div>
          <h3>${showAll ? 'Nenhum cliente cadastrado' : 'Este contato ainda não tem cadastro'}</h3>
          <p>Cadastre o cliente com nome, telefone, descrição e valor.</p>
          ${canAdd ? '<button class="btn" data-add>Adicionar</button>' : ''}
        </div>`;

    const el = modal(head + body, { wide: true });
    el.querySelector('[data-all]').addEventListener('click', () => {
      showAll = !showAll;
      openList();
    });
    el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => openForm()));
    el.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => openForm(all.find((c) => c.id === b.dataset.edit)))
    );
    el.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Excluir este cadastro?')) return;
        await store.updateClients((l) => l.filter((c) => c.id !== b.dataset.del));
        openList();
      })
    );
  }

  function itemHTML(c) {
    return `<div class="item">
      <div class="item-icon">${icon('client', 18)}</div>
      <div class="item-body">
        <div class="item-title">${esc(c.name || 'Sem nome')}</div>
        <div class="item-meta">
          ${c.phone ? `<span>📞 ${esc(formatPhone(c.phone))}</span>` : ''}
          <span>💰 ${esc(formatMoney(c.valueCents))}</span>
        </div>
        ${c.description ? `<div class="item-text" style="margin-top:4px">${esc(c.description)}</div>` : ''}
        <div class="item-meta"><span>Cadastrado em ${esc(formatDateTime(c.createdAt))}</span></div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-edit="${c.id}" title="Editar">${icon('edit', 17)}</button>
        <button class="icon-btn danger" data-del="${c.id}" title="Excluir">${icon('trash', 17)}</button>
      </div>
    </div>`;
  }

  // ---------- Tela: cadastrar / editar ----------
  async function openForm(existing) {
    const chat = CRM.wa.state.activeChat;
    if (!existing && !chat) return toast('Abra a conversa do cliente primeiro.', 'err');
    const editing = !!existing;
    const c = existing || {};
    const chatId = c.chatId || chat.id;
    const tabs = await CRM.tabs.list();
    const currentTab = await CRM.tabs.tabOf(chatId, c.kanbanColumnId);
    const phone = c.phone || (chat && chat.phone) || '';
    const name = c.name != null ? c.name : (chat && (chat.name || chat.pushname)) || '';

    const el = modal(`<div class="modal-head"><h2 class="modal-title">${editing ? 'Editar Cadastro' : 'Cadastrar Cliente'}</h2></div>
      <div class="field"><div class="label">Nome do cliente</div>
        <input class="input" name="name" placeholder="Nome do cliente" value="${esc(name)}"></div>
      <div class="field"><div class="label">Telefone ${CRM.ui.infoHTML('Puxado automaticamente da conversa aberta.')}</div>
        <input class="input" name="phone" placeholder="Ex.: +55 38 99865-7020" value="${esc(formatPhone(phone))}"></div>
      <div class="field"><div class="label">Descrição</div>
        ${CRM.ui.textareaHTML({ name: 'description', placeholder: 'Escreva livremente (ex.: nomes dos servidores)', value: c.description || '' })}</div>
      <div class="row field">
        <div><div class="label">Valor (lucro)</div>
          <input class="input" name="value" inputmode="decimal" placeholder="R$ 0,00" value="${c.valueCents != null ? esc(formatMoney(c.valueCents)) : ''}"></div>
        <div><div class="label">Kanban ${CRM.ui.infoHTML('A aba do topo da tela em que este cliente fica. Crie abas na pasta com "+" no canto superior direito.')}</div>
          <select class="select" name="kanban" ${tabs.length ? '' : 'disabled'}>
            ${tabs.length
              ? '<option value="">Nenhuma</option>' + tabs.map((t) => `<option value="${t.id}" ${currentTab && currentTab.id === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')
              : '<option value="">Nenhuma aba criada ainda</option>'}
          </select></div>
      </div>
      <div class="error-msg" data-error></div>
      <div class="actions"><button class="btn" data-cancel>Cancelar</button><button class="btn" data-save>${editing ? 'Salvar' : 'Cadastrar'}</button></div>`);

    const field = (n) => el.querySelector(`[name="${n}"]`);
    const errorBox = el.querySelector('[data-error]');
    CRM.ui.attachEmoji(el.querySelector('[data-emoji]'), field('description'));
    field('value').addEventListener('blur', () => {
      const cents = parseMoney(field('value').value);
      if (cents != null) field('value').value = formatMoney(cents);
    });

    el.querySelector('[data-cancel]').addEventListener('click', openList);
    el.querySelector('[data-save]').addEventListener('click', async () => {
      const nameValue = field('name').value.trim();
      const phoneValue = field('phone').value.replace(/\D/g, '');
      const valueText = field('value').value.trim();
      const cents = valueText ? parseMoney(valueText) : 0;
      if (!nameValue) return (errorBox.textContent = 'Escreva o nome do cliente.');
      if (cents == null) return (errorBox.textContent = 'Valor inválido. Exemplo: 150,00');

      const client = {
        ...c,
        id: c.id || uid(),
        chatId,
        name: nameValue,
        phone: phoneValue,
        description: field('description').value.trim(),
        valueCents: cents,
        kanbanColumnId: field('kanban').value || null,
        createdAt: c.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      await store.updateClients((list) => list.filter((x) => x.id !== client.id).concat(client));
      const previousTabId = currentTab ? currentTab.id : null;
      if (previousTabId !== client.kanbanColumnId) await CRM.tabs.moveChat(chatId, previousTabId, client.kanbanColumnId);
      toast(editing ? 'Cadastro atualizado.' : 'Cliente cadastrado.', 'ok');
      openList();
    });
  }

  return { openList, countFor, forChat, parseMoney, formatMoney };
})();
