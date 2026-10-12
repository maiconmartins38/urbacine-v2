// Ponte entre a extensão e o WhatsApp Web.
// Roda no contexto da página (onde a biblioteca wa-js expõe window.WPP) e
// conversa com o resto da extensão por window.postMessage.
(() => {
  const OUT = 'crm-ext:out';
  const IN = 'crm-ext:in';

  const post = (msg) => window.postMessage({ __crm: OUT, ...msg }, window.location.origin);

  function chatInfo(chat) {
    if (!chat || !chat.id) return null;
    const id = chat.id._serialized || String(chat.id);
    const contact = chat.contact || {};
    const name =
      chat.formattedTitle || chat.name || contact.name || contact.verifiedName ||
      contact.pushname || contact.formattedName || '';
    let phone = '';
    if (chat.id.server === 'c.us') phone = chat.id.user || '';
    else if (contact.phoneNumber) phone = contact.phoneNumber.user || '';
    return { id, name, pushname: contact.pushname || '', phone, isGroup: !!chat.isGroup };
  }

  function withTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
    ]);
  }

  async function confirmSent(result) {
    if (result && result.sendMsgResult) {
      await withTimeout(result.sendMsgResult, 90000, 'O WhatsApp não confirmou o envio a tempo.');
    }
    return { id: result && result.id ? String(result.id) : null };
  }

  const handlers = {
    status: () => ({ ready: isReady() }),
    activeChat: () => chatInfo(window.WPP.chat.getActiveChat()),
    sendText: async ({ chatId, text, options }) =>
      confirmSent(await window.WPP.chat.sendTextMessage(chatId, text, { createChat: true, ...(options || {}) })),
    sendPix: async ({ chatId, params }) =>
      confirmSent(await window.WPP.chat.sendPixKeyMessage(chatId, params, { createChat: true })),
    sendContact: async ({ chatId, contact }) =>
      confirmSent(await window.WPP.chat.sendVCardContactMessage(chatId, contact, { createChat: true })),
    sendList: async ({ chatId, options }) =>
      confirmSent(await window.WPP.chat.sendListMessage(chatId, { createChat: true, ...options })),
    // Ações na conversa usadas pelas respostas rápidas.
    chatAction: async ({ chatId, op, ms }) => {
      const chat = window.WPP.chat;
      const ops = {
        composing: () => chat.markIsComposing(chatId, ms),
        recording: () => chat.markIsRecording(chatId, ms),
        paused: () => chat.markIsPaused(chatId),
        archive: () => chat.archive(chatId, true),
        unarchive: () => chat.archive(chatId, false),
        pin: () => chat.pin(chatId, true),
        unpin: () => chat.pin(chatId, false),
        markUnread: () => chat.markIsUnread(chatId),
        block: () => window.WPP.blocklist.blockContact(chatId),
      };
      if (!ops[op]) throw new Error('Ação desconhecida: ' + op);
      await ops[op]();
      return true;
    },
    getProfilePic: async ({ id }) => {
      try {
        return (await window.WPP.contact.getProfilePictureUrl(id)) || '';
      } catch (_) {
        return '';
      }
    },
    sendFile: async ({ chatId, dataUrl, options }) =>
      confirmSent(await window.WPP.chat.sendFileMessage(chatId, dataUrl, { createChat: true, ...options })),
    // Conversas para escolher contatos das abas (sem canais e listas de transmissão).
    listChats: async () =>
      (await window.WPP.chat.list())
        .filter((c) => c && c.id && !['newsletter', 'broadcast'].includes(c.id.server))
        .map(chatInfo)
        .filter(Boolean),
    // Contato: nome salvo na agenda, nome do perfil e se já está salvo.
    getContact: async ({ id }) => {
      const c = await window.WPP.contact.get(id);
      return { id, name: (c && c.name) || '', pushname: (c && c.pushname) || '', isMyContact: !!(c && c.isMyContact) };
    },
    // Salva/atualiza o contato no aparelho (sincroniza com a agenda do celular).
    saveContact: async ({ id, name }) => {
      await window.WPP.contact.save(id, name, { syncAddressBook: true });
      return true;
    },
    removeContact: async ({ id }) => {
      await window.WPP.contact.remove(id);
      return true;
    },
    setAutoSave: ({ enabled }) => {
      autoSave = !!enabled;
      return autoSave;
    },
    // Filtra a lista de conversas do WhatsApp (abas). type: 'custom' com ids, ou 'all'.
    setChatList: async ({ type, ids }) => {
      const result = await window.WPP.chat.setChatList(type, ids);
      return { type: result && result.type };
    },
  };

  // "Salvar contatos automaticamente": quem mandar mensagem, não estiver na agenda
  // e tiver nome no perfil do WhatsApp é salvo com esse nome.
  let autoSave = false;
  const autoSaved = new Set();
  async function onNewMessage(msg) {
    try {
      if (!autoSave || !msg || !msg.isNewMsg || (msg.id && msg.id.fromMe)) return;
      const from = msg.from;
      if (!from || ['g.us', 'broadcast', 'newsletter'].includes(from.server)) return;
      const id = from._serialized || String(from);
      if (autoSaved.has(id)) return;
      const contact = await window.WPP.contact.get(id);
      if (contact && contact.isMyContact) return;
      const name = String(msg.notifyName || (contact && contact.pushname) || '').trim();
      if (!name) return;
      autoSaved.add(id);
      await window.WPP.contact.save(id, name, { syncAddressBook: true });
      post({ event: 'contactAutoSaved', chat: { id, name } });
    } catch (_) {
      // não atrapalha o WhatsApp se não conseguir salvar
    }
  }

  function isReady() {
    return !!(window.WPP && window.WPP.isReady);
  }

  window.addEventListener('message', async (event) => {
    const data = event.data;
    if (event.source !== window || !data || data.__crm !== IN) return;
    const { id, cmd, args } = data;
    try {
      if (!handlers[cmd]) throw new Error('Comando desconhecido: ' + cmd);
      if (cmd !== 'status' && !isReady()) throw new Error('O WhatsApp Web ainda está carregando.');
      const result = await handlers[cmd](args || {});
      post({ id, ok: true, result });
    } catch (err) {
      post({ id, ok: false, error: (err && err.message) || String(err) });
    }
  });

  function onReady() {
    post({ event: 'ready' });
    try {
      post({ event: 'activeChat', chat: chatInfo(window.WPP.chat.getActiveChat()) });
      window.WPP.on('chat.active_chat', (chat) => post({ event: 'activeChat', chat: chatInfo(chat) }));
      window.WPP.on('chat.new_message', onNewMessage);
    } catch (err) {
      post({ event: 'error', error: (err && err.message) || String(err) });
    }
  }

  const started = Date.now();
  const wait = setInterval(() => {
    const WPP = window.WPP;
    if (WPP && WPP.loader && typeof WPP.loader.onReady === 'function') {
      clearInterval(wait);
      WPP.loader.onReady(onReady);
    } else if (WPP && WPP.webpack && typeof WPP.webpack.onReady === 'function') {
      clearInterval(wait);
      WPP.webpack.onReady(onReady);
    } else if (Date.now() - started > 120000) {
      clearInterval(wait);
      post({ event: 'error', error: 'Biblioteca do WhatsApp não carregou.' });
    }
  }, 250);
})();
