// Прогоняет настоящий sanitizeInv из worker/worker.js на всех 12 типах. Запуск: node tests/worker-types.mjs
const LGS = ['ru', 'uz', 'en', 'kk'];
const BOT_NAME = 'Taklifnomai_bot';
const cleanStr = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const okUrl = (u) => (/^https:\/\/[^\s<>"']{3,400}$/i.test(u || '') ? u : '');
const okMedia = (u) => (/^media\/\d{3,15}\/[a-z0-9]{4,20}\.(jpg|png|webp|mp3|m4a|ogg|wav|mp4|webm)$/i.test(u || '') ? u : okUrl(u));

function sanitizeInv(d, owner) {
  if (!d || typeof d !== 'object') return null;
  const o = {
    t: ['wedding', 'birthday', 'anniversary', 'jubilee', 'nikah', 'nikoh', 'navruz', 'other', 'sunnat', 'beshik', 'grad', 'corp', 'party', 'hayit'].includes(d.t) ? d.t : 'wedding',
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
  if (['gold', 'rose', 'cloud', 'ivory', 'velvet', 'green', 'midnight', 'sunset', 'stained', 'swan'].includes(d.th)) o.th = d.th;
  if (['vibes', 'playfair', 'script', 'caveat'].includes(d.nf)) o.nf = d.nf; // шрифт имён
  if (['seal', 'env', 'gift', 'door', 'book'].includes(d.cv)) o.cv = d.cv; // вид заставки (занавес = cu:1)
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


const TYPES=['wedding','nikah','birthday','anniversary','sunnat','beshik','grad','party','corp','navruz','hayit','other'];let bad=[];for(const t of TYPES){const o=sanitizeInv({t,a:'A',b:'B',d:'2027-01-01',i:'abc123'},'1');if(!o||o.t!==t)bad.push(t+'->'+(o&&o.t))}
console.log(bad.length?'ПОТЕРЯНЫ: '+bad.join():'воркер сохраняет все 12 типов');const x=sanitizeInv({t:'hack',a:'A',i:'abc123'},'1');console.log('чужой тип -> '+x.t);
