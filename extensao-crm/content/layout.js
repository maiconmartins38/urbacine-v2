// Encaixe das barras da extensão (abas no topo e menu na lateral esquerda): desce e
// afasta a tela do WhatsApp para as barras não ficarem por cima. Como não dá para saber de antemão como o WhatsApp monta a tela,
// cada modo é aplicado e CONFERIDO; se a tela ficar errada, desfaz e tenta o próximo.
CRM.layout = (() => {
  const H = 36; // altura da barra de abas (topo)
  const L = 38; // largura do menu lateral (esquerda)
  const ROOT = 'data-crm-root';
  const LAYER = 'data-crm-shift';
  const STYLE_ID = 'crm-ext-push';

  const MODES = {
    root: 'Modo 1 — afasta a tela principal',
    layers: 'Modo 2 — afasta também as camadas fixas',
    transform: 'Modo 3 — afasta tudo junto',
    overlay: 'Modo 4 — barras por cima (não mexe na tela)',
  };
  const AUTO_ORDER = ['root', 'layers', 'transform'];

  let wanted = 'auto';
  let applied = null;
  let lastCheck = null;
  let autoIndex = 0;
  let onFail = null;

  // ---------- Pontos de referência da tela do WhatsApp ----------
  function anchors() {
    const side = document.getElementById('side') || document.getElementById('pane-side');
    const main = document.getElementById('main');
    return [side, main].filter(Boolean);
  }

  function findRoot() {
    const a = anchors()[0];
    if (!a) return null;
    let el = a;
    while (el.parentElement && el.parentElement !== document.body) el = el.parentElement;
    return el.parentElement === document.body ? el : null;
  }

  // ---------- Aplicar / desfazer ----------
  function clear() {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
    document.querySelectorAll(`[${ROOT}],[${LAYER}]`).forEach((el) => {
      el.removeAttribute(ROOT);
      el.removeAttribute(LAYER);
    });
    applied = null;
  }

  function setStyle(css) {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = css;
  }

  // Tela principal "fixa/absoluta": desce com top. Normal/relativa: desce com o espaço no body.
  function rootCss(position) {
    const size = `height: calc(100vh - ${H}px) !important; max-height: calc(100vh - ${H}px) !important;
      max-width: calc(100vw - ${L}px) !important;`;
    return position === 'fixed' || position === 'absolute'
      ? `[${ROOT}] { top: ${H}px !important; left: ${L}px !important; width: calc(100vw - ${L}px) !important; ${size} }`
      : `body { padding-top: ${H}px !important; padding-left: ${L}px !important; box-sizing: border-box !important; }
         [${ROOT}] { ${size} }`;
  }

  function markLayers() {
    for (const anchor of anchors()) {
      const chain = [];
      for (let el = anchor; el && el !== document.body; el = el.parentElement) chain.unshift(el);
      for (const el of chain) {
        if (el.hasAttribute(LAYER) || el.hasAttribute(ROOT)) continue;
        const pos = getComputedStyle(el).position;
        if (pos !== 'fixed' && pos !== 'absolute') continue;
        const r = el.getBoundingClientRect();
        if ((r.top < H - 1 || r.left < L - 1) && r.height > window.innerHeight * 0.5) el.setAttribute(LAYER, '');
      }
    }
  }

  function apply(mode) {
    clear();
    applied = mode;
    if (mode === 'overlay') return true;
    const root = findRoot();
    if (!root) return false;
    const ROOT_CSS = rootCss(getComputedStyle(root).position);
    root.setAttribute(ROOT, '');
    if (mode === 'root') setStyle(ROOT_CSS);
    if (mode === 'layers') {
      setStyle(ROOT_CSS + `
        [${LAYER}] { top: ${H}px !important; left: ${L}px !important; width: calc(100vw - ${L}px) !important; max-width: calc(100vw - ${L}px) !important;
          height: calc(100vh - ${H}px) !important; max-height: calc(100vh - ${H}px) !important; }`);
      markLayers();
    }
    if (mode === 'transform') {
      setStyle(ROOT_CSS + `
        [${ROOT}] { transform: translateZ(0) !important; overflow: hidden !important; }`);
    }
    return true;
  }

  // ---------- Conferir se ficou certo ----------
  // Lista e conversa: começam abaixo da barra, terminam no fim da janela, não sumiram
  // e nenhuma "caixa" por cima delas foi rolada para fora do lugar.
  function check() {
    const list = anchors();
    if (!list.length) return null; // tela do WhatsApp ainda carregando
    const problems = [];
    // As caixas grandes que envolvem a lista/conversa não podem ficar embaixo das barras.
    const root = findRoot();
    for (const el of list) {
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        const r = p.getBoundingClientRect();
        if (r.height < window.innerHeight * 0.5) continue;
        if (r.left < L - 1) {
          problems.push(`${p.id || p.tagName.toLowerCase()} fica embaixo do menu lateral (left ${Math.round(r.left)})`);
          break;
        }
        if (r.right > window.innerWidth + 2) {
          problems.push(`${p.id || p.tagName.toLowerCase()} passa da borda direita (right ${Math.round(r.right)})`);
          break;
        }
        if (p === root) break;
      }
    }
    for (const el of list) {
      const r = el.getBoundingClientRect();
      const name = el.id || el.tagName;
      if (r.top < H - 1) problems.push(`${name} começa embaixo da barra (top ${Math.round(r.top)})`);
      if (r.bottom > window.innerHeight + 2) problems.push(`${name} passa do fim da janela (bottom ${Math.round(r.bottom)})`);
      if (r.height < window.innerHeight * 0.4) problems.push(`${name} ficou pequeno demais (altura ${Math.round(r.height)})`);
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (p.scrollTop > 0 && p.scrollHeight > p.clientHeight && getComputedStyle(p).overflowY === 'hidden') {
          problems.push(`caixa acima de ${name} foi rolada ${p.scrollTop}px`);
          break;
        }
      }
    }
    const scroller = document.scrollingElement;
    if (scroller && scroller.scrollTop > 0) problems.push(`página rolada ${scroller.scrollTop}px`);
    lastCheck = { ok: !problems.length, problems, at: Date.now() };
    return lastCheck.ok;
  }

  // Desfaz rolagens indevidas (ex.: o navegador rola uma caixa "overflow:hidden" ao focar o campo).
  function unscroll() {
    const els = [document.scrollingElement, document.body, findRoot()].filter(Boolean);
    els.forEach((el) => {
      if (el.scrollTop > 0) el.scrollTop = 0;
    });
  }

  function step() {
    if (!anchors().length) return; // espera o WhatsApp montar a tela
    // O WhatsApp redesenhou a tela e a marcação sumiu: aplica de novo o mesmo modo.
    if (applied && applied !== 'overlay' && !document.querySelector(`[${ROOT}]`)) {
      apply(applied);
      return;
    }
    if (wanted !== 'auto') {
      if (applied !== wanted) apply(wanted);
      if (wanted === 'layers') markLayers();
      unscroll();
      check();
      return;
    }
    if (!applied) {
      autoIndex = 0;
      apply(AUTO_ORDER[autoIndex]);
      return; // confere no próximo ciclo, depois de a tela se acomodar
    }
    if (applied === 'overlay') return check();
    if (applied === 'layers') markLayers();
    unscroll();
    if (check()) return;
    // não ficou certo: tenta o próximo modo; se acabarem, barra por cima.
    autoIndex += 1;
    if (autoIndex < AUTO_ORDER.length) {
      apply(AUTO_ORDER[autoIndex]);
    } else {
      apply('overlay');
      if (onFail) onFail();
    }
  }

  async function start({ onAutoFail } = {}) {
    onFail = onAutoFail;
    const settings = await CRM.store.getSettings();
    wanted = settings.layoutMode || 'auto';
    setInterval(step, 600);
    window.addEventListener('resize', () => {
      if (wanted === 'auto' && applied && applied !== 'overlay') apply(applied);
    });
  }

  async function setMode(mode) {
    wanted = mode;
    clear();
    autoIndex = 0;
    await CRM.store.saveSettings({ ...(await CRM.store.getSettings()), layoutMode: mode });
    step();
  }

  // ---------- Diagnóstico (só estrutura da tela, nenhum texto de mensagem) ----------
  function describe(el) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const cls = [...el.classList].slice(0, 3).map((c) => '.' + c).join('');
    const marks = (el.hasAttribute(ROOT) ? ' [raiz]' : '') + (el.hasAttribute(LAYER) ? ' [camada]' : '');
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls} pos=${cs.position} top=${cs.top} h=${cs.height} ovf=${cs.overflowY} tr=${cs.transform === 'none' ? '-' : 'sim'} rect=${Math.round(r.top)}/${Math.round(r.height)} scroll=${el.scrollTop}${marks}`;
  }

  function diagnose() {
    const lines = [];
    lines.push(`CRM WhatsApp ${chrome.runtime.getManifest().version} | modo escolhido=${wanted} aplicado=${applied} | janela=${window.innerWidth}x${window.innerHeight}`);
    lines.push(`#app=${!!document.getElementById('app')} #side=${!!document.getElementById('side')} #pane-side=${!!document.getElementById('pane-side')} #main=${!!document.getElementById('main')}`);
    lines.push('conferência: ' + (lastCheck ? (lastCheck.ok ? 'OK' : lastCheck.problems.join('; ')) : 'ainda não conferido'));
    lines.push('-- filhos do body:');
    [...document.body.children].forEach((el) => !String(el.id).startsWith('crm-ext') && el.tagName !== 'SCRIPT' && lines.push('  ' + describe(el)));
    anchors().forEach((a) => {
      lines.push(`-- caminho até ${a.id}:`);
      const chain = [];
      for (let el = a; el && el !== document.documentElement; el = el.parentElement) chain.unshift(el);
      chain.forEach((el, i) => lines.push('  '.repeat(i + 1) + describe(el)));
    });
    return lines.join('\n');
  }

  return { start, setMode, diagnose, MODES, get mode() { return wanted; }, get applied() { return applied; }, HEIGHT: H, LEFT: L };
})();
