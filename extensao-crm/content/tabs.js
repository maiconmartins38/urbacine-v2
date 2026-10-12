// Abas (Kanban) no topo da tela.
// Cada aba guarda uma lista de conversas. Clicar na aba filtra a lista de conversas
// do WhatsApp; a engrenagem abre o menu de configuração.
CRM.tabs = (() => {
  const { esc, uid } = CRM.util;
  const { icon, modal, toast, notice } = CRM.ui;
  const store = CRM.store;

  const BAR_HEIGHT = CRM.layout.HEIGHT;
  let host = null;
  let shadow = null;
  let selectedId = null;
  let dropdown = null;
  let popover = null;

  const getTabs = () => store.get('tabs', []);
  const updateTabs = (fn) => store.serialUpdate('tabs', [], fn);

  // ---------- Cache de nomes/telefones dos contatos (para exportar e escolher) ----------
  async function refreshContacts() {
    const chats = await CRM.wa.listChats();
    const cache = await store.get('contactsCache', {});
    chats.forEach((c) => (cache[c.id] = { name: c.name || c.pushname || '', phone: c.phone || '', isGroup: c.isGroup }));
    await store.set('contactsCache', cache);
    return chats;
  }

  function phoneFromId(id) {
    const m = String(id).match(/^(\d+)@c\.us$/);
    return m ? m[1] : '';
  }

  // ---------- Barra ----------
  function mount() {
    if (host && host.isConnected) return;
    host = document.createElement('div');
    host.id = 'crm-ext-tabs';
    host.style.cssText = `position:fixed;top:0;left:0;right:0;height:${BAR_HEIGHT}px;z-index:990;`;
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CRM.styles}</style><div class="root">
      <div class="topbar">
        <button class="top-icon" data-clear title="Mostrar todas as conversas">${icon('funnel', 19)}</button>
        <button class="top-icon" data-left title="Rolar">${icon('chevLeft', 16, 2.2)}</button>
        <div class="tabs-scroll" data-scroll></div>
        <button class="top-icon" data-right title="Rolar">${icon('chevRight', 16, 2.2)}</button>
        <button class="top-icon" data-create title="Criar uma nova aba">${icon('folderPlus', 20)}</button>
        <button class="top-icon" data-list title="Todas as abas">${icon('menu', 20)}</button>
      </div></div>`;
    CRM.ui.isolateEvents(host);
    document.body.appendChild(host);
    CRM.layout.start({
      onAutoFail: () => toast('Não consegui encaixar as barras sem atrapalhar a tela, então elas ficaram por cima. Use o menu ☰ → "Ajustar posição da barra".', 'err'),
    });

    const scroll = shadow.querySelector('[data-scroll]');
    shadow.querySelector('[data-left]').addEventListener('click', () => scroll.scrollBy({ left: -300, behavior: 'smooth' }));
    shadow.querySelector('[data-right]').addEventListener('click', () => scroll.scrollBy({ left: 300, behavior: 'smooth' }));
    scroll.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scroll.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
    shadow.querySelector('[data-clear]').addEventListener('click', () => select(null));
    shadow.querySelector('[data-create]').addEventListener('click', () => openNamePopover());
    shadow.querySelector('[data-list]').addEventListener('click', (e) => openAllTabsMenu(e.currentTarget));
    scroll.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-tab]');
      if (!pill) return;
      if (e.target.closest('[data-gear]')) {
        if (selectedId !== pill.dataset.tab) select(pill.dataset.tab);
        openTabMenu(pill.dataset.tab, pill);
      } else {
        select(selectedId === pill.dataset.tab ? null : pill.dataset.tab);
      }
    });

    // Fecha menu/popover ao clicar fora.
    document.addEventListener('mousedown', (e) => {
      const path = e.composedPath();
      if (dropdown && !path.includes(dropdown)) closeDropdown();
      if (popover && !path.includes(popover) && !path.some((n) => n.dataset && n.dataset.create !== undefined)) closePopover();
    }, true);
    render();
  }

  async function render() {
    if (!shadow) return;
    const tabs = await getTabs();
    if (selectedId && !tabs.some((t) => t.id === selectedId)) selectedId = null;
    const scroll = shadow.querySelector('[data-scroll]');
    scroll.innerHTML = tabs.length
      ? tabs.map((t) => `<div class="tab-pill ${t.id === selectedId ? 'on' : ''}" data-tab="${t.id}" title="${esc(t.name)}">
          <span>${esc(t.name)}</span><span class="tab-count">${(t.chatIds || []).length}</span>
          <span class="tab-gear" data-gear title="Configurar aba">${icon('gear', 15)}</span></div>`).join('')
      : `<span class="tabs-empty">Nenhuma aba ainda. Clique na pasta com "+" para criar.</span>`;
    const clear = shadow.querySelector('[data-clear]');
    clear.classList.toggle('active', !!selectedId);
    clear.innerHTML = icon('funnel', 19) + (selectedId ? '<span class="dot"></span>' : '');
  }

  // ---------- Filtro ----------
  async function applyFilter() {
    if (!CRM.wa.state.ready) return;
    try {
      if (!selectedId) return await CRM.wa.setChatList('all');
      const tab = (await getTabs()).find((t) => t.id === selectedId);
      await CRM.wa.setChatList('custom', tab ? tab.chatIds || [] : []);
    } catch (err) {
      toast('Não consegui filtrar as conversas: ' + err.message, 'err');
    }
  }

  async function select(id) {
    selectedId = id;
    closeDropdown();
    await render();
    await applyFilter();
  }

  // ---------- Criar / editar nome ----------
  function closePopover() {
    if (popover) popover.remove();
    popover = null;
  }

  function openNamePopover(tab) {
    closeDropdown();
    closePopover();
    popover = document.createElement('div');
    popover.className = 'popover';
    popover.innerHTML = `${icon('folderGo', 24)}<span>${tab ? 'Edite o nome da aba' : 'Crie um nome para a nova aba'}</span>
      <input class="input" maxlength="40" placeholder="Digite um nome para a aba" value="${tab ? esc(tab.name) : ''}">
      <button class="btn-flat" data-ok>${tab ? 'Salvar' : 'Criar'}</button>
      <button class="icon-btn" data-x title="Fechar">${icon('close', 16, 2)}</button>`;
    popover.querySelector('svg').classList.add('lead');
    shadow.querySelector('.root').appendChild(popover);
    const input = popover.querySelector('input');
    input.focus();
    input.select();
    const submit = async () => {
      const name = input.value.trim();
      if (!name) return input.focus();
      if (tab) {
        await updateTabs((list) => list.map((t) => (t.id === tab.id ? { ...t, name } : t)));
        notice('Aba editada com sucesso');
      } else {
        await updateTabs((list) => [{ id: uid(), name, chatIds: [], createdAt: Date.now() }, ...list]);
        notice('Aba adicionada com sucesso');
        shadow.querySelector('[data-scroll]').scrollLeft = 0;
      }
      closePopover();
    };
    popover.querySelector('[data-ok]').addEventListener('click', submit);
    popover.querySelector('[data-x]').addEventListener('click', closePopover);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') closePopover();
    });
  }

  // ---------- Menus ----------
  function closeDropdown() {
    if (dropdown) dropdown.remove();
    dropdown = null;
  }

  function showDropdown(html, anchor, alignRight) {
    closeDropdown();
    closePopover();
    dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    dropdown.innerHTML = html;
    shadow.querySelector('.root').appendChild(dropdown);
    const r = anchor.getBoundingClientRect();
    dropdown.style.top = BAR_HEIGHT - 2 + 'px';
    if (alignRight) dropdown.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
    else dropdown.style.left = Math.max(8, Math.min(r.left - 50, window.innerWidth - 330)) + 'px';
    return dropdown;
  }

  async function openTabMenu(tabId, anchor) {
    const tab = (await getTabs()).find((t) => t.id === tabId);
    if (!tab) return;
    const el = showDropdown(`<div class="dropdown-title">${icon('folderGo', 22)}<span>${esc(tab.name)}</span></div>
      <button class="dropdown-item" data-act="members">Adicionar ou remover contatos na aba</button>
      <button class="dropdown-item" data-act="copy">Copiar contatos para outra aba</button>
      <button class="dropdown-item" data-act="export">Exportar contatos da aba</button>
      <button class="dropdown-item" data-act="edit">Editar Aba</button>
      <button class="dropdown-item" data-act="remove">Remover aba</button>
      <button class="dropdown-item" data-act="create">Criar uma nova aba</button>`, anchor);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      closeDropdown();
      ({ members: openMembers, copy: openCopy, export: exportCsv, edit: () => openNamePopover(tab), remove: removeTab, create: () => openNamePopover() })[b.dataset.act](tab);
    });
  }

  async function openAllTabsMenu(anchor) {
    const tabs = await getTabs();
    const el = showDropdown(`<div class="dropdown-title">${icon('menu', 20)}<span>Abas</span></div>
      ${tabs.map((t) => `<button class="dropdown-item" data-go="${t.id}"><span>${esc(t.name)}</span><span class="tab-count">${(t.chatIds || []).length}</span></button>`).join('')}
      <button class="dropdown-item" data-new>+ Criar uma nova aba</button>
      <button class="dropdown-item" data-layout>⚙ Ajustar posição da barra</button>`, anchor, true);
    el.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (go) {
        select(go.dataset.go).then(() => {
          const pill = shadow.querySelector(`[data-tab="${go.dataset.go}"]`);
          if (pill) pill.scrollIntoView({ inline: 'center', block: 'nearest' });
        });
      } else if (e.target.closest('[data-new]')) {
        openNamePopover();
      } else if (e.target.closest('[data-layout]')) {
        closeDropdown();
        openLayoutModal();
      }
    });
  }

  // ---------- Adicionar ou remover contatos ----------
  const COLORS = ['#e08e45', '#5b8def', '#9b6bd3', '#3baa8e', '#c2577e', '#7a8b99', '#d98e04', '#2f9bb3'];
  const initials = (name) => (String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();

  async function openMembers(tab) {
    if (!CRM.wa.state.ready) return toast('O WhatsApp Web ainda está carregando.', 'err');
    const chosen = new Set(tab.chatIds || []);
    let onlyChosen = false;
    const el = modal(`<div class="modal-head"><h2 class="modal-title">Contatos da aba ${esc(tab.name)}</h2></div>
      <input class="input picker-search" placeholder="Pesquisar por nome ou número" data-search>
      <div class="picker-info"><span data-count></span><button class="link-btn" style="padding:0" data-only>Mostrar só os selecionados</button></div>
      <div class="picker-list" data-list><div class="empty"><p>Carregando conversas…</p></div></div>
      <div class="actions"><button class="btn" data-cancel>Cancelar</button><button class="btn" data-save>Salvar</button></div>`, { wide: true });

    let people = [];
    try {
      const chats = await refreshContacts();
      const cache = await store.get('contactsCache', {});
      const known = new Set(chats.map((c) => c.id));
      people = chats.concat(
        [...chosen].filter((id) => !known.has(id)).map((id) => ({ id, name: (cache[id] || {}).name || '', phone: (cache[id] || {}).phone || phoneFromId(id) }))
      );
    } catch (err) {
      el.querySelector('[data-list]').innerHTML = `<div class="empty"><p>Não consegui carregar as conversas: ${esc(err.message)}</p></div>`;
      return;
    }
    people.forEach((p, i) => (p.color = COLORS[i % COLORS.length]));

    const list = el.querySelector('[data-list]');
    const search = el.querySelector('[data-search]');
    const count = el.querySelector('[data-count]');

    function draw() {
      const q = search.value.trim().toLowerCase();
      const digits = q.replace(/\D/g, '');
      let rows = people.filter((p) => (!onlyChosen || chosen.has(p.id)) &&
        (!q || (p.name || '').toLowerCase().includes(q) || (digits && (p.phone || '').includes(digits))));
      rows.sort((a, b) => (chosen.has(b.id) - chosen.has(a.id)) || (a.name || a.phone || '').localeCompare(b.name || b.phone || '', 'pt-BR'));
      const limited = rows.slice(0, 400);
      list.innerHTML = limited.length
        ? limited.map((p) => `<label class="picker-row"><input type="checkbox" data-id="${esc(p.id)}" ${chosen.has(p.id) ? 'checked' : ''}>
            <span class="avatar" style="background:${p.color}">${esc(initials(p.name || p.phone))}</span>
            <span style="min-width:0"><div class="picker-name">${esc(p.name || p.phone || p.id)}${p.isGroup ? ' · grupo' : ''}</div><div class="picker-phone">${esc(p.phone ? '+' + p.phone : '')}</div></span></label>`).join('') +
          (rows.length > limited.length ? `<div class="picker-row muted">Mais ${rows.length - limited.length} conversas… use a pesquisa.</div>` : '')
        : `<div class="empty"><p>Nenhuma conversa encontrada.</p></div>`;
      count.textContent = `${chosen.size} selecionado${chosen.size === 1 ? '' : 's'}`;
    }

    list.addEventListener('change', (e) => {
      const box = e.target.closest('input[data-id]');
      if (!box) return;
      if (box.checked) chosen.add(box.dataset.id);
      else chosen.delete(box.dataset.id);
      count.textContent = `${chosen.size} selecionado${chosen.size === 1 ? '' : 's'}`;
    });
    search.addEventListener('input', draw);
    el.querySelector('[data-only]').addEventListener('click', (e) => {
      onlyChosen = !onlyChosen;
      e.target.textContent = onlyChosen ? 'Mostrar todos' : 'Mostrar só os selecionados';
      draw();
    });
    el.querySelector('[data-cancel]').addEventListener('click', CRM.ui.closeModal);
    el.querySelector('[data-save]').addEventListener('click', async () => {
      await updateTabs((all) => all.map((t) => (t.id === tab.id ? { ...t, chatIds: [...chosen] } : t)));
      CRM.ui.closeModal();
      notice('Contatos da aba atualizados');
      if (selectedId === tab.id) applyFilter();
    });
    draw();
    search.focus();
  }

  // ---------- Copiar contatos para outra aba ----------
  async function openCopy(tab) {
    const others = (await getTabs()).filter((t) => t.id !== tab.id);
    if (!others.length) return toast('Crie outra aba primeiro.', 'err');
    const el = modal(`<div class="modal-head"><h2 class="modal-title">Copiar contatos</h2></div>
      <div class="label" style="font-size:13.5px;color:#111b21">Copiar os ${(tab.chatIds || []).length} contatos da aba <b>${esc(tab.name)}</b> para:</div>
      <div class="radio-list">${others.map((t, i) => `<label><input type="radio" name="dest" value="${t.id}" ${i === 0 ? 'checked' : ''}> ${esc(t.name)} <span class="muted">(${(t.chatIds || []).length})</span></label>`).join('')}</div>
      <div class="muted" style="font-size:12px">Os contatos continuam na aba de origem. Quem já estiver na aba de destino não é duplicado.</div>
      <div class="actions"><button class="btn" data-cancel>Cancelar</button><button class="btn" data-ok>Copiar</button></div>`);
    el.querySelector('[data-cancel]').addEventListener('click', CRM.ui.closeModal);
    el.querySelector('[data-ok]').addEventListener('click', async () => {
      const dest = el.querySelector('input[name="dest"]:checked').value;
      await updateTabs((all) => {
        const source = all.find((t) => t.id === tab.id);
        return all.map((t) => (t.id === dest ? { ...t, chatIds: [...new Set([...(t.chatIds || []), ...((source && source.chatIds) || [])])] } : t));
      });
      CRM.ui.closeModal();
      notice('Contatos copiados com sucesso');
      if (selectedId === dest) applyFilter();
    });
  }

  // ---------- Exportar ----------
  async function exportCsv(tab) {
    const ids = tab.chatIds || [];
    if (!ids.length) return toast('Esta aba não tem contatos para exportar.', 'err');
    try {
      await refreshContacts();
    } catch (_) {
      // usa o que já estiver guardado
    }
    const cache = await store.get('contactsCache', {});
    const cell = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
    const lines = ['Nome;Telefone'].concat(ids.map((id) => {
      const c = cache[id] || {};
      return [cell(c.name), cell(c.phone || phoneFromId(id))].join(';');
    }));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aba-' + tab.name.replace(/[^\w\-]+/g, '_') + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
    notice('Contatos exportados');
  }

  // ---------- Remover ----------
  async function removeTab(tab) {
    if (!confirm(`Remover a aba "${tab.name}"? Os contatos não são apagados do WhatsApp.`)) return;
    await updateTabs((all) => all.filter((t) => t.id !== tab.id));
    notice('Aba removida');
    if (selectedId === tab.id) select(null);
  }

  // ---------- Ajustar posição da barra + diagnóstico ----------
  function openLayoutModal() {
    const modes = [['auto', 'Automático (recomendado) — testa os modos e fica com o que encaixar certo'], ...Object.entries(CRM.layout.MODES)];
    const el = modal(`<div class="modal-head"><h2 class="modal-title">Posição da barra</h2></div>
      <div class="label" style="font-size:13.5px;color:#111b21">Escolha um modo. A tela muda na hora — fique com o que deixar o WhatsApp inteiro, abaixo da barra de abas e ao lado do menu lateral.</div>
      <div class="radio-list">${modes.map(([v, l]) => `<label><input type="radio" name="lm" value="${v}" ${CRM.layout.mode === v ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div>
      <div class="muted" style="font-size:12px" data-applied></div>
      <div class="field" style="margin-top:12px"><div class="label">Diagnóstico (só tamanhos e posições da tela, nenhuma mensagem)</div>
        <textarea class="textarea" readonly style="min-height:110px;font-family:monospace;font-size:11px" data-diag></textarea></div>
      <div class="actions"><button class="btn" data-copy>Copiar diagnóstico</button><button class="btn" data-close-modal>Fechar</button></div>`, { wide: true });
    const diag = el.querySelector('[data-diag]');
    const refresh = () => {
      diag.value = CRM.layout.diagnose();
      el.querySelector('[data-applied]').textContent = 'Em uso agora: ' + (CRM.layout.MODES[CRM.layout.applied] || 'nenhum (aguardando a tela do WhatsApp)');
    };
    el.querySelectorAll('input[name="lm"]').forEach((r) =>
      r.addEventListener('change', async () => {
        await CRM.layout.setMode(r.value);
        setTimeout(refresh, 1500);
      })
    );
    el.querySelector('[data-copy]').addEventListener('click', async () => {
      refresh();
      try {
        await navigator.clipboard.writeText(diag.value);
        notice('Diagnóstico copiado — cole na conversa com o Claude');
      } catch (_) {
        diag.select();
        toast('Não consegui copiar sozinho: o texto ficou selecionado, aperte Ctrl+C.', 'err');
      }
    });
    el.querySelector('[data-close-modal]').addEventListener('click', CRM.ui.closeModal);
    refresh();
  }

  // ---------- Para outras telas (Cadastro) ----------
  async function tabOf(chatId, preferredId) {
    const tabs = await getTabs();
    const preferred = tabs.find((t) => t.id === preferredId && (t.chatIds || []).includes(chatId));
    return preferred || tabs.find((t) => (t.chatIds || []).includes(chatId)) || null;
  }

  // Coloca a conversa em uma aba (tirando da aba anterior "fromId", se houver).
  async function moveChat(chatId, fromId, toId) {
    await updateTabs((all) => all.map((t) => {
      let ids = t.chatIds || [];
      if (fromId && t.id === fromId && fromId !== toId) ids = ids.filter((x) => x !== chatId);
      if (toId && t.id === toId && !ids.includes(chatId)) ids = [...ids, chatId];
      return { ...t, chatIds: ids };
    }));
    if (selectedId && (selectedId === fromId || selectedId === toId)) applyFilter();
  }

  // Liga ou tira uma conversa de uma aba (atalho "Abas" no topo da conversa).
  // Ao ligar, essa aba passa a ser a do Kanban no Cadastro do cliente.
  async function setChatInTab(chatId, tabId, on) {
    await updateTabs((all) => all.map((t) => {
      if (t.id !== tabId) return t;
      const ids = t.chatIds || [];
      return { ...t, chatIds: on ? [...new Set([...ids, chatId])] : ids.filter((x) => x !== chatId) };
    }));
    await syncClients(on ? { [chatId]: tabId } : {});
    if (selectedId === tabId) applyFilter();
  }

  // Mantém o campo Kanban do Cadastro igual às abas:
  // - "prefer" diz qual aba acabou de receber a conversa (vira a do Kanban);
  // - se a aba do Kanban não tem mais a conversa (ou foi apagada), passa para outra aba
  //   em que ela esteja, ou "Nenhuma".
  async function syncClients(prefer = {}) {
    const tabs = await getTabs();
    const clients = await store.getClients();
    const needs = clients.some((c) => {
      const inTabs = tabs.filter((t) => (t.chatIds || []).includes(c.chatId)).map((t) => t.id);
      return prefer[c.chatId] ? prefer[c.chatId] !== c.kanbanColumnId : (c.kanbanColumnId ? !inTabs.includes(c.kanbanColumnId) : inTabs.length > 0);
    });
    if (!needs) return;
    await store.updateClients((list) => list.map((c) => {
      const inTabs = tabs.filter((t) => (t.chatIds || []).includes(c.chatId)).map((t) => t.id);
      let k = c.kanbanColumnId || null;
      if (prefer[c.chatId] && inTabs.includes(prefer[c.chatId])) k = prefer[c.chatId];
      else if (!k || !inTabs.includes(k)) k = inTabs[0] || null;
      return k === (c.kanbanColumnId || null) ? c : { ...c, kanbanColumnId: k, updatedAt: Date.now() };
    }));
  }

  store.onChange((changes) => {
    if (changes.tabs) {
      render();
      syncClients();
    }
  });
  CRM.wa.on('ready', () => selectedId && applyFilter());

  return { mount, list: getTabs, tabOf, moveChat, setChatInTab };
})();
