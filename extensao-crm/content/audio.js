// Áudio: converte qualquer áudio (gravado ou importado) para OGG/Opus,
// o formato das mensagens de voz do WhatsApp, e grava pelo microfone.
CRM.audio = (() => {
  const SAMPLE_RATE = 48000;
  const PRE_SKIP = 312;

  // ---------- CRC e páginas do contêiner Ogg ----------
  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let r = i << 24;
      for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
      table[i] = r >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0;
    for (let i = 0; i < bytes.length; i++) {
      crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) & 0xff) ^ bytes[i]]) >>> 0;
    }
    return crc;
  }

  function oggPage(packets, { flags, granule, serial, sequence }) {
    const lacing = [];
    for (const p of packets) {
      let n = p.length;
      while (n >= 255) {
        lacing.push(255);
        n -= 255;
      }
      lacing.push(n);
    }
    const bodyLength = packets.reduce((sum, p) => sum + p.length, 0);
    const page = new Uint8Array(27 + lacing.length + bodyLength);
    const view = new DataView(page.buffer);
    page.set([0x4f, 0x67, 0x67, 0x53], 0); // "OggS"
    page[4] = 0;
    page[5] = flags;
    view.setBigUint64(6, BigInt(granule), true);
    view.setUint32(14, serial, true);
    view.setUint32(18, sequence, true);
    view.setUint32(22, 0, true);
    page[26] = lacing.length;
    page.set(lacing, 27);
    let offset = 27 + lacing.length;
    for (const p of packets) {
      page.set(p, offset);
      offset += p.length;
    }
    view.setUint32(22, crc32(page), true);
    return page;
  }

  function opusHead(channels) {
    const head = new Uint8Array(19);
    const view = new DataView(head.buffer);
    head.set(new TextEncoder().encode('OpusHead'), 0);
    head[8] = 1;
    head[9] = channels;
    view.setUint16(10, PRE_SKIP, true);
    view.setUint32(12, SAMPLE_RATE, true);
    view.setInt16(16, 0, true);
    head[18] = 0;
    return head;
  }

  function opusTags() {
    const vendor = new TextEncoder().encode('crm-whatsapp');
    const tags = new Uint8Array(8 + 4 + vendor.length + 4);
    const view = new DataView(tags.buffer);
    tags.set(new TextEncoder().encode('OpusTags'), 0);
    view.setUint32(8, vendor.length, true);
    tags.set(vendor, 12);
    view.setUint32(12 + vendor.length, 0, true);
    return tags;
  }

  function muxOgg(packets, totalSamples) {
    const serial = (Math.random() * 0xffffffff) >>> 0;
    const pages = [];
    let sequence = 0;
    pages.push(oggPage([opusHead(1)], { flags: 0x02, granule: 0, serial, sequence: sequence++ }));
    pages.push(oggPage([opusTags()], { flags: 0, granule: 0, serial, sequence: sequence++ }));

    let samples = 0;
    let group = [];
    let segments = 0;
    const flush = (last) => {
      const granule = last ? PRE_SKIP + totalSamples : PRE_SKIP + samples;
      pages.push(oggPage(group, { flags: last ? 0x04 : 0, granule, serial, sequence: sequence++ }));
      group = [];
      segments = 0;
    };
    packets.forEach((packet, i) => {
      const segs = Math.floor(packet.data.length / 255) + 1;
      if (segments + segs > 255 || group.length >= 50) flush(false);
      group.push(packet.data);
      segments += segs;
      samples += packet.samples;
      if (i === packets.length - 1) flush(true);
    });
    if (!packets.length) flush(true);

    const total = pages.reduce((sum, p) => sum + p.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const p of pages) {
      out.set(p, offset);
      offset += p.length;
    }
    return out;
  }

  // ---------- Conversão ----------
  async function decodeToMono48k(arrayBuffer) {
    const ctx = new AudioContext();
    let decoded;
    try {
      decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      ctx.close();
    }
    const length = Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  }

  async function encodeOpus(pcm) {
    if (typeof AudioEncoder === 'undefined') {
      throw new Error('Este Chrome não tem suporte para converter áudio. Atualize o Chrome.');
    }
    const packets = [];
    let failure = null;
    const encoder = new AudioEncoder({
      output: (chunk) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        packets.push({ data, samples: Math.round(((chunk.duration || 20000) * SAMPLE_RATE) / 1e6) });
      },
      error: (e) => {
        failure = e;
      },
    });
    encoder.configure({ codec: 'opus', sampleRate: SAMPLE_RATE, numberOfChannels: 1, bitrate: 32000 });
    for (let i = 0; i < pcm.length; i += SAMPLE_RATE) {
      const slice = pcm.slice(i, Math.min(i + SAMPLE_RATE, pcm.length));
      const frame = new AudioData({
        format: 'f32',
        sampleRate: SAMPLE_RATE,
        numberOfFrames: slice.length,
        numberOfChannels: 1,
        timestamp: Math.round((i * 1e6) / SAMPLE_RATE),
        data: slice,
      });
      encoder.encode(frame);
      frame.close();
    }
    await encoder.flush();
    encoder.close();
    if (failure) throw failure;
    return packets;
  }

  async function toOggOpus(blobOrBuffer) {
    const buffer = blobOrBuffer instanceof ArrayBuffer ? blobOrBuffer : await blobOrBuffer.arrayBuffer();
    const pcm = await decodeToMono48k(buffer);
    const packets = await encodeOpus(pcm);
    const ogg = muxOgg(packets, pcm.length);
    return {
      blob: new Blob([ogg], { type: 'audio/ogg' }),
      seconds: pcm.length / SAMPLE_RATE,
    };
  }

  // ---------- Gravação pelo microfone ----------
  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.start();
    return {
      stop: () =>
        new Promise((resolve) => {
          recorder.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
          };
          recorder.stop();
        }),
      cancel: () => {
        recorder.onstop = () => stream.getTracks().forEach((t) => t.stop());
        recorder.stop();
      },
    };
  }

  return { toOggOpus, startRecording };
})();
