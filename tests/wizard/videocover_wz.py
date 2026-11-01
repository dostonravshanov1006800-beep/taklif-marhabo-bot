# П.3 в мастере: переключатель «Видео-открытка» виден только при загруженном видео, сохраняется и уходит в пакет.
import json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8834/taklif-marhabo-bot'; res = []
def ok(n, c, e=''): print(('PASS' if c else 'FAIL'), n, str(e)[:170]); res.append(bool(c))
def route(ctx):
    ctx.route('**/telegram.org/**', lambda r, *a: r.fulfill(status=200, content_type='application/javascript', body=''))
    ctx.route('**/fonts.googleapis.com/**', lambda r, *a: r.fulfill(status=200, content_type='text/css', body=''))
    ctx.route('**/images.unsplash.com/**', lambda r, *a: r.fulfill(status=200, content_type='image/gif', body=bytes.fromhex('47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b')))
    ctx.route('**/*workers.dev/**', lambda r, *a: r.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body='{}'))
def draft(vl, vc=False, lang='ru'):
    return json.dumps({'v': 'form', 'wz': 3, 't': 9999999999999, 'draft': {'id': 'dvc1', 't': 'wedding', 'l': lang, 'th': '', 'w': False, 'cu': False, 'cv': '', 'tc': [], 'a': 'Doston', 'b': 'Diyora', 'd': '2027-03-14', 'h': '', 'pl': '', 'ad': '', 'm': '', 'x': '', 'dc': '', 'dp': [], 'st': [], 'ct': '', 'u': '', 'c': '', 'o': '', 'g': '', 'gl': [], 'vl': vl, 'vc': vc, 'pr': [], 'tcs': [], 'guests': []}})
SITE = BASE + '/'
VID = [{'url': SITE + 'media/999000111/vcov1.mp4', 'o': 'l', 'nm': 'a.mp4'}]
with sync_playwright() as p:
    b = p.chromium.launch()
    def start(dr, lang='ru'):
        ctx = b.new_context(viewport={'width': 360, 'height': 780}, service_workers='block'); route(ctx); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:90]))
        pg.add_init_script("localStorage.setItem('taklif_draft_v1', %s); localStorage.setItem('lg','%s')" % (json.dumps(dr), lang))
        pg.goto(BASE + '/index.html'); pg.wait_for_timeout(1200)
        return ctx, pg, errs
    ctx, pg, errs = start(draft(VID))
    ok('шаг 3 открыт из черновика', pg.locator('section.wzs.on[data-step="3"]').count() == 1)
    ok('при загруженном видео переключатель есть', pg.locator('#vcsw').count() == 1)
    ok('по умолчанию выключен', not pg.evaluate("document.getElementById('vcsw').checked"))
    ok('есть пояснение', pg.evaluate("/Видео-открытк|обложк/i.test(document.querySelector('#vcsw').closest('label').parentElement.innerText)"))
    ok('нет горизонтальной прокрутки', pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    pg.evaluate("document.getElementById('vcsw').click()"); pg.wait_for_timeout(500)
    ok('включение попадает в черновик', json.loads(pg.evaluate("localStorage.getItem('taklif_draft_v1')"))['draft'].get('vc') is True)
    pk = pg.evaluate("(()=>{const o=window.__payload(window.__ST.draft);return {vc:o.vc,v:o.p&&o.p.v}})()")
    ok('в пакет попадает vc=1 вместе с видео', pk['vc'] == 1 and pk['v'] and pk['v'][0][0].endswith('vcov1.mp4'), pk)
    ctx.close()
    ctx, pg, errs = start(draft(VID, True))
    ok('после перезагрузки переключатель включён', pg.evaluate("document.getElementById('vcsw').checked"))
    pg.evaluate("document.getElementById('vcsw').click()"); pg.wait_for_timeout(300)
    pk = pg.evaluate("window.__payload(window.__ST.draft).vc")
    ok('выключение убирает vc из пакета', pk is None or pk == '' or pk is False, pk)
    ctx.close()
    # без видео: переключателя нет, флаг в пакет не попадает, даже если остался в черновике
    ctx, pg, errs = start(draft([], True))
    ok('без видео переключателя нет', pg.locator('#vcsw').count() == 0)
    ok('без видео vc не уходит в пакет', pg.evaluate("window.__payload(window.__ST.draft).vc") in (None, '', False))
    ctx.close()
    # видео ещё не загружено на сервер (локальное, без url): флаг не уходит
    ctx, pg, errs = start(draft([{'o': 'l', 'nm': 'local.mp4', 'url': ''}], True))
    ok('локальное видео без url: vc не уходит в пакет', pg.evaluate("window.__payload(window.__ST.draft).vc") in (None, '', False))
    ctx.close()
    # узбекский интерфейс
    ctx, pg, errs = start(draft(VID), 'uz')
    ok('узбекский: пояснение на узбекском', pg.evaluate("/Video-otkritka|muqova/i.test(document.body.innerText)"))
    ctx.close(); b.close()
print('ИТОГО %d ok, %d fail' % (sum(res), len(res) - sum(res)))
