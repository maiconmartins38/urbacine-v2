// Mensagens rápidas: por enquanto só o necessário para outras telas puxarem delas
// (seletor e um cadastro provisório). A tela completa vem numa próxima etapa.
CRM.quick = (() => {
  const { esc, uid } = CRM.util;
  const store = CRM.store;

  const list = () => store.get('quickReplies', []);

  async function get(id) {
    return (await list()).find((q) => q.id === id) || null;
  }

  function add(item) {
    return store.serialUpdate('quickReplies', [], (all) => {
      all.push(item);
      return all;
    });
  }

  // Seletor no mesmo estilo do "Selecionar mensagem rápida" do vídeo.
  function selectHTML({ name, label, selectedId, replies }) {
    const options = replies.length
      ? `<option value="">Selecione…</option>` +
        replies.map((q) => `<option value="${q.id}" ${q.id === selectedId ? 'selected' : ''}>${esc(q.title || q.text.slice(0, 60))}</option>`).join('')
      : `<option value="">Nenhuma mensagem rápida cadastrada</option>`;
    return `<div class="quick-card">
      <div class="label">${CRM.ui.icon('bolt', 14, 2)} ${label}</div>
      <select class="select" name="${name}" ${replies.length ? '' : 'disabled'}>${options}</select>
      <div class="quick-preview muted" data-preview-for="${name}"></div>
      <button type="button" class="link-btn" data-new-quick="${name}">+ Nova mensagem rápida</button>
    </div>`;
  }

  // Mostra o texto da mensagem escolhida embaixo do seletor.
  function bindPreview(root, replies) {
    root.querySelectorAll('.quick-card select').forEach((sel) => {
      const box = root.querySelector(`[data-preview-for="${sel.name}"]`);
      const show = () => {
        const q = replies.find((r) => r.id === sel.value);
        box.textContent = q ? q.text : '';
      };
      sel.addEventListener('change', show);
      show();
    });
  }

  // Cadastro provisório (título + texto) em cima da janela atual.
  function openQuickForm(onSaved) {
    const overlay = CRM.ui.subModal(`<div class="modal-head"><h2 class="modal-title">Nova mensagem rápida</h2></div>
      <div class="field"><div class="label">Título</div><input class="input" name="qtitle" placeholder="Ex.: Lembrete de renovação"></div>
      <div class="field"><div class="label">Mensagem ${CRM.ui.infoHTML('Use <b>{nome}</b> para colocar o primeiro nome do contato.')}</div>
        ${CRM.ui.textareaHTML({ name: 'qtext', placeholder: 'Insira sua mensagem' })}</div>
      <div class="muted" style="font-size:12px">Cadastro simples por enquanto. A tela completa de mensagens rápidas vem numa próxima etapa.</div>
      <div class="error-msg" data-qerror></div>
      <div class="actions"><button class="btn" data-qcancel>Cancelar</button><button class="btn" data-qsave>Salvar</button></div>`);
    const area = overlay.querySelector('textarea');
    CRM.ui.attachEmoji(overlay.querySelector('[data-emoji]'), area);
    overlay.querySelector('[data-qcancel]').addEventListener('click', () => overlay.closeSub());
    overlay.querySelector('[data-qsave]').addEventListener('click', async () => {
      const title = overlay.querySelector('[name="qtitle"]').value.trim();
      const text = area.value.trim();
      if (!text) return (overlay.querySelector('[data-qerror]').textContent = 'Escreva a mensagem.');
      const item = { id: uid(), title, text, createdAt: Date.now() };
      await add(item);
      overlay.closeSub();
      onSaved(item);
    });
  }

  return { list, get, selectHTML, bindPreview, openQuickForm };
})();
