// Telegram-бот Marhabo. Без зависимостей. Работает как long polling внутри GitHub Actions.
// Умеет только: /start (красивый текст + кнопка мини-приложения) и приём ответа гостя.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL;           // https://<user>.github.io/<repo>/
const RUN_MINUTES = Number(process.env.RUN_MINUTES || 340);
if (!TOKEN || !APP_URL) { console.error('BOT_TOKEN и APP_URL обязательны'); process.exit(1); }

const API = `https://api.telegram.org/bot${TOKEN}`;
const OFFSET_FILE = '/tmp/offset.txt';

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
    execSync('git add docs/data docs/media docs/inv');
    execSync('git diff --cached --quiet || git commit -q -m "rsvp data"');
    execSync('git pull --rebase -q origin main && git push -q origin main', { stdio: 'ignore' });
    dirty.clear();
    console.log('published rsvp');
    // коммиты GITHUB_TOKEN не запускают Pages сами: запускаем сайт явно, чтобы данные появились через минуту
    triggerPages();
  } catch (e) { console.error('publish failed', String(e.message).slice(0, 120)); }
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

async function tg(method, body = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${API}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.ok) return j.result;
      if (j.error_code === 429) { await sleep((j.parameters?.retry_after || 2) * 1000); continue; }
      console.error(method, j.description);
      return null;
    } catch (e) { await sleep(1500); }
  }
  return null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const T = {
  ru: {
    start:
      '🌿 <b>Marhabo</b>\n<i>Приглашения на свадьбу и праздники</i>\n\n' +
      'Красивая открытка с обращением по имени для каждого гостя.\n' +
      '• Шесть шаблонов: свадьба, никах, юбилей, день рождения, Навруз\n' +
      '• Личная ссылка для каждого гостя\n' +
      '• Ответы «Приду / Не смогу» приходят вам сюда\n\n' +
      'Нажмите синюю кнопку <b>Marhabo</b> внизу или кнопку ниже.',
    btn: '✨ Создать приглашение',
    yes: (n) => `✅ <b>${n}</b> придёт`,
    no: (n) => `❌ <b>${n}</b> не сможет прийти`,
    thanksYes: '🌿 Спасибо! Ваш ответ «Приду» отправлен хозяину приглашения. До встречи на празднике!',
    thanksNo: 'Спасибо за ответ. Мы сообщили хозяину приглашения.',
    mediaOk: (kb) => `✅ Файл сохранён (${kb} КБ). Ссылка ниже. Он появится в форме через 1-2 минуты. Вернитесь в Marhabo и нажмите «Проверить файлы».`,
    mediaBig: '⚠️ Файл больше 19 МБ. Сожмите его и отправьте снова.',
    pubOk: (n) => `✅ Приглашение <b>${n}</b> опубликовано. Ссылка ниже заработает через 1-2 минуты. Вернитесь в Marhabo: гостевые ссылки станут короткими.`,
    pubBad: '⚠️ Не удалось прочитать приглашение. Вернитесь в Marhabo и нажмите «Опубликовать» ещё раз.',
    mediaBad: '⚠️ Нужны фото (JPG, PNG, WebP) или музыка (MP3, M4A, OGG, WAV). Отправьте как фото или как файл.',
    guest: 'Гость',
  },
  uz: {
    start:
      "🌿 <b>Marhabo</b>\n<i>To'y va bayramlar uchun taklifnomalar</i>\n\n" +
      "Har bir mehmonga o'z ismi bilan murojaat qilingan chiroyli taklifnoma.\n" +
      "• Oltita shablon: to'y, nikoh, yubiley, tug'ilgan kun, Navro'z\n" +
      "• Har bir mehmon uchun shaxsiy havola\n" +
      "• «Boraman / Kela olmayman» javoblari shu yerga keladi\n\n" +
      "Pastdagi ko'k <b>Marhabo</b> tugmasini yoki quyidagi tugmani bosing.",
    btn: '✨ Taklifnoma yaratish',
    yes: (n) => `✅ <b>${n}</b> keladi`,
    no: (n) => `❌ <b>${n}</b> kela olmaydi`,
    thanksYes: "🌿 Rahmat! «Boraman» javobingiz taklifnoma egasiga yuborildi. Bayramda ko'rishguncha!",
    thanksNo: 'Javobingiz uchun rahmat. Taklifnoma egasiga xabar berdik.',
    mediaOk: (kb) => `✅ Fayl saqlandi (${kb} KB). Havola pastda. U 1-2 daqiqada shaklda paydo bo'ladi. Marhabo'ga qaytib «Fayllarni tekshirish» tugmasini bosing.`,
    mediaBig: '⚠️ Fayl 19 MB dan katta. Siqib, qayta yuboring.',
    pubOk: (n) => `✅ <b>${n}</b> taklifnomasi e'lon qilindi. Havola 1-2 daqiqada ishlaydi. Marhabo'ga qaytsangiz, mehmon havolalari qisqa bo'ladi.`,
    pubBad: '⚠️ Taklifnomani o‘qib bo‘lmadi. Marhabo\'ga qaytib «E\'lon qilish» ni yana bosing.',
    mediaBad: '⚠️ Rasm (JPG, PNG, WebP) yoki musiqa (MP3, M4A, OGG, WAV) kerak. Rasm yoki fayl sifatida yuboring.',
    guest: 'Mehmon',
  },
};
const langOf = (u) => ((u?.language_code || 'ru').startsWith('uz') ? 'uz' : 'ru');


