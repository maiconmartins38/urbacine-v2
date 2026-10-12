// Janela "Configurações" (engrenagem no fim do menu da esquerda), como no vídeo.
// Por enquanto só o menu "Geral", com os três botões de backup. O importar já funciona;
// "Criar backup" e "Backup automático" ainda são só a interface.
CRM.settings = (() => {
  const { esc, formatDateTime } = CRM.util;
  const { icon, toast, notice } = CRM.ui;

  const svg = (inner, size = 17) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const CLOUD = '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 17.8 8a4.3 4.3 0 0 1-.3 8.6"/><path d="M14.5 13.5a3 3 0 1 0-.9 2.6"/><path d="M14.8 11.2v2.4h-2.4"/>';
  const LOCK = '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>';

  const CSS = `
    .layer:has(> .modal.st-win) { background: rgba(11, 20, 26, .45); pointer-events: auto; }
    .modal.st-win { width: 880px; height: min(620px, calc(100vh - 40px)); padding: 0; display: flex; flex-direction: column; overflow: hidden; }
    .st-head { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-bottom: 1px solid #eef0f2; flex: none; }
    .st-logo { width: 34px; height: 34px; border-radius: 9px; background: var(--teal-soft); color: var(--teal); display: grid; place-items: center; }
    .st-head b { font-size: 15.5px; }
    .st-sep { width: 1px; height: 18px; background: #d1d7db; }
    .st-crumb { color: var(--muted); font-size: 14px; }
    .st-body { flex: 1; display: flex; min-height: 0; }
    .st-nav { width: 180px; padding: 12px 10px; border-right: 1px solid #eef0f2; flex: none; }
    .st-nav-item { display: flex; align-items: center; gap: 9px; width: 100%; border: 0; background: none; border-radius: 8px; padding: 8px 10px;
      font-size: 13px; color: #3b4a54; text-align: left; }
    .st-nav-item.on { background: #eef0f3; color: var(--teal); font-weight: 600; }
    .st-main { flex: 1; background: #f4f5f7; overflow: auto; padding: 18px 56px 14px; display: flex; flex-direction: column; }
    .st-card { background: #fff; border-radius: 10px; box-shadow: 0 1px 3px rgba(11, 20, 26, .07); padding: 6px 0; margin-bottom: 12px; }
    .st-pad { padding: 14px 16px; }
    .st-row { display: flex; align-items: center; gap: 12px; width: 100%; border: 0; background: none; padding: 9px 14px; font-size: 13px; color: #111b21; text-align: left; }
    .st-row:hover { background: #f5f6f8; }
    .st-ico { width: 28px; height: 28px; border-radius: 7px; background: #f0f2f5; color: #54656f; display: grid; place-items: center; flex: none; }
    .st-row .st-soon { margin-left: auto; font-size: 11px; color: var(--muted); }
    .st-foot { margin-top: auto; display: flex; justify-content: space-between; color: var(--muted); font-size: 11.5px; padding-top: 8px; }
    .st-sub { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14.5px; margin-bottom: 12px; }
    .st-back { border: 0; background: none; color: var(--teal); width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; }
    .st-back:hover { background: var(--teal-soft); }
    .st-drop { display: flex; flex-direction: column; align-items: center; gap: 4px; border: 1.5px dashed #b9c3c9; border-radius: 10px; padding: 18px; cursor: pointer;
      color: #3b4a54; text-align: center; font-size: 12.5px; }
    .st-drop:hover, .st-drop.over { border-color: var(--teal); background: #f6fbfa; }
    .st-drop .big { color: var(--teal); }
    .st-drop b { font-size: 13.5px; color: #111b21; }
    .st-box { border-radius: 9px; padding: 11px 13px; margin-top: 12px; font-size: 12.5px; line-height: 1.45; }
    .st-box.warn { background: #fff8e6; border: 1px solid #f3d38a; }
    .st-box.err { background: #fdecec; border: 1px solid #f2b8b5; }
    .st-box.ok { background: #eaf7f4; border: 1px solid #b7e1d9; }
    .st-box h4 { margin: 0 0 6px; font-size: 13.5px; display: flex; align-items: center; gap: 6px; }
    .st-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12.5px; }
    .st-table td { padding: 6px 4px; border-bottom: 1px solid #eef0f2; vertical-align: top; }
    .st-table td.n { text-align: right; font-weight: 700; white-space: nowrap; }
    .st-table .sample { color: var(--muted); font-size: 11.5px; }
    .st-tag { display: inline-block; font-size: 10.5px; font-weight: 700; border-radius: 9px; padding: 1px 7px; background: #f3d38a; color: #6b4e00; }
    .st-radios { display: flex; flex-direction: column; gap: 6px; margin: 12px 0 4px; font-size: 12.5px; }
    .st-radios label { display: flex; align-items: center; gap: 7px; cursor: pointer; }
    .st-line { display: flex; gap: 8px; margin-top: 8px; }
    .st-line .input { flex: 1; }
    .st-steps { margin: 6px 0 0 18px; padding: 0; } .st-steps li { margin-bottom: 4px; }
    .st-code { font-family: Consolas, monospace; background: #fff; border: 1px solid #e3e6ea; border-radius: 6px; padding: 5px 7px; display: block; margin: 4px 0; font-size: 11.5px; user-select: all; word-break: break-all; }
    .st-paste { width: 100%; min-height: 70px; margin-top: 8px; }
    .st-center { display: flex; justify-content: center; margin-top: 14px; gap: 10px; }
  `;

  let el = null;
  let main = null;

  function open() {
    el = CRM.ui.modal(`<style>${CSS}</style>
      <div class="st-head"><span class="st-logo">${icon('gear', 18)}</span><b>Configurações</b><span class="st-sep"></span><span class="st-crumb">Geral</span></div>
      <div class="st-body">
        <nav class="st-nav"><button class="st-nav-item on">${icon('gear', 15)} Geral</button></nav>
        <main class="st-main" data-main></main>
      </div>`);
    el.classList.add('st-win');
    main = el.querySelector('[data-main]');
    drawGeneral();
  }

  function footHTML() {
    return `<div class="st-foot"><span></span><span>Versão ${esc(chrome.runtime.getManifest().version)}</span></div>`;
  }

  // ---------- Geral ----------
  function drawGeneral() {
    main.innerHTML = `
      <div class="st-card">
        <button class="st-row" data-act="create"><span class="st-ico">${icon('download', 15, 2)}</span>Criar backup do sistema</button>
        <button class="st-row" data-act="import"><span class="st-ico">${icon('upload', 15, 2)}</span>Importar backup do sistema</button>
        <button class="st-row" data-act="auto"><span class="st-ico">${svg(CLOUD, 16)}</span>Backup automático</button>
      </div>
      ${footHTML()}`;
    main.onclick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'import') return drawImport();
      const name = b.dataset.act === 'create' ? 'Criar backup do sistema' : 'Backup automático';
      toast(`"${name}": a tela já está aqui; a função será ligada quando você me mostrar como deve funcionar.`);
    };
  }

  // ---------- Importar ----------
  function drawImport() {
    main.innerHTML = `
      <div class="st-card st-pad">
        <div class="st-sub"><button class="st-back" data-back title="Voltar">${icon('back', 17, 2.2)}</button>Importar backup do sistema</div>
        <label class="st-drop" data-drop>
          <span class="big">${icon('upload', 26, 2)}</span>
          <b>Escolher o arquivo de backup</b>
          <span>Clique aqui ou arraste o arquivo (.json)</span>
          <input type="file" accept=".json,application/json,text/plain" hidden data-file>
        </label>
        <div data-result></div>
      </div>
      ${footHTML()}`;
    const drop = main.querySelector('[data-drop]');
    const input = main.querySelector('[data-file]');
    input.addEventListener('change', () => input.files[0] && readFile(input.files[0]));
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('over');
      if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
    });
    main.onclick = (e) => {
      if (e.target.closest('[data-back]')) drawGeneral();
    };
  }

  const result = () => main.querySelector('[data-result]');

  async function readFile(file) {
    if (file.size > 200 * 1024 * 1024) return showError('Arquivo grande demais (máximo 200 MB).');
    result().innerHTML = `<div class="st-box">Lendo <b>${esc(file.name)}</b>…</div>`;
    let text;
    try {
      text = await file.text();
    } catch (err) {
      return showError('Não consegui ler o arquivo: ' + err.message);
    }
    handle(text, file.name);
  }

  function showError(msg) {
    result().innerHTML = `<div class="st-box err"><h4>${icon('info', 15, 2)} Não deu para importar</h4>${esc(msg)}</div>`;
  }

  async function handle(text, name) {
    const p = CRM.backup.parse(text);
    if (p.format === 'unknown') return showError(`${p.reason} Escolha o arquivo .json do backup.`);
    if (p.format === 'crm') return showCRM(p.backup, name);
    if (p.format === 'locked') return showLocked(p, name);
    return showForeign(p.obj, name, false);
  }

  // Backup desta extensão.
  function showCRM(backup, name) {
    const rows = CRM.backup.summaryCRM(backup);
    result().innerHTML = `<div class="st-box ok">
        <h4>${icon('checkCircle', 15)} Backup desta extensão reconhecido</h4>
        <b>${esc(name)}</b>${backup.createdAt ? ` · criado em ${esc(formatDateTime(backup.createdAt))}` : ''}${backup.version ? ` · versão ${esc(backup.version)}` : ''}
        <table class="st-table">${rows.map((r) => `<tr><td>${esc(r.label)}</td><td class="n">${r.count}</td></tr>`).join('')}</table>
        <div class="st-radios">
          <label><input type="radio" name="mode" value="merge" checked> Somar ao que já existe (recomendado)</label>
          <label><input type="radio" name="mode" value="replace"> Substituir tudo pelo que está no backup</label>
        </div>
        <div class="st-center"><button class="btn" data-go>Importar</button></div>
      </div>`;
    result().querySelector('[data-go]').onclick = async (e) => {
      const mode = result().querySelector('[name="mode"]:checked').value;
      if (mode === 'replace' && !confirm('Substituir os dados atuais pelos do backup? O que não estiver no backup será apagado dessas listas.')) return;
      e.target.disabled = true;
      try {
        await CRM.backup.importCRM(backup, mode);
        done(rows.filter((r) => r.key !== 'settings').map((r) => `${r.count} ${r.label.toLowerCase()}`));
      } catch (err) {
        showError(err.message);
      }
    };
  }

  // Backup de outra ferramenta, trancado.
  async function showLocked(p, name) {
    const box = result();
    box.innerHTML = `<div class="st-box">Analisando <b>${esc(name)}</b>…</div>`;
    // Tenta sozinho com o número do WhatsApp conectado (algumas ferramentas usam ele como chave).
    const tried = [];
    try {
      const me = await CRM.wa.me();
      if (me && me.user) tried.push(me.user, '+' + me.user, me.id);
    } catch (_) {
      // sem número; segue só com a senha digitada
    }
    const opened = tried.length ? await CRM.backup.unlockAll(p.obj, tried) : null;
    if (opened) return showForeign(opened.data, name, true);
    box.innerHTML = `<div class="st-box warn">
        <h4>${svg(LOCK, 15)} Este backup é de outra ferramenta e está trancado</h4>
        Reconheci o arquivo <b>${esc(name)}</b>, mas as partes dele estão <b>criptografadas</b> pela ferramenta que gerou
        (padrão AES com senha). Sem a senha/chave dela não dá para ler o conteúdo — nenhuma extensão consegue.
        <table class="st-table">${p.sections.map((s) => `<tr><td>${esc(s.label)}</td><td class="n">${s.locked ? '<span class="st-tag">trancado</span>' : 'aberto'}</td></tr>`).join('')}</table>
        ${tried.length ? '<div style="margin-top:8px">Já tentei abrir com o número do seu WhatsApp e não abriu.</div>' : ''}
        <div style="margin-top:10px"><b>1) Tem a senha/chave desse backup?</b> Coloque aqui:</div>
        <div class="st-line"><input class="input" type="password" data-pass placeholder="Senha ou chave do backup"><button class="btn" data-try>Tentar abrir</button></div>
        <div class="error-msg" data-perr></div>
        <div style="margin-top:12px"><b>2) Sem senha:</b> copie os dados abertos direto da outra extensão e cole aqui embaixo.</div>
        <ol class="st-steps">
          <li>Abra uma aba nova em <span class="st-code" style="display:inline;padding:1px 5px">chrome://extensions</span> e ligue o <b>Modo do desenvolvedor</b> (canto de cima, à direita).</li>
          <li>No cartão da outra ferramenta, clique no link azul <b>service worker</b> (ou "página de plano de fundo"). Abre uma janela de ferramentas.</li>
          <li>Clique na aba <b>Console</b>, cole este comando e aperte Enter (se o Chrome pedir, digite <b>allow pasting</b> antes):
            <code class="st-code">copy(JSON.stringify(await chrome.storage.local.get(null)))</code></li>
          <li>Volte aqui, clique no campo abaixo e aperte <b>Ctrl+V</b>.</li>
        </ol>
        <textarea class="textarea st-paste" data-paste placeholder="Cole aqui os dados copiados (Ctrl+V)"></textarea>
        <div class="st-center"><button class="btn" data-read>Ler dados colados</button></div>
        <div style="margin-top:8px" class="muted">Se mesmo assim não reconhecer, me mande esse texto colado como arquivo que eu ajusto o importador para o formato exato.</div>
      </div>`;
    const pass = box.querySelector('[data-pass]');
    const tryIt = async () => {
      const pw = pass.value;
      if (!pw) return (box.querySelector('[data-perr]').textContent = 'Digite a senha.');
      box.querySelector('[data-perr]').textContent = 'Tentando…';
      const opened = await CRM.backup.unlockAll(p.obj, [pw, pw.trim()]);
      if (opened) return showForeign(opened.data, name, true);
      box.querySelector('[data-perr]').textContent = 'Essa senha não abriu o backup.';
    };
    box.querySelector('[data-try]').onclick = tryIt;
    pass.addEventListener('keydown', (e) => e.key === 'Enter' && tryIt());
    box.querySelector('[data-read]').onclick = () => {
      const text = box.querySelector('[data-paste]').value.trim();
      if (!text) return toast('Cole os dados no campo primeiro.', 'err');
      const parsed = CRM.backup.parse(text);
      if (parsed.format === 'unknown') return toast('O texto colado não é um JSON válido. Copie de novo com o comando acima.', 'err');
      if (parsed.format === 'crm') return showCRM(parsed.backup, 'dados colados');
      if (parsed.format === 'locked') return showForeign(parsed.obj, 'dados colados', false, true);
      showForeign(parsed.obj, 'dados colados', false);
    };
  }

  // Dados abertos de outra ferramenta: mostra o que foi encontrado antes de importar.
  function showForeign(data, name, unlocked, stillLocked = false) {
    const m = CRM.backup.mapForeign(data);
    const rows = CRM.backup.summaryForeign(m);
    const total = rows.reduce((s, r) => s + r.count, 0);
    const keys = data && typeof data === 'object' ? Object.keys(data).slice(0, 30) : [];
    const notes = [];
    if (m.linkedMedia) notes.push(`${m.linkedMedia} mídia(s) estavam só como link e viraram texto com o link.`);
    if (m.skipped.length) notes.push(`${m.skipped.length} ação(ões) não puderam ser trazidas (${esc([...new Set(m.skipped)].join(', '))}).`);
    if (stillLocked) notes.push('Parte desses dados também está trancada (criptografada) e foi ignorada.');
    if (!total) {
      result().innerHTML = `<div class="st-box warn"><h4>${icon('info', 15, 2)} ${unlocked ? 'Backup aberto, mas' : 'Arquivo lido, mas'} não reconheci os dados</h4>
        Não encontrei respostas rápidas, categorias nem abas em <b>${esc(name)}</b>.
        ${keys.length ? `<div style="margin-top:6px">Partes encontradas: ${keys.map((k) => `<span class="st-code" style="display:inline;padding:1px 5px">${esc(k)}</span>`).join(' ')}</div>` : ''}
        ${notes.length ? `<div style="margin-top:6px">${notes.join('<br>')}</div>` : ''}
        <div style="margin-top:8px">Me mande esse arquivo que eu ajusto o importador para esse formato.</div></div>`;
      return;
    }
    result().innerHTML = `<div class="st-box ok">
        <h4>${icon('checkCircle', 15)} ${unlocked ? 'Backup aberto!' : 'Dados reconhecidos'} Veja o que encontrei:</h4>
        <table class="st-table">${rows.map((r) => `<tr><td>${esc(r.label)}${r.sample.length ? `<div class="sample">${r.sample.map(esc).join(' · ')}${r.count > r.sample.length ? ' …' : ''}</div>` : ''}</td><td class="n">${r.count}</td></tr>`).join('')}</table>
        ${notes.length ? `<div style="margin-top:8px">${notes.join('<br>')}</div>` : ''}
        <div style="margin-top:8px" class="muted">Vai somar ao que você já tem. Respostas iguais (mesmo título e mesmo conteúdo) e categorias/abas com o mesmo nome não são repetidas.</div>
        <div class="st-center"><button class="btn" data-go>Importar</button></div>
      </div>`;
    result().querySelector('[data-go]').onclick = async (e) => {
      e.target.disabled = true;
      try {
        const r = await CRM.backup.importForeign(m);
        done([`${r.added} respostas rápidas novas`, `${m.quickCategories.length} categorias`, `${m.tabs.length} abas`]);
      } catch (err) {
        showError(err.message);
      }
    };
  }

  function done(parts) {
    result().innerHTML = `<div class="st-box ok"><h4>${icon('checkCircle', 15)} Backup importado</h4>${parts.map(esc).join(' · ')}</div>
      <div class="st-center"><button class="btn" data-close-st>Fechar</button></div>`;
    result().querySelector('[data-close-st]').onclick = CRM.ui.closeModal;
    notice('Backup importado com sucesso');
  }

  return { open };
})();
