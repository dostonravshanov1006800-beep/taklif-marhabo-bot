# П.5 Галерея 2.0: раскладки (сетка/мозаика/лента), подписи, слайд-шоу в просмотрщике.
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _fixtures import temp_invites
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8834/taklif-marhabo-bot'; res = []
def ok(n, c, e=''): print(('PASS' if c else 'FAIL'), n, str(e)[:170]); res.append(bool(c))
def route(ctx):
    ctx.route('**/telegram.org/**', lambda r, *a: r.fulfill(status=200, content_type='application/javascript', body=''))
    ctx.route('**/fonts.googleapis.com/**', lambda r, *a: r.fulfill(status=200, content_type='text/css', body=''))
    ctx.route('**/images.unsplash.com/**', lambda r, *a: r.fulfill(status=200, content_type='image/gif', body=bytes.fromhex('47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b')))
    ctx.route('**/*workers.dev/**', lambda r, *a: r.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body='{}'))
def open_inv(b, slug, w=390, **kw):
    ctx = b.new_context(viewport={'width': w, 'height': 800}, service_workers='block', **kw); route(ctx); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:90])); pg.goto(BASE + f'/i.html?s={slug}'); pg.wait_for_selector('#seal', timeout=15000); pg.wait_for_timeout(700)
    pg.click('#seal'); pg.wait_for_timeout(1600); pg.evaluate("document.querySelector('.gal')&&document.querySelector('.gal').scrollIntoView()"); pg.wait_for_timeout(500)
    return ctx, pg, errs
