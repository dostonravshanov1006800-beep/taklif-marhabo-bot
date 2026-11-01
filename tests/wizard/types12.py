# 12 шаблонов: плитки в мастере, образец, подбор текста, страница гостя, подпись рассылки.
import json, subprocess, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _fixtures import temp_invites, TYPES6
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8834/taklif-marhabo-bot'
TYPES = ['wedding','nikah','birthday','anniversary','sunnat','beshik','grad','party','corp','navruz','hayit','other']
res = []
def ok(n, c, e=''): print(('PASS' if c else 'FAIL'), n, str(e)[:150]); res.append(bool(c))
def route(ctx):
    ctx.route('**/telegram.org/**', lambda r, *a: r.fulfill(status=200, content_type='application/javascript', body=''))
    ctx.route('**/fonts.googleapis.com/**', lambda r, *a: r.fulfill(status=200, content_type='text/css', body=''))
    ctx.route('**/images.unsplash.com/**', lambda r, *a: r.fulfill(status=200, content_type='image/gif', body=bytes.fromhex('47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b')))
    ctx.route('**/*workers.dev/**', lambda r, *a: r.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body='{}'))
_fx = temp_invites(TYPES6); _fx.__enter__()
with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in ('ru', 'uz'):
        ctx = b.new_context(viewport={'width': 360, 'height': 780}, service_workers='block'); route(ctx); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:90]))
        pg.add_init_script("localStorage.setItem('lang','%s')" % lang)
        pg.goto(BASE + '/index.html'); pg.wait_for_selector('.hero', timeout=15000)
        pg.locator('[data-new]').first.click(); pg.wait_for_selector('section.wzs.on')
        tiles = pg.evaluate("[...document.querySelectorAll('[data-tpl]')].map(b=>b.dataset.tpl)")
        ok(f'[{lang}] в мастере 12 плиток в нужном порядке', tiles == TYPES, tiles)
        labels = pg.evaluate("[...document.querySelectorAll('[data-tpl] b')].map(b=>b.textContent.trim())")
        ok(f'[{lang}] у каждой плитки есть подпись', all(labels) and len(set(labels)) == 12, labels)
        ov = pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
        ok(f'[{lang}] плитки не дают горизонтальной прокрутки', ov)
        for t in TYPES:
            pg.evaluate("t=>document.querySelector('[data-tpl=\"'+t+'\"]').click()", t); pg.wait_for_timeout(120)
            on = pg.evaluate("[...document.querySelectorAll('[data-tpl].on')].map(b=>b.dataset.tpl)")
            ph = pg.evaluate("(document.querySelector('[data-f=x]')||{}).placeholder||''")
            if on != [t] or len(ph) < 30: ok(f'[{lang}] {t}: плитка выбрана и подсказка текста есть', False, (on, ph[:40]))
        ok(f'[{lang}] все 12 плиток выбираются, подсказка текста не пустая', True)
        ok(f'[{lang}] нет JS-ошибок', not errs, errs)
        ctx.close()
    # подбор текста для каждого нового типа
    ctx = b.new_context(viewport={'width': 360, 'height': 780}, service_workers='block'); route(ctx); pg = ctx.new_page()
    pg.goto(BASE + '/index.html'); pg.wait_for_selector('.hero'); pg.locator('[data-new]').first.click(); pg.wait_for_selector('section.wzs.on')
    for t in ['sunnat','beshik','grad','party','corp','hayit']:
        pg.evaluate("t=>document.querySelector('[data-tpl=\"'+t+'\"]').click()", t); pg.wait_for_timeout(120)
        pg.evaluate("document.querySelector('[data-wzg=\"2\"]').click()"); pg.wait_for_timeout(150)
        pg.fill('[data-f=a]', 'Тест'); pg.fill('[data-f=d]', '2027-06-12')
        pg.evaluate("document.querySelector('[data-wzg=\"4\"]').click()"); pg.wait_for_timeout(200)
        pg.fill('[data-f=x]', ''); pg.click('#phb'); pg.click('#phl [data-ph=classic]'); pg.wait_for_timeout(200)
        v = pg.evaluate("document.querySelector('[data-f=x]').value")
        ok(f'{t}: «Подобрать текст» подставил фразу именно этого типа', len(v) > 40 and 'свадьб' not in v.lower().replace('свадьбой', ''), v[:60])
        pg.evaluate("document.querySelector('[data-wzg=\"1\"]').click()"); pg.wait_for_timeout(100)
    ctx.close()
    # страница гостя: заголовок, обложка, гости видят свой тип на 4 языках
    for t in ['sunnat','beshik','grad','corp','party','hayit']:
        ctx = b.new_context(viewport={'width': 360, 'height': 780}, service_workers='block'); route(ctx); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:90]))
        pg.goto(BASE + f'/i.html?s=tt-{t}'); pg.wait_for_selector('#seal', timeout=15000)
        try: pg.evaluate("document.querySelector('#seal')&&document.querySelector('#seal').click()")
        except Exception: pass
        pg.wait_for_timeout(900)
        info = pg.evaluate("({ty:window.__INV&&window.__INV.type,lab:window.__INV&&window.__INV.tp.label.ru,txt:document.body.innerText})")
        ok(f'гость {t}: страница открыта с типом {t}', info['ty'] == t, info['ty'])
        ok(f'гость {t}: название типа «{info["lab"]}» видно на странице', info['lab'].upper() in info['txt'].upper() or info['lab'] in info['txt'], info['lab'])
        ok(f'гость {t}: нет JS-ошибок и горизонтальной прокрутки', not errs and pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), errs)
        ctx.close()
    b.close()
_fx.__exit__(None, None, None)
# подпись рассылки на 4 языках для каждого нового типа (чистый JS)
js = r"""import {whoLine} from '/app/conversations/6ae32fd38b107a4b39ea2360/taklif-gh/docs/send.js';
const out={};for(const t of ['sunnat','beshik','grad','corp','party','hayit'])for(const l of ['ru','uz','en','kk'])out[t+l]=whoLine({t,a:'Азиз',b:'Дилноза'},l);console.log(JSON.stringify(out));"""
open('/tmp/who.mjs', 'w').write(js)
o = json.loads(subprocess.check_output(['node', '/tmp/who.mjs']).decode())
ok('рассылка: у всех новых типов непустая подпись на 4 языках', all(o.values()), [k for k, v in o.items() if not v])
ok('рассылка: корпоратив и хайит без имён пары', 'Азиз' not in o['corpru'] and 'Азиз' not in o['hayitru'], (o['corpru'], o['hayitru']))
ok('рассылка: сүннат/бешик/выпускной/вечер с именем', all('Азиз' in o[t + 'ru'] for t in ['sunnat','beshik','grad','party']), [o[t + 'ru'] for t in ['sunnat','beshik','grad','party']])
print('ИТОГО %d ok, %d fail' % (sum(res), len(res) - sum(res)))
