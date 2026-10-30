import fs from 'fs';
const REPO='/app/conversations/6ae32fd38b107a4b39ea2360/taklif-gh';
const ROOT='/tmp/bc2'; fs.rmSync(ROOT,{recursive:true,force:true}); fs.mkdirSync(ROOT,{recursive:true});
fs.cpSync(REPO+'/docs',ROOT+'/docs',{recursive:true}); fs.mkdirSync(ROOT+'/bot',{recursive:true}); fs.copyFileSync(REPO+'/bot/bot.mjs',ROOT+'/bot/bot.mjs');
process.chdir(ROOT);
let src=fs.readFileSync('bot/bot.mjs','utf8');
src=src.replace("from '../docs/qr.mjs'","from '"+ROOT+"/docs/qr.mjs'");
src=src.replace(/\nmain\(\)\.catch[^\n]*\s*$/,'\nmain();').replace(/\nmain\(\);\s*$/,'\nexport {onMessage};');
src=src.replace("const TOKEN = process.env.BOT_TOKEN;","const TOKEN = 'T';").replace("const APP_URL = process.env.APP_URL; ","const APP_URL = 'https://dostonravshanov1006800-beep.github.io/taklif-marhabo-bot'; ");
src=src.replace("execSync('git config user.name","return; execSync('git config user.name");
const sent=[]; globalThis.fetch=async(url,opt)=>{let b={};try{b=JSON.parse(opt.body)}catch{};sent.push({m:String(url).split('/').pop(),b});return {json:async()=>({ok:true,result:{}})}};
fs.writeFileSync('/tmp/bc2_mod.mjs',src);
const {onMessage}=await import('/tmp/bc2_mod.mjs');
let res=[]; const ok=(n,c,e='')=>{console.log(c?'PASS':'FAIL',n,c?'':e);res.push(!!c)};
const say=async(uid,text,lc)=>{sent.length=0;await onMessage({chat:{id:uid,type:'private'},from:{id:uid,first_name:'Алишер',language_code:lc},text});return [...sent]};
for (const lc of ['ru','uz','en','kk']) {
  let r=await say(7,'/start i_javohir-aziza',lc);
  const m=r.find(x=>['sendPhoto','sendMessage'].includes(x.m)); const b=m?m.b:{};
  const kb=JSON.stringify(b.reply_markup||{});
  ok(`${lc}: старт по ссылке отдаёт карточку (фото или текст)`, !!m, r.map(x=>x.m).join());
  ok(`${lc}: в карточке имена пары`, /Javohir/.test(b.caption||b.text||'') && /Aziza/.test(b.caption||b.text||''), (b.caption||b.text||'').slice(0,80));
  ok(`${lc}: кнопка «Открыть» ведёт на короткий адрес /i/javohir-aziza`, /\/i\/javohir-aziza/.test(kb), kb);
  ok(`${lc}: приветствие на языке пользователя`, /Dear|Hurmatli|Құрметті|Дорогой|Sizni|Сізді|invited|Вас/.test(b.caption||b.text||''));
}
const r0=await say(7,'/start i_net-takogo','ru'); ok('несуществующая ссылка не ломает бота (обычный старт)', r0.length>0);
console.log('ИТОГО',res.filter(Boolean).length,'/',res.length);
