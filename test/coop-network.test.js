import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {WebSocket} from 'ws';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function newCode(port){const res=await fetch(`http://127.0.0.1:${port}/room`,{method:'POST'});return (await res.json()).code;}
function client(port,code,intent='join'){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?room=${code}&intent=${intent}`);const history=[];ws.on('message',d=>history.push(JSON.parse(d)));return {ws,history,send:m=>ws.send(JSON.stringify(m)),async wait(type,predicate=()=>true,after=0){const end=Date.now()+8000;while(Date.now()<end){const m=history.slice(after).find(m=>m.type===type&&predicate(m));if(m)return m;await delay(15);}throw new Error('Timeout '+type);}};}
test('coop server enforces two slots, accepts support actions, ends on disconnect and replays cleanly',{timeout:20000},async()=>{
 const port=3192,server=spawn(process.execPath,['server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'}),clients=[];
 try{await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 const code=await newCode(port);const host=client(port,code,'create'),mate=client(port,code),extra=client(port,code);clients.push(host,mate,extra);const id=(await host.wait('hello')).id;await mate.wait('hello');await extra.wait('hello');
 host.send({type:'create',name:'水果搭子',rules:{mode:'coop'}});await host.wait('lobby');host.send({type:'start'});assert.match((await host.wait('error')).message,/2/);
 mate.send({type:'join',name:'搭子水果',code});await host.wait('lobby',m=>m.players.length===2);extra.send({type:'join',name:'多余的搭子',code});assert.match((await extra.wait('error')).message,/2 人/);
 host.send({type:'start'});await mate.wait('countdown');await host.wait('state');host.send({type:'input',eat:true});await host.wait('state',m=>m.game.players.find(p=>p.id===id).hp===2);host.send({type:'input'});mate.send({type:'input',pass:true});const passed=await host.wait('state',m=>m.game.players.some(p=>p.stats.passes===1));assert.equal(passed.game.rules.mode,'coop');assert.ok(passed.game.throws.length===1);
 mate.send({type:'leave'});await host.wait('state',m=>m.game.phase==='finished');extra.send({type:'join',name:'新搭子',code});await extra.wait('lobby');const mark=host.history.length;host.send({type:'start'});const replay=await host.wait('countdown',()=>true,mark);assert.ok(replay.game.players.every(p=>p.heart&&p.stats.passes===0));assert.equal(replay.game.teamMeters,0);
 }finally{for(const c of clients)c.ws.terminate();server.kill('SIGTERM');}
});
