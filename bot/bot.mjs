// Telegram-бот Marhabo. Без зависимостей. Работает как long polling внутри GitHub Actions.
// Умеет только: /start (красивый текст + кнопка мини-приложения) и приём ответа гостя.
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';

const TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL;           // https://<user>.github.io/<repo>/
const RUN_MINUTES = Number(process.env.RUN_MINUTES || 340);
if (!TOKEN || !APP_URL) { console.error('BOT_TOKEN и APP_URL обязательны'); process.exit(1); }

const API = `https://api.telegram.org/bot${TOKEN}`;
const OFFSET_FILE = 'docs/data/_offset.txt';   // в репозитории: не теряется при пересоздании раннера

// ---- Журнал ответов гостей: docs/data/<ownerId>.json, публикуется вместе с сайтом ----
const DATA_DIR = 'docs/data';
let dirty = new Set();
function loadLog(owner) {
  try { return JSON.parse(readFileSync(`${DATA_DIR}/${owner}.json`, 'utf8')); } catch { return {}; }
}
function saveLog(owner, log) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(`${DATA_DIR}/${owner}.json`, JSON.stringify(log));
  dirty.add(owner);
}
// kind: 'o' открыл, 'y' придёт, 'n' не сможет
function record(owner, inv, guest, kind, who) {
  const log = loadLog(owner);
  const key = `${inv}:${guest}`;
  const e = log[key] || {};
  const now = new Date().toISOString();
  if (kind === 'o') e.o = e.o || now;
  else { e.s = kind; e.t = now; e.o = e.o || now; }
  if (who) e.w = who;
  log[key] = e;
  saveLog(owner, log);
}
let lastPages = 0, pagesPending = false;
function triggerPages() {
  if (!process.env.GH_TOKEN || !process.env.GH_REPO) return;
  if (Date.now() - lastPages < 90000) { pagesPending = true; return; }
  lastPages = Date.now(); pagesPending = false;
  try { execSync(`gh workflow run pages.yml --repo "${process.env.GH_REPO}"`, { stdio: 'ignore' }); console.log('pages triggered'); }
  catch (e) { console.error('pages trigger failed'); }
}
function publish() {
  if (!dirty.size) return;
  try {
    execSync('git config user.name "marhabo-bot" && git config user.email "bot@users.noreply.github.com"');
    execSync('git add docs/data docs/media docs/inv docs/i');
    execSync('git diff --cached --quiet || git commit -q -m "rsvp data"');
    try { execSync('git pull --rebase -q origin main && git push -q origin main', { stdio: 'ignore' }); }
    catch (e1) {
      // конфликт или сеть: убираем застрявший rebase и пробуем ещё раз, иначе все следующие публикации падали бы
      try { execSync('git rebase --abort', { stdio: 'ignore' }); } catch {}
      execSync('git pull --rebase -X theirs -q origin main && git push -q origin main', { stdio: 'ignore' });
    }
    dirty.clear();
    console.log('published rsvp');
    // коммиты GITHUB_TOKEN не запускают Pages сами: запускаем сайт явно, чтобы данные появились через минуту
    triggerPages();
  } catch (e) { console.error('publish failed', String(e.message).slice(0, 120)); }
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

async function tg(method, body = {}) {
  // getUpdates держит соединение до 45 с, остальным хватает 30 с
  const ms = method === 'getUpdates' ? 70000 : 30000;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`${API}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(ms) });
      const j = await r.json();
      if (j.ok) return j.result;
      if (j.error_code === 429) { await sleep((j.parameters?.retry_after || 2) * 1000); continue; }
      if (j.error_code === 409 || j.error_code >= 500) { await sleep(4000 + i * 2000); continue; } // два запуска бота пересеклись / сбой Telegram
      console.error(method, j.description);
      return null;
    } catch (e) { await sleep(1500 + i * 1500); }
  }
  return null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const T = {
  ru: {
    start:
      '🌿 <b>Marhabo</b>\n<i>Приглашения на свадьбу и праздники</i>\n\n' +
      'Красивая открытка, где каждый гость видит своё имя. Ответы «Приду / Не смогу» приходят вам сюда.\n\n' +
      'Нажмите <b>Старт</b>, чтобы создать приглашение за минуту.',
    info:
      '📖 <b>Как это работает</b>\n\n' +
      '1️⃣ Нажмите <b>Старт</b> и выберите шаблон: свадьба, никах, юбилей, день рождения, Навруз.\n' +
      '2️⃣ Впишите имена, дату и место. Добавьте фото и музыку: отправьте файл прямо в этот чат.\n' +
      '3️⃣ Нажмите <b>Сохранить</b>: откроется этот чат с готовым сообщением, просто нажмите «Отправить».\n' +
      '4️⃣ Получите красивую ссылку вида <code>/i/имя-пары</code> и личную для каждого гостя.\n\n' +
      '🔔 Ответы гостей придут сюда сразу.\n' +
      '🆓 Бесплатно, работает круглосуточно.',
    btn: '✨ Старт',
    btnInfo: 'ℹ️ Информация',
    btnBack: '‹ Назад',
    yes: (n) => `✅ <b>${n}</b> придёт`,
    no: (n) => `❌ <b>${n}</b> не сможет прийти`,
    thanksYes: '🌿 Спасибо! Ваш ответ «Приду» отправлен хозяину приглашения. До встречи на празднике!',
    thanksNo: 'Спасибо за ответ. Мы сообщили хозяину приглашения.',
    mediaOk: (kb) => `✅ Файл сохранён (${kb} КБ). Вернитесь в Marhabo: через 1-2 минуты он подставится сам и станет виден гостям.`,
    mediaBig: '⚠️ Файл больше 19 МБ. Сожмите его и отправьте снова.',
    pubOk: (n) => `✅ Приглашение <b>${n}</b> опубликовано. Ссылка ниже заработает через 1-2 минуты. Вернитесь в Marhabo: гостевые ссылки станут короткими.`,
    pubBad: '⚠️ Не удалось прочитать приглашение. Вернитесь в Marhabo и нажмите «Опубликовать» ещё раз.',
    mediaBad: '⚠️ Нужны фото (JPG, PNG, WebP), музыка (MP3, M4A, OGG, WAV) или видео (MP4, WebM до 19 МБ). Отправьте как фото, видео или как файл.',
    guest: 'Гость',
  },
  uz: {
    start:
      "🌿 <b>Marhabo</b>\n<i>To'y va bayramlar uchun taklifnomalar</i>\n\n" +
      "Chiroyli taklifnoma: har bir mehmon o'z ismini ko'radi. «Boraman / Kela olmayman» javoblari shu yerga keladi.\n\n" +
      "Bir daqiqada taklifnoma yaratish uchun <b>Boshlash</b> tugmasini bosing.",
    info:
      "📖 <b>Bu qanday ishlaydi</b>\n\n" +
      "1️⃣ <b>Boshlash</b> tugmasini bosing va shablonni tanlang: to'y, nikoh, yubiley, tug'ilgan kun, Navro'z.\n" +
      "2️⃣ Ism, sana va joyni yozing. Rasm va musiqani shu chatga fayl qilib yuboring.\n" +
      "3️⃣ <b>Saqlash</b> tugmasini bosing: shu chat tayyor xabar bilan ochiladi, «Yuborish» ni bosing.\n" +
      "4️⃣ <code>/i/juftlik-ismi</code> ko'rinishidagi chiroyli havola va har bir mehmon uchun shaxsiy havolani oling.\n\n" +
      "🔔 Mehmonlar javobi darhol shu yerga keladi.\n" +
      "🆓 Bepul, kechayu kunduz ishlaydi.",
    btn: '✨ Boshlash',
    btnInfo: 'ℹ️ Ma\'lumot',
    btnBack: '‹ Orqaga',
    yes: (n) => `✅ <b>${n}</b> keladi`,
    no: (n) => `❌ <b>${n}</b> kela olmaydi`,
    thanksYes: "🌿 Rahmat! «Boraman» javobingiz taklifnoma egasiga yuborildi. Bayramda ko'rishguncha!",
    thanksNo: 'Javobingiz uchun rahmat. Taklifnoma egasiga xabar berdik.',
    mediaOk: (kb) => `✅ Fayl saqlandi (${kb} KB). Marhabo'ga qayting: 1-2 daqiqada u o'zi almashadi va mehmonlarga ko'rinadi.`,
    mediaBig: '⚠️ Fayl 19 MB dan katta. Siqib, qayta yuboring.',
    pubOk: (n) => `✅ <b>${n}</b> taklifnomasi e'lon qilindi. Havola 1-2 daqiqada ishlaydi. Marhabo'ga qaytsangiz, mehmon havolalari qisqa bo'ladi.`,
    pubBad: '⚠️ Taklifnomani o‘qib bo‘lmadi. Marhabo\'ga qaytib «E\'lon qilish» ni yana bosing.',
    mediaBad: '⚠️ Rasm (JPG, PNG, WebP), musiqa (MP3, M4A, OGG, WAV) yoki video (MP4, WebM, 19 MB gacha) kerak. Rasm, video yoki fayl sifatida yuboring.',
    guest: 'Mehmon',
  },
};
const langOf = (u) => ((u?.language_code || 'ru').startsWith('uz') ? 'uz' : 'ru');


