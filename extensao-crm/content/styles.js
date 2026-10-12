// Visual da extensão. Fica dentro de um Shadow DOM, então o CSS do
// WhatsApp não interfere aqui e o nosso não interfere no WhatsApp.
CRM.styles = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.root {
  --teal: #24988d;
  --teal-dark: #1c7f76;
  --teal-soft: #e6f4f2;
  --text: #111b21;
  --muted: #667781;
  --line: #d1d7db;
  --danger: #d9534f;
  font-family: "Segoe UI", "Helvetica Neue", Helvetica, "Lucida Grande", Arial, Ubuntu, Cantarell, "Fira Sans", sans-serif;
  color: var(--text);
  font-size: 13px;
  line-height: 1.35;
}
button { font-family: inherit; cursor: pointer; }
svg { display: block; }

/* ---------- Barra lateral de ícones ---------- */
.bar { display: flex; flex-direction: column; gap: 9px; }
.bar-btn {
  position: relative; width: 38px; height: 38px; border-radius: 10px; border: 0;
  background: #fff; color: var(--teal); display: grid; place-items: center;
  box-shadow: 0 1px 3px rgba(11, 20, 26, .16); transition: transform .12s, box-shadow .12s;
}
.bar-btn:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(11, 20, 26, .2); }
.bar-badge {
  position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; background: var(--teal); color: #fff; font-size: 11px; font-weight: 700;
  display: grid; place-items: center; border: 2px solid #fff; line-height: 1;
}
.bar-tip {
  position: absolute; left: calc(100% + 12px); top: 50%; transform: translateY(-50%);
  background: var(--teal); color: #fff; font-weight: 600; font-size: 13px; white-space: nowrap;
  padding: 7px 12px; border-radius: 7px; pointer-events: none; opacity: 0; transition: opacity .12s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, .15);
}
.bar-tip::before {
  content: ""; position: absolute; left: -6px; top: 50%; transform: translateY(-50%);
  border: 6px solid transparent; border-left: 0; border-right-color: var(--teal);
}
.bar-btn:hover .bar-tip { opacity: 1; }

