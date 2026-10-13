// Menu lateral esquerdo (como no vídeo). "Central De Agendamentos" abre o calendário,
// "Funil CRM" abre o funil numa aba nova e a engrenagem abre as Configurações;
// os outros botões serão ligados nas próximas etapas.
CRM.rail = (() => {
  const W = CRM.layout.LEFT;
  const TOP = CRM.layout.HEIGHT;

  const svg = (inner, color) =>
    `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${color || 'currentColor'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  const ICONS = {
    kanban: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8.5 8v8M12 8v4M15.5 8v6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M7.5 13h1M11.5 13h1M15.5 13h1M7.5 16.5h1M11.5 16.5h1" stroke-width="2.2"/>',
    flow: '<circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v4.5M12 11.5L6.8 17.3M12 11.5l5.2 5.8"/>',
    funnel: '<path d="M3.5 5h17l-6.5 7.8V19l-4 1.5v-7.7z"/>',
    robot: '<rect x="5" y="8.5" width="14" height="10.5" rx="3"/><path d="M12 8.5V5.5"/><circle cx="12" cy="4.5" r="1"/><path d="M9.5 13.2h.01M14.5 13.2h.01" stroke-width="2.8"/><path d="M3 12.5v3M21 12.5v3"/>',
    followUp: '<path d="M4 5h16v11.5H9.5L5 20v-3.5H4z"/><path d="M12 8v5.5M9.2 10.8h5.6"/>',
    links: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
    startChat: '<path d="M4.5 13.5a7 6 0 1 1 3 4.4L4 19l1-3.2"/><path d="M13.5 13h7v5h-2l-2.5 2v-2h-2.5z" fill="currentColor"/>',
    youtube: '<rect x="2.5" y="6" width="19" height="12.5" rx="3.6" fill="#ff0000" stroke="none"/><path d="M10 9.6v5.2l4.6-2.6z" fill="#fff" stroke="none"/>',
    panel: '<rect x="4" y="4" width="7" height="16" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    sliders: '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  };

  // Mesma ordem e nomes do vídeo. Os de baixo não tiveram o nome mostrado no vídeo (nomes provisórios).
  const TOP_ITEMS = [
    { key: 'kanban', icon: 'kanban', tip: 'CRM' },
    { key: 'schedules', icon: 'calendar', tip: 'Central De Agendamentos', open: () => CRM.calendar.open() },
    { key: 'flow', icon: 'flow', tip: 'Fluxo' },
    { key: 'funnel', icon: 'funnel', tip: 'Funil CRM', open: () => openPage('funil/index.html') },
    { key: 'autoReply', icon: 'robot', tip: 'Auto Atendimento' },
    { key: 'followUp', icon: 'followUp', tip: 'Follow Up' },
    { key: 'links', icon: 'links', tip: 'Links' },
    { key: 'startChat', icon: 'startChat', tip: 'Iniciar uma conversa' },
  ];
  const BOTTOM_ITEMS = [
    { key: 'tutorials', icon: 'youtube', tip: 'Tutoriais' },
    { key: 'panel', icon: 'panel', tip: 'Painel' },
    { key: 'preferences', icon: 'sliders', tip: 'Preferências' },
    { key: 'notifications', icon: 'bell', tip: 'Notificações' },
    { key: 'settings', icon: 'gear', tip: 'Configurações', open: () => CRM.settings.open() },
  ];

  const CSS = `
    .rail { position: absolute; inset: 0; background: #eef0f4; border-right: 1px solid #e3e6ea;
      display: flex; flex-direction: column; align-items: center; padding: 8px 0 6px; }
    .rail-group { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .rail-spacer { flex: 1; min-height: 8px; }
    .rail-btn { position: relative; width: 30px; height: 30px; border-radius: 50%; border: 0; background: none; color: #54656f;
      display: grid; place-items: center; cursor: pointer; flex: none; }
    .rail-btn:hover { background: #dde1e6; }
    .rail-tip { position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%); background: var(--teal); color: #fff;
      font-weight: 700; font-size: 12px; white-space: nowrap; padding: 6px 11px; border-radius: 7px; pointer-events: none;
      opacity: 0; transition: opacity .1s; box-shadow: 0 2px 6px rgba(0, 0, 0, .15); z-index: 2; }
    .rail-tip::before { content: ""; position: absolute; left: -6px; top: 50%; transform: translateY(-50%);
      border: 6px solid transparent; border-left: 0; border-right-color: var(--teal); }
    .rail-btn:hover .rail-tip { opacity: 1; }
    .rail-version { font-size: 9.5px; color: #8696a0; margin-top: 4px; }
  `;

  // Abre uma página da extensão numa aba nova (quem abre é o background).
  async function openPage(page) {
    try {
      await chrome.runtime.sendMessage({ type: 'open-page', page });
    } catch (_) {
      CRM.ui.toast('Não consegui abrir a página. Recarregue o WhatsApp Web (F5) e tente de novo.', 'err');
    }
  }

  function buttonHTML(item) {
    return `<button class="rail-btn" data-rail="${item.key}">${svg(ICONS[item.icon], item.color)}<span class="rail-tip">${item.tip}</span></button>`;
  }

  function mount() {
    if (document.getElementById('crm-ext-rail')) return;
    const host = document.createElement('div');
    host.id = 'crm-ext-rail';
    host.style.cssText = `position:fixed;top:${TOP}px;left:0;bottom:0;width:${W}px;z-index:989;`;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CRM.styles}${CSS}</style><div class="root"><nav class="rail">
      <div class="rail-group">${TOP_ITEMS.map(buttonHTML).join('')}</div>
      <div class="rail-spacer"></div>
      <div class="rail-group">${BOTTOM_ITEMS.map(buttonHTML).join('')}</div>
      <div class="rail-version">${chrome.runtime.getManifest().version}</div>
    </nav></div>`;
    shadow.querySelector('.rail').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-rail]');
      if (!btn) return;
      const item = TOP_ITEMS.concat(BOTTOM_ITEMS).find((i) => i.key === btn.dataset.rail);
      if (item.open) return item.open();
      CRM.ui.toast(`"${item.tip}" ainda não tem função — vem numa próxima etapa.`);
    });
    CRM.ui.isolateEvents(host);
    document.body.appendChild(host);
  }

  return { mount, TOP_ITEMS, BOTTOM_ITEMS };
})();
