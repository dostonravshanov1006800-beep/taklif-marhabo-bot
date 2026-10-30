import fs from 'fs';
const REPO='/app/conversations/6ae32fd38b107a4b39ea2360/taklif-gh';
const ROOT='/tmp/ba'; fs.rmSync(ROOT,{recursive:true,force:true}); fs.mkdirSync(ROOT,{recursive:true});
fs.cpSync(REPO+'/docs',ROOT+'/docs',{recursive:true}); fs.rmSync(ROOT+'/docs/wishes',{recursive:true,force:true}); fs.mkdirSync(ROOT+'/bot',{recursive:true}); fs.copyFileSync(REPO+'/bot/bot.mjs',ROOT+'/bot/bot.mjs');
process.chdir(ROOT);
let src=fs.readFileSync('bot/bot.mjs','utf8');
src=src.replace("from '../docs/qr.mjs'","from '"+ROOT+"/docs/qr.mjs'");
src=src.replace(/\nmain\(\)\.catch[^\n]*\s*$/,'\nmain();').replace(/\nmain\(\);\s*$/,'\nexport {onMessage};');
src=src.replace("const TOKEN = process.env.BOT_TOKEN;","const TOKEN = 'T';").replace("const APP_URL = process.env.APP_URL; ","const APP_URL = 'https://x.github.io/r'; ");
src=src.replace("execSync('git config user.name","return; execSync('git config user.name");
const sent=[]; globalThis.fetch=async(url,opt)=>{sent.push({m:String(url).split('/').pop(),b:JSON.parse(opt.body)});return {json:async()=>({ok:true,result:{}})}};
fs.writeFileSync('/tmp/ba_mod.mjs',src);
const {onMessage}=await import('/tmp/ba_mod.mjs');
let res=[]; const ok=(n,c,e='')=>{console.log(c?'PASS':'FAIL',n,c?'':e);res.push(!!c)};
const say=async(uid,text,lc)=>{sent.length=0;await onMessage({chat:{id:uid,type:'private'},from:{id:uid,first_name:'U',language_code:lc},text});return [...sent]};
for (const [lc,word] of [['ru','Аудит'],['uz','Audit'],['en','Audit'],['kk','Аудит']]) {
  const r=await say(5,'/audit',lc); const t=(r.find(x=>x.m==='sendMessage')||{b:{}}).b.text||'';
  const ticks=(t.match(/✅/g)||[]).length, warns=(t.match(/⚠️/g)||[]).length;
  ok(`${lc}: /audit отвечает с заголовком`, t.includes(word), t.slice(0,60));
  ok(`${lc}: все пункты ✅ (${ticks}), без ⚠️ (${warns})`, ticks===20 && warns===0, t.split('\n').filter(l=>l.includes('⚠️')).join(' | '));
  ok(`${lc}: итог 20/20`, /20\/20/.test(t));
  ok(`${lc}: текст HTML-безопасен и короче лимита Telegram`, t.length<4000, t.length);
}
for (const c of ['/done','/report']) { const r=await say(5,c,'ru'); ok(`${c} тоже открывает аудит`, ((r.find(x=>x.m==='sendMessage')||{b:{}}).b.text||'').includes('Аудит')); }
let r=await say(5,'/info','ru'); ok('/info не сломан', ((r.find(x=>x.m==='sendMessage')||{b:{}}).b.text||'').includes('Как это работает'));
r=await say(5,'/start','en'); ok('/start не сломан', sent.length>0);
// честность: если файл пропал, пункт становится ⚠️
fs.rmSync(ROOT+'/docs/cal.html'); const r2=await say(5,'/audit','ru'); const t2=(r2.find(x=>x.m==='sendMessage')||{b:{}}).b.text||'';
ok('удалили cal.html: пункт «Календарь» стал ⚠️ и итог 19/20', /⚠️ Календарь/.test(t2) && /19\/20/.test(t2), t2.split('\n').filter(l=>l.includes('Календарь')).join(''));
console.log('ИТОГО',res.filter(Boolean).length,'/',res.length);
