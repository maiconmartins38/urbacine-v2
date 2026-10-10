// Liga tudo: coloca a barra de ícones na conversa, atualiza os contadores
// e roda o agendador.
(() => {
  const { icon } = CRM.ui;

  const BUTTONS = [
    { key: 'renewed', icon: 'renewed', tip: 'Renovado', open: () => CRM.renewals.markRenewed() },
    { key: 'renewals', icon: 'renew', tip: 'Mensagens de Renovação', open: () => CRM.renewals.openList() },
    { key: 'schedules', icon: 'schedule', tip: 'Mensagens Agendadas', open: () => CRM.schedules.openList() },
    { key: 'notes', icon: 'notes', tip: 'Anotações', open: () => CRM.notes.openList() },
  ];

  let barHost = null;
  let bar = null;

  function createBar() {
    barHost = document.createElement('div');
    barHost.id = 'crm-ext-bar';
    barHost.style.cssText = 'position:fixed;z-index:999;display:none;';
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

  // Acha a área da conversa aberta: { left, composerTop } ou null se nenhuma conversa estiver aberta.
  function findConversation() {
    const main = document.getElementById('main');
    if (main) {
      const rect = main.getBoundingClientRect();
      const footer = main.querySelector('footer');
      return { left: rect.left, composerTop: footer ? footer.getBoundingClientRect().top : rect.bottom };
    }
    // Plano B, caso o WhatsApp mude os nomes internos: parte do campo de digitar a mensagem
    // (o campo editável mais embaixo da tela) e sobe até a coluna da conversa.
    const boxes = [...document.querySelectorAll('[contenteditable="true"]')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!boxes.length) return null;
    const box = boxes.reduce((a, b) => (b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a));
    if (box.getBoundingClientRect().bottom < window.innerHeight * 0.6) return null; // é a busca, não o campo de mensagem
    let child = box;
    while (child.parentElement && child.parentElement !== document.body) {
      const panel = child.parentElement.getBoundingClientRect();
      if (panel.height > window.innerHeight * 0.6) {
        return { left: panel.left, composerTop: child.getBoundingClientRect().top };
      }
      child = child.parentElement;
    }
    return null;
  }

  // A barra fica no canto inferior esquerdo da conversa, logo acima do campo de digitar.
  function place() {
    if (!barHost || !barHost.isConnected) createBar();
    const conv = findConversation();
    if (!conv) {
      barHost.style.display = 'none';
      return;
    }
    barHost.style.display = 'block';
    barHost.style.left = Math.round(conv.left + 12) + 'px';
    barHost.style.bottom = Math.round(window.innerHeight - conv.composerTop + 14) + 'px';
  }

  async function refreshBadges() {
    if (!bar) return;
    const chat = CRM.wa.state.activeChat;
    const counts = {
      renewals: chat ? await CRM.renewals.activeCount(chat.id) : 0,
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
  CRM.ui.toast('CRM WhatsApp ativo ✓ (versão ' + chrome.runtime.getManifest().version + ')', 'ok');
  CRM.wa.on('error', (error) => CRM.ui.toast('CRM WhatsApp: ' + error + ' Recarregue a página (F5).', 'err'));
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
    if (changes.schedules || changes.notes || changes.renewals) refreshBadges();
  });

  const tickTimer = setInterval(() => {
    if (!alive()) return shutdown();
    CRM.schedules.tick();
  }, 20000);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'crm-tick') CRM.schedules.tick();
  });
})();
