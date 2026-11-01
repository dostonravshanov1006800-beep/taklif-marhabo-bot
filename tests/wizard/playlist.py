# П.6 Плейлист: автопереход, кнопка «следующий», название, один трек как раньше, неверные ссылки.
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _fixtures import temp_invites
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8834/taklif-marhabo-bot'; res = []
def ok(n, c, e=''): print(('PASS' if c else 'FAIL'), n, str(e)[:170]); res.append(bool(c))
def route(ctx):
    ctx.route('**/telegram.org/**', lambda r, *a: r.fulfill(status=200, content_type='application/javascript', body=''))
    ctx.route('**/fonts.googleapis.com/**', lambda r, *a: r.fulfill(status=200, content_type='text/css', body=''))
    ctx.route('**/*workers.dev/**', lambda r, *a: r.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body='{}'))
def open_inv(b, slug, w=390, **kw):
    ctx = b.new_context(viewport={'width': w, 'height': 800}, service_workers='block', **kw); route(ctx); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:90])); pg.goto(BASE + f'/i.html?s={slug}'); pg.wait_for_selector('#seal', timeout=15000); pg.wait_for_timeout(700)
    pg.click('#seal'); pg.wait_for_timeout(1800); return ctx, pg, errs
CUR = "decodeURIComponent(document.getElementById('au').src.split('/').pop())"
with temp_invites(playlist=True), sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx, pg, errs = open_inv(b, 'tt-pl')
    ok('кнопка «следующий» есть, ≥44px и подписана', pg.evaluate("(()=>{const e=document.getElementById('mnx');if(!e)return false;const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&!!e.getAttribute('aria-label')})()"))
    ok('счётчик «1 / 3» без названия у основного', pg.evaluate("document.getElementById('mtn').textContent") == '1 / 3')
    ok('сначала играет основной трек', pg.evaluate(CUR) == 'trk1x.mp3')
    ok('зацикливание самого трека выключено', pg.evaluate("document.getElementById('au').loop") is False)
    pg.click('#mnx'); pg.wait_for_timeout(500)
    ok('«следующий» переключает на 2-й трек с названием', pg.evaluate(CUR) == 'trk2x.mp3' and pg.evaluate("document.getElementById('mtn').textContent") == '2 / 3 · Вальс')
    pg.click('#mnx'); pg.wait_for_timeout(300)
    ok('3-й трек', pg.evaluate(CUR) == 'trk3x.mp3' and 'Финал' in pg.evaluate("document.getElementById('mtn').textContent"))
    pg.click('#mnx'); pg.wait_for_timeout(300)
    ok('после последнего снова первый (по кругу)', pg.evaluate(CUR) == 'trk1x.mp3')
    # автопереход по окончании трека
    pg.wait_for_timeout(600)
    if pg.evaluate("document.getElementById('au').paused"): pg.click('#mb'); pg.wait_for_timeout(600)
    ok('музыка запущена', not pg.evaluate("document.getElementById('au').paused"))
    pg.evaluate("document.getElementById('au').currentTime=Math.max(0,document.getElementById('au').duration-0.6)"); pg.wait_for_timeout(3500)
    ok('по окончании трека сам идёт следующий и играет', pg.evaluate(CUR) == 'trk2x.mp3' and not pg.evaluate("document.getElementById('au').paused"), pg.evaluate(CUR))
    ok('нет JS-ошибок', not errs, errs); ctx.close()
    # один трек: как раньше
    ctx, pg, errs = open_inv(b, 'tt-pn')
    ok('без плейлиста нет кнопки «следующий» и счётчика', pg.evaluate("!document.getElementById('mnx')&&!document.getElementById('mtn')"))
    ok('без плейлиста трек один', pg.evaluate(CUR) == 'trk1x.mp3')
    pg.wait_for_timeout(600)
    if pg.evaluate("document.getElementById('au').paused"): pg.click('#mb'); pg.wait_for_timeout(600)
    ok('одиночный трек играет, пауза работает', not pg.evaluate("document.getElementById('au').paused"))
    pg.click('#mb'); pg.wait_for_timeout(2000)
    ok('пауза остановила', pg.evaluate("document.getElementById('au').paused"))
    ok('нет JS-ошибок (один трек)', not errs, errs); ctx.close()
    # плохая ссылка в плейлисте отбрасывается страницей (абс. хост не из нашего хранилища)
    ctx, pg, errs = open_inv(b, 'tt-pb')
    n = pg.evaluate("(document.getElementById('mtn')||{}).textContent||''")
    ok('чужой http-адрес не ломает плеер', not errs, errs)
    ctx.close()
    # 320 px и узбекский
    ctx = b.new_context(viewport={'width': 320, 'height': 700}, service_workers='block'); route(ctx); pg = ctx.new_page()
    pg.add_init_script("localStorage.setItem('tk_gl','uz')"); pg.goto(BASE + '/i.html?s=tt-pl'); pg.wait_for_selector('#seal'); pg.wait_for_timeout(700); pg.click('#seal'); pg.wait_for_timeout(1500)
    ok('320 px, узбекский: подпись кнопки на узбекском, без горизонтальной прокрутки', pg.evaluate("document.getElementById('mnx').getAttribute('aria-label')") == 'Keyingi trek' and pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    ctx.close(); b.close()
print('ИТОГО %d ok, %d fail' % (sum(res), len(res) - sum(res)))
