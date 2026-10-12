// Mensagens rápidas: dados (respostas, categorias), tipos de ação e o seletor
// usado por outras telas (agendamento, renovação).
//
// Resposta rápida = { id, title, categoryId, actions: [ação...], uses, createdAt, updatedAt }
// Categoria       = { id, name, color }
CRM.quick = (() => {
  const { esc, uid } = CRM.util;
  const store = CRM.store;

  // ---------- Tipos de ação (mesmos grupos e nomes do vídeo) ----------
  const GROUPS = [
    {
      key: 'send', label: 'Enviar Mensagem', icon: 'msg',
      types: [
        ['text', 'Texto', 'text'], ['image', 'Imagem', 'image'], ['video', 'Vídeo', 'video'], ['audio', 'Áudio', 'mic'],
        ['document', 'Documentos', 'file'], ['pix', 'Pix', 'pix'], ['groupInvite', 'Convite para Grupo', 'group'],
        ['contact', 'Contato', 'contactCard'], ['linkBanner', 'Link com Banner', 'banner'], ['sticker', 'Figurinha', 'sticker'],
        ['list', 'Lista', 'list'],
      ],
    },
    { key: 'crm', label: 'Aba do CRM', icon: 'folderGo', types: [['tabAdd', 'Adicionar à aba', 'folderPlus'], ['tabRemove', 'Remover da aba', 'folderMinus']] },
    {
      key: 'timers', label: 'Temporizadores', icon: 'timer',
      types: [['wait', 'Esperar em segundos', 'clock'], ['typing', 'Exibir que está digitando', 'typing'], ['recording', 'Exibir que um áudio está sendo gravado', 'recDot']],
    },
    {
      key: 'utils', label: 'Utilitários', icon: 'grid',
      types: [
        ['archive', 'Arquivar Contato', 'archive'], ['unarchive', 'Desarquivar o contato', 'archive'], ['pin', 'Fixar Conversa', 'pin'],
        ['unpin', 'Desfixar Conversa', 'pin'], ['markUnread', 'Marcar como não lido', 'mailDot'], ['block', 'Bloquear Contato', 'block'],
      ],
    },
  ];
  const TYPES = {};
  GROUPS.forEach((g) => g.types.forEach(([key, label, icon]) => (TYPES[key] = { key, label, icon, group: g.key })));

  // ---------- Dados ----------
  // Respostas criadas na versão anterior (só título + texto) viram uma ação "Texto".
  function normalize(q) {
    if (!q) return q;
    if (!Array.isArray(q.actions)) q = { ...q, actions: q.text ? [{ type: 'text', text: q.text }] : [] };
    return q;
  }

  const list = async () => (await store.get('quickReplies', [])).map(normalize);
  const get = async (id) => (await list()).find((q) => q.id === id) || null;

  function save(item) {
    return store.serialUpdate('quickReplies', [], (all) => {
      const i = all.findIndex((q) => q.id === item.id);
      const next = { ...item, updatedAt: Date.now() };
      if (i >= 0) all[i] = next;
      else all.push({ ...next, createdAt: Date.now(), uses: 0 });
      return all;
    });
  }

  async function remove(id) {
    const q = await get(id);
    await store.serialUpdate('quickReplies', [], (all) => all.filter((x) => x.id !== id));
    if (q) for (const a of q.actions) if (a.mediaId) await store.deleteMedia(a.mediaId);
  }

  const countUse = (id) =>
    store.serialUpdate('quickReplies', [], (all) => all.map((q) => (q.id === id ? { ...q, uses: (q.uses || 0) + 1 } : q)));

  const categories = () => store.get('quickCategories', []);
  const saveCategory = (cat) =>
    store.serialUpdate('quickCategories', [], (all) => {
      const i = all.findIndex((c) => c.id === cat.id);
      if (i >= 0) all[i] = cat;
      else all.push(cat);
      return all;
    });
  async function removeCategory(id) {
    await store.serialUpdate('quickCategories', [], (all) => all.filter((c) => c.id !== id));
    await store.serialUpdate('quickReplies', [], (all) => all.map((q) => (q.categoryId === id ? { ...q, categoryId: null } : q)));
  }

  // Resumo de uma ação/resposta para listas e prévias.
  function actionSummary(a) {
    const t = TYPES[a.type];
    const label = t ? t.label : a.type;
    if (a.type === 'text') return (a.text || '').trim();
    if (['image', 'video', 'document', 'sticker', 'audio'].includes(a.type)) return `${label}: ${a.name || 'arquivo'}${a.caption ? ' — ' + a.caption : ''}`;
    if (['wait', 'typing', 'recording'].includes(a.type)) return `${label} (${a.seconds || 0}s)`;
    if (a.type === 'pix') return `Pix: ${a.key || ''}`;
    if (a.type === 'contact') return `Contato: ${a.name || ''} ${a.phone || ''}`;
    if (a.type === 'groupInvite') return `Convite: ${a.link || ''}`;
    if (a.type === 'linkBanner') return `Link: ${a.title || a.text || ''}`;
    if (a.type === 'list') return `Lista: ${a.title || a.description || ''}`;
    return label;
  }

  function summary(q) {
    const first = (q.actions || []).find((a) => TYPES[a.type] && TYPES[a.type].group === 'send') || (q.actions || [])[0];
    return first ? actionSummary(first) : 'Sem ações';
  }

  // Tipo "principal" (primeira mensagem enviada) para o ícone da lista e o filtro Por Tipo.
  function mainType(q) {
    const first = (q.actions || []).find((a) => TYPES[a.type] && TYPES[a.type].group === 'send') || (q.actions || [])[0];
    return first ? first.type : 'text';
  }

  // ---------- Seletor usado no agendamento e na renovação ----------
  function selectHTML({ name, label, selectedId, replies }) {
    const options = replies.length
      ? `<option value="">Selecione…</option>` +
        replies.map((q) => `<option value="${q.id}" ${q.id === selectedId ? 'selected' : ''}>${esc(q.title || summary(q).slice(0, 60))}</option>`).join('')
      : `<option value="">Nenhuma mensagem rápida cadastrada</option>`;
    return `<div class="quick-card">
      <div class="label">${CRM.ui.icon('bolt', 14, 2)} ${label}</div>
      <select class="select" name="${name}" ${replies.length ? '' : 'disabled'}>${options}</select>
      <div class="quick-preview muted" data-preview-for="${name}"></div>
      <button type="button" class="link-btn" data-new-quick="${name}">+ Nova mensagem rápida</button>
    </div>`;
  }

  function bindPreview(root, replies) {
    root.querySelectorAll('.quick-card select').forEach((sel) => {
      const box = root.querySelector(`[data-preview-for="${sel.name}"]`);
      const show = () => {
        const q = replies.find((r) => r.id === sel.value);
        box.textContent = q ? q.actions.map(actionSummary).join(' → ') : '';
      };
      sel.addEventListener('change', show);
      show();
    });
  }

  // Cadastro rápido (título + texto) a partir do agendamento/renovação.
  // Para mídia, áudio e outras ações, use o painel de Mensagens Rápidas.
  function openQuickForm(onSaved) {
    const overlay = CRM.ui.subModal(`<div class="modal-head"><h2 class="modal-title">Nova mensagem rápida</h2></div>
      <div class="field"><div class="label">Título</div><input class="input" name="qtitle" placeholder="Ex.: Lembrete de renovação"></div>
      <div class="field"><div class="label">Mensagem ${CRM.ui.infoHTML('Use <b>{nome}</b> para colocar o primeiro nome do contato.')}</div>
        ${CRM.ui.textareaHTML({ name: 'qtext', placeholder: 'Insira sua mensagem' })}</div>
      <div class="muted" style="font-size:12px">Aqui só dá para criar mensagem de texto. Para imagem, áudio, Pix e outras ações, use o painel de Mensagens Rápidas (⚡ na lateral direita).</div>
      <div class="error-msg" data-qerror></div>
      <div class="actions"><button class="btn" data-qcancel>Cancelar</button><button class="btn" data-qsave>Salvar</button></div>`);
    const area = overlay.querySelector('textarea');
    CRM.ui.attachEmoji(overlay.querySelector('[data-emoji]'), area);
    overlay.querySelector('[data-qcancel]').addEventListener('click', () => overlay.closeSub());
    overlay.querySelector('[data-qsave]').addEventListener('click', async () => {
      const title = overlay.querySelector('[name="qtitle"]').value.trim();
      const text = area.value.trim();
      if (!text) return (overlay.querySelector('[data-qerror]').textContent = 'Escreva a mensagem.');
      const item = { id: uid(), title: title || text.slice(0, 40), categoryId: null, actions: [{ type: 'text', text }] };
      await save(item);
      overlay.closeSub();
      onSaved(item);
    });
  }

  return {
    GROUPS, TYPES, list, get, save, remove, countUse, categories, saveCategory, removeCategory,
    actionSummary, summary, mainType, selectHTML, bindPreview, openQuickForm,
  };
})();
