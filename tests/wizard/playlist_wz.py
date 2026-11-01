# П.6 в мастере: плейлист из загруженных треков, названия, удаление, лимит 4, пакет, черновик.
import json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8834/taklif-marhabo-bot'; SITE = BASE + '/'; res = []
OWN = '999000111'
def ok(n, c, e=''): print(('PASS' if c else 'FAIL'), n, str(e)[:170]); res.append(bool(c))
LIB = [{'f': 'trk%dx.mp3' % k, 'k': 'audio', 'kb': 100 + k, 't': '2026-11-0%dT10:00:00Z' % k} for k in range(1, 7)]
def route(ctx):
    ctx.route('**/telegram.org/**', lambda r, *a: r.fulfill(status=200, content_type='application/javascript', body='window.Telegram={WebApp:{initDataUnsafe:{user:{id:%s,first_name:"T"}},initData:"x",ready(){},expand(){},close(){},colorScheme:"light",themeParams:{},MainButton:{},BackButton:{show(){},hide(){},onClick(){}},HapticFeedback:{impactOccurred(){},notificationOccurred(){}},onEvent(){},offEvent(){},version:"7.0",platform:"web",viewportHeight:700,isExpanded:true}}' % OWN))
    ctx.route('**/fonts.googleapis.com/**', lambda r, *a: r.fulfill(status=200, content_type='text/css', body=''))
    ctx.route('**/*workers.dev/**', lambda r, *a: r.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body='{}'))
    ctx.route('**/media/%s/index.json*' % OWN, lambda r, *a: r.fulfill(status=200, content_type='application/json', body=json.dumps(LIB)))
def draft(u='', pl=None, lang='ru'):
    return json.dumps({'v': 'form', 'wz': 3, 't': 9999999999999, 'draft': {'id': 'dp1', 't': 'wedding', 'l': lang, 'th': '', 'w': False, 'cu': False, 'cv': '', 'tc': [], 'a': 'Doston', 'b': 'Diyora', 'd': '2027-03-14', 'h': '', 'pl': '', 'ad': '', 'm': '', 'x': '', 'dc': '', 'dp': [], 'st': [], 'ct': '', 'u': u, 'pl2': pl or [], 'pv': {}, 'c': '', 'o': '', 'g': '', 'gl': [], 'gv': '', 'vl': [], 'pr': [], 'tcs': [], 'guests': []}})
with sync_playwright() as p:
    b = p.chromium.launch()
    def start(dr, lang='ru', w=360):
        ctx = b.new_context(viewport={'width': w, 'height': 780}, service_workers='block'); route(ctx); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:90]))
        pg.add_init_script("localStorage.setItem('taklif_draft_v1', %s); localStorage.setItem('lg','%s')" % (json.dumps(dr), lang))
        pg.goto(BASE + '/index.html'); pg.wait_for_timeout(1500); return ctx, pg, errs
    P = "window.__payload(window.__ST.draft)"
    # без основного трека блока плейлиста нет
    ctx, pg, errs = start(draft()); ok('без основного трека плейлиста нет', pg.locator('[data-pla]').count() == 0 and pg.locator('[data-pln]').count() == 0); ctx.close()
    # с основным треком: предлагает остальные загруженные, кроме основного
    ctx, pg, errs = start(draft(SITE + 'media/%s/trk1x.mp3' % OWN))
    ok('библиотека загрузилась (6 треков)', pg.evaluate("window.__ST.lib.filter(x=>x.k==='audio').length") == 6, pg.evaluate("window.__ST.lib.length"))
    ok('предложено 5 других (основной не предлагается)', pg.locator('[data-pla]').count() == 5, pg.locator('[data-pla]').count())
    ok('кнопки «В плейлист» ≥44px', pg.evaluate("[...document.querySelectorAll('[data-pla]')].every(e=>e.getBoundingClientRect().height>=44)"))
    ok('без добавленных треков в пакете нет ul', 'ul' not in pg.evaluate(P)['p'] if pg.evaluate(P).get('p') else True)
    pg.click('[data-pla]'); pg.wait_for_timeout(500)
    ok('трек добавился: поле названия, добавленный не предлагается', pg.locator('[data-pln]').count() == 1 and pg.locator('[data-pla]').count() == 4)
    pg.fill('[data-pln="0"]', 'Вальс'); pg.wait_for_timeout(400)
    pk = pg.evaluate(P)['p']
    ok('пакет: ul один путь и название', len(pk['ul']) == 1 and pk['ul'][0].startswith('media/%s/trk' % OWN) and pk['un'] == ['Вальс'], pk)
    ok('черновик хранит плейлист', json.loads(pg.evaluate("localStorage.getItem('taklif_draft_v1')"))['draft']['pl2'][0]['n'] == 'Вальс')
    for _ in range(3): pg.click('[data-pla]'); pg.wait_for_timeout(300)
    ok('лимит 4 доп. трека, предложения исчезли', pg.locator('[data-pln]').count() == 4 and pg.locator('[data-pla]').count() == 0)
    ok('на 360 px без горизонтальной прокрутки, поля ≥44px', pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll('[data-pln],[data-plx]')].every(e=>e.getBoundingClientRect().height>=44)"))
    ok('в пакете 4 пути, без повторов и без основного', len(set(pg.evaluate(P)['p']['ul'])) == 4 and not any(x.endswith('trk1x.mp3') for x in pg.evaluate(P)['p']['ul']))
    pg.click('[data-plx="0"]'); pg.wait_for_timeout(400)
    pk = pg.evaluate(P)['p']
    ok('удаление первого: осталось 3, названия не сдвинулись (у остальных пусто)', len(pk['ul']) == 3 and 'un' not in pk, pk)
    ok('нет JS-ошибок', not errs, errs); ctx.close()
    # название длиннее 40 обрезается, пустые названия не уходят
    ctx, pg, errs = start(draft(SITE + 'media/%s/trk1x.mp3' % OWN, [{'url': SITE + 'media/%s/trk2x.mp3' % OWN, 'n': 'я' * 90}]))
    ok('длинное название обрезано до 40', len(pg.evaluate(P)['p']['un'][0]) == 40); ctx.close()
    # основной трек убрали: плейлиста в пакете нет
    ctx, pg, errs = start(draft(SITE + 'media/%s/trk1x.mp3' % OWN, [{'url': SITE + 'media/%s/trk2x.mp3' % OWN, 'n': 'A'}]))
    pg.click('[data-clr="u"]'); pg.wait_for_timeout(500)
    ok('убрали основной трек: плейлист очищен и не уходит', (pg.evaluate(P).get('p') or {}).get('ul') is None and pg.locator('[data-pln]').count() == 0); ctx.close()
    # узбекский
    ctx, pg, errs = start(draft(SITE + 'media/%s/trk1x.mp3' % OWN), lang='uz')
    ok('узбекский: заголовок и кнопка', 'Pleylist' in pg.content() and 'Pleylistga' in pg.content()); ctx.close()
    b.close()
print('ИТОГО %d ok, %d fail' % (sum(res), len(res) - sum(res)))
