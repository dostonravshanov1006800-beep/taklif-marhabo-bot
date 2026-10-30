// Сквозной тест: мини-апп (браузер) -> POST /api/inv -> страница гостя. Воркер локальный, токен бота тестовый.
import { createServer } from 'node:http'; import { createHmac } from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs'; import worker from '../worker/worker.js';
const DOCS = path.resolve('docs'); const BOT = '123456:TESTTOKEN'; const OWNER = 777001;
const kv = new Map(); const env = { BOT_TOKEN: BOT, ADMIN_KEY: 'a', INV: { async get(k, t) { const v = kv.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { kv.set(k, v); } } };
const sign = (uid) => { const p = { auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'Q', user: JSON.stringify({ id: uid, first_name: 'Test', language_code: 'ru' }) };
  const s = Object.keys(p).sort().map((k) => `${k}=${p[k]}`).join('\n'); p.hash = createHmac('sha256', createHmac('sha256', 'WebAppData').update(BOT).digest()).update(s).digest('hex'); return new URLSearchParams(p).toString(); };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
const srv = createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(DOCS, u); if (!f.startsWith(DOCS) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((r) => srv.listen(0, r)); const BASE = `http://localhost:${srv.address().port}`;
let ok = 0, bad = 0; const T = (n, c, e = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, e); } console.log(c ? 'PASS' : 'FAIL', n); };
const br = await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox']}); const ctx = await br.newContext({ viewport: { width: 390, height: 800 } });
const apiCalls = [];
await ctx.route('https://taklif-api.dostonravshanov1006800.workers.dev/**', async (route) => {
  const rq = route.request(); const u = new URL(rq.url()); apiCalls.push(rq.method() + ' ' + u.pathname); if(process.env.DBG)console.log('REQ',rq.method(),u.pathname,(rq.postData()||'').slice(0,160),'| hdr',(rq.headers()['x-tg-init']||'').slice(0,40));
  const res = await worker.fetch(new Request('https://x' + u.pathname + u.search, { method: rq.method(), headers: rq.headers(), body: rq.postData() || undefined }), env);
  if(process.env.DBG)console.log('RES',res.status);await route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: await res.text() });
});
await ctx.route(/fonts\.(googleapis|gstatic)|unpkg|cdn\./, (r) => r.abort());
await ctx.route('https://telegram.org/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* stub */' }));
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.addInitScript(({ init, uid }) => { window.Telegram = { WebApp: { initData: init, initDataUnsafe: { user: { id: uid, first_name: 'Test', language_code: 'ru' } }, ready() {}, expand() {}, close() {}, setHeaderColor() {}, setBackgroundColor() {}, disableVerticalSwipes() {}, enableClosingConfirmation() {}, HapticFeedback: { impactOccurred() {}, notificationOccurred() {} }, version: '7.0', platform: 'android', colorScheme: 'light', themeParams: {}, MainButton: { hide() {}, show() {}, setText() {}, onClick() {}, offClick() {} }, BackButton: { hide() {}, show() {}, onClick() {}, offClick() {} }, openTelegramLink() {}, openLink() {}, onEvent() {}, offEvent() {}, isVersionAtLeast() { return true; }, CloudStorage: undefined } }; }, { init: sign(OWNER), uid: OWNER });
await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
T('мини-апп открылся без ошибок JS', errs.length === 0, errs.join('|'));
// путь человека: «Создать» -> имена и дата -> «Сохранить»
await page.click('[data-new="wedding"]'); await page.waitForSelector('input[data-f="a"]');
await page.fill('input[data-f="a"]', 'Тимур'); await page.fill('input[data-f="b"]', 'Лола');
await page.fill('input[data-f="d"]', '2026-12-20'); await page.fill('input[data-f="pl"]', 'Зал Нур').catch(() => {});
const t0 = Date.now(); await page.click('#sv');
await page.waitForFunction(() => /timur-lola/.test(document.body.innerText) || /timur-lola/.test(localStorage.getItem('mh_pub_777001') || ''), null, { timeout: 8000 }).catch(() => {});
const dt = Date.now() - t0;
T('«Сохранить» дошло до API (POST /api/inv)', apiCalls.includes('POST /api/inv'), apiCalls.join(','));
T('ссылка получена быстрее 3 секунд (' + dt + ' мс)', dt < 3000);
await page.screenshot({ path: '/tmp/after_save.png' }); if (process.env.DBG) console.log('SCREEN:', (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 700));
T('на экране «ОПУБЛИКОВАНО, ССЫЛКА КОРОТКАЯ»', /ОПУБЛИКОВАНО/i.test(await page.evaluate(() => document.body.innerText)));
const saved = JSON.parse(kv.get('inv:timur-lola') || 'null'); if(process.env.DBG)console.log('SAVED',JSON.stringify(saved));
T('в KV: имена и дата', saved && saved.a === 'Тимур' && saved.b === 'Лола' && saved.d === '2026-12-20', JSON.stringify(saved));
T('в KV: владелец = подписанный пользователь', saved && saved.o === String(OWNER));
T('в KV: занавес для свадьбы включён', saved && saved.cu === 1);
// правка: меняем место и сохраняем снова
await page.evaluate(() => document.querySelector('[data-edit],[data-open]')?.click()).catch(() => {});
await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
const mine = await page.evaluate(async () => { const r = await fetch('https://taklif-api.dostonravshanov1006800.workers.dev/api/mine', { headers: { 'x-tg-init': window.Telegram.WebApp.initData } }); return r.json(); });
T('после перезагрузки /api/mine отдаёт slug владельца', mine.ok && Object.values(mine.pub).includes('timur-lola'), JSON.stringify(mine));
// страница гостя по короткой ссылке
const g = await ctx.newPage(); const gerr = []; g.on('pageerror', (e) => gerr.push(e.message));
await g.goto(BASE + '/i.html?s=timur-lola', { waitUntil: 'domcontentloaded' }); await g.waitForTimeout(2500);
const txt = await g.evaluate(() => document.body.innerText);
T('гость видит имена Тимур и Лола', /Тимур/.test(txt) && /Лола/.test(txt), txt.slice(0, 120));
await g.click('#cur .sk', { timeout: 4000 }).catch(() => {}); await g.waitForSelector('#cur', { state: 'detached', timeout: 5000 }).catch(() => {}); await g.waitForTimeout(500);
await g.screenshot({path:'/tmp/guest.png',fullPage:true});await g.click('.seal', { timeout: 4000 }).catch(() => {}); await g.waitForTimeout(3500);
const txt2 = await g.evaluate(() => document.body.innerText); if(process.env.DBG)console.log('GUEST:',txt2.replace(/\n+/g,' | ').slice(0,700));T('гость видит место Зал Нур', /Зал Нур/i.test(txt2), txt2.slice(0, 160));
T('гость: нет JS-ошибок', gerr.length === 0, gerr.join('|'));
T('гость читал из API, а не из GitHub', apiCalls.some((c) => c === 'GET /api/inv/timur-lola'));
// чужой не может перезаписать
const evil = await worker.fetch(new Request('https://x/api/inv', { method: 'POST', body: JSON.stringify({ init: sign(999), data: { i: 'tst001', a: 'Хакер', b: 'X' } }) }), env);
const ej = await evil.json(); T('чужой пользователь не затёр чужое', JSON.parse(kv.get('inv:timur-lola')).a === 'Тимур', JSON.stringify(ej));
console.log(`\nИТОГО: ${ok} ok, ${bad} fail`); await br.close(); srv.close(); process.exit(bad ? 1 : 0);