with temp_invites(gallery=True), sync_playwright() as p:
    b = p.chromium.launch()
    # --- сетка с подписями
    ctx, pg, errs = open_inv(b, 'tt-gg')
    ok('сетка: 5 фото', pg.locator('.gal button[data-i]').count() == 5)
    ok('сетка: подпись видна на фото 0 и 2, нет у пустой', pg.evaluate("[...document.querySelectorAll('.gal button')].map(b=>!!b.querySelector('.gcp')).join()") == 'true,false,true,true,true')
    ok('подпись у фото на месте (индексы не сдвинуты)', pg.evaluate("document.querySelector('.gal button[data-i=\"2\"] .gcp').textContent") == 'Мама и папа')
    ok('картинка с подписью декоративна (alt пуст), имя только у кнопки', pg.evaluate("[...document.querySelectorAll('.gal img')].every(i=>i.getAttribute('alt')==='')"))
    ok('у кнопки есть доступное имя из подписи', pg.evaluate("document.querySelector('.gal button[data-i=\"0\"]').getAttribute('aria-label')") == 'Наш первый танец')
    ok('сетка: нет горизонтальной прокрутки страницы', pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    pg.click('.gal button[data-i="2"]'); pg.wait_for_timeout(700)
    ok('просмотрщик открылся на нужном фото', pg.evaluate("document.querySelector('#lb .fxc').textContent.startsWith('3')"))
    ok('в просмотрщике показана подпись', pg.evaluate("document.querySelector('#lb .gcb')&&document.querySelector('#lb .gcb').textContent")== 'Мама и папа')
    ok('кнопка слайд-шоу ≥44px и подписана', pg.evaluate("(()=>{const b=document.getElementById('gsb');if(!b)return false;const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&!!b.getAttribute('aria-label')})()"))
    pg.evaluate("document.querySelector('#lb .fxa.r').click()"); pg.wait_for_timeout(500)
    ok('листание обновляет подпись', pg.evaluate("document.querySelector('#lb .gcb').textContent")== 'Лето')
    pg.evaluate("document.querySelector('#lb .fxa.l').click();document.querySelector('#lb .fxa.l').click()"); pg.wait_for_timeout(500)
    ok('у фото без подписи блок подписи скрыт', pg.evaluate("getComputedStyle(document.querySelector('#lb .gcb')).display")=='none')
    # слайд-шоу
    pg.click('#gsb'); pg.wait_for_timeout(300)
    ok('слайд-шоу включено (aria-pressed)', pg.evaluate("document.getElementById('gsb').getAttribute('aria-pressed')")=='true')
    f0 = pg.evaluate("document.querySelector('#lb .fxc').textContent"); pg.wait_for_timeout(4600)
    f1 = pg.evaluate("document.querySelector('#lb .fxc').textContent")
    ok('слайд-шоу само листает кадр', f0 != f1, (f0, f1))
    pg.click('#gsb'); pg.wait_for_timeout(200)
    ok('повторное нажатие останавливает', pg.evaluate("document.getElementById('gsb').getAttribute('aria-pressed')")=='false')
    f2 = pg.evaluate("document.querySelector('#lb .fxc').textContent"); pg.wait_for_timeout(4600)
    ok('после остановки кадр не меняется', pg.evaluate("document.querySelector('#lb .fxc').textContent")==f2)
    pg.click('#gsb'); pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    ok('закрытие просмотрщика останавливает показ', not pg.evaluate("document.getElementById('lb').classList.contains('on')"))
    pg.click('.gal button[data-i="0"]'); pg.wait_for_timeout(600)
    ok('после повторного открытия показ выключен', pg.evaluate("document.getElementById('gsb').getAttribute('aria-pressed')")=='false')
    ok('нет JS-ошибок (сетка)', not errs, errs); ctx.close()
    # --- мозаика
    ctx, pg, errs = open_inv(b, 'tt-gm')
    ok('мозаика: включена колонками', pg.evaluate("getComputedStyle(document.querySelector('.gal.gr-m')).columnCount")=='2')
    ok('мозаика: 5 фото, нет прокрутки страницы', pg.locator('.gal.gr-m button').count()==5 and pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    ok('мозаика: фото разной высоты', pg.evaluate("new Set([...document.querySelectorAll('.gal.gr-m img')].map(i=>Math.round(i.getBoundingClientRect().height/10))).size")>=3)
    ok('мозаика: кнопки ≥44px', pg.evaluate("[...document.querySelectorAll('.gal.gr-m button')].every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44})"))
    pg.click('.gal.gr-m button[data-i="4"]'); pg.wait_for_timeout(600)
    ok('мозаика: просмотрщик открывается на нужном кадре', pg.evaluate("document.querySelector('#lb .fxc').textContent.startsWith('5')"))
    ok('нет JS-ошибок (мозаика)', not errs, errs); ctx.close()
    # --- лента
    ctx, pg, errs = open_inv(b, 'tt-gr')
    ok('лента: горизонтальная прокрутка внутри блока, не страницы', pg.evaluate("(()=>{const g=document.querySelector('.gal.gr-r');return g.scrollWidth>g.clientWidth+20&&document.documentElement.scrollWidth<=innerWidth+1})()"))
    ok('лента: включён снап', pg.evaluate("getComputedStyle(document.querySelector('.gal.gr-r')).scrollSnapType").startswith('x'))
    ok('лента: первый кадр виден целиком в окне', pg.evaluate("(()=>{const r=document.querySelector('.gal.gr-r button').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()"))
    ok('нет JS-ошибок (лента)', not errs, errs); ctx.close()
    # --- без подписей: старый вид, но без ошибок
    ctx, pg, errs = open_inv(b, 'tt-gn')
    ok('без подписей: нет плашек, остаётся штатное имя «Фото N из M»', pg.evaluate("!document.querySelector('.gcp')&&[...document.querySelectorAll('.gal button')].every(b=>/Фото \\d из 5/.test(b.getAttribute('aria-label')||''))"))
    pg.click('.gal button[data-i="1"]'); pg.wait_for_timeout(600)
    ok('без подписей: блок подписи в просмотрщике скрыт', pg.evaluate("getComputedStyle(document.querySelector('#lb .gcb')).display")=='none')
    ok('нет JS-ошибок (без подписей)', not errs, errs); ctx.close()
    # --- меньше движения: слайд-шоу не предлагается
    ctx, pg, errs = open_inv(b, 'tt-gg', reduced_motion='reduce'); pg.click('.gal button[data-i="0"]'); pg.wait_for_timeout(600)
    ok('«меньше движения»: кнопки слайд-шоу нет, подпись есть', pg.evaluate("!document.getElementById('gsb')&&!!document.querySelector('#lb .gcb')")); ctx.close()
    # --- узкий экран 320, узбекский
    ctx = b.new_context(viewport={'width': 320, 'height': 700}, service_workers='block'); route(ctx); pg = ctx.new_page()
    pg.add_init_script("localStorage.setItem('tk_gl','uz')"); pg.goto(BASE + '/i.html?s=tt-gg'); pg.wait_for_selector('#seal'); pg.wait_for_timeout(700); pg.click('#seal'); pg.wait_for_timeout(1500)
    pg.evaluate("document.querySelector('.gal').scrollIntoView()"); pg.wait_for_timeout(300); pg.click('.gal button[data-i="0"]'); pg.wait_for_timeout(600)
    ok('320 px, узбекский: слайд-шоу на узбекском, страница не шире экрана', 'Slayd' in pg.evaluate("document.getElementById('gsb').getAttribute('aria-label')") and pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    ctx.close(); b.close()
print('ИТОГО %d ok, %d fail' % (sum(res), len(res) - sum(res)))
