// Acorda a aba do WhatsApp Web a cada 30 segundos para conferir os agendamentos.
// (O Chrome deixa as abas em segundo plano mais lentas; isso garante a pontualidade.)
const ALARM = 'crm-tick';

function ensureAlarm() {
  chrome.alarms.get(ALARM, (alarm) => {
    if (!alarm) chrome.alarms.create(ALARM, { periodInMinutes: 0.5 });
  });
}

chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);
ensureAlarm();

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM) return;
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: 'crm-tick' }).catch(() => {});
  }
});

// Páginas próprias da extensão abertas pelo WhatsApp (ex.: botão "Funil CRM").
// Se a página já estiver aberta, só volta para ela; senão abre uma aba nova ao lado.
const PAGES = ['funil/index.html'];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'open-page' || !PAGES.includes(msg.page)) return;
  openPage(msg.page, sender.tab).catch(() => {});
  sendResponse(true);
});

async function openPage(page, fromTab) {
  const url = chrome.runtime.getURL(page);
  try {
    const [open] = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] });
    if (open && open.tabId >= 0) {
      await chrome.tabs.update(open.tabId, { active: true });
      await chrome.windows.update(open.windowId, { focused: true });
      return;
    }
  } catch (_) {
    // segue e abre uma aba nova
  }
  const where = fromTab ? { index: fromTab.index + 1, openerTabId: fromTab.id, windowId: fromTab.windowId } : {};
  await chrome.tabs.create({ url, ...where });
}
