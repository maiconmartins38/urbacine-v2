// Faixa "Ação da Resposta Rápida (1/3)" logo abaixo do topo da conversa, enquanto
// uma resposta rápida está sendo enviada: mostra a etapa, a contagem dos segundos
// ("digitando…", "aguarde…") e um botão para parar.
CRM.runBar = (() => {
  const { esc } = CRM.util;
  const { icon } = CRM.ui;

  let host = null;
  let shadow = null;
  let timer = null;
  let state = { title: '', index: 0, total: 1, type: 'text', phase: 'sending', left: 0, fraction: 0, queued: 0 };

  const CSS = `
    .rb { position: relative; background: #fff; border-bottom: 1px solid #e9edef; box-shadow: 0 2px 5px rgba(11, 20, 26, .06);
      display: flex; align-items: center; gap: 10px; padding: 8px 14px 10px; }
    .rb-ico { color: var(--teal); background: var(--teal-soft); border-radius: 6px; width: 26px; height: 26px; display: grid; place-items: center; flex: none; }
    .rb-main { flex: 1; min-width: 0; }
    .rb-title { font-weight: 700; font-size: 14px; color: #111b21; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rb-name { font-weight: 400; color: var(--muted); font-size: 12.5px; }
    .rb-sub { font-size: 12px; color: #3b4a54; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rb-sub b { color: var(--teal); }
    .rb-queue { font-size: 11.5px; font-weight: 700; color: #fff; background: #1d2a44; border-radius: 10px; padding: 2px 8px; flex: none; }
    .rb-stop { border: 0; background: none; color: #54656f; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; flex: none; }
    .rb-stop:hover { background: #fdecec; color: var(--danger); }
    .rb-track { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: #e9edef; }
    .rb-fill { height: 100%; background: linear-gradient(90deg, #24988d, #8ad2c7); transition: width .25s linear; }
  `;

  const PHASES = {
    typing: (s) => `Exibindo para o cliente que a mensagem está sendo digitada… <b>${s} s</b>`,
    recording: (s) => `Exibindo para o cliente que um áudio está sendo gravado… <b>${s} s</b>`,
    wait: (s) => `Aguarde para chamar a próxima ação… <b>${s} s</b>`,
    sending: () => 'Enviando…',
  };

  function mount() {
    if (host && host.isConnected) return;
    host = document.createElement('div');
    host.id = 'crm-ext-runbar';
    host.style.cssText = 'position:fixed;z-index:995;display:none;';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CRM.styles}${CSS}</style><div class="root"><div class="rb">
      <span class="rb-ico" data-ico></span>
      <div class="rb-main"><div class="rb-title" data-title></div><div class="rb-sub" data-sub></div></div>
      <span class="rb-queue" data-queue hidden></span>
      <button class="rb-stop" data-stop title="Parar o envio">${icon('close', 16, 2.2)}</button>
      <div class="rb-track"><div class="rb-fill" data-fill></div></div>
    </div></div>`;
    shadow.querySelector('[data-stop]').addEventListener('click', () => {
      if (confirm('Parar o envio desta resposta rápida? As ações que faltam não serão enviadas.')) CRM.quickRun.cancel();
    });
    CRM.ui.isolateEvents(host);
    document.body.appendChild(host);
  }

  // Fica colada embaixo do topo da conversa aberta; sem conversa, fica no alto da tela.
  function position() {
    if (!host) return;
    const main = document.getElementById('main');
    const header = main && main.querySelector('header');
    if (main && header) {
      const m = main.getBoundingClientRect();
      const h = header.getBoundingClientRect();
      if (m.width > 0) {
        host.style.left = Math.round(m.left) + 'px';
        host.style.top = Math.round(h.bottom) + 'px';
        host.style.width = Math.round(m.width) + 'px';
        return;
      }
    }
    const left = (CRM.layout && CRM.layout.LEFT) || 0;
    const right = (CRM.layout && CRM.layout.right) || 0;
    host.style.left = left + 'px';
    host.style.top = ((CRM.layout && CRM.layout.HEIGHT) || 0) + 'px';
    host.style.width = `calc(100vw - ${left + right}px)`;
  }

  function draw() {
    if (!shadow) return;
    const t = CRM.quick.TYPES[state.type];
    shadow.querySelector('[data-ico]').innerHTML = icon(t ? t.icon : 'bolt', 15, 2);
    shadow.querySelector('[data-title]').innerHTML =
      `Ação da Resposta Rápida (${state.index + 1}/${state.total})` + (state.title ? ` <span class="rb-name">· ${esc(state.title)}</span>` : '');
    const phase = PHASES[state.phase] || PHASES.sending;
    shadow.querySelector('[data-sub]').innerHTML = phase(state.left);
    const q = shadow.querySelector('[data-queue]');
    q.hidden = !state.queued;
    q.textContent = `+${state.queued} na fila`;
    const done = (state.index + Math.max(0, Math.min(1, state.fraction || 0))) / Math.max(1, state.total);
    shadow.querySelector('[data-fill]').style.width = Math.round(done * 100) + '%';
  }

  function show({ title, total, queued }) {
    mount();
    state = { title: title || '', index: 0, total: Math.max(1, total || 1), type: 'text', phase: 'sending', left: 0, fraction: 0, queued: queued || 0 };
    host.style.display = 'block';
    position();
    draw();
    clearInterval(timer);
    timer = setInterval(position, 400);
  }

  function update(p) {
    state = { ...state, ...p };
    draw();
  }

  function queued(n) {
    state.queued = n;
    draw();
  }

  function hide() {
    clearInterval(timer);
    timer = null;
    if (host) host.style.display = 'none';
  }

  return { show, update, queued, hide };
})();
