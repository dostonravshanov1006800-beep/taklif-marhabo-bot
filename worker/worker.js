// Taklifnoma API: Cloudflare Worker + KV. Запись только с проверенной подписью Telegram initData.
const LGS = ['ru', 'uz', 'en', 'kk'];
const BOT_NAME = 'Taklifnomai_bot';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-tg-init', 'access-control-max-age': '86400' };
const J = (o, s = 200, extra = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra } });

const TR = { 'ʻ':'','’':'','`':'','ʹ':'','‘':'',а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'j',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sh',ъ:'',ы:'i',ь:'',э:'e',ю:'yu',я:'ya',ў:'o',қ:'q',ғ:'g',ҳ:'h',ʼ:'',"'":'' };
const slugPart = (x) => String(x || '').toLowerCase().split('').map((c) => (c in TR ? TR[c] : c)).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
const cleanStr = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const okUrl = (u) => (/^https:\/\/[^\s<>"']{3,400}$/i.test(u || '') ? u : '');
const okMedia = (u) => (/^media\/\d{3,15}\/[a-z0-9]{4,20}\.(jpg|png|webp|mp3|m4a|ogg|wav|mp4|webm)$/i.test(u || '') ? u : okUrl(u));

function sanitizeInv(d, owner) {
  if (!d || typeof d !== 'object') return null;
  const o = {
    t: ['wedding', 'birthday', 'anniversary', 'jubilee', 'nikah', 'nikoh', 'navruz', 'other'].includes(d.t) ? d.t : 'wedding',
    l: LGS.includes(d.l) ? d.l : 'ru',
    a: cleanStr(d.a, 60), b: cleanStr(d.b, 60),
    d: /^\d{4}-\d{2}-\d{2}$/.test(d.d || '') ? d.d : '', h: /^\d{2}:\d{2}$/.test(d.h || '') ? d.h : '',
    pl: cleanStr(d.pl, 90), ad: cleanStr(d.ad, 120), m: okUrl(cleanStr(d.m, 400)), x: cleanStr(d.x, 400), dc: cleanStr(d.dc, 80), ct: cleanStr(d.ct, 60),
    dp: (Array.isArray(d.dp) ? d.dp : []).map((c) => String(c).toUpperCase()).filter((c) => /^#[0-9A-F]{6}$/.test(c)).slice(0, 8),
    k: BOT_NAME, o: String(owner), i: cleanStr(d.i, 12).replace(/[^a-z0-9]/gi, ''),
  };
  if (!o.a || !o.i) return null;
  if (d.w === 1 || d.w === true) o.w = 1;
  if ((d.cu === 1 || d.cu === true) && ['wedding', 'nikah', 'nikoh'].includes(o.t)) o.cu = 1;
  if (['gold', 'rose', 'cloud', 'ivory', 'velvet', 'green', 'midnight'].includes(d.th)) o.th = d.th;
  if (Array.isArray(d.tc)) {
    const BANKS = ['Uzcard', 'Humo', 'Visa', 'Mastercard'];
    const tc = d.tc.slice(0, 8).map((c) => {
      if (!Array.isArray(c)) return null;
      const num = String(c[0] == null ? '' : c[0]).replace(/\D/g, '');
      if (!/^\d{16}$/.test(num)) return null;
      const bank = BANKS.find((b) => b.toLowerCase() === String(c[2] || '').toLowerCase()) || 'Karta';
      return [num, cleanStr(c[1], 40), bank];
    }).filter(Boolean).slice(0, 3);
    if (tc.length) o.tc = tc;
  }
  if (d.u) { const u = okMedia(d.u); if (u) o.u = u; }
  if (d.p && typeof d.p === 'object') {
    const p = {}; const c = okMedia(d.p.c), q = okMedia(d.p.o);
    if (c) p.c = c; if (q) p.o = q;
    if (Array.isArray(d.p.g)) { const g = d.p.g.map(okMedia).filter(Boolean).slice(0, 6); if (g.length) p.g = g; }
    if (Array.isArray(d.p.v)) {
      const v = d.p.v.slice(0, 3).map((x) => { const u = okMedia(Array.isArray(x) ? x[0] : x); const o2 = Array.isArray(x) && x[1] === 'p' ? 'p' : 'l'; return u && /\.(mp4|webm)(\?|$)/i.test(u) ? [u, o2] : null; }).filter(Boolean);
      if (v.length) p.v = v;
    }
    if (Object.keys(p).length) o.p = p;
  }
  if (Array.isArray(d.st)) { const st = d.st.slice(0, 5).map((r) => [cleanStr(r && r[0], 24), cleanStr(r && r[1], 160)]).filter((r) => r[1]); if (st.length) o.st = st; }
  if (Array.isArray(d.pr)) { const pr = d.pr.slice(0, 10).map((r) => [cleanStr(r && r[0], 5), cleanStr(r && r[1], 80)]).filter((r) => r[1]); if (pr.length) o.pr = pr; }
  Object.keys(o).forEach((k) => (o[k] === '' || o[k] == null) && delete o[k]);
  return o;
}

// ---- проверка подписи Telegram Mini App (HMAC-SHA256, https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app) ----
const enc = new TextEncoder();
async function hmac(keyBytes, data) {
  const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, typeof data === 'string' ? enc.encode(data) : data));
}
const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
async function whyInit(initData, botToken) {
  try {
    if (!botToken) return 'no_bot_token_on_worker';
    if (!initData) return 'init_empty';
    const p = new URLSearchParams(initData);
    if (!p.get('hash')) return 'init_has_no_hash';
    const keys = [...p.keys()].filter((k) => k !== 'hash').sort().join(',');
    const hash = p.get('hash'); p.delete('hash');
    const str = [...p.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = await hmac(enc.encode('WebAppData'), botToken);
    const calc = hex(await hmac(secret, str));
    if (calc !== hash) return 'signature_mismatch(keys=' + keys + ',len=' + initData.length + ',tokenId=' + botToken.split(':')[0] + ')';
    const age = Math.floor(Date.now() / 1000) - Number(p.get('auth_date') || 0);
    return age >= -60 && age < 86400 * 7 ? 'ok' : 'expired(age=' + age + ')';
  } catch (e) { return 'error:' + e.message; }
}
async function verifyInit(initData, botToken) {
  try {
    if (!initData || !botToken || initData.length > 4096) return null;
    const p = new URLSearchParams(initData);
    const hash = p.get('hash'); if (!hash) return null;
    p.delete('hash');
    const str = [...p.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = await hmac(enc.encode('WebAppData'), botToken);
    const calc = hex(await hmac(secret, str));
    if (calc.length !== hash.length) return null;
    let diff = 0; for (let i = 0; i < calc.length; i++) diff |= calc.charCodeAt(i) ^ hash.charCodeAt(i);
    if (diff) return null;
    const age = Math.floor(Date.now() / 1000) - Number(p.get('auth_date') || 0);
    if (!(age >= -60 && age < 86400 * 7)) return null; // не старше 7 дней
    const user = JSON.parse(p.get('user') || 'null');
    return user && user.id ? String(user.id) : null;
  } catch { return null; }
}

async function pickSlug(env, o, owner) {
  const base = [slugPart(o.a), slugPart(o.b)].filter(Boolean).join('-') || 'taklif';
  let slug = base, n = 1;
  for (;;) {
    const cur = await env.INV.get('inv:' + slug, 'json');
    if (!cur) return slug;
    if (String(cur.o) === String(owner) && cur.i === o.i) return slug;
    n += 1; slug = `${base}-${n}`;
    if (n > 99) return `${base}-${crypto.randomUUID().slice(0, 4)}`;
  }
}

async function readBody(req, max = 200000) {
  const t = await req.text();
  if (t.length > max) throw new Error('big');
  return JSON.parse(t);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const path = url.pathname.replace(/\/+$/, '');
    try {
      if (path === '' || path === '/api' || path === '/api/health') return J({ ok: true, name: 'taklif-api' });

      // публичное чтение приглашения
      let m = /^\/api\/inv\/([a-z0-9-]{1,60})$/.exec(path);
      if (m && req.method === 'GET') {
        let slug = m[1];
        for (let i = 0; i < 3; i++) {
          const o = await env.INV.get('inv:' + slug, 'json');
          if (!o) return J({ error: 'not_found' }, 404, { 'cache-control': 'no-store' });
          if (o.r && /^[a-z0-9-]{1,60}$/.test(o.r)) { slug = o.r; continue; }
          return J(o, 200, { 'cache-control': 'public, max-age=5' });
        }
        return J({ error: 'not_found' }, 404);
      }

      // найти приглашение по внутреннему id (нужно боту для пожеланий гостей)
      m = /^\/api\/byid\/([a-z0-9]{3,12})$/.exec(path);
      if (m && req.method === 'GET') {
        const slug = await env.INV.get('id:' + m[1]);
        if (!slug) return J({ error: 'not_found' }, 404);
        const o = await env.INV.get('inv:' + slug, 'json');
        if (!o || o.r) return J({ error: 'not_found' }, 404);
        return J({ slug, o }, 200, { 'cache-control': 'public, max-age=5' });
      }

      // мои приглашения (по подписи)
      if (path === '/api/mine' && req.method === 'GET') {
        const owner = await verifyInit(req.headers.get('x-tg-init') || url.searchParams.get('init') || '', env.BOT_TOKEN);
        if (!owner) return J({ error: 'auth' }, 401);
        const ix = (await env.INV.get('own:' + owner, 'json')) || {};
        // версия каждого приглашения на сервере: мини-апп сверяет с локальной и сам видит, что устарело или удалено
        const pub = {}, ver = {};
        await Promise.all(Object.entries(ix).map(async ([id, slug]) => {
          const o = await env.INV.get('inv:' + slug, 'json');
          if (o) { pub[id] = slug; if (o.v) ver[id] = o.v; }
        }));
        return J({ ok: true, pub, ver }, 200, { 'cache-control': 'no-store' });
      }

      // QR прямо в чат: мини-апп присылает готовый PNG, воркер проверяет подпись и шлёт его владельцу через Telegram
      if (path === '/api/qr' && req.method === 'POST') {
        const body = await readBody(req, 400000);
        const owner = await verifyInit(body.init || req.headers.get('x-tg-init') || '', env.BOT_TOKEN);
        if (!owner) return J({ error: 'auth' }, 401);
        const slug = String(body.slug || '').toLowerCase();
        if (!/^[a-z0-9-]{2,60}$/.test(slug)) return J({ error: 'data' }, 400);
        const inv = await env.INV.get('inv:' + slug, 'json');
        if (!inv || String(inv.o) !== String(owner)) return J({ error: 'forbidden' }, 403);
        // не больше 12 QR в час на владельца
        const rk = 'rq:' + owner + ':' + Math.floor(Date.now() / 3600000);
        const rc = Number(await env.INV.get(rk)) || 0;
        if (rc >= 12) return J({ error: 'rate' }, 429);
        await env.INV.put(rk, String(rc + 1), { expirationTtl: 7200 });
        // это должен быть настоящий PNG небольшого размера
        let bin; try { bin = Uint8Array.from(atob(String(body.png || '')), (c) => c.charCodeAt(0)); } catch { return J({ error: 'png' }, 400); }
        const sig = [137, 80, 78, 71, 13, 10, 26, 10];
        if (bin.length < 200 || bin.length > 300000 || !sig.every((b, i) => bin[i] === b)) return J({ error: 'png' }, 400);
        const link = body.web ? 'https://dostonravshanov1006800-beep.github.io/taklif-marhabo-bot/i/' + slug + '/' : 'https://t.me/' + BOT_NAME + '?start=i_' + slug;
        const LANGS = { ru: 'Наведите камеру телефона на QR-код, чтобы открыть приглашение', uz: "Taklifnomani ochish uchun telefon kamerasini QR-kodga qarating", en: 'Point your phone camera at the QR code to open the invitation', kk: 'Шақыруды ашу үшін телефон камерасын QR-кодқа бағыттаңыз' };
        const PRN = { ru: 'Файл без сжатия для печати', uz: 'Bosma uchun siqilmagan fayl', en: 'Uncompressed file for printing', kk: 'Басып шығаруға арналған файл' };
        const lg = LANGS[body.lang] ? body.lang : 'ru';
        const names = [inv.a, inv.b].filter(Boolean).join(' & ');
        const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const send = async (method, field, caption) => {
          const fd = new FormData();
          fd.append('chat_id', String(owner)); fd.append(field, new Blob([bin], { type: 'image/png' }), 'taklifnoma-' + slug + '.png');
          fd.append('caption', caption); fd.append('parse_mode', 'HTML');
          const r = await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/' + method, { method: 'POST', body: fd });
          return r.json().catch(() => ({}));
        };
        const a = await send('sendPhoto', 'photo', '💌 <b>' + esc(names) + '</b>\n\n' + LANGS[lg] + '\n🔗 ' + esc(link));
        if (!a.ok) return J({ error: 'tg', why: String(a.description || '').slice(0, 80) }, 502);
        await send('sendDocument', 'document', '📎 ' + PRN[lg]);
        return J({ ok: true }, 200, { 'cache-control': 'no-store' });
      }

      // удалить приглашение (только владелец): запись, редиректы старых имён, индекс и обратный ключ
      if (path === '/api/del' && req.method === 'POST') {
        const body = await readBody(req, 4000);
        const owner = await verifyInit(body.init || req.headers.get('x-tg-init') || '', env.BOT_TOKEN);
        if (!owner) return J({ error: 'auth' }, 401);
        const id = String(body.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 12);
        if (!id) return J({ error: 'data' }, 400);
        const own = (await env.INV.get('own:' + owner, 'json')) || {};
        const slug = own[id];
        // надгробие: удалённое приглашение нельзя воскресить публикацией из старого локального списка
        await env.INV.put('del:' + owner + ':' + id, '1');
        if (!slug) return J({ ok: true, removed: 0 }, 200, { 'cache-control': 'no-store' });
        let removed = 0;
        const cur = await env.INV.get('inv:' + slug, 'json');
        if (cur && String(cur.o) === String(owner)) { await env.INV.delete('inv:' + slug); removed++; }
        // старые имена этого приглашения ведут на него редиректом: убираем и их
        const list = await env.INV.list({ prefix: 'inv:' });
        for (const k of list.keys || []) {
          if (k.name === 'inv:' + slug) continue;
          const o = await env.INV.get(k.name, 'json');
          if (o && o.r === slug && String(o.o) === String(owner)) { await env.INV.delete(k.name); removed++; }
        }
        await env.INV.delete('id:' + id);
        delete own[id];
        await env.INV.put('own:' + owner, JSON.stringify(own));
        return J({ ok: true, removed }, 200, { 'cache-control': 'no-store' });
      }

      // сохранить приглашение
      if (path === '/api/inv' && req.method === 'POST') {
        const body = await readBody(req);
        const _init = body.init || req.headers.get('x-tg-init') || '';
        const owner = await verifyInit(_init, env.BOT_TOKEN);
        if (!owner) return J({ error: 'auth', why: await whyInit(_init, env.BOT_TOKEN) }, 401);
        // не больше 30 запросов в час на владельца
        const rk = 'rl:' + owner + ':' + Math.floor(Date.now() / 3600000);
        const rc = Number(await env.INV.get(rk)) || 0;
        if (rc >= 30) return J({ error: 'rate' }, 429);
        await env.INV.put(rk, String(rc + 1), { expirationTtl: 7200 });
        const o = sanitizeInv(body.data, owner);
        if (!o) return J({ error: 'data' }, 400);
        if (await env.INV.get('del:' + owner + ':' + o.i)) return J({ error: 'gone' }, 410);
        const ver = typeof body.v === 'string' && /^[a-z0-9]{1,12}$/.test(body.v) ? body.v : '';
        const own = (await env.INV.get('own:' + owner, 'json')) || {};
        if (!own[o.i] && Object.keys(own).length >= 20) return J({ error: 'limit' }, 400);
        const slug = await pickSlug(env, o, owner);
        const old = own[o.i];
        if (old && old !== slug && /^[a-z0-9-]{1,60}$/.test(old)) await env.INV.put('inv:' + old, JSON.stringify({ ...o, r: slug }));
        if (ver) o.v = ver;
        await env.INV.put('inv:' + slug, JSON.stringify(o));
        await env.INV.put('id:' + o.i, slug);
        own[o.i] = slug;
        await env.INV.put('own:' + owner, JSON.stringify(own));
        return J({ ok: true, slug, v: ver, name: [o.a, o.b].filter(Boolean).join(' & ') }, 200, { 'cache-control': 'no-store' });
      }

      // импорт существующих приглашений: только с секретом администратора
      if (path === '/api/import' && req.method === 'POST') {
        if (!env.ADMIN_KEY || req.headers.get('x-admin') !== env.ADMIN_KEY) return J({ error: 'auth' }, 401);
        const body = await readBody(req, 5_000_000);
        let n = 0;
        for (const it of body.items || []) {
          if (!/^[a-z0-9-]{1,60}$/.test(it.slug || '') || !it.data) continue;
          await env.INV.put('inv:' + it.slug, JSON.stringify(it.data)); n++;
          if (it.data && it.data.i && !it.data.r) await env.INV.put('id:' + it.data.i, it.slug);
        }
        for (const [owner, ix] of Object.entries(body.own || {})) {
          if (!/^\d{3,15}$/.test(owner)) continue;
          const cur = (await env.INV.get('own:' + owner, 'json')) || {};
          await env.INV.put('own:' + owner, JSON.stringify({ ...ix, ...cur }));
        }
        return J({ ok: true, imported: n });
      }
      return J({ error: 'not_found' }, 404);
    } catch (e) {
      return J({ error: 'server', msg: String(e && e.message || e).slice(0, 80) }, 500);
    }
  },
};