// ---- Приём файлов от владельца: фото/документ/аудио -> docs/media/<owner>/ ----
const MEDIA_DIR = 'docs/media';
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav' };
async function saveMedia(m) {
  let fileId, ext, kind, size;
  if (m.photo && m.photo.length) {
    const p = m.photo[m.photo.length - 1]; fileId = p.file_id; ext = 'jpg'; kind = 'photo'; size = p.file_size;
  } else if (m.audio) {
    fileId = m.audio.file_id; kind = 'audio'; size = m.audio.file_size;
    ext = EXT[m.audio.mime_type] || (/\.(mp3|m4a|ogg|wav)$/i.exec(m.audio.file_name || '') || [])[1] || 'mp3';
  } else if (m.document) {
    const mt = m.document.mime_type || '';
    ext = EXT[mt] || (/\.(jpe?g|png|webp|mp3|m4a|ogg|wav)$/i.exec(m.document.file_name || '') || [])[1];
    if (!ext) return { error: 'type' };
    ext = ext.toLowerCase().replace('jpeg', 'jpg');
    fileId = m.document.file_id; kind = /^(mp3|m4a|ogg|wav)$/.test(ext) ? 'audio' : 'photo'; size = m.document.file_size;
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
  idx.unshift({ f: `${id}.${ext}`, k: kind, kb: Math.round(buf.length / 1024), t: new Date().toISOString() });
  writeFileSync(`${dir}/index.json`, JSON.stringify(idx.slice(0, 60)));
  dirty.add('media');
  return { url: `${APP_URL.replace(/\/?$/, '/')}media/${m.from.id}/${id}.${ext}`, kind, kb: Math.round(buf.length / 1024) };
}

// ---- Публикация приглашений: #taklif <данные> -> docs/inv/<slug>.json, короткая ссылка /i/<slug> ----
const INV_DIR = 'docs/inv';
let BOT_NAME = 'Taklifnomai_bot';
const TR = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'j',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sh',ъ:'',ы:'i',ь:'',э:'e',ю:'yu',я:'ya',ў:'o',қ:'q',ғ:'g',ҳ:'h',ʼ:'',"'":'' };
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
const okMedia = (u) => (/^media\/\d{3,15}\/[a-z0-9]{4,20}\.(jpg|png|webp|mp3|m4a|ogg|wav)$/i.test(u || '') ? u : (okUrl(u)));
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
  writeFileSync(`${INV_DIR}/${slug}.json`, JSON.stringify(o));
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
  if (m.photo || m.audio || m.document) {
    const res = await saveMedia(m);
    if (res && res.url) {
      publish();
      await tg('sendMessage', { chat_id: chat, text: t.mediaOk(res.kb), parse_mode: 'HTML', disable_web_page_preview: true });
      await tg('sendMessage', { chat_id: chat, text: res.url, disable_web_page_preview: true });
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
    record(owner, inv, guest, kind, name);
    if (kind === 'o') { publish(); return; }
    const yes = kind === 'y';
    const ownerInfo = await tg('getChat', { chat_id: owner });
    const ol = T[(ownerInfo && ownerInfo.language_code) ? langOf(ownerInfo) : 'ru'];
    const sent = await tg('sendMessage', { chat_id: owner, text: `📩 ${(yes ? ol.yes : ol.no)(esc(name))}${handle}`, parse_mode: 'HTML' });
    await tg('sendMessage', { chat_id: chat, text: sent ? (yes ? t.thanksYes : t.thanksNo) : t.thanksNo, parse_mode: 'HTML' });
    publish();
    return;
  }

  // /start (и любое другое сообщение): красивый текст + кнопка мини-приложения
  if (text.startsWith('/start') || text) {
    await tg('sendMessage', {
      chat_id: chat, text: t.start, parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: t.btn, web_app: { url: APP_URL } }]] },
    });
  }
}

async function setup() {
  await tg('deleteWebhook', { drop_pending_updates: false });
  await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Marhabo', web_app: { url: APP_URL } } });
  await tg('setMyCommands', { commands: [{ command: 'start', description: 'Старт / Boshlash' }] });
  await tg('setMyCommands', { language_code: 'uz', commands: [{ command: 'start', description: 'Boshlash' }] });
  await tg('setMyCommands', { language_code: 'ru', commands: [{ command: 'start', description: 'Старт' }] });
}

let stopping = false;
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { stopping = true; });

async function main() {
  await setup();
  const me = await tg('getMe', {});
  if (me && me.username) BOT_NAME = me.username;
  let offset = existsSync(OFFSET_FILE) ? Number(readFileSync(OFFSET_FILE, 'utf8')) || 0 : 0;
  const stopAt = Date.now() + RUN_MINUTES * 60 * 1000;
  let lastPub = Date.now();
  console.log(`polling, offset=${offset}, until ${new Date(stopAt).toISOString()}`);
  while (Date.now() < stopAt && !stopping) {
    const updates = await tg('getUpdates', { offset, timeout: 45, allowed_updates: ['message'] });
    if (!updates) { await sleep(3000); continue; }
    for (const u of updates) {
      offset = u.update_id + 1;
      try { if (u.message) await onMessage(u.message); } catch (e) { console.error('update error', e.message); }
    }
    if (updates.length) writeFileSync(OFFSET_FILE, String(offset));
    if (dirty.size && Date.now() - lastPub > 20000) { publish(); lastPub = Date.now(); }
    if (pagesPending && Date.now() - lastPages >= 90000) triggerPages();
  }
  writeFileSync(OFFSET_FILE, String(offset));
  if (offset) await tg('getUpdates', { offset, timeout: 0, limit: 1 }); // подтвердить обработанное Telegram
  publish();
  console.log('finished, offset', offset);
}
main();
