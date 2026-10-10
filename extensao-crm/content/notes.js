// Anotações por contato: lista, criar e editar (com mídia opcional).
CRM.notes = (() => {
  const { esc, uid, formatDateTime } = CRM.util;
  const { icon, modal, toast, attachEmoji, textareaHTML } = CRM.ui;
  const store = CRM.store;

  async function countFor(chatId) {
    if (!chatId) return 0;
    return (await store.getNotes()).filter((n) => n.chatId === chatId).length;
  }

  async function openList() {
    const chat = CRM.wa.state.activeChat;
    if (!CRM.wa.state.ready || !chat) {
      modal(`<div class="modal-head"><h2 class="modal-title">Anotações</h2></div>
        <div class="empty"><p>${CRM.wa.state.ready ? 'Abra uma conversa para ver as anotações do contato.' : 'O WhatsApp Web ainda está carregando. Espere alguns segundos e tente de novo.'}</p></div>`);
      return;
    }
    const notes = (await store.getNotes()).filter((n) => n.chatId === chat.id).sort((a, b) => b.createdAt - a.createdAt);

    const body = notes.length
      ? `<div class="list">${notes
          .map(
            (n) => `<div class="item note-card">
          <div class="item-body">
            ${n.text ? `<div class="item-text">${esc(n.text)}</div>` : ''}
            ${n.mediaId ? `<div data-media="${n.id}" style="margin-top:6px"></div>` : ''}
            <div class="item-meta"><span>${esc(formatDateTime(n.createdAt))}</span>${n.updatedAt && n.updatedAt !== n.createdAt ? '<span>(editada)</span>' : ''}</div>
          </div>
          <div class="item-actions">
            <button class="icon-btn" data-edit="${n.id}" title="Editar">${icon('edit', 17)}</button>
            <button class="icon-btn danger" data-del="${n.id}" title="Excluir">${icon('trash', 17)}</button>
          </div>
        </div>`
          )
          .join('')}</div>
        <div class="center"><button class="btn" data-add>Criar anotação</button></div>`
      : `<div class="empty">
          <div class="empty-icon">${icon('notes', 24)}</div>
          <h3>Nenhuma nota encontrada</h3>
          <p>Parece que você ainda não adicionou nenhuma nota.<br>Clique no botão abaixo para criar uma nova nota.</p>
          <button class="btn" data-add>Criar anotação</button>
        </div>`;

    const el = modal(`<div class="modal-head"><h2 class="modal-title">Anotações</h2></div>${body}`, { wide: true });
    el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => openForm()));
    el.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => openForm(notes.find((n) => n.id === b.dataset.edit)))
    );
    el.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Excluir esta anotação?')) return;
        const n = notes.find((x) => x.id === b.dataset.del);
        await store.deleteNote(n.id);
        await store.deleteMedia(n.mediaId);
        openList();
      })
    );
    // Carrega as mídias depois, para a lista abrir rápido.
    for (const n of notes.filter((x) => x.mediaId)) {
      const box = el.querySelector(`[data-media="${n.id}"]`);
      const media = await store.getMedia(n.mediaId);
      if (box && media) box.innerHTML = mediaHTML(media);
    }
  }

  function mediaHTML(media) {
    const kind = CRM.util.mediaKind(media.mime);
    if (kind === 'image') return `<img class="thumb" src="${media.dataUrl}" alt="">`;
    if (kind === 'audio') return `<audio controls src="${media.dataUrl}"></audio>`;
    if (kind === 'video') return `<video class="thumb" controls src="${media.dataUrl}"></video>`;
    return `<a class="file-chip" href="${media.dataUrl}" download="${esc(media.name)}">${icon('file', 16)}<span>${esc(media.name)}</span>${icon('download', 15)}</a>`;
  }

  async function openForm(existing) {
    const chat = CRM.wa.state.activeChat;
    const editing = !!existing;
    const n = existing || {};
    let picked = null; // { dataUrl, name, mime }
    let removeStored = false;

    const el = modal(
      `<div class="modal-head"><h2 class="modal-title">${editing ? 'Editar anotação' : 'Criar anotação'}</h2></div>
      <div class="field">
        <div class="label" style="font-size:13.5px;color:#111b21">Adicione uma mídia na anotação</div>
        <div class="import-row">
          <button type="button" class="import-card" data-import>${icon('download', 22, 2)}Importar</button>
          <div class="drop" data-drop>Arraste o arquivo aqui.</div>
        </div>
        <input type="file" hidden data-file>
        <div data-preview></div>
      </div>
      <div class="field">
        <div class="label" style="font-size:13.5px;color:#111b21">Insira uma anotação</div>
        ${textareaHTML({ name: 'text', placeholder: 'Insira sua nota', value: n.text || '' })}
      </div>
      <div class="error-msg" data-error></div>
      <div class="actions"><button class="btn" data-cancel>Cancelar</button><button class="btn" data-save>Salvar</button></div>`
    );

    const area = el.querySelector('textarea');
    attachEmoji(el.querySelector('[data-emoji]'), area);
    const input = el.querySelector('[data-file]');
    const drop = el.querySelector('[data-drop]');
    const preview = el.querySelector('[data-preview]');
    const errorBox = el.querySelector('[data-error]');

    async function renderPreview() {
      let media = picked;
      if (!media && n.mediaId && !removeStored) media = await store.getMedia(n.mediaId);
      if (!media) {
        preview.innerHTML = '';
        return;
      }
      preview.innerHTML = `<div style="margin-top:8px">${mediaHTML(media)}</div>
        <button type="button" class="btn-outline" data-remove style="margin-top:8px">${icon('trash', 14)} Remover mídia</button>`;
      preview.querySelector('[data-remove]').addEventListener('click', () => {
        picked = null;
        removeStored = true;
        renderPreview();
      });
    }

    async function pick(file) {
      if (file.size > 60 * 1024 * 1024) return (errorBox.textContent = 'Arquivo muito grande (máximo 60 MB).');
      errorBox.textContent = '';
      picked = { dataUrl: await CRM.util.readFileAsDataURL(file), name: file.name, mime: file.type || 'application/octet-stream' };
      drop.textContent = file.name;
      renderPreview();
    }

    el.querySelector('[data-import]').addEventListener('click', () => input.click());
    input.addEventListener('change', () => input.files[0] && pick(input.files[0]));
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('over');
      if (e.dataTransfer.files[0]) pick(e.dataTransfer.files[0]);
    });

    el.querySelector('[data-cancel]').addEventListener('click', openList);
    el.querySelector('[data-save]').addEventListener('click', async () => {
      const text = area.value.trim();
      const keepsMedia = picked || (n.mediaId && !removeStored);
      if (!text && !keepsMedia) return (errorBox.textContent = 'Escreva a anotação ou adicione uma mídia.');
      if (!editing && !chat) return (errorBox.textContent = 'Abra uma conversa primeiro.');

      const note = {
        ...n,
        id: n.id || uid(),
        chatId: n.chatId || chat.id,
        chatName: n.chatName || chat.name || chat.pushname || '',
        text,
        createdAt: n.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      if (picked || removeStored) {
        await store.deleteMedia(n.mediaId);
        delete note.mediaId;
        delete note.mediaName;
        delete note.mediaMime;
      }
      if (picked) {
        note.mediaId = uid();
        note.mediaName = picked.name;
        note.mediaMime = picked.mime;
        await store.putMedia(note.mediaId, picked);
      }
      await store.upsertNote(note);
      toast(editing ? 'Anotação atualizada.' : 'Anotação salva.', 'ok');
      openList();
    });

    renderPreview();
  }

  return { openList, countFor };
})();
