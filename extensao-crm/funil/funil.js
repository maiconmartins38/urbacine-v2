// Funil CRM (aba própria, aberta pelo botão "Funil CRM" do menu da esquerda).
// Conta os clientes do Cadastro que estão com valor e atualiza sozinho quando algo muda.
(() => {
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
  const integer = new Intl.NumberFormat('pt-BR');
  const $ = (sel) => document.querySelector(sel);
  const pad = (n) => String(n).padStart(2, '0');

  // Só os clientes com valor maior que zero (em NUTRIR o valor é zerado).
  function summarize(clients) {
    const withValue = clients.filter((c) => Number(c.valueCents) > 0);
    const totalCents = withValue.reduce((sum, c) => sum + Number(c.valueCents), 0);
    return {
      registered: clients.length,
      contacts: withValue.length,
      totalCents,
      averageCents: withValue.length ? Math.round(totalCents / withValue.length) : 0,
      rate: clients.length ? withValue.length / clients.length : 0,
    };
  }

  async function render() {
    const { clients } = await chrome.storage.local.get('clients');
    const s = summarize(Array.isArray(clients) ? clients : []);
    $('[data-contacts]').textContent = integer.format(s.contacts);
    $('[data-rate]').textContent = percent.format(s.rate);
    $('[data-rate-sub]').textContent = `${integer.format(s.contacts)} de ${integer.format(s.registered)} cadastrados com valor`;
    $('[data-average]').textContent = money.format(s.averageCents / 100);
    $('[data-total]').textContent = money.format(s.totalCents / 100);
    const d = new Date();
    $('[data-updated]').textContent = `Atualizado às ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.clients) render();
  });
  render();
})();
