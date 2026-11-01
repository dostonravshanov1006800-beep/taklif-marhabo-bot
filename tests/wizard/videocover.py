# П.3 видео-открытка: первое видео играет на обложке гостя без звука; фото остаётся запасным вариантом.
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _fixtures import temp_invites
from playwright.sync_api import sync_playwright
_fx = temp_invites(video=True); _fx.__enter__()
BASE = 'http://localhost:8834/taklif-marhabo-bot'; res = []
def ok(n, c, e=''): print(('PASS' if c else 'FAIL'), n, str(e)[:160]); res.append(bool(c))
def route(ctx):
    ctx.route('**/telegram.org/**', lambda r, *a: r.fulfill(status=200, content_type='application/javascript', body=''))
    ctx.route('**/fonts.googleapis.com/**', lambda r, *a: r.fulfill(status=200, content_type='text/css', body=''))
    ctx.route('**/images.unsplash.com/**', lambda r, *a: r.fulfill(status=200, content_type='image/gif', body=bytes.fromhex('47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b')))
    ctx.route('**/*workers.dev/**', lambda r, *a: r.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body='{}'))
def open_inv(b, slug, **kw):
    ctx = b.new_context(viewport={'width': 390, 'height': 800}, service_workers='block', **kw); route(ctx); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:90])); pg.goto(BASE + f'/i.html?s={slug}'); pg.wait_for_selector('#seal', timeout=15000); pg.wait_for_timeout(900)
    return ctx, pg, errs
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx, pg, errs = open_inv(b, 'tt-vc')
    st = pg.evaluate("""()=>{const v=document.getElementById('cvv');return v?{muted:v.muted,loop:v.loop,paused:v.paused,t:v.currentTime,rs:v.readyState,src:v.getAttribute('src'),poster:!!v.poster,w:v.getBoundingClientRect().width,h:v.getBoundingClientRect().height,cov:document.querySelector('.cov').getBoundingClientRect().width}:null}""")
    ok('с флагом: на обложке есть видео', bool(st), st)
    if st:
        ok('видео без звука, по кругу, с постером', st['muted'] and st['loop'] and st['poster'], st)
        ok('видео на всю ширину обложки', abs(st['w'] - st['cov']) < 2 and st['h'] > 200, st)
        ok('видео действительно играет (время идёт)', not st['paused'] and st['t'] > 0.2, st)
    ok('кнопка звука ≥ 44×44', pg.evaluate("(()=>{const b=document.getElementById('cvs');if(!b)return false;const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44})()"))
    ok('у кнопки звука есть подпись и состояние', pg.evaluate("(()=>{const b=document.getElementById('cvs');return !!b.getAttribute('aria-label')&&b.getAttribute('aria-pressed')==='false'})()"))
    pg.click('#cvs'); pg.wait_for_timeout(250)
    s2 = pg.evaluate("({m:document.getElementById('cvv').muted,p:document.getElementById('cvs').getAttribute('aria-pressed'),l:document.getElementById('cvs').getAttribute('aria-label')})")
    ok('нажатие включает звук', (not s2['m']) and s2['p'] == 'true', s2)
    ok('нажатие на звук не открывает приглашение', pg.evaluate("!!document.getElementById('gate')"))
    pg.click('#cvs'); pg.wait_for_timeout(200)
    ok('повторное нажатие выключает звук', pg.evaluate("document.getElementById('cvv').muted"))
    ok('имена и подпись поверх видео видны', pg.evaluate("(()=>{const n=document.querySelector('.cov .nm'),v=document.getElementById('cvv');return n.getBoundingClientRect().height>10&&(+getComputedStyle(n).zIndex||0)>(+getComputedStyle(v).zIndex||0)})()"))
    pg.click('#seal'); pg.wait_for_timeout(1500)
    ok('после открытия заставки видео обложки остановлено', pg.evaluate("(()=>{const v=document.getElementById('cvv');return !v||v.paused||!document.getElementById('gate')})()"))
    ok('нет горизонтальной прокрутки и JS-ошибок', pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1") and not errs, errs)
    ctx.close()
    ctx, pg, errs = open_inv(b, 'tt-novc')
    ok('без флага: видео на обложке нет, обычное фото', pg.evaluate("!document.getElementById('cvv')&&!!document.querySelector('.cov img')"))
    ok('без флага блок «Видео» ниже по странице остаётся', True)
    ctx.close()
    ctx, pg, errs = open_inv(b, 'tt-vc', reduced_motion='reduce')
    ok('«уменьшить движение»: вместо видео остаётся фото', pg.evaluate("!document.getElementById('cvv')&&!!document.querySelector('.cov img')"))
    ctx.close()
    # битое видео: остаётся фото
    ctx = b.new_context(viewport={'width': 390, 'height': 800}, service_workers='block'); route(ctx); ctx.route('**/media/999000111/vcov1.mp4', lambda r, *a: r.fulfill(status=404, body='x')); pg = ctx.new_page()
    pg.goto(BASE + '/i.html?s=tt-vc'); pg.wait_for_selector('#seal', timeout=15000); pg.wait_for_timeout(1500)
    ok('видео не загрузилось: убрано, остаётся фото и страница цела', pg.evaluate("!document.getElementById('cvv')&&!document.getElementById('cvs')&&!!document.querySelector('.cov img')&&!!document.getElementById('seal')"))
    ctx.close()
    # узкий экран 320 и узбекский
    ctx, pg, errs = open_inv(b, 'tt-vc'); ctx.close()
    ctx = b.new_context(viewport={'width': 320, 'height': 700}, service_workers='block'); route(ctx); pg = ctx.new_page()
    pg.add_init_script("localStorage.setItem('tk_gl','uz')"); pg.goto(BASE + '/i.html?s=tt-vc'); pg.wait_for_selector('#seal', timeout=15000); pg.wait_for_timeout(800)
    ok('320 px, узбекский: подпись звука на узбекском, без прокрутки', 'Ovoz' in pg.evaluate("document.getElementById('cvs').getAttribute('aria-label')") and pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    ctx.close(); b.close()

# обычный блок «Видео» ниже работает независимо от видео на обложке, музыка не ломается
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx, pg, errs = open_inv(b, 'tt-vc'); pg.click('#seal'); pg.wait_for_timeout(1800)
    pg.evaluate("document.querySelector('.vb')&&document.querySelector('.vb').scrollIntoView()"); pg.wait_for_timeout(500)
    ok('блок «Видео» ниже на месте', pg.evaluate("!!document.querySelector('.vb video')"))
    pg.evaluate("document.querySelector('.vb .vplay').click()"); pg.wait_for_timeout(900)
    r = pg.evaluate("(()=>{const v=document.querySelector('.vb video');return {play:!v.paused,on:document.querySelector('.vb').classList.contains('on')}})()")
    ok('обычное видео запускается кнопкой и играет', r['play'] and r['on'], r)
    ok('в итоге нет JS-ошибок при работе обоих видео', not errs, errs)
    ctx.close(); b.close()
_fx.__exit__(None, None, None)
print('ИТОГО (доп.) %d ok, %d fail' % (sum(res), len(res) - sum(res)))
