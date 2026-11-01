import json
from playwright.sync_api import sync_playwright
BASE='http://localhost:8834/taklif-marhabo-bot'; res=[]
def ok(n,c,e=''): print(('PASS' if c else 'FAIL'),n,str(e)[:170]); res.append(bool(c))
with sync_playwright() as p:
    b=p.chromium.launch()
    for lang in ('ru','uz'):
      for w in (280,320,360,390,430,480):
        ctx=b.new_context(viewport={'width':w,'height':760},service_workers='block'); pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)[:100]))
        ctx.route('**/telegram.org/**',lambda r,*a:r.fulfill(status=200,content_type='application/javascript',body=''))
        ctx.route('**/fonts.googleapis.com/**',lambda r,*a:r.fulfill(status=200,content_type='text/css',body=''))
        ctx.route('**/*workers.dev/**',lambda r,*a:r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*'},body='{}'))
        pg.add_init_script("localStorage.setItem('lg','%s')"%lang)
        pg.goto(BASE+'/index.html'); pg.wait_for_timeout(1000); pg.locator('[data-new]').first.click(); pg.wait_for_timeout(500)
        pg.locator('#wzn').click(); pg.wait_for_timeout(200); pg.fill('[data-f=a]','Абдурахмонджон'); pg.fill('[data-f=b]','Шахризодахон'); pg.fill('[data-f=d]','2027-06-12')
        bad=[]
        for n in range(1,6):
            pg.evaluate("n=>document.querySelector('[data-wzg=\"'+n+'\"]').click()",n); pg.wait_for_timeout(250)
            r=pg.evaluate("""()=>{const bar=document.querySelector('.wzbar'),bt=bar?bar.getBoundingClientRect():null;
              const over=document.documentElement.scrollWidth>innerWidth+1;
              const wide=[...document.querySelectorAll('section.wzs.on *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1}).slice(0,2).map(e=>e.tagName+'.'+(e.className||'')+'#'+(e.id||''));
              const last=[...document.querySelectorAll('section.wzs.on > *')].pop(),lb=last?last.getBoundingClientRect():null;
              const bs=[...document.querySelectorAll('.wzbar .b')].map(b=>Math.round(b.getBoundingClientRect().height));
              return {over,wide,btnH:bs,barTop:bt?Math.round(bt.top):0,docH:document.documentElement.scrollHeight,vh:innerHeight}}""")
            if r['over'] or r['wide'] or any(h<44 for h in r['btnH']): bad.append((n,r))
        ok(f'{lang} {w}px: все 5 шагов без горизонтальной прокрутки, кнопки ≥44',not bad and not errs,(bad[:1],errs))
        # нижняя панель не закрывает последний элемент: доскроллить вниз и проверить, что есть отступ под панелью
        pg.evaluate("scrollTo(0,document.documentElement.scrollHeight)"); pg.wait_for_timeout(200)
        cov=pg.evaluate("""()=>{const bar=document.querySelector('.wzbar').getBoundingClientRect();const els=[...document.querySelectorAll('section.wzs.on *')].filter(e=>e.getBoundingClientRect().height>0);const lastBottom=Math.max(...els.map(e=>e.getBoundingClientRect().bottom));return Math.round(bar.top-lastBottom)}""")
        ok(f'{lang} {w}px: панель «Далее/Сохранить» не перекрывает конец шага (зазор {cov}px)',cov>=-2,cov)
        ctx.close()
    b.close()
print('ИТОГО %d ok, %d fail'%(sum(res),len(res)-sum(res)))