// ---- Приём файлов от владельца: фото/документ/аудио -> docs/media/<owner>/ ----
const MEDIA_DIR = 'docs/media';
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'video/mp4': 'mp4', 'video/quicktime': 'mp4', 'video/webm': 'webm', 'video/x-m4v': 'mp4' };
async function saveMedia(m) {
  let fileId, ext, kind, size, vw, vh;
  if (m.photo && m.photo.length) {
    const p = m.photo[m.photo.length - 1]; fileId = p.file_id; ext = 'jpg'; kind = 'photo'; size = p.file_size;
  } else if (m.audio) {
    fileId = m.audio.file_id; kind = 'audio'; size = m.audio.file_size;
    ext = EXT[m.audio.mime_type] || (/\.(mp3|m4a|ogg|wav)$/i.exec(m.audio.file_name || '') || [])[1] || 'mp3';
  } else if (m.video || m.video_note) {
    const v = m.video || m.video_note;
    fileId = v.file_id; kind = 'video'; size = v.file_size;
    ext = EXT[v.mime_type] || (/\.(mp4|webm|mov|m4v)$/i.exec(v.file_name || '') || [])[1] || 'mp4';
    ext = ext.toLowerCase(); if (ext === 'mov' || ext === 'm4v') ext = 'mp4';
    vw = v.width; vh = v.height;
  } else if (m.document) {
    const mt = m.document.mime_type || '';
    ext = EXT[mt] || (/\.(jpe?g|png|webp|mp3|m4a|ogg|wav|mp4|webm|mov|m4v)$/i.exec(m.document.file_name || '') || [])[1];
    if (!ext) return { error: 'type' };
    ext = ext.toLowerCase().replace('jpeg', 'jpg'); if (ext === 'mov' || ext === 'm4v') ext = 'mp4';
    fileId = m.document.file_id; kind = /^(mp3|m4a|ogg|wav)$/.test(ext) ? 'audio' : /^(mp4|webm)$/.test(ext) ? 'video' : 'photo'; size = m.document.file_size;
    if (m.document.thumbnail || m.document.thumb) { const th = m.document.thumbnail || m.document.thumb; vw = th.width; vh = th.height; }
  } else return null;
  if (size && size > 19 * 1024 * 1024) return { error: 'size' };
  const f = await tg('getFile', { file_id: fileId });
  if (!f || !f.file_path) return { error: 'get' };
  const r = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${f.file_path}`);
  if (!r.ok) return { error: 'get' };
  const buf = Buffer.from(await r.arrayBuffer());
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const dir = `${MEDIA_DIR}/${m.from.id}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${id}.${ext}`, buf);
  let idx = [];
  try { idx = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8')); } catch {}
  const rec = { f: `${id}.${ext}`, k: kind, kb: Math.round(buf.length / 1024), t: new Date().toISOString() };
  if (kind === 'video' && vw && vh) { rec.w = vw; rec.h = vh; rec.o = vh > vw ? 'p' : 'l'; } // ориентация: p = 9:16, l = 16:9
  idx.unshift(rec);
  // репозиторий не должен раздуваться: у владельца храним не больше 3 видео, самые старые удаляем с диска
  const vids = idx.filter((x) => x.k === 'video');
  if (vids.length > 3) {
    for (const old of vids.slice(3)) { try { unlinkSync(`${dir}/${old.f}`); } catch {} }
    const drop = new Set(vids.slice(3).map((x) => x.f)); idx = idx.filter((x) => !drop.has(x.f));
  }
  writeFileSync(`${dir}/index.json`, JSON.stringify(idx.slice(0, 60)));
  dirty.add('media');
  return { url: `${APP_URL.replace(/\/?$/, '/')}media/${m.from.id}/${id}.${ext}`, kind, kb: Math.round(buf.length / 1024) };
}

// ---- Публикация приглашений: #taklif <данные> -> docs/inv/<slug>.json, короткая ссылка /i/<slug> ----
const INV_DIR = 'docs/inv';
const PREV_DIR = 'docs/i';
// запасные обложки по шаблонам (те же, что на странице гостя), чтобы у превью всегда была картинка
const COVER = { wedding: 'photo-1606800052052-a08af7148866', birthday: 'photo-1530103862676-de8c9debad1d', jubilee: 'photo-1522673607200-164d1b6ce486', anniversary: 'photo-1522673607200-164d1b6ce486', nikoh: 'photo-1519741497674-611481863552', nikah: 'photo-1519741497674-611481863552', navruz: 'photo-1490750967868-88aa4486c946', other: 'photo-1492684223066-81342ee5ff30' };
const MONTHS = { ru: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'], uz: ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'] };
const attr = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function previewPage(slug, o) {
  const lang = o.l === 'ru' ? 'ru' : 'uz';
  const names = [o.a, o.b].filter(Boolean).join(' & ') || 'Marhabo';
  let when = '';
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(o.d || '');
  if (dm) when = `${+dm[3]} ${MONTHS[lang][+dm[2] - 1] || ''} ${dm[1]}`.replace(/\s+/g, ' ') + (o.h ? `, ${o.h}` : '');
  const title = names;
  const desc = [lang === 'ru' ? 'Приглашение' : 'Taklifnoma', when, o.pl].filter(Boolean).join(' · ');
  const cover = o.p && o.p.c && /^media\/\d{3,15}\/[a-z0-9]{4,20}\.(jpg|png|webp)$/i.test(o.p.c)
    ? `${APP_URL.replace(/\/?$/, '/')}${o.p.c}`
    : `https://images.unsplash.com/${COVER[o.t] || COVER.wedding}?auto=format&fit=crop&w=1200&q=70`;
  const base = APP_URL.replace(/\/?$/, '/');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${attr(title)}</title><meta name="description" content="${attr(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Taklifnoma"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}">
