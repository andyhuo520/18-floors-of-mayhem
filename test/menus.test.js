import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');

test('the custom listbox is shipped, served and applied to every select',{timeout:15000},async()=>{
 const app=await read('public/app.js');
 assert.match(app,/import\s*\{\s*enhanceSelects\s*\}\s*from '\.\/pixel-select\.js'/,'the client imports the listbox');
 assert.match(app,/enhanceSelects\(\)/,'and runs it during boot');

 const port=3195;
 const server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:'pipe'});
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  const res=await fetch(`http://127.0.0.1:${port}/pixel-select.js`);
  assert.equal(res.status,200,'the module is on the served allowlist');
  assert.match(res.headers.get('content-type'),/text\/javascript/);
 }finally{server.kill('SIGTERM');}
});

test('nothing reaches a select label through sibling position any more',async()=>{
 // pixel-select.js wraps each <select>, so its previous sibling is the listbox, not its label.
 // Any previousElementSibling lookup would silently hide the menu instead of the label.
 const app=await read('public/app.js');
 assert.ok(!app.includes('previousElementSibling'),'labels must be found by their `for` attribute');
 const html=await read('public/index.html');
 for(const id of ['match-duration','room-duration'])
  assert.ok(html.includes(`for="${id}"`),`${id} needs a label to target`);
});

test('the native select is kept as the value holder but hidden from assistive tech',async()=>{
 const src=await read('public/pixel-select.js');
 assert.match(src,/select\.setAttribute\('aria-hidden','true'\)/);
 assert.match(src,/select\.tabIndex=-1/);
 assert.match(src,/role','listbox'/);
 assert.match(src,/aria-expanded/);
 // Assigning `.value` in application code has to repaint the visible control.
 assert.match(src,/Object\.defineProperty\(select,'value'/);
 // And a selection must still look like a normal change event to existing listeners.
 assert.match(src,/dispatchEvent\(new Event\('change'/);
 const css=await read('public/style.css');
 assert.match(css,/\.pixel-select-list/);
 assert.match(css,/\.pixel-select-native/);
});
