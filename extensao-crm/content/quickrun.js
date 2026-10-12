// Executa uma resposta rápida: roda cada ação na ordem, numa conversa.
// Usado pelo botão ▷ do painel, pelo "Editar e enviar" e pelos envios agendados/de renovação.
CRM.quickRun = (() => {
  const { firstName } = CRM.util;
  const store = CRM.store;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  class Cancelled extends Error {}

  const fill = (text, ctx) => String(text || '').replace(/\{nome\}/gi, firstName(ctx.chatName));
  const secs = (v) => Math.max(0, Math.min(600, Number(v) || 0));

  async function media(a) {
    if (a._pending) return a._pending; // "Editar e enviar": arquivo trocado e ainda não salvo
    const m = await store.getMedia(a.mediaId);
    if (!m) throw new Error('O arquivo desta ação não foi encontrado.');
    return m;
  }

  // r = { pause(segundos, fase), say(fase) } — ver execute().
  const RUN = {
    async text(a, ctx, r) {
      const text = fill(a.text, ctx).trim();
      if (secs(a.typing)) {
        await CRM.wa.chatAction(ctx.chatId, 'composing', secs(a.typing) * 1000);
        await r.pause(a.typing, 'typing');
      }
      r.say('sending');
      if (text) await CRM.wa.sendText(ctx.chatId, text);
      await r.pause(a.wait, 'wait');
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
    async audio(a, ctx, r) {
      const m = await media(a);
      if (secs(a.recording)) {
        await CRM.wa.chatAction(ctx.chatId, 'recording', secs(a.recording) * 1000);
        await r.pause(a.recording, 'recording');
      }
      r.say('sending');
      await CRM.wa.sendFile(ctx.chatId, m.dataUrl, { type: 'audio', isPtt: true, waveform: true });
      await r.pause(a.wait, 'wait');
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
    async wait(a, ctx, r) {
      await r.pause(a.seconds, 'wait');
    },
    async typing(a, ctx, r) {
      const s = Math.max(1, secs(a.seconds));
      await CRM.wa.chatAction(ctx.chatId, 'composing', s * 1000);
      await r.pause(s, 'typing');
    },
    async recording(a, ctx, r) {
      const s = Math.max(1, secs(a.seconds));
      await CRM.wa.chatAction(ctx.chatId, 'recording', s * 1000);
      await r.pause(s, 'recording');
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
  // run (opcional) = { cancelled, onProgress({ index, total, type, phase, left, fraction }) }.
  async function execute(q, ctx, run = {}) {
    const actions = q.actions || [];
    if (!actions.length) throw new Error('Esta resposta rápida não tem ações.');
    const total = actions.length;
    for (let i = 0; i < total; i++) {
      if (run.cancelled) throw new Cancelled('Envio cancelado.');
      const a = actions[i];
      const go = RUN[a.type];
      if (!go) throw new Error(`Ação ${i + 1}: tipo desconhecido.`);
      const report = (info) => run.onProgress && run.onProgress({ index: i, total, type: a.type, ...info });
      const r = {
        say: (phase) => report({ phase, fraction: 0 }),
        // Espera contando os segundos na tela; para na hora se o envio for cancelado.
        async pause(seconds, phase) {
          const s = secs(seconds);
          if (!s) return;
          const end = Date.now() + s * 1000;
          for (;;) {
            if (run.cancelled) throw new Cancelled('Envio cancelado.');
            const left = end - Date.now();
            if (left <= 0) return;
            report({ phase, left: Math.ceil(left / 1000), fraction: 1 - left / (s * 1000) });
            await sleep(Math.min(250, left));
          }
        },
      };
      r.say('sending');
      try {
        await go(a, ctx, r);
      } catch (err) {
        if (err instanceof Cancelled) throw err;
        const t = CRM.quick.TYPES[a.type];
        throw new Error(`Ação ${i + 1} (${t ? t.label : a.type}): ${err.message}`);
      }
    }
    if (q.id) await CRM.quick.countUse(q.id);
  }

  // ---------- Envio pela tela (com a faixa "Ação da Resposta Rápida") ----------
  // Os envios entram numa fila e saem um de cada vez, na ordem em que foram pedidos.
  const queue = [];
  let current = null;

  function send(q, ctx) {
    return new Promise((resolve) => {
      queue.push({ q, ctx, resolve });
      if (current) CRM.runBar.queued(queue.length);
      pump();
    });
  }

  async function pump() {
    if (current || !queue.length) return;
    current = queue.shift();
    const job = current;
    const run = {
      cancelled: false,
      onProgress: (p) => CRM.runBar.update({ ...p, title: job.q.title, queued: queue.length }),
    };
    job.run = run;
    CRM.runBar.show({ title: job.q.title, total: (job.q.actions || []).length, queued: queue.length });
    let ok = false;
    try {
      await execute(job.q, job.ctx, run);
      ok = true;
      CRM.ui.notice('Resposta rápida enviada');
    } catch (err) {
      if (err instanceof Cancelled) {
        CRM.ui.toast('Envio da resposta rápida cancelado.');
        CRM.wa.chatAction(job.ctx.chatId, 'paused').catch(() => {});
      } else {
        CRM.ui.toast('Falha ao enviar: ' + err.message, 'err');
      }
    } finally {
      current = null;
      if (!queue.length) CRM.runBar.hide();
      job.resolve(ok);
      pump();
    }
  }

  function cancel() {
    if (current && current.run) current.run.cancelled = true;
  }

  return { execute, fill, send, cancel, Cancelled, get busy() { return !!current; } };
})();
