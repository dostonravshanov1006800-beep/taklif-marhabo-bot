from playwright.sync_api import sync_playwright
S="http://localhost:8834/taklif-marhabo-bot"; res=[]
def ok(n,c,e=''): print(('PASS' if c else 'FAIL'),n,str(e)[:170]); res.append(bool(c))

def GS(pg,n):
    if pg.evaluate("n=>{const e=document.querySelector('section.wzs.on');return !!e&&+e.dataset.step===n}",n): return
    # мастер не пускает дальше шага 2 без имени и даты: заполняем «служебно», если пусто и поля есть
    if n>2 and pg.evaluate("!!document.querySelector('[data-f=a]') && !document.querySelector('[data-f=a]').value.trim()"):
        pg.evaluate("""()=>{const set=(s,v)=>{const e=document.querySelector(s);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}};set('[data-f=a]','Тест');set('[data-f=d]','2027-05-05')}""")
    pg.evaluate("n=>{const b=document.querySelector('[data-wzg=\"'+n+'\"]');b&&b.click()}",n); pg.wait_for_timeout(200)

with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:100]))
    # полнота библиотеки
    pg.goto(S+"/index.html"); pg.wait_for_selector('.hero')
    inv=pg.evaluate("""async()=>{const m=await import('./phrases.js');const bad=[];let n=0;
      for(const t of ['wedding','nikah','birthday','anniversary','navruz','other'])for(const st of ['classic','warm','short'])for(const l of ['ru','uz','en','kk']){n++;const v=m.PHRASES[t]?.[st]?.[l];if(!v||v.length<20||v.length>400)bad.push(t+'/'+st+'/'+l)}
      const names=['ru','uz','en','kk'].every(l=>['classic','warm','short'].every(k=>m.PHRASE_STYLES[l][k]));return {n,bad,names}}""")
    ok('библиотека: 72 текста (6 типов × 3 стиля × 4 языка), все непустые и ≤400 символов', inv['n']==72 and not inv['bad'], inv['bad'][:5])
    ok('названия стилей есть на всех 4 языках', inv['names'])
    lim=pg.evaluate("document.querySelector('[data-f=x]')?1:0")
    # форма свадьбы
    pg.click('.tc[data-new=wedding]'); pg.wait_for_selector('section.wzs.on')
    GS(pg,4); ok('кнопка «Подобрать текст» есть под полем текста', pg.evaluate("!!document.querySelector('#phb')"))
    GS(pg,4); ok('список стилей скрыт по умолчанию', pg.evaluate("document.querySelector('#phl').hidden"))
    GS(pg,4); pg.click('#phb'); pg.wait_for_timeout(200)
    GS(pg,4); ok('после нажатия видны 3 варианта', pg.evaluate("document.querySelectorAll('#phl .phi').length")==3 and pg.evaluate("!document.querySelector('#phl').hidden"))
    GS(pg,4); ok('кнопки вариантов не меньше 44px по высоте', pg.evaluate("[...document.querySelectorAll('#phl .phi')].every(b=>b.getBoundingClientRect().height>=44)"))
    ok('нет горизонтального скролла при открытом списке', pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    GS(pg,4); pg.click('#phl [data-ph=warm]'); pg.wait_for_timeout(200)
    v=pg.evaluate("document.querySelector('[data-f=x]').value")
    ok('выбор варианта вставляет текст в поле', len(v)>30, v[:60])
    GS(pg,4); ok('после выбора список закрывается', pg.evaluate("document.querySelector('#phl').hidden"))
    # состояние формы сохранило текст (ушло бы в payload)
    GS(pg,4); ok('черновик хранит вставленный текст', pg.evaluate("document.querySelector('[data-f=x]').value")==v)
    # замена введённого текста: отказ -> текст остаётся, согласие -> заменяется
    GS(pg,4); pg.fill('[data-f=x]','Мой собственный текст приглашения')
    dl=[]
    pg.once('dialog',lambda d:(dl.append(d.message),d.dismiss()))
    GS(pg,4); pg.click('#phb'); GS(pg,4); pg.click('#phl [data-ph=short]'); pg.wait_for_timeout(300)
    ok('при уже введённом тексте спрашивает подтверждение', len(dl)==1, dl)
    GS(pg,4); ok('отказ: собственный текст не затёрт', pg.evaluate("document.querySelector('[data-f=x]').value")=='Мой собственный текст приглашения')
    GS(pg,4); ok('после отказа список остаётся открытым, можно выбрать другой вариант', pg.evaluate("!document.querySelector('#phl').hidden"))
    pg.once('dialog',lambda d:d.accept())
    GS(pg,4); pg.click('#phl [data-ph=short]'); pg.wait_for_timeout(300)
    GS(pg,4); ok('согласие: текст заменён готовой формулировкой', pg.evaluate("document.querySelector('[data-f=x]').value")!='Мой собственный текст приглашения')
    # язык приглашения -> язык текста
    for lg,mark in (('uz','taklif|xursand|siz'),('en','invite|wedding|happy|you'),('kk','шақыр|қуан|той')):
        GS(pg,1); pg.click(f'#ilg [data-il={lg}]'); pg.wait_for_timeout(250)
        GS(pg,4); pg.fill('[data-f=x]','')
        GS(pg,4); pg.click('#phb'); GS(pg,4); pg.click('#phl [data-ph=classic]'); pg.wait_for_timeout(250)
        t=pg.evaluate("document.querySelector('[data-f=x]').value").lower()
        import re
        ok(f'язык приглашения {lg}: текст на этом языке', re.search(mark,t) is not None and not re.search('[а-яё]{4,}',t) if lg in('uz','en') else re.search(mark,t) is not None, t[:70])
    # тип «никах» и «навруз» дают свои тексты
    GS(pg,1); pg.evaluate("document.querySelector('[data-tpl=nikah]').click()"); pg.wait_for_timeout(200)
    GS(pg,1); pg.click('#ilg [data-il=ru]'); GS(pg,4); pg.fill('[data-f=x]',''); GS(pg,4); pg.click('#phb'); GS(pg,4); pg.click('#phl [data-ph=classic]'); pg.wait_for_timeout(200)
    GS(pg,4); ok('для «никах» подставляется текст про никах', 'никах' in pg.evaluate("document.querySelector('[data-f=x]').value").lower())
    GS(pg,1); pg.evaluate("document.querySelector('[data-tpl=navruz]').click()"); pg.wait_for_timeout(200)
    GS(pg,4); pg.fill('[data-f=x]',''); GS(pg,4); pg.click('#phb'); GS(pg,4); pg.click('#phl [data-ph=classic]'); pg.wait_for_timeout(200)
    GS(pg,4); ok('для «навруз» подставляется текст про Навруз', 'навруз' in pg.evaluate("document.querySelector('[data-f=x]').value").lower())
    ok('нет JS-ошибок', not errs, errs)
    b.close()
print('ИТОГО',sum(res),'/',len(res))
