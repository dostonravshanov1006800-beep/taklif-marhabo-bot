# Мастер: видео-заставки Muhr/Nikoh только для свадьбы и никаха, по умолчанию стоят сами, блок на шаге 3.
from playwright.sync_api import sync_playwright
BASE='http://localhost:8834/taklif-marhabo-bot'; res=[]
def ok(n,c,e=''): print(('PASS' if c else 'FAIL'),n,str(e)[:170]); res.append(bool(c))
ST="(()=>{const on=document.querySelector('.iv.on');return {on:on?on.dataset.iv:'',vis:[...document.querySelectorAll('.iv')].filter(x=>!x.hidden).map(x=>x.dataset.iv),step:document.querySelector('#ivs').closest('section').dataset.step}})()"
with sync_playwright() as p:
    b=p.chromium.launch()
    for t,want,other in (('wedding','vmuhr','vnikoh'),('nikah','vnikoh','vmuhr'),('birthday','',None),('corp','',None)):
        ctx=b.new_context(viewport={'width':390,'height':780},service_workers='block'); pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)[:120]))
        ctx.route('**/telegram.org/**',lambda r,*a:r.fulfill(status=200,content_type='application/javascript',body=''))
        ctx.route('**/fonts.googleapis.com/**',lambda r,*a:r.fulfill(status=200,content_type='text/css',body=''))
        ctx.route('**/*workers.dev/**',lambda r,*a:r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*'},body='{}'))
        pg.add_init_script("localStorage.setItem('lg','ru')"); pg.goto(BASE+'/index.html'); pg.wait_for_selector('[data-new]',timeout=15000); pg.wait_for_timeout(400)
        pg.locator('[data-new]').first.click(); pg.wait_for_timeout(500); pg.locator(f'[data-tpl="{t}"]').click(); pg.wait_for_timeout(300)
        pg.locator('#wzn').click(); pg.wait_for_timeout(300); pg.fill('[data-f="a"]','Азиз'); pg.fill('[data-f="d"]','2027-06-12'); pg.locator('#wzn').click(); pg.wait_for_timeout(300)
        s=pg.evaluate(ST)
        ok(f'{t}: блок заставки на шаге 3 (а не на последнем) и шаг 3 открыт',s['step']=='3' and pg.locator('section.wzs.on').get_attribute('data-step')=='3',s['step'])
        if want or other:
            ok(f'{t}: по умолчанию выбрано «{want}»',s['on']==want,s)
            ok(f'{t}: видео-плитки видны и стоят первыми после «Без заставки»',s['vis'][:3]==['','vmuhr','vnikoh'],s['vis'])
            pg.locator(f'[data-iv="{other}"]').click(); pg.wait_for_timeout(200); ok(f'{t}: переключение на другое видео работает',pg.evaluate(ST)['on']==other)
        else:
            ok(f'{t}: видео-плиток НЕТ',('vmuhr' not in s['vis']) and ('vnikoh' not in s['vis']),s['vis'])
            ok(f'{t}: заставка по умолчанию пустая',s['on']=='',s)
        ok(f'{t}: нет ошибок JS',not errs,errs); ctx.close()
    b.close()
print('ИТОГО:',sum(res),'ok,',len(res)-sum(res),'fail')
