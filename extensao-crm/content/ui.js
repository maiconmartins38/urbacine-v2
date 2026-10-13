// Peças de interface reutilizáveis: ícones, janelas, avisos e emojis.
CRM.ui = (() => {
  const svg = (inner, size = 20, stroke = 1.8) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  const ICONS = {
    schedule: '<path d="M11 20.5H5.5a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2V10"/><path d="M3.5 9h15"/><path d="M7.5 2.5v4"/><path d="M14.5 2.5v4"/><circle cx="17" cy="17" r="4.6"/><path d="M17 14.8v2.4l1.6 1.1"/>',
    notes: '<path d="M15 4.5h1.5a2 2 0 0 1 2 2V9"/><path d="M8.5 4.5H7a2 2 0 0 0-2 2v12.5a2 2 0 0 0 2 2h4"/><rect x="8.5" y="3" width="6.5" height="3" rx="1"/><path d="M13 19.5l.7-2.8 5.6-5.6a1.5 1.5 0 0 1 2.1 2.1l-5.6 5.6-2.8.7z"/><path d="M8.5 11h4M8.5 14.5h2.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
    report: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    download: '<path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3"/>',
    upload: '<path d="M12 15V4"/><path d="M7.5 8.5L12 4l4.5 4.5"/><path d="M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.5h.01" stroke-width="2.6"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M5.5 7l1 12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4.5h6V7"/>',
    send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/>',
    bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
    text: '<path d="M5 6h14M12 6v13M9 19h6"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-9 8.5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    audio: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    repeat: '<path d="M17 2.5l3 3-3 3"/><path d="M4 11.5v-1a5 5 0 0 1 5-5h11"/><path d="M7 21.5l-3-3 3-3"/><path d="M20 12.5v1a5 5 0 0 1-5 5H4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
    renew: '<path d="M20 11.5A8 8 0 0 0 6 6.3"/><path d="M5.5 2.8v3.9h3.9"/><path d="M4 12.5a8 8 0 0 0 14 5.2"/><path d="M18.5 21.2v-3.9h-3.9"/><path d="M12 8.5v7M14 9.8c-.4-.8-1.2-1.3-2.2-1.3-1.2 0-2 .6-2 1.5 0 2 4.3 1 4.3 3.2 0 .9-.9 1.6-2.2 1.6-1 0-1.9-.5-2.3-1.3"/>',
    client: '<circle cx="10" cy="8" r="4"/><path d="M3 20.5c1.1-3.6 3.7-5.5 7-5.5 1.4 0 2.7.3 3.8 1"/><path d="M18 14v7M14.5 17.5h7"/>',
    folderPlus: '<path d="M20.5 12V8.5a2 2 0 0 0-2-2h-6.3L10 4H5.5a2 2 0 0 0-2 2v11.5a2 2 0 0 0 2 2H12"/><path d="M18 15.5v6M15 18.5h6"/>',
    folderGo: '<path d="M20.5 18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4.5l2.2 2.5h6.3a2 2 0 0 1 2 2z"/><path d="M8.5 15.5c.4-2.5 2.4-4 5-4h2"/><path d="M13.5 9.5l2 2-2 2"/>',
    menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
    funnel: '<path d="M3.5 5h17l-6.5 7.8V19l-4 1.5v-7.7z"/>',
    chevLeft: '<path d="M14.5 6l-6 6 6 6"/>',
    chevRight: '<path d="M9.5 6l6 6-6 6"/>',
    checkCircle: '<circle cx="12" cy="12" r="9.5" fill="currentColor" stroke="none"/><path d="M7.8 12.3l3 3 5.4-5.8" stroke="#fff" stroke-width="2.2"/>',
    userEdit: '<circle cx="9.5" cy="8" r="3.8"/><path d="M3 20c.9-3.4 3.3-5.2 6.5-5.2 1 0 1.9.2 2.7.5"/><path d="M14.5 20.5l.5-2.2 4.3-4.3a1.3 1.3 0 0 1 1.8 1.8l-4.3 4.3z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12.5h5"/>',
    video: '<rect x="3" y="6.5" width="12.5" height="11" rx="2"/><path d="M15.5 10.5l5-3v9l-5-3z"/>',
    pix: '<path d="M12 3.5l8.5 8.5-8.5 8.5L3.5 12z"/><path d="M8.5 12h7M12 8.5v7"/>',
    group: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.8 14.6c2.3-.3 4.1 1 4.7 3.7"/>',
    contactCard: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="2.8"/><path d="M7.5 18c.8-2.3 2.6-3.4 4.5-3.4s3.7 1.1 4.5 3.4"/>',
    banner: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9h17"/><path d="M7 13h10M7 16h6"/>',
    sticker: '<path d="M14 3.5H6.5a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h7l7-7v-7a3 3 0 0 0-3-3z"/><path d="M13.5 20.5v-4a3 3 0 0 1 3-3h4"/><path d="M8.5 9.5h.01M13 9.5h.01" stroke-width="2.6"/>',
    list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" stroke-width="2.8"/>',
    folderMinus: '<path d="M20.5 12V8.5a2 2 0 0 0-2-2h-6.3L10 4H5.5a2 2 0 0 0-2 2v11.5a2 2 0 0 0 2 2H12"/><path d="M15 18.5h6"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    typing: '<path d="M4 16.5l5-5 3 3 4-4"/><path d="M4 20h16"/><path d="M15.5 5.5l3 3"/>',
    recDot: '<circle cx="12" cy="12" r="6" fill="#e5484d" stroke="none"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    gridPlus: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><path d="M16.75 13.5v6.5M13.5 16.75H20"/>',
    archive: '<rect x="3.5" y="4.5" width="17" height="4.5" rx="1"/><path d="M5 9v9.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="M10 13h4"/>',
    pin: '<path d="M9 3.5h6l-1 5 3.5 3.5h-11L10 8.5z"/><path d="M12 12v8.5"/>',
    mailDot: '<rect x="3.5" y="6" width="14" height="12" rx="2"/><path d="M3.5 8l7 5 7-5"/><circle cx="19" cy="6" r="2.5" fill="currentColor"/>',
    block: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    shapes: '<path d="M7 3.5l3.5 6h-7z"/><circle cx="16.5" cy="7" r="3"/><rect x="5" y="13.5" width="6" height="6" rx="1"/><path d="M16.5 13l3.5 6.5h-7z"/>',
    back: '<path d="M9 7L4 12l5 5"/><path d="M4 12h9a7 7 0 0 1 7 7"/>',
    more: '<path d="M5.5 12h.01M12 12h.01M18.5 12h.01" stroke-width="3"/>',
    eye2: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
    play: '<path d="M6.5 4.5l13 7.5-13 7.5z"/>',
    chevDown: '<path d="M6 9l6 6 6-6"/>',
    chevUp: '<path d="M6 15l6-6 6 6"/>',
    copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    tag: '<path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5-8 8z"/><circle cx="8" cy="8" r="1.5"/>',
    money: '<path d="M12 3v18M16.3 7.3C15.7 6 14.2 5.2 12.2 5.2c-2.4 0-4.2 1.2-4.2 3.1 0 4.6 8.4 2.6 8.4 7.3 0 1.9-1.9 3.2-4.3 3.2-2.2 0-3.8-.9-4.4-2.4"/>',
    renewed: '<circle cx="12" cy="12" r="9"/><path d="M7.8 12.3l3 3 5.4-5.8"/>',
    sprout: '<path d="M12 21v-8.5"/><path d="M12 12.5c0-4.4 2.7-7 7.5-7 0 4.4-2.7 7-7.5 7z"/><path d="M12 15c0-3.4-2.2-5.5-6.5-5.5 0 3.4 2.2 5.5 6.5 5.5z"/>',
    stopCircle: '<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
    megaphone: '<path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  };

  const icon = (name, size, stroke) => svg(ICONS[name], size, stroke);

  // Impede que o que for digitado nas nossas janelas chegue aos atalhos do WhatsApp.
  function isolateEvents(host) {
    ['keydown', 'keyup', 'keypress', 'input', 'paste', 'copy', 'cut', 'drop', 'dragover'].forEach((type) =>
      host.addEventListener(type, (e) => e.stopPropagation())
    );
  }

  // ---------- Camada das janelas ----------
  let host = null;
  let shadow = null;
  let layer = null;
  let toasts = null;
  let onEscape = null;

  function ensureHost() {
    if (host && host.isConnected) return;
    host = document.createElement('div');
    host.id = 'crm-ext-host';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CRM.styles}</style><div class="root"><div class="layer"></div><div class="toasts"></div></div>`;
    layer = shadow.querySelector('.layer');
    toasts = shadow.querySelector('.toasts');
    isolateEvents(host);
    document.body.appendChild(host);
  }

  window.addEventListener(
    'keydown',
    (e) => {
      const target = e.composedPath()[0];
      if (e.key === 'Escape' && target && target.dataset && target.dataset.listOpen) {
        // Esc com a lista de busca aberta fecha só a lista (não a janela nem a conversa).
        e.stopPropagation();
        e.preventDefault();
        target.dispatchEvent(new CustomEvent('qsel-close'));
        return;
      }
      if (e.key === 'Escape' && onEscape) {
        e.stopPropagation();
        e.preventDefault();
        onEscape();
      }
    },
    true
  );

  function modal(html, { wide = false, onClose } = {}) {
    ensureHost();
    layer.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'modal' + (wide ? ' wide' : '');
    el.innerHTML = `<button class="modal-close" data-close title="Fechar">${icon('close', 18, 2)}</button>${html}`;
    layer.appendChild(el);
    const close = () => {
      closeModal();
      if (onClose) onClose();
    };
    el.querySelector('[data-close]').addEventListener('click', close);
    onEscape = close;
    return el;
  }

  function closeModal() {
    if (layer) layer.innerHTML = '';
    if (shadow) shadow.querySelectorAll('.sub-layer').forEach((el) => el.remove());
    onEscape = null;
  }

  // Janela por cima da janela atual (sem fechar a de baixo). Fecha com el.closeSub().
  function subModal(html) {
    ensureHost();
    const wrap = document.createElement('div');
    wrap.className = 'sub-layer';
    const el = document.createElement('div');
    el.className = 'modal';
    el.innerHTML = `<button class="modal-close" data-close title="Fechar">${icon('close', 18, 2)}</button>${html}`;
    wrap.appendChild(el);
    layer.parentNode.appendChild(wrap);
    const previousEscape = onEscape;
    el.closeSub = () => {
      wrap.remove();
      onEscape = previousEscape;
    };
    el.querySelector('[data-close]').addEventListener('click', el.closeSub);
    onEscape = el.closeSub;
    return el;
  }

  // Aviso branco no canto superior direito (como o "Aba adicionada com sucesso").
  function notice(text) {
    ensureHost();
    let box = shadow.querySelector('.notices');
    if (!box) {
      box = document.createElement('div');
      box.className = 'notices';
      shadow.querySelector('.root').appendChild(box);
    }
    // Fica ao lado do painel da direita (quando aberto), sem tapar as abas dele.
    box.style.right = ((CRM.layout && CRM.layout.right) || 0) + 12 + 'px';
    const n = document.createElement('div');
    n.className = 'notice';
    n.innerHTML = `${icon('checkCircle', 18)}<span></span>`;
    n.querySelector('span').textContent = text;
    box.appendChild(n);
    setTimeout(() => n.remove(), 3500);
  }

  function toast(text, kind = '') {
    ensureHost();
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = text;
    toasts.appendChild(t);
    setTimeout(() => t.remove(), kind === 'err' ? 7000 : 3500);
  }

  // ---------- Emojis ----------
  const EMOJIS = (
    '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😎 🤩 🥳 😏 😌 🤔 🤗 🤭 😴 😢 😭 😤 😡 😱 😳 🙄 ' +
    '👍 👎 👏 🙌 🙏 🤝 👋 ✌️ 🤞 👌 💪 👉 👈 ☝️ 👀 ❤️ 🧡 💛 💚 💙 💜 🖤 💖 💯 ✨ 🔥 ⭐ 🌟 🎉 🎊 🎁 ' +
    '✅ ❌ ⚠️ ❗ ❓ 📌 📍 📅 ⏰ ⏳ 🕒 📞 📲 💬 📝 📦 🚚 🛒 💰 💵 💳 🏷️ 📢 🔔 ☀️ 🌙 ☕ 🍀 🌹 🎂 🚀 💡'
  ).split(' ');

  // Liga o botão de emoji a um campo de texto.
  function attachEmoji(button, field) {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const wrap = button.closest('.textarea-wrap');
      const open = wrap.querySelector('.emoji-pop');
      if (open) return open.remove();
      const pop = document.createElement('div');
      pop.className = 'emoji-pop';
      pop.innerHTML = EMOJIS.map((em) => `<button type="button">${em}</button>`).join('');
      pop.addEventListener('click', (ev) => {
        const b = ev.target.closest('button');
        if (!b) return;
        const start = field.selectionStart ?? field.value.length;
        const end = field.selectionEnd ?? field.value.length;
        field.value = field.value.slice(0, start) + b.textContent + field.value.slice(end);
        field.focus();
        field.selectionStart = field.selectionEnd = start + b.textContent.length;
        field.dispatchEvent(new Event('input'));
      });
      wrap.appendChild(pop);
    });
  }

  // Campo de mensagem com o botão de emoji, igual nas duas telas.
  function textareaHTML({ name, placeholder, value = '' }) {
    return `<div class="textarea-wrap">
      <textarea class="textarea" name="${name}" placeholder="${CRM.util.esc(placeholder)}">${CRM.util.esc(value)}</textarea>
      <div class="textarea-tools"><button type="button" class="icon-btn" data-emoji title="Emojis">${icon('smile', 19)}</button></div>
    </div>`;
  }

  function infoHTML(text) {
    return `<span class="info">${icon('info', 14, 2)}<span class="info-pop">${text}</span></span>`;
  }

  return { icon, isolateEvents, modal, subModal, closeModal, toast, notice, attachEmoji, textareaHTML, infoHTML };
})();
