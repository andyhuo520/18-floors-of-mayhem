import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';

const delay=ms=>new Promise(r=>setTimeout(r,ms));
const root=new URL('../',import.meta.url);

test('every sliced Combos sprite referenced by the renderer is shipped and served',{timeout:20000},async()=>{
 const source=await readFile(new URL('public/sprites.js',root),'utf8');
 const groups=[...source.matchAll(/^\s*(items|beast|cave):\[(.*?)\],$/gm)].map(([,group,list])=>[group,[...list.matchAll(/'([^']+)'/g)].map(m=>m[1])]);
 assert.equal(groups.length,3,'sprites.js should declare every sliced sheet');
 const expected=Object.fromEntries(groups);
 assert.ok(expected.items.length>=12&&expected.cave.length>=12&&expected.beast.length>=8);

 // Names must match what the slicer actually produced, or a sheet silently falls back to procedural art.
 const manifest=JSON.parse(await readFile(new URL('public/combos-assets/sprites/manifest.json',root),'utf8'));
 for(const [group,names] of groups){
  const produced=new Set(manifest[group].map(e=>e.name));
  for(const name of names)assert.ok(produced.has(name),`${group}/${name} missing from the slicer manifest`);
 }

 // The renderer must only ask for sprites the server is willing to serve.
 const port=3194;
 const server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:'pipe'});
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  await delay(50);
  for(const [group,names] of groups)for(const name of names){
   const res=await fetch(`http://127.0.0.1:${port}/combos-assets/sprites/${group}/${name}.webp`);
   assert.equal(res.status,200,`${group}/${name} is not served`);
   assert.match(res.headers.get('content-type'),/image\/webp/);
   assert.ok((await res.arrayBuffer()).byteLength>200,`${group}/${name} is suspiciously small`);
  }
  const loader=await fetch(`http://127.0.0.1:${port}/sprites.js`);
  assert.equal(loader.status,200);
 }finally{server.kill('SIGTERM');}
});

test('generated sprite usage is recorded with its provenance',async()=>{
 const provenance=JSON.parse(await readFile(new URL('public/combos-assets/v2/provenance.json',root),'utf8'));
 assert.equal(provenance.model,'qwen-image-3-pro');
 assert.equal(provenance.type,'static_image');
 for(const key of ['heroes','items','beast','cave'])assert.ok(provenance.assets[key].asset_id,`${key} needs an asset id`);
 assert.ok(provenance.superseded.reason.length>20,'the discarded atlas batch should stay documented');
});
