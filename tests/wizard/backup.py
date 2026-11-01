# П.23: копия приглашения и резерв (сохранить в файл / восстановить), без серверов.
import json, os, tempfile
from playwright.sync_api import sync_playwright
BASE='http://localhost:8834/taklif-marhabo-bot'; res=[]
def ok(n,c,e=''): print(('PASS' if c else 'FAIL'),n,str(e)[:170]); res.append(bool(c))
ITEM={'id':'abc123','t':'wedding','l':'ru','a':'Азиз','b':'Дилноза','d':'2027-06-12','h':'18:00','pl':'Зал','ad':'ул. 1','th':'gold','pr':[['','']]}
with sync_playwright() as p:
    b=p.chromium.launch()
    for w,lang in ((390,'ru'),(320,'uz')):
        ctx=b.new_context(viewport={'width':w,'height':780},service_workers='block',accept_downloads=True); pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)[:120]))
        ctx.route('**/telegram.org/**',lambda r,*a:r.fulfill(status=200,content_type='application/javascript',body=''))
        ctx.route('**/fonts.googleapis.com/**',lambda r,*a:r.fulfill(status=200,content_type='text/css',body=''))
        ctx.route('**/*workers.dev/**',lambda r,*a:r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*'},body='{}'))
        pg.add_init_script("localStorage.setItem('lg','%s');if(!localStorage.getItem('taklif_v3'))localStorage.setItem('taklif_v3',%s)"%(lang,json.dumps(json.dumps([ITEM]))))
        pg.goto(BASE+'/index.html'); pg.wait_for_selector('[data-new]',timeout=15000)
        n=f'{w}/{lang}: '; lk='taklif_v3'
        pg.wait_for_timeout(500)
        pg.locator('#bg').click(); pg.wait_for_timeout(500); pg.locator('[data-mgo="mine"]').click(); pg.wait_for_selector('.ic',timeout=8000); pg.wait_for_timeout(400)
        ok(n+'в карточке есть кнопка «Копия»',pg.locator('[data-dup]').count()==1)
        ok(n+'блок резерва виден, кнопки >=44px',pg.locator('#bkSave').count()==1 and pg.evaluate("document.getElementById('bkSave').getBoundingClientRect().height>=44 && document.querySelector('.bkl').getBoundingClientRect().height>=44"))
        ok(n+'нет горизонтальной прокрутки',pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        # сохранить
        with pg.expect_download() as dl: pg.locator('#bkSave').click()
        path=tempfile.mktemp(suffix='.json'); dl.value.save_as(path); j=json.load(open(path,encoding='utf8'))
        ok(n+'файл резерва: app=taklif, приглашения с именами',j.get('app')=='taklif' and len(j['items'])>=1 and j['items'][0]['a']=='Азиз',j.get('app'))
        ok(n+'сообщение об успехе',pg.locator('#bkMsg').inner_text().strip()!='')
        # восстановление: дубль пропускается, новый добавляется, мусор отвергается
        new={k:v for k,v in dict(ITEM,id='zzz999',a='Тест',b='Тест2').items() if k!='pr'}; bad={'a':'','id':1}
        f1=tempfile.mktemp(suffix='.json'); json.dump({'app':'taklif','v':1,'items':[ITEM,new,bad]},open(f1,'w',encoding='utf8'))
        pg.set_input_files('#bkLoad',f1); pg.wait_for_timeout(300)
        ok(n+'восстановление: 1 добавлено, 2 пропущено (дубль и мусор)',('1' in pg.locator('#bkMsg').inner_text() and '2' in pg.locator('#bkMsg').inner_text()),pg.locator('#bkMsg').inner_text())
        pg.wait_for_timeout(1200)
        cnt=pg.evaluate("([k])=>JSON.parse(localStorage.getItem(k)||'[]').length",[lk]); ok(n+'в хранилище стало 2 приглашения (без дублей)',cnt==2,cnt)
        f2=tempfile.mktemp(suffix='.json'); open(f2,'w').write('{"hello":1}')
        if pg.locator('#bkLoad').count()==0:
            pg.locator('[data-go="mine"]').first.click() if pg.locator('[data-go="mine"]').count() else None; pg.wait_for_timeout(400)
        pg.set_input_files('#bkLoad',f2); pg.wait_for_timeout(300); ok(n+'чужой файл отвергается с сообщением',pg.locator('#bkMsg').inner_text().strip()!='' and pg.evaluate("([k])=>JSON.parse(localStorage.getItem(k)||'[]').length",[lk])==2)
        f3=tempfile.mktemp(suffix='.json'); open(f3,'w').write('это не json {{{')
        pg.set_input_files('#bkLoad',f3); pg.wait_for_timeout(300); ok(n+'битый файл не ломает приложение',pg.locator('#bkMsg').inner_text().strip()!='' and not errs,errs)
        # копия
        pg.reload(); pg.wait_for_selector('[data-new]',timeout=15000); pg.locator('#bg').click(); pg.wait_for_timeout(500); pg.locator('[data-mgo="mine"]').click(); pg.wait_for_selector('.ic',timeout=8000)
        pg.locator('[data-dup]').first.click(); pg.wait_for_timeout(600)
        ok(n+'«Копия» открывает мастер с теми же именами и пустой датой',pg.evaluate("(document.querySelector('[data-f=a]')||{}).value")in('Азиз','Тест') and pg.evaluate("(document.querySelector('[data-f=d]')||{}).value")=='' ,pg.evaluate("[(document.querySelector('[data-f=a]')||{}).value,(document.querySelector('[data-f=d]')||{}).value]"))
        ok(n+'нет ошибок JS',not errs,errs); ctx.close()
    b.close()
print('ИТОГО:',sum(res),'ok,',len(res)-sum(res),'fail')
