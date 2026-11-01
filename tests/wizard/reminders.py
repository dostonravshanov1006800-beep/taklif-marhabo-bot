import json,datetime
from playwright.sync_api import sync_playwright
BASE='http://localhost:8834/taklif-marhabo-bot'; res=[]
def ok(n,c,e=''): print(('PASS' if c else 'FAIL'),n,str(e)[:170]); res.append(bool(c))
def mk(days):
    d=(datetime.date.today()+datetime.timedelta(days=days)).isoformat() if days is not None else ''
    return {'id':'it1','t':'wedding','l':'ru','a':'Азиз','b':'Дилноза','d':d,'h':'18:00','guests':[{'n':'Али','k':'k1'},{'n':'Мадина','k':'k2'},{'n':'Рустам','k':'k3'},{'n':'Севара','k':'k4'}],'gl':[],'pv':{}}
LOG={'it1:k1':{'s':'y','t':'2026-10-30T10:00:00Z','o':'2026-10-30T09:00:00Z'},'it1:k3':{'s':'n','t':'2026-10-30T11:00:00Z','o':'2026-10-30T09:30:00Z'},'it1:k4':{'o':'2026-10-31T09:00:00Z'}}
STUB="window.Telegram={WebApp:{initDataUnsafe:{user:{id:555,first_name:'Хозяин'}},initData:'x',isVersionAtLeast:()=>false,ready(){},expand(){},openTelegramLink(u){(window.__tl=window.__tl||[]).push(u)}}};window.open=(u)=>{(window.__op=window.__op||[]).push(u);return null};localStorage.setItem('lg','ru');"
def run(b,days,label,checks):
    ctx=b.new_context(viewport={'width':360,'height':800},service_workers='block'); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:100]))
    ctx.route('**/telegram.org/**',lambda r,*a:r.fulfill(status=200,content_type='application/javascript',body=''))
    ctx.route('**/fonts.googleapis.com/**',lambda r,*a:r.fulfill(status=200,content_type='text/css',body=''))
    ctx.route('**/data/555.json*',lambda r,*a:r.fulfill(status=200,content_type='application/json',body=json.dumps(LOG)))
    ctx.route('**/*workers.dev/**',lambda r,*a:r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*'},body='{}'))
    pg.add_init_script(STUB+"if(!localStorage.getItem('taklif_v3'))localStorage.setItem('taklif_v3',%s);"%json.dumps(json.dumps([mk(days)])))
    pg.goto(BASE+'/index.html'); pg.wait_for_timeout(1500)
    pg.click('#bg'); pg.wait_for_timeout(400); pg.locator('[data-mgo="mine"]').first.click(); pg.wait_for_timeout(600)
    pg.locator('[data-view="it1"]').first.click(); pg.wait_for_timeout(700)
    checks(pg,errs); ctx.close()
with sync_playwright() as p:
    b=p.chromium.launch()
    def c1(pg,errs):
        pg.locator('[data-sd="rem"]').click(); pg.wait_for_timeout(400)
        nm=lambda:pg.locator('.sdc .nm').inner_text()
        ok('напоминания: первый адресат Мадина (Али «придёт» и Рустам «не придёт» исключены)',nm()=='Мадина',nm())
        ok('напоминания: в очереди 2 из 4','2 из 4' in pg.locator('.hint').filter(has_text='очереди').inner_text())
        tx=pg.locator('.sdc .tx').inner_text(); ok('напоминание: текст «напоминаем» и «осталось 13 дней»','напоминаем' in tx and 'осталось 13' in tx,tx)
        pg.locator('[data-sdsk]').click(); pg.wait_for_timeout(300)
        ok('«Пропустить» переносит гостя в конец (теперь Севара), но не помечает отправленным',nm()=='Севара' and 'rem:k2' not in (pg.evaluate("localStorage.getItem('tk_sent_it1')") or ''),(nm(),pg.evaluate("localStorage.getItem('tk_sent_it1')")))
        pg.locator('[data-sdmk]').click(); pg.wait_for_timeout(300)
        ok('после Севары вернулась пропущенная Мадина',nm()=='Мадина',nm())
        pg.locator('[data-sdgo]').click(); pg.wait_for_timeout(300)
        ok('все неответившие получили напоминание: честное сообщение «уже отправлены», а не «все ответили»',('уже отправлены' in pg.locator('.empty').inner_text()),pg.locator('.empty').inner_text())
        ok('приглашения и напоминания не мешают друг другу (rem: отдельно от inv:)', all(k.startswith('rem:') for k in json.loads(pg.evaluate("localStorage.getItem('tk_sent_it1')")).keys()))
        pg.go_back() if False else None
        ok('нет ошибок JS',not errs,errs)
    run(b,13,'будущее',c1)
    def c2(pg,errs):
        pg.locator('[data-sd="rem"]').click(); pg.wait_for_timeout(400)
        ok('событие прошло: напоминаний нет, понятное сообщение','уже прошло' in pg.locator('.empty').inner_text(),pg.locator('.empty').inner_text())
        pg.locator('[data-go="panel"]').click(); pg.wait_for_timeout(300); pg.locator('[data-sd="inv"]').click(); pg.wait_for_timeout(300)
        ok('приглашения после события всё равно можно разослать (4 в очереди)','4 из 4' in pg.locator('.hint').filter(has_text='очереди').inner_text())
        ok('нет ошибок JS',not errs,errs)
    run(b,-3,'прошло',c2)
    def c3(pg,errs):
        pg.locator('[data-sd="rem"]').click(); pg.wait_for_timeout(400)
        ok('даты нет: просит указать дату события','дату события' in pg.locator('.empty').inner_text(),pg.locator('.empty').inner_text())
    run(b,None,'без даты',c3)
    def c4(pg,errs):
        pg.locator('[data-sd="rem"]').click(); pg.wait_for_timeout(400)
        ok('событие сегодня: «это уже сегодня»','сегодня' in pg.locator('.sdc .tx').inner_text(),pg.locator('.sdc .tx').inner_text())
    run(b,0,'сегодня',c4)
    b.close()
print('ИТОГО %d ok, %d fail'%(sum(res),len(res)-sum(res)))
