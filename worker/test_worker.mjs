import { createHmac } from 'node:crypto';
import w from './worker.js';
const kv = new Map();
const env = { BOT_TOKEN: '123456:TESTTOKEN', ADMIN_KEY: 'adm',
  INV: { async get(k, t) { const v = kv.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { kv.set(k, v); } } };
const sign = (user, token = env.BOT_TOKEN, age = 0) => {
  const p = { auth_date: String(Math.floor(Date.now() / 1000) - age), query_id: 'AAA', user: JSON.stringify(user) };
  const str = Object.keys(p).sort().map((k) => `${k}=${p[k]}`).join('\n');
  const sec = createHmac('sha256', 'WebAppData').update(token).digest();
  p.hash = createHmac('sha256', sec).update(str).digest('hex');
  return new URLSearchParams(p).toString();
};
let ok = 0, bad = 0; const T = (n, c) => { if (c) ok++; else { bad++; console.log('FAIL', n); } };
const call = (m, p, body, h = {}) => w.fetch(new Request('https://x' + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }), env);
const data = { i: 'abc123', a: 'Жавохир', b: 'Азиза', d: '2026-12-01', h: '18:00', l: 'ru', t: 'wedding', th: 'gold', tc: [['8600 1234 5678 9012', 'Aziza', 'uzcard']], cu: 1 };
const u1 = { id: 111, first_name: 'A' }, u2 = { id: 222, first_name: 'B' };

let r = await call('POST', '/api/inv', { init: sign(u1), data, v: 'v1' }); let j = await r.json();
T('сохранение 200', r.status === 200 && j.ok); T('slug транслитерация', j.slug === 'javohir-aziza' || j.slug === 'javohir-aziza'); const slug = j.slug;
r = await call('GET', '/api/inv/' + slug); j = await r.json();
T('чтение публичное', r.status === 200 && j.a === 'Жавохир' && j.o === '111'); T('карта 16 цифр и банк', j.tc && j.tc[0][0] === '8600123456789012' && j.tc[0][2] === 'Uzcard'); T('занавес для свадьбы', j.cu === 1); T('версия записана', j.v === 'v1');
r = await call('POST', '/api/inv', { init: sign(u1, 'WRONG:TOKEN'), data }); T('поддельный токен → 401', r.status === 401);
r = await call('POST', '/api/inv', { init: sign(u1).replace(/hash=.{4}/, 'hash=0000'), data }); T('битая подпись → 401', r.status === 401);
r = await call('POST', '/api/inv', { init: sign(u1, env.BOT_TOKEN, 86400 * 8), data }); T('просроченная → 401', r.status === 401);
r = await call('POST', '/api/inv', { data }); T('без подписи → 401', r.status === 401);
r = await call('POST', '/api/inv', { init: sign(u2), data: { ...data, i: 'zzz999' } }); j = await r.json(); T('тот же имена у другого → -2', r.status === 200 && j.slug === slug + '-2');
r = await call('POST', '/api/inv', { init: sign(u2), data: { ...data, i: 'abc123' } }); j = await r.json(); T('чужой id не затирает чужое', j.slug !== slug);
const orig = await (await call('GET', '/api/inv/' + slug)).json(); T('оригинал владельца 111 цел', orig.o === '111');
r = await call('POST', '/api/inv', { init: sign(u1), data: { ...data, a: 'Баходир' }, v: 'v2' }); j = await r.json(); T('переименование → новый slug', j.slug === 'bahodir-aziza');
r = await call('GET', '/api/inv/' + slug); j = await r.json(); T('старый slug отдаёт новый (редирект r)', r.status === 200 && j.a === 'Баходир');
r = await call('GET', '/api/mine', null, { 'x-tg-init': sign(u1) }); j = await r.json(); T('мои: 1 приглашение', r.status === 200 && Object.keys(j.pub).length === 1 && j.pub.abc123 === 'bahodir-aziza');
T('мои: версия приглашения приходит с сервера', j.ver && j.ver.abc123 === 'v2');
kv.delete('inv:bahodir-aziza');
r = await call('GET', '/api/mine', null, { 'x-tg-init': sign(u1) }); j = await r.json(); T('удалённое на сервере не числится опубликованным', r.status === 200 && !j.pub.abc123 && !(j.ver || {}).abc123);
r = await call('POST', '/api/inv', { init: sign(u1), data: { ...data, a: 'Баходир' }, v: 'v2' }); j = await r.json(); T('повторная публикация восстанавливает', r.status === 200 && j.ok);
r = await call('GET', '/api/mine'); T('мои без подписи → 401', r.status === 401);
r = await call('POST', '/api/inv', { init: sign(u1), data: { ...data, tc: [['1234', 'x', 'y']], u: 'javascript:alert(1)', m: 'http://evil' } }); j = await r.json(); const g = await (await call('GET', '/api/inv/' + j.slug)).json(); T('мусорные карта/ссылки отброшены', !g.tc && !g.u && !g.m);
r = await call('POST', '/api/inv', { init: sign(u1), data: { ...data, a: '<script>' + 'x'.repeat(200) } }); j = await r.json(); const g2 = await (await call('GET', '/api/inv/' + j.slug)).json(); T('длина имени ≤60', g2.a.length <= 60);
r = await call('POST', '/api/inv', { init: sign(u1), data: { i: '', a: 'x' } }); T('без id → 400', r.status === 400);
r = await call('GET', '/api/inv/nope'); T('нет приглашения → 404', r.status === 404);
r = await call('GET', '/api/inv/' + 'a'.repeat(80)); T('слишком длинный slug → 404', r.status === 404);
r = await call('POST', '/api/import', { items: [] }); T('импорт без ключа → 401', r.status === 401);
r = await call('POST', '/api/import', { items: [{ slug: 'old-one', data: { a: 'X', o: '5', i: 'q' } }], own: { 5: { q: 'old-one' } } }, { 'x-admin': 'adm' }); j = await r.json(); T('импорт с ключом', j.imported === 1);
r = await call('OPTIONS', '/api/inv'); T('CORS preflight', r.status === 204 && r.headers.get('access-control-allow-origin') === '*');
for (let k = 0; k < 40; k++) r = await call('POST', '/api/inv', { init: sign(u2), data: { ...data, i: 'q' + k } }); T('лимит частоты 429', r.status === 429 || r.status === 400);