/* ---------- Janelas ---------- */
.layer { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; pointer-events: none; }
.modal {
  pointer-events: auto; position: relative; background: #fff; border-radius: 14px;
  box-shadow: 0 10px 34px rgba(11, 20, 26, .22), 0 1px 3px rgba(11, 20, 26, .1);
  padding: 22px 24px 22px; width: 560px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 40px); overflow: auto;
}
.modal.wide { width: 660px; }
.modal-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-right: 26px; }
.modal-title { font-size: 20px; font-weight: 700; margin: 0; flex: 1; }
.modal-close {
  position: absolute; top: 12px; right: 12px; border: 0; background: none; color: #3b4a54;
  width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
}
.modal-close:hover { background: #f0f2f5; }
.head-actions { display: flex; align-items: center; gap: 8px; }
.chip-btn {
  position: relative; display: inline-flex; align-items: center; gap: 5px; background: #fff;
  border: 1.5px solid var(--teal); color: var(--teal); border-radius: 7px; padding: 4px 10px;
  font-size: 12.5px; font-weight: 500;
}
.chip-btn .chip-badge {
  position: absolute; top: -9px; right: -7px; min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: 8px; background: var(--teal); color: #fff; font-size: 10px; font-weight: 700;
  display: grid; place-items: center; line-height: 1;
}
.pill-btn {
  display: inline-flex; align-items: center; gap: 5px; background: #fff; border: 1.5px solid #3b4a54;
  color: #111b21; border-radius: 14px; padding: 4px 11px; font-size: 12.5px; font-weight: 500;
}
.pill-btn.on { background: #3b4a54; color: #fff; }
.icon-btn {
  border: 0; background: none; color: #54656f; width: 30px; height: 30px; border-radius: 50%;
  display: grid; place-items: center;
}
.icon-btn:hover { background: #f0f2f5; color: var(--teal); }
.icon-btn.danger:hover { color: var(--danger); }

/* ---------- Botões ---------- */
.btn {
  border: 0; color: #fff; font-weight: 600; font-size: 13.5px; border-radius: 6px; padding: 8px 16px;
  background: linear-gradient(90deg, #24988d 0%, #2ba295 55%, #8ad2c7 100%);
  box-shadow: 0 3px 9px rgba(36, 152, 141, .35); text-shadow: 0 1px 1px rgba(0, 0, 0, .15);
}
.btn:hover { filter: brightness(1.05); }
.btn:disabled { opacity: .55; cursor: default; filter: none; }
.btn-outline {
  display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid #3b4a54; background: #fff;
  color: #111b21; border-radius: 7px; padding: 6px 14px; font-weight: 500; font-size: 13px;
}
.actions { display: flex; justify-content: space-around; margin-top: 20px; }

/* ---------- Vencimento no cadastro (ciclo de renovação) ---------- */
.cycle { border: 1px solid #d7e9e6; border-radius: 10px; padding: 10px 12px 6px; margin: 4px 0 12px; background: #f7fbfa; }
.cycle-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13.5px; margin-bottom: 8px; color: #1c4f4a; }
.cycle-title svg { color: var(--teal); }
.cycle-stage { font-size: 12px; background: var(--teal-soft); border-radius: 7px; padding: 6px 8px; margin-bottom: 10px; color: #1c4f4a; }

/* ---------- Estado vazio ---------- */
.empty { text-align: center; padding: 6px 10px 4px; color: var(--muted); }
.empty .empty-icon { color: var(--teal); display: grid; place-items: center; margin-bottom: 8px; }
.empty h3 { color: var(--text); font-size: 15px; margin: 0 0 6px; }
.empty p { margin: 0 auto 14px; max-width: 330px; font-size: 12.5px; }

/* ---------- Formulários ---------- */
.field { margin-bottom: 14px; }
.label { display: flex; align-items: center; gap: 6px; color: #3b4a54; font-size: 12.5px; margin-bottom: 6px; }
.input, .select, .textarea {
  width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px;
  font: inherit; font-size: 13px; color: var(--text); background: #fff; outline: none;
}
.input:focus, .select:focus, .textarea:focus { border-color: var(--teal); box-shadow: 0 0 0 2px rgba(36, 152, 141, .15); }
.input::placeholder, .textarea::placeholder { color: #a3adb4; }
.textarea-wrap { position: relative; }
.textarea { min-height: 96px; resize: vertical; padding-right: 36px; }
.textarea-tools { position: absolute; top: 6px; right: 6px; display: flex; flex-direction: column; gap: 2px; }
.row { display: flex; gap: 14px; }
.row > * { flex: 1; min-width: 0; }
.info { color: #54656f; position: relative; display: inline-grid; cursor: help; }
.info-pop {
  display: none; position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%);
  width: 260px; background: #3b4a54; color: #fff; font-size: 12px; padding: 8px 10px; border-radius: 7px;
  z-index: 5; line-height: 1.4; font-weight: 400;
}
.info:hover .info-pop { display: block; }
.error-msg { color: var(--danger); font-size: 12.5px; margin-top: 8px; text-align: center; min-height: 1em; }

.tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tab {
  border: 0; background: none; font-weight: 700; font-size: 13px; color: #111b21;
  padding: 7px 12px; border-radius: 7px;
}
.tab.on { background: var(--teal); color: #fff; }

.check { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; color: var(--text); background: none; border: 0; padding: 0; }
.check .dot {
  width: 17px; height: 17px; border-radius: 50%; border: 1.5px solid var(--teal);
  display: grid; place-items: center; color: #fff;
}
.check.on .dot { background: var(--teal); }

/* Importar mídia */
.import-row { display: flex; gap: 12px; align-items: stretch; }
.import-card {
  flex: none; width: 92px; min-height: 92px; background: #fff; border-radius: 10px; border: 0;
  box-shadow: 0 2px 10px rgba(11, 20, 26, .12); color: var(--teal); font-weight: 700; font-size: 14px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; align-self: center;
}
.import-card:hover { box-shadow: 0 3px 14px rgba(11, 20, 26, .18); }
.drop {
  flex: 1; border: 1.5px dashed #7cc4bc; border-radius: 10px; display: grid; place-items: center;
  min-height: 74px; padding: 8px; text-align: center; font-size: 13.5px; color: var(--text);
}
.drop.over { background: var(--teal-soft); }
.file-chip {
  display: flex; align-items: center; gap: 8px; background: var(--teal-soft); color: var(--teal-dark);
  padding: 6px 8px; border-radius: 8px; font-size: 12.5px; margin-top: 8px; max-width: 100%;
}
.file-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.thumb { max-width: 100%; max-height: 120px; border-radius: 8px; display: block; }

.audio-btns { display: flex; flex-direction: column; gap: 8px; padding-top: 22px; }
.audio-btn {
  display: flex; align-items: center; gap: 6px; justify-content: center; color: #fff; font-weight: 700;
  font-size: 14px; border: 1.5px solid #3b4a54; border-radius: 7px; padding: 6px 10px;
  background: linear-gradient(90deg, #24988d 0%, #2ba295 50%, #9fd9cf 100%);
}
.audio-btn.rec { background: var(--danger); border-color: #a33; }
audio { width: 100%; height: 34px; margin-top: 8px; }

.quick-card { border-radius: 10px; box-shadow: 0 2px 10px rgba(11, 20, 26, .1); padding: 10px 12px 12px; margin-bottom: 12px; }
.quick-preview { font-size: 12.5px; white-space: pre-wrap; margin-top: 6px; }
.quick-preview:empty { display: none; }
.link-btn { border: 0; background: none; color: var(--teal); font-weight: 600; font-size: 12.5px; padding: 6px 0 0; }
.link-btn:hover { text-decoration: underline; }
.sub-layer { position: fixed; inset: 0; z-index: 2147483002; display: grid; place-items: center; background: rgba(11, 20, 26, .28); }
.steps { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.step { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 12.5px; color: #3b4a54; }
.step b { font-weight: 600; min-width: 92px; }
.plan { background: var(--teal-soft); border-radius: 8px; padding: 9px 12px; font-size: 12.5px; color: var(--teal-dark); margin-bottom: 12px; }
.plan div + div { margin-top: 3px; }
.confirm-text { font-size: 14px; margin: 4px 0 6px; line-height: 1.5; }

/* ---------- Listas ---------- */
.list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.item {
  display: flex; gap: 12px; align-items: flex-start; border: 1px solid #e9edef; border-radius: 10px;
  padding: 10px 10px 10px 12px; background: #fff;
}
.item-icon { color: var(--teal); padding-top: 2px; flex: none; }
.item-body { flex: 1; min-width: 0; }
.item-title { font-weight: 600; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-text { color: #3b4a54; white-space: pre-wrap; word-break: break-word; font-size: 13px; }
.item-text.clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; }
.item-meta { color: var(--muted); font-size: 12px; margin-top: 3px; display: flex; flex-wrap: wrap; gap: 4px 10px; }
.item-actions { display: flex; flex: none; align-items: center; }
.status { font-size: 11px; font-weight: 700; border-radius: 5px; padding: 1px 6px; }
.status.pending { background: var(--teal-soft); color: var(--teal-dark); }
.status.sent { background: #e7f6ec; color: #1e7e45; }
.status.error, .status.late { background: #fdecea; color: #b03a35; }
.status.skipped { background: #eef1f3; color: #54656f; }
.status.sending { background: #fff4d6; color: #8a6400; }
.center { text-align: center; }
.muted { color: var(--muted); }
.note-card { background: #fff8d6; border-color: #f3e3a1; }

/* ---------- Emojis ---------- */
.emoji-pop {
  position: absolute; right: 0; top: 30px; z-index: 6; width: 268px; max-height: 210px; overflow: auto;
  background: #fff; border-radius: 10px; box-shadow: 0 6px 22px rgba(11, 20, 26, .2); padding: 8px;
  display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px;
}
.emoji-pop button { border: 0; background: none; font-size: 19px; padding: 3px; border-radius: 6px; }
.emoji-pop button:hover { background: #f0f2f5; }

/* ---------- Avisos ---------- */
.toasts { position: fixed; left: 50%; top: 18px; transform: translateX(-50%); z-index: 2147483001; display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; }
.toast { background: #3b4a54; color: #fff; padding: 9px 14px; border-radius: 8px; font-size: 13px; box-shadow: 0 4px 14px rgba(0, 0, 0, .2); max-width: 420px; }
.toast.ok { background: var(--teal-dark); }
.toast.err { background: var(--danger); }

.radio-list { display: flex; flex-direction: column; gap: 10px; margin: 6px 0 4px; }
.radio-list label { display: flex; gap: 8px; align-items: flex-start; font-size: 13.5px; cursor: pointer; }
.radio-list input { accent-color: var(--teal); margin-top: 2px; }

/* ---------- Barra de abas (topo) ---------- */
.topbar {
  height: 36px; display: flex; align-items: center; gap: 6px; padding: 0 10px 0 12px;
  background: #eef0f4; border-bottom: 1px solid #e3e6ea;
}
.top-icon { border: 0; background: none; color: #3b4a54; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; position: relative; flex: none; }
.top-icon:hover { background: #e2e6eb; }
.top-icon.active { color: var(--teal); }
.top-icon .dot { position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: var(--teal); }
.tabs-scroll { flex: 1; min-width: 0; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 4px 2px; }
.tabs-scroll::-webkit-scrollbar { display: none; }
.tab-pill {
  flex: none; display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 4px 0 9px;
  background: #fff; border: 1.5px solid #9fd6cf; border-radius: 10px; color: #111b21;
  font-weight: 700; font-size: 12px; white-space: nowrap; cursor: pointer;
}
.tab-pill:hover { background: #dff2ee; }
.tab-count {
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 7px; background: var(--teal); color: #fff;
  font-size: 10.5px; font-weight: 700; display: grid; place-items: center;
}
.tab-gear { display: none; color: #54656f; width: 18px; height: 18px; place-items: center; border-radius: 5px; }
.tab-pill:hover .tab-count { display: none; }
.tab-pill:hover .tab-gear { display: grid; }
.tab-pill.on { background: linear-gradient(90deg, #24988d 0%, #2ba295 55%, #8ad2c7 100%); color: #fff; border-color: #1f3d3a; }
.tab-pill.on .tab-gear { color: #fff; }
.tab-pill.on .tab-count { background: #fff; color: var(--teal-dark); }
.tabs-empty { color: var(--muted); font-size: 12.5px; align-self: center; white-space: nowrap; }

.dropdown {
  position: fixed; z-index: 2147483001; background: #fff; border-radius: 12px; min-width: 220px; max-width: 320px;
  box-shadow: 0 8px 28px rgba(11, 20, 26, .22); padding: 10px 6px 8px;
}
.dropdown-title { display: flex; align-items: center; gap: 6px; font-size: 18px; font-weight: 700; padding: 0 10px 6px; color: var(--text); }
.dropdown-title svg { color: var(--teal); flex: none; }
.dropdown-title span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; border: 0; background: none; padding: 6px 10px; border-radius: 7px; font-size: 14px; color: var(--text); }
.dropdown-item:hover { background: #f0f2f5; }
.dropdown-item.danger { color: var(--danger); }
.dropdown-item .tab-count { margin-left: auto; }

.popover {
  position: fixed; z-index: 2147483001; top: 8px; right: 12px; background: #fff; border-radius: 10px;
  box-shadow: 0 6px 24px rgba(11, 20, 26, .2); padding: 8px 10px 8px 14px; display: flex; align-items: center; gap: 12px;
}
.popover svg.lead { color: var(--teal); flex: none; }
.popover .input { width: 240px; border: 2px solid var(--teal); }
.btn-flat { border: 0; background: var(--teal); color: #fff; font-weight: 700; font-size: 13.5px; border-radius: 6px; padding: 8px 14px; }
.btn-flat:hover { background: var(--teal-dark); }

.notices { position: fixed; top: 44px; right: 12px; z-index: 2147483003; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
.notice { display: flex; align-items: center; gap: 10px; background: #fff; color: var(--text); padding: 12px 18px; border-radius: 10px; box-shadow: 0 6px 24px rgba(11, 20, 26, .16); font-size: 13.5px; min-width: 230px; }

/* Escolher contatos */
.picker-search { margin-bottom: 8px; }
.picker-info { color: var(--muted); font-size: 12px; margin-bottom: 6px; display: flex; justify-content: space-between; }
.picker-list { max-height: 46vh; overflow: auto; border: 1px solid #e9edef; border-radius: 10px; }
.picker-row { display: flex; align-items: center; gap: 10px; padding: 7px 12px; border-bottom: 1px solid #f2f4f5; cursor: pointer; }
.picker-row:last-child { border-bottom: 0; }
.picker-row:hover { background: #f7f9fa; }
.picker-row input { accent-color: var(--teal); width: 16px; height: 16px; flex: none; }
.avatar { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 700; font-size: 12px; flex: none; }
.picker-name { font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.picker-phone { font-size: 11.5px; color: var(--muted); }

/* Chave liga/desliga (Salvar contatos automaticamente) */
.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 4px 0 2px; }
.switch { position: relative; width: 38px; height: 22px; border-radius: 11px; border: 0; background: #c5cdd2; flex: none; transition: background .15s; }
.switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: left .15s; }
.switch.on { background: #25d366; }
.switch.on::after { left: 19px; }
`;
