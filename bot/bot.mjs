// Telegram-бот Marhabo. Без зависимостей. Работает как long polling внутри GitHub Actions.
// Умеет только: /start (красивый текст + кнопка мини-приложения) и приём ответа гостя.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL;           // https://<user>.github.io/<repo>/
const RUN_MINUTES = Number(process.env.RUN_MINUTES || 340);
if (!TOKEN || !APP_URL) { console.error('BOT_TOKEN и APP_URL обязательны'); process.exit(1); }

const API = `https://api.telegram.org/bot${TOKEN}`;
const OFFSET_FILE = 'bot/offset.txt';
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
    guest: 'Mehmon',
  },
};
const langOf = (u) => ((u?.language_code || 'ru').startsWith('uz') ? 'uz' : 'ru');

async function onMessage(m) {
  const chat = m.chat.id;
  const text = (m.text || '').trim();
  if (m.chat.type !== 'private') return;
  const lang = langOf(m.from);
  const t = T[lang];

  // ответ гостя: /start r<y|n>_<ownerId>_<invId>
  const rs = text.match(/^\/start\s+r([yn])_(\d{3,15})_([a-z0-9]{0,12})$/i);
  if (rs) {
    const yes = rs[1].toLowerCase() === 'y';
    const owner = Number(rs[2]);
    const name = [m.from.first_name, m.from.last_name].filter(Boolean).join(' ') || t.guest;
    const handle = m.from.username ? ` (@${esc(m.from.username)})` : '';
    // язык сообщения владельцу берём из его профиля, по умолчанию русский
    const ownerInfo = await tg('getChat', { chat_id: owner });
    const ol = T[(ownerInfo && ownerInfo.language_code) ? langOf(ownerInfo) : 'ru'];
    const sent = await tg('sendMessage', { chat_id: owner, text: `📩 ${(yes ? ol.yes : ol.no)(esc(name))}${handle}`, parse_mode: 'HTML' });
    await tg('sendMessage', { chat_id: chat, text: sent ? (yes ? t.thanksYes : t.thanksNo) : t.thanksNo, parse_mode: 'HTML' });
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

async function main() {
  await setup();
  let offset = existsSync(OFFSET_FILE) ? Number(readFileSync(OFFSET_FILE, 'utf8')) || 0 : 0;
  const stopAt = Date.now() + RUN_MINUTES * 60 * 1000;
  console.log(`polling, offset=${offset}, until ${new Date(stopAt).toISOString()}`);
  while (Date.now() < stopAt) {
    const updates = await tg('getUpdates', { offset, timeout: 45, allowed_updates: ['message'] });
    if (!updates) { await sleep(3000); continue; }
    for (const u of updates) {
      offset = u.update_id + 1;
      try { if (u.message) await onMessage(u.message); } catch (e) { console.error('update error', e.message); }
    }
    if (updates.length) writeFileSync(OFFSET_FILE, String(offset));
  }
  writeFileSync(OFFSET_FILE, String(offset));
  console.log('finished, offset', offset);
}
main();