r = await call('POST', '/api/inv', { init: sign(u1), data: { ...data, i: 'byid77', a: 'Тест', b: 'Ид' }, v: 'v9' }); j = await r.json();
r = await call('GET', '/api/byid/byid77'); const bj = await r.json(); T('byid находит приглашение', r.status === 200 && bj.slug === j.slug && bj.o.i === 'byid77');
r = await call('GET', '/api/byid/nonexist'); T('byid нет → 404', r.status === 404);
r = await call('GET', '/api/byid/BAD!'); T('byid плохой id → 404', r.status === 404);

// ---- QR в чат ----
const tgCalls = []; const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => { if (String(u).startsWith('https://api.telegram.org/')) { const f = o.body; tgCalls.push({ m: String(u).split('/').pop(), chat: f.get('chat_id'), cap: f.get('caption'), size: (await f.get(f.has('photo') ? 'photo' : 'document').arrayBuffer()).byteLength }); return new Response(JSON.stringify({ ok: true }), { status: 200 }); } return realFetch(u, o); };
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(400, 7)]).toString('base64');
const mySlug = 'bahodir-aziza';
r = await call('POST', '/api/inv', { init: sign(u1), data: { ...data, a: 'Баходир' }, v: 'v2' }); j = await r.json(); const qs = j.slug;
r = await call('POST', '/api/qr', { slug: qs, png: PNG }); T('qr без подписи → 401', r.status === 401);
r = await call('POST', '/api/qr', { init: sign(u2), slug: qs, png: PNG }); T('qr чужое приглашение → 403', r.status === 403);
r = await call('POST', '/api/qr', { init: sign(u1), slug: 'net-takogo', png: PNG }); T('qr несуществующее → 403', r.status === 403);
r = await call('POST', '/api/qr', { init: sign(u1), slug: qs, png: Buffer.from('not a png at all'.repeat(30)).toString('base64') }); T('qr не-PNG → 400', r.status === 400);
r = await call('POST', '/api/qr', { init: sign(u1), slug: qs, png: 'А!!' }); T('qr битый base64 → 400', r.status === 400);
r = await call('POST', '/api/qr', { init: sign(u1), slug: qs, png: PNG, lang: 'uz' }); j = await r.json();
T('qr владельцу → 200 ok', r.status === 200 && j.ok);
T('qr: фото и файл ушли в чат владельца (id подписи)', tgCalls.length === 2 && tgCalls[0].m === 'sendPhoto' && tgCalls[1].m === 'sendDocument' && tgCalls.every((c) => c.chat === String(u1.id)), JSON.stringify(tgCalls.map((c) => [c.m, c.chat])));
T('qr: подпись с именами и ссылкой бота', /Баходир/.test(tgCalls[0].cap) && /t\.me\/Taklifnomai_bot\?start=i_/.test(tgCalls[0].cap), tgCalls[0].cap);
T('qr: размер картинки сохранён', tgCalls[0].size === Buffer.from(PNG, 'base64').length);
r = await call('POST', '/api/qr', { init: sign(u1), slug: qs, png: PNG, web: 1 }); await r.json();
T('qr для браузера: ссылка на сайт', /github\.io\/taklif-marhabo-bot\/i\//.test(tgCalls[2].cap), tgCalls[2].cap);
for (let i = 0; i < 12; i++) r = await call('POST', '/api/qr', { init: sign(u1), slug: qs, png: PNG });
T('qr: лимит в час → 429', r.status === 429);
globalThis.fetch = realFetch;

// ---- удаление ----
const kvDel = (k) => kv.delete(k); env.INV.delete = async (k) => { kv.delete(k); };
env.INV.list = async ({ prefix }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) });
r = await call('POST', '/api/inv', { init: sign(u1), data: { ...data, i: 'del001', a: 'Удал', b: 'Ённый' }, v: 'd1' }); j = await r.json(); const dslug = j.slug;
r = await call('POST', '/api/inv', { init: sign(u1), data: { ...data, i: 'del001', a: 'Удал2', b: 'Ённый' }, v: 'd2' }); j = await r.json(); const dslug2 = j.slug;
T('перед удалением: старое имя редиректит на новое', dslug !== dslug2 && JSON.parse(kv.get('inv:' + dslug)).r === dslug2);
r = await call('POST', '/api/del', { id: 'del001' }); T('удаление без подписи → 401', r.status === 401);
r = await call('POST', '/api/del', { init: sign(u2), id: 'del001' }); j = await r.json(); T('чужой не удалит (ничего не найдено)', r.status === 200 && j.removed === 0 && !!kv.get('inv:' + dslug2));
r = await call('POST', '/api/del', { init: sign(u1), id: 'del001' }); j = await r.json(); T('владелец удалил: запись и редирект', r.status === 200 && j.ok && j.removed === 2, JSON.stringify(j));
r = await call('GET', '/api/inv/' + dslug2); T('после удаления гость видит 404', r.status === 404);
r = await call('GET', '/api/inv/' + dslug); T('старое имя тоже 404', r.status === 404);
r = await call('GET', '/api/byid/del001'); T('обратный ключ id убран', r.status === 404);
r = await call('GET', '/api/mine', null, { 'x-tg-init': sign(u1) }); j = await r.json(); T('в «моих» его больше нет', !j.pub.del001);
r = await call('POST', '/api/del', { init: sign(u1), id: 'del001' }); j = await r.json(); T('повторное удаление безопасно', r.status === 200 && j.ok);
console.log(`\nИТОГО: ${ok} ok, ${bad} fail`); process.exit(bad ? 1 : 0);
