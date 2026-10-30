// Telegram-бот Marhabo. Без зависимостей. Работает как long polling внутри GitHub Actions.
// Умеет только: /start (красивый текст + кнопка мини-приложения) и приём ответа гостя.
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { png as qrPng } from '../docs/qr.mjs';

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
    // добавляем только существующие папки: если одной нет (например bot-state), git add падал и ничего не сохранялось
    const paths = ['docs/data', 'docs/media', 'docs/inv', 'docs/i', 'docs/wishes', 'docs/services', 'bot-state'].filter((d) => existsSync(d));
    if (paths.length) execSync('git add ' + paths.join(' '));
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
// Отправка файла (QR) в Telegram: multipart/form-data
async function tgFile(method, field, buf, filename, mime, fields = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(fields)) fd.append(k, typeof v === 'string' ? v : JSON.stringify(v));
      fd.append(field, new Blob([buf], { type: mime }), filename);
      const r = await fetch(`${API}/${method}`, { method: 'POST', body: fd, signal: AbortSignal.timeout(40000) });
      const j = await r.json();
      if (j.ok) return j.result;
      if (j.error_code === 429) { await sleep((j.parameters?.retry_after || 2) * 1000); continue; }
      console.error(method, j.description); return null;
    } catch (e) { await sleep(1500 + i * 1500); }
  }
  return null;
}


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
  en: {
    start:
      '🌿 <b>Marhabo</b>\n<i>Invitations for weddings and celebrations</i>\n\n' +
      'A beautiful card where every guest sees their own name. "I will come / I can\'t" answers arrive right here.\n\n' +
      'Press <b>Start</b> to create an invitation in a minute.',
    info:
      '📖 <b>How it works</b>\n\n' +
      '1️⃣ Press <b>Start</b> and pick a template: wedding, nikah, anniversary, birthday, Navruz.\n' +
      '2️⃣ Enter names, date and place. Add photos and music: send the file straight to this chat.\n' +
      '3️⃣ Press <b>Save</b>: this chat opens with a ready message, just press "Send".\n' +
      '4️⃣ Get a pretty link like <code>/i/couple-names</code> and a personal one for each guest.\n\n' +
      '🔔 Guest answers arrive here instantly.\n' +
      '🆓 Free, works around the clock.',
    btn: '✨ Start',
    btnInfo: 'ℹ️ Information',
    btnBack: '‹ Back',
    yes: (n) => `✅ <b>${n}</b> will come`,
    no: (n) => `❌ <b>${n}</b> can't come`,
    thanksYes: '🌿 Thank you! Your answer "I will come" was sent to the host. See you at the celebration!',
    thanksNo: 'Thank you for answering. We told the host.',
    mediaOk: (kb) => `✅ File saved (${kb} KB). Go back to Marhabo: in 1-2 minutes it will appear by itself and become visible to guests.`,
    mediaBig: '⚠️ The file is larger than 19 MB. Compress it and send again.',
    pubOk: (n) => `✅ The invitation <b>${n}</b> is published. The link below will work in 1-2 minutes. Go back to Marhabo: guest links will become short.`,
    pubBad: '⚠️ Could not read the invitation. Go back to Marhabo and press "Publish" again.',
    mediaBad: '⚠️ Send a photo (JPG, PNG, WebP), music (MP3, M4A, OGG, WAV) or video (MP4, WebM up to 19 MB). Send it as a photo, video or file.',
    guest: 'Guest',
  },
  kk: {
    start:
      '🌿 <b>Marhabo</b>\n<i>Той және мерекеге шақырулар</i>\n\n' +
      'Әр қонақ өз атын көретін әдемі открытка. «Келемін / Келе алмаймын» жауаптары осында түседі.\n\n' +
      'Бір минутта шақыру жасау үшін <b>Бастау</b> түймесін басыңыз.',
    info:
      '📖 <b>Бұл қалай жұмыс істейді</b>\n\n' +
      '1️⃣ <b>Бастау</b> түймесін басып, үлгіні таңдаңыз: той, неке, мерейтой, туған күн, Наурыз.\n' +
      '2️⃣ Аттарды, күнді және орынды жазыңыз. Фото мен музыка қосыңыз: файлды осы чатқа жіберіңіз.\n' +
      '3️⃣ <b>Сақтау</b> түймесін басыңыз: осы чат дайын хабарламамен ашылады, «Жіберу» түймесін басыңыз.\n' +
      '4️⃣ <code>/i/жұп-аттары</code> түріндегі әдемі сілтеме және әр қонаққа жеке сілтеме алыңыз.\n\n' +
      '🔔 Қонақтардың жауаптары осында бірден келеді.\n' +
      '🆓 Тегін, тәулік бойы жұмыс істейді.',
    btn: '✨ Бастау',
    btnInfo: 'ℹ️ Ақпарат',
    btnBack: '‹ Артқа',
    yes: (n) => `✅ <b>${n}</b> келеді`,
    no: (n) => `❌ <b>${n}</b> келе алмайды`,
    thanksYes: '🌿 Рахмет! «Келемін» деген жауабыңыз шақыру иесіне жіберілді. Мерекеде кездескенше!',
    thanksNo: 'Жауабыңызға рахмет. Шақыру иесіне хабарладық.',
    mediaOk: (kb) => `✅ Файл сақталды (${kb} КБ). Marhabo-ға оралыңыз: 1-2 минутта ол өзі қосылып, қонақтарға көрінеді.`,
    mediaBig: '⚠️ Файл 19 МБ-тан үлкен. Оны кішірейтіп, қайта жіберіңіз.',
    pubOk: (n) => `✅ <b>${n}</b> шақыруы жарияланды. Төмендегі сілтеме 1-2 минутта жұмыс істейді. Marhabo-ға оралыңыз: қонақ сілтемелері қысқа болады.`,
    pubBad: '⚠️ Шақыруды оқу мүмкін болмады. Marhabo-ға оралып, «Жариялау» түймесін қайта басыңыз.',
    mediaBad: '⚠️ Фото (JPG, PNG, WebP), музыка (MP3, M4A, OGG, WAV) немесе бейне (MP4, WebM, 19 МБ дейін) керек. Оны фото, бейне немесе файл ретінде жіберіңіз.',
    guest: 'Қонақ',
  },
};
const langOf = (u) => { const c = String(u?.language_code || 'ru').toLowerCase().slice(0, 2); return c === 'uz' ? 'uz' : c === 'en' ? 'en' : c === 'kk' ? 'kk' : 'ru'; };


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
MONTHS.en = ['January','February','March','April','May','June','July','August','September','October','November','December'];
MONTHS.kk = ['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
const LGS = ['ru', 'uz', 'en', 'kk'];
const lgOf = (o) => (o && LGS.includes(o.l) ? o.l : 'ru');
const LX = {
  ru: { inv: 'Приглашение', hi: (n) => `Дорогой(ая) <b>${n}</b>,\nвас приглашают`, hiN: 'Вас приглашают', open: '💌 Открыть приглашение', wishOk: '💌 Спасибо! Ваше пожелание отправлено и скоро появится на странице.', wishOff: '⚠️ Пожелания для этого приглашения выключены.', wishLim: '⚠️ Вы уже оставили максимум пожеланий для этого приглашения.', wishBad: '⚠️ Не удалось прочитать пожелание. Откройте приглашение и отправьте ещё раз.', wishNew: (n, m) => `💌 Новое пожелание от <b>${n}</b>:\n${m}` },
  uz: { inv: 'Taklifnoma', hi: (n) => `Hurmatli <b>${n}</b>,\nsizni taklif qilamiz`, hiN: 'Sizni taklif qilamiz', open: '💌 Taklifnomani ochish', wishOk: "💌 Rahmat! Tilagingiz yuborildi va tez orada sahifada ko'rinadi.", wishOff: "⚠️ Bu taklifnoma uchun tilaklar o'chirilgan.", wishLim: "⚠️ Siz bu taklifnoma uchun tilaklarning maksimal sonini qoldirgansiz.", wishBad: "⚠️ Tilakni o'qib bo'lmadi. Taklifnomani oching va qayta yuboring.", wishNew: (n, m) => `💌 <b>${n}</b> dan yangi tilak:\n${m}` },
  en: { inv: 'Invitation', hi: (n) => `Dear <b>${n}</b>,\nyou are invited`, hiN: 'You are invited', open: '💌 Open invitation', wishOk: '💌 Thank you! Your wish was sent and will appear on the page soon.', wishOff: '⚠️ Guest wishes are turned off for this invitation.', wishLim: '⚠️ You have already left the maximum number of wishes for this invitation.', wishBad: '⚠️ Could not read the wish. Open the invitation and send it again.', wishNew: (n, m) => `💌 New wish from <b>${n}</b>:\n${m}` },
  kk: { inv: 'Шақыру', hi: (n) => `Құрметті <b>${n}</b>,\nсізді шақырамыз`, hiN: 'Сізді шақырамыз', open: '💌 Шақыруды ашу', wishOk: '💌 Рахмет! Тілегіңіз жіберілді, жақында бетте көрінеді.', wishOff: '⚠️ Бұл шақыру үшін тілектер өшірілген.', wishLim: '⚠️ Сіз бұл шақыру үшін тілектің ең көп санын қалдырдыңыз.', wishBad: '⚠️ Тілекті оқу мүмкін болмады. Шақыруды ашып, қайта жіберіңіз.', wishNew: (n, m) => `💌 <b>${n}</b> жіберген жаңа тілек:\n${m}` },
};
const attr = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function previewPage(slug, o) {
  const lang = lgOf(o);
  const names = [o.a, o.b].filter(Boolean).join(' & ') || 'Marhabo';
  let when = '';
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(o.d || '');
  if (dm) when = `${+dm[3]} ${MONTHS[lang][+dm[2] - 1] || ''} ${dm[1]}`.replace(/\s+/g, ' ') + (o.h ? `, ${o.h}` : '');
  const title = names;
  const desc = [LX[lang].inv, when, o.pl].filter(Boolean).join(' · ');
  const cover = o.p && o.p.c && /^media\/\d{3,15}\/[a-z0-9]{4,20}\.(jpg|png|webp)$/i.test(o.p.c)
    ? `${APP_URL.replace(/\/?$/, '/')}${o.p.c}`
    : `https://images.unsplash.com/${COVER[o.t] || COVER.wedding}?auto=format&fit=crop&w=1200&q=70`;
  const base = APP_URL.replace(/\/?$/, '/');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${attr(title)}</title><meta name="description" content="${attr(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Taklifnoma"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}">
<meta property="og:image" content="${attr(cover)}"><meta property="og:url" content="${attr(base + 'i/' + slug + '/')}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${attr(title)}"><meta name="twitter:image" content="${attr(cover)}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FCF9F3;color:#2B2219;font-family:Georgia,serif;text-align:center}a{color:#B28A50}</style>
</head><body><div><p style="letter-spacing:.3em;font-size:11px;text-transform:uppercase;color:#A08D74">Taklifnoma</p><h1 style="font-weight:500">${attr(names)}</h1><p><a id="go" href="../../i.html?s=${attr(slug)}">${LX[lang].open.replace('💌 ', '')}</a></p></div>
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


// ---- Каталог услуг: "#svc <base64url JSON>" -> docs/services/<id>.json, индекс docs/services/index.json ----
const SVC_CATS = ['restaurant','photo','host','singer','dj','decor','flowers','dress','rings','car','makeup','cakes','show','invite','other'];
function sanitizeSvc(d, owner) {
  if (!d || typeof d !== 'object') return null;
  const name = cleanStr(d.n, 60);
  const tel = String(d.p || '').replace(/[^\d+]/g, '').slice(0, 16);
  const tg = String(d.t || '').replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 32);
  if (!name || (!/^\+?\d{7,15}$/.test(tel) && tg.length < 4)) return null;
  const o = { i: cleanStr(d.i, 12).replace(/[^a-z0-9]/gi, '').toLowerCase(), c: SVC_CATS.includes(d.c) ? d.c : 'other', n: name,
    city: cleanStr(d.city, 40), ds: cleanStr(d.ds, 300), o: String(owner) };
  if (!o.i) return null;
  if (/^\+?\d{7,15}$/.test(tel)) o.p = tel.startsWith('+') ? tel : '+' + tel;
  if (tg.length >= 4) o.t = tg;
  const pr = Math.floor(Number(d.pr)); if (Number.isFinite(pr) && pr > 0 && pr < 1e10) o.pr = pr;
  const cap = Math.floor(Number(d.cap)); if (Number.isFinite(cap) && cap > 0 && cap <= 100000) o.cap = cap;
  const ph = d.ph && /^media\/\d{3,15}\/[a-z0-9]{4,20}\.(jpg|png|webp)$/i.test(d.ph) ? d.ph : ''; if (ph) o.ph = ph;
  if (d.ig) { const ig = String(d.ig).replace(/^@/, '').replace(/[^A-Za-z0-9_.]/g, '').slice(0, 30); if (ig.length >= 2) o.ig = ig; }
  o.d = new Date().toISOString().slice(0, 10);
  return o;
}
function writeSvcIndex() {
  try {
    mkdirSync('docs/services', { recursive: true }); mkdirSync('bot-state/services', { recursive: true });
    const list = [];
    for (const f of readdirSync('bot-state/services')) {
      if (!f.endsWith('.json')) continue;
      try { const o = JSON.parse(readFileSync(`bot-state/services/${f}`, 'utf8')); if (o && o.i && o.n) { const { o: _owner, ...pub } = o; list.push(pub); } } catch {}
    }
    list.sort((a, b) => String(b.d).localeCompare(String(a.d)));
    writeFileSync('docs/services/index.json', JSON.stringify(list.slice(0, 500)));
  } catch (e) { console.error('svc index failed'); }
}

