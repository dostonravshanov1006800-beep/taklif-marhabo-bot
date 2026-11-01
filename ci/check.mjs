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

// 4. Нет секретов в публичной части
for (const f of readdirSync('docs').filter((x) => /\.(js|html|css|json)$/.test(x))) {
  const s = read('docs/' + f);
  T('нет токена бота в docs/' + f, !/\d{8,10}:[A-Za-z0-9_-]{35}/.test(s));
}

// 5. Страницы содержат обязательные теги
for (const f of ['docs/index.html', 'docs/i.html']) { const h = read(f); T(f + ' viewport', /name="viewport"/.test(h)); T(f + ' lang', /<html[^>]*lang=/.test(h)); }

console.log(`\nCI: ${ok} ok, ${bad} fail`);
process.exit(bad ? 1 : 0);
