/* Офлайн-режим приглашений. Версия кэша подставляется CI (ci/build-sw.mjs). */
const V='tk-a551c72f';
const SHELL=['shared.js','fx.js','fx.css','bundle.css','intro.js','intro.css','curtain.js','curtain.css','reveal.js','reveal.css','a11y.js','lines.js','phrases.js'];
const MAXMEDIA=40; /* сколько картинок/музыки держим, чтобы не раздувать память телефона */
self.addEventListener('install',e=>{e.waitUntil(caches.open(V+'-shell').then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>0)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('tk-')&&!k.startsWith(V)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const limit=async(name,n)=>{const c=await caches.open(name),ks=await c.keys();for(let i=0;i<ks.length-n;i++)await c.delete(ks[i])};
const put=async(name,req,res)=>{if(res&&res.ok&&res.status===200){const c=await caches.open(name);await c.put(req,res.clone())}return res};
/* сеть сначала, кэш при обрыве или зависании: данные приглашения всегда свежие, когда сеть есть */
const netFirst=(req,name,ms)=>new Promise(async ok=>{let done=false;const fin=r=>{if(!done&&r){done=true;ok(r)}};
  const t=setTimeout(async()=>fin(await caches.match(req)),ms);
  try{const r=await fetch(req);clearTimeout(t);if(r.ok){put(name,req,r.clone());fin(r)}else{const c=await caches.match(req);fin(c||r)}}
  catch(_){clearTimeout(t);const c=await caches.match(req);fin(c||new Response('{}',{status:504,headers:{'content-type':'application/json'}}))}});
/* кэш сразу, обновление в фоне: скрипты, стили, шрифты, картинки */
const swr=(req,name,max)=>caches.match(req).then(hit=>{const net=fetch(req).then(async r=>{await put(name,req,r.clone());if(max)limit(name,max);return r}).catch(()=>hit);return hit||net});
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!=='GET')return;const u=new URL(q.url);
  if(q.headers.has('range'))return; /* музыку/видео по частям отдаёт сервер сам */
  if(u.pathname.includes('/inv/')&&u.pathname.endsWith('.json'))return e.respondWith(netFirst(q,V+'-data',2500));
  if(u.hostname.endsWith('workers.dev')&&q.url.includes('/api/inv'))return e.respondWith(netFirst(q,V+'-data',1500));
  if(q.mode==='navigate'&&/\/(i\.html|i\/[^/]*\/?)$/.test(u.pathname))return e.respondWith(netFirst(q,V+'-pages',2500));
  if(u.origin===location.origin&&/\.(js|css|svg|woff2?)$/.test(u.pathname))return e.respondWith(swr(q,V+'-shell'));
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com')return e.respondWith(swr(q,V+'-fonts'));
  if(u.origin===location.origin&&u.pathname.includes('/media/')&&/\.(jpe?g|png|webp|gif|mp3|m4a|ogg)$/.test(u.pathname))return e.respondWith(swr(q,V+'-media',MAXMEDIA));
  if(u.hostname==='images.unsplash.com')return e.respondWith(swr(q,V+'-media',MAXMEDIA));
});
