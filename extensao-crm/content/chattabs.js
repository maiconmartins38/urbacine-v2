// Atalho "Abas" no topo da conversa (como no vídeo): ícone de pasta com o número de
// abas em que o contato está. Clicando, abre a lista com pesquisa para marcar/desmarcar.
CRM.chatTabs = (() => {
  const { esc } = CRM.util;
  const { icon } = CRM.ui;

  let host = null;
  let shadow = null;
  let btn = null;
  let menu = null;

  const CSS = `
    .abas-btn { position: relative; width: 34px; height: 34px; border-radius: 10px; border: 0; background: none; color: #54656f;
      display: grid; place-items: center; cursor: pointer; }
    .abas-btn:hover, .abas-btn.open { background: var(--teal); color: #fff; }
    .abas-count { position: absolute; top: -5px; right: -5px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
      background: var(--teal); color: #fff; font-size: 10px; font-weight: 700; display: grid; place-items: center; border: 1.5px solid #fff; }
    .abas-tip { position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: var(--teal); color: #fff;
      font-weight: 700; font-size: 12px; padding: 5px 10px; border-radius: 7px; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity .1s; }
    .abas-btn:hover .abas-tip { opacity: 1; }
    .abas-btn.open .abas-tip { opacity: 0; }
    .abas-menu { position: fixed; z-index: 2; width: 260px; max-height: 62vh; overflow: auto; background: #fff; border-radius: 12px;
      box-shadow: 0 8px 28px rgba(11, 20, 26, .22); padding: 8px 6px; }
    .abas-search { display: flex; align-items: center; gap: 6px; background: #f0f2f5; border-radius: 8px; padding: 6px 8px; margin: 0 2px 6px; color: #54656f; }
    .abas-search input { border: 0; background: none; outline: none; font: inherit; font-size: 12.5px; width: 100%; color: var(--text); }
    .abas-row { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: none; padding: 6px 8px; border-radius: 7px;
      text-align: left; font-size: 13px; color: var(--text); cursor: pointer; }
    .abas-row:hover { background: #f0f2f5; }
    .abas-dot { width: 17px; height: 17px; border-radius: 50%; border: 1.5px solid var(--teal); flex: none; display: grid; place-items: center; color: #fff; }
    .abas-row.on .abas-dot { background: var(--teal); }
    .abas-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .abas-row .tab-count { flex: none; }
    .abas-empty { color: var(--muted); font-size: 12.5px; padding: 8px; }
  `;

  function mount() {
    host = document.createElement('div');
    host.id = 'crm-ext-abas';
    host.style.cssText = 'position:fixed;z-index:995;display:none;';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CRM.styles}${CSS}</style><div class="root">
      <button class="abas-btn" title="">${icon('folderGo', 20)}<span class="abas-count" hidden></span><span class="abas-tip">Abas</span></button>
    </div>`;
    btn = shadow.querySelector('.abas-btn');
    btn.addEventListener('click', () => (menu ? close() : open()));
    CRM.ui.isolateEvents(host);
    document.body.appendChild(host);
    document.addEventListener('mousedown', (e) => {
      if (menu && !e.composedPath().includes(host)) close();
    }, true);
    window.addEventListener('keydown', (e) => {
      if (menu && e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    }, true);
  }

  // Cabeçalho da conversa aberta e a posição logo à esquerda dos ícones do WhatsApp.
  function findSlot() {
    const main = document.getElementById('main');
    let header = main && main.querySelector('header');
    if (!header) {
      header = [...document.querySelectorAll('header')].find((h) => {
        const r = h.getBoundingClientRect();
        return r.width > 0 && r.left > window.innerWidth * 0.2 && r.top < 160;
      });
    }
    if (!header) return null;
    const hr = header.getBoundingClientRect();
    const lefts = [...header.querySelectorAll('button, [role="button"]')]
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.left > hr.left + hr.width * 0.5)
      .map((r) => r.left);
    const right = lefts.length ? Math.min(...lefts) : hr.right - 12;
    return { left: right - 10 - 34, top: hr.top + hr.height / 2 - 17 };
  }

  async function place() {
    if (!host || !host.isConnected) mount();
    const chat = CRM.wa.state.activeChat;
    const slot = chat ? findSlot() : null;
    if (!slot) {
      host.style.display = 'none';
      if (menu) close();
      return;
    }
    host.style.display = 'block';
    host.style.left = Math.round(slot.left) + 'px';
    host.style.top = Math.round(slot.top) + 'px';
    if (menu) positionMenu();
  }

  async function refreshCount() {
    if (!btn) return;
    const chat = CRM.wa.state.activeChat;
    const n = chat ? (await CRM.tabs.list()).filter((t) => (t.chatIds || []).includes(chat.id)).length : 0;
    const badge = btn.querySelector('.abas-count');
    badge.hidden = !n;
    badge.textContent = String(n);
  }

  function positionMenu() {
    const r = btn.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left + r.width / 2 - 130, window.innerWidth - 268));
    menu.style.left = left + 'px';
    menu.style.top = r.bottom + 8 + 'px';
  }

  function close() {
    if (menu) menu.remove();
    menu = null;
    if (btn) btn.classList.remove('open');
  }

  async function open() {
    const chat = CRM.wa.state.activeChat;
    if (!chat) return;
    menu = document.createElement('div');
    menu.className = 'abas-menu';
    menu.innerHTML = `<label class="abas-search">${icon('search', 15, 2)}<input placeholder="Pesquisar Abas"></label><div data-rows></div>`;
    shadow.querySelector('.root').appendChild(menu);
    btn.classList.add('open');
    positionMenu();
    const input = menu.querySelector('input');
    input.addEventListener('input', drawRows);
    menu.querySelector('[data-rows]').addEventListener('click', async (e) => {
      const row = e.target.closest('[data-tab]');
      if (!row) return;
      const on = !row.classList.contains('on');
      row.classList.toggle('on', on); // resposta imediata; a lista é redesenhada em seguida
      await CRM.tabs.setChatInTab(chat.id, row.dataset.tab, on);
      CRM.ui.notice(on ? 'Contato adicionado à aba' : 'Contato removido da aba');
    });
    await drawRows();
    input.focus();
  }

  async function drawRows() {
    if (!menu) return;
    const chat = CRM.wa.state.activeChat;
    const q = menu.querySelector('input').value.trim().toLowerCase();
    const tabs = (await CRM.tabs.list())
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base', numeric: true }));
    const box = menu.querySelector('[data-rows]');
    box.innerHTML = tabs.length
      ? tabs.map((t) => {
          const on = chat && (t.chatIds || []).includes(chat.id);
          return `<button class="abas-row ${on ? 'on' : ''}" data-tab="${t.id}"><span class="abas-dot">${icon('check', 11, 3)}</span>
            <span class="abas-name">${esc(t.name)}</span><span class="tab-count">${(t.chatIds || []).length}</span></button>`;
        }).join('')
      : `<div class="abas-empty">${q ? 'Nenhuma aba encontrada.' : 'Nenhuma aba criada ainda. Crie na pasta com "+" no canto superior direito.'}</div>`;
  }

  CRM.store.onChange((changes) => {
    if (changes.tabs) {
      refreshCount();
      drawRows();
    }
  });
  CRM.wa.on('activeChat', () => {
    close();
    refreshCount();
  });
  CRM.wa.on('ready', refreshCount);

  return { place, refreshCount };
})();
