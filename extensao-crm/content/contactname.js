// "Salvar contato": ícone ao lado do nome no topo da conversa. Abre a janela para
// salvar (ou remover) o nome do contato na agenda e ligar o salvamento automático.
CRM.contactName = (() => {
  const { esc } = CRM.util;
  const { icon, modal, toast, notice } = CRM.ui;
  const store = CRM.store;

  let host = null;

  function mount() {
    host = document.createElement('div');
    host.id = 'crm-ext-name';
    host.style.cssText = 'position:fixed;z-index:995;display:none;';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CRM.styles}
      .name-btn { border: 0; background: none; color: #54656f; width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center; cursor: pointer; }
      .name-btn:hover { background: rgba(11, 20, 26, .08); color: var(--teal); }
    </style><div class="root"><button class="name-btn" title="Salvar contato">${icon('userEdit', 17, 2)}</button></div>`;
    shadow.querySelector('button').addEventListener('click', openModal);
    CRM.ui.isolateEvents(host);
    document.body.appendChild(host);
  }

  // Nome do contato no cabeçalho da conversa aberta.
  function findNameEl() {
    const main = document.getElementById('main');
    let header = main && main.querySelector('header');
    if (!header) {
      header = [...document.querySelectorAll('header')].find((h) => {
        const r = h.getBoundingClientRect();
        return r.width > 0 && r.left > window.innerWidth * 0.2 && r.top < 160;
      });
    }
    if (!header) return null;
    return [...header.querySelectorAll('span[dir="auto"]')].find((s) => s.textContent.trim() && s.getBoundingClientRect().width > 0) || null;
  }

  // Coloca o ícone logo depois do fim do nome.
  function place() {
    if (!host || !host.isConnected) mount();
    const chat = CRM.wa.state.activeChat;
    const nameEl = chat && !chat.isGroup ? findNameEl() : null;
    if (!nameEl) {
      host.style.display = 'none';
      return;
    }
    const box = nameEl.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(nameEl);
    const text = range.getBoundingClientRect();
    const right = Math.min(text.right || box.right, box.right);
    host.style.display = 'block';
    host.style.left = Math.round(right + 6) + 'px';
    host.style.top = Math.round(box.top + box.height / 2 - 12) + 'px';
  }

  async function openModal() {
    const chat = CRM.wa.state.activeChat;
    if (!CRM.wa.state.ready || !chat) return toast('Abra uma conversa primeiro.', 'err');
    let contact = { name: '', pushname: '', isMyContact: false };
    try {
      contact = await CRM.wa.getContact(chat.id);
    } catch (_) {
      // segue com o nome da conversa
    }
    const settings = await store.getSettings();
    const client = await CRM.clients.forChat(chat.id);
    const current = contact.name || (client && client.name) || contact.pushname || chat.name || '';

    const el = modal(`<div class="modal-head"><h2 class="modal-title">Salvar contato</h2></div>
      <p class="confirm-text" style="font-size:13.5px;margin-top:-4px">Salve o nome do contato ou adicione a opção de salvamento automático caso o contato tenha um nome</p>
      <div class="field" style="margin-top:12px"><div class="label">Insira um nome para o contato</div>
        <input class="input" name="cname" maxlength="80" value="${esc(current)}"></div>
      <div class="switch-row">
        <span class="label" style="margin:0;font-size:13px;color:#111b21">Salvar contatos automaticamente ${CRM.ui.infoHTML('Quando ligado, quem mandar mensagem e ainda não estiver salvo na sua agenda é salvo automaticamente com o nome do perfil do WhatsApp.')}</span>
        <button type="button" class="switch ${settings.autoSaveContacts ? 'on' : ''}" data-auto title="Ligar/desligar"></button>
      </div>
      <div class="error-msg" data-error></div>
      <div class="actions"><button class="btn" data-remove ${contact.isMyContact ? '' : 'disabled title="Este contato ainda não está salvo"'}>Remover nome</button><button class="btn" data-save>Salvar nome do contato</button></div>`);

    const input = el.querySelector('[name="cname"]');
    const errorBox = el.querySelector('[data-error]');
    input.focus();
    input.select();

    el.querySelector('[data-auto]').addEventListener('click', async (e) => {
      const on = !e.currentTarget.classList.contains('on');
      e.currentTarget.classList.toggle('on', on);
      await store.saveSettings({ ...(await store.getSettings()), autoSaveContacts: on });
      CRM.wa.setAutoSave(on).catch(() => {});
      notice(on ? 'Salvamento automático ligado' : 'Salvamento automático desligado');
    });

    const save = async () => {
      const name = input.value.trim();
      if (!name) return (errorBox.textContent = 'Escreva o nome do contato.');
      errorBox.textContent = 'Salvando…';
      try {
        await CRM.wa.saveContact(chat.id, name);
        // O nome vai junto para o Cadastro do cliente (se ele tiver cadastro).
        if (client && client.name !== name) {
          await store.updateClients((list) => list.map((c) => (c.chatId === chat.id ? { ...c, name, updatedAt: Date.now() } : c)));
          await store.updateRenewals((list) => list.map((r) => (r.chatId === chat.id ? { ...r, chatName: name } : r)));
          await store.updateSchedules((list) => list.map((s) => (s.renewalId && s.chatId === chat.id ? { ...s, chatName: name } : s)));
        }
        CRM.ui.closeModal();
        notice(client ? 'Contato salvo (cadastro atualizado)' : 'Contato salvo');
        CRM.wa.refreshActiveChat();
      } catch (err) {
        errorBox.textContent = 'Não consegui salvar: ' + err.message;
      }
    };
    el.querySelector('[data-save]').addEventListener('click', save);
    input.addEventListener('keydown', (e) => e.key === 'Enter' && save());

    el.querySelector('[data-remove]').addEventListener('click', async () => {
      if (!confirm('Remover o nome deste contato? Ele também sai da agenda do celular.')) return;
      try {
        await CRM.wa.removeContact(chat.id);
        CRM.ui.closeModal();
        notice('Nome do contato removido');
        CRM.wa.refreshActiveChat();
      } catch (err) {
        errorBox.textContent = 'Não consegui remover: ' + err.message;
      }
    });
  }

  // Liga o salvamento automático na ponte quando o WhatsApp termina de carregar.
  CRM.wa.on('ready', async () => {
    const settings = await store.getSettings();
    if (settings.autoSaveContacts) CRM.wa.setAutoSave(true).catch(() => {});
  });
  CRM.wa.on('contactAutoSaved', (info) => info && notice('Contato salvo automaticamente: ' + info.name));

  return { place };
})();