<meta property="og:image" content="${attr(cover)}"><meta property="og:url" content="${attr(base + 'i/' + slug + '/')}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${attr(title)}"><meta name="twitter:image" content="${attr(cover)}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FCF9F3;color:#2B2219;font-family:Georgia,serif;text-align:center}a{color:#B28A50}</style>
</head><body><div><p style="letter-spacing:.3em;font-size:11px;text-transform:uppercase;color:#A08D74">Taklifnoma</p><h1 style="font-weight:500">${attr(names)}</h1><p><a id="go" href="../../i.html?s=${attr(slug)}">${lang === 'ru' ? 'Открыть приглашение' : 'Taklifnomani ochish'}</a></p></div>
<script>var q=location.search?'&'+location.search.slice(1):'';location.replace('../../i.html?s=${slug}'+q)</script></body></html>`;
}
let BOT_NAME = 'Taklifnomai_bot';
const TR = { 'ʻ':'','’':'','`':'','ʹ':'','‘':'', а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'j',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sh',ъ:'',ы:'i',ь:'',э:'e',ю:'yu',я:'ya',ў:'o',қ:'q',ғ:'g',ҳ:'h',ʼ:'',"'":'' };
const slugPart = (x) => String(x || '').toLowerCase().split('').map((c) => (c in TR ? TR[c] : c)).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
function makeSlug(d, owner, invId) {
  let base = [slugPart(d.a), slugPart(d.b)].filter(Boolean).join('-') || 'taklif';
  mkdirSync(INV_DIR, { recursive: true });
  let slug = base, n = 1;
  for (;;) {
    const f = `${INV_DIR}/${slug}.json`;
    if (!existsSync(f)) return slug;
    try { const cur = JSON.parse(readFileSync(f, 'utf8')); if (String(cur.o) === String(owner) && cur.i === invId) return slug; } catch {}
    n += 1; slug = `${base}-${n}`;
    if (n > 99) return `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
}
const cleanStr = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const okUrl = (u) => (/^https:\/\/[^\s<>"']{3,400}$/i.test(u || '') ? u : '');
const okMedia = (u) => (/^media\/\d{3,15}\/[a-z0-9]{4,20}\.(jpg|png|webp|mp3|m4a|ogg|wav|mp4|webm)$/i.test(u || '') ? u : (okUrl(u)));
function sanitizeInv(d, owner) {
  if (!d || typeof d !== 'object') return null;
  const o = { t: ['wedding','birthday','jubilee','nikoh','navruz','other'].includes(d.t) ? d.t : 'wedding', l: d.l === 'uz' ? 'uz' : 'ru',
    a: cleanStr(d.a, 60), b: cleanStr(d.b, 60), d: /^\d{4}-\d{2}-\d{2}$/.test(d.d || '') ? d.d : '', h: /^\d{2}:\d{2}$/.test(d.h || '') ? d.h : '',
    pl: cleanStr(d.pl, 90), ad: cleanStr(d.ad, 120), m: okUrl(cleanStr(d.m, 400)), x: cleanStr(d.x, 400), dc: cleanStr(d.dc, 80), ct: cleanStr(d.ct, 40),
    k: BOT_NAME, o: String(owner), i: cleanStr(d.i, 12).replace(/[^a-z0-9]/gi, '') };
  if (!o.a || !o.i) return null;
  if (d.u) { const u = okMedia(d.u); if (u) o.u = u; }
  if (d.p && typeof d.p === 'object') {
    const p = {}; const c = okMedia(d.p.c), q = okMedia(d.p.o);
    if (c) p.c = c; if (q) p.o = q;
    if (Array.isArray(d.p.g)) { const g = d.p.g.map(okMedia).filter(Boolean).slice(0, 6); if (g.length) p.g = g; }
    // видео: [[путь, 'l'|'p'], ...] — l = 16:9 (горизонтальное), p = 9:16 (вертикальное). Только файлы из нашего репозитория или https.
    if (Array.isArray(d.p.v)) {
      const v = d.p.v.slice(0, 3).map((x) => { const u = okMedia(Array.isArray(x) ? x[0] : x); const o2 = Array.isArray(x) && x[1] === 'p' ? 'p' : 'l'; return u && /\.(mp4|webm)(\?|$)/i.test(u) ? [u, o2] : null; }).filter(Boolean);
      if (v.length) p.v = v;
    }
    if (Object.keys(p).length) o.p = p;
  }
  if (Array.isArray(d.pr)) { const pr = d.pr.slice(0, 10).map((r) => [cleanStr(r && r[0], 5), cleanStr(r && r[1], 80)]).filter((r) => r[1]); if (pr.length) o.pr = pr; }
  Object.keys(o).forEach((k) => (o[k] === '' || o[k] == null) && delete o[k]);
  return o;
}
function saveInvitation(raw, owner) {
  let d;
  try { d = JSON.parse(Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch { return { error: 'parse' }; }
  const o = sanitizeInv(d, owner);
  if (!o) return { error: 'data' };
  const slug = makeSlug(o, owner, o.i);
  // имена поменяли: старый адрес не должен отдавать устаревшие данные, переводим его на новый
  try {
    const ix0 = JSON.parse(readFileSync(`${INV_DIR}/_${owner}.json`, 'utf8'));
    const old = ix0[o.i];
    if (old && old !== slug && /^[a-z0-9-]{1,40}$/.test(old)) {
      writeFileSync(`${INV_DIR}/${old}.json`, JSON.stringify(Object.assign({}, o, { r: slug })));
      mkdirSync(`${PREV_DIR}/${old}`, { recursive: true });
      writeFileSync(`${PREV_DIR}/${old}/index.html`, previewPage(slug, o));
    }
  } catch {}
  writeFileSync(`${INV_DIR}/${slug}.json`, JSON.stringify(o));
  mkdirSync(`${PREV_DIR}/${slug}`, { recursive: true });
  writeFileSync(`${PREV_DIR}/${slug}/index.html`, previewPage(slug, o));
  // индекс владельца: id приглашения -> slug (мини-апп по нему узнаёт короткую ссылку)
  const ixf = `${INV_DIR}/_${owner}.json`;
  let ix = {};
  try { ix = JSON.parse(readFileSync(ixf, 'utf8')); } catch {}
  ix[o.i] = slug;
  writeFileSync(ixf, JSON.stringify(ix));
  dirty.add('inv');
  return { slug, name: [o.a, o.b].filter(Boolean).join(' & ') };
}

async function onMessage(m) {
  const chat = m.chat.id;
  const text = (m.text || '').trim();
  if (m.chat.type !== 'private') return;
  const lang = langOf(m.from);
  const t = T[lang];


  // публикация приглашения от владельца: "#taklif <base64url>"
  const pub = text.match(/^#taklif\s+([A-Za-z0-9_-]{20,3900})$/);
  if (pub) {
    const r = saveInvitation(pub[1], m.from.id);
    if (r.error) { await tg('sendMessage', { chat_id: chat, text: t.pubBad, parse_mode: 'HTML' }); return; }
    publish();
    const url = `${APP_URL.replace(/\/?$/, '/')}i/${r.slug}`;
    await tg('sendMessage', { chat_id: chat, text: t.pubOk(esc(r.name)), parse_mode: 'HTML' });
    await tg('sendMessage', { chat_id: chat, text: url, disable_web_page_preview: true });
    return;
  }

  // файлы от владельца
  if (m.photo || m.audio || m.document || m.video || m.video_note) {
    const res = await saveMedia(m);
    if (res && res.url) {
      publish();
      await tg('sendMessage', { chat_id: chat, text: t.mediaOk(res.kb), parse_mode: 'HTML', disable_web_page_preview: true });
    } else {
      await tg('sendMessage', { chat_id: chat, text: res && res.error === 'size' ? t.mediaBig : t.mediaBad, parse_mode: 'HTML' });
    }
    return;
  }

  // ответ гостя: /start r<y|n|o>_<ownerId>_<invId>_<guestKey>
  const rs = text.match(/^\/start\s+r([yno])_(\d{3,15})_([a-z0-9]{0,12})_?([a-z0-9]{0,12})$/i);
  if (rs) {
    const kind = rs[1].toLowerCase();
    const owner = Number(rs[2]);
    const inv = rs[3];
    const guest = rs[4] || 'g';
    const name = [m.from.first_name, m.from.last_name].filter(Boolean).join(' ') || t.guest;
    const handle = m.from.username ? ` (@${esc(m.from.username)})` : '';
    const before = (loadLog(owner)[`${inv}:${guest}`] || {}).s;
    record(owner, inv, guest, kind, name);
    if (kind === 'o') { publish(); return; }
    if (before === kind) { await tg('sendMessage', { chat_id: chat, text: kind === 'y' ? t.thanksYes : t.thanksNo, parse_mode: 'HTML' }); return; } // повторное нажатие: владельцу не дублируем
    const yes = kind === 'y';
    const ownerInfo = await tg('getChat', { chat_id: owner });
    const ol = T[(ownerInfo && ownerInfo.language_code) ? langOf(ownerInfo) : 'ru'];
    const sent = await tg('sendMessage', { chat_id: owner, text: `📩 ${(yes ? ol.yes : ol.no)(esc(name))}${handle}`, parse_mode: 'HTML' });
    await tg('sendMessage', { chat_id: chat, text: sent ? (yes ? t.thanksYes : t.thanksNo) : t.thanksNo, parse_mode: 'HTML' });
    publish();
    return;
  }

  // красивая ссылка приглашения: /start i_<slug> или i_<slug>__<ключ гостя>
  const iv = text.match(/^\/start\s+i_([a-z0-9-]{2,60}?)(?:__([a-z0-9]{1,12}))?$/i);
  if (iv) {
    const ok = await sendInviteCard(chat, iv[1].toLowerCase(), iv[2] ? iv[2].toLowerCase() : '', m.from);
    if (ok) return;
  }

  // /start, /info и любое другое сообщение: баннер + «Старт» и «Информация»
  if (/^\/info\b/i.test(text)) { await sendInfo(chat, lang); return; }
  await sendStart(chat, lang);
}


// ---- Красивая ссылка через бота: t.me/<бот>?start=i_<slug>[_<ключГостя>] ----
function readInv(slug) {
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return null;
  try { return JSON.parse(readFileSync(`${INV_DIR}/${slug}.json`, 'utf8')); } catch { return null; }
}
function cardCaption(o, guestName) {
  const lang = o.l === 'ru' ? 'ru' : 'uz';
  const names = [o.a, o.b].filter(Boolean).map(esc).join(' &amp; ');
  let when = '';
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(o.d || '');
  if (dm) when = `${+dm[3]} ${MONTHS[lang][+dm[2] - 1] || ''} ${dm[1]}` + (o.h ? `, ${esc(o.h)}` : '');
  const hi = guestName ? (lang === 'ru' ? `Дорогой(ая) <b>${esc(guestName)}</b>,\nвас приглашают` : `Hurmatli <b>${esc(guestName)}</b>,\nsizni taklif qilamiz`) : (lang === 'ru' ? 'Вас приглашают' : 'Sizni taklif qilamiz');
  return `💌 ${hi}\n\n<b>${names}</b>` + (when ? `\n📅 ${when}` : '') + (o.pl ? `\n📍 ${esc(o.pl)}` : '');
}
async function sendInviteCard(chat, slug, guestKey, from) {
  const o = readInv(slug);
  if (!o) return false;
  const lang = o.l === 'ru' ? 'ru' : 'uz';
  const base = APP_URL.replace(/\/?$/, '/');
  // имя берём из профиля Telegram того, кто открыл ссылку: список гостей в репозитории не публикуем
  const gname = from ? [from.first_name].filter(Boolean).join(' ').slice(0, 40) : '';
  const url = `${base}i/${slug}/` + (guestKey ? `?q=${encodeURIComponent(guestKey)}` + (gname ? `&g=${encodeURIComponent(gname)}` : '') : (gname ? `?g=${encodeURIComponent(gname)}` : ''));
  const kb = { inline_keyboard: [[{ text: lang === 'ru' ? '💌 Открыть приглашение' : '💌 Taklifnomani ochish', web_app: { url } }]] };
  const cover = o.p && o.p.c && /^media\/\d{3,15}\/[a-z0-9]{4,20}\.(jpg|png|webp)$/i.test(o.p.c) ? `${base}${o.p.c}` : null;
  const caption = cardCaption(o, gname);
  let r = cover ? await tg('sendPhoto', { chat_id: chat, photo: cover, caption, parse_mode: 'HTML', reply_markup: kb }) : null;
  if (!r) r = await tg('sendMessage', { chat_id: chat, text: caption, parse_mode: 'HTML', reply_markup: kb });
  if (r && o.o && o.i) record(Number(o.o), o.i, guestKey || 'g', 'o', gname);
  return !!r;
}
const startKb = (lang) => ({ inline_keyboard: [[{ text: T[lang].btn, web_app: { url: APP_URL } }], [{ text: T[lang].btnInfo, callback_data: 'info' }]] });
const infoKb = (lang) => ({ inline_keyboard: [[{ text: T[lang].btn, web_app: { url: APP_URL } }], [{ text: T[lang].btnBack, callback_data: 'back' }]] });
const bannerUrl = (lang) => `${APP_URL.replace(/\/?$/, '/')}brand/banner_${lang}.jpg`;

async function sendStart(chat, lang) {
  const r = await tg('sendPhoto', { chat_id: chat, photo: bannerUrl(lang), caption: T[lang].start, parse_mode: 'HTML', reply_markup: startKb(lang) });
  if (!r) await tg('sendMessage', { chat_id: chat, text: T[lang].start, parse_mode: 'HTML', reply_markup: startKb(lang) }); // запасной путь без картинки
}
async function sendInfo(chat, lang) {
  await tg('sendMessage', { chat_id: chat, text: T[lang].info, parse_mode: 'HTML', reply_markup: infoKb(lang) });
}
// нажатия «Информация» / «Назад»: правим то же сообщение, чат не засоряется
async function onCallback(q) {
  const lang = langOf(q.from), m = q.message;
  await tg('answerCallbackQuery', { callback_query_id: q.id });
  if (!m || m.chat.type !== 'private') return;
  const photo = !!(m.photo && m.photo.length);
  const text = q.data === 'info' ? T[lang].info : q.data === 'back' ? T[lang].start : null;
  if (!text) return;
  const kb = q.data === 'info' ? infoKb(lang) : startKb(lang);
  const body = { chat_id: m.chat.id, message_id: m.message_id, parse_mode: 'HTML', reply_markup: kb };
  const ok = photo ? await tg('editMessageCaption', { ...body, caption: text }) : await tg('editMessageText', { ...body, text });
  if (!ok) { if (q.data === 'info') await sendInfo(m.chat.id, lang); else await sendStart(m.chat.id, lang); }
}

async function setup() {
  await tg('deleteWebhook', { drop_pending_updates: false });
  await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Marhabo', web_app: { url: APP_URL } } });
  await tg('setMyCommands', { commands: [{ command: 'start', description: 'Старт / Boshlash' }, { command: 'info', description: 'Информация / Ma\'lumot' }] });
  await tg('setMyCommands', { language_code: 'uz', commands: [{ command: 'start', description: 'Boshlash' }, { command: 'info', description: 'Ma\'lumot' }] });
  await tg('setMyCommands', { language_code: 'ru', commands: [{ command: 'start', description: 'Старт' }, { command: 'info', description: 'Информация' }] });
  // описание на экране бота до первого нажатия «Start» и короткое описание в профиле
  await tg('setMyDescription', { description: 'Marhabo: красивые приглашения на свадьбу и праздники. Личное имя для каждого гостя, ответы «Приду / Не смогу» в чате. Бесплатно.' });
  await tg('setMyDescription', { language_code: 'ru', description: 'Marhabo: красивые приглашения на свадьбу и праздники. Личное имя для каждого гостя, ответы «Приду / Не смогу» в чате. Бесплатно.' });
  await tg('setMyDescription', { language_code: 'uz', description: "Marhabo: to'y va bayramlar uchun chiroyli taklifnomalar. Har bir mehmonga o'z ismi, «Boraman / Kela olmayman» javoblari chatda. Bepul." });
  await tg('setMyShortDescription', { short_description: 'Приглашения на свадьбу и праздники / To\'y taklifnomalari' });
  await tg('setMyShortDescription', { language_code: 'ru', short_description: 'Красивые приглашения на свадьбу и праздники. Бесплатно.' });
  await tg('setMyShortDescription', { language_code: 'uz', short_description: "To'y va bayramlar uchun chiroyli taklifnomalar. Bepul." });
}

let stopping = false;
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { stopping = true; });
process.on('unhandledRejection', (e) => console.error('unhandled', e && e.message));

async function main() {
  await setup();
  const me = await tg('getMe', {});
  if (me && me.username) BOT_NAME = me.username;
  let offset = existsSync(OFFSET_FILE) ? Number(readFileSync(OFFSET_FILE, 'utf8')) || 0 : 0;
  const stopAt = Date.now() + RUN_MINUTES * 60 * 1000;
  let lastPub = Date.now();
  console.log(`polling, offset=${offset}, until ${new Date(stopAt).toISOString()}`);
  while (Date.now() < stopAt && !stopping) {
    const updates = await tg('getUpdates', { offset, timeout: 45, allowed_updates: ['message', 'callback_query'] });
    if (!updates) { await sleep(3000); continue; }
    for (const u of updates) {
      offset = u.update_id + 1;
      try { if (u.message) await onMessage(u.message); else if (u.callback_query) await onCallback(u.callback_query); } catch (e) { console.error('update error', e.message); }
    }
    if (updates.length) { try { mkdirSync(DATA_DIR, { recursive: true }); } catch {} writeFileSync(OFFSET_FILE, String(offset)); dirty.add('offset'); }
    if (dirty.size && Date.now() - lastPub > 20000) { publish(); lastPub = Date.now(); }
    if (pagesPending && Date.now() - lastPages >= 90000) triggerPages();
  }
  try { mkdirSync(DATA_DIR, { recursive: true }); } catch {}
  writeFileSync(OFFSET_FILE, String(offset)); dirty.add('offset');
  if (offset) await tg('getUpdates', { offset, timeout: 0, limit: 1 }); // подтвердить обработанное Telegram
  publish();
  console.log('finished, offset', offset);
}
main().catch((e) => { console.error('fatal', e && e.message); try { publish(); } catch {} process.exit(1); });
