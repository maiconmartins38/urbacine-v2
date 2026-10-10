// Liga tudo: coloca a barra de ícones na conversa, atualiza os contadores
// e roda o agendador.
(() => {
  const { icon } = CRM.ui;

  const BUTTONS = [
    { key: 'schedules', icon: 'schedule', tip: 'Mensagens Agendadas', open: () => CRM.schedules.openList() },
    { key: 'notes', icon: 'notes', tip: 'Anotações', open: () => CRM.notes.openList() },
  ];

  let barHost = null;
  let bar = null;

  function createBar() {
    barHost = document.createElement('div');
    barHost.id = 'crm-ext-bar';
    barHost.style.cssText = 'position:fixed;z-index:10;display:none;';
    const shadow = barHost.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CRM.styles}</style><div class="root"><div class="bar">${BUTTONS.map(
      (b) => `<button class="bar-btn" data-key="${b.key}">${icon(b.icon, 21)}<span class="bar-badge" hidden></span><span class="bar-tip">${b.tip}</span></button>`
    ).join('')}</div></div>`;
    bar = shadow.querySelector('.bar');
    bar.querySelectorAll('[data-key]').forEach((btn) => {
      const def = BUTTONS.find((b) => b.key === btn.dataset.key);
      btn.addEventListener('click', def.open);
    });
    CRM.ui.isolateEvents(barHost);
    document.body.appendChild(barHost);
  }

  // A barra fica no canto inferior esquerdo da conversa, logo acima do campo de digitar.
  function place() {
    if (!barHost || !barHost.isConnected) createBar();
    const main = document.getElementById('main');
    if (!main) {
      barHost.style.display = 'none';
      return;
    }
    const rect = main.getBoundingClientRect();
    const footer = main.querySelector('footer');
    const bottomEdge = footer ? footer.getBoundingClientRect().top : rect.bottom;
    barHost.style.display = 'block';
    barHost.style.left = Math.round(rect.left + 12) + 'px';
    barHost.style.bottom = Math.round(window.innerHeight - bottomEdge + 14) + 'px';
  }

  async function refreshBadges() {
    if (!bar) return;
    const chat = CRM.wa.state.activeChat;
    const counts = {
      schedules: chat ? await CRM.schedules.pendingCount(chat.id) : 0,
      notes: chat ? await CRM.notes.countFor(chat.id) : 0,
    };
    for (const [key, count] of Object.entries(counts)) {
      const badge = bar.querySelector(`[data-key="${key}"] .bar-badge`);
      badge.hidden = !count;
      badge.textContent = count > 99 ? '99+' : String(count);
    }
  }

  function alive() {
    try {
      return !!(chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  // Depois de atualizar a extensão, a aba antiga fica "órfã": some com a barra e pede F5.
  function shutdown() {
    clearInterval(placeTimer);
    clearInterval(tickTimer);
    if (barHost) barHost.remove();
    const host = document.getElementById('crm-ext-host');
    if (host) host.remove();
  }

  createBar();
  place();
  const placeTimer = setInterval(() => {
    if (!alive()) return shutdown();
    place();
  }, 700);
  window.addEventListener('resize', place);

  CRM.wa.on('activeChat', () => {
    place();
    refreshBadges();
  });
  CRM.wa.on('ready', () => {
    CRM.wa.refreshActiveChat().then(refreshBadges);
    CRM.schedules.tick();
  });
  CRM.store.onChange((changes) => {
    if (changes.schedules || changes.notes) refreshBadges();
  });

  const tickTimer = setInterval(() => {
    if (!alive()) return shutdown();
    CRM.schedules.tick();
  }, 20000);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'crm-tick') CRM.schedules.tick();
  });
})();
