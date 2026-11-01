/* Библиотека готовых формулировок приглашения: 3 стиля × 12 типов × 4 языка.
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
  },
  sunnat: {
    classic: {
      ru: 'Приглашаем вас на сүннат той нашего сына. Будем благодарны, если вы разделите с нами радость этого дня.',
      uz: 'Sizni o\'g\'limizning sunnat to\'yiga taklif qilamiz. Bu kunning quvonchini biz bilan baham ko\'rsangiz, minnatdor bo\'lamiz.',
      en: 'We invite you to our son\'s sunnat celebration. We would be grateful if you shared the joy of this day with us.',
      kk: 'Сізді ұлымыздың сүндет тойына шақырамыз. Осы күннің қуанышын бізбен бөліссеңіз, алғыс айтамыз.'
    },
    warm: {
      ru: 'Наш сын становится на шаг взрослее, и мы собираем самых близких за дастарханом. Приходите, будем рады вам.',
      uz: 'O\'g\'limiz bir qadam ulg\'ayyapti, eng yaqinlarimizni dasturxonga yig\'amiz. Keling, sizni kutamiz.',
      en: 'Our son is growing up and we are gathering our closest people at the table. Come, we would love to see you.',
      kk: 'Ұлымыз бір қадам есейіп келеді, ең жақындарымызды дастарқанға жинаймыз. Келіңіз, күтеміз.'
    },
    short: {
      ru: 'Приглашаем на сүннат той. Ждём вас!',
      uz: 'Sunnat to\'yiga taklif qilamiz. Kutamiz!',
      en: 'You are invited to our sunnat celebration. See you there!',
      kk: 'Сүндет тойға шақырамыз. Күтеміз!'
    }
  },
  beshik: {
    classic: {
      ru: 'С радостью приглашаем вас на бешик той в честь рождения нашего малыша. Пусть вашими пожеланиями его путь будет светлым.',
      uz: 'Farzandimiz tug\'ilganligi munosabati bilan beshik to\'yiga sizni quvonch bilan taklif qilamiz. Sizning tilaklaringiz bilan uning yo\'li porloq bo\'lsin.',
      en: 'We happily invite you to the cradle ceremony celebrating the birth of our baby. May your good wishes light his or her path.',
      kk: 'Сәбиіміздің дүниеге келуіне орай бесік тойына қуана шақырамыз. Сіздердің тілектеріңізбен оның жолы жарқын болсын.'
    },
    warm: {
      ru: 'У нас в доме малыш, и мы хотим разделить эту радость с близкими. Приходите на бешик той, будем рады.',
      uz: 'Uyimizda chaqaloq bor, bu quvonchni yaqinlar bilan baham ko\'rmoqchimiz. Beshik to\'yiga keling, xursand bo\'lamiz.',
      en: 'There is a little one in our home and we want to share the joy. Come to the cradle ceremony, we would be glad.',
      kk: 'Үйімізде сәби бар, осы қуанышты жақындарымызбен бөліскіміз келеді. Бесік тойына келіңіз, қуанамыз.'
    },
    short: {
      ru: 'Приглашаем на бешик той. Ждём!',
      uz: 'Beshik to\'yiga taklif qilamiz. Kutamiz!',
      en: 'You are invited to the cradle celebration. See you!',
      kk: 'Бесік тойға шақырамыз. Күтеміз!'
    }
  },
  grad: {
    classic: {
      ru: 'Приглашаем вас на выпускной вечер. Будем рады разделить с вами этот важный день и поблагодарить всех, кто был рядом.',
      uz: 'Sizni bitiruv kechasiga taklif qilamiz. Bu muhim kunni siz bilan baham ko\'rib, yonimizda bo\'lgan barchaga minnatdorchilik bildirsak, xursand bo\'lamiz.',
      en: 'We invite you to our graduation evening. We would be glad to share this important day and thank everyone who stood by us.',
      kk: 'Сізді түлектер кешіне шақырамыз. Осы маңызды күнді бөлісіп, қасымызда болғандардың бәріне алғыс айтқымыз келеді.'
    },
    warm: {
      ru: 'Школа закончилась, и мы собираемся отметить это вместе. Приходите, будет весело и тепло.',
      uz: 'Maktab tugadi va biz buni birga nishonlaymiz. Keling, quvnoq va samimiy bo\'ladi.',
      en: 'School is over and we are celebrating together. Come, it will be fun and warm.',
      kk: 'Мектеп аяқталды, біз мұны бірге атап өтеміз. Келіңіз, көңілді әрі жылы болады.'
    },
    short: {
      ru: 'Приглашаем на выпускной. Ждём!',
      uz: 'Bitiruv kechasiga taklif qilamiz. Kutamiz!',
      en: 'You are invited to our graduation. See you there!',
      kk: 'Түлектер кешіне шақырамыз. Күтеміз!'
    }
  },
  corp: {
    classic: {
      ru: 'Приглашаем вас на корпоративное мероприятие. Мы подведём итоги, поблагодарим команду и проведём вечер в хорошей компании.',
      uz: 'Sizni korporativ tadbirga taklif qilamiz. Yakunlarni sarhisob qilamiz, jamoaga minnatdorchilik bildiramiz va oqshomni yaxshi davrada o\'tkazamiz.',
      en: 'We invite you to our corporate event. We will review the results, thank the team and spend the evening in good company.',
      kk: 'Сізді корпоративтік іс-шараға шақырамыз. Қорытынды жасап, ұжымға алғыс айтып, кешті жақсы ортада өткіземіз.'
    },
    warm: {
      ru: 'Собираемся всей командой, чтобы отдохнуть и пообщаться без рабочей спешки. Будем рады видеть вас.',
      uz: 'Butun jamoa bilan ish shoshilinchisiz dam olib, suhbatlashish uchun yig\'ilamiz. Sizni ko\'rsak xursand bo\'lamiz.',
      en: 'The whole team is getting together to relax and talk without the work rush. We would be glad to see you.',
      kk: 'Бүкіл ұжыммен жұмыс асығыстығынсыз демалып, сөйлесуге жиналамыз. Сізді көргенімізге қуанамыз.'
    },
    short: {
      ru: 'Приглашаем на корпоратив. Ждём!',
      uz: 'Korporativ tadbirga taklif qilamiz. Kutamiz!',
      en: 'You are invited to our corporate event. See you there!',
      kk: 'Корпоративке шақырамыз. Күтеміз!'
    }
  },
  party: {
    classic: {
      ru: 'Приглашаем вас на наш вечер перед большим днём. Будет музыка, танцы и хорошее настроение.',
      uz: 'Sizni katta kundan oldingi oqshomimizga taklif qilamiz. Musiqa, raqs va yaxshi kayfiyat bo\'ladi.',
      en: 'We invite you to our evening before the big day. There will be music, dancing and a great mood.',
      kk: 'Сізді үлкен тойдан бұрынғы кешімізге шақырамыз. Музыка, би және жақсы көңіл-күй болады.'
    },
    warm: {
      ru: 'Собираем своих на последний вечер перед свадьбой. Приходите повеселиться вместе с нами.',
      uz: 'To\'ydan oldingi so\'nggi oqshomga yaqinlarimizni yig\'amiz. Biz bilan birga ko\'ngil ochishga keling.',
      en: 'We are gathering our people for the last evening before the wedding. Come and have fun with us.',
      kk: 'Үйлену тойынан бұрынғы соңғы кешке өз адамдарымызды жинаймыз. Бізбен бірге көңіл көтеруге келіңіз.'
    },
    short: {
      ru: 'Приглашаем на вечер. Ждём!',
      uz: 'Oqshomga taklif qilamiz. Kutamiz!',
      en: 'You are invited to our party. See you there!',
      kk: 'Кешке шақырамыз. Күтеміз!'
    }
  },
  hayit: {
    classic: {
      ru: 'Приглашаем вас встретить праздник за общим столом. Пусть он принесёт в каждый дом мир, достаток и добрые вести.',
      uz: 'Sizni bayramni umumiy dasturxon atrofida kutib olishga taklif qilamiz. U har bir xonadonga tinchlik, baraka va xushxabar olib kelsin.',
      en: 'We invite you to welcome the holiday around a shared table. May it bring peace, abundance and good news to every home.',
      kk: 'Сізді мерекені ортақ дастарқан басында қарсы алуға шақырамыз. Ол әр үйге бейбітшілік, береке және игі хабар әкелсін.'
    },
    warm: {
      ru: 'Праздник приходит в дом, и мы будем рады видеть вас у нас. Приходите, посидим за чаем и добрым разговором.',
      uz: 'Bayram uyga keladi, sizni ko\'rsak xursand bo\'lamiz. Keling, choy va yaxshi suhbat atrofida o\'tiramiz.',
      en: 'The holiday is coming to our home and we would love to see you. Come, let us sit over tea and good conversation.',
      kk: 'Мереке үйімізге келеді, сізді көргенімізге қуанамыз. Келіңіз, шай мен жылы әңгіме үстінде отырайық.'
    },
    short: {
      ru: 'Приглашаем на праздничный стол. Ждём!',
      uz: 'Bayram dasturxoniga taklif qilamiz. Kutamiz!',
      en: 'You are invited to our festive table. See you there!',
      kk: 'Мерекелік дастарқанға шақырамыз. Күтеміз!'
    }
  }
};
