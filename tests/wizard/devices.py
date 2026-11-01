# Универсальность: разные движки (Chromium/Safari-WebKit/Firefox) и устройства.
import json, sys
from playwright.sync_api import sync_playwright
BASE='http://localhost:8850/taklif-marhabo-bot'
ITEM={'id':'abc123','t':'wedding','l':'ru','a':'Азизбек','b':'Дилнозахон','d':'2027-06-12','h':'18:00','pl':'Банкетный зал Гранд','ad':'ул. Амира Темура, 1','th':'gold','pr':[['','']]}
DEV=[ # (движок, имя устройства или размер)
 ('chromium','Pixel 7'),('chromium','Galaxy S24'),('chromium','iPhone SE'),('chromium','Galaxy Tab S9'),
 ('webkit','iPhone SE'),('webkit','iPhone 14'),('webkit','iPhone 15 Pro Max'),('webkit','iPad (gen 7)'),('webkit','Desktop Safari'),
 ('firefox','Desktop Firefox'),('chromium','Desktop Chrome'),
 ('chromium',(1440,900)),('chromium',(1920,1080)),('chromium',(2560,1200)),('chromium',(280,640)),
]
JS_OVER="""()=>{const W=document.documentElement.clientWidth,bad=[];for(const e of document.querySelectorAll('body *')){const r=e.getBoundingClientRect(),cs=getComputedStyle(e);if(cs.position==='fixed'||cs.display==='none'||cs.visibility==='hidden'||!r.width||e.closest('[hidden]'))continue;if(r.right>W+2&&!e.closest('.mn,#mn,.mov,svg,video')&&cs.overflowX!=='auto')bad.push((e.className||e.tagName)+':'+Math.round(r.right))}return {sw:document.documentElement.scrollWidth,W,bad:bad.slice(0,3)}}"""
JS_TAP="""()=>[...document.querySelectorAll('button:not([hidden]),a.b,.mi')].filter(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width&&cs.visibility!=='hidden'&&cs.display!=='none'&&(r.height<40||r.width<40)&&!e.closest('#mn,.mov,.lang')}).map(e=>(e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)).slice(0,4)"""
res=[]; 
def ok(n,c,e=''):
    print(('PASS' if c else 'FAIL'),n,str(e)[:200]); res.append(bool(c))
with sync_playwright() as p:
    for eng,dv in DEV:
        bt=getattr(p,eng)
        try:
            b=bt.launch()
            if isinstance(dv,tuple): ctx=b.new_context(viewport={'width':dv[0],'height':dv[1]},service_workers='block'); name=f'{eng} {dv[0]}x{dv[1]}'
            else: ctx=b.new_context(**p.devices[dv],service_workers='block'); name=f'{eng} {dv}'
        except Exception as e: ok(f'{eng} {dv}: запуск',False,e); continue
        ctx.route('**/telegram.org/**',lambda r,*a:r.fulfill(status=200,content_type='application/javascript',body=''))
        ctx.route('**/fonts.googleapis.com/**',lambda r,*a:r.fulfill(status=200,content_type='text/css',body=''))
        ctx.route('**/*workers.dev/**',lambda r,*a:r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*'},body='{}'))
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:110]))
        pg.add_init_script("localStorage.setItem('lg','ru');if(!localStorage.getItem('taklif_v3'))localStorage.setItem('taklif_v3',%s)"%json.dumps(json.dumps([ITEM])))
        try:
            pg.goto(BASE+'/index.html',wait_until='domcontentloaded'); pg.wait_for_selector('[data-new]',timeout=20000); pg.wait_for_timeout(500)
            o=pg.evaluate(JS_OVER); ok(f'{name} | главная: без гориз. прокрутки',o['sw']<=o['W']+1 and not o['bad'],o)
            # бургер → «Мои»
            pg.locator('#bg').click(); pg.wait_for_timeout(450); pg.locator('[data-mgo="mine"]').click(); pg.wait_for_selector('.ic',timeout=8000); pg.wait_for_timeout(300)
            o=pg.evaluate(JS_OVER); ok(f'{name} | «Мои»: без гориз. прокрутки',o['sw']<=o['W']+1 and not o['bad'],o)
            h=pg.evaluate("document.querySelector('.ic').getBoundingClientRect().height"); ok(f'{name} | карточка не схлопнута (>150px)',h>150,h)
            t=pg.evaluate(JS_TAP); 
            # мастер
            pg.locator('[data-dup]').first.click(); pg.wait_for_timeout(700)
            o=pg.evaluate(JS_OVER); ok(f'{name} | мастер: без гориз. прокрутки',o['sw']<=o['W']+1 and not o['bad'],o)
            inp=pg.evaluate("(()=>{const e=document.querySelector('input,textarea');return e?getComputedStyle(e).fontSize:'16px'})()"); ok(f'{name} | поля ввода >=16px (iOS не зумит)',float(inp[:-2])>=16,inp)
            bar=pg.evaluate("(()=>{const e=document.querySelector('.bar');if(!e)return 1;const r=e.getBoundingClientRect();return r.bottom<=innerHeight+2&&r.height>0?1:0})()"); ok(f'{name} | нижняя кнопка мастера видна в экране',bar==1)
            # гостевая страница
            pg.goto(BASE+'/i/demo-konvert/',wait_until='domcontentloaded'); pg.wait_for_timeout(1800)
            pg.evaluate("document.getElementById('intro')&&document.getElementById('intro').click()"); pg.wait_for_timeout(1200)
            o=pg.evaluate(JS_OVER); ok(f'{name} | гостевая: без гориз. прокрутки',o['sw']<=o['W']+1 and not o['bad'],o)
            ok(f'{name} | нет ошибок JS',not errs,errs)
        except Exception as e: ok(f'{name} | сценарий',False,str(e)[:160])
        ctx.close(); b.close()
print('ИТОГО:',sum(res),'ok,',len(res)-sum(res),'fail')
