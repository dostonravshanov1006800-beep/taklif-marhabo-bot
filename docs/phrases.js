/* Библиотека готовых формулировок приглашения: 3 стиля × 6 типов × 4 языка.
   Бесплатная замена ИИ-помощнику: ничего не отправляется во внешние сервисы. */
export const PHRASE_STYLES = {
  ru: { classic: 'Классический', warm: 'Тёплый', short: 'Коротко' },
  uz: { classic: 'Klassik', warm: 'Samimiy', short: 'Qisqa' },
  en: { classic: 'Classic', warm: 'Warm', short: 'Short' },
  kk: { classic: 'Классикалық', warm: 'Жылы', short: 'Қысқа' }
};
export const PHRASES = {
  wedding: {
    classic: {
      ru: 'С радостью приглашаем вас разделить с нами самый важный день нашей жизни. Ваше присутствие сделает этот праздник по-настоящему особенным.',
      uz: 'Hayotimizdagi eng muhim kunni siz bilan baham ko\'rishdan xursand bo\'lamiz. Sizning tashrifingiz bu bayramni yanada betakror qiladi.',
      en: 'We joyfully invite you to share the most important day of our lives. Your presence will make this celebration truly special.',
      kk: 'Өміріміздегі ең маңызды күнді бізбен бірге өткізуге шақырамыз. Сіздің қатысуыңыз бұл мерекені ерекше етеді.'
    },
    warm: {
      ru: 'Мы начинаем новую главу, и нам очень хочется, чтобы рядом были самые близкие. Приходите: будет тепло, вкусно и по-семейному уютно.',
      uz: 'Biz yangi hayotni boshlayapmiz va eng yaqinlarimiz yonimizda bo\'lishini istaymiz. Keling: issiq, mazali va oilaviy go\'zal bo\'ladi.',
      en: 'We are starting a new chapter and would love to have our dearest people beside us. Come along: it will be warm, tasty and cozy.',
      kk: 'Біз жаңа өмірді бастап жатырмыз, жақындарымыз қасымызда болса деп қалаймыз. Келіңіздер: жылы, дәмді әрі жайлы болады.'
    },
    short: {
      ru: 'Приглашаем вас на нашу свадьбу. Будем счастливы видеть вас рядом.',
      uz: 'Sizni to\'yimizga taklif qilamiz. Yonimizda bo\'lsangiz, xursand bo\'lamiz.',
      en: 'You are invited to our wedding. We would be happy to see you there.',
      kk: 'Сізді үйлену тойымызға шақырамыз. Қасымызда болсаңыз, қуанамыз.'
    }
  },
  nikah: {
    classic: {
      ru: 'С благословения родителей мы создаём семью. Приглашаем вас на никах, чтобы разделить с нами этот светлый момент и принять ваши добрые пожелания.',
      uz: 'Ota-onalarimiz duosi bilan oila qurmoqdamiz. Nikoh marosimimizga taklif qilamiz, bu nurli lahzani biz bilan baham ko\'ring.',
      en: 'With our parents\' blessing we are starting a family. We invite you to our nikah to share this bright moment and join us in prayer.',
      kk: 'Ата-анамыздың батасымен отбасын құрамыз. Неке қиюға шақырамыз, осы жарқын сәтті бізбен бөлісіңіз.'
    },
    warm: {
      ru: 'Для нас это важный и тихий шаг. Будем благодарны, если вы будете рядом и поддержите нас своей молитвой и добрым словом.',
      uz: 'Biz uchun bu muhim va sokin qadam. Yonimizda bo\'lib, duo va yaxshi so\'zlaringiz bilan qo\'llab-quvvatlasangiz, minnatdor bo\'lamiz.',
      en: 'This is an important and quiet step for us. We would be grateful to have you near, with your prayers and kind words.',
      kk: 'Біз үшін бұл маңызды әрі тыныш қадам. Дұғаңызбен, жылы сөзіңізбен қолдасаңыз, ризашылығымыз шексіз.'
    },
    short: {
      ru: 'Приглашаем вас на наш никах. Ждём вас с радостью.',
      uz: 'Sizni nikoh marosimimizga taklif qilamiz. Intizorlik bilan kutamiz.',
      en: 'You are invited to our nikah. We look forward to seeing you.',
      kk: 'Сізді неке қиюымызға шақырамыз. Қуана күтеміз.'
    }
  },
  birthday: {
    classic: {
      ru: 'Приглашаю вас отметить мой день рождения. Буду рада разделить этот день с близкими людьми.',
      uz: 'Sizni tug\'ilgan kunimni nishonlashga taklif qilaman. Yaqinlarim bilan bu kunni baham ko\'rsam, xursand bo\'laman.',
      en: 'I invite you to celebrate my birthday. I would be happy to share this day with the people close to me.',
      kk: 'Сізді туған күнімді тойлауға шақырамын. Жақындарыммен бірге болсам, қуанамын.'
    },
    warm: {
      ru: 'Ещё один год, и лучший подарок для меня это вы. Приходите: будет вкусно, весело и много смеха.',
      uz: 'Yana bir yosh, men uchun eng yaxshi sovg\'a sizsiz. Keling: mazali, quvnoq va kulgili bo\'ladi.',
      en: 'Another year older, and the best gift is having you there. Come along: good food, good mood and plenty of laughter.',
      kk: 'Тағы бір жас, ал ең жақсы сыйлық сіз боласыз. Келіңіз: дәмді, көңілді әрі күлкіге толы болады.'
    },
    short: {
      ru: 'Приглашаю на мой день рождения. Приходите!',
      uz: 'Tug\'ilgan kunimga taklif qilaman. Keling!',
      en: 'You are invited to my birthday. Do come!',
      kk: 'Туған күніме шақырамын. Келіңіз!'
    }
  },
  anniversary: {
    classic: {
      ru: 'Столько лет вместе, и мы хотим отметить эту дату с теми, кто был рядом. Будем рады видеть вас на нашем празднике.',
      uz: 'Necha yillar birga, endi bu sanani yonimizda bo\'lganlar bilan nishonlamoqchimiz. Bayramimizda ko\'rishdan xursand bo\'lamiz.',
      en: 'Years together, and we want to mark this date with those who have been beside us. We would love to see you at our celebration.',
      kk: 'Талай жыл бірге, енді бұл күнді қасымызда болғандармен тойлағымыз келеді. Мерекемізде көргенімізге қуанамыз.'
    },
    warm: {
      ru: 'Каждый год рядом с вами делает нас счастливее. Приходите отпраздновать с нами этот добрый и тёплый день.',
      uz: 'Har bir yil birga bo\'lish bizni baxtliroq qiladi. Bu samimiy kunni biz bilan nishonlang.',
      en: 'Every year together makes us happier. Come and celebrate this kind and warm day with us.',
      kk: 'Бірге өткен әр жыл бізді бақытты етеді. Осы жылы күнді бізбен бірге тойлаңыз.'
    },
    short: {
      ru: 'Приглашаем вас на нашу годовщину. Будем рады вам.',
      uz: 'Sizni yubileyimizga taklif qilamiz. Sizni kutib qolamiz.',
      en: 'You are invited to our anniversary. We would be glad to see you.',
      kk: 'Сізді мерейтойымызға шақырамыз. Күтеміз.'
    }
  },
  navruz: {
    classic: {
      ru: 'Приглашаем вас встретить Навруз за праздничным столом. Пусть весна принесёт в каждый дом мир, достаток и радость.',
      uz: 'Sizni Navro\'zni bayram dasturxoni atrofida kutib olishga taklif qilamiz. Bahor har bir xonadonga tinchlik, baraka va quvonch olib kelsin.',
      en: 'We invite you to welcome Navruz around a festive table. May spring bring peace, abundance and joy to every home.',
      kk: 'Сізді Наурызды мерекелік дастархан басында қарсы алуға шақырамыз. Көктем әр үйге бейбітшілік, береке мен қуаныш әкелсін.'
    },
    warm: {
      ru: 'Весна пришла, и мы собираем близких на сумаляк и добрые разговоры. Приходите, будем рады каждому.',
      uz: 'Bahor keldi, yaqinlarimizni sumalak va yaxshi suhbatlarga yig\'amiz. Keling, har biringizni kutamiz.',
      en: 'Spring is here and we are gathering loved ones for sumalak and good conversation. Come, everyone is welcome.',
      kk: 'Көктем келді, жақындарымызды көже мен жылы әңгімеге жинаймыз. Келіңіздер, әрқайсыңызға қуанамыз.'
    },
    short: {
      ru: 'Приглашаем на Навруз. С праздником весны!',
      uz: 'Navro\'zga taklif qilamiz. Bahor bayrami muborak!',
      en: 'You are invited to Navruz. Happy spring!',
      kk: 'Наурызға шақырамыз. Көктем мерекесімен!'
    }
  },
  other: {
    classic: {
      ru: 'Приглашаем вас на наше торжество. Будем рады разделить этот день с вами.',
      uz: 'Sizni tantanamizga taklif qilamiz. Bu kunni siz bilan baham ko\'rsak, xursand bo\'lamiz.',
      en: 'We invite you to our celebration. We would be glad to share this day with you.',
      kk: 'Сізді тойымызға шақырамыз. Бұл күнді сізбен бөліссек, қуанамыз.'
    },
    warm: {
      ru: 'Собираем самых близких на тёплый семейный праздник. Ваше присутствие для нас очень важно.',
      uz: 'Eng yaqinlarimizni issiq oilaviy bayramga yig\'amiz. Sizning tashrifingiz biz uchun juda muhim.',
      en: 'We are gathering our dearest people for a warm family celebration. Your presence means a lot to us.',
      kk: 'Ең жақындарымызды жылы отбасылық мерекеге жинаймыз. Сіздің келуіңіз біз үшін өте маңызды.'
    },
    short: {
      ru: 'Приглашаем вас на праздник. Ждём!',
      uz: 'Sizni bayramga taklif qilamiz. Kutamiz!',
      en: 'You are invited to our celebration. See you there!',
      kk: 'Сізді мерекеге шақырамыз. Күтеміз!'
    }
  }
};
