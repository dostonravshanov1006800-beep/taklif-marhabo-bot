// CI-проверки без внешних сервисов. Красное = публикация блокируется.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
let ok = 0, bad = 0;
const T = (n, c, e = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, e); } };
const read = (p) => readFileSync(p, 'utf8');

// 1. Синтаксис всех JS/MJS и встроенных <script>
for (const f of ['docs/shared.js', 'docs/fx.js', 'docs/curtain.js', 'docs/lines.js', 'docs/phrases.js', 'bot/bot.mjs', 'worker/worker.js']) {
  if (!existsSync(f)) continue;
  try { execSync(`node --check ${f}`, { stdio: 'pipe' }); T('syntax ' + f, true); } catch (e) { T('syntax ' + f, false, String(e.stderr).slice(0, 200)); }
}
for (const f of ['docs/index.html', 'docs/i.html', 'docs/s.html']) {
  if (!existsSync(f)) continue;
  const h = read(f); const re = /<script([^>]*)>([\s\S]*?)<\/script>/g; let m, n = 0;
  while ((m = re.exec(h))) {
    if (m[2].length < 200 || /type="application\/(ld\+)?json"/.test(m[1])) continue;
    const tmp = `/tmp/ci_${n++}.mjs`; execSync(`cat > ${tmp}`, { input: m[2] });
    try { execSync(`node --check ${tmp}`, { stdio: 'pipe' }); T(`inline script ${f}#${n}`, true); } catch (e) { T(`inline script ${f}#${n}`, false, String(e.stderr).slice(0, 200)); }
  }
}

