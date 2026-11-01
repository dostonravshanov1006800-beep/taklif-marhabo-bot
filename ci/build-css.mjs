// Склеивает стили страницы гостя в один файл docs/bundle.css (меньше запросов на медленной сети).
// Порядок важен: он совпадает с порядком <link> в i.html, каскад не меняется.
import { readFileSync, writeFileSync } from 'node:fs';
export const PARTS = ['fx.css', 'curtain.css', 'intro.css', 'reveal.css'];
export function build() {
  return PARTS.map((f) => `/* ${f} */\n` + readFileSync(new URL('../docs/' + f, import.meta.url), 'utf8').trim() + '\n').join('\n');
}
if (process.argv[1] && process.argv[1].endsWith('build-css.mjs')) {
  const out = build(); writeFileSync(new URL('../docs/bundle.css', import.meta.url), out);
  console.log('bundle.css:', Math.round(out.length / 1024) + ' КБ из', PARTS.length, 'файлов');
}
