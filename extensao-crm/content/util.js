// Funções pequenas usadas por toda a extensão.
window.CRM = window.CRM || {};

CRM.util = {
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  esc(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  pad(n) {
    return String(n).padStart(2, '0');
  },

  // "2026-10-10" + "14:30" -> timestamp local
  toTimestamp(date, time) {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
  },

  todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${CRM.util.pad(d.getMonth() + 1)}-${CRM.util.pad(d.getDate())}`;
  },

  formatDateTime(ts) {
    const d = new Date(ts);
    const p = CRM.util.pad;
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} às ${p(d.getHours())}:${p(d.getMinutes())}`;
  },

  formatDuration(seconds) {
    const s = Math.max(0, Math.round(seconds));
    return `${Math.floor(s / 60)}:${CRM.util.pad(s % 60)}`;
  },

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },

  blobToDataURL(blob) {
    return CRM.util.readFileAsDataURL(blob);
  },

  mediaKind(mime) {
    if (!mime) return 'document';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
  },

  firstName(name) {
    return String(name || '').trim().split(/\s+/)[0] || '';
  },
};