// 2. Контраст всех тем: ink/muted/accentText на карточке не ниже 4.5
const lum = (h) => { h = h.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const sh = read('docs/shared.js');
const themes = [...sh.matchAll(/\n  (\w+):\s*\{ name:[\s\S]*?theme: \{([^}]*)\}(?:, alt: \{[^}]*\})? \}/g)];
T('найдено тем >= 10', themes.length >= 10, themes.length);
for (const [, id, body] of themes) {
  const g = (k) => (body.match(new RegExp(k + ": '(#[0-9A-Fa-f]{6})'")) || [])[1];
  const base = g('base'), ink = g('ink'), muted = g('muted'), acc = g('accentText');
  if (!base) { T('тема ' + id + ' base', false); continue; }
  T(`контраст ${id} ink`, cr(ink, base) >= 4.5, cr(ink, base).toFixed(2));
  T(`контраст ${id} muted`, cr(muted, base) >= 4.5, cr(muted, base).toFixed(2));
  T(`контраст ${id} accentText`, cr(acc, base) >= 4.5, cr(acc, base).toFixed(2));
  const pageHex = ((body.match(/page: '([^']*)'/) || [])[1] || '').match(/#[0-9A-Fa-f]{6}/g) || [];
  if (pageHex.length) T(`контраст ${id} ink на фоне страницы`, Math.min(...pageHex.map((c) => cr(ink, c))) >= 4.5, id);
}

// 2b. Тёмная/светлая версия: у каждой темы есть alt, и она читаема (контраст 4.5+)
for (const [, id] of themes) {
  const st = sh.indexOf('\n  ' + id + ':'); const en = sh.indexOf('\n  ', st + 5 + id.length); const nx = sh.slice(st + 1).search(/\n  \w+:\s+\{ name:/); const blk = st < 0 ? '' : sh.slice(st, nx > 0 ? st + 1 + nx : sh.length);
  const am = blk.match(/alt: \{([^}]*)\}/);
  T('тема ' + id + ' имеет обратную палитру alt', !!am);
  if (!am) continue;
  const ga = (k) => (am[1].match(new RegExp(k + ": '(#[0-9A-Fa-f]{6})'")) || [])[1];
  const b2 = ga('base'), i2 = ga('ink'), m2 = ga('muted'), a2 = ga('accentText');
  T(`контраст ${id}/alt ink`, !!b2 && cr(i2, b2) >= 4.5, b2 && cr(i2, b2).toFixed(2));
  T(`контраст ${id}/alt muted`, !!b2 && cr(m2, b2) >= 4.5, b2 && cr(m2, b2).toFixed(2));
  T(`контраст ${id}/alt accentText`, !!b2 && cr(a2, b2) >= 4.5, b2 && cr(a2, b2).toFixed(2));
  const ph = ((am[1].match(/page: '([^']*)'/) || [])[1] || '').match(/#[0-9A-Fa-f]{6}/g) || [];
  if (ph.length) T(`контраст ${id}/alt ink на фоне страницы`, Math.min(...ph.map((c) => cr(i2, c))) >= 4.5, id);
}

// 3. Белые списки бота и воркера совпадают с темами и шрифтами из shared.js
const ids = themes.map((t) => t[1]);
for (const f of ['bot/bot.mjs', 'worker/worker.js']) {
  const s = read(f); const m = s.match(/\[((?:'[a-z]+',?\s*)+)\]\.includes\(d\.th\)/);
  const list = m ? [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]) : [];
  T(`${f}: список тем полный`, ids.every((i) => list.includes(i)), ids.filter((i) => !list.includes(i)).join(','));
}
const nfk = [...sh.matchAll(/\n  (\w+): \{ name: \{ ru: '[^']*Great|\n  (vibes|playfair|script|caveat):/g)];
T('шрифты имён объявлены', /NFONTS/.test(sh));


// 3b. Виды заставок: intro.js, белые списки бота/воркера и мини-апп согласованы
const KINDS = ['seal', 'env', 'gift', 'door', 'book'];
const introJs = read('docs/intro.js'), introCss = read('docs/intro.css');
for (const k of KINDS) {
  T('intro.js знает ' + k, introJs.includes("'" + k + "'"));
  T('intro.css стиль ' + k, introCss.includes('#intro.iv-' + k));
  for (const f of ['bot/bot.mjs', 'worker/worker.js']) { const m = read(f).match(/\[((?:'[a-z]+',?\s*)+)\]\.includes\(d\.cv\)/); T(`${f}: заставка ${k} разрешена`, !!m && m[1].includes("'" + k + "'"), m ? m[1] : 'список cv не найден'); }
  T('мини-апп знает заставку ' + k, read('docs/index.html').includes(k + ":'"));
}
T('нет конфликта классов: стили заставок только с префиксом iv-', !/#intro\.(seal|env|gift|door|book)\b/.test(introCss));


// 3c. Появление блоков: файлы подключены, стили есть для каждой тематической анимации, есть страховка и учёт reduced-motion
{
  const rjs = read('docs/reveal.js'), rcss = read('docs/reveal.css'), ih = read('docs/i.html');
  T('reveal.js подключён в i.html', ih.includes('src="reveal.js"') && ih.includes('href="bundle.css"'));
  T('reveal.js вызывается после показа карточки', ih.includes('__revealInit'));
  for (const k of ['sunset', 'stained', 'swan']) T('reveal.css стиль темы ' + k, rcss.includes('data-rv=' + k));
  T('reveal.js: страховка таймером', /setTimeout\(function \(\) \{ kids\.forEach/.test(rjs));
  T('reveal.js: учёт reduced-motion', rjs.includes('prefers-reduced-motion'));
  T('reveal.css: reduced-motion не прячет блоки', /prefers-reduced-motion[\s\S]*opacity:1!important/.test(rcss));
  T('reveal.js не трогает чужие fx-rv', rjs.includes('fx-(rv|calw)'));
}

// 3d. Доступность: файл подключён, основные приёмы на месте
{
  const aj = read('docs/a11y.js'), ih = read('docs/i.html'), fc = read('docs/fx.css');
  T('a11y.js подключён в i.html', ih.includes('src="a11y.js"') && ih.includes('__a11yInit'));
  T('a11y: подписи фото галереи', aj.includes("aria-label', tx('photo')"));
  T('a11y: role=main и ссылка пропуска', aj.includes("'role', 'main'") && aj.includes('skipl'));
  T('a11y: диалог просмотра (role=dialog, aria-modal)', aj.includes("'dialog'") && aj.includes("'aria-modal'"));
  T('a11y: удержание Tab в окне просмотра', aj.includes("e.key !== 'Tab'"));
  T('a11y: живая область aria-live', aj.includes("aria-live', 'polite'"));
  T('a11y: названия на 4 языках', ['ru:', 'uz:', 'en:', 'kk:'].every((k) => aj.includes(k)));
  T('a11y: стили skip-link и .sr', fc.includes('.skipl') && fc.includes('.sr{'));
  T('a11y: у переключателей есть aria-label', ih.includes("aria-label',toDark") || ih.includes("'aria-label',isDark"));
  T('i.html: у кнопки печати есть имя', /id="seal"[^>]*aria-label=/.test(ih));
}

// 3e. Единый файл стилей: свежий и подключён (иначе страница покажет старый дизайн)
{
  const { build } = await import('./build-css.mjs');
  const fresh = build(), cur = read('docs/bundle.css');
  T('bundle.css свежий (запусти node ci/build-css.mjs)', fresh === cur);
  T('i.html подключает bundle.css, а не 4 файла', read('docs/i.html').includes('href="bundle.css"') && !/href="(fx|curtain|intro|reveal)\.css"/.test(read('docs/i.html')));
}

// 3f. Скорость: приглашение грузится из двух источников одновременно, предзагрузка скриптов
{
  const ih = read('docs/i.html');
  T('i.html: API и Pages запрашиваются одновременно (Promise.race)', ih.includes('Promise.race([ap.then') );
  T('i.html: окно ожидания свежего API 1.5 с', ih.includes('setTimeout(()=>r(null),1500)'));
  T('i.html: modulepreload shared.js', ih.includes('rel="modulepreload" href="shared.js"'));
  T('i.html: preload fx.js', ih.includes('rel="preload" href="fx.js" as="script"'));
  T('i.html: шрифты не блокируют отрисовку (media=print+onload)', ih.includes('media="print" onload="this.media=\'all\'"'));
}

// 3g. Мини-апп: карточка «Мои» не должна наследовать стили значка меню (.bd), имя подстраивается под длину
{
  const ix = read('docs/index.html');
  T('мини-апп: тело карточки не использует класс .bd (конфликт с значком меню)', !/<div class="bd"><div class="dt">/.test(ix) && ix.includes('.ic .icb{'));
  T('мини-апп: значок меню .bd остаётся только для счётчика', (ix.match(/class="bd"/g) || []).length === 1);
  T('мини-апп: имя в карточке подстраивается под длину (lg/xl)', ix.includes('.ic .nm.lg{') && ix.includes('.ic .nm.xl{'));
}

// 3h. Офлайн-режим: service worker, его версия и подключение
{
  const sw = read('docs/sw.js'), ih = read('docs/i.html'), off = read('docs/offline.js');
  const crypto = await import('node:crypto');
  const files = (sw.match(/const SHELL=\[([^\]]*)\]/)[1].match(/'([^']+)'/g) || []).map(x => x.slice(1, -1));
  const h = crypto.createHash('sha1');
  for (const f of [...files, 'i.html']) h.update(existsSync('docs/' + f) ? readFileSync('docs/' + f) : '');
  const ver = h.digest('hex').slice(0, 8);
  T('sw.js: версия кэша свежая (запусти node ci/build-sw.mjs)', sw.includes("const V='tk-" + ver + "'"), ver);
  T('sw.js: все файлы оболочки существуют', files.every(f => existsSync('docs/' + f)), files.filter(f => !existsSync('docs/' + f)));
  T('sw.js: данные приглашения «сеть сначала» (правка владельца не застревает)', /inv\/.*netFirst/.test(sw) && sw.includes("includes('/api/inv')"));
  T('sw.js: POST и Range не перехватываются', sw.includes("q.method!=='GET'") && sw.includes("has('range')"));
  T('sw.js: старые кэши удаляются при смене версии', sw.includes("caches.delete(k)") && sw.includes("startsWith('tk-')"));
  T('sw.js: число медиа в кэше ограничено', /MAXMEDIA=\d+/.test(sw));
  T('sw.js: синтаксис валиден', (() => { try { new Function(sw.replace(/self\.addEventListener/g, '(()=>0)')); return true } catch (e) { return false } })());
  T('i.html: подключён offline.js', ih.includes('<script src="offline.js"></script>'));
  T('offline.js: плашка на 4 языках (ru/uz/en/kk)', ['ru:', 'uz:', 'en:', 'kk:'].every(l => off.includes(l)));
  T('offline.js: регистрация sw.js от базы сайта (работает и на /i/имя/)', off.includes("register(base + 'sw.js'"));
}

// 3i. Загрузки: проверка по содержимому (юнит-тесты на настоящих файлах) и подключение к боту
{
  const { default: mt } = await import('./test-media.mjs');
  for (const [n, ok, e] of mt) T('загрузки: ' + n, ok, e);
  const bot = read('bot/bot.mjs');
  T('бот: приём файлов использует checkMedia (по содержимому)', bot.includes("from './media-check.mjs'") && bot.includes('checkMedia(buf, { ext })'));
  T('бот: формат и вид берутся из содержимого, а не из имени', bot.includes('ext = chk.ext; kind = chk.kind'));
  T('бот: потолок файлов у владельца проверяется до записи на диск', bot.indexOf('ownerRoom(idx, buf.length)') > 0 && bot.indexOf('ownerRoom(idx, buf.length)') < bot.indexOf('writeFileSync(`${dir}/${id}.${ext}`, buf)'));
  T('бот: сообщения mediaDim и mediaFull есть на 4 языках', (bot.match(/mediaDim:/g) || []).length === 4 && (bot.match(/mediaFull:/g) || []).length === 4);
}

// 3j. Табло и появление блоков: у каждой темы свой характер, итог перебивает тему, нет двух переворотов
{
  const fxs = read('docs/fx.js'), fxc = read('docs/fx.css'), rvc = read('docs/reveal.css'), rvj = read('docs/reveal.js');
  const { THEMES } = await import('../docs/shared.js');
  const keys = Object.entries(THEMES).map(([k, v]) => [k, v.fxk]);
  T('темы: у каждой из ' + keys.length + ' есть свой fxk', keys.every(([, f]) => !!f), keys.filter(([, f]) => !f).map(([k]) => k));
  T('темы: fxk уникальны', new Set(keys.map(([, f]) => f)).size === keys.length);
  T('появление: у каждой темы есть своё правило в reveal.css', keys.every(([, f]) => rvc.includes('html[data-rv=' + f + '].rvj #st>.rv{')), keys.filter(([, f]) => !rvc.includes('html[data-rv=' + f + '].rvj #st>.rv{')).map(([k]) => k));
  T('появление: итоговое состояние перебивает любую тему (нет застрявшего filter)', rvc.includes('html[data-rv].rvj #st>.rv.on'));
  T('появление: при reduced-motion блоки видны сразу', /prefers-reduced-motion:reduce\)\{\.rvj #st>\.rv\{opacity:1!important/.test(rvc));
  T('табло: переворот цифр есть (flip) и работает только на transform/opacity', fxs.includes('function flip(') && /@keyframes fxo\{[^}]*transform[^}]*opacity/.test(fxc) && !/@keyframes fx[on]\{[^}]*(width|height|top|left)\s*:/.test(fxc));
  T('табло: второго переворота (наблюдатель + flp) нет', !rvj.includes('MutationObserver') && !rvc.includes('flp'));
  T('табло: при reduced-motion переворота нет', fxc.includes('.sq b i{animation:none!important}') && fxs.includes('RM || document.hidden'));
}


// 3.6 Рассылка и напоминания гостям (send.js)
{
  const M = await import('../docs/send.js'), ix = read('docs/index.html');
  const it = { id: 'a', t: 'wedding', l: 'ru', a: 'Азиз', b: 'Дилноза', d: '2026-11-14', guests: [{ n: 'Али', k: 'k1' }, { n: 'Мадина', k: 'k2' }, { n: 'Рустам', k: 'k3' }] };
  const now = new Date(2026, 10, 1, 12), t0 = now.getTime();
  T('рассылка: send.js подключён в мини-аппе, экран send и кнопки есть', ix.includes("from './send.js'") && ix.includes("v==='send'?sendScreen()") && ix.includes('data-sd="inv"') && ix.includes('data-sd="rem"'));
  for (const l of ['ru', 'uz', 'en', 'kk']) for (const mode of ['inv', 'rem']) {
    const x = M.buildText({ ...it, l }, it.guests[0], mode, now);
    T(`рассылка: текст ${l}/${mode} с именем гостя, названием события и датой`, x.startsWith('Али') && x.includes('Азиз & Дилноза') && x.length > 40 && !/undefined|NaN|\bnull\b/.test(x), x);
  }
  T('рассылка: имена не склоняются (нет суффикса, приклеенного к имени)', !/Дилнозаga|Дилнозаге|Дилнозаning/.test(['uz', 'kk'].map((l) => M.buildText({ ...it, l }, it.guests[0], 'inv', now)).join(' ')));
  T('рассылка: «сегодня» и «завтра» в напоминании', M.buildText(it, it.guests[0], 'rem', new Date(2026, 10, 14)).includes('сегодня') && M.buildText(it, it.guests[0], 'rem', new Date(2026, 10, 13)).includes('завтра'));
  T('рассылка: склонение «день/дня/дней»', [[1, 'день'], [2, 'дня'], [5, 'дней'], [11, 'дней'], [21, 'день'], [22, 'дня']].every(([n, w]) => M.buildText({ ...it, d: new Date(2026, 10, 1 + n).toISOString().slice(0, 10).replace(/-(\d\d)$/, (_, d) => '-' + d) }, it.guests[0], 'rem', now).includes('осталось ' + n + ' ' + w) || n === 1));
  T('рассылка: приглашение уходит только не отправленным', JSON.stringify(M.pickRecipients(it, {}, { 'inv:k1': 1 }, 'inv', now)) === '[1,2]');
  T('рассылка: напоминание не получают ответившие («придёт» и «не сможет»)', JSON.stringify(M.pickRecipients(it, { 'a:k1': { s: 'y' }, 'a:k3': { s: 'n' } }, {}, 'rem', now)) === '[1]');
  T('рассылка: «пока не знаю» и «только открыл» остаются в напоминаниях', JSON.stringify(M.pickRecipients(it, { 'a:k1': { o: 'x' }, 'a:k2': { s: 'p' } }, {}, 'rem', now)) === '[0,1,2]');
  T('рассылка: повторное напоминание не раньше чем через 24 ч', JSON.stringify(M.pickRecipients(it, {}, { 'rem:k1': t0 - 2 * 36e5, 'rem:k2': t0 - 30 * 36e5 }, 'rem', now)) === '[1,2]');
  T('рассылка: напоминания не идут без даты и после события', M.pickRecipients({ ...it, d: '' }, {}, {}, 'rem', now).length === 0 && M.pickRecipients(it, {}, {}, 'rem', new Date(2026, 10, 20)).length === 0);
  T('рассылка: приглашения и напоминания хранятся отдельно (inv:/rem:)', Object.keys(M.markSent(M.markSent({}, 'inv', 'k1'), 'rem', 'k1')).sort().join() === 'inv:k1,rem:k1');
  T('рассылка: ссылки Telegram и WhatsApp кодируют текст', M.tgShareUrl('https://t.me/b?start=i_a__k1', 'Али, привет').includes('%D0%90%D0%BB%D0%B8') && M.waShareUrl('https://x/y', 'Али').startsWith('https://wa.me/?text='));
  { const k = ix.indexOf("$$('[data-sdsk]')"), blk2 = ix.slice(k, ix.indexOf('\n', ix.indexOf('render()});', k))); T('рассылка: пропуск не помечает отправленным (нет sentSet в обработчике, гость уходит в конец)', k > 0 && !blk2.includes('sentSet') && blk2.includes('ST.sd.skip'), blk2.slice(0, 120)); }
}


// 3.7 Мастер из 5 шагов (п. 16) и живой предпросмотр на последнем шаге (п. 17)
{
  const ix = read('docs/index.html'), fi = ix.indexOf('function form(){'), fe = ix.indexOf('return top()+h}', fi), fb = ix.slice(fi, fe);
  const steps = [...fb.matchAll(/h\+=STEP\((\d)\)/g)].map((m) => +m[1]);
  T('мастер: форма разбита ровно на 5 шагов по порядку', steps.join() === '1,2,3,4,5', steps);
  T('мастер: последняя секция закрыта, панель шагов внизу', fb.includes("</section>'+WZ_BAR(isE)"));
  T('мастер: показывается один шаг, остальные скрыты (но остаются в DOM, данные не теряются)', /\.wzs\{display:none\}\.wzs\.on\{display:block/.test(ix));
  T('мастер: кнопка «Сохранить» только на последнем шаге', ix.includes("ST.wz<WZ_N?'<button type=\"button\" class=\"b d\" id=\"wzn\"") && ix.includes("id=\"sv\""));
  T('мастер: со шага 2 дальше нельзя без имени и даты (и кнопкой, и точкой)', ix.includes("const wzOk=n=>n!==2||(!!(ST.draft.a||'').trim()&&!!ST.draft.d)") && ix.includes('for(let k=ST.wz;k<n;k++){if(!wzOk(k))'));
  T('мастер: шаг запоминается в черновике и сбрасывается на 1 для новой формы и правки', ix.includes('wz:ST.wz') && ix.includes('ST.wz=(D.wz>=1&&D.wz<=5)?D.wz:1') && (ix.match(/ST\.wz=1;/g) || []).length >= 3);
  T('мастер: у точек прогресса есть подписи для чтения с экрана и aria-current', ix.includes("aria-current=\"step\"") && ix.includes("t('wzGo')"));
  T('мастер: при reduced-motion смена шага без анимации', /prefers-reduced-motion:reduce\)\{\.wzs\.on\{animation:none/.test(ix));
  const ru = ix.slice(ix.indexOf('ru:{ey:'), ix.indexOf('uz:{ey:')), uz = ix.slice(ix.indexOf('uz:{ey:'));
  T('мастер: названия 5 шагов и кнопки есть на ru и uz', ['wz1:', 'wz2:', 'wz3:', 'wz4:', 'wz5:', 'wzNext:', 'wzBack:', 'wzNeed:', 'wzOf:'].every((k) => ru.includes(k) && uz.slice(0, uz.indexOf('\nconst ')).includes(k)));
  T('мастер: поля даты и времени сжимаются (нет горизонтальной прокрутки на 280–320 px)', /\.row\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/.test(ix) && ix.includes('.row input[type=date]'));
  T('мастер: браузерные сценарии лежат в tests/wizard', ['steps', 'flow', 'wide', 'autosave', 'send', 'reminders', 'phrasespec', 'types12', 'videocover', 'videocover_wz'].every((f) => existsSync('tests/wizard/' + f + '.py')));
  // П.3 видео-открытка: флаг vc должен жить во всех звеньях цепочки, иначе тихо потеряется
  const gi = read('docs/i.html'), wk = read('worker/worker.js'), bt = read('bot/bot.mjs');
  T('видео-открытка: переключатель #vcsw в мастере виден только при загруженном видео', ix.includes("(d.vl||[]).some(v=>v.url))h+='<label class=\"sw\"") && ix.includes('id=\"vcsw\"'));
  T('видео-открытка: пакет несёт vc только при ролике, который уже загружен', ix.includes("vc:(it.vc&&(it.vl||[]).some(x=>x.url))?1:''"));
  T('видео-открытка: переключатель сохраняет черновик сразу', ix.includes('ST.draft.vc=vcsw.checked;autoSave()'));
  T('видео-открытка: подписи в мастере на ru и uz', ['vcov:', 'vcovOn:', 'vcovH:'].every((k) => ix.split(k).length >= 3));
  T('видео-открытка: воркер и бот ставят vc только после проверки ролика', [wk, bt].every((x) => x.includes('d.vc === 1') && x.includes('p.v && p.v.length) o.vc = 1')));
  T('видео-открытка: страница гостя уважает «меньше движения» и экономию трафика', gi.includes('cvOn=') && gi.includes('prefers-reduced-motion: reduce') && gi.includes('saveData'));
  T('видео-открытка: звук включается кнопкой на 4 языках', ['Включить звук', 'Ovozni yoqish', 'Turn sound on', 'Дыбысты қосу'].every((x) => gi.includes(x)));
  T('видео-открытка: видео обложки не мешает обработчикам обычного видео', gi.split("v.id==='cvv'").length - 1 >= 6);
  T('видео-открытка: видео обложки останавливается, когда заставка закрыта', gi.includes("classList.contains('out')") && gi.includes('v.pause()'));
  T('видео-открытка: тест воркера и бота tests/worker-types.mjs лежит в репозитории', existsSync('tests/worker-types.mjs'));
  T('предпросмотр: живой блок #pvb и «Посмотреть как гость» остаются на последнем шаге', fb.indexOf('id="pvb"') > fb.indexOf('h+=STEP(5)') && fb.includes('data-pvfull'));
}


// 3.8 Двенадцать шаблонов-характеров (п. 1): каждый событийный тип целиком
{
  const TYPES = ['wedding', 'nikah', 'birthday', 'anniversary', 'sunnat', 'beshik', 'grad', 'party', 'corp', 'navruz', 'hayit', 'other'];
  const tplStart = sh.indexOf('export const TPL'), tplEnd = sh.indexOf('export const THEMES');
  const tpl = sh.slice(tplStart, tplEnd), ph = read('docs/phrases.js'), sd = read('docs/send.js'), ix2 = read('docs/index.html');
  const keys = [...tpl.matchAll(/\n  (\w+): \{ music:/g)].map((m) => m[1]);
  T('шаблоны: ровно 12 типов', keys.length === 12 && TYPES.every((k) => keys.includes(k)), keys.join());
  const tp = ix2.match(/const TP=\[([^\]]*)\]/)[1];
  const evBlock = sd.slice(sd.indexOf('const EV'), sd.indexOf('function plural'));
  for (const k of TYPES) {
    const i0 = tpl.indexOf('\n  ' + k + ': { music:'), nx = tpl.slice(i0 + 5).search(/\n  \w+: \{ music:/), blk = tpl.slice(i0, nx > 0 ? i0 + 5 + nx : undefined);
    const th = (blk.match(/theme: \{([^}]*)\}/) || [])[1] || '';
    const g = (n) => (th.match(new RegExp(n + ": '(#[0-9A-Fa-f]{6})'")) || [])[1];
    const base = g('base');
    T(`шаблон ${k}: контраст ink/muted/accentText ≥ 4.5`, !!base && [g('ink'), g('muted'), g('accentText')].every((c) => c && cr(c, base) >= 4.5), base && [g('ink'), g('muted'), g('accentText')].map((c) => cr(c, base).toFixed(1)).join('/'));
    const pageHex = ((th.match(/page: '([^']*)'/) || [])[1] || '').match(/#[0-9A-Fa-f]{6}/g) || [];
    T(`шаблон ${k}: текст читаем на фоне страницы`, pageHex.length > 0 && Math.min(...pageHex.map((c) => cr(g('ink'), c))) >= 4.5);
    T(`шаблон ${k}: название и приветствие на 4 языках`, ['label', 'greeting'].every((f) => { const m = blk.match(new RegExp(f + ': \\{([^}]*)\\}')); return m && ['ru', 'uz', 'en', 'kk'].every((l) => new RegExp('\\b' + l + ': ').test(m[1])); }));
    T(`шаблон ${k}: обложка, портрет и 3 фото галереи`, /cover: U\('photo-/.test(blk) && /portrait: U\('photo-/.test(blk) && (blk.match(/gallery: \[([^\]]*)\]/) || [, ''])[1].split('U(').length - 1 >= 3);
    T(`шаблон ${k}: 3 стиля фраз × 4 языка`, ['classic', 'warm', 'short'].every((st) => { const a = ph.indexOf('\n  ' + k + ': {'); if (a < 0) return false; const part = ph.slice(a, a + 6000); const m = part.match(new RegExp(st + ': \\{([\\s\\S]*?)\\n    \\}')); return m && ['ru', 'uz', 'en', 'kk'].every((l) => new RegExp('\\n      ' + l + ": '").test(m[1])); }));
    T(`шаблон ${k}: подпись события в рассылке на 4 языках`, (evBlock.match(new RegExp('\\b' + k + ': ', 'g')) || []).length === 4);
    T(`шаблон ${k}: есть в мастере`, tp.includes("'" + k + "'"));
    for (const f of ['bot/bot.mjs', 'worker/worker.js']) T(`шаблон ${k}: пропущен ${f}`, new RegExp("\\[[^\\]]*'" + k + "'[^\\]]*\\]\\.includes\\(d\\.t\\)").test(read(f)));
  }
  T('бот: для каждого типа есть обложка в карточке', TYPES.filter((k) => !['wedding'].includes(k)).every((k) => new RegExp('\\b' + k + ": 'photo-").test(read('bot/bot.mjs'))));
  const bad = [...new Set([...tpl.matchAll(/photo-\d+-[0-9a-f]+/g)].map((m) => m[0]))].filter((x) => /^photo-1523050854058/.test(x));
  T('шаблоны: известный мёртвый ID фото не вернулся', bad.length === 0, bad.join());
}

// 4. Нет секретов в публичной части
for (const f of readdirSync('docs').filter((x) => /\.(js|html|css|json)$/.test(x))) {
  const s = read('docs/' + f);
  T('нет токена бота в docs/' + f, !/\d{8,10}:[A-Za-z0-9_-]{35}/.test(s));
}

// 5. Страницы содержат обязательные теги
for (const f of ['docs/index.html', 'docs/i.html']) { const h = read(f); T(f + ' viewport', /name="viewport"/.test(h)); T(f + ' lang', /<html[^>]*lang=/.test(h)); }

console.log(`\nCI: ${ok} ok, ${bad} fail`);
process.exit(bad ? 1 : 0);
