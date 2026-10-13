// Banco de dados da extensão: fica no próprio Chrome (chrome.storage.local).
// As mídias (imagens, áudios, arquivos) ficam em chaves separadas "media:<id>"
// para as listas continuarem leves.
CRM.store = (() => {
  const area = chrome.storage.local;
  let queue = Promise.resolve();

  // Serializa as escritas para duas alterações seguidas não se atropelarem.
  // A trava (navigator.locks) vale para todas as abas do WhatsApp Web abertas:
  // sem ela, duas abas gravando juntas podiam apagar o que a outra acabou de gravar.
  function serial(task) {
    const locked = () => (navigator.locks ? navigator.locks.request('crm-ext-store', () => task()) : task());
    const run = queue.then(locked, locked);
    queue = run.catch(() => {});
    return run;
  }

  async function get(key, fallback) {
    const data = await area.get(key);
    return data[key] === undefined ? fallback : data[key];
  }

  function set(key, value) {
    return area.set({ [key]: value });
  }

  function update(key, fallback, fn) {
    return serial(async () => {
      const current = await get(key, fallback);
      const next = await fn(current);
      await set(key, next);
      return next;
    });
  }

  const DEFAULT_SETTINGS = { lateMode: 'send' };

  return {
    get,
    set,
    serialUpdate: update,

    getSchedules: () => get('schedules', []),
    updateSchedules: (fn) => update('schedules', [], fn),
    upsertSchedule: (item) =>
      update('schedules', [], (list) => {
        const i = list.findIndex((s) => s.id === item.id);
        if (i >= 0) list[i] = item;
        else list.push(item);
        return list;
      }),
    deleteSchedule: async (id) => {
      const list = await update('schedules', [], (l) => l.filter((s) => s.id !== id));
      return list;
    },

    getNotes: () => get('notes', []),
    upsertNote: (item) =>
      update('notes', [], (list) => {
        const i = list.findIndex((n) => n.id === item.id);
        if (i >= 0) list[i] = item;
        else list.push(item);
        return list;
      }),
    deleteNote: (id) => update('notes', [], (l) => l.filter((n) => n.id !== id)),

    putMedia: (id, media) => set('media:' + id, media),
    getMedia: (id) => (id ? get('media:' + id, null) : Promise.resolve(null)),
    deleteMedia: (id) => (id ? area.remove('media:' + id) : Promise.resolve()),

    getClients: () => get('clients', []),
    updateClients: (fn) => update('clients', [], fn),

    getRenewals: () => get('renewals', []),
    updateRenewals: (fn) => update('renewals', [], fn),

    getReports: () => get('reports', []),
    addReport: (entry) =>
      update('reports', [], (list) => {
        list.unshift(entry);
        return list.slice(0, 500);
      }),
    clearReports: () => serial(() => area.set({ reports: [] })),

    getSettings: async () => ({ ...DEFAULT_SETTINGS, ...(await get('settings', {})) }),
    // Junta com o que está gravado (na fila travada), para uma aba não desfazer o que a outra mudou.
    saveSettings: (settings) => update('settings', {}, (current) => ({ ...current, ...settings })),

    onChange(callback) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') callback(changes);
      });
    },
  };
})();
