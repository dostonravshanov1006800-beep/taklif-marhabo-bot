// Прогоняет настоящий sanitizeInv из worker/worker.js на всех 12 типах и на флаге vc. Запуск: node tests/worker-types.mjs
// Берёт настоящий sanitizeInv из worker/worker.js при каждом запуске (копии не хранит).
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));const w=fs.readFileSync(path.join(here,'..','worker','worker.js'),'utf8');
const pick=n=>{const m=w.match(new RegExp('(const|function)\\s+'+n+'\\b[\\s\\S]*?(?=\\nconst |\\nfunction |\\nexport )'));return m?m[0]:''};
const code=['LGS','BOT_NAME','cleanStr'].map(pick).join('\n')+'\n'+w.slice(w.indexOf('const okUrl'),w.indexOf('export default'));
const sanitizeInv=new Function(code+'\nreturn sanitizeInv;')();
const TYPES=['wedding','nikah','birthday','anniversary','sunnat','beshik','grad','party','corp','navruz','hayit','other'];let bad=[];for(const t of TYPES){const o=sanitizeInv({t,a:'A',b:'B',d:'2027-01-01',i:'abc123'},'1');if(!o||o.t!==t)bad.push(t+'->'+(o&&o.t))}
console.log(bad.length?'ПОТЕРЯНЫ: '+bad.join():'воркер сохраняет все 12 типов');const x=sanitizeInv({t:'hack',a:'A',i:'abc123'},'1');console.log('чужой тип -> '+x.t);
const V=[['media/123456/abcd1234.mp4','l']];
const c1=sanitizeInv({t:'wedding',a:'A',i:'abc123',vc:1,p:{v:V}},'1');
const c2=sanitizeInv({t:'wedding',a:'A',i:'abc123',vc:1},'1');
const c3=sanitizeInv({t:'wedding',a:'A',i:'abc123',vc:1,p:{v:[['https://x.com/a.exe','l']]}},'1');
const c4=sanitizeInv({t:'wedding',a:'A',i:'abc123',p:{v:V}},'1');
const c5=sanitizeInv({t:'wedding',a:'A',i:'abc123',vc:'yes',p:{v:V}},'1');
const vbad=[];if(c1.vc!==1)vbad.push('vc с видео потерян');if(c2.vc)vbad.push('vc без видео прошёл');if(c3.vc)vbad.push('vc с мусорной ссылкой прошёл');if(c4.vc)vbad.push('vc без флага появился');if(c5.vc)vbad.push('vc строкой прошёл');
console.log(vbad.length?'VC ПРОВАЛ: '+vbad.join('; '):'vc: сохраняется только с проверенным роликом');
if(vbad.length)process.exit(1);

// То же самое для бота: он публикует приглашение в репозиторий и обязан вести себя так же, как воркер.
const bsrc=fs.readFileSync(path.join(here,'..','bot','bot.mjs'),'utf8');
const bpick=n=>{const m=bsrc.match(new RegExp('(const|let|function)\\s+'+n+'\\b[\\s\\S]*?(?=\\nconst |\\nlet |\\nfunction |\\nasync function |\\nexport )'));return m?m[0]:''};
const bi=bsrc.indexOf('function sanitizeInv'),be=bsrc.indexOf('\n}\n',bi)+3;
const bcode=['LGS','cleanStr','okUrl','okMedia','BOT_NAME'].map(bpick).join('\n')+'\n'+bsrc.slice(bi,be);
let bsan;try{bsan=new Function(bcode+'\nreturn sanitizeInv;')()}catch(e){console.log('БОТ: не удалось загрузить sanitizeInv: '+e.message);process.exit(1)}
const bb=[];
for(const t of TYPES){const o=bsan({t,a:'A',b:'B',d:'2027-01-01',i:'abc123'},'1');if(!o||o.t!==t)bb.push('тип '+t)}
const b1=bsan({t:'wedding',a:'A',i:'abc123',vc:1,p:{v:V}},'1'),b2=bsan({t:'wedding',a:'A',i:'abc123',vc:1},'1'),b3=bsan({t:'wedding',a:'A',i:'abc123',vc:1,p:{v:[['https://x.com/a.exe','l']]}},'1'),b4=bsan({t:'wedding',a:'A',i:'abc123',p:{v:V}},'1');
if(!b1||b1.vc!==1)bb.push('vc с видео потерян');if(b2&&b2.vc)bb.push('vc без видео прошёл');if(b3&&b3.vc)bb.push('vc с мусорной ссылкой прошёл');if(b4&&b4.vc)bb.push('vc без флага появился');
console.log(bb.length?'БОТ ПРОВАЛ: '+bb.join('; '):'бот: 12 типов и vc ведут себя как воркер');
if(bb.length)process.exit(1);

