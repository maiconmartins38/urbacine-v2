// Executa uma resposta rápida: roda cada ação na ordem, numa conversa.
// Usado pelo botão ▷ do painel e pelos envios agendados/de renovação.
CRM.quickRun = (() => {
  const { firstName } = CRM.util;
  const store = CRM.store;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const fill = (text, ctx) => String(text || '').replace(/\{nome\}/gi, firstName(ctx.chatName));

  async function media(a) {
    const m = await store.getMedia(a.mediaId);
    if (!m) throw new Error('O arquivo desta ação não foi encontrado.');
    return m;
  }

  const RUN = {
    async text(a, ctx) {
      const text = fill(a.text, ctx).trim();
      if (text) await CRM.wa.sendText(ctx.chatId, text);
    },
    async image(a, ctx) {
      const m = await media(a);
      await CRM.wa.sendFile(ctx.chatId, m.dataUrl, { type: 'image', caption: fill(a.caption, ctx) || undefined, filename: m.name });
    },
    async video(a, ctx) {
      const m = await media(a);
      await CRM.wa.sendFile(ctx.chatId, m.dataUrl, { type: 'video', caption: fill(a.caption, ctx) || undefined, filename: m.name });
    },
    async document(a, ctx) {
      const m = await media(a);
      await CRM.wa.sendFile(ctx.chatId, m.dataUrl, { type: 'document', caption: fill(a.caption, ctx) || undefined, filename: m.name, mimetype: m.mime });
    },
    async sticker(a, ctx) {
      const m = await media(a);
      await CRM.wa.sendFile(ctx.chatId, m.dataUrl, { type: 'sticker' });
    },
    async audio(a, ctx) {
      const m = await media(a);
      await CRM.wa.sendFile(ctx.chatId, m.dataUrl, { type: 'audio', isPtt: true, waveform: true });
    },
    async pix(a, ctx) {
      await CRM.wa.sendPix(ctx.chatId, { keyType: a.keyType || 'EVP', key: a.key, name: a.name, instructions: fill(a.instructions, ctx) || undefined });
    },
    async groupInvite(a, ctx) {
      const text = [fill(a.text, ctx).trim(), (a.link || '').trim()].filter(Boolean).join('\n');
      await CRM.wa.sendText(ctx.chatId, text, { linkPreview: true });
    },
    async contact(a, ctx) {
      let digits = String(a.phone || '').replace(/\D/g, '');
      if (!digits) throw new Error('Contato sem telefone.');
      if (digits.length <= 11) digits = '55' + digits; // número brasileiro só com DDD

      await CRM.wa.sendContact(ctx.chatId, { id: digits + '@c.us', name: a.name || digits });
    },
    async linkBanner(a, ctx) {
      const preview = a.title || a.description ? { title: a.title || undefined, description: a.description || undefined } : true;
      await CRM.wa.sendText(ctx.chatId, fill(a.text, ctx), { linkPreview: preview });
    },
    async list(a, ctx) {
      const rows = (a.items || []).filter((i) => i.title).map((i, n) => ({ rowId: 'op' + (n + 1), title: i.title, description: i.description || '' }));
      if (!rows.length) throw new Error('A lista não tem itens.');
      await CRM.wa.sendList(ctx.chatId, {
        buttonText: a.buttonText || 'Ver opções',
        description: fill(a.description, ctx) || ' ',
        title: fill(a.title, ctx) || undefined,
        footer: a.footer || undefined,
        sections: [{ title: a.sectionTitle || 'Opções', rows }],
      });
    },
    async wait(a) {
      await sleep(Math.max(0, Number(a.seconds) || 0) * 1000);
    },
    async typing(a, ctx) {
      const ms = Math.max(1, Number(a.seconds) || 1) * 1000;
      await CRM.wa.chatAction(ctx.chatId, 'composing', ms);
      await sleep(ms);
    },
    async recording(a, ctx) {
      const ms = Math.max(1, Number(a.seconds) || 1) * 1000;
      await CRM.wa.chatAction(ctx.chatId, 'recording', ms);
      await sleep(ms);
    },
    archive: (a, ctx) => CRM.wa.chatAction(ctx.chatId, 'archive'),
    unarchive: (a, ctx) => CRM.wa.chatAction(ctx.chatId, 'unarchive'),
    pin: (a, ctx) => CRM.wa.chatAction(ctx.chatId, 'pin'),
    unpin: (a, ctx) => CRM.wa.chatAction(ctx.chatId, 'unpin'),
    markUnread: (a, ctx) => CRM.wa.chatAction(ctx.chatId, 'markUnread'),
    block: (a, ctx) => CRM.wa.chatAction(ctx.chatId, 'block'),
    tabAdd: (a, ctx) => CRM.tabs.setChatInTab(ctx.chatId, a.tabId, true),
    tabRemove: (a, ctx) => CRM.tabs.setChatInTab(ctx.chatId, a.tabId, false),
  };

  // ctx = { chatId, chatName }. Para no primeiro erro e diz em qual ação foi.
  async function execute(q, ctx) {
    if (!q.actions || !q.actions.length) throw new Error('Esta resposta rápida não tem ações.');
    for (let i = 0; i < q.actions.length; i++) {
      const a = q.actions[i];
      const run = RUN[a.type];
      if (!run) throw new Error(`Ação ${i + 1}: tipo desconhecido.`);
      try {
        await run(a, ctx);
      } catch (err) {
        const t = CRM.quick.TYPES[a.type];
        throw new Error(`Ação ${i + 1} (${t ? t.label : a.type}): ${err.message}`);
      }
    }
    await CRM.quick.countUse(q.id);
  }

  return { execute, fill };
})();
