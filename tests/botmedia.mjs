import fs from 'fs';
const REPO=process.env.REPO||'/app/conversations/6ae32fd38b107a4b39ea2360/taklif-gh';
const ROOT='/tmp/bm'; fs.rmSync(ROOT,{recursive:true,force:true}); fs.mkdirSync(ROOT+'/bot',{recursive:true});
fs.cpSync(REPO+'/docs',ROOT+'/docs',{recursive:true}); fs.rmSync(ROOT+'/docs/media',{recursive:true,force:true}); fs.rmSync(ROOT+'/docs/wishes',{recursive:true,force:true});
fs.copyFileSync(REPO+'/bot/bot.mjs',ROOT+'/bot/bot.mjs'); fs.copyFileSync(REPO+'/bot/media-check.mjs',ROOT+'/bot/media-check.mjs');
process.chdir(ROOT);
let src=fs.readFileSync('bot/bot.mjs','utf8');
src=src.replace("from '../docs/qr.mjs'","from '"+ROOT+"/docs/qr.mjs'").replace("from './media-check.mjs'","from '"+ROOT+"/bot/media-check.mjs'");
src=src.replace(/\nmain\(\)\.catch[^\n]*\s*$/,'\nmain();').replace(/\nmain\(\);\s*$/,'\nexport {onMessage};');
src=src.replace("const TOKEN = process.env.BOT_TOKEN;","const TOKEN = 'T';").replace("const APP_URL = process.env.APP_URL; ","const APP_URL = 'https://x.github.io/r'; ");
src=src.replace("execSync('git config user.name","return; execSync('git config user.name");
fs.writeFileSync('/tmp/bm_mod.mjs',src);
const FX=n=>fs.readFileSync(REPO+'/tests/fixtures/'+n);
let FILES={}, sent=[];
globalThis.fetch=async(url,opt)=>{url=String(url);
  if(url.includes('/file/bot')){const k=url.split('/').pop();return {ok:true,arrayBuffer:async()=>{const b=FILES[k];return b.buffer.slice(b.byteOffset,b.byteOffset+b.length)}}}
  sent.push({m:url.split('/').pop(),b:opt&&opt.body?JSON.parse(opt.body):{}});
  if(url.endsWith('/getFile')){const id=JSON.parse(opt.body).file_id;return {json:async()=>({ok:true,result:{file_path:id}})}}
  return {json:async()=>({ok:true,result:{}})}};
