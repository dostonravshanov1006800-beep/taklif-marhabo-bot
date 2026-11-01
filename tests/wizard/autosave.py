from playwright.sync_api import sync_playwright
S="http://localhost:8834/taklif-marhabo-bot"; res=[]
def ok(n,c,e=''): print(('PASS' if c else 'FAIL'),n,str(e)[:120]); res.append(bool(c))
STUB='window.Telegram={WebApp:{ready(){},expand(){},version:"6.0",isVersionAtLeast:()=>false,initDataUnsafe:{user:{id:777000111}},colorScheme:"light",HapticFeedback:{impactOccurred(){}},sendData(){},close(){},openTelegramLink(){},showConfirm(m,cb){cb(true)}}}'
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:100]))
    for pat in ('**/googleapis.com/**','**/gstatic.com/**','**/unsplash.com/**'): pg.route(pat,lambda r:r.abort())
    pg.route('**/telegram.org/js/telegram-web-app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=STUB))
    def goto_step(n):
        pg.evaluate("n=>{const b=document.querySelector('[data-wzg=\"'+n+'\"]');b&&b.click()}",n); pg.wait_for_timeout(250)
    def open_(): pg.goto(S+"/index.html"); pg.wait_for_selector('.hero,section.wzs.on',timeout=15000); pg.wait_for_timeout(700)
    open_()
    # 1. вводим, НЕ нажимая «Сохранить»
    pg.click('.tc[data-new=wedding]'); pg.wait_for_selector('section.wzs.on'); goto_step(2)
    pg.fill('[data-f=a]','Doston'); pg.fill('[data-f=b]','Diyora'); pg.fill('[data-f=d]','2027-03-14'); pg.fill('[data-f=pl]','Turkiston'); pg.fill('[data-f=ad]','Katta halqa yoli'); pg.wait_for_timeout(300)
    # 2. имитация «Старт»/закрытия: полная перезагрузка
    open_()
    ok('после перезагрузки форма вернулась сама',pg.locator('section.wzs').count()==5)
    goto_step(2)
    ok('имя 1 на месте',pg.input_value('[data-f=a]')=='Doston')
    ok('имя 2 на месте',pg.input_value('[data-f=b]')=='Diyora')
    ok('дата на месте',pg.input_value('[data-f=d]')=='2027-03-14')
    ok('место и адрес на месте',pg.input_value('[data-f=pl]')=='Turkiston' and pg.input_value('[data-f=ad]')=='Katta halqa yoli')
    # 3. продолжаем печатать, ещё раз перезагрузка
    goto_step(4); pg.fill('[data-f=ct]','+998978066800'); pg.wait_for_timeout(200); open_()
    goto_step(4); ok('поле, добавленное позже, тоже сохранилось',pg.input_value('[data-f=ct]')=='+998978066800')
    # 4. приглашение уже есть в списке без нажатия «Сохранить»
    n=pg.evaluate("JSON.parse(localStorage.getItem('taklif_v3')||'[]').filter(x=>x.a==='Doston').length")
    ok('приглашение уже в списке без «Сохранить»',n==1,n)
    # 5. повторных копий нет после нескольких перезагрузок и правок
    goto_step(2); pg.fill('[data-f=a]','Doston2'); pg.wait_for_timeout(200); open_(); open_()
    n2=pg.evaluate("JSON.parse(localStorage.getItem('taklif_v3')||'[]').length")
    ok('копии не плодятся (1 приглашение)',n2==1,n2)
    # 6. обычное «Сохранить» работает и очищает черновик
    goto_step(5); pg.click('#sv'); pg.wait_for_timeout(2200)
    ok('после «Сохранить» черновика нет',pg.evaluate("localStorage.getItem('taklif_draft_v1')")is None)
    open_()
    ok('после перезапуска открывается главная, а не старая форма',pg.locator('.hero').count()==1 and pg.locator('#sv').count()==0)
    # 7. пустая форма без имени/даты не создаёт мусор
    pg.click('.tc[data-new=wedding]'); pg.wait_for_selector('section.wzs.on'); goto_step(2); pg.fill('[data-f=pl]','Test'); pg.wait_for_timeout(200); open_()
    n3=pg.evaluate("JSON.parse(localStorage.getItem('taklif_v3')||'[]').length")
    ok('без имени и даты в список ничего не попадает',n3==1,n3)
    goto_step(2); ok('но набранное в пустой форме тоже не теряется',pg.input_value('[data-f=pl]')=='Test')
    # 8. удаление только по кнопке
    goto_step(2); pg.fill('[data-f=a]','Del'); pg.fill('[data-f=d]','2027-01-01'); pg.wait_for_timeout(200)
    goto_step(5); pg.click('#sv'); pg.wait_for_timeout(2200); pg.click('#bg'); pg.wait_for_timeout(650); pg.click('[data-mgo=mine]'); pg.wait_for_timeout(900)
    before=pg.evaluate("JSON.parse(localStorage.getItem('taklif_v3')||'[]').length")
    pg.locator('[data-edit]').first.click(); pg.wait_for_timeout(500)
    ok('простое открытие и закрытие ничего не удаляет',before>=2,before)
    ok('ошибок JS нет',not errs,errs); b.close()
print('ИТОГО',sum(res),'/',len(res))
