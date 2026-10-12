// Backup: lê um arquivo de backup, reconhece o formato e importa os dados.
//
// O arquivo é lido em pedaços, então o tamanho não importa: textos grandes (imagens, áudios,
// vídeos em base64 e partes trancadas) não são carregados na memória — ficam marcados como
// "pedaço do arquivo" ({ __ref }) e só são lidos na hora de gravar.
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

  const CHUNK = 4 * 1024 * 1024; // tamanho de cada pedaço lido do arquivo
  const BIG = 100 * 1024; // textos maiores que isso ficam no arquivo até a hora de usar

  const isRef = (v) => !!(v && typeof v === 'object' && v.__ref === true);
  const isBlob = (v) => v instanceof Blob; // arquivos guardados direto no navegador (IndexedDB)
  const sizeOf = (v) => (isRef(v) ? v.end - v.start : isBlob(v) ? v.size : typeof v === 'string' ? v.length : JSON.stringify(v === undefined ? null : v).length);

  // ---------- Leitor de JSON em pedaços ----------
  const isLit = (c) => (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 43 || c === 45 || c === 46;
  const joinBytes = (parts, len) => {
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  };

  async function parseBlob(blob, onProgress) {
    const dec = new TextDecoder();
    const stack = [];
    let root;
    let have = false;
    const put = (v) => {
      const top = stack[stack.length - 1];
      if (!top) {
        if (have) throw new Error('O arquivo não é um JSON válido.');
        root = v;
        have = true;
      } else if (top.arr) top.v.push(v);
      else {
        top.v[top.key] = v;
        top.key = null;
      }
    };
    // estado do texto ("string") em andamento
    let inStr = false, esc = false, sawEsc = false, parts = [], len = 0, start = 0, big = false, head = '';
    let lit = '';
    const total = blob.size;
    for (let base = 0; base < total; base += CHUNK) {
      const buf = new Uint8Array(await blob.slice(base, Math.min(total, base + CHUNK)).arrayBuffer());
      const n = buf.length;
      let i = 0;
      while (i < n) {
        if (inStr) {
          let j = i;
          for (; j < n; j++) {
            const c = buf[j];
            if (esc) esc = false;
            else if (c === 92) esc = sawEsc = true;
            else if (c === 34) break;
          }
          if (!big) {
            if (len + (j - i) > BIG) {
              big = true;
              head = dec.decode(joinBytes([...parts, buf.subarray(i, Math.min(j, i + 256))], len + Math.min(j - i, 256)).slice(0, 256));
              parts = [];
            } else parts.push(buf.slice(i, j));
          }
          len += j - i;
          if (j === n) break; // o texto continua no próximo pedaço
          inStr = false;
          const top = stack[stack.length - 1];
          let value;
          if (big) value = { __ref: true, blob, start, end: base + j, esc: sawEsc, head };
          else {
            const s = dec.decode(joinBytes(parts, len));
            value = sawEsc ? JSON.parse('"' + s + '"') : s;
          }
          parts = [];
          if (top && !top.arr && top.key === null) top.key = isRef(value) ? 'texto_grande' : value;
          else put(value);
          i = j + 1;
          continue;
        }
        const c = buf[i];
        if (lit) {
          if (isLit(c)) {
            lit += String.fromCharCode(c);
            i++;
            continue;
          }
          put(JSON.parse(lit));
          lit = '';
        }
        if (c === 34) {
          inStr = true;
          esc = sawEsc = big = false;
          parts = [];
          len = 0;
          head = '';
          start = base + i + 1;
        } else if (c === 123) {
          const o = {};
          put(o);
          stack.push({ v: o, arr: false, key: null });
        } else if (c === 91) {
          const a = [];
          put(a);
          stack.push({ v: a, arr: true });
        } else if (c === 125 || c === 93) {
          if (!stack.length) throw new Error('O arquivo não é um JSON válido.');
          stack.pop();
        } else if (isLit(c)) {
          lit = String.fromCharCode(c);
        }
        i++;
      }
      if (onProgress) onProgress(Math.min(total, base + CHUNK), total);
    }
    if (lit) put(JSON.parse(lit));
    if (inStr || stack.length) throw new Error('O arquivo termina no meio (está incompleto ou corrompido).');
    if (!have) throw new Error('O arquivo está vazio.');
    return root;
  }

  // Lê um texto grande que ficou no arquivo.
  async function resolveRef(ref) {
    const t = await ref.blob.slice(ref.start, ref.end).text();
    return ref.esc ? JSON.parse('"' + t + '"') : t;
  }

  // Troca os pedaços marcados pelo texto (só para dados pequenos, como listas de cadastro).
  async function materialize(v) {
    if (isRef(v)) return resolveRef(v);
    if (Array.isArray(v)) return Promise.all(v.map(materialize));
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v)) out[k] = await materialize(v[k]);
      return out;
    }
    return v;
  }

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

  const concat = (...parts) => joinBytes(parts, parts.reduce((s, p) => s + p.length, 0));

  // ---------- Partes trancadas (CryptoJS.AES: OpenSSL "Salted__", AES-256-CBC, chave por MD5) ----------
  const SALTED = 'U2FsdGVkX1'; // "Salted__" em base64
  const isLocked = (v) => (typeof v === 'string' && v.startsWith(SALTED)) || (isRef(v) && v.head.startsWith(SALTED));

  function b64ToBytes(s) {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // Bytes de um texto base64 (pequeno ou ainda no arquivo), em pedaços.
  async function* base64Chunks(v) {
    const clean = (t) => t.replace(/\\[nrt]/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
    if (!isRef(v)) {
      yield b64ToBytes(clean(v));
      return;
    }
    let carry = '';
    for (let p = v.start; p < v.end; p += CHUNK) {
      const t = carry + clean(await v.blob.slice(p, Math.min(v.end, p + CHUNK)).text());
      const keep = t.length - (t.length % 4);
      carry = t.slice(keep);
      if (keep) yield b64ToBytes(t.slice(0, keep));
    }
    if (carry) yield b64ToBytes(carry);
  }

  async function deriveKeys(password, salt) {
    const pass = new TextEncoder().encode(password);
    let derived = new Uint8Array(0);
    let prev = new Uint8Array(0);
    while (derived.length < 48) {
      prev = md5(concat(prev, pass, salt));
      derived = concat(derived, prev);
    }
    const key = await crypto.subtle.importKey('raw', derived.slice(0, 32), 'AES-CBC', false, ['encrypt', 'decrypt']);
    return { key, iv: derived.slice(32, 48) };
  }

  // Abre um pedaço do meio: acrescenta um bloco que vira um "final" válido, para o
  // navegador aceitar decifrar só uma parte (o texto aberto sai igual).
  async function decryptMiddle(key, iv, data) {
    const last = data.subarray(data.length - 16);
    const fake = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: last }, key, new Uint8Array(16).fill(16))).subarray(0, 16);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, concat(data, fake)));
  }

  // Parece o começo de um texto/JSON de verdade? (senha errada dá bytes sem sentido)
  function plausible(bytes) {
    try {
      const t = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, 4096), { stream: true }).trimStart();
      return t.length > 0 && /^[[{"0-9a-zA-Z\-]/.test(t);
    } catch (_) {
      return false;
    }
  }

  // Abre uma parte trancada. probe: só confere a senha no começo (rápido).
  // Devolve um Blob com o conteúdo aberto (ou true no probe), ou null se a senha não servir.
  async function decrypt(v, password, { probe = false } = {}) {
    let header = null;
    let keys = null;
    let iv = null;
    let pending = new Uint8Array(0);
    const out = [];
    try {
      for await (const chunk of base64Chunks(v)) {
        let data = concat(pending, chunk);
        if (!header) {
          if (data.length < 16) {
            pending = data;
            continue;
          }
          header = data.slice(0, 16);
          if (String.fromCharCode(...header.slice(0, 8)) !== 'Salted__') return null;
          keys = await deriveKeys(password, header.slice(8, 16));
          iv = keys.iv;
          data = data.slice(16);
        }
        const usable = Math.floor((data.length - 16) / 16) * 16; // guarda o último bloco para o final
        if (usable > 0) {
          const part = data.subarray(0, usable);
          const plain = await decryptMiddle(keys.key, iv, part);
          if (!out.length && !plausible(plain)) return null;
          if (probe) return true;
          out.push(plain);
          iv = part.slice(usable - 16);
        }
        pending = data.slice(Math.max(0, usable));
      }
      if (!header || !pending.length || pending.length % 16) return null;
      const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, keys.key, pending));
      if (!out.length && !plausible(plain)) return null;
      if (probe) return true;
      out.push(plain);
      return new Blob(out);
    } catch (_) {
      return null; // senha errada (enchimento inválido) ou texto quebrado
    }
  }

  // Lê o conteúdo aberto: JSON vira dados; texto comum fica como está.
  async function readOpened(blob, onProgress) {
    let tree;
    try {
      tree = await parseBlob(blob, onProgress);
    } catch (_) {
      return blob.size > BIG ? { __ref: true, blob, start: 0, end: blob.size, esc: false, head: await blob.slice(0, 256).text() } : blob.text();
    }
    // JSON guardado como texto dentro de outro JSON: abre mais uma vez.
    if (typeof tree === 'string' && /^\s*[[{]/.test(tree)) {
      try {
        tree = JSON.parse(tree);
      } catch (_) {
        // fica como texto
      }
    } else if (isRef(tree) && /^\s*[[{]/.test(tree.head)) {
      try {
        tree = await parseBlob(new Blob([await resolveRef(tree)]));
      } catch (_) {
        // fica como texto
      }
    }
    return tree;
  }

  // Tenta abrir todas as partes trancadas com cada senha. Confere primeiro na parte menor.
  async function unlockAll(obj, passwords, onProgress) {
    const locked = Object.keys(obj).filter((k) => isLocked(obj[k])).sort((a, b) => sizeOf(obj[a]) - sizeOf(obj[b]));
    if (!locked.length) return null;
    for (const pw of [...new Set(passwords.filter(Boolean))]) {
      if (!(await decrypt(obj[locked[0]], pw, { probe: true }))) continue;
      const first = await decrypt(obj[locked[0]], pw);
      if (!first) continue;
      const out = {};
      let ok = true;
      let done = 0;
      for (const k of Object.keys(obj)) {
        if (!isLocked(obj[k])) {
          out[k] = obj[k];
          continue;
        }
        if (onProgress) onProgress(++done, locked.length, k);
        const blob = k === locked[0] ? first : await decrypt(obj[k], pw);
        if (!blob) {
          ok = false;
          break;
        }
        out[k] = await readOpened(blob);
      }
      if (ok) return { password: pw, data: out };
    }
    return null;
  }

  // ---------- Reconhecer o arquivo ----------
  // file: File/Blob. Devolve { format: 'crm' | 'locked' | 'foreign' | 'unknown', ... }.
  async function inspect(file, onProgress) {
    let tree;
    try {
      tree = await parseBlob(file, onProgress);
    } catch (err) {
      return { format: 'unknown', reason: /JSON|Unexpected|token/i.test(err.message) ? 'O arquivo não é um JSON válido.' : err.message };
    }
    if (!tree || typeof tree !== 'object' || isRef(tree)) return { format: 'unknown', reason: 'O arquivo não tem dados no formato esperado.' };
    if (tree.app === 'crm-whatsapp' && tree.data && typeof tree.data === 'object') return { format: 'crm', backup: tree };
    const keys = Object.keys(tree);
    const sections = keys.map((k) => ({ key: k, label: FOREIGN_LABELS[k] || k, locked: isLocked(tree[k]), size: sizeOf(tree[k]) }));
    if (sections.some((s) => s.locked)) return { format: 'locked', obj: tree, sections };
    return { format: 'foreign', obj: tree, sections };
  }

  const parseText = (text) => inspect(new Blob([String(text || '')]));

  // Estrutura do arquivo, sem o conteúdo (nomes das partes, tipos e tamanhos), para diagnóstico.
  function describe(v, name = 'arquivo', depth = 0, lines = []) {
    const pad = '  '.repeat(depth);
    const mask = (k) => (/\d{6,}|@/.test(k) ? '‹número/id›' : k);
    const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' letras');
    if (lines.length > 400) return lines;
    if (isBlob(v)) {
      lines.push(`${pad}${name}: arquivo (${kb(v.size)}${v.type ? ', ' + v.type : ''})`);
    } else if (isRef(v) || typeof v === 'string') {
      lines.push(`${pad}${name}: texto (${kb(sizeOf(v))})${isLocked(v) ? ' TRANCADO' : ''}${(isRef(v) ? v.head : v).startsWith('data:') ? ' [arquivo data:]' : ''}`);
    } else if (Array.isArray(v)) {
      lines.push(`${pad}${name}: lista com ${v.length} itens`);
      const sample = v.find((x) => x && typeof x === 'object');
      if (sample && depth < 6) describe(sample, '[item]', depth + 1, lines);
    } else if (v && typeof v === 'object') {
      const keys = Object.keys(v);
      lines.push(`${pad}${name}: objeto com ${keys.length} partes`);
      if (depth < 6) {
        const masked = keys.filter((k) => /\d{6,}|@/.test(k));
        keys.filter((k) => !/\d{6,}|@/.test(k)).slice(0, 40).forEach((k) => describe(v[k], k, depth + 1, lines));
        if (masked.length) describe(v[masked[0]], `‹número/id› (×${masked.length})`, depth + 1, lines);
      }
    } else {
      lines.push(`${pad}${mask(name)}: ${v === null ? 'vazio' : typeof v}`);
    }
    return lines;
  }

  // ---------- Backup desta extensão ----------
  function summaryCRM(backup) {
    const d = backup.data;
    const rows = KEYS.filter((k) => d[k] !== undefined).map((k) => ({
      key: k, label: LABELS[k], count: Array.isArray(d[k]) ? d[k].length : d[k] && typeof d[k] === 'object' ? Object.keys(d[k]).length : 1,
    }));
    if (d.media && typeof d.media === 'object') rows.push({ key: 'media', label: LABELS.media, count: Object.keys(d.media).length });
    return rows;
  }

  // mode: 'merge' (soma ao que já existe; o que tiver o mesmo id é trocado) ou 'replace' (troca tudo).
  const plainName = (n) => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();

  async function importCRM(backup, mode, onProgress) {
    const d = backup.data;
    // Ao somar, abas e categorias com o mesmo nome (ex.: as abas padrão) viram uma só:
    // os contatos se juntam e o que apontava para a do backup passa a apontar para a que já existe.
    const remap = { tabs: {}, quickCategories: {} };
    const ORDER = ['tabs', 'quickCategories', ...KEYS.filter((k) => k !== 'tabs' && k !== 'quickCategories')];
    for (const k of ORDER) {
      if (d[k] === undefined) continue;
      let value = await materialize(d[k]);
      if (k === 'settings') {
        if (mode === 'replace') await store.set('settings', value);
        continue;
      }
      if (k === 'contactsCache') {
        await store.serialUpdate(k, {}, (cur) => (mode === 'replace' ? value : { ...cur, ...value }));
        continue;
      }
      if (!Array.isArray(value)) continue;
      if (mode === 'merge' && (k === 'tabs' || k === 'quickCategories')) {
        await store.serialUpdate(k, [], (cur) => {
          for (const x of value) {
            if (!x || cur.some((c) => c.id === x.id)) continue;
            const same = cur.find((c) => plainName(c.name) === plainName(x.name));
            if (!same) cur.push(x);
            else {
              remap[k][x.id] = same.id;
              if (k === 'tabs') same.chatIds = [...new Set([...(same.chatIds || []), ...(x.chatIds || [])])];
            }
          }
          for (const x of value) {
            const i = cur.findIndex((c) => x && c.id === x.id);
            if (i >= 0) cur[i] = k === 'tabs' ? { ...x, chatIds: [...new Set([...(cur[i].chatIds || []), ...(x.chatIds || [])])] } : x;
          }
          return cur;
        });
        continue;
      }
      if (k === 'clients') value = value.map((c) => (c && remap.tabs[c.kanbanColumnId] ? { ...c, kanbanColumnId: remap.tabs[c.kanbanColumnId] } : c));
      if (k === 'quickReplies') {
        value = value.map((q) => (q ? {
          ...q,
          categoryId: remap.quickCategories[q.categoryId] || q.categoryId,
          actions: (q.actions || []).map((a) => (a && remap.tabs[a.tabId] ? { ...a, tabId: remap.tabs[a.tabId] } : a)),
        } : q));
      }
      await store.serialUpdate(k, [], (cur) => {
        if (mode === 'replace') return value;
        const byId = new Map(cur.map((x) => [x.id, x]));
        value.forEach((x) => byId.set(x && x.id != null ? x.id : uid(), x));
        return [...byId.values()];
      });
    }
    if (d.media && typeof d.media === 'object') {
      const entries = Object.entries(d.media);
      let n = 0;
      for (const [id, m] of entries) {
        if (onProgress) onProgress(++n, entries.length);
        if (!m || !m.dataUrl) continue;
        await store.putMedia(id, { ...m, dataUrl: isRef(m.dataUrl) ? await resolveRef(m.dataUrl) : m.dataUrl });
      }
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
    media: ['file', 'arquivo', 'media', 'midia', 'base64', 'dataurl', 'data', 'src', 'url', 'link', 'image', 'imagem', 'audio', 'video', 'documento', 'document', 'blob', 'conteudo', 'content', 'body'],
    mime: ['mimetype', 'mime', 'contenttype', 'tipoarquivo', 'filetype', 'formato'],
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
  const headOf = (v) => (isRef(v) ? v.head : typeof v === 'string' ? v.slice(0, 256) : '');

  // Tipo do arquivo pelo começo do base64.
  function sniffMime(b64, type) {
    const h = b64.replace(/^data:[^,]*,/, '').trimStart();
    const sig = [['iVBORw0KGgo', 'image/png'], ['/9j/', 'image/jpeg'], ['R0lGOD', 'image/gif'], ['UklGR', type === 'audio' ? 'audio/wav' : 'image/webp'],
      ['T2dnUw', 'audio/ogg'], ['SUQz', 'audio/mpeg'], ['//u', 'audio/mpeg'], ['//s', 'audio/mpeg'], ['JVBERi', 'application/pdf'], ['GkXfo', 'video/webm']];
    const hit = sig.find(([s]) => h.startsWith(s));
    if (hit) return hit[1];
    if (/^AAAA/.test(h)) return type === 'audio' ? 'audio/mp4' : 'video/mp4';
    return { image: 'image/jpeg', sticker: 'image/webp', audio: 'audio/ogg', video: 'video/mp4' }[type] || 'application/octet-stream';
  }

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

  // Arquivo dentro do item: data:... ou base64 puro num campo de arquivo.
  function findMedia(x, type) {
    for (const [k, v] of Object.entries(x)) {
      if (isBlob(v) && v.size > 200) {
        const m = asText(pick(x, F.mime));
        return { src: v, raw: false, mime: v.type || (m.includes('/') ? m : sniffMime('', type)) };
      }
      const h = headOf(v);
      if (h.startsWith('data:')) return { src: v, raw: false, mime: h.slice(5, h.indexOf(';')) || sniffMime(h, type) };
      if (F.media.includes(norm(k)) && sizeOf(v) > 200 && /^[A-Za-z0-9+/=\s]+$/.test(h.slice(0, 200))) {
        const m = asText(pick(x, F.mime));
        return { src: v, raw: true, mime: m.includes('/') ? m : sniffMime(h, type) };
      }
    }
    return null;
  }

  // Converte um item de ação da outra ferramenta numa ação nossa (ou null + aviso).
  function mapAction(x, out) {
    if (typeof x === 'string') return x.trim() ? { type: 'text', text: x, typing: 0, wait: 0 } : null;
    if (!x || typeof x !== 'object' || isRef(x)) return null;
    let type = guessType(x);
    const typing = seconds(pick(x, F.typing));
    const wait = seconds(pick(x, F.wait));
    if (type === 'text') {
      const text = asText(pick(x, F.content));
      if (text.trim()) return { type: 'text', text, typing, wait };
      // Sem tipo e sem texto, mas com arquivo: o tipo vem do próprio arquivo.
      const found = !asText(pick(x, F.type)) && findMedia(x, 'document');
      if (!found) return null;
      const kind = found.mime.split('/')[0];
      type = ['image', 'audio', 'video'].includes(kind) ? kind : 'document';
    }
    if (type === 'wait' || type === 'typing' || type === 'recording') {
      const s = seconds(pick(x, F.wait.concat(F.typing, ['seconds', 'segundos', 'duration', 'duracao'])));
      return s ? { type, seconds: s } : null;
    }
    if (!type) {
      out.skipped.push('ação de tipo desconhecido');
      return null;
    }
    const caption = asText(pick(x, ['caption', 'legenda', 'text', 'texto', 'mensagem', 'message']));
    const media = findMedia(x, type);
    if (media) {
      const id = uid();
      const ext = media.mime.split('/')[1] || 'bin';
      const name = asText(pick(x, F.fileName)) || `${type}.${ext}`;
      out.media[id] = { ...media, name, type };
      out.mediaBytes += sizeOf(media.src);
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
    const out = { quickReplies: [], quickCategories: [], tabs: [], media: {}, mediaBytes: 0, skipped: [], linkedMedia: 0 };
    const catByRef = new Map();
    const seen = new Set();
    const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o) && !isRef(o) && !isBlob(o);

    const looksQuick = (o) => isObj(o) && pick(o, F.title) !== undefined &&
      (typeof pick(o, F.content) === 'string' || Array.isArray(pick(o, F.actions)) || !!findMedia(o, guessType(o) || 'image'));
    const looksCat = (o) => isObj(o) && typeof pick(o, F.title) === 'string' &&
      pick(o, F.color) !== undefined && typeof pick(o, F.content) !== 'string';
    const looksTab = (o) => isObj(o) && typeof pick(o, F.title) === 'string' &&
      Array.isArray(pick(o, F.chats)) && pick(o, F.chats).some((v) => chatIdOf(v));
    const items = (node) => (Array.isArray(node) ? node : isObj(node) ? Object.values(node) : []);
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
      if (typeof ref === 'object') return (isObj(ref) && addCat(ref)) || parentCat;
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
      if (depth > 8 || !node || typeof node !== 'object' || isRef(node)) return;
      const list = items(node);
      if (share(list, looksCat)) list.filter(looksCat).forEach(addCat);
      list.forEach((v) => walkCats(v, depth + 1));
    })(root, 0);

    // 2ª volta: respostas rápidas e abas.
    (function walk(node, depth, parentCat) {
      if (depth > 8 || !node || typeof node !== 'object' || isRef(node)) return;
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
        if (!v || typeof v !== 'object' || isRef(v) || seen.has(v)) return;
        const cat = looksCat(v) ? addCat(v) : parentCat;
        walk(v, depth + 1, cat);
      });
    })(root, 0, null);

    return out;
  }

  function summaryForeign(m) {
    return [
      { key: 'quickReplies', label: LABELS.quickReplies, count: m.quickReplies.length, sample: m.quickReplies.slice(0, 6).map((q) => q.title) },
      { key: 'quickCategories', label: LABELS.quickCategories, count: m.quickCategories.length, sample: m.quickCategories.slice(0, 6).map((c) => c.name) },
      { key: 'tabs', label: LABELS.tabs, count: m.tabs.length, sample: m.tabs.slice(0, 6).map((t) => `${t.name} (${t.chatIds.length})`) },
      { key: 'media', label: LABELS.media, count: Object.keys(m.media).length, sample: [] },
    ];
  }

  // Grava um arquivo importado (lê do backup só agora). Áudio que não é OGG vira mensagem de voz.
  async function saveMedia(id, m) {
    let dataUrl;
    if (isBlob(m.src)) dataUrl = await CRM.util.blobToDataURL(m.src.type ? m.src : new Blob([m.src], { type: m.mime }));
    else {
      const text = isRef(m.src) ? await resolveRef(m.src) : m.src;
      dataUrl = m.raw ? `data:${m.mime};base64,${text.replace(/\s/g, '')}` : text;
    }
    let mime = m.mime;
    let name = m.name;
    if (m.type === 'audio' && !/ogg/i.test(mime)) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const ogg = await CRM.audio.toOggOpus(blob);
        dataUrl = await CRM.util.blobToDataURL(ogg.blob);
        mime = 'audio/ogg';
        name = 'audio.ogg';
      } catch (_) {
        // mantém o áudio original
      }
    }
    await store.putMedia(id, { dataUrl, name, mime });
  }

  // Soma ao que já existe. Não repete resposta com o mesmo título e as mesmas ações,
  // nem categoria/aba com o mesmo nome (junta os contatos da aba).
  async function importForeign(m, onProgress) {
    // Compara pelo conteúdo, sem depender da ordem dos campos (o Chrome guarda em ordem alfabética).
    const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
    const keyOf = (q) => (q.title || '').trim().toLowerCase() + '|' + JSON.stringify(canon((q.actions || []).map(({ mediaId, ...rest }) => rest)));

    const cats = await store.get('quickCategories', []);
    const catMap = new Map(); // id importado -> id final
    for (const c of m.quickCategories) {
      const same = cats.find((x) => plainName(x.name) === plainName(c.name));
      if (same) catMap.set(c.id, same.id);
      else {
        cats.push(c);
        catMap.set(c.id, c.id);
      }
    }
    await store.set('quickCategories', cats);

    // Só as respostas novas; os arquivos delas são gravados um de cada vez.
    const existing = new Set((await store.get('quickReplies', [])).map(keyOf));
    const fresh = [];
    for (const q of m.quickReplies) {
      const key = keyOf(q);
      if (existing.has(key)) continue;
      existing.add(key);
      fresh.push(q);
    }
    const ids = fresh.flatMap((q) => q.actions.map((a) => a.mediaId).filter(Boolean));
    let n = 0;
    const failed = new Set();
    for (const id of ids) {
      if (onProgress) onProgress(++n, ids.length);
      try {
        await saveMedia(id, m.media[id]);
      } catch (_) {
        failed.add(id);
      }
    }
    const now = Date.now();
    await store.serialUpdate('quickReplies', [], (all) => all.concat(fresh.map((q) => ({
      ...q,
      actions: q.actions.filter((a) => !failed.has(a.mediaId)),
      categoryId: q.categoryId ? catMap.get(q.categoryId) || null : null,
      uses: 0, createdAt: now, updatedAt: now,
    })).filter((q) => q.actions.length)));

    await store.serialUpdate('tabs', [], (all) => {
      for (const t of m.tabs) {
        const same = all.find((x) => plainName(x.name) === plainName(t.name));
        if (same) same.chatIds = [...new Set([...(same.chatIds || []), ...t.chatIds])];
        else all.push(t);
      }
      return all;
    });
    return { added: fresh.length, media: ids.length - failed.size, failedMedia: failed.size };
  }

  // ---------- Procurar dados de outra ferramenta neste navegador ----------
  // Extensões que funcionam dentro do WhatsApp Web às vezes guardam os dados no próprio site
  // (localStorage e IndexedDB de web.whatsapp.com), que esta extensão também consegue ler.
  // Os bancos do próprio WhatsApp ficam de fora. Nada sai do computador.
  const WA_DBS = /^(model-storage|signal-storage|wawc|wawc_db_enc|lru-media-storage-idb|jobs-storage|offd-storage|logs|fts-storage.*|spellcheck-storage|keyval-store|workbox-.*|wa-.*-storage)$/i;
  const MAX_RECORDS = 20000; // por tabela

  // Arquivos binários viram Blob (o resto continua igual).
  function toPlain(v, depth = 0) {
    if (v instanceof ArrayBuffer) return new Blob([v]);
    if (ArrayBuffer.isView(v)) return new Blob([v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)]);
    if (v instanceof Date) return v.toISOString();
    if (depth > 12 || !v || typeof v !== 'object' || isBlob(v)) return v;
    if (Array.isArray(v)) return v.map((x) => toPlain(x, depth + 1));
    const out = {};
    for (const k of Object.keys(v)) out[k] = toPlain(v[k], depth + 1);
    return out;
  }

  const req = (r) => new Promise((ok, fail) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });

  async function readDatabase(name) {
    const db = await new Promise((ok, fail) => {
      const r = indexedDB.open(name);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => fail(r.error);
      r.onblocked = () => fail(new Error('banco ocupado'));
      r.onupgradeneeded = () => {
        // o banco não existia: não cria nada
        r.transaction.abort();
      };
    });
    const tables = {};
    let count = 0;
    try {
      for (const store of db.objectStoreNames) {
        const tx = db.transaction(store, 'readonly');
        const rows = await req(tx.objectStore(store).getAll(undefined, MAX_RECORDS));
        tables[store] = toPlain(rows);
        count += rows.length;
      }
    } finally {
      db.close();
    }
    return { tables, count };
  }

  // Devolve { data, sources: [{ where, name, count }] } com tudo o que não é do WhatsApp.
  async function scanBrowser(onStep) {
    const data = {};
    const sources = [];
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const raw = localStorage.getItem(k);
      if (!raw || raw.length < 20) continue;
      let v = raw;
      try {
        v = JSON.parse(raw);
      } catch (_) {
        // texto comum
      }
      ls[k] = v;
    }
    if (Object.keys(ls).length) {
      data.localStorage = ls;
      sources.push({ where: 'Armazenamento do site', name: 'localStorage', count: Object.keys(ls).length });
    }
    let names = [];
    try {
      names = (await indexedDB.databases()).map((d) => d.name).filter((n) => n && !WA_DBS.test(n));
    } catch (_) {
      // navegador sem a lista de bancos
    }
    data.indexedDB = {};
    for (const name of names) {
      if (onStep) onStep(name);
      try {
        const { tables, count } = await readDatabase(name);
        data.indexedDB[name] = tables;
        sources.push({ where: 'Banco do site', name, count });
      } catch (err) {
        sources.push({ where: 'Banco do site', name, count: 0, error: err.message });
      }
    }
    return { data, sources };
  }

  return {
    scanBrowser,
    inspect, parseText, parseBlob, resolveRef, decrypt, unlockAll, describe, isRef,
    summaryCRM, importCRM, mapForeign, summaryForeign, importForeign, LABELS, KEYS, md5,
  };
})();
