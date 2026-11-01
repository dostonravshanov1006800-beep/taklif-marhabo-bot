/* Юнит-тесты проверки загрузок на настоящих файлах из tests/fixtures. */
import { readFileSync } from 'node:fs';
import { checkMedia, sniff, ownerRoom, LIMITS, OWNER_CAP } from '../bot/media-check.mjs';
const F = (n) => readFileSync(new URL('../tests/fixtures/' + n, import.meta.url));
const out = []; const T = (n, c, e) => out.push([n, !!c, e]);
const good = [['ok.jpg', 'jpg', 'photo'], ['ok.png', 'png', 'photo'], ['ok.webp', 'webp', 'photo'], ['ok.mp3', 'mp3', 'audio'], ['ok.ogg', 'ogg', 'audio'], ['ok.wav', 'wav', 'audio'], ['ok.m4a', 'm4a', 'audio'], ['ok.mp4', 'mp4', 'video'], ['ok.webm', 'webm', 'video'], ['ok.mov', 'mp4', 'video']];
for (const [f, ext, kind] of good) { const r = checkMedia(F(f)); T(`принимает ${f} как ${ext}/${kind}`, r.ok && r.ext === ext && r.kind === kind, r); }
const j = checkMedia(F('ok.jpg')), p = checkMedia(F('ok.png')), w = checkMedia(F('ok.webp'));
T('размеры JPEG 320x200', j.w === 320 && j.h === 200, [j.w, j.h]); T('размеры PNG 320x200', p.w === 320 && p.h === 200, [p.w, p.h]); T('размеры WebP 320x200', w.w === 320 && w.h === 200, [w.w, w.h]);
const bad = [['fake-jpg.html', 'type'], ['evil.svg', 'type'], ['fake.exe', 'type'], ['archive.zip', 'type'], ['doc.pdf', 'type'], ['empty.bin', 'empty'], ['tiny.jpg', 'type'], ['huge-dim.png', 'dim']];
for (const [f, err] of bad) { const r = checkMedia(F(f), { ext: 'jpg' }); T(`отклоняет ${f} (${err})`, !r.ok && r.error === err, r); }
const rv = checkMedia(F('ok.mp4'), { ext: 'jpg' }); T('mp4 под именем .jpg остаётся видео и помечается renamed', rv.ok && rv.kind === 'video' && rv.ext === 'mp4' && rv.renamed, rv);
const rp = checkMedia(F('ok.png'), { ext: 'jpg' }); T('png под именем .jpg сохраняется как png', rp.ok && rp.ext === 'png', rp);
T('честное имя не помечается renamed', checkMedia(F('ok.jpg'), { ext: 'jpg' }).renamed === false);
T('m4a под именем .mp4 не считается подменой', checkMedia(F('ok.m4a'), { ext: 'mp4' }).renamed === false);
T('фото больше 12 МБ отклоняется', checkMedia(Buffer.concat([F('ok.jpg'), Buffer.alloc(LIMITS.photo + 10)])).error === 'size');
T('файл больше 19 МБ отклоняется', checkMedia(Buffer.alloc(LIMITS.total + 1)).error === 'size');
T('не Buffer не принимается', checkMedia('строка').error === 'empty' && checkMedia(null).error === 'empty');
T('sniff: нули не распознаются', sniff(Buffer.alloc(500)) === null);
T('потолок владельца: пустой индекс принимает', ownerRoom([], 1000));
T('потолок владельца: 120 файлов достигнуто', !ownerRoom(Array.from({ length: OWNER_CAP.files }, () => ({ kb: 1 })), 10));
T('потолок владельца: объём превышен', !ownerRoom([{ kb: 119 * 1024 }], 2 * 1024 * 1024));
export default out;
if (process.argv[1] && process.argv[1].endsWith('test-media.mjs')) { let f = 0; for (const [n, c, e] of out) { if (!c) f++; console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(e))); } console.log(`\nИТОГО: ${out.length - f} ok, ${f} fail`); process.exit(f ? 1 : 0); }
