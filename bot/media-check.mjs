/* Проверка загруженных файлов по СОДЕРЖИМОМУ, а не по имени и MIME, которые присылает клиент.
   Возвращает { ok, ext, kind } или { ok:false, error }. Чистая функция, тестируется без Telegram. */
export const LIMITS = { total: 19 * 1024 * 1024, photo: 12 * 1024 * 1024, audio: 19 * 1024 * 1024, video: 19 * 1024 * 1024, maxPx: 12000, minBytes: 64 };
export const OWNER_CAP = { files: 120, bytes: 120 * 1024 * 1024 }; // потолок на владельца: репозиторий не должен раздуваться

const ascii = (b, a, n) => b.slice(a, a + n).toString('latin1');
const be32 = (b, o) => b.readUInt32BE(o);

/* Определение формата по первым байтам. Возвращает { ext, kind, w?, h? } или null. */
export function sniff(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < LIMITS.minBytes) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', kind: 'photo', ...jpegSize(buf) };
  // PNG: 89 50 4E 47 0D 0A 1A 0A + IHDR
  if (buf.length > 24 && ascii(buf, 1, 3) === 'PNG' && buf[0] === 0x89 && ascii(buf, 12, 4) === 'IHDR') return { ext: 'png', kind: 'photo', w: be32(buf, 16), h: be32(buf, 20) };
  // WebP: RIFF....WEBP
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 4) === 'WEBP') return { ext: 'webp', kind: 'photo', ...webpSize(buf) };
  // MP3: ID3 или кадр MPEG (FF Ex/Fx)
  if (ascii(buf, 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 && (buf[1] & 0x06) !== 0)) return { ext: 'mp3', kind: 'audio' };
  // OGG: OggS
  if (ascii(buf, 0, 4) === 'OggS') return { ext: 'ogg', kind: 'audio' };
  // WAV: RIFF....WAVE
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 4) === 'WAVE') return { ext: 'wav', kind: 'audio' };
  // WebM/Matroska: 1A 45 DF A3
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { ext: 'webm', kind: 'video' };
  // ISO BMFF (MP4/M4A/MOV): ....ftyp<бренд>
  if (ascii(buf, 4, 4) === 'ftyp') {
    const brand = ascii(buf, 8, 4).toLowerCase();
    if (/^(m4a |m4b |f4a )/.test(brand + ' ')) return { ext: 'm4a', kind: 'audio' };
    return { ext: 'mp4', kind: 'video' }; // isom, mp41, mp42, avc1, qt, M4V и др. (mov/m4v приводятся к mp4)
  }
  return null;
}

function jpegSize(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    const len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return {};
}
function webpSize(b) {
  const f = ascii(b, 12, 4);
  if (f === 'VP8 ' && b.length > 30) return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (f === 'VP8L' && b.length > 25) { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  if (f === 'VP8X' && b.length > 30) return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
  return {};
}

/* Главная проверка. claimed = то, что заявил клиент ({ ext, kind }) для сообщений об ошибках и для сверки вида. */
export function checkMedia(buf, claimed = {}) {
  if (!Buffer.isBuffer(buf) || !buf.length) return { ok: false, error: 'empty' };
  if (buf.length > LIMITS.total) return { ok: false, error: 'size' };
  const s = sniff(buf);
  if (!s) return { ok: false, error: 'type' };                 // не фото/музыка/видео: html, exe, svg, zip, pdf и т.д.
  if (buf.length > LIMITS[s.kind]) return { ok: false, error: 'size' };
  if (s.kind === 'photo' && s.w && s.h && (s.w > LIMITS.maxPx || s.h > LIMITS.maxPx)) return { ok: false, error: 'dim' };
  if (s.kind === 'photo' && (s.w === 0 || s.h === 0)) return { ok: false, error: 'bad' };
  // вид (фото/аудио/видео) определяет содержимое, а не имя: переименованное видео не станет «фото»
  return { ok: true, ext: s.ext, kind: s.kind, w: s.w, h: s.h, renamed: !!(claimed.ext && claimed.ext !== s.ext && !(claimed.ext === 'mp4' && s.ext === 'm4a')) };
}

/* Потолок на владельца. idx = текущий index.json владельца. */
export function ownerRoom(idx, addBytes) {
  const files = idx.length + 1, bytes = idx.reduce((a, x) => a + (x.kb || 0) * 1024, 0) + addBytes;
  return files <= OWNER_CAP.files && bytes <= OWNER_CAP.bytes;
}
