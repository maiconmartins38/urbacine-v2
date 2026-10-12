// Aba "Mensagens Rápidas" do painel da direita: lista (pesquisa, filtros, categorias),
// criar/editar resposta com várias ações, enviar, prévia e cadastro de categorias.
CRM.quickPanel = (() => {
  const { esc, uid } = CRM.util;
  const { icon, toast, notice } = CRM.ui;
  const Q = () => CRM.quick;

  let root = null;
  let view = { name: 'list' };
  const filter = { q: '', mode: 'all', type: null, categoryId: null };
  const collapsed = new Set();
  let popup = null;
  let editor = null; // editor de ações aberto (painel ou janela "Editar e enviar")

  const CSS = `
    .qp-top { display: flex; align-items: center; gap: 6px; margin: 2px 0 8px; }
    .qp-search { flex: 1; display: flex; align-items: center; gap: 6px; background: #f0f2f5; border-radius: 8px; padding: 0 8px; color: #54656f; height: 30px; }
    .qp-search input { border: 0; background: none; outline: none; font: inherit; font-size: 12.5px; flex: 1; min-width: 0; color: var(--text); }
    .qp-search button { border: 0; background: none; color: #54656f; cursor: pointer; display: grid; padding: 0; }
    .qp-add { border: 0; background: none; color: var(--teal); cursor: pointer; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; position: relative; }
    .qp-add:hover { background: #e6f4f2; }
    .qp-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
    .qp-chip { border: 0; border-radius: 6px; padding: 3px 8px; font-size: 11.5px; font-weight: 700; color: #fff; background: var(--teal); cursor: pointer; display: inline-flex; align-items: center; gap: 3px; }
    .qp-chip.on { background: #1d2a44; }
    .qp-group { border-radius: 8px; margin-bottom: 10px; }
    .qp-group.cat { border: 1.5px solid; padding: 2px 4px 4px; }
    .qp-ghead { display: flex; align-items: center; gap: 6px; padding: 5px 6px; font-weight: 700; font-size: 12.5px; cursor: pointer; user-select: none; }
    .qp-ghead .chev { margin-left: auto; color: #54656f; display: grid; }
    .qp-item { display: flex; align-items: center; gap: 4px; padding: 5px 4px 5px 6px; border-radius: 7px; font-size: 12.5px; }
    .qp-item:hover { background: rgba(11, 20, 26, .05); }
    .qp-group.cat .qp-item { background: rgba(255,255,255,.55); margin-top: 3px; }
    .qp-ico { color: #54656f; display: grid; flex: none; }
    .qp-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .qp-ib { border: 0; background: none; color: #3b4a54; cursor: pointer; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 5px; flex: none; padding: 0; }
    .qp-ib:hover { background: rgba(11, 20, 26, .08); color: var(--teal); }
    .qp-empty { text-align: center; padding: 22px 6px; color: var(--muted); font-size: 12.5px; }
    .qp-empty .empty-icon { color: var(--teal); display: grid; place-items: center; margin-bottom: 6px; }
    .qp-empty h4 { color: var(--text); font-size: 15px; margin: 0 0 6px; }
    .qp-pop { position: fixed; z-index: 5; background: #fff; border-radius: 10px; box-shadow: 0 8px 26px rgba(11, 20, 26, .22); padding: 6px; min-width: 190px; max-height: 70vh; overflow: auto; }
    .qp-pop button.opt { display: flex; align-items: center; gap: 8px; width: 100%; border: 0; background: none; text-align: left; padding: 6px 8px; border-radius: 6px; font-size: 12.5px; color: var(--text); cursor: pointer; }
    .qp-pop button.opt:hover { background: #f0f2f5; }
    .qp-pop button.opt.danger { color: var(--danger); }
    .qp-pop .opt svg { color: #54656f; flex: none; }
    .qp-acc .chev { margin-left: auto; display: grid; }
    .qp-acc-body { padding-left: 14px; border-left: 1px solid #e9edef; margin: 0 0 4px 14px; }
    .qp-back { border: 0; background: none; color: var(--teal); cursor: pointer; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; position: relative; }
    .qp-back:hover { background: #e6f4f2; }
    .qp-titlebar { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
    .qp-titlebar h3 { margin: 0; font-size: 15px; flex: 1; text-align: center; padding-right: 28px; }
    .qp-titlebar h3.left { text-align: left; padding-right: 0; }
    .qp-card { border: 1px solid #e9edef; border-radius: 10px; padding: 10px; margin: 10px 0; box-shadow: 0 1px 4px rgba(11,20,26,.06); }
    .qp-card-title { font-weight: 700; font-size: 13.5px; margin-bottom: 6px; }
    .qp-tags { display: inline-flex; align-items: center; gap: 4px; background: var(--teal); color: #fff; border-radius: 10px; padding: 1px 8px; font-size: 11px; font-weight: 700; position: relative; cursor: help; }
    .qp-tags .info-pop { left: 0; transform: none; }
    .qp-tags:hover .info-pop { display: block; }
    .qp-action { border: 1px solid #e3e8ea; border-radius: 8px; padding: 7px; margin-top: 8px; background: #fbfcfc; }
    .qp-ahead { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12.5px; margin-bottom: 6px; }
    .qp-ahead .n { background: var(--teal); color: #fff; border-radius: 50%; width: 18px; height: 18px; display: grid; place-items: center; font-size: 10.5px; flex: none; }
    .qp-ahead .sp { flex: 1; }
    .qp-in { height: 30px; font-size: 12.5px; padding: 5px 8px; margin-bottom: 5px; }
    .qp-ta { min-height: 64px; font-size: 12.5px; }
    .qp-row2 { display: flex; gap: 5px; } .qp-row2 > * { flex: 1; min-width: 0; }
    .qp-hint { color: var(--muted); font-size: 11.5px; margin-top: 2px; }
    .qp-media { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
    .qp-import { border: 1.5px solid var(--teal); background: #fff; color: var(--teal); font-weight: 700; font-size: 12px; border-radius: 7px; padding: 4px 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; flex: none; }
    .qp-import.rec { background: var(--danger); color: #fff; border-color: var(--danger); }
    .qp-fname { font-size: 11.5px; color: #3b4a54; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .qp-thumb { max-width: 100%; max-height: 90px; border-radius: 6px; display: block; margin-bottom: 5px; }
    .qp-addact { display: block; margin: 12px auto 2px; border: 1.5px solid var(--teal); color: var(--teal); background: #fff; font-weight: 700; border-radius: 7px; padding: 6px 14px; cursor: pointer; font-size: 13px; }
    .qp-addact.filled { background: linear-gradient(90deg, #24988d 0%, #2ba295 55%, #8ad2c7 100%); color: #fff; border: 0; box-shadow: 0 3px 9px rgba(36,152,141,.35); }
    .qp-selectlike { width: 100%; display: flex; align-items: center; gap: 6px; border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 6px 8px; font-size: 12.5px; cursor: pointer; color: var(--text); }
    .qp-selectlike .chev { margin-left: auto; display: grid; }
    .qp-cat-row { display: flex; align-items: center; gap: 6px; border: 1px solid #e3e8ea; border-radius: 8px; padding: 6px 6px 6px 8px; margin-bottom: 6px; font-size: 12.5px; font-weight: 600; }
    .qp-color { width: 40px; height: 28px; border: 0; padding: 0; background: none; cursor: pointer; }
    .qp-color::-webkit-color-swatch-wrapper { padding: 0; } .qp-color::-webkit-color-swatch { border: 0; border-radius: 7px; }
    .qp-center { text-align: center; }
    .qp-tip { position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); background: var(--teal); color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap; opacity: 0; pointer-events: none; z-index: 3; }
    .qp-add:hover .qp-tip, .qp-back:hover .qp-tip { opacity: 1; }
    .qp-timer { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; font-size: 11.5px; color: #3b4a54; margin: 2px 0 6px; }
    .qp-timer input { width: 46px; height: 26px; border: 1px solid var(--line); border-radius: 6px; text-align: center; font: inherit; font-size: 12px; padding: 0 2px; }
    .qp-timer input:focus { outline: none; border-color: var(--teal); }
    .qp-pop .pop-head { display: flex; align-items: center; gap: 7px; font-weight: 700; font-size: 13px; padding: 6px 8px 7px; border-bottom: 1px solid #eef0f2; margin-bottom: 3px; }
    .qp-pop .pop-head span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .es-head { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; margin: -4px 30px 10px 0; text-transform: uppercase; }
    .es-head .ico { color: #54656f; display: grid; }
    .es-card { margin: 0; max-height: calc(100vh - 220px); overflow: auto; }
    .es-foot { display: flex; justify-content: flex-end; margin-top: 12px; }
    .es-send { width: 46px; height: 46px; border-radius: 50%; border: 0; background: #1fa855; color: #fff; display: grid; place-items: center; box-shadow: 0 3px 10px rgba(31,168,85,.4); }
    .es-send:hover { filter: brightness(1.06); }
  `;

  // ---------- Utilidades ----------
  function rgba(hex, a) {
    const h = String(hex || '#24988d').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function popLayer() {
    return CRM.panel.root.querySelector('.root');
  }

  function closePopup() {
    if (popup) popup.remove();
    popup = null;
  }

  // Menu flutuante perto de um botão (pode sair do painel para a esquerda, como no vídeo).
  // layer: onde o menu é colocado (padrão: o painel; na janela "Editar e enviar", a própria janela).
  function openPopup(anchor, html, { left = false, width, layer } = {}) {
    closePopup();
    popup = document.createElement('div');
    popup.className = 'qp-pop';
    if (width) popup.style.width = width + 'px';
    popup.innerHTML = html;
    (layer || popLayer()).appendChild(popup);
    const r = anchor.getBoundingClientRect();
    const pw = popup.offsetWidth;
    const ph = popup.offsetHeight;
    let x = left ? r.left - pw - 8 : Math.min(r.right - pw, window.innerWidth - pw - 8);
    x = Math.max(8, x);
    let y = left ? r.top + r.height / 2 - ph / 2 : r.bottom + 6;
    y = Math.max(8, Math.min(y, window.innerHeight - ph - 8));
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    // Mantém o menu inteiro dentro da tela quando ele cresce (ex.: abrir um grupo de ações).
    // Se não couber embaixo do botão, abre para cima; senão, encosta no fim da tela.
    popup.fit = () => {
      const h = popup.offsetHeight;
      const top = parseFloat(popup.style.top) || 0;
      if (top + h <= window.innerHeight - 8) return;
      const above = r.top - h - 6;
      popup.style.top = (!left && above >= 8 ? above : Math.max(8, window.innerHeight - 8 - h)) + 'px';
    };
    popup.fit();
    setTimeout(() => {
      const closer = (e) => {
        if (!popup) return document.removeEventListener('mousedown', closer, true);
        if (!e.composedPath().includes(popup) && !e.composedPath().includes(anchor)) {
          closePopup();
          document.removeEventListener('mousedown', closer, true);
        }
      };
      document.addEventListener('mousedown', closer, true);
    });
    return popup;
  }

  // ---------- Entrada ----------
  function render(container) {
    root = container;
    draw();
  }

  function onDataChange() {
    if (!root) return;
    if (view.name === 'list') drawGroups();
    if (view.name === 'cats') draw();
  }

  function go(v) {
    stopRecording(editor);
    view = v;
    draw();
    root.scrollTop = 0;
  }

  function draw() {
    closePopup();
    ({ list: drawList, edit: drawEdit, cats: drawCats, catEdit: drawCatEdit })[view.name]();
  }

  // ---------- Lista ----------
  function drawList() {
    root.oninput = root.onchange = root.onclick = null;
    root.innerHTML = `
      <div class="qp-top">
        <label class="qp-search">${icon('search', 14, 2)}<input data-q placeholder="Pesquisar resposta rápida" value="${esc(filter.q)}"><button data-clearq title="Limpar" ${filter.q ? '' : 'hidden'}>${icon('close', 13, 2)}</button></label>
        <button class="qp-add" data-new>${icon('gridPlus', 21)}<span class="qp-tip">Criar resposta rápida</span></button>
      </div>
      <div class="qp-chips" data-chips></div>
      <div data-groups></div>`;
    const input = root.querySelector('[data-q]');
    input.addEventListener('input', () => {
      filter.q = input.value;
      root.querySelector('[data-clearq]').hidden = !filter.q;
      drawGroups();
    });
    root.querySelector('[data-clearq]').addEventListener('click', () => {
      filter.q = '';
      input.value = '';
      root.querySelector('[data-clearq]').hidden = true;
      drawGroups();
    });
    root.querySelector('[data-new]').addEventListener('click', (e) => {
      const p = openPopup(e.currentTarget, `
        <button class="opt" data-go="new">${icon('bolt', 15, 2)} Respostas Rápidas</button>
        <button class="opt" data-go="cats">${icon('shapes', 15)} Categoria</button>`);
      p.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-go]');
        if (!b) return;
        closePopup();
        if (b.dataset.go === 'new') go({ name: 'edit', draft: { title: '', categoryId: null, actions: [] } });
        else go({ name: 'cats' });
      });
    });
    drawChips();
    drawGroups();
  }

  async function drawChips() {
    const box = root.querySelector('[data-chips]');
    if (!box) return;
    const cats = await Q().categories();
    const typeLabel = filter.type ? Q().TYPES[filter.type].label : 'Por Tipo';
    const cat = cats.find((c) => c.id === filter.categoryId);
    box.innerHTML = `
      <button class="qp-chip ${filter.mode === 'all' && !filter.type && !filter.categoryId ? 'on' : ''}" data-chip="all">Tudo</button>
      <button class="qp-chip ${filter.type ? 'on' : ''}" data-chip="type">${esc(typeLabel)} ${icon('chevDown', 12, 2.4)}</button>
      <button class="qp-chip ${filter.mode === 'nocat' ? 'on' : ''}" data-chip="nocat">Sem Categoria</button>
      <button class="qp-chip ${filter.categoryId ? 'on' : ''}" data-chip="cat">${esc(cat ? cat.name : 'Por Categoria')} ${icon('chevDown', 12, 2.4)}</button>
      <button class="qp-chip ${filter.mode === 'top' ? 'on' : ''}" data-chip="top">Mais Usadas</button>`;
    box.onclick = (e) => {
      const b = e.target.closest('[data-chip]');
      if (!b) return;
      const k = b.dataset.chip;
      if (k === 'all') Object.assign(filter, { mode: 'all', type: null, categoryId: null });
      if (k === 'nocat') Object.assign(filter, { mode: filter.mode === 'nocat' ? 'all' : 'nocat', categoryId: null });
      if (k === 'top') Object.assign(filter, { mode: filter.mode === 'top' ? 'all' : 'top' });
      if (k === 'type') {
        const p = openPopup(b, `<button class="opt" data-t="">Todos os tipos</button>` +
          Object.values(Q().TYPES).map((t) => `<button class="opt" data-t="${t.key}">${icon(t.icon, 14)} ${esc(t.label)}</button>`).join(''));
        p.onclick = (ev) => {
          const o = ev.target.closest('[data-t]');
          if (!o) return;
          filter.type = o.dataset.t || null;
          closePopup();
          drawChips();
          drawGroups();
        };
        return;
      }
      if (k === 'cat') {
        const p = openPopup(b, `<button class="opt" data-c="">Todas as categorias</button>` +
          (cats.length ? cats.map((c) => `<button class="opt" data-c="${c.id}"><span style="color:${esc(c.color)};display:grid">${icon('shapes', 14)}</span> ${esc(c.name)}</button>`).join('') : `<div class="qp-empty" style="padding:8px">Nenhuma categoria criada.</div>`));
        p.onclick = (ev) => {
          const o = ev.target.closest('[data-c]');
          if (!o) return;
          filter.categoryId = o.dataset.c || null;
          if (filter.categoryId) filter.mode = 'all';
          closePopup();
          drawChips();
          drawGroups();
        };
        return;
      }
      drawChips();
      drawGroups();
    };
  }

  function matches(q) {
    const term = filter.q.trim().toLowerCase();
    if (term && !(q.title || '').toLowerCase().includes(term) && !q.actions.some((a) => Q().actionSummary(a).toLowerCase().includes(term))) return false;
    if (filter.type && !q.actions.some((a) => a.type === filter.type)) return false;
    return true;
  }

  function itemHTML(q) {
    const t = Q().TYPES[Q().mainType(q)];
    return `<div class="qp-item" data-id="${q.id}">
      <span class="qp-ico">${icon(t ? t.icon : 'text', 15)}</span>
      <span class="qp-name" title="${esc(q.title)}">${esc(q.title || Q().summary(q))}</span>
      <button class="qp-ib" data-more title="Mais opções">${icon('more', 16)}</button>
      <button class="qp-ib" data-preview title="Editar e enviar (sem salvar)">${icon('eye2', 15)}</button>
      <button class="qp-ib" data-send title="Enviar nesta conversa">${icon('play', 13)}</button>
    </div>`;
  }

  async function drawGroups() {
    const box = root && root.querySelector('[data-groups]');
    if (!box) return;
    const [all, cats] = await Promise.all([Q().list(), Q().categories()]);
    if (!all.length) {
      box.innerHTML = `<div class="qp-empty"><div class="empty-icon">${icon('bolt', 22, 2)}</div><h4>Nenhuma resposta rápida cadastrada</h4>
        Crie sua primeira resposta rápida e organize em categorias.<br><button class="qp-addact filled" data-first>Criar resposta rápida</button></div>`;
      box.querySelector('[data-first]').onclick = () => go({ name: 'edit', draft: { title: '', categoryId: null, actions: [] } });
      return;
    }
    const shown = all.filter(matches);
    let html = '';
    if (filter.mode === 'top') {
      const top = shown.filter((q) => q.uses).sort((a, b) => (b.uses || 0) - (a.uses || 0)).slice(0, 30);
      html = top.length ? `<div class="qp-group">${top.map(itemHTML).join('')}</div>` : '';
    } else {
      const known = new Set(cats.map((c) => c.id));
      const loose = shown.filter((q) => !q.categoryId || !known.has(q.categoryId));
      if (!filter.categoryId && loose.length) html += groupHTML(null, loose);
      if (filter.mode !== 'nocat') {
        cats.filter((c) => !filter.categoryId || c.id === filter.categoryId).forEach((c) => {
          const items = shown.filter((q) => q.categoryId === c.id);
          if (items.length) html += groupHTML(c, items);
        });
      }
    }
    box.innerHTML = html || `<div class="qp-empty"><div class="empty-icon">${icon('bolt', 22, 2)}</div><h4>Nenhuma resposta rápida encontrada</h4>
      Não há respostas rápidas disponíveis com base no filtro de busca aplicado<br><button class="qp-addact filled" data-clearall>Limpar Busca</button></div>`;
    const clearAll = box.querySelector('[data-clearall]');
    if (clearAll) clearAll.onclick = () => {
      Object.assign(filter, { q: '', mode: 'all', type: null, categoryId: null });
      drawList();
    };
    box.onclick = (e) => onListClick(e, all);
  }

  function groupHTML(cat, items) {
    const key = cat ? cat.id : '_none';
    const open = !collapsed.has(key);
    const style = cat ? `style="border-color:${rgba(cat.color, 0.55)};background:${rgba(cat.color, 0.13)}"` : '';
    return `<div class="qp-group ${cat ? 'cat' : ''}" ${style}>
      <div class="qp-ghead" data-toggle="${key}">${cat ? `<span style="color:${esc(cat.color)};display:grid">${icon('shapes', 14)}</span>` : ''}${esc(cat ? cat.name.toUpperCase() : 'SEM CATEGORIA')}
        <span class="chev">${icon(open ? 'chevUp' : 'chevDown', 14, 2.2)}</span></div>
      ${open ? items.map(itemHTML).join('') : ''}
    </div>`;
  }

  async function onListClick(e, all) {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const k = toggle.dataset.toggle;
      if (collapsed.has(k)) collapsed.delete(k);
      else collapsed.add(k);
      return drawGroups();
    }
    const row = e.target.closest('[data-id]');
    if (!row) return;
    const q = all.find((x) => x.id === row.dataset.id);
    if (!q) return;
    if (e.target.closest('[data-send]')) return send(q);
    if (e.target.closest('[data-preview]')) return openEditSend(q);
    if (e.target.closest('[data-more]')) openMoreMenu(e.target.closest('[data-more]'), q);
  }

  // Menu dos três pontinhos (abre à esquerda, como no vídeo).
  function openMoreMenu(anchor, q) {
    const t = Q().TYPES[Q().mainType(q)];
    const p = openPopup(anchor, `
      <div class="pop-head">${icon(t ? t.icon : 'text', 15)}<span>${esc(q.title || Q().summary(q))}</span></div>
      <button class="opt" data-m="dup">${icon('copy', 14)} Duplicar Resposta rápida</button>
      <button class="opt" data-m="edit">${icon('edit', 14)} Editar</button>
      <button class="opt" data-m="schedule">${icon('schedule', 14)} Criar Agendamento</button>
      <button class="opt" data-m="editsend">${icon('eye2', 14)} Editar e enviar</button>
      <button class="opt danger" data-m="del">${icon('trash', 14)} Deletar</button>`, { left: true, width: 220 });
    p.onclick = async (ev) => {
      const m = ev.target.closest('[data-m]');
      if (!m) return;
      closePopup();
      const k = m.dataset.m;
      if (k === 'edit') go({ name: 'edit', draft: JSON.parse(JSON.stringify(q)) });
      if (k === 'editsend') openEditSend(q);
      if (k === 'schedule') {
        if (!CRM.wa.state.activeChat) return toast('Abra uma conversa para agendar esta resposta rápida.', 'err');
        CRM.schedules.newFromQuick(q);
      }
      if (k === 'dup') {
        const copy = JSON.parse(JSON.stringify(q));
        copy.id = uid();
        copy.title = (q.title || '') + ' (cópia)';
        for (const a of copy.actions) {
          if (a.mediaId) {
            const media = await CRM.store.getMedia(a.mediaId);
            a.mediaId = uid();
            if (media) await CRM.store.putMedia(a.mediaId, media);
          }
        }
        delete copy.uses;
        delete copy.createdAt;
        await Q().save(copy);
        notice('Resposta rápida duplicada');
      }
      if (k === 'del') {
        if (!confirm(`Deletar a resposta rápida "${q.title}"?`)) return;
        await Q().remove(q.id);
        notice('Resposta rápida deletada');
      }
    };
  }

  function chatCtx() {
    const chat = CRM.wa.state.activeChat;
    if (!CRM.wa.state.ready || !chat) return null;
    return { chatId: chat.id, chatName: chat.name || chat.pushname || '' };
  }

  // Envia na conversa aberta; a faixa "Ação da Resposta Rápida (1/N)" mostra o andamento.
  function send(q) {
    const ctx = chatCtx();
    if (!ctx) return toast('Abra uma conversa para enviar a resposta rápida.', 'err');
    CRM.quickRun.send(q, ctx);
  }

  // "Editar e enviar": muda o texto/ações só para este envio. A resposta salva fica como estava.
  async function openEditSend(q) {
    if (!chatCtx()) return toast('Abra uma conversa para enviar a resposta rápida.', 'err');
    const draft = JSON.parse(JSON.stringify(q));
    const t = Q().TYPES[Q().mainType(q)];
    const el = CRM.ui.modal(`<style>${CSS}</style>
      <div class="es-head"><span class="ico">${icon(t ? t.icon : 'text', 17)}</span>${esc(q.title || '')}</div>
      <div class="qp-card es-card" data-es></div>
      <div class="error-msg" data-err></div>
      <div class="es-foot"><button class="es-send" data-es-send title="Enviar nesta conversa (não altera a resposta salva)">${icon('send', 20, 2)}</button></div>`,
      { wide: true, onClose: () => stopRecording(E) });
    const box = el.querySelector('[data-es]');
    const E = makeEditor(box, draft, () => drawBox(), el);
    async function drawBox() {
      const top = box.scrollTop;
      box.innerHTML = `<div class="qp-card-title">Editar e enviar resposta rápida ${tagsHTML()}</div>${await actionsHTML(E)}`;
      bindEmojis(box);
      box.scrollTop = top;
    }
    bindEditor(E);
    box.onclick = (e) => actionClick(E, e);
    el.querySelector('[data-es-send]').onclick = () => {
      const err = el.querySelector('[data-err]');
      if (E.rec) return (err.textContent = 'Pare a gravação antes de enviar.');
      const problem = validateActions(draft.actions);
      if (problem) return (err.textContent = problem);
      const ctx = chatCtx();
      if (!ctx) return (err.textContent = 'Abra uma conversa para enviar.');
      CRM.ui.closeModal();
      CRM.quickRun.send(draft, ctx);
    };
    await drawBox();
  }

  // ---------- Criar / editar ----------
  const DEFAULTS = {
    text: { text: '', typing: 5, wait: 5 }, audio: { recording: 5, wait: 5 },
    pix: { keyType: 'CPF', key: '', name: '', instructions: '' }, groupInvite: { link: '', text: '' },
    contact: { name: '', phone: '' }, linkBanner: { text: '', title: '', description: '' },
    list: { title: '', description: '', buttonText: 'Ver opções', footer: '', items: [{ title: '', description: '' }] },
    wait: { seconds: 3 }, typing: { seconds: 3 }, recording: { seconds: 3 }, tabAdd: { tabId: '' }, tabRemove: { tabId: '' },
  };
  const ACCEPT = { image: 'image/*', video: 'video/*', document: '*/*', sticker: 'image/*' };
  const UTIL_NOTE = {
    archive: 'Arquiva esta conversa.', unarchive: 'Tira esta conversa do arquivo.', pin: 'Fixa esta conversa no topo da lista.',
    unpin: 'Desfixa esta conversa.', markUnread: 'Marca a conversa como não lida.',
    block: '⚠️ Bloqueia o contato no WhatsApp. Use com cuidado.',
  };

  const inp = (i, k, ph, val, type = 'text') =>
    `<input class="input qp-in" data-i="${i}" data-k="${k}" type="${type}" placeholder="${esc(ph)}" value="${esc(val == null ? '' : val)}">`;
  const area = (i, k, ph, val) =>
    `<div class="textarea-wrap"><textarea class="textarea qp-ta" data-i="${i}" data-k="${k}" placeholder="${esc(ph)}">${esc(val || '')}</textarea>
      <div class="textarea-tools"><button type="button" class="icon-btn" data-emoji title="Emojis">${icon('smile', 17)}</button></div></div>`;
  // Campo de segundos dentro de uma frase (ex.: "Aguarde para chamar a próxima ação por [5] Segundos").
  const timer = (i, k, before, val) =>
    `<div class="qp-timer">${before} <input type="number" min="0" max="600" step="1" data-i="${i}" data-k="${k}" value="${esc(val == null ? 0 : val)}"> Segundos</div>`;
  const tagsHTML = () => `<span class="qp-tags">#Tags ${icon('info', 11, 2)}<span class="info-pop">Use <b>{nome}</b> nos textos para colocar o primeiro nome do contato.</span></span>`;

  // Um editor de ações: host = elemento onde ele é desenhado; draft = { actions: [...] };
  // redraw() desenha de novo; layer = onde abrir os menus (padrão: o painel).
  function makeEditor(host, draft, redraw, layer) {
    editor = { host, draft, redraw, layer, rec: null }; // rec = { index, rec } gravação de áudio
    return editor;
  }

  function stopRecording(E) {
    if (E && E.rec) {
      E.rec.rec.cancel();
      E.rec = null;
    }
  }

  function bindEmojis(box) {
    box.querySelectorAll('.textarea-wrap').forEach((w) => {
      const f = w.querySelector('textarea, input');
      const b = w.querySelector('[data-emoji]');
      if (f && b) CRM.ui.attachEmoji(b, f);
    });
  }

  async function actionBody(E, a, i) {
    const t = a.type;
    if (t === 'text') {
      return timer(i, 'typing', 'Exibir para o cliente que a mensagem está sendo digitada por', a.typing) +
        area(i, 'text', 'Escreva a mensagem', a.text) +
        timer(i, 'wait', 'Aguarde para chamar a próxima ação por', a.wait);
    }
    if (ACCEPT[t]) {
      const p = a._pending;
      const thumb = p && (t === 'image' || t === 'sticker') ? `<img class="qp-thumb" src="${p.dataUrl}" alt="">` : '';
      return `<div class="qp-media"><button type="button" class="qp-import" data-import="${i}">${icon('download', 14, 2)} Importar</button>
        <span class="qp-fname">${esc(a.name || 'Nenhum arquivo escolhido')}</span></div>${thumb}
        <input type="file" hidden data-file="${i}" accept="${ACCEPT[t]}">
        ${t === 'sticker' ? '<div class="qp-hint">Use uma imagem quadrada (PNG ou WEBP).</div>' : area(i, 'caption', 'Legenda (opcional)', a.caption)}`;
    }
    if (t === 'audio') {
      const p = a._pending;
      const rec = E.rec && E.rec.index === i;
      return timer(i, 'recording', 'Exibir para o cliente que um áudio está sendo gravado por', a.recording) +
        `<div class="qp-media">
          <button type="button" class="qp-import" data-aimport="${i}">${icon('upload', 14, 2)} Importar</button>
          <button type="button" class="qp-import ${rec ? 'rec' : ''}" data-arec="${i}">${rec ? icon('stop', 12) + ' Parar' : icon('mic', 14, 2) + ' Gravar'}</button></div>
        <input type="file" hidden data-afile="${i}" accept="audio/*">
        <span class="qp-fname">${esc(a.name || 'Nenhum áudio')}</span>
        ${p ? `<audio controls src="${p.dataUrl}"></audio>` : ''}
        <div class="qp-hint">Chega como mensagem de voz.</div>` +
        timer(i, 'wait', 'Aguarde para chamar a próxima ação por', a.wait);
    }
    if (t === 'pix') {
      const opts = [['CPF', 'CPF'], ['CNPJ', 'CNPJ'], ['PHONE', 'Telefone'], ['EMAIL', 'E-mail'], ['EVP', 'Chave aleatória']]
        .map(([v, l]) => `<option value="${v}" ${a.keyType === v ? 'selected' : ''}>${l}</option>`).join('');
      return `<select class="select qp-in" data-i="${i}" data-k="keyType">${opts}</select>
        ${inp(i, 'key', 'Chave Pix', a.key)}${inp(i, 'name', 'Nome de quem recebe', a.name)}${inp(i, 'instructions', 'Instruções (opcional)', a.instructions)}
        <div class="qp-hint">Envia o cartão de Pix do WhatsApp. Se não aparecer para o cliente, envie a chave como Texto.</div>`;
    }
    if (t === 'groupInvite') return inp(i, 'link', 'Link do convite (https://chat.whatsapp.com/...)', a.link) + area(i, 'text', 'Mensagem junto (opcional)', a.text);
    if (t === 'contact') return `<div class="qp-row2">${inp(i, 'name', 'Nome', a.name)}${inp(i, 'phone', 'Telefone com DDD', a.phone)}</div>`;
    if (t === 'linkBanner') return area(i, 'text', 'Mensagem com o link (https://...)', a.text) + inp(i, 'title', 'Título do banner (opcional)', a.title) + inp(i, 'description', 'Descrição do banner (opcional)', a.description);
    if (t === 'list') {
      const items = (a.items || []).map((it, j) => `<div class="qp-row2" style="align-items:center">${inp(i, `items.${j}.title`, `Opção ${j + 1}`, it.title)}${inp(i, `items.${j}.description`, 'Descrição', it.description)}
        <button type="button" class="qp-ib" data-delitem="${i}.${j}" title="Tirar opção" style="flex:none">${icon('close', 13, 2)}</button></div>`).join('');
      return `${inp(i, 'title', 'Título (opcional)', a.title)}${area(i, 'description', 'Texto da mensagem', a.description)}${inp(i, 'buttonText', 'Texto do botão', a.buttonText)}
        ${items}<button type="button" class="link-btn" data-additem="${i}">+ opção</button>${inp(i, 'footer', 'Rodapé (opcional)', a.footer)}
        <div class="qp-hint">Mensagens de lista podem não aparecer em todos os celulares.</div>`;
    }
    if (t === 'wait' || t === 'typing' || t === 'recording') return `<div class="qp-row2" style="align-items:center">${inp(i, 'seconds', 'Segundos', a.seconds, 'number')}<span class="qp-hint" style="flex:none">segundos</span></div>`;
    if (t === 'tabAdd' || t === 'tabRemove') {
      const tabs = await CRM.tabs.list();
      return tabs.length
        ? `<select class="select qp-in" data-i="${i}" data-k="tabId"><option value="">Escolha a aba…</option>${tabs.map((tb) => `<option value="${tb.id}" ${a.tabId === tb.id ? 'selected' : ''}>${esc(tb.name)}</option>`).join('')}</select>`
        : '<div class="qp-hint">Nenhuma aba criada ainda (pasta com "+" no topo).</div>';
    }
    return `<div class="qp-hint">${esc(UTIL_NOTE[t] || '')}</div>`;
  }

  // Lista de ações + botão "Adicionar Ação".
  async function actionsHTML(E) {
    const d = E.draft;
    const bodies = await Promise.all(d.actions.map((a, i) => actionBody(E, a, i)));
    const cards = d.actions.length
      ? d.actions.map((a, i) => {
          const t = Q().TYPES[a.type] || { icon: 'text', label: a.type };
          return `<div class="qp-action"><div class="qp-ahead"><span class="n">${i + 1}</span>${icon(t.icon, 14)} ${esc(t.key === 'text' ? 'Criar Mensagem de Texto' : t.label)}<span class="sp"></span>
            <button type="button" class="qp-ib" data-up="${i}" title="Subir" ${i === 0 ? 'disabled' : ''}>${icon('arrowUp', 13, 2)}</button>
            <button type="button" class="qp-ib" data-down="${i}" title="Descer" ${i === d.actions.length - 1 ? 'disabled' : ''}>${icon('arrowDown', 13, 2)}</button>
            <button type="button" class="qp-ib" data-delact="${i}" title="Remover ação">${icon('trash', 13)}</button></div>${bodies[i]}</div>`;
        }).join('')
      : `<div class="qp-empty" style="padding:14px 4px 4px"><div class="empty-icon">${icon('shapes', 22)}</div><h4 style="font-size:14px">Nenhuma ação foi atribuída</h4>
          Adicione ações para criar e configurar modelos de envio personalizados para seus clientes</div>`;
    return cards + `<button type="button" class="qp-addact ${d.actions.length ? '' : 'filled'}" data-addact>Adicionar Ação</button>`;
  }

  // Digitação e arquivos das ações (vale para o painel e para a janela "Editar e enviar").
  function bindEditor(E) {
    E.host.oninput = (e) => {
      const el = e.target.closest('[data-i][data-k]');
      if (!el) return;
      const a = E.draft.actions[+el.dataset.i];
      const path = el.dataset.k.split('.');
      if (path[0] === 'items') a.items[+path[1]][path[2]] = el.value;
      else a[el.dataset.k] = el.type === 'number' ? Number(el.value) : el.value;
    };
    E.host.onchange = (e) => {
      const f = e.target.closest('[data-file]');
      if (f && f.files[0]) return pickFile(E, +f.dataset.file, f.files[0]);
      const af = e.target.closest('[data-afile]');
      if (af && af.files[0]) return pickAudio(E, +af.dataset.afile, af.files[0]);
      const sel = e.target.closest('select[data-i][data-k]');
      if (sel) E.draft.actions[+sel.dataset.i][sel.dataset.k] = sel.value;
    };
  }

  async function pickFile(E, i, file) {
    if (file.size > 60 * 1024 * 1024) return toast('Arquivo muito grande (máximo 60 MB).', 'err');
    const a = E.draft.actions[i];
    a._pending = { dataUrl: await CRM.util.readFileAsDataURL(file), name: file.name, mime: file.type || 'application/octet-stream' };
    a.name = file.name;
    E.redraw();
  }

  async function pickAudio(E, i, blob) {
    try {
      toast('Convertendo áudio…');
      const out = await CRM.audio.toOggOpus(blob);
      const a = E.draft.actions[i];
      a._pending = { dataUrl: await CRM.util.blobToDataURL(out.blob), name: 'audio.ogg', mime: 'audio/ogg' };
      a.name = `Áudio (${CRM.util.formatDuration(out.seconds)})`;
      a.seconds = out.seconds;
      E.redraw();
    } catch (err) {
      toast('Não consegui ler este áudio: ' + err.message, 'err');
    }
  }

  // Cliques nas ações. Devolve true se o clique era de uma ação.
  function actionClick(E, e) {
    const d = E.draft;
    const b = (sel) => e.target.closest(sel);
    if (b('[data-import]')) return E.host.querySelector(`[data-file="${b('[data-import]').dataset.import}"]`).click(), true;
    if (b('[data-aimport]')) return E.host.querySelector(`[data-afile="${b('[data-aimport]').dataset.aimport}"]`).click(), true;
    if (b('[data-arec]')) {
      toggleRecording(E, +b('[data-arec]').dataset.arec);
      return true;
    }
    const move = (from, to) => {
      [d.actions[from], d.actions[to]] = [d.actions[to], d.actions[from]];
      E.redraw();
      return true;
    };
    if (b('[data-up]')) return move(+b('[data-up]').dataset.up, +b('[data-up]').dataset.up - 1);
    if (b('[data-down]')) return move(+b('[data-down]').dataset.down, +b('[data-down]').dataset.down + 1);
    if (b('[data-delact]')) {
      d.actions.splice(+b('[data-delact]').dataset.delact, 1);
      E.redraw();
      return true;
    }
    if (b('[data-additem]')) {
      d.actions[+b('[data-additem]').dataset.additem].items.push({ title: '', description: '' });
      E.redraw();
      return true;
    }
    if (b('[data-delitem]')) {
      const [i, j] = b('[data-delitem]').dataset.delitem.split('.').map(Number);
      d.actions[i].items.splice(j, 1);
      E.redraw();
      return true;
    }
    if (b('[data-addact]')) {
      openActionMenu(E, b('[data-addact]'));
      return true;
    }
    return false;
  }

  async function toggleRecording(E, i) {
    if (E.rec && E.rec.index === i) {
      const rec = E.rec.rec;
      E.rec = null;
      return pickAudio(E, i, await rec.stop());
    }
    if (E.rec) return toast('Pare a gravação atual primeiro.', 'err');
    try {
      E.rec = { index: i, rec: await CRM.audio.startRecording() };
      E.redraw();
    } catch (err) {
      toast('Não consegui usar o microfone: ' + err.message, 'err');
    }
  }

  function openActionMenu(E, anchor) {
    const html = Q().GROUPS.map((g) => `<button class="opt qp-acc" data-acc="${g.key}">${icon(g.icon, 15)} ${esc(g.label)}<span class="chev">${icon('chevDown', 14, 2)}</span></button>
      <div class="qp-acc-body" data-accbody="${g.key}" hidden>${g.types.map(([k, l, ic]) => `<button class="opt" data-addtype="${k}">${icon(ic, 14)} ${esc(l)}</button>`).join('')}</div>`).join('');
    const p = openPopup(anchor, html, { left: true, width: 240, layer: E.layer });
    p.onclick = (e) => {
      const acc = e.target.closest('[data-acc]');
      if (acc) {
        const body = p.querySelector(`[data-accbody="${acc.dataset.acc}"]`);
        const willOpen = body.hidden;
        p.querySelectorAll('[data-accbody]').forEach((x) => (x.hidden = true));
        p.querySelectorAll('[data-acc] .chev').forEach((x) => (x.innerHTML = icon('chevDown', 14, 2)));
        body.hidden = !willOpen;
        acc.querySelector('.chev').innerHTML = icon(willOpen ? 'chevUp' : 'chevDown', 14, 2);
        p.fit();
        return;
      }
      const add = e.target.closest('[data-addtype]');
      if (!add) return;
      const type = add.dataset.addtype;
      E.draft.actions.push({ type, ...JSON.parse(JSON.stringify(DEFAULTS[type] || {})) });
      closePopup();
      Promise.resolve(E.redraw()).then(() => {
        const cards = E.host.querySelectorAll('.qp-action');
        const last = cards[cards.length - 1];
        if (last) {
          last.scrollIntoView({ block: 'nearest' });
          const f = last.querySelector('textarea, input:not([type=file]):not([type=number]), select');
          if (f) f.focus();
        }
      });
    };
  }

  // Tela "Criar / Editar Resposta Rápida" no painel.
  async function drawEdit() {
    const d = view.draft;
    const cats = await Q().categories();
    const cat = cats.find((c) => c.id === d.categoryId);
    // Mantém o mesmo editor entre redesenhos (para não perder uma gravação em andamento).
    const E = editor && editor.draft === d && editor.host === root ? editor : makeEditor(root, d, redrawKeepScroll);
    root.innerHTML = `
      <div class="qp-titlebar"><button class="qp-back" data-back>${icon('back', 18, 2.2)}<span class="qp-tip">Voltar</span></button>
        <h3>${d.id ? 'Editar Respostas Rápidas' : 'Criar Respostas Rápidas'}</h3></div>
      <div class="label">Título</div>
      <div class="textarea-wrap"><input class="input" data-title placeholder="Digite o título da resposta rápida" value="${esc(d.title)}" style="padding-right:34px">
        <div class="textarea-tools" style="top:3px"><button type="button" class="icon-btn" data-emoji title="Emojis">${icon('smile', 17)}</button></div></div>
      <div class="qp-card">
        <div class="qp-card-title">Ação do Resposta Rapida</div>
        ${tagsHTML()}
        ${await actionsHTML(E)}
      </div>
      <div class="label">Selecione uma categoria</div>
      <button type="button" class="qp-selectlike" data-catpick>${cat ? `<span style="color:${esc(cat.color)};display:grid">${icon('shapes', 14)}</span> ${esc(cat.name)}` : 'Nenhuma selecionada'}<span class="chev">${icon('chevDown', 14, 2)}</span></button>
      <div class="error-msg" data-err></div>
      <div class="qp-center"><button class="btn" data-save>${d.id ? 'Salvar' : 'Criar'}</button></div>`;

    bindEmojis(root);
    root.querySelector('[data-title]').addEventListener('input', (e) => (d.title = e.target.value));
    bindEditor(E);
    root.onclick = (e) => {
      if (actionClick(E, e)) return;
      if (e.target.closest('[data-back]')) {
        if ((d.title || d.actions.length) && !confirm('Sair sem salvar esta resposta rápida?')) return;
        return go({ name: 'list' });
      }
      if (e.target.closest('[data-catpick]')) return openCategoryPicker(e.target.closest('[data-catpick]'), cats);
      if (e.target.closest('[data-save]')) return saveDraft(E);
    };
  }

  async function redrawKeepScroll() {
    const top = root.scrollTop;
    await drawEdit();
    root.scrollTop = top;
  }

  function openCategoryPicker(anchor, cats) {
    const p = openPopup(anchor, `<label class="qp-search" style="margin-bottom:6px">${icon('search', 13, 2)}<input data-cq placeholder="Pesquisar Categoria"></label>
      <div data-clist></div>`, { width: Math.max(200, anchor.offsetWidth) });
    const list = p.querySelector('[data-clist]');
    const drawC = () => {
      const q = p.querySelector('[data-cq]').value.trim().toLowerCase();
      list.innerHTML = `<button class="opt" data-cat="">${icon('block', 14)} Cancelar seleção</button>` +
        cats.filter((c) => !q || c.name.toLowerCase().includes(q)).map((c) => `<button class="opt" data-cat="${c.id}"><span style="color:${esc(c.color)};display:grid">${icon('shapes', 14)}</span> ${esc(c.name)}</button>`).join('') +
        (cats.length ? '' : '<div class="qp-hint" style="padding:6px 8px">Nenhuma categoria. Crie no botão de adicionar → Categoria.</div>');
    };
    p.querySelector('[data-cq]').addEventListener('input', () => {
      drawC();
      p.fit();
    });
    list.onclick = (e) => {
      const o = e.target.closest('[data-cat]');
      if (!o) return;
      view.draft.categoryId = o.dataset.cat || null;
      closePopup();
      redrawKeepScroll();
    };
    drawC();
    p.fit();
    p.querySelector('[data-cq]').focus();
  }

  function validateActions(actions) {
    if (!actions.length) return 'Adicione pelo menos uma ação.';
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      const n = `Ação ${i + 1}: `;
      if (a.type === 'text' && !String(a.text || '').trim()) return n + 'escreva a mensagem.';
      if ((ACCEPT[a.type] || a.type === 'audio') && !a.mediaId && !a._pending) return n + 'importe o arquivo.';
      if (a.type === 'pix' && (!String(a.key || '').trim() || !String(a.name || '').trim())) return n + 'preencha a chave e o nome.';
      if (a.type === 'groupInvite' && !/^https?:\/\//i.test(String(a.link || '').trim())) return n + 'cole o link do convite.';
      if (a.type === 'contact' && String(a.phone || '').replace(/\D/g, '').length < 10) return n + 'informe o telefone com DDD.';
      if (a.type === 'linkBanner' && !/https?:\/\//i.test(String(a.text || ''))) return n + 'a mensagem precisa ter um link (https://...).';
      if (a.type === 'list' && (!String(a.description || '').trim() || !(a.items || []).some((it) => String(it.title || '').trim()))) return n + 'escreva o texto e pelo menos uma opção.';
      if (['wait', 'typing', 'recording'].includes(a.type) && !(Number(a.seconds) > 0)) return n + 'informe os segundos.';
      if ((a.type === 'tabAdd' || a.type === 'tabRemove') && !a.tabId) return n + 'escolha a aba.';
      for (const k of ['typing', 'recording', 'wait']) {
        if (a.type !== k && a[k] != null && !(Number(a[k]) >= 0 && Number(a[k]) <= 600)) return n + 'os segundos devem ficar entre 0 e 600.';
      }
    }
    return '';
  }

  async function saveDraft(E) {
    const d = view.draft;
    const err = root.querySelector('[data-err]');
    if (E.rec) return (err.textContent = 'Pare a gravação antes de salvar.');
    const problem = !d.title.trim() ? 'Digite o título da resposta rápida.' : validateActions(d.actions);
    if (problem) return (err.textContent = problem);
    const old = d.id ? await Q().get(d.id) : null;
    const keep = new Set();
    for (const a of d.actions) {
      if (a._pending) {
        a.mediaId = uid();
        await CRM.store.putMedia(a.mediaId, a._pending);
        delete a._pending;
      }
      if (a.mediaId) keep.add(a.mediaId);
    }
    if (old) for (const a of old.actions) if (a.mediaId && !keep.has(a.mediaId)) await CRM.store.deleteMedia(a.mediaId);
    const item = { ...(old || {}), id: d.id || uid(), title: d.title.trim(), categoryId: d.categoryId || null, actions: d.actions };
    delete item.text;
    await Q().save(item);
    notice(d.id ? 'Resposta rápida salva' : 'Resposta rápida criada');
    go({ name: 'list' });
  }

  // ---------- Categorias ----------
  async function drawCats() {
    const cats = await Q().categories();
    const all = await Q().list();
    root.innerHTML = `
      <div class="qp-titlebar"><button class="qp-back" data-back>${icon('back', 18, 2.2)}<span class="qp-tip">Voltar</span></button><h3 class="left">Categoria</h3></div>
      <div class="qp-top"><label class="qp-search">${icon('search', 14, 2)}<input data-cq placeholder="Pesquisar Categoria"></label>
        <button class="qp-add" data-newcat>${icon('gridPlus', 21)}<span class="qp-tip">Criar categoria</span></button></div>
      <div data-clist></div>`;
    const list = root.querySelector('[data-clist]');
    const drawRows = () => {
      const q = root.querySelector('[data-cq]').value.trim().toLowerCase();
      const rows = cats.filter((c) => !q || c.name.toLowerCase().includes(q));
      list.innerHTML = rows.length
        ? rows.map((c) => `<div class="qp-cat-row"><span style="color:${esc(c.color)};display:grid">${icon('shapes', 15)}</span><span class="qp-name">${esc(c.name.toUpperCase())}</span>
            <span class="qp-hint" style="margin:0">${all.filter((x) => x.categoryId === c.id).length}</span>
            <button class="qp-ib" data-editcat="${c.id}" title="Editar">${icon('edit', 14)}</button><button class="qp-ib" data-delcat="${c.id}" title="Excluir">${icon('trash', 14)}</button></div>`).join('')
        : `<div class="qp-empty"><div class="empty-icon">${icon('shapes', 22)}</div><h4>Nenhuma categoria${q ? ' encontrada' : ' criada'}</h4>
            ${q ? '' : 'Crie categorias para organizar suas respostas rápidas por cor.<br><button class="qp-addact filled" data-newcat>Criar categoria</button>'}</div>`;
    };
    root.querySelector('[data-cq]').addEventListener('input', drawRows);
    root.onclick = async (e) => {
      if (e.target.closest('[data-back]')) return go({ name: 'list' });
      if (e.target.closest('[data-newcat]')) return go({ name: 'catEdit', cat: { name: '', color: '#e5484d' } });
      const ed = e.target.closest('[data-editcat]');
      if (ed) return go({ name: 'catEdit', cat: { ...cats.find((c) => c.id === ed.dataset.editcat) } });
      const del = e.target.closest('[data-delcat]');
      if (del) {
        const c = cats.find((x) => x.id === del.dataset.delcat);
        if (!confirm(`Excluir a categoria "${c.name}"? As respostas dela ficam sem categoria.`)) return;
        await Q().removeCategory(c.id);
        notice('Categoria excluída');
      }
    };
    root.oninput = null;
    root.onchange = null;
    drawRows();
  }

  function drawCatEdit() {
    const c = view.cat;
    root.innerHTML = `
      <div class="qp-titlebar"><button class="qp-back" data-back>${icon('back', 18, 2.2)}<span class="qp-tip">Voltar</span></button><h3 class="left">${c.id ? 'Editar categoria' : 'Criar categoria'}</h3></div>
      <div class="label" style="margin-top:6px">Insira um nome</div>
      <div class="textarea-wrap"><input class="input" data-cname maxlength="40" placeholder="Digite um nome para a categoria" value="${esc(c.name)}" style="padding-right:34px">
        <div class="textarea-tools" style="top:3px"><button type="button" class="icon-btn" data-emoji title="Emojis">${icon('smile', 17)}</button></div></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0"><span class="label" style="margin:0">Escolha uma cor</span>
        <input type="color" class="qp-color" data-ccolor value="${esc(c.color || '#e5484d')}"></div>
      <div class="error-msg" data-err></div>
      <div class="qp-center"><button class="btn" data-savecat>Salvar</button></div>`;
    const name = root.querySelector('[data-cname]');
    CRM.ui.attachEmoji(root.querySelector('[data-emoji]'), name);
    name.focus();
    root.oninput = null;
    root.onchange = null;
    root.onclick = async (e) => {
      if (e.target.closest('[data-back]')) return go({ name: 'cats' });
      if (!e.target.closest('[data-savecat]')) return;
      const value = name.value.trim();
      if (!value) return (root.querySelector('[data-err]').textContent = 'Digite o nome da categoria.');
      await Q().saveCategory({ id: c.id || uid(), name: value, color: root.querySelector('[data-ccolor]').value });
      notice(c.id ? 'Categoria salva' : 'Categoria criada');
      go({ name: 'cats' });
    };
  }

  return { CSS, render, onDataChange };
})();
