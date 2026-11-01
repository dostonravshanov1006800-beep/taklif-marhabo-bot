/* Массовая отправка и напоминания гостям. Чистые функции (без DOM), чтобы их можно было проверить в Node.
   Бот не знает телефонов гостей и не может писать первым, поэтому отправку делает сам владелец одним нажатием на гостя:
   открывается выбор чата Telegram с готовым персональным текстом, а очередь сама переходит к следующему. */
export const LANGS = ['ru', 'uz', 'en', 'kk'];
const MON = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  kk: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
};
const MSG = {
  ru: { inv: (n, who, d) => `${n}, приглашаем вас${who ? ' на ' + who : ''}${d ? ', ' + d : ''}. Откройте персональное приглашение:`,
        rem: (n, who, d, left) => `${n}, напоминаем${who ? ' про ' + who : ''}${d ? ' (' + d + ')' : ''}${left === 0 ? ': это уже сегодня' : left === 1 ? ': это уже завтра' : left > 1 ? ': осталось ' + left + ' ' + plural(left, 'день', 'дня', 'дней') : ''}. Пожалуйста, подтвердите, придёте ли вы:` },
  uz: { inv: (n, who, d) => `${n}, sizni taklif qilamiz${who ? ': ' + who : ''}${d ? ' (' + d + ')' : ''}. Shaxsiy taklifnomani oching:`,
        rem: (n, who, d, left) => `${n}, eslatamiz${who ? ': ' + who : ''}${d ? ' (' + d + ')' : ''}${left === 0 ? ' bugun bo\u2018ladi' : left === 1 ? ' ertaga bo\u2018ladi' : left > 1 ? ', ' + left + ' kun qoldi' : ''}. Iltimos, kelishingizni tasdiqlang:` },
  en: { inv: (n, who, d) => `${n}, you are invited${who ? ' to ' + who : ''}${d ? ' on ' + d : ''}. Open your personal invitation:`,
        rem: (n, who, d, left) => `${n}, a friendly reminder${who ? ' about ' + who : ''}${d ? ' (' + d + ')' : ''}${left === 0 ? ': it is today' : left === 1 ? ': it is tomorrow' : left > 1 ? ': ' + left + ' days to go' : ''}. Please let us know if you can come:` },
  kk: { inv: (n, who, d) => `${n}, сізді шақырамыз${who ? ': ' + who : ''}${d ? ' (' + d + ')' : ''}. Жеке шақыруды ашыңыз:`,
        rem: (n, who, d, left) => `${n}, еске саламыз${who ? ': ' + who : ''}${d ? ' (' + d + ')' : ''}${left === 0 ? ' бүгін' : left === 1 ? ' ертең' : left > 1 ? ', ' + left + ' күн қалды' : ''}. Келетініңізді растаңыз:` },
};
const EV = {
  ru: { wedding: 'свадьбу', nikah: 'никах', birthday: 'день рождения', anniversary: 'годовщину', navruz: 'Навруз', other: 'праздник' },
  uz: { wedding: 'to\u2018y', nikah: 'nikoh', birthday: 'tug\u2018ilgan kun', anniversary: 'yubiley', navruz: 'Navro\u2018z', other: 'bayram' },
  en: { wedding: 'the wedding of', nikah: 'the nikah of', birthday: 'the birthday of', anniversary: 'the anniversary of', navruz: 'Navruz', other: 'the celebration of' },
  kk: { wedding: 'үйлену тойы', nikah: 'неке', birthday: 'туған күн', anniversary: 'мерейтой', navruz: 'Наурыз', other: 'мереке' },
};
function plural(n, a, b, c) { const m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c; }
export function fmtDate(iso, lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return '';
  const L = MON[lang] || MON.ru; return +m[3] + ' ' + L[+m[2] - 1] + (lang === 'en' ? ', ' + m[1] : ' ' + m[1]);
}
/* сколько дней до события (по календарной дате в местной зоне): 0 сегодня, 1 завтра, отрицательное прошло */
export function daysLeft(iso, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return null;
  const a = Date.UTC(+m[1], +m[2] - 1, +m[3]), b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / 864e5);
}
export const kindOf = (it) => (it && it.t) || 'wedding';
/* Кого приглашает: «свадьбу Азиза и Дилнозы» не склоняем (склонение ломается в 4 языках), поэтому даём имена без падежей */
export function whoLine(it, lang) {
  const a = (it.a || '').trim(), b = (it.b || '').trim(), names = a && b ? a + ' & ' + b : a;
  const ev = (EV[lang] || EV.ru)[kindOf(it)] || '';
  if (!names) return ev;
  if (kindOf(it) === 'navruz') return ev;
  return (ev + ' ' + names).trim();
}
/* Текст для одного гостя. mode: 'inv' приглашение, 'rem' напоминание. */
export function buildText(it, guest, mode, now = new Date()) {
  const lang = LANGS.includes(it.l) ? it.l : 'ru', M = MSG[lang];
  const name = (guest.n || '').trim() || (lang === 'en' ? 'Hello' : lang === 'uz' ? 'Hurmatli mehmon' : lang === 'kk' ? 'Құрметті қонақ' : 'Здравствуйте');
  const d = fmtDate(it.d, lang), who = whoLine(it, lang);
  return mode === 'rem' ? M.rem(name, who, d, daysLeft(it.d, now)) : M.inv(name, who, d);
}
/* Кому слать. inv: ещё не отправляли (или все, если all). rem: не ответили «придёте/не смогу», событие ещё не прошло
   и напоминание этому гостю не уходило последние 24 часа (чтобы не слать одному человеку подряд). */
export const REMIND_GAP_H = 24;
export function pickRecipients(it, log, sent, mode, now = new Date()) {
  const left = daysLeft(it.d, now);
  if (mode === 'rem' && (left === null || left < 0)) return [];
  const out = [];
  (it.guests || []).forEach((g, i) => {
    const e = (log && log[it.id + ':' + g.k]) || {}, was = (sent && sent[mode + ':' + g.k]) || 0;
    if (mode === 'inv') { if (!was) out.push(i); }
    else {
      if (e.s === 'y' || e.s === 'n') return;
      if (was && now.getTime() - was < REMIND_GAP_H * 36e5) return;
      out.push(i);
    }
  });
  return out;
}
/* отметка «отправлено» хранится у владельца на устройстве: {"inv:<ключ гостя>": время} */
export const markSent = (sent, mode, key, ts = Date.now()) => ({ ...(sent || {}), [mode + ':' + key]: ts });
export const sentAgo = (sent, mode, key, now = Date.now()) => { const t = sent && sent[mode + ':' + key]; return t ? Math.floor((now - t) / 36e5) : null; };
/* ссылка «поделиться» Telegram: текст отдельно, ссылка отдельно (Telegram сам склеит) */
export const tgShareUrl = (url, text) => 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text);
export const waShareUrl = (url, text) => 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
