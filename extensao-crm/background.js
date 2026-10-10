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
