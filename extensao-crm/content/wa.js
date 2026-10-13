// Fala com a ponte (page/bridge.js), que tem acesso ao WhatsApp Web.
CRM.wa = (() => {
  const OUT = 'crm-ext:out';
  const IN = 'crm-ext:in';
  const pending = new Map();
  const listeners = { ready: [], activeChat: [], error: [] };
  let seq = 0;

  const state = { ready: false, activeChat: null, error: null };

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (event.source !== window || !data || data.__crm !== OUT) return;

    if (data.event) {
      if (data.event === 'ready') {
        state.ready = true;
        state.error = null;
      } else if (data.event === 'activeChat') {
        state.activeChat = data.chat;
      } else if (data.event === 'error') {
        state.error = data.error;
      }
      (listeners[data.event] || []).forEach((fn) => fn(data.chat || data.error));
      return;
    }

    const waiting = pending.get(data.id);
    if (!waiting) return;
    pending.delete(data.id);
    if (data.ok) waiting.resolve(data.result);
    else waiting.reject(new Error(data.error));
  });

  function call(cmd, args, timeoutMs = 120000) {
    const id = 'c' + ++seq + '_' + Date.now();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Tempo esgotado falando com o WhatsApp Web.'));
      }, timeoutMs);
      pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      window.postMessage({ __crm: IN, id, cmd, args }, window.location.origin);
    });
  }

  // Caso o aviso de "pronto" tenha passado antes de esta parte carregar.
  function pollStatus() {
    const timer = setInterval(async () => {
      if (state.ready) return clearInterval(timer);
      try {
        const status = await call('status', {}, 3000);
        if (status && status.ready && !state.ready) {
          clearInterval(timer);
          state.ready = true;
          listeners.ready.forEach((fn) => fn());
          state.activeChat = await call('activeChat', {}, 10000);
          listeners.activeChat.forEach((fn) => fn(state.activeChat));
        }
      } catch (_) {
        // a ponte ainda não respondeu; tenta de novo
      }
    }, 2000);
  }
  pollStatus();

  return {
    state,
    on(event, fn) {
      (listeners[event] = listeners[event] || []).push(fn);
    },
    async refreshActiveChat() {
      if (!state.ready) return state.activeChat;
      try {
        state.activeChat = await call('activeChat', {}, 10000);
      } catch (_) {
        // mantém o último valor conhecido
      }
      return state.activeChat;
    },
    sendText: (chatId, text, options) => call('sendText', { chatId, text, options }),
    sendPix: (chatId, params) => call('sendPix', { chatId, params }),
    sendContact: (chatId, contact) => call('sendContact', { chatId, contact }),
    sendList: (chatId, options) => call('sendList', { chatId, options }),
    chatAction: (chatId, op, ms) => call('chatAction', { chatId, op, ms }, 60000),
    getProfilePic: (id) => call('getProfilePic', { id }, 15000),
    openChat: (id) => call('openChat', { id }, 15000),
    sendFile: (chatId, dataUrl, options) => call('sendFile', { chatId, dataUrl, options }),
    listChats: () => call('listChats', {}, 60000),
    setChatList: (type, ids) => call('setChatList', { type, ids }, 20000),
    getContact: (id) => call('getContact', { id }, 20000),
    saveContact: (id, name) => call('saveContact', { id, name }, 30000),
    removeContact: (id) => call('removeContact', { id }, 30000),
    setAutoSave: (enabled) => call('setAutoSave', { enabled }, 10000),
    me: () => call('me', {}, 10000),
  };
})();
