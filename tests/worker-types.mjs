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
