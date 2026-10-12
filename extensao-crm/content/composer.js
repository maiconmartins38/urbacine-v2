// Raio ⚡ ao lado do campo de digitar a mensagem (como no vídeo): mostra/esconde o
// painel de Mensagens Rápidas. Abre um espacinho no fim do rodapé da conversa; se o
// WhatsApp não aceitar esse espaço, o raio fica logo acima do campo, sem tapar nada.
CRM.composer = (() => {
  const { icon } = CRM.ui;
  const SPACE = 40; // largura reservada à direita do campo
  const SIZE = 32;

  let host = null;
  let btn = null;
  let style = null;
  let mode = 'inline'; // 'inline' (dentro do rodapé) ou 'float' (acima do campo)
  let checked = null; // último rodapé conferido

  const CSS = `
    .zap { width: ${SIZE}px; height: ${SIZE}px; border-radius: 50%; border: 0; background: none; color: var(--teal);
      display: grid; place-items: center; position: relative; }
    .zap:hover { background: rgba(36, 152, 141, .12); }
    .zap.on { background: var(--teal-soft); }
    .zap.float { background: #fff; box-shadow: 0 1px 4px rgba(11, 20, 26, .2); }
    .zap-tip { position: absolute; bottom: calc(100% + 6px); right: 0; background: var(--teal); color: #fff; font-weight: 700; font-size: 11.5px;
      white-space: nowrap; padding: 4px 9px; border-radius: 6px; opacity: 0; pointer-events: none; transition: opacity .1s; }
    .zap:hover .zap-tip { opacity: 1; }
  `;

  function mount() {
    if (host && host.isConnected) return;
    host = document.createElement('div');
    host.id = 'crm-ext-composer';
    host.style.cssText = `position:fixed;z-index:989;width:${SIZE}px;height:${SIZE}px;display:none;`;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CRM.styles}${CSS}</style><div class="root"><button class="zap" title="">${icon('bolt', 20, 2)}<span class="zap-tip">Respostas rápidas</span></button></div>`;
    btn = shadow.querySelector('.zap');
    btn.addEventListener('click', async () => {
      await CRM.panel.toggleQuick();
      btn.classList.toggle('on', CRM.panel.quickOpen);
    });
    CRM.ui.isolateEvents(host);
    document.body.appendChild(host);
  }

  function setSpace(on) {
    if (on && !(style && style.isConnected)) {
      style = document.createElement('style');
      style.id = 'crm-ext-composer-style';
      style.textContent = `#main footer { padding-right: ${SPACE}px !important; }`;
      (document.head || document.documentElement).appendChild(style);
    }
    if (!on && style) {
      style.remove();
      style = null;
    }
  }

  // Botão mais à direita do rodapé (o microfone/enviar do WhatsApp).
  function rightmost(footer) {
    let best = null;
    footer.querySelectorAll('button, [role="button"], span[data-icon], [contenteditable="true"]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (!best || r.right > best.right + 1 || (Math.abs(r.right - best.right) <= 1 && r.bottom > best.bottom)) best = r;
    });
    return best;
  }

  function place() {
    const footer = document.querySelector('#main footer');
    const r = footer && footer.getBoundingClientRect();
    if (!footer || !r.width || !r.height) {
      if (host) host.style.display = 'none';
      return;
    }
    mount();
    if (mode === 'inline') {
      setSpace(true);
      // Confere (uma vez por rodapé) se o WhatsApp realmente abriu o espaço para o raio.
      if (footer !== checked && getComputedStyle(footer).paddingRight === SPACE + 'px') {
        checked = footer;
        const last = rightmost(footer);
        if (last && last.right > r.right - SPACE + 2) {
          mode = 'float';
          setSpace(false);
        }
      }
    }
    host.style.display = 'block';
    btn.classList.toggle('float', mode === 'float');
    btn.classList.toggle('on', CRM.panel.quickOpen);
    if (mode === 'inline') {
      const mic = rightmost(footer);
      const cy = mic ? mic.top + mic.height / 2 : r.top + r.height / 2;
      host.style.left = Math.round(r.right - SPACE + (SPACE - SIZE) / 2 - 2) + 'px';
      host.style.top = Math.round(cy - SIZE / 2) + 'px';
    } else {
      host.style.left = Math.round(r.right - SIZE - 12) + 'px';
      host.style.top = Math.round(r.top - SIZE - 10) + 'px';
    }
  }

  function remove() {
    setSpace(false);
    if (host) host.remove();
  }

  return { place, remove, get mode() { return mode; } };
})();
