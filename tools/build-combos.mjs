import {readdir,readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),source=path.join(root,'public'),out=path.join(root,'dist');
await mkdir(out,{recursive:true});
const binding=JSON.parse(await readFile('combos.json','utf8'));
if(!binding.worker?.runtime_url)throw Error('Missing deployed Worker');
const roots=(await readdir(source)).filter(x=>!x.startsWith('.'));
const pattern=new RegExp('([\\"\\\'`(])/('+roots.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?=[/\\"\\\'`)?#])','g');
async function copy(dir,relative=''){
 for(const e of await readdir(dir,{withFileTypes:true})){
  if(e.name.startsWith('.'))continue;
  const rel=path.join(relative,e.name),src=path.join(dir,e.name),dst=path.join(out,rel);
  if(e.isDirectory()){if(/^combos-assets\/v[1-4]$/.test(rel))continue;await copy(src,rel);continue;}
  if(relative==='character-art'&&e.name!=='odd-five-actions-v1.webp')continue;
  if(!/\.(js|css|html|webp|png|jpg|jpeg|gif|svg|woff2?|mp3|wav|ogg|m4a)$/.test(e.name)&&rel!=='combos-assets/sprites/manifest.json')continue;
  await mkdir(path.dirname(dst),{recursive:true});
  if(/\.(js|css|html)$/.test(e.name)){
   let s=(await readFile(src,'utf8')).replace(pattern,'$1./$2').replaceAll('href="/"','href="./"');
   if(rel==='index.html')s=s.replace('<head>','<head><script>window.MAN18_RUNTIME_URL='+JSON.stringify(binding.worker.runtime_url)+'</script>');
   await writeFile(dst,s);
  }else await copyFile(src,dst);
 }
}
await copy(source);console.log('Built public game into dist');