// П.5 галерея: подписи привязаны к фото, лимит 12, раскладка только m/r. Одинаково для воркера и бота.
const gp=(n)=>Array.from({length:n},(_,i)=>'media/123456/photo'+(i+1)+'ab.jpg');
function galCheck(name,san){
  const bad=[];
  const a=san({t:'wedding',a:'A',i:'abc123',p:{g:gp(3),gc:['один','два','три'],gv:'m'}},'1');
  if(!a||!a.p||a.p.g.length!==3||a.p.gc.join()!=='один,два,три'||a.p.gv!=='m')bad.push('базовый случай');
  // среднее фото с мусорной ссылкой отбрасывается, подпись уходит вместе с ним
  const b=san({t:'wedding',a:'A',i:'abc123',p:{g:[gp(3)[0],'javascript:alert(1)',gp(3)[2]],gc:['один','два','три']}},'1');
  if(!b||!b.p||b.p.g.length!==2||b.p.gc.join()!=='один,три')bad.push('подписи сдвинулись при отброшенном фото: '+JSON.stringify(b&&b.p));
  const c=san({t:'wedding',a:'A',i:'abc123',p:{g:gp(15)}},'1');
  if(!c||c.p.g.length!==12)bad.push('лимит 12: '+(c&&c.p&&c.p.g.length));
  const d=san({t:'wedding',a:'A',i:'abc123',p:{g:gp(2),gc:['x'.repeat(200),'ok']}},'1');
  if(!d||d.p.gc[0].length!==60)bad.push('подпись не обрезана до 60');
  const e=san({t:'wedding',a:'A',i:'abc123',p:{g:gp(2),gv:'<script>'}},'1');
  if(!e||e.p.gv)bad.push('чужая раскладка прошла');
  const f=san({t:'wedding',a:'A',i:'abc123',p:{g:gp(2),gc:['','  ']}},'1');
  if(!f||f.p.gc)bad.push('пустые подписи не должны храниться');
  const g=san({t:'wedding',a:'A',i:'abc123',p:{g:gp(2),gc:[123,{a:1}]}},'1');
  if(!g||g.p.gc)bad.push('нестроковые подписи прошли');
  const h=san({t:'wedding',a:'A',i:'abc123',p:{gc:['x'],gv:'r'}},'1');
  if(h&&h.p&&(h.p.gc||h.p.gv))bad.push('подписи и раскладка без фото');
  const k=san({t:'wedding',a:'A',i:'abc123',p:{g:gp(2),gc:['<img src=x onerror=1>','a\nb']}},'1');
  if(!k||k.p.gc[1]!=='a b')bad.push('перенос строки не схлопнут: '+JSON.stringify(k&&k.p&&k.p.gc));
  console.log(bad.length?name+' ГАЛЕРЕЯ ПРОВАЛ: '+bad.join('; '):name+': галерея 2.0 (12 фото, подписи, раскладка) в порядке');
  return bad.length;
}
let gbad=galCheck('воркер',sanitizeInv)+galCheck('бот',bsan);
if(gbad)process.exit(1);

// П.6 плейлист: одинаково для воркера и бота
const AU=(n)=>Array.from({length:n},(_,i)=>'media/123456/trk'+(i+1)+'ab.mp3');
function plCheck(name,san){
  const bad=[]; const base={t:'wedding',a:'A',i:'abc123',u:'media/123456/main1ab.mp3'};
  const a=san({...base,p:{ul:AU(2),un:['Вальс','Финал']}},'1');
  if(!a||!a.p||a.p.ul.length!==2||a.p.un.join()!=='Вальс,Финал')bad.push('базовый');
  const b=san({...base,p:{ul:AU(9)}},'1'); if(!b||!b.p||b.p.ul.length!==4)bad.push('лимит 4: '+(b&&b.p&&b.p.ul&&b.p.ul.length));
  const c=san({t:'wedding',a:'A',i:'abc123',p:{ul:AU(2)}},'1'); if(c&&c.p&&c.p.ul)bad.push('без основного трека плейлист прошёл');
  const d=san({...base,p:{ul:['media/123456/photo1ab.jpg','media/123456/clip1ab.mp4','javascript:alert(1)',AU(1)[0]]}},'1'); if(!d||!d.p||d.p.ul.length!==1||d.p.ul[0]!==AU(1)[0])bad.push('не-аудио прошло: '+JSON.stringify(d&&d.p));
  const e=san({...base,p:{ul:[base.u,AU(1)[0]]}},'1'); if(!e||!e.p||e.p.ul.length!==1)bad.push('основной повторился в плейлисте');
  const f=san({...base,p:{ul:[AU(1)[0],'javascript:x',AU(2)[1]],un:['один','два','три']}},'1'); if(!f||!f.p||f.p.ul.length!==2||f.p.un.join()!=='один,три')bad.push('названия сдвинулись: '+JSON.stringify(f&&f.p));
  const g=san({...base,p:{ul:AU(1),un:['x'.repeat(200)]}},'1'); if(!g||!g.p||g.p.un[0].length!==40)bad.push('название не обрезано до 40');
  const h=san({...base,p:{ul:AU(1),un:[123]}},'1'); if(!h||!h.p||h.p.un)bad.push('нестроковое название прошло');
  const k=san({...base,p:{ul:'media/123456/trk1ab.mp3'}},'1'); if(k&&k.p&&k.p.ul)bad.push('ul-строка вместо массива прошла');
  console.log(bad.length?name+' ПЛЕЙЛИСТ ПРОВАЛ: '+bad.join('; '):name+': плейлист (до 4, только аудио, названия по трекам) в порядке');
  return bad.length;
}
if(plCheck('воркер',sanitizeInv)+plCheck('бот',bsan))process.exit(1);
