import json,re,base64,urllib.parse
from playwright.sync_api import sync_playwright
BASE="http://localhost:8834/taklif-marhabo-bot"; res=[]
def ok(n,c,e=''): print(('PASS' if c else 'FAIL'),n,str(e)[:170]); res.append(bool(c))
FAKE=open('/tmp/ownerflow.py',encoding='utf-8').read().split('FAKE="""')[1].split('"""')[0]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:90])); pg.on('dialog',lambda d:d.dismiss())
    pg.add_init_script(FAKE)
    pg.route('**/telegram.org/js/telegram-web-app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=''))
    pg.route('**/data/8396883978.json*',lambda r:r.fulfill(status=200,content_type='application/json',body='{}'))
    pg.route('**/media/8396883978/index.json*',lambda r:r.fulfill(status=200,content_type='application/json',body='[]'))
    PUB={};VER={}
    pg.route('**/inv/_8396883978.json*',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(PUB)))
    pg.route('**/inv/_8396883978.v.json*',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(VER)))
    pg.route('**/inv/*-*.json*',lambda r:r.fulfill(status=404,body='') if '/_' not in r.request.url else r.continue_())
    pg.goto(BASE+"/index.html"); pg.wait_for_selector('.hero'); pg.click('.tc[data-new=wedding]'); pg.wait_for_selector('#sv')
    pg.evaluate("window.__op=[];window.open=u=>{window.__op.push(u);return null}")
    pg.fill('[data-f=a]','Javohir'); pg.fill('[data-f=b]','Aziza'); pg.fill('[data-f=d]','2026-11-14')
    pg.click('#sv'); pg.wait_for_timeout(1800)
    iid=re.search(r'"id":"([a-z0-9]+)"',pg.evaluate("window.__cs.idx")).group(1)
    def sent():
        u=pg.evaluate("(window.__tgl||[]).slice(-1)[0]||''"); raw=urllib.parse.unquote(u.split('text=')[1]).replace('#taklif ','')
        return json.loads(base64.urlsafe_b64decode(raw+'='*(-len(raw)%4)).decode())
    d1=sent(); ok('в сообщении боту есть версия v', bool(d1.get('v')), d1.get('v'))
    # 1) пользователь НЕ нажал «Отправить»: бот ничего не получил -> в списке плашка
    pg.click('#bg'); pg.wait_for_timeout(600); pg.click('[data-mgo=mine]'); pg.wait_for_timeout(1200)
    ok('чат открыт, но бот не принял: в списке плашка «не у гостей»', pg.evaluate("!!document.querySelector('.pbl')"))
    ok('нет зелёного «Опубликовано» пока бот не подтвердил', not pg.evaluate("!!document.querySelector('.tag2.ok')"))
    # 2) бот принял версию v1
    PUB[iid]='javohir-aziza'; VER[iid]=d1['v']; pg.wait_for_timeout(4500)
    ok('бот принял версию: плашка исчезла, зелёный статус', pg.evaluate("!document.querySelector('.pbl')&&!!document.querySelector('.tag2.ok')"))
    # 3) добавили карту -> версия изменилась -> снова плашка
    pg.click('[data-edit]'); pg.wait_for_selector('#sv'); pg.evaluate("document.querySelector('[data-addtc]').click()"); pg.wait_for_timeout(300)
    pg.evaluate("(()=>{const i=document.querySelector('[data-tc][data-k=\"0\"]');i.value='4448844410037090';i.dispatchEvent(new Event('input',{bubbles:true}))})()")
    pg.click('#sv'); pg.wait_for_timeout(1800)
    d2=sent(); ok('новая версия отличается от старой', d2['v']!=d1['v'])
    ok('в отправленных данных есть карта', d2.get('tc') and d2['tc'][0][0]=='4448844410037090', d2.get('tc'))
    pg.click('#bg'); pg.wait_for_timeout(600); pg.click('[data-mgo=mine]'); pg.wait_for_timeout(1200)
    ok('после правки без подтверждения бота снова плашка «не у гостей»', pg.evaluate("!!document.querySelector('.pbl')"))
    ok('кнопка «Отправить боту» есть и крупная', pg.evaluate("(document.querySelector('[data-publ]')?.getBoundingClientRect().height||0)>=36"))
    pg.evaluate("window.__tgl=[]"); pg.click('[data-publ]'); pg.wait_for_timeout(500)
    ok('кнопка снова открывает бота с тем же содержимым', pg.evaluate("(window.__tgl||[]).length")==1 and sent()['v']==d2['v'])
    VER[iid]=d2['v']; pg.wait_for_timeout(4500)
    ok('после подтверждения ботом плашка исчезает', pg.evaluate("!document.querySelector('.pbl')"))
    ok('нет JS-ошибок', not errs, errs)
    b.close()
print('ИТОГО',sum(res),'/',len(res))
