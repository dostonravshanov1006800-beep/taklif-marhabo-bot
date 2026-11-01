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
const themes = [...sh.matchAll(/\n  (\w+):\s*\{ name:[\s\S]*?theme: \{([^}]*)\} \}/g)];
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

// 4. Нет секретов в публичной части
for (const f of readdirSync('docs').filter((x) => /\.(js|html|css|json)$/.test(x))) {
  const s = read('docs/' + f);
  T('нет токена бота в docs/' + f, !/\d{8,10}:[A-Za-z0-9_-]{35}/.test(s));
}

// 5. Страницы содержат обязательные теги
for (const f of ['docs/index.html', 'docs/i.html']) { const h = read(f); T(f + ' viewport', /name="viewport"/.test(h)); T(f + ' lang', /<html[^>]*lang=/.test(h)); }

console.log(`\nCI: ${ok} ok, ${bad} fail`);
process.exit(bad ? 1 : 0);
