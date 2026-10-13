// Central de Agendamentos (botão do menu da esquerda): o ano em meses, o mês em dias e,
// ao lado, os contatos que vão receber mensagem no dia (ou no mês) escolhido, com o horário.
// Mostra todos os envios: os agendamentos feitos na mão e os do ciclo de renovação
// (1 dia antes, no dia, 1 dia depois, NUTRIR e remarketing). Os recorrentes aparecem em
// todos os dias em que vão sair.
CRM.calendar = (() => {
  const { esc, pad } = CRM.util;
  const { icon, modal, toast } = CRM.ui;
  const store = CRM.store;

  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const WEEK_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const PAGE = 120; // cartões desenhados de cada vez (o resto vem no "Mostrar mais")
  const STEP_KIND = { before: 'Renovação · 1 dia antes', due: 'Renovação · no dia', after: 'Renovação · 1 dia depois', nutrir: 'NUTRIR', remarketing: 'Remarketing' };
  const STATE = {
    sending: ['Enviando', 'sending'], sent: ['Enviada', 'sent'], error: ['Erro', 'error'],
    late: ['Não enviada', 'error'], skipped: ['Pulada', 'skipped'],
  };

  const STYLE = `
    .cal { display: grid; grid-template-columns: 190px minmax(0, 1fr) 360px; height: 100%; }
    .cal-side { background: var(--teal); color: #fff; display: flex; flex-direction: column; padding: 16px 0 14px; min-height: 0; }
    .cal-year { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 20px; font-weight: 700; margin-bottom: 12px; }
    .cal-year button { border: 0; background: none; color: #fff; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; }
    .cal-year button:hover { background: rgba(255, 255, 255, .16); }
    .cal-months { display: flex; flex-direction: column; gap: 1px; overflow: auto; }
    .cal-month { border: 0; background: none; color: #fff; text-align: left; padding: 7px 16px 7px 20px; font-size: 13.5px;
      display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .cal-month:hover { background: rgba(255, 255, 255, .12); }
    .cal-month.on { background: rgba(0, 0, 0, .16); font-weight: 700; }
    .cal-month em { font-style: normal; font-size: 11px; font-weight: 700; background: rgba(255, 255, 255, .22); border-radius: 9px; padding: 0 7px; min-width: 22px; text-align: center; }
    .cal-today { margin: auto 16px 0; border: 1.5px solid rgba(255, 255, 255, .7); background: none; color: #fff; border-radius: 8px;
      padding: 7px 10px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .cal-today:hover { background: rgba(255, 255, 255, .14); }

    .cal-main { padding: 18px 22px; overflow: auto; min-width: 0; }
    .cal-title { text-align: center; color: var(--teal); font-size: 22px; font-weight: 700; margin: 2px 0 16px; text-transform: uppercase; letter-spacing: .02em; }
    .cal-week, .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
    .cal-week div { text-align: center; color: #3b4a54; font-weight: 600; font-size: 13px; padding-bottom: 10px; }
    .cal-grid { row-gap: 6px; }
    .cal-day { border: 0; background: none; height: 58px; display: flex; flex-direction: column; align-items: center; gap: 3px; padding-top: 4px; color: #111b21; }
    .cal-day .n { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; }
    .cal-day:hover .n { background: #f0f2f5; }
    .cal-day.today .n { background: var(--teal-soft); color: var(--teal-dark); font-weight: 700; }
    .cal-day.sel .n { background: var(--teal); color: #fff; font-weight: 700; }
    .cal-day .cnt { font-size: 10.5px; font-weight: 700; line-height: 15px; border-radius: 8px; padding: 0 6px; background: var(--teal-soft); color: var(--teal-dark); }
    .cal-day .cnt.done { background: #eef1f3; color: #667781; }
    .cal-legend { display: flex; gap: 16px; justify-content: center; margin-top: 14px; font-size: 12px; color: var(--muted); }
    .cal-legend span { display: inline-flex; align-items: center; gap: 6px; }
    .cal-legend i { display: inline-block; width: 18px; height: 11px; border-radius: 6px; background: var(--teal-soft); }
    .cal-legend i.done { background: #eef1f3; }

    .cal-list { border-left: 1px solid #e9edef; display: flex; flex-direction: column; min-height: 0; background: #fafbfb; }
    .cal-list-head { display: flex; align-items: flex-start; gap: 10px; padding: 16px 52px 10px 16px; }
    .cal-list-title { font-size: 19px; font-weight: 700; color: #111b21; }
    .cal-list-sub { font-size: 12.5px; color: var(--muted); margin-top: 1px; }
    .cal-add { margin-left: auto; flex: none; border: 1.5px solid var(--teal); color: var(--teal); background: #fff; border-radius: 50%;
      width: 30px; height: 30px; display: grid; place-items: center; }
    .cal-add:hover { background: var(--teal); color: #fff; }
    .cal-search { margin: 0 16px 10px; display: flex; align-items: center; gap: 7px; background: #fff; border: 1px solid #e3e6ea; border-radius: 8px; padding: 0 10px; color: var(--muted); }
    .cal-search input { border: 0; outline: 0; background: none; flex: 1; height: 34px; font: inherit; color: #111b21; min-width: 0; }
    .cal-cards { flex: 1; overflow: auto; padding: 0 16px 16px; display: flex; flex-direction: column; gap: 8px; }
    .cal-group { font-size: 12px; font-weight: 700; color: #3b4a54; margin: 8px 2px 0; display: flex; justify-content: space-between; }
    .cal-group em { font-style: normal; color: var(--muted); font-weight: 600; }
    .cal-card { display: flex; gap: 10px; align-items: center; background: #fff; border: 1px solid #e9edef; border-radius: 10px; padding: 9px 10px;
      box-shadow: 0 1px 2px rgba(11, 20, 26, .05); cursor: pointer; }
    .cal-card:hover { border-color: var(--teal); }
    .cal-av { width: 36px; height: 36px; border-radius: 50%; flex: none; display: grid; place-items: center; background: var(--teal-soft) center/cover no-repeat;
      color: var(--teal-dark); font-weight: 700; font-size: 12.5px; }
    .cal-body { flex: 1; min-width: 0; }
    .cal-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .cal-row + .cal-row { margin-top: 4px; }
    .cal-name { font-weight: 700; font-size: 13px; color: #111b21; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cal-kind { font-size: 11px; color: var(--muted); font-style: italic; flex: none; max-width: 48%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cal-what { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #3b4a54; flex: 1; min-width: 0; }
    .cal-what span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cal-what svg, .cal-time svg { color: var(--teal); flex: none; }
    .cal-time { display: flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700; color: #111b21; flex: none; }
    .cal-edit { border: 0; background: none; color: #54656f; width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center; flex: none; }
    .cal-edit:hover { background: #f0f2f5; color: var(--teal); }
    .cal-empty { text-align: center; color: var(--muted); padding: 30px 10px; font-size: 13px; }
    .cal-empty svg { color: var(--teal); display: block; margin: 0 auto 8px; }
    .cal-more { border: 1.5px solid var(--teal); color: var(--teal); background: #fff; border-radius: 8px; padding: 7px; font-weight: 600; }
    @media (max-width: 1100px) { .cal { grid-template-columns: 160px minmax(0, 1fr) 310px; } .cal-day { height: 52px; } }
  `;

  const PLUS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  const pics = new Map(); // chatId → endereço da foto ('' = sem foto)
  let view = null; // { year, month, day (null = mês todo), query, shown }
  let items = []; // envios do ano exibido: { s, at, state }
  let names = {}; // chatId → nome do Cadastro
  let quickTitles = {}; // id → título da resposta rápida
  let nutrirTitle = '';
  let el = null;
  let observer = null;

  const plain = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const sameDay = (t, y, m, d) => { const x = new Date(t); return x.getFullYear() === y && x.getMonth() === m && x.getDate() === d; };
  const hhmm = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const initials = (name) => (String(name || '?').replace(/^\+/, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();

  // Todos os envios do ano: os pendentes (e as próximas vezes dos recorrentes) e os que já saíram.
  async function load(year) {
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year + 1, 0, 1).getTime();
    const [schedules, clients, replies, settings] = await Promise.all([store.getSchedules(), store.getClients(), CRM.quick.list(), store.getSettings()]);
    names = Object.fromEntries(clients.map((c) => [c.chatId, c.name]));
    quickTitles = Object.fromEntries(replies.map((q) => [q.id, q.title || CRM.quick.summary(q).slice(0, 40)]));
    const cfg = settings.remarketing || {};
    nutrirTitle = cfg.nutrirQuickId ? quickTitles[cfg.nutrirQuickId] || '' : '';
    const out = [];
    const add = (s, at, state) => at >= start && at < end && out.push({ s, at, state });
    for (const s of schedules) {
      if (s.status === 'pending' || s.status === 'sending') {
        if (s.lastRunAt) add(s, s.lastRunAt, s.lastResult === 'error' ? 'error' : 'sent');
        let t = s.nextAt;
        for (let n = 0; t && t < end && n < 400; n++) {
          add(s, t, n === 0 ? s.status : 'pending');
          t = CRM.schedules.nextOccurrence(s, t);
        }
      } else if (s.nextAt || s.lastRunAt) {
        add(s, s.nextAt || s.lastRunAt, s.status);
      }
    }
    items = out.sort((a, b) => a.at - b.at);
  }

  function visible() {
    const { year, month, day, query } = view;
    const q = plain(query);
    return items.filter((it) => {
      const d = new Date(it.at);
      if (d.getFullYear() !== year || d.getMonth() !== month || (day && d.getDate() !== day)) return false;
      return !q || plain(nameOf(it.s) + ' ' + (it.s.chatPhone || '') + ' ' + whatOf(it.s)[1] + ' ' + kindOf(it.s)).includes(q);
    });
  }

  const nameOf = (s) => names[s.chatId] || s.chatName || (s.chatPhone ? CRM.clients.formatPhone(s.chatPhone) : 'Contato');
  function kindOf(s) {
    if (s.renewalStep) return STEP_KIND[s.renewalStep] || 'Renovação';
    const rec = CRM.schedules.recurrenceLabel(s);
    return rec ? rec.toLowerCase() : 'uma vez';
  }
  function whatOf(s) {
    if (s.type === 'nutrir') return ['sprout', nutrirTitle || 'Mensagem de NUTRIR'];
    if (s.type === 'remarketing') return ['megaphone', 'Mensagem de remarketing'];
    if (s.type === 'quick') return ['bolt', quickTitles[s.quickReplyId] || s.quickTitle || 'Mensagem rápida'];
    if (s.type === 'media') return ['image', s.title || (s.text || '').trim() || s.mediaName || 'Arquivo'];
    if (s.type === 'audio') return ['audio', s.title || 'Áudio'];
    return ['text', s.title || (s.text || '').trim().split('\n')[0] || 'Mensagem'];
  }

  // ---------- Desenho ----------
  function sideHTML() {
    const counts = Array(12).fill(0);
    items.forEach((it) => it.state === 'pending' && counts[new Date(it.at).getMonth()]++);
    return `<div class="cal-year"><button data-year="-1" title="Ano anterior">${icon('chevLeft', 18, 2.2)}</button>${view.year}<button data-year="1" title="Próximo ano">${icon('chevRight', 18, 2.2)}</button></div>
      <nav class="cal-months">${MONTHS.map((m, i) => `<button class="cal-month ${i === view.month ? 'on' : ''}" data-month="${i}"><span>${m}</span>${counts[i] ? `<em title="Envios agendados">${counts[i]}</em>` : ''}</button>`).join('')}</nav>
      <button class="cal-today" data-today>${icon('schedule', 15)} Hoje</button>`;
  }

  function gridHTML() {
    const { year, month, day } = view;
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const now = new Date();
    const perDay = {};
    items.forEach((it) => {
      const d = new Date(it.at);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const k = d.getDate();
      perDay[k] = perDay[k] || { pending: 0, total: 0 };
      perDay[k].total++;
      if (it.state === 'pending' || it.state === 'sending') perDay[k].pending++;
    });
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const c = perDay[d];
      const today = sameDay(now.getTime(), year, month, d);
      const title = c ? `${c.pending} agendado${c.pending === 1 ? '' : 's'}${c.total > c.pending ? ` · ${c.total - c.pending} já enviado${c.total - c.pending === 1 ? '' : 's'}` : ''}` : 'Nenhum envio';
      cells += `<button class="cal-day ${today ? 'today' : ''} ${day === d ? 'sel' : ''}" data-day="${d}" title="${title}"><span class="n">${d}</span>${c ? `<span class="cnt ${c.pending ? '' : 'done'}">${c.pending || c.total}</span>` : ''}</button>`;
    }
    return `<h2 class="cal-title">${MONTHS[month]} ${year}</h2>
      <div class="cal-week">${WEEK.map((w) => `<div>${w}</div>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
      <div class="cal-legend"><span><i></i>envios agendados no dia</span><span><i class="done"></i>só envios que já saíram</span></div>`;
  }

  function cardHTML(it) {
    const s = it.s;
    const name = nameOf(s);
    const [ic, what] = whatOf(s);
    const st = STATE[it.state];
    return `<div class="cal-card" data-chat="${esc(s.chatId)}" title="Abrir a conversa">
      <div class="cal-av" data-pic="${esc(s.chatId)}">${esc(initials(name))}</div>
      <div class="cal-body">
        <div class="cal-row"><span class="cal-name">${esc(name)}</span><span class="cal-kind">${esc(kindOf(s))}</span></div>
        <div class="cal-row"><span class="cal-what">${icon(ic, 13)}<span>${esc(what)}</span></span>
          ${st ? `<span class="status ${st[1]}">${st[0]}</span>` : ''}
          <span class="cal-time">${icon('clock', 13)}${hhmm(it.at)}</span></div>
      </div>
      ${!s.renewalId && it.state === 'pending' ? `<button class="cal-edit" data-edit="${esc(s.id)}" title="Editar agendamento">${icon('edit', 15)}</button>` : ''}
    </div>`;
  }

  function listHTML(list) {
    if (!list.length) {
      return `<div class="cal-empty">${icon('schedule', 26)}${view.query ? 'Nada encontrado com essa pesquisa.' : view.day ? 'Nenhum envio neste dia.' : 'Nenhum envio neste mês.'}</div>`;
    }
    const shown = list.slice(0, view.shown);
    let html = '';
    let lastDay = null;
    shown.forEach((it) => {
      const d = new Date(it.at);
      if (!view.day && d.getDate() !== lastDay) {
        lastDay = d.getDate();
        const n = list.filter((x) => new Date(x.at).getDate() === lastDay).length;
        html += `<div class="cal-group">${WEEK_LONG[d.getDay()].replace('-feira', '')}, ${lastDay} de ${MONTHS[d.getMonth()].toLowerCase()}<em>${n} envio${n === 1 ? '' : 's'}</em></div>`;
      }
      html += cardHTML(it);
    });
    if (list.length > shown.length) html += `<button class="cal-more" data-more>Mostrar mais (${list.length - shown.length})</button>`;
    return html;
  }

  function headHTML(list) {
    const { year, month, day } = view;
    const n = list.length;
    const count = `${n} envio${n === 1 ? '' : 's'}`;
    if (!day) return `<div><div class="cal-list-title">${MONTHS[month]} de ${year}</div><div class="cal-list-sub">${count} no mês</div></div>`;
    const d = new Date(year, month, day);
    return `<div><div class="cal-list-title">${day} de ${MONTHS[month].toLowerCase()} de ${year}</div><div class="cal-list-sub">${WEEK_LONG[d.getDay()]} · ${count}</div></div>`;
  }

  function render() {
    if (!el || !el.isConnected) return;
    el.querySelector('.cal-side').innerHTML = sideHTML();
    el.querySelector('.cal-main').innerHTML = gridHTML();
    renderList();
  }

  function renderList() {
    const list = visible();
    el.querySelector('[data-head]').innerHTML = headHTML(list);
    const box = el.querySelector('[data-cards]');
    box.innerHTML = listHTML(list);
    loadPics(box);
  }

  // Fotos do perfil: só dos cartões que aparecem na tela.
  function loadPics(box) {
    if (observer) observer.disconnect();
    const apply = (node, url) => {
      if (!url) return;
      node.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
      node.textContent = '';
    };
    observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        observer.unobserve(e.target);
        const id = e.target.dataset.pic;
        if (pics.has(id)) return apply(e.target, pics.get(id));
        CRM.wa.getProfilePic(id).then((url) => {
          pics.set(id, url || '');
          box.querySelectorAll(`[data-pic="${CSS.escape(id)}"]`).forEach((n) => apply(n, url));
        }).catch(() => pics.set(id, ''));
      });
    }, { root: box });
    box.querySelectorAll('[data-pic]').forEach((n) => observer.observe(n));
  }

  // ---------- Janela ----------
  // keep: volta para o mesmo mês/dia (ex.: depois de editar um agendamento). Sem isso, abre em hoje.
  async function open({ keep = false } = {}) {
    const d = new Date();
    if (!keep || !view) view = { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), query: '', shown: PAGE };
    await load(view.year);
    el = modal(`<style>${STYLE}</style><div class="cal">
      <aside class="cal-side"></aside>
      <section class="cal-main"></section>
      <section class="cal-list">
        <div class="cal-list-head"><div data-head></div><button class="cal-add" data-add title="Agendar mensagem para a conversa aberta">${PLUS}</button></div>
        <label class="cal-search">${icon('search', 15)}<input data-search placeholder="Pesquisar contato ou mensagem" value="${esc(view.query)}"></label>
        <div class="cal-cards" data-cards></div>
      </section>
    </div>`, { full: true, onClose: () => (el = null) });
    render();

    el.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-year], [data-month], [data-today], [data-day], [data-more], [data-edit], [data-add], .cal-card');
      if (!t) return;
      if (t.dataset.year) {
        view = { ...view, year: view.year + Number(t.dataset.year), day: null, shown: PAGE };
        await load(view.year);
        return render();
      }
      if (t.dataset.month) {
        view = { ...view, month: Number(t.dataset.month), day: null, shown: PAGE };
        return render();
      }
      if (t.hasAttribute('data-today')) {
        const now = new Date();
        const yearChanged = now.getFullYear() !== view.year;
        view = { ...view, year: now.getFullYear(), month: now.getMonth(), day: now.getDate(), shown: PAGE };
        if (yearChanged) await load(view.year);
        return render();
      }
      if (t.dataset.day) {
        const day = Number(t.dataset.day);
        view = { ...view, day: view.day === day ? null : day, shown: PAGE }; // clicar de novo no dia mostra o mês todo
        return render();
      }
      if (t.hasAttribute('data-more')) {
        view.shown += PAGE * 4;
        return renderList();
      }
      if (t.dataset.edit) {
        e.stopPropagation();
        const s = (await store.getSchedules()).find((x) => x.id === t.dataset.edit);
        if (s) CRM.schedules.openForm(s, null, () => open({ keep: true }));
        return;
      }
      if (t.hasAttribute('data-add')) {
        if (!CRM.wa.state.activeChat) return toast('Abra a conversa do contato para agendar uma mensagem.', 'err');
        const date = `${view.year}-${pad(view.month + 1)}-${pad(view.day || 1)}`;
        return CRM.schedules.openForm(null, { date }, () => open({ keep: true }));
      }
      if (t.classList.contains('cal-card')) {
        try {
          await CRM.wa.openChat(t.dataset.chat);
          CRM.ui.closeModal();
          el = null;
        } catch (err) {
          toast('Não consegui abrir a conversa: ' + err.message, 'err');
        }
      }
    });
    el.querySelector('[data-search]').addEventListener('input', (e) => {
      view.query = e.target.value;
      view.shown = PAGE;
      renderList();
    });
  }

  // Envio saiu, agendamento novo, cadastro mudou… a janela aberta se atualiza sozinha.
  store.onChange(async (changes) => {
    if (!el || !el.isConnected || !(changes.schedules || changes.clients)) return;
    await load(view.year);
    el.querySelector('.cal-side').innerHTML = sideHTML();
    el.querySelector('.cal-main').innerHTML = gridHTML();
    const box = el.querySelector('[data-cards]');
    const top = box.scrollTop;
    renderList();
    box.scrollTop = top;
  });

  return { open };
})();
