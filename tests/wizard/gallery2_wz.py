# П.5 в мастере: подписи, выбор раскладки, лимит 12 фото, пакет с подписями, не сдвигающимися при удалении.
import json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8834/taklif-marhabo-bot'; SITE = BASE + '/'; res = []
def ok(n, c, e=''): print(('PASS' if c else 'FAIL'), n, str(e)[:170]); res.append(bool(c))
def route(ctx):
    ctx.route('**/telegram.org/**', lambda r, *a: r.fulfill(status=200, content_type='application/javascript', body=''))
    ctx.route('**/fonts.googleapis.com/**', lambda r, *a: r.fulfill(status=200, content_type='text/css', body=''))
    ctx.route('**/*workers.dev/**', lambda r, *a: r.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body='{}'))
def gl(n, caps=None):
    return [{'url': SITE + 'media/999000111/gal%dx.jpg' % (i + 1), 'pv': '', 'cap': (caps or {}).get(i, '')} for i in range(n)]
def draft(g, gv='', lang='ru'):
    return json.dumps({'v': 'form', 'wz': 3, 't': 9999999999999, 'draft': {'id': 'dg1', 't': 'wedding', 'l': lang, 'th': '', 'w': False, 'cu': False, 'cv': '', 'tc': [], 'a': 'Doston', 'b': 'Diyora', 'd': '2027-03-14', 'h': '', 'pl': '', 'ad': '', 'm': '', 'x': '', 'dc': '', 'dp': [], 'st': [], 'ct': '', 'u': '', 'c': '', 'o': '', 'g': '', 'gl': g, 'gv': gv, 'vl': [], 'pr': [], 'tcs': [], 'guests': []}})
with sync_playwright() as p:
    b = p.chromium.launch()
    def start(dr, lang='ru', w=360):
        ctx = b.new_context(viewport={'width': w, 'height': 780}, service_workers='block'); route(ctx); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:90]))
        pg.add_init_script("localStorage.setItem('taklif_draft_v1', %s); localStorage.setItem('lg','%s')" % (json.dumps(dr), lang))
        pg.goto(BASE + '/index.html'); pg.wait_for_timeout(1200); return ctx, pg, errs
    P = "window.__payload(window.__ST.draft).p"
    ctx, pg, errs = start(draft(gl(3, {0: 'Первый танец', 2: 'Финал'})))
    ok('поля подписей по числу фото', pg.locator('[data-gc]').count() == 3)
    ok('подпись подставлена из черновика', pg.input_value('[data-gc="0"]') == 'Первый танец')
    ok('три кнопки раскладки, «Сетка» выбрана', pg.locator('[data-gv]').count() == 3 and pg.evaluate("document.querySelector('[data-gv=\"\"]').getAttribute('aria-pressed')") == 'true')
    ok('кнопки и поля ≥44px', pg.evaluate("[...document.querySelectorAll('[data-gv],[data-gc]')].every(e=>e.getBoundingClientRect().height>=44)"))
    ok('нет горизонтальной прокрутки на 360', pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    pg.fill('[data-gc="1"]', 'Мама и папа'); pg.wait_for_timeout(400)
    ok('ввод подписи попадает в черновик', json.loads(pg.evaluate("localStorage.getItem('taklif_draft_v1')"))['draft']['gl'][1]['cap'] == 'Мама и папа')
    pk = pg.evaluate(P)
    ok('пакет: пути и подписи в одном порядке', pk['g'] == ['media/999000111/gal1x.jpg', 'media/999000111/gal2x.jpg', 'media/999000111/gal3x.jpg'] and pk['gc'] == ['Первый танец', 'Мама и папа', 'Финал'], pk)
    ok('пакет: без выбора раскладки gv нет', 'gv' not in pk)
    pg.click('[data-gv="m"]'); pg.wait_for_timeout(500)
    ok('мозаика выбирается и уходит в пакет', pg.evaluate(P + '.gv') == 'm' and pg.evaluate("document.querySelector('[data-gv=\"m\"]').getAttribute('aria-pressed')") == 'true')
    ok('выбор раскладки переживает перезагрузку', json.loads(pg.evaluate("localStorage.getItem('taklif_draft_v1')"))['draft']['gv'] == 'm')
    pg.click('[data-gv="r"]'); pg.wait_for_timeout(300)
    ok('лента выбирается', pg.evaluate(P + '.gv') == 'r')
    # удаление среднего фото не сдвигает подписи остальных
    pg.click('[data-gx="1"]'); pg.wait_for_timeout(500)
    pk = pg.evaluate(P)
    ok('после удаления фото подписи остаются у своих фото', pk['g'] == ['media/999000111/gal1x.jpg', 'media/999000111/gal3x.jpg'] and pk['gc'] == ['Первый танец', 'Финал'], pk)
    ok('нет JS-ошибок', not errs, errs); ctx.close()
    # без подписей: gc нет вовсе
    ctx, pg, errs = start(draft(gl(2)))
    ok('без подписей поле gc не уходит в пакет', 'gc' not in pg.evaluate(P)); ctx.close()
    # пустая подпись из пробелов и перенос строки чистятся
    ctx, pg, errs = start(draft(gl(2, {0: '  Привет \n  мир  '})))
    ok('подпись нормализуется (пробелы, перенос)', pg.evaluate(P + '.gc[0]') == 'Привет мир'); ctx.close()
    # лимит 12 и длина 60
    ctx, pg, errs = start(draft(gl(12, {0: 'x' * 90})))
    ok('12 фото: кнопки «+» больше нет', pg.locator('[data-gadd]').count() == 0)
    ok('12 фото попадают в пакет целиком', len(pg.evaluate(P + '.g')) == 12)
    ok('подпись режется до 60 знаков', len(pg.evaluate(P + '.gc[0]')) == 60); ctx.close()
    ctx, pg, errs = start(draft(gl(11)))
    ok('11 фото: «+» ещё есть', pg.locator('[data-gadd]').count() == 1); ctx.close()
    # без фото блока раскладки нет
    ctx, pg, errs = start(draft([]))
    ok('без фото выбора раскладки и подписей нет', pg.locator('[data-gv]').count() == 0 and pg.locator('[data-gc]').count() == 0); ctx.close()
    # узбекский и узкий экран
    ctx, pg, errs = start(draft(gl(2)), 'uz', 320)
    ok('uz 320 px: названия на узбекском, без прокрутки', pg.evaluate("/Mozaika/.test(document.body.innerText)&&/Rasm izohi/i.test(document.body.innerText)&&document.documentElement.scrollWidth<=innerWidth+1")); ctx.close()
    b.close()
print('ИТОГО %d ok, %d fail' % (sum(res), len(res) - sum(res)))