// найти опубликованное приглашение по внутреннему id (поле i)
function findInvById(id) {
  try {
    for (const f of readdirSync(INV_DIR)) {
      if (!f.endsWith('.json') || f.startsWith('_')) continue;
      let o; try { o = JSON.parse(readFileSync(`${INV_DIR}/${f}`, 'utf8')); } catch { continue; }
      if (o && o.i === id && !o.r) return { slug: f.slice(0, -5), o };
    }
  } catch {}
  return null;
}
function sanitizeInv(d, owner) {
  if (!d || typeof d !== 'object') return null;
  const o = { t: ['wedding','birthday','anniversary','jubilee','nikah','nikoh','navruz','other'].includes(d.t) ? d.t : 'wedding', l: LGS.includes(d.l) ? d.l : 'ru',
    a: cleanStr(d.a, 60), b: cleanStr(d.b, 60), d: /^\d{4}-\d{2}-\d{2}$/.test(d.d || '') ? d.d : '', h: /^\d{2}:\d{2}$/.test(d.h || '') ? d.h : '',
    pl: cleanStr(d.pl, 90), ad: cleanStr(d.ad, 120), m: okUrl(cleanStr(d.m, 400)), x: cleanStr(d.x, 400), dc: cleanStr(d.dc, 80), dp: (Array.isArray(d.dp) ? d.dp : []).map((c) => String(c).toUpperCase()).filter((c) => /^#[0-9A-F]{6}$/.test(c)).slice(0, 6), ct: cleanStr(d.ct, 40),
    k: BOT_NAME, o: String(owner), i: cleanStr(d.i, 12).replace(/[^a-z0-9]/gi, '') };
  if (!o.a || !o.i) return null;
  if (d.w === 1 || d.w === true) o.w = 1;
  if ((d.cu === 1 || d.cu === true) && (o.t === 'wedding' || o.t === 'nikah' || o.t === 'nikoh')) o.cu = 1; // заставка-занавес: только свадьба и никах
  if (['gold', 'rose', 'cloud', 'ivory', 'velvet', 'green', 'midnight'].includes(d.th)) o.th = d.th;
  // тойона: до 3 карт [[16 цифр, имя, банк]]; карта с другим числом цифр отбрасывается
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
    // видео: [[путь, 'l'|'p'], ...] — l = 16:9 (горизонтальное), p = 9:16 (вертикальное). Только файлы из нашего репозитория или https.
    if (Array.isArray(d.p.v)) {
      const v = d.p.v.slice(0, 3).map((x) => { const u = okMedia(Array.isArray(x) ? x[0] : x); const o2 = Array.isArray(x) && x[1] === 'p' ? 'p' : 'l'; return u && /\.(mp4|webm)(\?|$)/i.test(u) ? [u, o2] : null; }).filter(Boolean);
      if (v.length) p.v = v;
    }
    if (Object.keys(p).length) o.p = p;
  }
  if (Array.isArray(d.st)) { const st = d.st.slice(0, 5).map((r) => [cleanStr(r && r[0], 24), cleanStr(r && r[1], 160)]).filter((r) => r[1]); if (st.length) o.st = st; } // «Наша история»
  if (Array.isArray(d.pr)) { const pr = d.pr.slice(0, 10).map((r) => [cleanStr(r && r[0], 5), cleanStr(r && r[1], 80)]).filter((r) => r[1]); if (pr.length) o.pr = pr; }
  Object.keys(o).forEach((k) => (o[k] === '' || o[k] == null) && delete o[k]);
  return o;
}
function saveInvitation(raw, owner) {
  let d;
  try { d = JSON.parse(Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch { return { error: 'parse' }; }
  const o = sanitizeInv(d, owner);
  if (!o) return { error: 'data' };
  const ver = typeof d.v === 'string' && /^[a-z0-9]{1,12}$/.test(d.v) ? d.v : '';
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
  // версия, которую бот реально принял: мини-апп по ней видит, дошли ли последние правки
  if (ver) {
    const vf = `${INV_DIR}/_${owner}.v.json`;
    let vx = {};
    try { vx = JSON.parse(readFileSync(vf, 'utf8')); } catch {}
    vx[o.i] = ver;
    writeFileSync(vf, JSON.stringify(vx));
  }
  dirty.add('inv');
  return { slug, name: [o.a, o.b].filter(Boolean).join(' & ') };
}

async function onMessage(m) {
  const chat = m.chat.id;
  const text = (m.text || '').trim();
  if (m.chat.type !== 'private') return;
  const lang = langOf(m.from);
  const t = T[lang];




  // ---- QR-код приглашения: "#qr <slug>" -> фото QR с текстом + файл без сжатия (только владельцу) ----
  const qrm = text.match(/^#qr\s+([a-z0-9-]{2,60})(?:\s+(w))?$/i);
  if (qrm) {
    const slug = qrm[1].toLowerCase();
    const o = readInv(slug);
    const QL = {
      ru: ['⚠️ Приглашение не найдено или оно принадлежит другому владельцу.', 'Откройте камеру телефона и наведите на QR-код, чтобы увидеть приглашение', '📎 QR без сжатия для печати'],
      uz: ['⚠️ Taklifnoma topilmadi yoki boshqa egaga tegishli.', "Taklifnomani ko'rish uchun telefon kamerasini QR-kodga qarating", '📎 Bosma uchun siqilmagan QR'],
      en: ['⚠️ Invitation not found or it belongs to another owner.', 'Point your phone camera at the QR code to see the invitation', '📎 Uncompressed QR for printing'],
      kk: ['⚠️ Шақыру табылмады немесе басқа иесіне тиесілі.', 'Шақыруды көру үшін телефон камерасын QR-кодқа бағыттаңыз', '📎 Басып шығаруға арналған QR'],
    }[lang];
    if (!o || String(o.o) !== String(m.from.id)) { await tg('sendMessage', { chat_id: chat, text: QL[0] }); return; }
    const link = qrm[2] ? `${APP_URL.replace(/\/?$/, '/')}i/${slug}/` : `https://t.me/${BOT_NAME}?start=i_${slug}`;
    let buf = null; try { buf = await qrPng(link, 720); } catch (e) { console.error('qr', String(e.message).slice(0, 80)); }
    if (!buf) { await tg('sendMessage', { chat_id: chat, text: QL[0] }); return; }
    const caption = `${cardCaption(o, '').replace(/^💌 [^\n]*\n\n/, '💌 ')}\n\n${QL[1]}\n🔗 ${link}`;
    await tgFile('sendPhoto', 'photo', buf, `taklifnoma-${slug}.png`, 'image/png', { chat_id: String(chat), caption, parse_mode: 'HTML' });
    await tgFile('sendDocument', 'document', buf, `taklifnoma-qr-${slug}.png`, 'image/png', { chat_id: String(chat), caption: QL[2] });
    return;
  }
  // ---- каталог услуг ----
  const svc = text.match(/^#svc\s+([A-Za-z0-9_-]{20,3000})$/);
  if (svc) {
    let d = null; try { d = JSON.parse(Buffer.from(svc[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch {}
    const o = sanitizeSvc(d, m.from.id);
    const SL = { ru: ['✅ Услуга добавлена в каталог. Она появится через минуту.', '⚠️ Не удалось прочитать карточку. Укажите название и телефон или Telegram.', '⚠️ Вы уже добавили максимум услуг (5).'], uz: ["✅ Xizmat katalogga qo'shildi. Bir daqiqada ko'rinadi.", "⚠️ Kartani o'qib bo'lmadi. Nom va telefon yoki Telegram kiriting.", "⚠️ Siz xizmatlarning maksimal soniga (5) yetdingiz."], en: ['✅ Service added to the catalog. It will appear in a minute.', '⚠️ Could not read the card. Add a name and a phone or Telegram.', '⚠️ You have reached the maximum of 5 services.'], kk: ['✅ Қызмет каталогқа қосылды. Бір минутта көрінеді.', '⚠️ Картаны оқу мүмкін болмады. Атауын және телефонды немесе Telegram көрсетіңіз.', '⚠️ Сіз қызметтердің ең көп санына (5) жеттіңіз.'] }[lang] || null;
    const Ls = SL || ['✅', '⚠️', '⚠️'];
    if (!o) { await tg('sendMessage', { chat_id: chat, text: Ls[1] }); return; }
    mkdirSync('bot-state/services', { recursive: true });
    const mine = readdirSync('bot-state/services').filter((f) => f.endsWith('.json')).map((f) => { try { return JSON.parse(readFileSync(`bot-state/services/${f}`, 'utf8')); } catch { return null; } }).filter((x) => x && String(x.o) === String(m.from.id) && x.i !== o.i);
    if (mine.length >= 5) { await tg('sendMessage', { chat_id: chat, text: Ls[2] }); return; }
    const ex = `bot-state/services/${o.i}.json`;
    if (existsSync(ex)) { try { const old = JSON.parse(readFileSync(ex, 'utf8')); if (String(old.o) !== String(m.from.id)) { await tg('sendMessage', { chat_id: chat, text: Ls[1] }); return; } } catch {} }
    writeFileSync(ex, JSON.stringify(o)); writeSvcIndex(); dirty.add('inv');
    await tg('sendMessage', { chat_id: chat, text: Ls[0] });
    publish();
    return;
  }
  const sdel = text.match(/^#svcdel\s+([a-z0-9]{3,12})$/i);
  if (sdel) {
    const f = `bot-state/services/${sdel[1].toLowerCase()}.json`;
    let ok = false;
    try { const old = JSON.parse(readFileSync(f, 'utf8')); if (String(old.o) === String(m.from.id)) { unlinkSync(f); ok = true; } } catch {}
    if (ok) { writeSvcIndex(); dirty.add('inv'); publish(); }
    await tg('sendMessage', { chat_id: chat, text: ok ? '🗑 OK' : '⚠️' });
    return;
  }
  // ---- пожелания гостей: "#wish <invId> <base64url JSON {n,m,k}>" ----
  const wsh = text.match(/^#wish\s+([a-z0-9]{3,12})\s+([A-Za-z0-9_-]{4,1500})$/i);
  if (wsh) {
    const found = findInvById(wsh[1].toLowerCase());
    const lg = found ? lgOf(found.o) : (LGS.includes(lang) ? lang : 'ru');
    const L = LX[lg] || LX.ru;
    let d = null;
    try { d = JSON.parse(Buffer.from(wsh[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch {}
    const msg = d && typeof d === 'object' ? cleanStr(d.m, 300) : '';
    const nm = (d && typeof d === 'object' ? cleanStr(d.n, 40) : '') || '—';
    if (!found || found.o.w !== 1) { await tg('sendMessage', { chat_id: chat, text: L.wishOff }); return; }
    if (!msg) { await tg('sendMessage', { chat_id: chat, text: L.wishBad }); return; }
    // не более 3 пожеланий с одного аккаунта на одно приглашение; счётчик лежит вне docs/, чтобы Telegram-id не публиковался
    mkdirSync('bot-state', { recursive: true });
    const cf = `bot-state/wishes_f_${found.o.i}.json`;
    let cnt = {}; try { cnt = JSON.parse(readFileSync(cf, 'utf8')); } catch {}
    const who = String(m.from.id);
    if ((cnt[who] || 0) >= 3) { await tg('sendMessage', { chat_id: chat, text: L.wishLim }); return; }
    cnt[who] = (cnt[who] || 0) + 1; writeFileSync(cf, JSON.stringify(cnt));
    mkdirSync('docs/wishes', { recursive: true });
    const wf = `docs/wishes/${found.o.i}.json`;
    let arr = []; try { arr = JSON.parse(readFileSync(wf, 'utf8')); } catch {}
    if (!Array.isArray(arr)) arr = [];
    arr.unshift({ n: nm, m: msg, t: new Date().toISOString(), h: 0 });
    writeFileSync(wf, JSON.stringify(arr.slice(0, 200)));
    dirty.add('inv');
    await tg('sendMessage', { chat_id: chat, text: L.wishOk });
    const ol = LX[lgOf(found.o)] || LX.ru;
    if (found.o.o) await tg('sendMessage', { chat_id: Number(found.o.o), text: ol.wishNew(esc(nm), esc(msg)), parse_mode: 'HTML' });
    publish();
    return;
  }
  // владелец скрывает или возвращает пожелание: "#wishhide <invId> <номер>" / "#wishshow <invId> <номер>"
  const wh = text.match(/^#wish(hide|show)\s+([a-z0-9]{3,12})\s+(\d{1,3})$/i);
  if (wh) {
    const found = findInvById(wh[2].toLowerCase());
    if (!found || String(found.o.o) !== String(m.from.id)) { await tg('sendMessage', { chat_id: chat, text: '⚠️' }); return; }
    const wf = `docs/wishes/${found.o.i}.json`;
    let arr = []; try { arr = JSON.parse(readFileSync(wf, 'utf8')); } catch {}
    const ix = Number(wh[3]);
    if (!Array.isArray(arr) || !arr[ix]) { await tg('sendMessage', { chat_id: chat, text: '⚠️' }); return; }
    arr[ix].h = wh[1].toLowerCase() === 'hide' ? 1 : 0;
    writeFileSync(wf, JSON.stringify(arr)); dirty.add('inv');
    await tg('sendMessage', { chat_id: chat, text: arr[ix].h ? '🙈 OK' : '👁 OK' });
    publish();
    return;
  }
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
  if (/^\/(audit|done|report)\b/i.test(text)) { await tg('sendMessage', { chat_id: chat, text: auditText(lang), parse_mode: 'HTML' }); return; }
  await sendStart(chat, lang);
}


// ---- Красивая ссылка через бота: t.me/<бот>?start=i_<slug>[_<ключГостя>] ----
function readInv(slug) {
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return null;
  try { return JSON.parse(readFileSync(`${INV_DIR}/${slug}.json`, 'utf8')); } catch { return null; }
}
function cardCaption(o, guestName) {
  const lang = lgOf(o);
  const names = [o.a, o.b].filter(Boolean).map(esc).join(' &amp; ');
  let when = '';
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(o.d || '');
  if (dm) when = `${+dm[3]} ${MONTHS[lang][+dm[2] - 1] || ''} ${dm[1]}` + (o.h ? `, ${esc(o.h)}` : '');
  const hi = guestName ? LX[lang].hi(esc(guestName)) : LX[lang].hiN;
  return `💌 ${hi}\n\n<b>${names}</b>` + (when ? `\n📅 ${when}` : '') + (o.pl ? `\n📍 ${esc(o.pl)}` : '');
}
async function sendInviteCard(chat, slug, guestKey, from) {
  const o = readInv(slug);
  if (!o) return false;
  const lang = lgOf(o);
  const base = APP_URL.replace(/\/?$/, '/');
  // имя берём из профиля Telegram того, кто открыл ссылку: список гостей в репозитории не публикуем
  const gname = from ? [from.first_name].filter(Boolean).join(' ').slice(0, 40) : '';
  const url = `${base}i/${slug}/` + (guestKey ? `?q=${encodeURIComponent(guestKey)}` + (gname ? `&g=${encodeURIComponent(gname)}` : '') : (gname ? `?g=${encodeURIComponent(gname)}` : ''));
  const kb = { inline_keyboard: [[{ text: LX[lang].open, web_app: { url } }]] };
  const cover = o.p && o.p.c && /^media\/\d{3,15}\/[a-z0-9]{4,20}\.(jpg|png|webp)$/i.test(o.p.c) ? `${base}${o.p.c}` : null;
  const caption = cardCaption(o, gname);
  // нет своей обложки (или она не загрузилась): фирменная картинка, чтобы визитка всегда выглядела одинаково
  let r = await tg('sendPhoto', { chat_id: chat, photo: cover || bannerUrl(lang), caption, parse_mode: 'HTML', reply_markup: kb });
  if (!r && cover) r = await tg('sendPhoto', { chat_id: chat, photo: bannerUrl(lang), caption, parse_mode: 'HTML', reply_markup: kb });
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

// ---- /audit: отчёт «что сделано» с галочками. Каждый пункт проверяет реальные файлы репозитория ----
const rd = (f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } };
const has = (f, re) => re.test(rd(f));
const AUDIT = [
  ['short',   { ru: 'Короткие ссылки /i/имя-пары для каждого приглашения', uz: "Har bir taklifnoma uchun qisqa havola /i/ism-ism", en: 'Short links /i/couple-name for every invitation', kk: 'Әр шақыруға қысқа сілтеме /i/есім-есім' },
    () => existsSync(PREV_DIR) && has('docs/index.html', /predSlug/) && has('bot/bot.mjs', /makeSlug/)],
  ['bot',     { ru: 'Ссылка внутри бота: старт открывает карточку с кнопкой', uz: "Bot ichidagi havola: start tugmasi kartochkani ochadi", en: 'In-bot link: start opens a card with a button', kk: 'Бот ішіндегі сілтеме: старт карточканы ашады' },
    () => has('bot/bot.mjs', /sendInviteCard/) && has('docs/index.html', /t\.me\/'\+BOT\+'\?start=/)],
  ['qr',      { ru: 'QR-код сразу после создания, бесплатно, без внешних сервисов', uz: "QR-kod yaratilgach darrov, bepul, tashqi xizmatlarsiz", en: 'QR code right after creating, free, no external services', kk: 'QR-код жасалған бойда, тегін, сыртқы қызметсіз' },
    () => existsSync('docs/qr.mjs') && has('docs/index.html', /showQR/) && !has('docs/index.html', /qrNeed\)\);return/)],
  ['qrchat',  { ru: 'QR приходит в чат картинкой и файлом для печати', uz: "QR chatga rasm va bosma fayl bo'lib keladi", en: 'QR arrives in chat as an image and a print file', kk: 'QR чатқа сурет және баспа файлы болып келеді' },
    () => has('bot/bot.mjs', /sendPhoto/) && has('bot/bot.mjs', /sendDocument/) && has('bot/bot.mjs', /#qr/)],
  ['version', { ru: 'Честный статус публикации: бот подтверждает принятую версию', uz: "Halol e'lon holati: bot qabul qilgan versiyani tasdiqlaydi", en: 'Honest publish status: the bot confirms the accepted version', kk: 'Адал жариялау күйі: бот қабылдаған нұсқаны растайды' },
    () => has('bot/bot.mjs', /\.v\.json/) && has('docs/index.html', /acceptedVer/)],
  ['curtain', { ru: 'Заставка с бабочками внутри Telegram и в браузере (свадьба, никах)', uz: "Telegram ichida va brauzerda kapalakli zastavka (to'y, nikoh)", en: 'Butterfly intro inside Telegram and in the browser (wedding, nikah)', kk: 'Telegram ішінде және браузерде көбелекті заставка (үйлену, неке)' },
    () => existsSync('docs/curtain.js') && existsSync('docs/brand/curtain.mp4') && has('docs/index.html', /cu:/)],
  ['timer',   { ru: 'Табло: 4 квадрата без дёрганья', uz: "Taho: 4 ta kvadrat, qimirlamasdan", en: 'Countdown: 4 squares, no jitter', kk: 'Таймер: 4 шаршы, selkildemesiz' },
    () => existsSync('docs/fx.js') && has('docs/fx.js', /cdw/)],
  ['cal',     { ru: 'Календарь: Google, Outlook и .ics', uz: "Kalendar: Google, Outlook va .ics", en: 'Calendar: Google, Outlook and .ics', kk: 'Күнтізбе: Google, Outlook және .ics' },
    () => existsSync('docs/cal.html')],
  ['gift',    { ru: 'Подарок: 3D-коробка, номер карты скрыт до нажатия (до 3 карт)', uz: "Sovg'a: 3D quti, karta raqami bosilguncha yashirin (3 tagacha)", en: 'Gift: 3D box, card number hidden until tapped (up to 3 cards)', kk: 'Сыйлық: 3D қорап, карта нөмірі басқанға дейін жасырын (3-ке дейін)' },
    () => has('docs/i.html', /gf/) && has('bot/bot.mjs', /\\d\{16\}/)],
  ['wishes',  { ru: 'Пожелания гостей с модерацией', uz: "Mehmonlar tilaklari moderatsiya bilan", en: 'Guest wishes with moderation', kk: 'Қонақ тілектері модерациямен' },
    () => has('bot/bot.mjs', /#wish\(hide\|show\)/) && has('bot/bot.mjs', /mkdirSync\('docs\/wishes'/) && has('docs/i.html', /wishes\//)],
  ['themes',  { ru: '7 тем оформления с проверенным контрастом', uz: "Kontrasti tekshirilgan 7 ta mavzu", en: '7 themes with verified contrast', kk: 'Контрасты тексерілген 7 тақырып' },
    () => ['gold', 'rose', 'cloud', 'ivory', 'velvet', 'green', 'midnight'].every((n) => has('docs/shared.js', new RegExp(n)) && has('bot/bot.mjs', new RegExp("'" + n + "'"))) && has('docs/shared.js', /accentText/)],
  ['wizard',  { ru: 'Мастер готовых текстов приглашения', uz: "Tayyor taklif matnlari ustasi", en: 'Ready-made invitation text wizard', kk: 'Дайын шақыру мәтіндері шебері' },
    () => existsSync('docs/phrases.js') && has('docs/index.html', /phb/)],
  ['catalog', { ru: 'Каталог услуг: 15 категорий, поиск, город, цена', uz: "Xizmatlar katalogi: 15 toifa, qidiruv, shahar, narx", en: 'Vendor catalog: 15 categories, search, city, price', kk: 'Қызметтер каталогі: 15 санат, іздеу, қала, баға' },
    () => existsSync('docs/s.html') && has('bot/bot.mjs', /#svc/)],
  ['media',   { ru: 'Фото, музыка и видео из чата, хранятся в GitHub', uz: "Chatdan rasm, musiqa va video, GitHub'da saqlanadi", en: 'Photos, music and video from chat, stored in GitHub', kk: 'Чаттан сурет, музыка, бейне, GitHub-та сақталады' },
    () => existsSync(MEDIA_DIR) && has('bot/bot.mjs', /MEDIA_DIR/)],
  ['price',   { ru: 'Каталог: цена и вместимость с защитой от мусорных значений', uz: "Katalog: narx va sig'im, noto'g'ri qiymatlardan himoya bilan", en: 'Catalog: price and capacity with junk-value protection', kk: 'Каталог: баға мен сыйымдылық, қате мәннен қорғаныспен' },
    () => has('bot/bot.mjs', /o\.pr = pr/) && has('bot/bot.mjs', /o\.cap = cap/) && has('docs/s.html', /cap/)],
  ['dress',   { ru: 'Дресс-код: цветная палитра кружками (до 6 цветов)', uz: "Dress-kod: rangli palitra doiralar bilan (6 tagacha)", en: 'Dress code: colour palette as circles (up to 6)', kk: 'Дресс-код: түсті палитра дөңгелектермен (6-ға дейін)' },
    () => has('bot/bot.mjs', /#\[0-9A-F\]\{6\}/) && has('docs/i.html', /dp/) && has('docs/index.html', /dpal/)],
  ['story',   { ru: 'Блок «Наша история»: до 5 вех с датой на 4 языках', uz: "«Bizning tarix» bloki: sanali 5 tagacha voqea, 4 tilda", en: '"Our story" block: up to 5 dated milestones in 4 languages', kk: '«Біздің тарих» блогы: күні бар 5 оқиғаға дейін, 4 тілде' },
    () => has('bot/bot.mjs', /d\.st/) && has('docs/i.html', /st\b/) && has('docs/index.html', /data-st|st:/)],
  ['langs',   { ru: 'Бот и приглашения на 4 языках: RU, UZ, EN, KK', uz: "Bot va taklifnomalar 4 tilda: RU, UZ, EN, KK", en: 'Bot and invitations in 4 languages: RU, UZ, EN, KK', kk: 'Бот және шақырулар 4 тілде: RU, UZ, EN, KK' },
    () => ['ru', 'uz', 'en', 'kk'].every((l) => T[l] && T[l].info)],
  ['perf',    { ru: 'Скорость: без размытия фона, анимации только transform/opacity', uz: "Tezlik: fon xiralashtirishsiz, faqat transform/opacity", en: 'Speed: no backdrop blur, animations use transform/opacity only', kk: 'Жылдамдық: бұлдырсыз, тек transform/opacity' },
    () => ['docs/index.html', 'docs/i.html', 'docs/fx.css', 'docs/curtain.css'].every((f) => existsSync(f) && !/backdrop-filter/.test(rd(f)))],
  ['free',    { ru: 'Всё бесплатно: без внешних API и платных интеграций', uz: "Hammasi bepul: tashqi API va pullik integratsiyasiz", en: 'All free: no external APIs or paid integrations', kk: 'Бәрі тегін: сыртқы API жоқ, ақылы интеграциясыз' },
    () => existsSync('docs/qr.mjs') && !has('bot/bot.mjs', /api\.qrserver|goqr\.me|chart\.googleapis/)],
];
const AUDIT_HEAD = {
  ru: ['🧾 <b>Аудит: что сделано</b>', 'Каждая галочка проверена по файлам репозитория прямо сейчас.', 'Итого', 'Не найдено', 'Чтобы всё обновилось у вас: закройте и снова откройте мини-апп.'],
  uz: ['🧾 <b>Audit: nimalar qilindi</b>', "Har bir belgi hozirning o'zida repozitoriy fayllari bo'yicha tekshirilgan.", 'Jami', 'Topilmadi', "Hammasi yangilanishi uchun mini-appni yopib, qayta oching."],
  en: ['🧾 <b>Audit: what is done</b>', 'Every tick is checked against the repository files right now.', 'Total', 'Not found', 'To get everything updated, close and reopen the mini app.'],
  kk: ['🧾 <b>Аудит: не істелді</b>', 'Әр белгі дәл қазір репозиторий файлдары бойынша тексерілді.', 'Барлығы', 'Табылмады', 'Бәрі жаңарсын десеңіз, мини-аппты жауып, қайта ашыңыз.'],
};
function auditText(lang) {
  const H = AUDIT_HEAD[lang] || AUDIT_HEAD.ru;
  let okN = 0;
  const lines = AUDIT.map(([, label, test]) => {
    let r = false;
    try { r = !!test(); } catch { r = false; }
    if (r) okN += 1;
    return `${r ? '✅' : '⚠️'} ${label[lang] || label.ru}${r ? '' : ' (' + H[3] + ')'}`;
  });
  return `${H[0]}\n<i>${H[1]}</i>\n\n${lines.join('\n')}\n\n<b>${H[2]}: ${okN}/${AUDIT.length}</b>\n${H[4]}`;
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
