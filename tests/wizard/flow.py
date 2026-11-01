import json
from playwright.sync_api import sync_playwright
BASE='http://localhost:8834/taklif-marhabo-bot'; res=[]
def ok(n,c,e=''): print(('PASS' if c else 'FAIL'),n,str(e)[:170]); res.append(bool(c))
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':360,'height':780},service_workers='block'); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:120]))
    ctx.route('**/telegram.org/**',lambda r,*a:r.fulfill(status=200,content_type='application/javascript',body=''))
    ctx.route('**/fonts.googleapis.com/**',lambda r,*a:r.fulfill(status=200,content_type='text/css',body=''))
    ctx.route('**/*workers.dev/**',lambda r,*a:r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*'},body='{}'))
    pg.add_init_script("localStorage.setItem('lg','ru')")
    pg.goto(BASE+'/index.html'); pg.wait_for_timeout(1200)
    pg.locator('[data-new]').first.click(); pg.wait_for_timeout(600)
    step=lambda:pg.locator('section.wzs.on').get_attribute('data-step')
    pg.locator('#wzn').click(); pg.wait_for_timeout(300); ok('1→2',step()=='2')
    pg.locator('#wzn').click(); pg.wait_for_timeout(300)
    ok('со 2 шага без данных НЕ пускает (остался на 2) и показано сообщение',step()=='2' and 'имя и дату' in pg.locator('#er').inner_text(),(step(),pg.locator('#er').inner_text()))
    ok('точкой с шага 2 на шаг 5 без данных тоже не пускает',(pg.locator('[data-wzg="5"]').click(),pg.wait_for_timeout(300),step())[2]=='2')
    pg.fill('[data-f="a"]','Азиз'); pg.fill('[data-f="b"]','Дилноза'); pg.fill('[data-f="d"]','2027-06-12'); pg.fill('[data-f="pl"]','Ресторан Лола')
    for _ in range(3): pg.locator('#wzn').click(); pg.wait_for_timeout(250)
    ok('дошли до шага 5',step()=='5')
    pg.locator('#sv').click(); pg.wait_for_timeout(1800)
    saved=json.loads(pg.evaluate("localStorage.getItem('taklif_v3')") or '[]')
    ok('приглашение сохранено с именами, датой и местом',len(saved)==1 and saved[0]['a']=='Азиз' and saved[0]['b']=='Дилноза' and saved[0]['d']=='2027-06-12' and saved[0]['pl']=='Ресторан Лола',saved[0] if saved else None)
    ok('после сохранения экран «готово» (форма закрыта)',pg.locator('section.wzs').count()==0)
    # правка: новая форма снова с шага 1
    pg.click('#bg'); pg.wait_for_timeout(400); pg.locator('[data-mgo="mine"]').first.click(); pg.wait_for_timeout(500)
    pg.locator('[data-edit]').first.click(); pg.wait_for_timeout(600)
    ok('правка открывается с шага 1 и с заполненным именем',step()=='1' and pg.evaluate("document.querySelector('[data-f=a]').value")=='Азиз',step())
    pg.locator('#wzn').click(); pg.wait_for_timeout(300); pg.fill('[data-f="pl"]','Чайхана'); 
    pg.locator('[data-wzg="5"]').click(); pg.wait_for_timeout(300); ok('при правке с готовыми данными можно сразу на шаг 5',step()=='5')
    pg.locator('#sv').click(); pg.wait_for_timeout(1500)
    saved=json.loads(pg.evaluate("localStorage.getItem('taklif_v3')"))
    ok('правка сохранилась (место Чайхана), копии не появилось',len(saved)==1 and saved[0]['pl']=='Чайхана',[x['pl'] for x in saved])
    # новая форма после сохранения начинается с шага 1
    pg.click('#bg'); pg.wait_for_timeout(400); pg.locator('[data-mnew]').first.click(); pg.wait_for_timeout(700)
    ok('новая форма после сохранения снова с шага 1 и пустым именем',step()=='1' and pg.evaluate("document.querySelector('[data-f=a]').value")=='',step())
    ok('нет ошибок JS',not errs,errs)
    b.close()
print('ИТОГО %d ok, %d fail'%(sum(res),len(res)-sum(res)))
