import re
from playwright.sync_api import sync_playwright
res=[]
def ok(n,c,e=''):
    print(('PASS' if c else 'FAIL'),n,str(e)[:200]); res.append(bool(c))
B="http://localhost:8851/r"
BLOCK=('**/googleapis.com/**','**/gstatic.com/**','**/unsplash.com/**')
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:90]))
    for pat in BLOCK: pg.route(pat,lambda r:r.abort())
    pg.goto(B+"/i/anvar-madina/"); pg.wait_for_selector('#seal',timeout=15000); pg.click('#seal'); pg.wait_for_timeout(3000)
    for y in range(0,7000,500):
        pg.evaluate(f'scrollTo(0,{y})'); pg.wait_for_timeout(80)
    info=pg.evaluate("""(()=>{
      const all=[...document.querySelectorAll('*')].filter(e=>e.offsetWidth>=14&&e.offsetWidth<=60&&e.offsetHeight>=14&&e.offsetHeight<=60&&e.children.length===0);
      const want=['rgb(232, 201, 196)','rgb(201, 162, 75)','rgb(47, 107, 82)'];
      const dots=all.filter(e=>want.includes(getComputedStyle(e).backgroundColor));
      const t=document.body.innerText;
      return {n:dots.length, cols:[...new Set(dots.map(e=>getComputedStyle(e).backgroundColor))], size:dots[0]?[dots[0].offsetWidth,dots[0].offsetHeight]:null,
        story:/2019/.test(t)&&/Познакомились/.test(t)&&/2021/.test(t)&&/Помолвка/.test(t), dress:/Вечерние платья/.test(t), sw:document.documentElement.scrollWidth, iw:innerWidth}})()""")
    print('  ',info)
    ok('палитра: 3 разных цветных кружка видны', len(info['cols'])==3, info['cols'])
    ok('палитра: кружки не меньше 20px', (info['size'] or [0])[0]>=20, info['size'])
    ok('дресс-код: текст виден', info['dress'])
    ok('Наша история: обе вехи с датой и текстом', info['story'])
    ok('нет горизонтального скролла', info['sw']<=info['iw'])
    ok('нет JS-ошибок', not errs, errs)
    ctx.close()
    ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:90]))
    for pat in BLOCK: pg.route(pat,lambda r:r.abort())
    pg.goto(B+"/s.html"); pg.wait_for_timeout(2500)
    t=pg.evaluate("document.body.innerText")
    ok('каталог: услуга Zal Tantana показана', 'Zal Tantana' in t, t[:100])
    ok('каталог: цена 6 000 000 видна', bool(re.search(r'6[\s\u00a0\u202f ,.]?000[\s\u00a0\u202f ,.]?000',t)), t[:300])
    ok('каталог: вместимость 400 видна', '400' in t)
    ok('каталог: кнопки позвонить/Telegram', pg.evaluate("!!document.querySelector('a[href^=\"tel:\"], a[href*=\"t.me/tantana_zal\"]')"))
    ok('каталог: цена -5 не показана', '-5' not in t)
    ok('каталог: нет горизонтального скролла', pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    ok('каталог: нет JS-ошибок', not errs, errs)
    b.close()
print('ИТОГО',sum(res),'/',len(res))
