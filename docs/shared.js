// Общий код: шаблоны Marhabo, кодирование приглашения в ссылку.
const U = (id, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const TPL = {
  wedding: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', motif: 'floral',
    label: { ru: 'Свадьба', uz: "To'y", en: "Wedding", kk: "Үйлену тойы" },
    photos: { cover: U('photo-1606800052052-a08af7148866', 1400), portrait: U('photo-1519741497674-611481863552', 900), gallery: [U('photo-1511285560929-80b456fea0bc', 900), U('photo-1464366400600-7168b8af9bc3', 700), U('photo-1519225421980-715cb0215aed', 700), U('photo-1465495976277-4387d4b0b4c6', 700)] },
    greeting: { ru: 'В этот день мы соединяем наши сердца и хотим разделить радость с самыми близкими людьми. Будем счастливы видеть вас на нашем празднике.', uz: "Bu kunda qalblarimizni bog'lab, quvonchimizni eng yaqin insonlar bilan baham ko'rmoqchimiz. Bayramimizda sizni ko'rishdan baxtiyormiz.", en: "On this day we join our hearts and wish to share our joy with the people closest to us. We would be delighted to see you at our celebration.", kk: "Бұл күні біз жүрегімізді біріктіріп, қуанышымызды ең жақындарымызбен бөліскіміз келеді. Мерекемізде сізді көргенімізге қуанамыз." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #FCF8F1 0%, #F4EADD 52%, #E9D9C2 100%)', card: 'linear-gradient(180deg, #FFFEFB 0%, #FBF3E6 100%)', base: '#FFFEFB', accent: '#B28A50', accentText: '#745a37', accentSoft: '#EADBC4', ink: '#2B2219', muted: '#695b4b' } },
  birthday: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', motif: 'confetti',
    label: { ru: 'День рождения', uz: "Tug'ilgan kun", en: "Birthday", kk: "Туған күн" },
    photos: { cover: U('photo-1530103862676-de8c9debad1d', 1400), portrait: U('photo-1519671482749-fd09be7ccebf', 900), gallery: [U('photo-1464349095431-e9a21285b5f3', 900), U('photo-1513151233558-d860c5398176', 700), U('photo-1511795409834-ef04bbd61622', 700), U('photo-1492684223066-81342ee5ff30', 700)] },
    greeting: { ru: 'Приглашаю вас на мой день рождения — будет тепло, вкусно и весело. Приходите разделить этот вечер со мной.', uz: "Sizni tug'ilgan kunimga taklif qilaman — iliq, mazali va quvnoq kech bo'ladi. Bu oqshomni men bilan baham ko'rishga keling.", en: "I invite you to my birthday. It will be warm, tasty and fun. Come and share this evening with me.", kk: "Сізді туған күніме шақырамын. Жылы, дәмді және көңілді болады. Осы кешті менімен бірге өткізіңіз." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #FFF7F3 0%, #FDE6DD 52%, #F7CFC1 100%)', card: 'linear-gradient(180deg, #FFFDFC 0%, #FDF0EA 100%)', base: '#FFFDFC', accent: '#D2705A', accentText: '#894c3e', accentSoft: '#F7D8CE', ink: '#33211C', muted: '#6f544c' } },
  anniversary: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', motif: 'laurel',
    label: { ru: 'Юбилей', uz: 'Yubiley', en: "Anniversary", kk: "Мерейтой" },
    photos: { cover: U('photo-1522673607200-164d1b6ce486', 1400), portrait: U('photo-1529636798458-92182e662485', 900), gallery: [U('photo-1469371670807-013ccf25f16a', 900), U('photo-1464366400600-7168b8af9bc3', 700), U('photo-1478146896981-b80fe463b330', 700), U('photo-1519741497674-611481863552', 700)] },
    greeting: { ru: 'Столько лет вместе — и мы хотим отпраздновать это с теми, кто был рядом. Будем рады видеть вас на нашем юбилее.', uz: "Shuncha yil birgamiz — va bu quvonchni yonimizda bo'lganlar bilan nishonlamoqchimiz. Yubileymizda sizni ko'rishdan xursandmiz.", en: "So many years together, and we want to celebrate with the people who stood by us. We will be glad to see you at our anniversary.", kk: "Талай жыл бірге болдық, енді мұны жанымызда болған адамдармен атап өткіміз келеді. Мерейтойымызда сізді көргенімізге қуанамыз." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #F5F8F4 0%, #E4EEE5 52%, #CFE0D4 100%)', card: 'linear-gradient(180deg, #FDFEFB 0%, #F0F6F1 100%)', base: '#FDFEFB', accent: '#2F6B52', accentText: '#2e684f', accentSoft: '#D6E6D9', ink: '#17271F', muted: '#496054' } },
  nikah: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', motif: 'geometric',
    label: { ru: 'Никах', uz: 'Nikoh', en: "Nikah", kk: "Неке қию" },
    photos: { cover: U('photo-1583939411023-14783179e581', 1400), portrait: U('photo-1523438885200-e635ba2c371e', 900), gallery: [U('photo-1478146896981-b80fe463b330', 900), U('photo-1583939003579-730e3918a45a', 700), U('photo-1464366400600-7168b8af9bc3', 700), U('photo-1529636798458-92182e662485', 700)] },
    greeting: { ru: 'С благословения родителей мы вступаем на путь семьи. Разделите с нами этот светлый день — праздник начнётся с никах-туя.', uz: "Ota-onamizning duosi bilan oila yo'liga qadam qo'ymoqdamiz. Bu nurli kunni biz bilan baham ko'ring — bayram nikoh marosimidan boshlanadi.", en: "With the blessing of our parents we begin the path of a family. Share this bright day with us.", kk: "Ата-анамыздың батасымен біз отбасылық жолға түсеміз. Осы жарқын күнді бізбен бірге бөлісіңіз." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #FAF9F3 0%, #EFEDE1 52%, #DFDCCA 100%)', card: 'linear-gradient(180deg, #FFFEF9 0%, #F6F4E7 100%)', base: '#FFFEF9', accent: '#7E8B63', accentText: '#596346', accentSoft: '#E3E6D1', ink: '#23281B', muted: '#585e4a' } },
  navruz: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', motif: 'tulip',
    label: { ru: 'Навруз', uz: "Navro'z", en: "Navruz", kk: "Наурыз" },
    photos: { cover: U('photo-1520763185298-1b434c919102', 1400), portrait: U('photo-1490750967868-88aa4486c946', 900), gallery: [U('photo-1470124182917-cc6e71b22ecc', 900), U('photo-1507504031003-b417219a0fde', 700), U('photo-1533294455009-a77b7557d2d1', 700), U('photo-1478146896981-b80fe463b330', 700)] },
    greeting: { ru: 'Весна пришла, и мы собираем друзей за большим дастарханом. Приходите на Навруз — будет плов, музыка и хорошее настроение.', uz: "Bahor keldi — biz esa do'stlarni katta dasturxon atrofida to'plamoqdamiz. Navro'zga keling — palov, musiqa va yaxshi kayfiyat bo'ladi.", en: "Spring has come and we are gathering friends around a big table. Come to Navruz: there will be plov, music and a good mood.", kk: "Көктем келді, біз достарымызды үлкен дастарқан басына жинап жатырмыз. Наурызға келіңіз: палау, музыка және жақсы көңіл-күй болады." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #F5FBF8 0%, #E3F2E9 52%, #CCE7DA 100%)', card: 'linear-gradient(180deg, #FCFEFD 0%, #EFF8F3 100%)', base: '#FCFEFD', accent: '#1F8A6D', accentText: '#1b6d56', accentSoft: '#D2EADF', ink: '#122A22', muted: '#45675b' } },
  other: { music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', motif: 'star',
    label: { ru: 'Другой праздник', uz: 'Boshqa bayram', en: "Celebration", kk: "Мереке" },
    photos: { cover: U('photo-1492684223066-81342ee5ff30', 1400), portrait: U('photo-1519671482749-fd09be7ccebf', 900), gallery: [U('photo-1533174072545-7a4b6ad7a6c3', 900), U('photo-1511795409834-ef04bbd61622', 700), U('photo-1517457373958-b7bdd4587205', 700), U('photo-1470225620780-dba8ba36b745', 700)] },
    greeting: { ru: 'У нас есть повод собраться вместе — и мы очень хотим видеть вас среди гостей. Будет красиво и по-домашнему тепло.', uz: "Birga yig'ilish uchun sababimiz bor — va sizni mehmonlar orasida ko'rishni juda xohlaymiz. Chiroyli va samimiy bo'ladi.", en: "We have a reason to get together and we would love to have you among our guests. It will be beautiful and warm.", kk: "Бір жерге жиналуға себебіміз бар, сізді қонақтарымыздың арасында көргіміз келеді. Әдемі және жылы болады." },
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #FAF7F9 0%, #F0E7EC 52%, #E2D4DD 100%)', card: 'linear-gradient(180deg, #FFFBFC 0%, #F7EDF2 100%)', base: '#FFFBFC', accent: '#7B4A63', accentText: '#7b4a63', accentSoft: '#EADCE5', ink: '#2B1D25', muted: '#695360' } },
};

// ---- Дополнительные темы оформления (можно выбрать для любого праздника) ----
export const THEMES = {
  gold:   { name: { ru: 'Золото', uz: 'Oltin', en: 'Luxury Gold', kk: 'Алтын' }, dark: true, motif: 'geometric',
    theme: { page: 'radial-gradient(120% 100% at 50% 0%, #1E1A12 0%, #12100B 55%, #0A0907 100%)', card: 'linear-gradient(180deg, #1B170F 0%, #100E09 100%)', base: '#100E09', accent: '#D8B24A', accentText: '#D8B24A', accentSoft: '#4A3E20', ink: '#F5EBD0', muted: '#B3A276' } },
  rose:   { name: { ru: 'Красная роза', uz: 'Qizil atirgul', en: 'Red Rose', kk: 'Қызыл раушан' }, dark: false, motif: 'floral',
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #FFF6F6 0%, #F8DEE1 52%, #EEC3C9 100%)', card: 'linear-gradient(180deg, #FFFCFC 0%, #FAE9EB 100%)', base: '#FFFCFC', accent: '#A93A4E', accentText: '#943345', accentSoft: '#F0CDD2', ink: '#3A1620', muted: '#85535E' } },
  cloud:  { name: { ru: 'Небесный замок', uz: 'Osmon qasri', en: 'Cloud Castle', kk: 'Бұлт сарайы' }, dark: false, motif: 'laurel',
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #F6FAFE 0%, #DCE9F6 52%, #C3D8EE 100%)', card: 'linear-gradient(180deg, #FDFEFF 0%, #EAF2FA 100%)', base: '#FDFEFF', accent: '#4A6FA3', accentText: '#3c5b87', accentSoft: '#CBDCEE', ink: '#172538', muted: '#586F8A' } },
  ivory:  { name: { ru: 'Слоновая кость', uz: 'Fil suyagi', en: 'Ivory Love', kk: 'Піл сүйегі' }, dark: false, motif: 'floral',
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #FFFEFA 0%, #F6EFE0 52%, #EBDFC7 100%)', card: 'linear-gradient(180deg, #FFFFFC 0%, #F8F1E3 100%)', base: '#FFFFFC', accent: '#856838', accentText: '#755c32', accentSoft: '#E8DDC6', ink: '#2E2619', muted: '#7C6D52' } },
  velvet: { name: { ru: 'Бархат', uz: 'Baxmal', en: 'Velvet Romance', kk: 'Барқыт' }, dark: true, motif: 'star',
    theme: { page: 'radial-gradient(120% 100% at 50% 0%, #4A1A26 0%, #2C0E16 55%, #1A070C 100%)', card: 'linear-gradient(180deg, #3A141E 0%, #260B13 100%)', base: '#260B13', accent: '#E9BFA6', accentText: '#E9BFA6', accentSoft: '#6B3040', ink: '#FBEAE3', muted: '#CDA295' } },
  green:  { name: { ru: 'Зелёная', uz: 'Yashil', en: 'Green White', kk: 'Жасыл' }, dark: false, motif: 'laurel',
    theme: { page: 'radial-gradient(125% 110% at 50% 0%, #F8FCF9 0%, #E2F0E6 52%, #CBE3D3 100%)', card: 'linear-gradient(180deg, #FDFFFD 0%, #EDF6F0 100%)', base: '#FDFFFD', accent: '#2A6049', accentText: '#2a6049', accentSoft: '#D2E6D9', ink: '#15291F', muted: '#56756A' } },
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
