import json,sys,time
from playwright.sync_api import sync_playwright
BASE='http://localhost:8834/taklif-marhabo-bot'; res=[]
def ok(n,c,e=''): print(('PASS' if c else 'FAIL'),n,str(e)[:170]); res.append(bool(c))
import datetime
d=(datetime.date.today()+datetime.timedelta(days=13)).isoformat()
G=[{'n':'Али','k':'k1'},{'n':'Мадина','k':'k2'},{'n':'Рустам','k':'k3'},{'n':'Севара','k':'k4'}]
IT={'id':'it1','t':'wedding','l':'ru','a':'Азиз','b':'Дилноза','d':d,'h':'18:00','th':'','guests':G,'gl':[],'pv':{},'tc':[],'dp':[],'st':[],'w':False,'cu':False,'cv':'','g':'','o':'','pl':'','ad':'','m':'','x':'','dc':'','ct':'','u':'','c':''}
with sync_playwright() as p:
    b=p.chromium.launch()
    for w in (320,390):
        ctx=b.new_context(viewport={'width':w,'height':844},service_workers='block'); pg=ctx.new_page(); errs=[]; opened=[]
        pg.on('pageerror',lambda e:errs.append(str(e)[:100]))
        ctx.route('**/telegram.org/**',lambda r,*a:r.fulfill(status=200,content_type='application/javascript',body=''))
        ctx.route('**/fonts.googleapis.com/**',lambda r,*a:r.fulfill(status=200,content_type='text/css',body=''))
        ctx.route('**/*workers.dev/**',lambda r,*a:r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*'},body='{}' ))
        pg.add_init_script("window.open=(u)=>{(window.__op=window.__op||[]).push(u);return null};if(!localStorage.getItem('taklif_v3'))localStorage.setItem('taklif_v3',%s);localStorage.setItem('lg','ru')"%json.dumps(json.dumps([IT])))
        pg.goto(BASE+'/index.html'); pg.wait_for_timeout(800)
        pg.wait_for_timeout(800)
        # открыть панель приглашения
        pg.click('#bg'); pg.wait_for_timeout(500)
        pg.locator('[data-mgo="mine"]').first.click(); pg.wait_for_timeout(700)
        btn=pg.locator('[data-view="it1"]').first
        if btn.count()==0: print('нет карточки; html:',pg.evaluate("document.getElementById('app').innerText.slice(0,200)"))
        btn.click(); pg.wait_for_timeout(600)
        ok(f'{w}px: на панели две кнопки «Разослать всем» и «Напомнить»',pg.locator('[data-sd="inv"]').count()==1 and pg.locator('[data-sd="rem"]').count()==1)
        pg.locator('[data-sd="inv"]').click(); pg.wait_for_timeout(400)
        ok(f'{w}px: очередь: 4 гостя, первый Али, есть персональный текст',pg.locator('.sdc .nm').inner_text()=='Али' and 'Али, приглашаем вас на свадьбу Азиз & Дилноза' in pg.locator('.sdc .tx').inner_text(),pg.locator('.sdc .tx').inner_text())
        ok(f'{w}px: счётчик «в очереди 4 из 4»','4 из 4' in pg.locator('.hint').filter(has_text='очереди').inner_text())
        pg.locator('[data-sdgo]').click(); pg.wait_for_timeout(400)
        op=pg.evaluate("window.__op||[]")
        ok(f'{w}px: открылась ссылка Telegram с текстом и личной ссылкой гостя',len(op)==1 and op[0].startswith('https://t.me/share/url?url=') and 'k1' in op[0] and '%D0%90%D0%BB%D0%B8' in op[0],op)
        ok(f'{w}px: после отправки очередь перешла к Мадине',pg.locator('.sdc .nm').inner_text()=='Мадина',pg.locator('.sdc .nm').inner_text())
        saved=pg.evaluate("localStorage.getItem('tk_sent_it1')"); ok(f'{w}px: «отправлено» запомнилось на устройстве и переживёт перезагрузку','inv:k1' in (saved or ''),saved)
        pg.reload(); pg.wait_for_timeout(1000)
        # переключение на WhatsApp
        pg.click('#bg'); pg.wait_for_timeout(500)
        pg.locator('[data-mgo="mine"]').first.click(); pg.wait_for_timeout(700)
        pg.locator('[data-view="it1"]').first.click(); pg.wait_for_timeout(400)
        pg.locator('[data-sd="inv"]').click(); pg.wait_for_timeout(300)
        ok(f'{w}px: после перезагрузки очередь продолжается с Мадины (Али не дублируется)',pg.locator('.sdc .nm').inner_text()=='Мадина')
        pg.locator('[data-sdc="wa"]').click(); pg.wait_for_timeout(300); pg.locator('[data-sdgo]').click(); pg.wait_for_timeout(300)
        op=pg.evaluate("window.__op||[]"); ok(f'{w}px: WhatsApp открывает wa.me с текстом',len(op)>=1 and op[-1].startswith('https://wa.me/?text='),op[-1:] )
        pg.locator('[data-sdsk]').click(); pg.wait_for_timeout(300)
        ok(f'{w}px: «Пропустить» уводит Рустама в конец, показывается Севара',pg.locator('.sdc .nm').inner_text()=='Севара',pg.locator('.sdc .nm').inner_text())
        ok(f'{w}px: пропущенный Рустам не помечен отправленным','inv:k3' not in pg.evaluate("localStorage.getItem('tk_sent_it1')"))
        pg.locator('[data-sdmk]').click(); pg.wait_for_timeout(300)
        ok(f'{w}px: пропущенный Рустам вернулся последним',pg.locator('.sdc .nm').inner_text()=='Рустам',pg.locator('.sdc .nm').inner_text())
        pg.locator('[data-sdmk]').click(); pg.wait_for_timeout(300)
        ok(f'{w}px: очередь закончилась, сообщение «все отправлено»','все отправлено' in pg.locator('.empty').inner_text(),pg.locator('.empty').inner_text())
        pg.locator('[data-sdall]').click(); pg.wait_for_timeout(300)
        ok(f'{w}px: «Заново» возвращает всех (4)',pg.locator('.sdc .nm').inner_text()=='Али')
        # напоминания: двое ответили
        pg.evaluate("window.__x=1"); 
        ok(f'{w}px: нет ошибок JS и горизонтальной прокрутки',not errs and pg.evaluate("document.documentElement.scrollWidth<=innerWidth"),errs)
        if w==390: pg.screenshot(path='/tmp/send_shot.png')
        ctx.close()
    b.close()
print('ИТОГО %d ok, %d fail'%(sum(res),len(res)-sum(res)))
