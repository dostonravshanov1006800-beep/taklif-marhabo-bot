from playwright.sync_api import sync_playwright
B="https://dostonravshanov1006800-beep.github.io/taklif-marhabo-bot"; res=[]
def ok(n,c,e=''): print(('PASS' if c else 'FAIL'),n,str(e)[:160]); res.append(bool(c))
TG="""window.Telegram={WebApp:{ready(){},expand(){},isVersionAtLeast(){return true},initDataUnsafe:{user:{id:99,first_name:'T'}},platform:'android',colorScheme:'light',version:'7.0',setHeaderColor(){},setBackgroundColor(){},HapticFeedback:{impactOccurred(){}},openLink(){},onEvent(){},offEvent(){}}};"""
UAS=["Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 Telegram-Android/10.5.0",
     "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Telegram-iOS"]
with sync_playwright() as p:
    b=p.chromium.launch()
    for ua in UAS:
        tag='Android' if 'Android' in ua else 'iOS'
        ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,user_agent=ua); pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)[:90]))
        pg.add_init_script(TG)
        for pat in ('**/googleapis.com/**','**/gstatic.com/**','**/unsplash.com/**'): pg.route(pat,lambda r:r.abort())
        pg.goto(B+"/i/javohir-aziza/",wait_until='domcontentloaded'); pg.wait_for_timeout(2500)
        ok(f'{tag} WebView: заставка/печать показана внутри Telegram', pg.evaluate("!!document.querySelector('#seal, .curtain, #cur, [class*=curtain]')"))
        v=pg.evaluate("(()=>{const e=document.querySelector('video');return e?{src:e.currentSrc||e.src,poster:e.poster,muted:e.muted,pi:e.playsInline||e.hasAttribute('playsinline')}:null})()")
        print('   video:',v)
        ok(f'{tag} WebView: заставка не отключена из-за iframe/Telegram', pg.evaluate("!document.documentElement.classList.contains('nocur')"))
        pg.click('#seal') if pg.evaluate("!!document.querySelector('#seal')") else pg.mouse.click(195,420); pg.wait_for_timeout(3000)
        t=pg.evaluate("document.body.innerText")
        ok(f'{tag} WebView: после нажатия виден контент приглашения', 'Javohir' in t and 'Aziza' in t)
        ok(f'{tag} WebView: нет JS-ошибок', not errs, errs)
        ctx.close()
    b.close()
print('ИТОГО',sum(res),'/',len(res))
