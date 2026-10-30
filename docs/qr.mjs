// Общий генератор QR (уровень M, версии 1-10). Используется и мини-аппом, и ботом.
  const EXP=new Array(512),LOG=new Array(256);
  (function(){let x=1;for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d}for(let i=255;i<512;i++)EXP[i]=EXP[i-255]})();
  const mul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
  const rsGen=n=>{let g=[1];for(let i=0;i<n;i++){const ng=new Array(g.length+1).fill(0);for(let j=0;j<g.length;j++){ng[j]^=g[j];ng[j+1]^=mul(g[j],EXP[i])}g=ng}return g};
  const rsEnc=(data,n)=>{const g=rsGen(n),r=new Array(n).fill(0);for(const d of data){const f=d^r[0];r.shift();r.push(0);if(f)for(let i=0;i<n;i++)r[i]^=mul(g[i+1],f)}return r};
  // версия -> [всего кодовых слов, EC на блок, блоков группы1, данных в блоке г1, блоков г2, данных в блоке г2] (уровень M)
  const VER={1:[26,10,1,16,0,0],2:[44,16,1,28,0,0],3:[70,26,1,44,0,0],4:[100,18,2,32,0,0],5:[134,24,2,43,0,0],6:[172,16,4,27,0,0],7:[196,18,4,31,0,0],8:[242,22,2,38,2,39],9:[292,22,3,36,2,37],10:[346,26,4,43,1,44]};
  const ALIGN={1:[],2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],7:[6,22,38],8:[6,24,42],9:[6,26,46],10:[6,28,50]};
  const FMT_M=0; // уровень M = 00
  const bch=(v,poly,bits)=>{let d=v<<bits;const hb=x=>31-Math.clz32(x);for(let i=hb(d);i>=hb(poly);i--)if(d&(1<<i))d^=poly<<(i-hb(poly));return (v<<bits)|d};
  const fmtBits=mask=>bch((FMT_M<<3)|mask,0x537,10)^0x5412;
  const verBits=v=>bch(v,0x1f25,12);
  function utf8(s){return Array.from(new TextEncoder().encode(s))}
  export function make(text){
    const bytes=utf8(text);let ver=0;
    for(let v=1;v<=10;v++){const d=VER[v];const cap=d[2]*d[3]+d[4]*d[5];const cc=v<10?8:16;if(4+cc+bytes.length*8<=cap*8){ver=v;break}}
    if(!ver)throw new Error('too long');
    const [tot,ecb,b1,d1,b2,d2]=VER[ver],cap=b1*d1+b2*d2,cc=ver<10?8:16;
    const bits=[];const push=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>i)&1)};
    push(4,4);push(bytes.length,cc);bytes.forEach(b=>push(b,8));
    push(0,Math.min(4,cap*8-bits.length));while(bits.length%8)bits.push(0);
    const data=[];for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=(b<<1)|bits[i+j];data.push(b)}
    for(let p=0;data.length<cap;p++)data.push(p%2?0x11:0xec);
    const blocks=[];let o=0;for(let i=0;i<b1;i++){blocks.push(data.slice(o,o+d1));o+=d1}for(let i=0;i<b2;i++){blocks.push(data.slice(o,o+d2));o+=d2}
    const ecs=blocks.map(b=>rsEnc(b,ecb));const out=[];const maxd=Math.max(d1,b2?d2:0);
    for(let i=0;i<maxd;i++)blocks.forEach(b=>{if(i<b.length)out.push(b[i])});
    for(let i=0;i<ecb;i++)ecs.forEach(e=>out.push(e[i]));
    const n=17+4*ver,M=[...Array(n)].map(()=>new Array(n).fill(null)),F=[...Array(n)].map(()=>new Array(n).fill(false));
    const set=(r,c,v,f=true)=>{if(r<0||c<0||r>=n||c>=n)return;M[r][c]=v;if(f)F[r][c]=true};
    const finder=(r,c)=>{for(let i=-1;i<=7;i++)for(let j=-1;j<=7;j++){const on=(i>=0&&i<=6&&(j===0||j===6))||(j>=0&&j<=6&&(i===0||i===6))||(i>=2&&i<=4&&j>=2&&j<=4);set(r+i,c+j,on)}};
    finder(0,0);finder(0,n-7);finder(n-7,0);
    for(let i=8;i<n-8;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
    const al=ALIGN[ver];for(const r of al)for(const c of al){if((r===6&&c===6)||(r===6&&c===al[al.length-1])||(c===6&&r===al[al.length-1]))continue;for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)set(r+i,c+j,Math.max(Math.abs(i),Math.abs(j))!==1)}
    set(n-8,8,true);
    for(let i=0;i<9;i++){if(!F[8][i])set(8,i,false);if(!F[i][8])set(i,8,false)}for(let i=0;i<8;i++){set(8,n-1-i,false);set(n-1-i,8,false)}
    if(ver>=7){const vb=verBits(ver);for(let i=0;i<18;i++){const b=!!((vb>>i)&1);set(Math.floor(i/3),n-11+(i%3),b);set(n-11+(i%3),Math.floor(i/3),b)}}
    const dbits=[];out.forEach(b=>{for(let i=7;i>=0;i--)dbits.push((b>>i)&1)});
    const masks=[(r,c)=>(r+c)%2===0,(r,c)=>r%2===0,(r,c)=>c%3===0,(r,c)=>(r+c)%3===0,(r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,(r,c)=>(r*c)%2+(r*c)%3===0,(r,c)=>((r*c)%2+(r*c)%3)%2===0,(r,c)=>((r+c)%2+(r*c)%3)%2===0];
    function place(mask){const G=M.map(r=>r.slice());let k=0,up=true;for(let c=n-1;c>0;c-=2){if(c===6)c--;for(let t=0;t<n;t++){const r=up?n-1-t:t;for(let d=0;d<2;d++){const cc=c-d;if(F[r][cc])continue;let v=k<dbits.length?!!dbits[k]:false;k++;if(masks[mask](r,cc))v=!v;G[r][cc]=v}}up=!up}
      const f=fmtBits(mask);for(let i=0;i<15;i++){const b=!!((f>>i)&1);if(i<6)G[i][8]=b;else if(i<8)G[i+1][8]=b;else G[n-15+i][8]=b;if(i<8)G[8][n-1-i]=b;else if(i<9)G[8][15-i]=b;else G[8][15-i-1]=b}G[n-8][8]=true;return G}
    const pen=G=>{let p=0;for(let r=0;r<n;r++){let run=1;for(let c=1;c<n;c++){if(G[r][c]===G[r][c-1])run++;else{if(run>=5)p+=run-2;run=1}}if(run>=5)p+=run-2}for(let c=0;c<n;c++){let run=1;for(let r=1;r<n;r++){if(G[r][c]===G[r-1][c])run++;else{if(run>=5)p+=run-2;run=1}}if(run>=5)p+=run-2}
      for(let r=0;r<n-1;r++)for(let c=0;c<n-1;c++)if(G[r][c]===G[r][c+1]&&G[r][c]===G[r+1][c]&&G[r][c]===G[r+1][c+1])p+=3;let dark=0;G.forEach(r=>r.forEach(v=>v&&dark++));p+=Math.floor(Math.abs(dark*100/(n*n)-50)/5)*10;return p};
    let best=null,bp=1e9;for(let m=0;m<8;m++){const G=place(m);const p=pen(G);if(p<bp){bp=p;best=G}}
    return {size:n,get:(r,c)=>best[r][c]};
  }

// PNG-кодировщик для Node (только встроенный zlib). Возвращает Buffer.
export async function png(text, px = 720, fg = [43, 34, 25], bg = [255, 255, 255]) {
  const { deflateSync } = await import('node:zlib');
  const q = make(text), quiet = 4, cells = q.size + quiet * 2, sc = Math.max(1, Math.floor(px / cells)), size = cells * sc;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1); raw[row] = 0;
    const r = Math.floor(y / sc) - quiet;
    for (let x = 0; x < size; x++) {
      const c = Math.floor(x / sc) - quiet, on = r >= 0 && c >= 0 && r < q.size && c < q.size && q.get(r, c), col = on ? fg : bg, o = row + 1 + x * 3;
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2];
    }
  }
  const crcT = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c; }
  const crc = (buf) => { let c = -1; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => { const t = Buffer.from(type), len = Buffer.alloc(4), cr = Buffer.alloc(4); len.writeUInt32BE(data.length); cr.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
