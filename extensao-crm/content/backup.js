// Backup: lê um arquivo de backup, reconhece o formato e importa os dados.
//
// Formatos reconhecidos:
//  1) Backup desta extensão: { app: 'crm-whatsapp', type: 'backup', data: { quickReplies, ... , media } }
//  2) Backup de outra ferramenta com as partes trancadas (criptografia AES do tipo "Salted__",
//     como o exemplo recebido). Só abre com a senha/chave certa.
//  3) Dados abertos de outra ferramenta (JSON comum): procura respostas rápidas, categorias e abas.
CRM.backup = (() => {
  const { uid } = CRM.util;
  const store = CRM.store;

  // Partes do nosso banco que entram no backup (as mídias vão em "media").
  const KEYS = ['quickReplies', 'quickCategories', 'tabs', 'clients', 'notes', 'schedules', 'renewals', 'reports', 'settings', 'contactsCache'];
  const LABELS = {
    quickReplies: 'Respostas rápidas', quickCategories: 'Categorias', tabs: 'Abas (Kanban)', clients: 'Cadastros de clientes',
    notes: 'Anotações', schedules: 'Mensagens agendadas', renewals: 'Renovações', reports: 'Relatório de envios',
    settings: 'Configurações', contactsCache: 'Nomes dos contatos', media: 'Arquivos (imagens, áudios…)',
  };
  // Nomes das partes vistas no backup da outra ferramenta.
  const FOREIGN_LABELS = { agrupamentos: 'Agrupamentos', groupments: 'Agrupamentos (groupments)', relatorio: 'Relatório' };

  // ---------- MD5 (só para abrir backups no padrão CryptoJS/OpenSSL) ----------
  function md5(bytes) {
    const K = new Int32Array(64);
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    const n = bytes.length;
    const total = ((n + 8) >> 6) + 1;
    const w = new Int32Array(total * 16);
    for (let i = 0; i < n; i++) w[i >> 2] |= bytes[i] << ((i % 4) * 8);
    w[n >> 2] |= 0x80 << ((n % 4) * 8);
    w[total * 16 - 2] = n * 8;
    let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    for (let blk = 0; blk < w.length; blk += 16) {
      let a = a0, b = b0, c = c0, d = d0;
      for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) { f = (b & c) | (~b & d); g = i; }
        else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
        else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
        else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        const tmp = d;
        d = c;
        c = b;
        const x = (a + f + K[i] + w[blk + g]) | 0;
        const s = S[(i >> 4) * 4 + (i % 4)];
        b = (b + ((x << s) | (x >>> (32 - s)))) | 0;
        a = tmp;
      }
      a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
    }
    const out = new Uint8Array(16);
    [a0, b0, c0, d0].forEach((v, j) => { for (let k = 0; k < 4; k++) out[j * 4 + k] = (v >>> (8 * k)) & 255; });
    return out;
  }

  const concat = (...parts) => {
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
    let o = 0;
    parts.forEach((p) => { out.set(p, o); o += p.length; });
    return out;
  };

  const SALTED = 'U2FsdGVkX1'; // "Salted__" em base64
  const isLocked = (v) => typeof v === 'string' && v.startsWith(SALTED);

  // Abre um texto trancado no padrão CryptoJS.AES (OpenSSL "Salted__", AES-256-CBC, chave por MD5).
  // Devolve o texto aberto, ou null se a senha não servir.
  async function unlock(b64, password) {
    let raw;
    try {
      raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } catch (_) {
      return null;
    }
    if (raw.length < 32) return null;
    const salt = raw.slice(8, 16);
    const pass = new TextEncoder().encode(password);
    let derived = new Uint8Array(0);
    let prev = new Uint8Array(0);
    while (derived.length < 48) {
      prev = md5(concat(prev, pass, salt));
      derived = concat(derived, prev);
    }
    try {
      const key = await crypto.subtle.importKey('raw', derived.slice(0, 32), 'AES-CBC', false, ['decrypt']);
      const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: derived.slice(32, 48) }, key, raw.slice(16));
      return new TextDecoder('utf-8', { fatal: true }).decode(plain);
    } catch (_) {
      return null;
    }
  }

  const tryJSON = (text) => {
    try {
      return JSON.parse(text);
    } catch (_) {
      return undefined;
    }
  };

  // Tenta abrir todas as partes trancadas com cada senha. Confere primeiro na parte menor.
  async function unlockAll(obj, passwords) {
    const locked = Object.keys(obj).filter((k) => isLocked(obj[k])).sort((a, b) => obj[a].length - obj[b].length);
    for (const pw of passwords.filter(Boolean)) {
      const first = await unlock(obj[locked[0]], pw);
      if (first == null) continue;
      const out = {};
      let ok = true;
      for (const k of Object.keys(obj)) {
        if (!isLocked(obj[k])) {
          out[k] = obj[k];
          continue;
        }
        const text = k === locked[0] ? first : await unlock(obj[k], pw);
        if (text == null) {
          ok = false;
          break;
        }
        const parsed = tryJSON(text);
        out[k] = parsed === undefined ? text : parsed;
      }
      if (ok) return { password: pw, data: out };
    }
    return null;
  }

  // ---------- Reconhecer o arquivo ----------
  // Devolve { format: 'crm' | 'locked' | 'foreign' | 'unknown', ... }.
  function parse(text) {
    const obj = tryJSON(String(text || '').replace(/^﻿/, ''));
    if (obj === undefined || obj === null || typeof obj !== 'object') return { format: 'unknown', reason: 'O arquivo não é um JSON válido.' };
    if (obj.app === 'crm-whatsapp' && obj.data && typeof obj.data === 'object') return { format: 'crm', backup: obj };
    const keys = Object.keys(obj);
    const locked = keys.filter((k) => isLocked(obj[k]));
    if (locked.length) {
      return {
        format: 'locked',
        obj,
        sections: keys.map((k) => ({ key: k, label: FOREIGN_LABELS[k] || k, locked: isLocked(obj[k]), size: JSON.stringify(obj[k]).length })),
      };
    }
    return { format: 'foreign', obj };
  }

  // ---------- Resumo do backup desta extensão ----------
  function summaryCRM(backup) {
    const d = backup.data;
    const rows = KEYS.filter((k) => d[k] !== undefined).map((k) => ({
      key: k, label: LABELS[k], count: Array.isArray(d[k]) ? d[k].length : d[k] && typeof d[k] === 'object' ? Object.keys(d[k]).length : 1,
    }));
    if (d.media && typeof d.media === 'object') rows.push({ key: 'media', label: LABELS.media, count: Object.keys(d.media).length });
    return rows;
  }

  // mode: 'merge' (soma ao que já existe; o que tiver o mesmo id é trocado) ou 'replace' (troca tudo).
  async function importCRM(backup, mode) {
    const d = backup.data;
    for (const k of KEYS) {
      if (d[k] === undefined) continue;
      if (k === 'settings') {
        if (mode === 'replace') await store.set('settings', d.settings);
        continue;
      }
      if (k === 'contactsCache') {
        await store.serialUpdate(k, {}, (cur) => (mode === 'replace' ? d[k] : { ...cur, ...d[k] }));
        continue;
      }
      if (!Array.isArray(d[k])) continue;
      await store.serialUpdate(k, [], (cur) => {
        if (mode === 'replace') return d[k];
        const byId = new Map(cur.map((x) => [x.id, x]));
        d[k].forEach((x) => byId.set(x && x.id != null ? x.id : uid(), x));
        return [...byId.values()];
      });
    }
    if (d.media && typeof d.media === 'object') {
      for (const [id, m] of Object.entries(d.media)) if (m && m.dataUrl) await store.putMedia(id, m);
    }
  }

  // ---------- Dados abertos de outra ferramenta (melhor palpite) ----------
  const norm = (k) => String(k).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const pick = (o, names) => {
    for (const k of Object.keys(o)) if (names.includes(norm(k)) && o[k] != null && o[k] !== '') return o[k];
    return undefined;
  };
  const F = {
    title: ['title', 'titulo', 'nome', 'name', 'atalho', 'shortcut', 'label', 'nomeresposta', 'tituloresposta'],
    content: ['text', 'texto', 'mensagem', 'message', 'msg', 'content', 'conteudo', 'body', 'resposta', 'answer', 'caption', 'legenda', 'value', 'valor'],
    actions: ['actions', 'acoes', 'acao', 'mensagens', 'messages', 'steps', 'etapas', 'itens', 'items', 'sequence', 'sequencia', 'fluxo', 'respostas'],
    color: ['color', 'cor', 'colour', 'hex', 'background', 'bgcolor', 'corhex'],
    catRef: ['categoryid', 'categoriaid', 'category', 'categoria', 'agrupamento', 'agrupamentoid', 'groupid', 'group', 'grupo', 'grupoid', 'folder', 'pasta', 'tag'],
    chats: ['chats', 'chatids', 'contatos', 'contacts', 'members', 'membros', 'numeros', 'numbers', 'ids', 'conversas', 'clientes'],
    type: ['type', 'tipo', 'kind', 'mediatype', 'tipomensagem'],
    media: ['file', 'arquivo', 'media', 'midia', 'base64', 'dataurl', 'src', 'url', 'link', 'image', 'imagem', 'audio', 'video', 'documento', 'document'],
    fileName: ['filename', 'nomearquivo', 'name', 'nome'],
    typing: ['typing', 'digitando', 'typingtime', 'tempodigitando', 'digitar', 'composing', 'delaydigitando', 'tempodigitacao'],
    wait: ['wait', 'aguardar', 'aguarde', 'delay', 'espera', 'intervalo', 'tempo', 'timeout', 'sleep', 'delaynext', 'proximaacao', 'tempoespera'],
    id: ['id', '_id', 'uuid', 'key', 'codigo'],
  };

  const seconds = (v) => {
    const n = Number(v);
    if (!isFinite(n) || n <= 0) return 0;
    return Math.min(600, Math.round(n > 600 ? n / 1000 : n)); // números grandes estão em milissegundos
  };
  const hexColor = (v) => {
    const s = String(v || '').trim();
    if (/^#?[0-9a-f]{6}$/i.test(s)) return '#' + s.replace('#', '');
    if (/^#?[0-9a-f]{3}$/i.test(s)) return '#' + s.replace('#', '').split('').map((c) => c + c).join('');
    const m = s.match(/rgba?\((\d+)\D+(\d+)\D+(\d+)/i);
    if (m) return '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join('');
    return '#24988d';
  };
  const asText = (v) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

  function guessType(x) {
    const t = norm(asText(pick(x, F.type)));
    if (/imag|image|foto|photo|picture|jpg|png/.test(t)) return 'image';
    if (/audio|voz|voice|ptt/.test(t)) return 'audio';
    if (/video/.test(t)) return 'video';
    if (/sticker|figur/.test(t)) return 'sticker';
    if (/doc|arquivo|file|pdf/.test(t)) return 'document';
    if (/digit|typing|compos/.test(t)) return 'typing';
    if (/grava|record/.test(t)) return 'recording';
    if (/espera|wait|aguard|delay|pausa|sleep/.test(t)) return 'wait';
    if (!t || /text|texto|mensagem|message|msg/.test(t)) return 'text';
    return null;
  }

  // Converte um item de ação da outra ferramenta numa ação nossa (ou null + aviso).
  function mapAction(x, out) {
    if (typeof x === 'string') return x.trim() ? { type: 'text', text: x, typing: 0, wait: 0 } : null;
    if (!x || typeof x !== 'object') return null;
    const type = guessType(x);
    const typing = seconds(pick(x, F.typing));
    const wait = seconds(pick(x, F.wait));
    if (type === 'text') {
      const text = asText(pick(x, F.content));
      return text.trim() ? { type: 'text', text, typing, wait } : null;
    }
    if (type === 'wait' || type === 'typing' || type === 'recording') {
      const s = seconds(pick(x, F.wait.concat(F.typing, ['seconds', 'segundos', 'duration', 'duracao'])));
      return s ? { type, seconds: s } : null;
    }
    if (!type) {
      out.skipped.push('ação de tipo desconhecido');
      return null;
    }
    // Mídia: só dá para trazer junto se o arquivo estiver dentro do backup (data:...).
    const m = Object.values(x).find((v) => typeof v === 'string' && v.startsWith('data:'));
    const caption = asText(pick(x, ['caption', 'legenda', 'text', 'texto', 'mensagem', 'message']));
    if (m) {
      const id = uid();
      const mime = m.slice(5, m.indexOf(';')) || 'application/octet-stream';
      const name = asText(pick(x, F.fileName)) || 'arquivo';
      out.media[id] = { dataUrl: m, name, mime };
      const a = { type, mediaId: id, name };
      if (caption && type !== 'sticker' && type !== 'audio') a.caption = caption;
      if (type === 'audio') Object.assign(a, { recording: typing, wait });
      return a;
    }
    const link = Object.values(x).find((v) => typeof v === 'string' && /^https?:\/\//i.test(v));
    if (link) {
      out.linkedMedia++;
      return { type: 'text', text: [caption, link].filter(Boolean).join('\n'), typing: 0, wait };
    }
    out.skipped.push('mídia sem o arquivo dentro do backup');
    return null;
  }

  function chatIdOf(v) {
    if (v && typeof v === 'object') v = v._serialized || pick(v, ['id', 'chatid', 'numero', 'number', 'phone', 'telefone', 'wid']);
    if (v && typeof v === 'object') v = v._serialized || v.user;
    const s = asText(v).trim();
    if (/@(c\.us|g\.us|lid|s\.whatsapp\.net)$/.test(s)) return s.replace('@s.whatsapp.net', '@c.us');
    const digits = s.replace(/\D/g, '');
    return digits.length >= 10 ? digits + '@c.us' : null;
  }

  // Procura no JSON listas que parecem respostas rápidas, categorias e abas.
  function mapForeign(root) {
    const out = { quickReplies: [], quickCategories: [], tabs: [], media: {}, skipped: [], linkedMedia: 0 };
    const catByRef = new Map();
    const seen = new Set();

    const looksQuick = (o) => o && typeof o === 'object' && !Array.isArray(o) && pick(o, F.title) !== undefined &&
      (typeof pick(o, F.content) === 'string' || Array.isArray(pick(o, F.actions)));
    const looksCat = (o) => o && typeof o === 'object' && !Array.isArray(o) && typeof pick(o, F.title) === 'string' &&
      pick(o, F.color) !== undefined && typeof pick(o, F.content) !== 'string';
    const looksTab = (o) => o && typeof o === 'object' && !Array.isArray(o) && typeof pick(o, F.title) === 'string' &&
      Array.isArray(pick(o, F.chats)) && pick(o, F.chats).some((v) => chatIdOf(v));
    const items = (node) => (Array.isArray(node) ? node : node && typeof node === 'object' ? Object.values(node) : []);
    const share = (list, test) => list.length && list.filter(test).length / list.length >= 0.6;

    function addCat(o) {
      const ref = pick(o, F.id);
      const name = asText(pick(o, F.title)).trim();
      if (!name) return null;
      const key = ref != null ? 'id:' + ref : 'name:' + name.toLowerCase();
      if (catByRef.has(key)) return catByRef.get(key);
      const cat = { id: uid(), name, color: hexColor(pick(o, F.color)) };
      out.quickCategories.push(cat);
      catByRef.set(key, cat);
      catByRef.set('name:' + name.toLowerCase(), cat);
      return cat;
    }

    function catFor(o, parentCat) {
      const ref = pick(o, F.catRef);
      if (ref == null) return parentCat;
      if (typeof ref === 'object') return addCat(ref) || parentCat;
      return catByRef.get('id:' + ref) || catByRef.get('name:' + String(ref).toLowerCase()) ||
        (typeof ref === 'string' && !/^[0-9a-f-]{8,}$/i.test(ref) ? addCat({ nome: ref }) : parentCat);
    }

    function addQuick(o, parentCat) {
      if (seen.has(o)) return;
      seen.add(o);
      const title = asText(pick(o, F.title)).trim();
      const list = pick(o, F.actions);
      const actions = (Array.isArray(list) ? list : [o]).map((x) => mapAction(x, out)).filter(Boolean);
      if (!title || !actions.length) return;
      const cat = catFor(o, parentCat);
      out.quickReplies.push({ id: uid(), title, categoryId: cat ? cat.id : null, actions });
    }

    // 1ª volta: categorias (para as respostas acharem a categoria pelo id).
    (function walkCats(node, depth) {
      if (depth > 8 || !node || typeof node !== 'object') return;
      const list = items(node);
      if (share(list, looksCat)) list.filter(looksCat).forEach(addCat);
      list.forEach((v) => walkCats(v, depth + 1));
    })(root, 0);

    // 2ª volta: respostas rápidas e abas.
    (function walk(node, depth, parentCat) {
      if (depth > 8 || !node || typeof node !== 'object') return;
      const list = items(node);
      if (share(list, looksTab)) {
        list.filter(looksTab).forEach((o) => {
          if (seen.has(o)) return;
          seen.add(o);
          const chatIds = [...new Set(pick(o, F.chats).map(chatIdOf).filter(Boolean))];
          out.tabs.push({ id: uid(), name: asText(pick(o, F.title)).trim(), chatIds, createdAt: Date.now() });
        });
      }
      if (share(list, looksQuick)) list.filter(looksQuick).forEach((o) => addQuick(o, parentCat));
      list.forEach((v) => {
        if (!v || typeof v !== 'object' || seen.has(v)) return;
        const cat = looksCat(v) ? addCat(v) : parentCat;
        walk(v, depth + 1, cat);
      });
    })(root, 0, null);

    // Só ficam as categorias que têm resposta (ou que vieram numa lista própria de categorias).
    return out;
  }

  function summaryForeign(m) {
    return [
      { key: 'quickReplies', label: LABELS.quickReplies, count: m.quickReplies.length, sample: m.quickReplies.slice(0, 6).map((q) => q.title) },
      { key: 'quickCategories', label: LABELS.quickCategories, count: m.quickCategories.length, sample: m.quickCategories.slice(0, 6).map((c) => c.name) },
      { key: 'tabs', label: LABELS.tabs, count: m.tabs.length, sample: m.tabs.slice(0, 6).map((t) => `${t.name} (${t.chatIds.length})`) },
    ];
  }

  // Soma ao que já existe. Não repete resposta com o mesmo título e as mesmas ações,
  // nem categoria/aba com o mesmo nome (junta os contatos da aba).
  async function importForeign(m) {
    // Compara pelo conteúdo, sem depender da ordem dos campos (o Chrome guarda em ordem alfabética).
    const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
    const strip = (acts) => JSON.stringify(canon(acts.map(({ mediaId, ...rest }) => rest)));
    const cats = await store.get('quickCategories', []);
    const catMap = new Map(); // id importado -> id final
    for (const c of m.quickCategories) {
      const same = cats.find((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase());
      if (same) catMap.set(c.id, same.id);
      else {
        cats.push(c);
        catMap.set(c.id, c.id);
      }
    }
    await store.set('quickCategories', cats);
    for (const [id, media] of Object.entries(m.media)) await store.putMedia(id, media);
    let added = 0;
    await store.serialUpdate('quickReplies', [], (all) => {
      const keys = new Set(all.map((q) => (q.title || '').trim().toLowerCase() + '|' + strip(q.actions || [])));
      for (const q of m.quickReplies) {
        const key = q.title.trim().toLowerCase() + '|' + strip(q.actions);
        if (keys.has(key)) continue;
        keys.add(key);
        all.push({ ...q, categoryId: q.categoryId ? catMap.get(q.categoryId) || null : null, uses: 0, createdAt: Date.now(), updatedAt: Date.now() });
        added++;
      }
      return all;
    });
    await store.serialUpdate('tabs', [], (all) => {
      for (const t of m.tabs) {
        const same = all.find((x) => x.name.trim().toLowerCase() === t.name.trim().toLowerCase());
        if (same) same.chatIds = [...new Set([...(same.chatIds || []), ...t.chatIds])];
        else all.push(t);
      }
      return all;
    });
    return { added };
  }

  return { parse, unlock, unlockAll, summaryCRM, importCRM, mapForeign, summaryForeign, importForeign, LABELS, KEYS, md5 };
})();
