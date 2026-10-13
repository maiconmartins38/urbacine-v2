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

  // Arrastar e soltar: muda a categoria e coloca a resposta antes de beforeId (ou depois de
  // afterId). Sem vizinhos, vai para o fim da categoria. A ordem da lista é a ordem guardada.
  const move = (id, { categoryId, beforeId, afterId }) =>
    store.serialUpdate('quickReplies', [], (all) => {
      const i = all.findIndex((q) => q.id === id);
      if (i < 0) return all;
      const [item] = all.splice(i, 1);
      item.categoryId = categoryId || null;
      let at = beforeId ? all.findIndex((q) => q.id === beforeId) : -1;
      if (at < 0 && afterId) {
        at = all.findIndex((q) => q.id === afterId);
        if (at >= 0) at += 1;
      }
      if (at < 0) {
        at = all.length;
        all.forEach((q, k) => {
          if ((q.categoryId || null) === item.categoryId) at = k + 1;
        });
      }
      all.splice(at, 0, item);
      return all;
    });

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

  // ---------- Seletor usado no agendamento, no cadastro, no Renovado e no Remarketing ----------
  // Campo de busca: vai digitando e aparecem as mensagens que começam com o texto (primeiro)
  // ou que têm o texto no nome. Por baixo fica um <select> escondido, que guarda o valor e
  // avisa as telas com o evento "change" (como antes).
  // emptyLabel: opção vazia (ex.: "Não enviar mensagem"); sem ela, é preciso escolher uma.
  function selectHTML({ name, label, selectedId, replies, emptyLabel = '' }) {
    const options = `<option value="">${esc(emptyLabel || 'Selecione…')}</option>` +
      replies.map((q) => `<option value="${q.id}" ${q.id === selectedId ? 'selected' : ''}>${esc(q.title || summary(q).slice(0, 60))}</option>`).join('');
    return `<div class="quick-card">
      <div class="label">${CRM.ui.icon('bolt', 14, 2)} ${label}</div>
      <div class="qsel" data-qsel="${name}" ${emptyLabel ? `data-empty="${esc(emptyLabel)}"` : ''}>
        <span class="qsel-ico">${CRM.ui.icon('search', 14, 2)}</span>
        <input class="input qsel-input" autocomplete="off" spellcheck="false" ${replies.length ? '' : 'disabled'}
          placeholder="${replies.length ? 'Digite para procurar (ex.: M, 35)…' : 'Nenhuma mensagem rápida cadastrada'}">
        <button type="button" class="qsel-eye" data-eye-for="${name}" tabindex="-1" title="Ver o que está escrito">${CRM.ui.icon('eye2', 15)}</button>
        <button type="button" class="qsel-btn" tabindex="-1" title="Ver todas">${CRM.ui.icon('chevDown', 14, 2.2)}</button>
      </div>
      <select class="select qsel-native" name="${name}" tabindex="-1" aria-hidden="true" ${replies.length ? '' : 'disabled'}>${options}</select>
      <div class="quick-preview muted" data-preview-for="${name}" hidden></div>
      <button type="button" class="link-btn" data-new-quick="${name}">+ Nova mensagem rápida</button>
    </div>`;
  }

  const plainText = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Liga a prévia e a busca de cada seletor dentro de "root".
  // O campo mostra só o título; o que está escrito aparece ao clicar no olho (e some ao clicar de novo).
  function bindPreview(root, replies) {
    const catsPromise = categories();
    root.querySelectorAll('.quick-card select').forEach((sel) => {
      const box = root.querySelector(`[data-preview-for="${sel.name}"]`);
      const eye = root.querySelector(`[data-eye-for="${sel.name}"]`);
      const show = () => {
        const q = replies.find((r) => r.id === sel.value);
        box.textContent = q ? q.actions.map(actionSummary).join(' → ') : '';
        if (eye) eye.disabled = !q;
        if (!q) box.hidden = true;
        if (eye) eye.classList.toggle('on', !box.hidden);
      };
      if (eye) eye.addEventListener('click', () => {
        box.hidden = !box.hidden || !box.textContent;
        eye.classList.toggle('on', !box.hidden);
      });
      sel.addEventListener('change', show);
      show();
      const combo = sel.parentNode.querySelector(`[data-qsel="${sel.name}"]`);
      if (combo) catsPromise.then((cats) => enhance(combo, sel, replies, cats));
    });
  }

  function enhance(combo, sel, replies, cats) {
    const input = combo.querySelector('.qsel-input');
    const emptyLabel = combo.dataset.empty || '';
    const titleOf = (q) => q.title || summary(q).slice(0, 60);
    const catOf = (q) => cats.find((c) => c.id === q.categoryId);
    let list = null;
    let items = [];
    let active = 0;

    const current = () => replies.find((q) => q.id === sel.value);
    const syncInput = () => {
      const q = current();
      input.value = q ? titleOf(q) : '';
      input.placeholder = !replies.length ? 'Nenhuma mensagem rápida cadastrada' : emptyLabel && !q ? emptyLabel + ' (ou digite para procurar)' : 'Digite para procurar (ex.: M, 35)…';
    };

    function close() {
      if (list) list.remove();
      list = null;
      delete input.dataset.listOpen;
      document.removeEventListener('mousedown', outside, true);
    }
    function outside(e) {
      const path = e.composedPath();
      if (!path.includes(combo) && !(list && path.includes(list))) {
        close();
        syncInput();
      }
    }

    // Começa com o texto vem primeiro; depois as que têm o texto em qualquer parte do nome.
    function matches(term) {
      const t = plainText(term).trim();
      if (!t) return replies.slice();
      const starts = [];
      const has = [];
      replies.forEach((q) => {
        const name = plainText(titleOf(q));
        if (name.startsWith(t) || name.split(/\s+/).some((w) => w.startsWith(t))) starts.push(q);
        else if (name.includes(t)) has.push(q);
      });
      return starts.concat(has);
    }

    function choose(id) {
      sel.value = id;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      close();
      syncInput();
    }

    function render(term) {
      const found = matches(term);
      // "Não enviar" só aparece com o campo vazio (digitando, o Enter pega a primeira mensagem achada).
      items = (emptyLabel && !plainText(term).trim() ? [{ id: '', empty: true }] : []).concat(found);
      active = Math.min(active, Math.max(0, items.length - 1));
      if (!list) {
        list = document.createElement('div');
        list.className = 'qsel-list';
        // Dentro da janela (para ficar por cima dela) ou do painel.
        (combo.closest('.modal') || combo.getRootNode().querySelector('.root')).appendChild(list);
        input.dataset.listOpen = '1'; // Esc fecha só a lista, não a janela
        list.addEventListener('mousedown', (e) => e.preventDefault()); // não tira o foco do campo
        list.addEventListener('click', (e) => {
          const it = e.target.closest('[data-qid]');
          if (it) choose(it.dataset.qid);
        });
        document.addEventListener('mousedown', outside, true);
      }
      const t = plainText(term).trim();
      const mark = (text) => {
        if (!t) return esc(text);
        const i = plainText(text).indexOf(t);
        return i < 0 ? esc(text) : esc(text.slice(0, i)) + '<b>' + esc(text.slice(i, i + t.length)) + '</b>' + esc(text.slice(i + t.length));
      };
      list.innerHTML = items.length
        ? items.map((q, i) => q.empty
          ? `<div class="qsel-item muted ${i === active ? 'on' : ''}" data-qid="">${esc(emptyLabel)}</div>`
          : `<div class="qsel-item ${i === active ? 'on' : ''} ${q.id === sel.value ? 'sel' : ''}" data-qid="${q.id}">
              <span class="qsel-name">${mark(titleOf(q))}</span>
              ${catOf(q) ? `<span class="qsel-cat" style="color:${esc(catOf(q).color)}">${esc(catOf(q).name)}</span>` : ''}</div>`).join('')
        : '<div class="qsel-none">Nenhuma mensagem rápida encontrada</div>';
      place();
      const on = list.querySelector('.qsel-item.on');
      if (on) on.scrollIntoView({ block: 'nearest' });
    }

    // Abre embaixo do campo (ou em cima, se não couber) sem ser cortada pela janela.
    function place() {
      const r = input.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - 8;
      const above = r.top - 8;
      const up = below < 180 && above > below;
      list.style.left = r.left + 'px';
      list.style.width = r.width + 'px';
      list.style.maxHeight = Math.min(260, up ? above : below) + 'px';
      list.style.top = up ? '' : r.bottom + 4 + 'px';
      list.style.bottom = up ? window.innerHeight - r.top + 4 + 'px' : '';
    }

    input.addEventListener('focus', () => {
      input.select();
      active = 0;
      render('');
    });
    input.addEventListener('input', () => {
      active = 0;
      render(input.value);
    });
    input.addEventListener('keydown', (e) => {
      if (!list && (e.key === 'ArrowDown' || e.key === 'Enter')) return render(input.value);
      if (!list) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(1, items.length);
        render(input.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[active]) choose(items[active].id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        syncInput();
      } else if (e.key === 'Tab') {
        close();
        syncInput();
      }
    });
    combo.querySelector('.qsel-btn').addEventListener('click', () => {
      if (list) {
        close();
        syncInput();
      } else input.focus();
    });
    input.addEventListener('qsel-close', () => {
      close();
      syncInput();
    });
    sel.addEventListener('change', syncInput);
    syncInput();
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
    GROUPS, TYPES, list, get, save, remove, move, countUse, categories, saveCategory, removeCategory,
    actionSummary, summary, mainType, selectHTML, bindPreview, openQuickForm,
  };
})();
