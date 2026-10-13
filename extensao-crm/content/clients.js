// Cadastro do cliente: nome, telefone (puxado da conversa), descrição livre
// (ex.: nomes dos servidores), valor de lucro e o vencimento (ciclo de renovação).
// A aba do Kanban é automática: o vencimento põe o cliente na aba do mês, e o ciclo
// leva para NUTRIR e REMARKTING (ver renewals.js).
CRM.clients = (() => {
  const { esc, uid, formatDateTime } = CRM.util;
  const { icon, modal, toast, notice } = CRM.ui;
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

  // fresh: aberta pelo botão da conversa → mostra só o contato aberto ("Exibir Todos" volta a desligar).
  async function openList(opts) {
    if (opts && opts.fresh) showAll = false;
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
    const tabs = await CRM.tabs.list();
    const cycles = Object.fromEntries((await store.getRenewals()).map((r) => [r.chatId, r]));

    const head = `<div class="modal-head">
      <h2 class="modal-title">Cadastro</h2>
      <div class="head-actions">
        <button class="pill-btn ${showAll ? 'on' : ''}" data-all>${showAll ? 'Exibindo Todos' : 'Exibir Todos'} ${icon('eye', 13, 2)}</button>
      </div>
    </div>`;

    const body = list.length
      ? `<div class="list">${list.map((c) => itemHTML(c, tabs, cycles[c.chatId])).join('')}</div>
         <div class="center">${canAdd ? '<button class="btn" data-add>Adicionar</button>' : ''}</div>`
      : `<div class="empty">
          <div class="empty-icon">${icon('client', 24)}</div>
          <h3>${showAll ? 'Nenhum cliente cadastrado' : 'Este contato ainda não tem cadastro'}</h3>
          <p>Cadastre o cliente com nome, telefone, descrição, valor e o vencimento.</p>
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
        const c = all.find((x) => x.id === b.dataset.del);
        const inTabs = (await CRM.tabs.list()).filter((t) => (t.chatIds || []).includes(c.chatId)).map((t) => t.name);
        if (!confirm(`Excluir o cadastro de ${c.name || 'este cliente'}?\n\nSai tudo o que é dele na ferramenta:\n• nome, telefone, valor e descrição\n• vencimento e mensagens de renovação, NUTRIR e remarketing` +
          (inTabs.length ? `\n• aba${inTabs.length > 1 ? 's' : ''} do Kanban: ${inTabs.join(', ')}` : '') + '\n\n(As anotações e a conversa no WhatsApp continuam.)')) return;
        await store.updateClients((l) => l.filter((x) => x.id !== c.id));
        await CRM.renewals.removeCycle(c.chatId);
        await CRM.tabs.removeChat(c.chatId);
        notice('Cadastro excluído');
        openList();
      })
    );
  }

  // Cartão do cliente: nome e situação no topo, e os dados numa tabela com os ícones da ferramenta.
  function itemHTML(c, tabs = [], r = null) {
    const R = CRM.renewals;
    const stage = R.stageOf(r);
    const name = c.name || 'Sem nome';
    const initials = (name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
    const inTabs = tabs.filter((t) => (t.chatIds || []).includes(c.chatId)).map((t) => t.name);
    const cell = (ic, label, value, extra = '') =>
      `<div class="cc-cell${extra}"><div class="cc-label">${icon(ic, 14)}${label}</div><div class="cc-value">${value}</div></div>`;
    const value = c.valueCents != null
      ? esc(formatMoney(c.valueCents))
      : `<span class="cc-none">sem valor</span>${c.previousValueCents ? ` <span class="cc-none">(antes ${esc(formatMoney(c.previousValueCents))})</span>` : ''}`;
    return `<div class="cc">
      <div class="cc-head">
        <div class="cc-avatar">${esc(initials)}</div>
        <div class="cc-who">
          <div class="cc-name">${esc(name)}</div>
          <div class="cc-tags">
            ${r ? `<span class="cc-chip ${stage}">${esc(R.STAGE_LABEL[stage] || stage)}</span>` : '<span class="cc-chip none">Sem vencimento</span>'}
            ${r && r.renewCount ? `<span class="cc-chip renewed">${icon('renewed', 12, 2)}Renovou ${r.renewCount}x</span>` : ''}
          </div>
        </div>
        <div class="item-actions">
          <button class="icon-btn" data-edit="${c.id}" title="Editar">${icon('edit', 17)}</button>
          <button class="icon-btn danger" data-del="${c.id}" title="Excluir">${icon('trash', 17)}</button>
        </div>
      </div>
      <div class="cc-grid">
        ${cell('contactCard', 'Telefone', c.phone ? esc(formatPhone(c.phone)) : '<span class="cc-none">sem número</span>')}
        ${cell('money', 'Valor', value)}
        ${cell('folderGo', 'Aba', inTabs.length ? esc(inTabs.join(', ')) : '<span class="cc-none">nenhuma</span>')}
        ${cell('schedule', 'Vencimento', r ? `${esc(R.shortDate(r.dueDate))} <span class="cc-none">às</span> ${esc(r.time)}` : '<span class="cc-none">sem vencimento</span>')}
        ${c.description ? cell('notes', 'Descrição', `<span class="cc-desc">${esc(c.description)}</span>`, ' wide') : ''}
      </div>
      <div class="cc-foot">${icon('clock', 13)}Cadastrado em ${esc(formatDateTime(c.createdAt))}</div>
    </div>`;
  }

  // ---------- Tela: cadastrar / editar ----------
  async function openForm(existing) {
    const chat = CRM.wa.state.activeChat;
    if (!existing && !chat) return toast('Abra a conversa do cliente primeiro.', 'err');
    const editing = !!existing;
    const c = existing || {};
    const chatId = c.chatId || chat.id;
    const phone = c.phone || (chat && chat.id === chatId && chat.phone) || '';
    const name = c.name != null ? c.name : (chat && (chat.name || chat.pushname)) || '';
    const r = await CRM.renewals.forChat(chatId);
    const legacy = !editing && !!r; // vencimento antigo sem cadastro: o formulário novo começa vazio
    const cycle = CRM.renewals.initialState(legacy ? null : r);
    const cents = c.valueCents != null ? c.valueCents : null;

    const el = modal(`<div class="modal-head"><h2 class="modal-title">${editing ? 'Editar Cadastro' : 'Cadastrar Cliente'}</h2></div>
      <div class="field"><div class="label">Nome do cliente</div>
        <input class="input" name="name" placeholder="Nome do cliente" value="${esc(name)}"></div>
      <div class="row field">
        <div><div class="label">Telefone ${CRM.ui.infoHTML('Puxado automaticamente da conversa aberta.')}</div>
          <input class="input" name="phone" placeholder="Ex.: +55 38 99865-7020" value="${esc(formatPhone(phone))}"></div>
        <div><div class="label">Valor (lucro)</div>
          <input class="input" name="value" inputmode="decimal" placeholder="R$ 0,00" value="${cents != null ? esc(formatMoney(cents)) : ''}"></div>
      </div>
      <div class="field"><div class="label">Descrição</div>
        ${CRM.ui.textareaHTML({ name: 'description', placeholder: 'Escreva livremente (ex.: nomes dos servidores)', value: c.description || '' })}</div>
      ${CRM.renewals.fieldsHTML({ stage: legacy ? CRM.renewals.legacyNotice(r) : await CRM.renewals.stageText(r) })}
      <div class="error-msg" data-error></div>
      <div class="actions"><button class="btn" data-cancel>Cancelar</button><button class="btn" data-save>${editing ? 'Salvar' : 'Cadastrar'}</button></div>`, { wide: true });

    const field = (n) => el.querySelector(`[name="${n}"]`);
    const errorBox = el.querySelector('[data-error]');
    CRM.ui.attachEmoji(el.querySelector('[data-emoji]'), field('description'));
    field('value').addEventListener('blur', () => {
      const v = parseMoney(field('value').value);
      if (v != null) field('value').value = formatMoney(v);
    });
    const cycleFields = await CRM.renewals.bindFields(el, cycle);

    el.querySelector('[data-cancel]').addEventListener('click', openList);
    el.querySelector('[data-save]').addEventListener('click', async () => {
      const result = await saveAll(chatId, {
        name: field('name').value.trim(),
        phone: field('phone').value.replace(/\D/g, ''),
        description: field('description').value.trim(),
        valueText: field('value').value.trim(),
      }, cycle, r, cycleFields, { legacy });
      if (result.cancelled) return;
      if (result.error) return (errorBox.textContent = result.error);
      toast(result.message, 'ok');
      openList();
    });
  }

  // Valida e grava o cadastro + o vencimento. Usado pela janela e pelo painel da direita.
  // Devolve { error }, { cancelled } ou { message }.
  // legacy: o contato só tinha um vencimento antigo (sem cadastro) — sem data, ele é apagado sem perguntar.
  async function saveAll(chatId, form, cycle, r, cycleFields, { legacy = false } = {}) {
    if (!form.name) return { error: 'Escreva o nome do cliente.' };
    const cents = form.valueText ? parseMoney(form.valueText) : null;
    if (form.valueText && cents == null) return { error: 'Valor inválido. Exemplo: 150,00' };
    const changed = !r || r.dueDate !== cycle.dueDate || r.time !== cycle.time || r.quick1Id !== cycle.quick1Id || r.quick2Id !== cycle.quick2Id;
    if (cycle.dueDate && changed) {
      const problem = cycleFields.validate();
      if (problem) return { error: problem };
    }
    if (!cycle.dueDate && r && !legacy && !confirm('Tirar o vencimento deste cliente? As mensagens de renovação dele serão apagadas.')) return { cancelled: true };
    const existing = await forChat(chatId);
    await saveFor(chatId, { name: form.name, phone: form.phone, description: form.description, valueCents: cents });
    await saveContactName(chatId, form.name);
    // O nome do cadastro é o usado no {nome} das mensagens do ciclo.
    if (r && r.chatName !== form.name) {
      await store.updateRenewals((list) => list.map((x) => (x.chatId === chatId ? { ...x, chatName: form.name } : x)));
      await store.updateSchedules((list) => list.map((x) => (x.renewalId && x.chatId === chatId ? { ...x, chatName: form.name } : x)));
    }
    if (cycle.dueDate && changed) {
      const saved = await CRM.renewals.saveCycle(chatId, { name: form.name, phone: form.phone }, cycle);
      return { message: `${existing ? 'Cadastro salvo' : 'Cliente cadastrado'}: vence ${CRM.renewals.shortDate(saved.dueDate)} às ${saved.time} (aba ${CRM.renewals.monthTab(saved.dueDate)}).` };
    }
    if (!cycle.dueDate && r) await CRM.renewals.removeCycle(chatId);
    return { message: existing ? 'Cadastro atualizado.' : 'Cliente cadastrado.' };
  }

  // O nome do cadastro também vira o nome do contato no WhatsApp ("Salvar contato" lá em cima).
  // Vale para número (@c.us) e para os ids novos do WhatsApp (@lid); grupos e canais ficam de fora.
  async function saveContactName(chatId, name) {
    if (!name || !CRM.wa.state.ready || /@(g\.us|newsletter|broadcast)$/.test(chatId)) return;
    try {
      const contact = await CRM.wa.getContact(chatId).catch(() => null);
      if (contact && contact.isMyContact && contact.name === name) return;
      await CRM.wa.saveContact(chatId, name);
      await CRM.wa.refreshActiveChat();
      if (CRM.contactName) CRM.contactName.place();
    } catch (err) {
      toast('Cadastro salvo, mas não consegui salvar o nome no contato do WhatsApp: ' + err.message, 'err');
    }
  }

  // Grava o cadastro da conversa (cria ou atualiza) e põe o cliente na aba do Kanban.
  // Usado pela janela do Cadastro e pelo painel da direita — os dois mexem no mesmo registro.
  async function saveFor(chatId, data) {
    const existing = await forChat(chatId);
    const currentTab = await CRM.tabs.tabOf(chatId, existing && existing.kanbanColumnId);
    const client = {
      ...(existing || {}),
      id: (existing && existing.id) || uid(),
      chatId,
      ...data,
      createdAt: (existing && existing.createdAt) || Date.now(),
      updatedAt: Date.now(),
    };
    await store.updateClients((list) => list.filter((x) => x.id !== client.id).concat(client));
    // Só mexe nas abas quando quem chamou escolheu a aba (o ciclo de renovação cuida do resto).
    const previousTabId = currentTab ? currentTab.id : null;
    if ('kanbanColumnId' in data && previousTabId !== (client.kanbanColumnId || null)) await CRM.tabs.moveChat(chatId, previousTabId, client.kanbanColumnId || null);
    return client;
  }

  return { openList, openForm, countFor, forChat, saveFor, saveAll, parseMoney, formatMoney, formatPhone };
})();