const {onMessage}=await import('/tmp/bm_mod.mjs');
let res=[]; const ok=(n,c,e='')=>{console.log(c?'PASS':'FAIL',n,c?'':JSON.stringify(e).slice(0,200));res.push(!!c)};
let uid=900;
const send=async(msg,lc='ru')=>{sent.length=0;uid++;await onMessage({chat:{id:uid,type:'private'},from:{id:uid,first_name:'U',language_code:lc},...msg});return {uid,out:[...sent]}};
const text=o=>(o.out.find(x=>x.m==='sendMessage')||{b:{}}).b.text||'';
const onDisk=(u)=>{try{return fs.readdirSync('docs/media/'+u).filter(f=>f!=='index.json')}catch{return []}};
const doc=(file,name,mime)=>{FILES[name]=FX(file);return {document:{file_id:name,file_name:name,mime_type:mime,file_size:FILES[name].length}}};
// честные
let r=await send(doc('ok.jpg','a.jpg','image/jpeg')); ok('честный JPEG принят и сохранён',onDisk(r.uid).length===1&&/\.jpg$/.test(onDisk(r.uid)[0]),[text(r),onDisk(r.uid)]);
r=await send(doc('ok.mp3','a.mp3','audio/mpeg')); ok('честный MP3 принят',onDisk(r.uid).some(f=>f.endsWith('.mp3')),text(r));
r=await send(doc('ok.mp4','a.mp4','video/mp4')); ok('честный MP4 принят',onDisk(r.uid).some(f=>f.endsWith('.mp4')),text(r));
// подделки
r=await send(doc('fake-jpg.html','x.jpg','image/jpeg')); ok('HTML под видом JPG НЕ сохранён',onDisk(r.uid).length===0&&text(r).includes('Нужны фото'),[onDisk(r.uid),text(r)]);
r=await send(doc('evil.svg','x.png','image/png')); ok('SVG со скриптом под видом PNG НЕ сохранён',onDisk(r.uid).length===0,onDisk(r.uid));
r=await send(doc('fake.exe','x.jpg','image/jpeg')); ok('EXE под видом JPG НЕ сохранён',onDisk(r.uid).length===0);
r=await send(doc('archive.zip','x.mp3','audio/mpeg')); ok('ZIP под видом MP3 НЕ сохранён',onDisk(r.uid).length===0);
r=await send(doc('doc.pdf','x.jpg','image/jpeg')); ok('PDF под видом JPG НЕ сохранён',onDisk(r.uid).length===0);
r=await send(doc('empty.bin','x.jpg','image/jpeg')); ok('пустой файл НЕ сохранён',onDisk(r.uid).length===0);
r=await send(doc('huge-dim.png','x.png','image/png')); ok('картинка 12100 px: отказ с понятным текстом',onDisk(r.uid).length===0&&text(r).includes('12000'),text(r));
// формат определяет содержимое
r=await send(doc('ok.png','pic.jpg','image/jpeg')); ok('PNG под именем .jpg сохранён как .png',onDisk(r.uid).length===1&&onDisk(r.uid)[0].endsWith('.png'),onDisk(r.uid));
r=await send(doc('ok.mp4','clip.jpg','image/jpeg')); const d=onDisk(r.uid); const idx=JSON.parse(fs.readFileSync('docs/media/'+r.uid+'/index.json','utf8'));
ok('MP4 под именем .jpg: сохранён как видео .mp4',d.length===1&&d[0].endsWith('.mp4')&&idx[0].k==='video',[d,idx]);
// 4 языка сообщений
for (const [lc,w] of [['uz','Rasm'],['en','Send a photo'],['kk','Фото']]) { r=await send(doc('fake.exe','x.jpg','image/jpeg'),lc); ok(`${lc}: отказ на своём языке`,text(r).includes(w),text(r)); }
for (const [lc,w] of [['uz','12000'],['en','12000'],['kk','12000']]) { r=await send(doc('huge-dim.png','x.png','image/png'),lc); ok(`${lc}: текст про размер картинки`,text(r).includes(w),text(r)); }
// потолок владельца: 120 файлов
const U=777; fs.mkdirSync('docs/media/'+U,{recursive:true}); fs.writeFileSync('docs/media/'+U+'/index.json',JSON.stringify(Array.from({length:120},(_,i)=>({f:'f'+i+'.jpg',k:'photo',kb:1}))));
sent.length=0; FILES['z.jpg']=FX('ok.jpg'); await onMessage({chat:{id:U,type:'private'},from:{id:U,first_name:'U',language_code:'ru'},document:{file_id:'z.jpg',file_name:'z.jpg',mime_type:'image/jpeg',file_size:100}});
ok('120 файлов у владельца: 121-й отклонён с текстом про лимит',!onDisk(U).some(f=>f.startsWith('f')===false&&f!=='index.json')&&((sent.find(x=>x.m==='sendMessage')||{b:{}}).b.text||'').includes('120'),[onDisk(U).length,(sent.find(x=>x.m==='sendMessage')||{b:{}}).b.text]);
// большой по заявленному размеру
r=await send({document:{file_id:'a.jpg',file_name:'big.jpg',mime_type:'image/jpeg',file_size:25*1024*1024}}); ok('заявленный размер 25 МБ: отказ про 19 МБ',text(r).includes('19'),text(r));
console.log('ИТОГО',res.filter(Boolean).length,'/',res.length); process.exit(res.every(Boolean)?0:1);
