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
      if (e.key === 'Escape' && layer && layer.firstChild && onEscape) {
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
    onEscape = null;
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

  return { icon, isolateEvents, modal, closeModal, toast, attachEmoji, textareaHTML, infoHTML };
})();
