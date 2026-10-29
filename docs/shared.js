// Общий код: шаблоны Marhabo, кодирование приглашения в ссылку.
const U = (id, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const TPL = {
  wedding: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', motif: 'floral',
    label: { ru: 'Свадьба', uz: "To'y" },
    photos: { cover: U('photo-1606800052052-a08af7148866', 1400), portrait: U('photo-1519741497674-611481863552', 900), gallery: [U('photo-1511285560929-80b456fea0bc', 900), U('photo-1464366400600-7168b8af9bc3', 700), U('photo-1519225421980-715cb0215aed', 700), U('photo-1465495976277-4387d4b0b4c6', 700)] },
    greeting: { ru: 'В этот день мы соединяем наши сердца и хотим разделить радость с самыми близкими людьми. Будем счастливы видеть вас на нашем празднике.', uz: "Bu kunda qalblarimizni bog'lab, quvonchimizni eng yaqin insonlar bilan baham ko'rmoqchimiz. Bayramimizda sizni ko'rishdan baxtiyormiz." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #FCF8F1 0%, #F4EADD 52%, #E9D9C2 100%)', card: 'linear-gradient(180deg, #FFFEFB 0%, #FBF3E6 100%)', base: '#FFFEFB', accent: '#B28A50', accentSoft: '#EADBC4', ink: '#2B2219', muted: '#8B7A66' } },
  birthday: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', motif: 'confetti',
    label: { ru: 'День рождения', uz: "Tug'ilgan kun" },
    photos: { cover: U('photo-1530103862676-de8c9debad1d', 1400), portrait: U('photo-1519671482749-fd09be7ccebf', 900), gallery: [U('photo-1464349095431-e9a21285b5f3', 900), U('photo-1513151233558-d860c5398176', 700), U('photo-1511795409834-ef04bbd61622', 700), U('photo-1492684223066-81342ee5ff30', 700)] },
    greeting: { ru: 'Приглашаю вас на мой день рождения — будет тепло, вкусно и весело. Приходите разделить этот вечер со мной.', uz: "Sizni tug'ilgan kunimga taklif qilaman — iliq, mazali va quvnoq kech bo'ladi. Bu oqshomni men bilan baham ko'rishga keling." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #FFF7F3 0%, #FDE6DD 52%, #F7CFC1 100%)', card: 'linear-gradient(180deg, #FFFDFC 0%, #FDF0EA 100%)', base: '#FFFDFC', accent: '#D2705A', accentSoft: '#F7D8CE', ink: '#33211C', muted: '#9B7A70' } },
  anniversary: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', motif: 'laurel',
    label: { ru: 'Юбилей', uz: 'Yubiley' },
    photos: { cover: U('photo-1522673607200-164d1b6ce486', 1400), portrait: U('photo-1529636798458-92182e662485', 900), gallery: [U('photo-1469371670807-013ccf25f16a', 900), U('photo-1464366400600-7168b8af9bc3', 700), U('photo-1478146896981-b80fe463b330', 700), U('photo-1519741497674-611481863552', 700)] },
    greeting: { ru: 'Столько лет вместе — и мы хотим отпраздновать это с теми, кто был рядом. Будем рады видеть вас на нашем юбилее.', uz: "Shuncha yil birgamiz — va bu quvonchni yonimizda bo'lganlar bilan nishonlamoqchimiz. Yubileymizda sizni ko'rishdan xursandmiz." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #F5F8F4 0%, #E4EEE5 52%, #CFE0D4 100%)', card: 'linear-gradient(180deg, #FDFEFB 0%, #F0F6F1 100%)', base: '#FDFEFB', accent: '#2F6B52', accentSoft: '#D6E6D9', ink: '#17271F', muted: '#5F7A6C' } },
  nikah: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', motif: 'geometric',
    label: { ru: 'Никах', uz: 'Nikoh' },
    photos: { cover: U('photo-1583939411023-14783179e581', 1400), portrait: U('photo-1523438885200-e635ba2c371e', 900), gallery: [U('photo-1478146896981-b80fe463b330', 900), U('photo-1583939003579-730e3918a45a', 700), U('photo-1464366400600-7168b8af9bc3', 700), U('photo-1529636798458-92182e662485', 700)] },
    greeting: { ru: 'С благословения родителей мы вступаем на путь семьи. Разделите с нами этот светлый день — праздник начнётся с никах-туя.', uz: "Ota-onamizning duosi bilan oila yo'liga qadam qo'ymoqdamiz. Bu nurli kunni biz bilan baham ko'ring — bayram nikoh marosimidan boshlanadi." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #FAF9F3 0%, #EFEDE1 52%, #DFDCCA 100%)', card: 'linear-gradient(180deg, #FFFEF9 0%, #F6F4E7 100%)', base: '#FFFEF9', accent: '#7E8B63', accentSoft: '#E3E6D1', ink: '#23281B', muted: '#7A8068' } },
  navruz: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', motif: 'tulip',
    label: { ru: 'Навруз', uz: "Navro'z" },
    photos: { cover: U('photo-1520763185298-1b434c919102', 1400), portrait: U('photo-1490750967868-88aa4486c946', 900), gallery: [U('photo-1470124182917-cc6e71b22ecc', 900), U('photo-1507504031003-b417219a0fde', 700), U('photo-1533294455009-a77b7557d2d1', 700), U('photo-1478146896981-b80fe463b330', 700)] },
    greeting: { ru: 'Весна пришла, и мы собираем друзей за большим дастарханом. Приходите на Навруз — будет плов, музыка и хорошее настроение.', uz: "Bahor keldi — biz esa do'stlarni katta dasturxon atrofida to'plamoqdamiz. Navro'zga keling — palov, musiqa va yaxshi kayfiyat bo'ladi." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #F5FBF8 0%, #E3F2E9 52%, #CCE7DA 100%)', card: 'linear-gradient(180deg, #FCFEFD 0%, #EFF8F3 100%)', base: '#FCFEFD', accent: '#1F8A6D', accentSoft: '#D2EADF', ink: '#122A22', muted: '#5C8375' } },
  other: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', motif: 'star',
    label: { ru: 'Другой праздник', uz: 'Boshqa bayram' },
    photos: { cover: U('photo-1492684223066-81342ee5ff30', 1400), portrait: U('photo-1519671482749-fd09be7ccebf', 900), gallery: [U('photo-1533174072545-7a4b6ad7a6c3', 900), U('photo-1511795409834-ef04bbd61622', 700), U('photo-1517457373958-b7bdd4587205', 700), U('photo-1470225620780-dba8ba36b745', 700)] },
    greeting: { ru: 'У нас есть повод собраться вместе — и мы очень хотим видеть вас среди гостей. Будет красиво и по-домашнему тепло.', uz: "Birga yig'ilish uchun sababimiz bor — va sizni mehmonlar orasida ko'rishni juda xohlaymiz. Chiroyli va samimiy bo'ladi." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #FAF7F9 0%, #F0E7EC 52%, #E2D4DD 100%)', card: 'linear-gradient(180deg, #FFFBFC 0%, #F7EDF2 100%)', base: '#FFFBFC', accent: '#7B4A63', accentSoft: '#EADCE5', ink: '#2B1D25', muted: '#8A7180' } },
};

// ---- кодирование приглашения в ссылку (без сервера) ----
// формат: base64url(JSON) в хеше страницы. Поля короткие, чтобы ссылка была компактной.
export function pack(obj) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = ''; bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unpack(str) {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}
