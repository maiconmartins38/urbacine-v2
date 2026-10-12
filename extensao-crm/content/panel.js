// Painel da direita (como no vídeo), com só duas abas: Cadastro e Mensagens Rápidas.
// A aba Cadastro mostra e edita o MESMO cadastro do botão "Cadastro" da conversa.
CRM.panel = (() => {
  const { esc } = CRM.util;
  const { icon, toast, notice } = CRM.ui;
  const store = CRM.store;

  const P = 260; // largura do painel
  const TOP = CRM.layout.HEIGHT;

  let host = null;
  let shadow = null;
  let opener = null;
  let open = true;
  let tab = 'quick';
  let dirty = false; // há alteração não salva na aba Cadastro

  const CSS = `
    .panel { position: absolute; inset: 0; background: #fff; border-left: 1px solid #e3e6ea; display: flex; flex-direction: column; }
    .panel-head { display: flex; align-items: center; gap: 6px; padding: 8px 8px 6px; }
    .ptab, .pclose { width: 32px; height: 32px; border-radius: 9px; border: 0; background: #eef0f4; color: #54656f; display: grid; place-items: center; cursor: pointer; }
    .ptab:hover, .pclose:hover { background: #e2e6eb; }
    .ptab.on { background: var(--teal); color: #fff; }
    .pclose { margin-left: auto; }
    .panel-body { flex: 1; overflow: auto; padding: 4px 10px 14px; }
    .panel-body::-webkit-scrollbar { width: 6px; } .panel-body::-webkit-scrollbar-thumb { background: #d1d7db; border-radius: 3px; }
    .pc-photo { width: 76px; height: 76px; border-radius: 50%; margin: 8px auto 6px; display: grid; place-items: center; color: #fff; font-weight: 700; font-size: 24px; background: #8696a0 center/cover no-repeat; }
    .pc-phone { display: flex; justify-content: center; align-items: center; gap: 5px; font-size: 13px; color: #111b21; margin-bottom: 10px; }
    .pc-phone button { border: 0; background: none; color: #54656f; cursor: pointer; padding: 2px; border-radius: 4px; display: grid; }
    .pc-phone button:hover { color: var(--teal); background: #f0f2f5; }
    .pf { margin-bottom: 10px; }
    .pf-label { font-size: 13px; font-weight: 500; color: #111b21; margin-bottom: 4px; display: flex; gap: 5px; align-items: center; }
    .pf-box { display: flex; align-items: center; gap: 7px; background: #f0f2f5; border-radius: 8px; padding: 0 9px; color: #54656f; border: 1px solid transparent; }
    .pf-box:focus-within { border-color: var(--teal); background: #fff; }
    .pf-box input, .pf-box select, .pf-box textarea { border: 0; background: none; outline: none; font: inherit; font-size: 12.5px; color: var(--text); flex: 1; min-width: 0; height: 32px; }
    .pf-box textarea { height: 84px; padding: 8px 0; resize: vertical; }
    .pf-box.area { align-items: flex-start; } .pf-box.area svg { margin-top: 8px; }
    .pc-meta { color: var(--muted); font-size: 11.5px; text-align: center; margin-top: 8px; }
    .pc-save { width: 100%; margin-top: 4px; }
    .pc-tab { font-size: 12px; color: #3b4a54; display: flex; align-items: center; gap: 5px; margin: -2px 0 10px; }
    .cycle .row { display: block; }
    .cycle .quick-card { padding: 8px; }
    .p-empty { text-align: center; color: var(--muted); padding: 30px 10px; font-size: 13px; }
    .p-empty .empty-icon { color: var(--teal); display: grid; place-items: center; margin-bottom: 8px; }
    .opener { position: absolute; inset: 0; border: 0; background: var(--teal); color: #fff; border-radius: 10px 0 0 10px; display: grid; place-items: center; cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,.18); }
  `;

  function mount() {
    if (host) return;
    host = document.createElement('div');
    host.id = 'crm-ext-panel';
    host.style.cssText = `position:fixed;top:${TOP}px;right:0;bottom:0;width:${P}px;z-index:989;display:none;`;
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CRM.styles}${CSS}${CRM.quickPanel.CSS}</style><div class="root"><aside class="panel">
      <div class="panel-head">
        <button class="ptab" data-ptab="client" title="Cadastro">${icon('contactCard', 18)}</button>
        <button class="ptab" data-ptab="quick" title="Mensagens Rápidas">${icon('bolt', 18, 2)}</button>
        <button class="pclose" data-pclose title="Fechar painel">${icon('close', 16, 2)}</button>
      </div>
      <div class="panel-body" data-pbody></div>
    </aside></div>`;
    shadow.querySelectorAll('[data-ptab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.ptab)));
    shadow.querySelector('[data-pclose]').addEventListener('click', () => setOpen(false));
    CRM.ui.isolateEvents(host);
    document.body.appendChild(host);

    // Botão para reabrir o painel quando estiver fechado.
    opener = document.createElement('div');
    opener.id = 'crm-ext-panel-open';
    opener.style.cssText = `position:fixed;top:${TOP + 70}px;right:0;width:28px;height:44px;z-index:989;display:none;`;
    const os = opener.attachShadow({ mode: 'open' });
    os.innerHTML = `<style>${CRM.styles}${CSS}</style><div class="root" style="position:absolute;inset:0"><button class="opener" title="Abrir painel (Cadastro e Mensagens Rápidas)">${icon('bolt', 16, 2)}</button></div>`;
    os.querySelector('button').addEventListener('click', () => setOpen(true));
    document.body.appendChild(opener);
  }

  async function start() {
    const settings = await store.getSettings();
    open = settings.panelOpen !== false;
    tab = settings.panelTab || 'quick';
    mount();
    apply();
    CRM.wa.on('activeChat', () => {
      dirty = false;
      if (open && tab === 'client') render();
    });
    CRM.wa.on('ready', () => open && render());
    store.onChange((changes) => {
      if (!open) return;
      if (tab === 'client' && !dirty && (changes.clients || changes.tabs || changes.renewals)) render();
      if (tab === 'quick' && (changes.quickReplies || changes.quickCategories || changes.tabs)) CRM.quickPanel.onDataChange();
    });
  }

  function apply() {
    host.style.display = open ? 'block' : 'none';
    opener.style.display = open ? 'none' : 'block';
    CRM.layout.setRight(open ? P : 0);
    shadow.querySelectorAll('[data-ptab]').forEach((b) => b.classList.toggle('on', b.dataset.ptab === tab));
    if (open) render();
  }

  async function setOpen(value) {
    open = value;
    await store.saveSettings({ ...(await store.getSettings()), panelOpen: value });
    apply();
  }

  async function setTab(value) {
    if (tab === 'client' && dirty && value !== 'client' && !confirm('Há alterações não salvas no cadastro. Sair mesmo assim?')) return;
    tab = value;
    dirty = false;
    await store.saveSettings({ ...(await store.getSettings()), panelTab: value });
    apply();
  }

  // Raio ⚡ ao lado do campo de mensagem: mostra/esconde as Mensagens Rápidas.
  async function toggleQuick() {
    if (open && tab === 'quick') return setOpen(false);
    if (tab !== 'quick') {
      if (tab === 'client' && dirty && !confirm('Há alterações não salvas no cadastro. Sair mesmo assim?')) return;
      tab = 'quick';
      dirty = false;
    }
    open = true;
    await store.saveSettings({ ...(await store.getSettings()), panelOpen: true, panelTab: 'quick' });
    apply();
  }

  function body() {
    return shadow.querySelector('[data-pbody]');
  }

  function render() {
    if (tab === 'quick') return CRM.quickPanel.render(body());
    return renderClient();
  }

  // ---------- Aba Cadastro ----------
  async function renderClient() {
    const box = body();
    const chat = CRM.wa.state.activeChat;
    if (!chat) {
      box.innerHTML = `<div class="p-empty"><div class="empty-icon">${icon('contactCard', 26)}</div>Abra uma conversa para ver o cadastro do cliente.</div>`;
      return;
    }
    const c = (await CRM.clients.forChat(chat.id)) || null;
    const r = await CRM.renewals.forChat(chat.id);
    const cycle = await CRM.renewals.initialState(r);
    const current = await CRM.tabs.tabOf(chat.id, c && c.kanbanColumnId);
    const phone = (c && c.phone) || chat.phone || '';
    const name = c ? c.name : chat.name || chat.pushname || '';
    const initials = (String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();

    box.innerHTML = `
      <div class="pc-photo" data-photo>${esc(initials)}</div>
      <div class="pc-phone">${icon('user', 13, 2)} <span>${esc(phone || 'sem número')}</span>${phone ? `<button data-copy title="Copiar número">${icon('copy', 14)}</button>` : ''}</div>
      <div class="pf"><div class="pf-label">Nome do cliente</div><div class="pf-box">${icon('user', 15)}<input name="name" placeholder="Nome do cliente" value="${esc(name)}"></div></div>
      <div class="pf"><div class="pf-label">Telefone</div><div class="pf-box">${icon('contactCard', 15)}<input name="phone" placeholder="Telefone" value="${esc(CRM.clients.formatPhone(phone))}"></div></div>
      <div class="pf"><div class="pf-label">Valor (lucro)</div><div class="pf-box">${icon('money', 15)}<input name="value" inputmode="decimal" placeholder="R$ 0,00" value="${c && c.valueCents != null ? esc(CRM.clients.formatMoney(c.valueCents)) : ''}"></div></div>
      <div class="pc-tab">${icon('folderGo', 14)} Aba: <b>${esc(current ? current.name : 'nenhuma')}</b></div>
      <div class="pf"><div class="pf-label">Descrição</div><div class="pf-box area">${icon('notes', 15)}<textarea name="description" placeholder="Escreva livremente (ex.: nomes dos servidores)">${esc((c && c.description) || '')}</textarea></div></div>
      ${CRM.renewals.fieldsHTML({ compact: true, stage: await CRM.renewals.stageText(r) })}
      <div class="error-msg" data-perr style="min-height:0"></div>
      <button class="btn pc-save" data-psave>${c ? 'Salvar' : 'Cadastrar'}</button>
      <div class="pc-meta">${c ? 'Cadastrado em ' + esc(CRM.util.formatDateTime(c.createdAt)) : 'Este contato ainda não tem cadastro.'}</div>`;

    const field = (n) => box.querySelector(`[name="${n}"]`);
    box.querySelectorAll('input, textarea, select').forEach((el) => el.addEventListener('input', () => (dirty = true)));
    const cycleFields = await CRM.renewals.bindFields(box, cycle, () => (dirty = true));
    field('value').addEventListener('blur', () => {
      const cents = CRM.clients.parseMoney(field('value').value);
      if (cents != null) field('value').value = CRM.clients.formatMoney(cents);
    });
    const copy = box.querySelector('[data-copy]');
    if (copy)
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(phone);
          notice('Número copiado');
        } catch (_) {
          toast('Não consegui copiar o número.', 'err');
        }
      });
    box.querySelector('[data-psave]').addEventListener('click', async () => {
      const err = box.querySelector('[data-perr]');
      const result = await CRM.clients.saveAll(chat.id, {
        name: field('name').value.trim(),
        phone: field('phone').value.replace(/\D/g, ''),
        description: field('description').value.trim(),
        valueText: field('value').value.trim(),
      }, cycle, r, cycleFields);
      if (result.cancelled) return;
      if (result.error) return (err.textContent = result.error);
      dirty = false;
      notice(c ? 'Cadastro atualizado' : 'Cliente cadastrado');
      renderClient();
    });

    // Foto do perfil do WhatsApp (se tiver).
    CRM.wa.getProfilePic(chat.id).then((url) => {
      const photo = box.querySelector('[data-photo]');
      if (url && photo && CRM.wa.state.activeChat && CRM.wa.state.activeChat.id === chat.id) {
        photo.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
        photo.textContent = '';
      }
    }).catch(() => {});
  }

  return {
    start, toggleQuick, rerender: () => open && render(),
    get root() { return shadow; },
    get quickOpen() { return open && tab === 'quick'; },
    WIDTH: P,
  };
})();
