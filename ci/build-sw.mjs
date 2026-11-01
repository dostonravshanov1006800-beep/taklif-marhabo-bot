/* Ставит в sw.js версию = хэш содержимого файлов оболочки. Изменился любой скрипт или стиль, значит, у гостей кэш обновится сам. */
import fs from 'node:fs';import crypto from 'node:crypto';
const D=new URL('../docs/',import.meta.url).pathname;let s=fs.readFileSync(D+'sw.js','utf8');
const files=(s.match(/const SHELL=\[([^\]]*)\]/)[1].match(/'([^']+)'/g)||[]).map(x=>x.slice(1,-1));
const h=crypto.createHash('sha1');for(const f of [...files,'i.html'])h.update(fs.existsSync(D+f)?fs.readFileSync(D+f):'');
const ver=h.digest('hex').slice(0,8);s=s.replace(/const V='tk-[^']*'/,"const V='tk-"+ver+"'");fs.writeFileSync(D+'sw.js',s);console.log('sw версия',ver,'файлов',files.length);
