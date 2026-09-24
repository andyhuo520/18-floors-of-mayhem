import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {spawn} from 'node:child_process';
import {makeGame,step} from '../public/engine.js';
import {observe,SYSTEM_PROMPT,ACTION_SCHEMA} from '../public/ai/observe.js';
import {parseDecision,PROVIDERS} from '../public/ai/providers.js';
import {candidates} from '../public/ai/controller.js';

const roster=n=>Array.from({length:n},(_,i)=>({id:'p'+i,name:'猛男'+i,look:{}}));

test('an observation shows only what the player could actually act on',()=>{
 const g=makeGame(roster(3),2024,{mode:'brawl'});
 for(let i=0;i<60*5;i++)step(g,{});
 const me=g.players[0];
 const view=observe(g,me);

 assert.equal(view.mode,'brawl');
 assert.equal(view.me.hp,me.hp);
 assert.equal(view.me.carry,me.carry);
 assert.ok(view.me.corridor.height!==undefined,'the corridor is the survival problem; it must be visible');

 const reachableIds=new Set(candidates(g,me).map(f=>f.id));
 for(const f of view.reachable)assert.ok(reachableIds.has(f.id),`platform ${f.id} is not actually reachable`);
 assert.ok(view.reachable.length<=8,'the view stays small enough to send every decision');
 // Positions are relative so the model never has to do coordinate arithmetic.
 for(const f of view.reachable)assert.ok(f.down>0,'everything offered is below the player');

 for(const r of view.rivals){
  assert.notEqual(r.id,me.id,'a player is not their own rival');
  assert.equal(typeof r.dx,'number');
 }
});

test('an observation never leaks a rival that is out of play',()=>{
 const g=makeGame(roster(3),2024,{mode:'brawl'});
 g.players[1].alive=false;
 const view=observe(g,g.players[0]);
 assert.ok(!view.rivals.some(r=>r.id==='p1'));
});

test('the prompt tells the model the things it cannot infer from the state',()=>{
 assert.match(SYSTEM_PROMPT,/危险线/,'standing still being fatal is not visible in the numbers');
 assert.match(SYSTEM_PROMPT,/控制器/,'the model must know it is not driving frame by frame');
 assert.match(SYSTEM_PROMPT,/背包容量 1/,'inventory capacity changes every item decision');
 assert.match(SYSTEM_PROMPT,/落地即入包|货架/,'pickup-by-going-there is the rule models kept missing');
 assert.match(ACTION_SCHEMA,/"go"/);
 assert.match(ACTION_SCHEMA,/shopping/i,'go doubles as the pickup action');
 assert.match(ACTION_SCHEMA,/HELPS/,'throwing a heart at a rival helping them is the key trap');
});

test('a decision survives the ways models actually wrap JSON',()=>{
 const plain=parseDecision('{"go":7,"item":"throw","target":"p2","why":"打领先的"}');
 assert.deepEqual(plain,{go:7,item:'throw',target:'p2',plan:null,why:'打领先的'});

 const fenced=parseDecision('```json\n{"go": 3, "item": null, "target": null, "why": "往下"}\n```');
 assert.equal(fenced.go,3);
 assert.equal(fenced.item,null);

 const chatty=parseDecision('Sure! Here is my move:\n{"go":5,"item":"use","why":"补血"}\nHope that helps.');
 assert.equal(chatty.go,5);
 assert.equal(chatty.item,'use');

 assert.equal(parseDecision('I cannot decide'),null,'prose with no object is a miss, not a crash');
 assert.equal(parseDecision('{broken'),null);
 assert.equal(parseDecision(''),null);
 // An invented action must not reach the controller.
 assert.equal(parseDecision('{"go":1,"item":"nuke"}').item,null);
});

test('a System One request never carries a Choice with no options',async()=>{
 const {buildJevQuestions,buildJevState,worthAsking}=await import('../public/ai/observe.js');
 // Carrying an item makes a tick worth asking about even when nothing is reachable; building `go`
 // anyway sent an empty criteria map and the API answered 400 mid-match.
 const view=n=>({me:{hp:1,maxHp:3,carry:'poison',shield:false,corridor:{height:300},metres:40},
  reachable:Array.from({length:n},(_,i)=>({id:i,dx:0,down:150,w:150,type:'solid'})),
  rivals:[{id:'r',name:'对手',dx:10,dy:0,hp:1,shield:false}],alive:2});
 for(const n of [0,1,2,3]){
  const qs=buildJevQuestions(view(n));
  for(const [id,q] of Object.entries(qs))
   if(q.type==='choice')assert.ok(Object.keys(q.criteria).length>0,`question ${id} has no options at reachable=${n}`);
  assert.equal('go' in qs,n>=2,`a platform choice only exists when there are platforms to choose between (reachable=${n})`);
 }
 // No reachable ledge and empty hands is nothing to decide at all.
 const idle={...view(0),me:{...view(0).me,carry:null}};
 assert.equal(worthAsking(idle),false);
 assert.equal(worthAsking(view(0)),true,'an item in hand is still a decision');
 assert.ok(buildJevState(view(2)).可去的平台['0'],'the state names each ledge by the id the choice uses');
});

test('a lone survivor still throws poison, so the hand is free for a heart',async()=>{
 const {itemIntentFromAnswers}=await import('../public/ai/agent.js');
 // No rivals → the `target` question is not asked → there is no target answer. The throw must
 // still happen: the engine picks a direction, and holding poison forever blocks every pickup.
 assert.deepEqual(itemIntentFromAnswers({item_action:{choice:'throw'}}),{do:'throw',target:null});
 assert.deepEqual(itemIntentFromAnswers({item_action:{choice:'throw'},target:{choice:'b'}}),{do:'throw',target:'b'});
 assert.deepEqual(itemIntentFromAnswers({item_action:{choice:'use'}}),{do:'use'});
 assert.equal(itemIntentFromAnswers({item_action:{choice:'hold'}}),null);
 assert.equal(itemIntentFromAnswers({}),null);
});

test('the decision feed formats every record kind without touching the DOM',async()=>{
 const {formatRecord}=await import('../public/ai/feed.js');
 const agent={id:'s1',config:{name:'Jev·1'}};
 const view={me:{hp:1,maxHp:3,carry:'poison',corridor:{height:280}},reachable:[{id:4,type:'solid'},{id:9,type:'crumble',item:'heart'}],rivals:[]};
 const think=formatRecord(agent,{kind:'think',t:12.34,model:'jev-latest',ms:388,view,acted:true,
  answers:{go:{choice:'9',confidence:.91,probabilities:{'4':.09,'9':.91}},item_action:{choice:'throw',probabilities:{throw:.8}}}});
 assert.equal(think.cls,'think');
 assert.match(think.head,/Jev·1 · jev-latest · 388ms/);
 assert.ok(think.lines.some(l=>/go → #9 crumble 有红心 91%/.test(l)),think.lines.join('|'));
 assert.ok(think.lines.some(l=>/item → throw 80%/.test(l)));
 // An LLM seat carries plan/why instead of probabilities.
 const llm=formatRecord(agent,{kind:'think',t:3,model:'glm-5.3',ms:1200,view,decision:{go:4,item:'use',target:null,plan:'先回血',why:'血少'}});
 assert.ok(llm.lines.some(l=>l==='计划：先回血'));
 assert.ok(llm.lines.some(l=>/go → 4 · item → use · 血少/.test(l)));
 assert.equal(formatRecord(agent,{kind:'skip',t:1,reachable:1,carry:null}).cls,'skip');
 assert.match(formatRecord(agent,{kind:'exec',t:1,action:'throw',carry:'poison',target:null}).lines[0],/投掷 毒果（无目标，顺手扔）/);
 assert.match(formatRecord(agent,{kind:'engine',t:1,text:'生命已满，红心保留在背包'}).lines[0],/引擎：生命已满/);
 assert.equal(formatRecord(agent,{kind:'error',t:1,text:'502'}).cls,'error');
});

test('an agent reports its decisions and the engine lines about itself through onDecision',async()=>{
 const {Agent}=await import('../public/ai/agent.js');
 const {makeGame,step}=await import('../public/engine.js');
 const records=[];
 const agent=new Agent({provider:'custom',model:'stub',apiKey:'',intervalMs:50,name:'桩',
  decide:()=>({go:null,item:'throw',target:null,why:'测试'})},{onDecision:(a,r)=>records.push(r)});
 agent.id='a';
 const g={...makeGame([{id:'a',name:'桩',ai:true},{id:'b',name:'B'}],5,{mode:'brawl'}),nextBossDepth:Infinity};
 agent.ws={readyState:1,send(){}};
 agent.game=g;agent.state='playing';
 await agent.think();                           // stub decision → pendingItem
 agent.receive({type:'state',game:g});          // drive() sends the throw and reports exec
 const kinds=records.map(r=>r.kind);
 assert.ok(kinds.includes('think'),'the decision itself is reported');
 assert.ok(kinds.includes('exec'),'sending the item input is reported');
 // Engine narration addressed to this player rides along, and is never repeated.
 g.events.push({id:999,t:g.t,playerId:'a',text:'毒果出手了，接好',title:'出手了的男人'});
 agent.receive({type:'state',game:g});agent.receive({type:'state',game:g});
 assert.equal(records.filter(r=>r.kind==='engine'&&r.text==='毒果出手了，接好').length,1);
 agent.leave();
});

test('a System One seat learns by selecting maxims, and reads its own history back',async()=>{
 const {MAXIMS,buildReflectionQuestions,selectMaxims,summariseHistory,describeReport}=await import('../public/ai/maxims.js');
 const {buildJevQuestions,buildJevState}=await import('../public/ai/observe.js');
 const {recordHistory,getHistory}=await import('../public/ai/standings.js');
 // The library is well-formed: unique ids, short lines (they are injected into instructions).
 assert.equal(new Set(MAXIMS.map(m=>m.id)).size,MAXIMS.length);
 for(const m of MAXIMS)assert.ok(m.text.length<=20&&m.when,`${m.id} needs a short text and a condition`);
 // One Noul per maxim rides in a single post-match request.
 const qs=buildReflectionQuestions();
 assert.equal(Object.keys(qs).length,MAXIMS.length);
 assert.ok(Object.values(qs).every(q=>q.type==='noul'&&/`战报`/.test(q.instructions)));
 // The report the maxims judge uses the very field names their conditions cite.
 const rep=describeReport({rank:1,meters:395,reason:'摔死',hp:1,heals:0,throwHits:0,hitsTaken:0,carriedAtEnd:'poison',passes:0});
 assert.equal(rep.终局手持,'毒果');assert.equal(rep.名次,'第 1 名');assert.equal(rep.毒果命中次数,0);assert.equal(rep.是否独自存活到最后,'否');
 assert.equal(describeReport({aloneAtEnd:true}).是否独自存活到最后,'是');
 for(const m of MAXIMS)for(const f of m.when.match(/`([^`]+)`/g)||[])assert.ok(f==='`战报`'||f.slice(1,-1) in rep,`${m.id} cites ${f}, which the report does not carry`);
 // Selection: threshold, cap, strongest first, unknown ids ignored.
 const answers={poison_dump:{noul:.92},heart_first:{noul:.7},spikes_never:{noul:.3},ghost:{noul:.99}};
 assert.deepEqual(selectMaxims(answers).map(m=>m.id),['poison_dump','heart_first']);
 assert.equal(selectMaxims(Object.fromEntries(MAXIMS.map(m=>[m.id,{noul:.9}]))).length,5,'never more than the five-line cap');
 // Selected maxims reach both decisions' instructions, numbered like the LLM seats' notes.
 const view={me:{hp:1,maxHp:3,carry:'poison',shield:false,corridor:{height:280},metres:40,stats:{heals:1,hits:0,passes:2,throwHits:1}},
  reachable:[{id:1,dx:0,down:150,w:150,type:'solid'},{id:2,dx:90,down:160,w:150,type:'crumble'}],rivals:[],alive:1};
 const q=buildJevQuestions(view,'',['独活时先扔掉毒果腾出手','血不满时红心优先于下降']);
 assert.match(q.go.instructions,/战训，优先执行：1\. 独活时先扔掉毒果腾出手；2\. 血不满时红心优先于下降/);
 assert.match(q.item_action.instructions,/1\. 独活时先扔掉毒果腾出手/);
 assert.ok(!/战训/.test(buildJevQuestions(view,'',[]).go.instructions),'no lessons, no lesson line');
 // History: last three reports per seat, read back as sentences in the state.
 const store=(()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};})();
 for(let i=1;i<=4;i++)recordHistory(store,'typesafe/jev-latest',{meters:i*100,reason:'摔死',throwHits:i,heals:0,hitsTaken:1,rank:2});
 const hist=getHistory(store,'typesafe/jev-latest');
 assert.deepEqual(hist.map(h=>h.meters),[200,300,400]);
 const st=buildJevState(view,{history:hist});
 assert.equal(st.经历.本局至今,'吃心 1 次 · 扔道具 2 次 · 命中 1 次');
 assert.equal(st.经历.最近几局.length,3);
 assert.match(st.经历.最近几局[0],/^上一局：400m · 摔死 · 毒果命中 4 次/);
 assert.equal(buildJevState(view).经历.最近几局,undefined,'a first match carries no history line');
 assert.match(summariseHistory([{meters:50,reason:'吃了毒果'}])[0],/上一局：50m · 吃了毒果/);
});

test('an AI battle is watched, not played: the host spectates and takes no seat',{timeout:15000},async()=>{
 const port=3198;
 const server=spawn(process.execPath,['server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
 const open=(code,intent)=>new Promise((res,rej)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?room=${code}&intent=${intent}`);const got=[];ws.on('message',d=>got.push(JSON.parse(d)));ws.on('open',()=>res({ws,got,send:m=>ws.send(JSON.stringify(m)),
  wait:(type,pred=()=>true)=>new Promise((ok,no)=>{const t0=Date.now();const tick=()=>{const m=got.find(x=>x.type===type&&pred(x));if(m)return ok(m);if(Date.now()-t0>6000)return no(new Error('timeout '+type));setTimeout(tick,20);};tick();})}));ws.on('error',rej);});
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  const code=(await (await fetch(`http://127.0.0.1:${port}/room`,{method:'POST'})).json()).code;
  const host=await open(code,'create');const hello=await host.wait('hello');
  host.send({type:'create',name:'看台',look:{},rules:{mode:'brawl'},spectate:true});
  let lobby=await host.wait('lobby');
  assert.equal(lobby.host,hello.id,'a spectator can still own the room');
  assert.equal(lobby.players.find(p=>p.id===hello.id).spectator,true,'the lobby says who is only watching');
  // One AI is not a match: the spectator does not count toward the two-player minimum.
  const a=await open(code,'join');await a.wait('hello');a.send({type:'join',ai:true,name:'A',look:{}});await host.wait('lobby',m=>m.players.length===2);
  host.send({type:'start'});
  assert.match((await host.wait('error')).message,/至少需要 2 位玩家/);
  const b=await open(code,'join');await b.wait('hello');b.send({type:'join',ai:true,name:'B',look:{}});await host.wait('lobby',m=>m.players.length===3);
  host.send({type:'start'});
  const cd=await host.wait('countdown');
  assert.deepEqual(cd.game.players.map(p=>p.name).sort(),['A','B'],'the match roster holds only the seats');
  assert.ok(!cd.game.players.some(p=>p.id===hello.id),'the host is nowhere in the match, so nobody dies on the starting ledge for nothing');
  a.ws.close();b.ws.close();host.ws.close();
 }finally{server.kill('SIGTERM');}
});

test('every provider preset carries what a request needs',()=>{
 for(const [key,preset] of Object.entries(PROVIDERS)){
  assert.ok(['openai','anthropic','typesafe'].includes(preset.kind),`${key} needs a known wire format`);
  assert.ok(preset.label,`${key} needs a label`);
  if(key!=='custom')assert.match(preset.base,/^https:\/\//,`${key} must call an https endpoint`);
 }
});

test('the local relay refuses anything it should not forward',{timeout:15000},async()=>{
 const port=3196;
 const server=spawn(process.execPath,['server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  const post=body=>fetch(`http://127.0.0.1:${port}/ai/complete`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

  assert.equal((await post({base:'https://api.example.com',path:'/v1/x'})).status,400,'a call with no key is refused');
  // Without this the relay would happily fetch any internal address on the host network.
  assert.equal((await post({apiKey:'k',base:'http://169.254.169.254',path:'/latest'})).status,400,'plain http is refused');
  assert.equal((await post({apiKey:'k',base:'https://api.example.com',path:'/v1/../../etc/passwd'})).status,400,'a traversal path is refused');
  assert.equal((await post({apiKey:'k',base:'https://api.example.com',path:'not-a-path'})).status,400);

  const files=await fetch(`http://127.0.0.1:${port}/ai/agent.js`);
  assert.equal(files.status,200,'the agent module is served');
 }finally{server.kill('SIGTERM');}
});

test('an agent plays a real match through the server without any model',{timeout:40000},async()=>{
 const {WebSocket}=await import('ws');
 globalThis.WebSocket=WebSocket;
 const {Agent}=await import('../public/ai/agent.js');
 const {bestTarget}=await import('../public/ai/controller.js');
 const delay=ms=>new Promise(r=>setTimeout(r,ms));

 const port=3197;
 const server=spawn(process.execPath,['server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
 const agents=[];let host;
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  const HTTP=`http://127.0.0.1:${port}`,WS=`ws://127.0.0.1:${port}`;
  const code=(await (await fetch(HTTP+'/room',{method:'POST'})).json()).code;

  host=new WebSocket(`${WS}/ws?room=${code}&intent=create`);
  const inbox=[];host.on('message',d=>inbox.push(JSON.parse(d)));
  const wait=async(type,pred=()=>true,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){const m=inbox.find(m=>m.type===type&&pred(m));if(m)return m;await delay(20);}throw new Error('timeout '+type);};
  await wait('hello');
  host.send(JSON.stringify({type:'create',name:'裁判',rules:{mode:'brawl'}}));
  await wait('lobby');

  // Stands in for a model: pick a platform, and throw whatever is carried at whoever is ahead.
  const decide=(game,me)=>{
   const target=bestTarget(game,me);
   const rivals=game.players.filter(p=>p.id!==me.id&&p.alive&&!p.downed);
   const mark=rivals.length?rivals.reduce((a,b)=>b.meters>a.meters?b:a):null;
   return {go:target?target.id:null,
    item:me.carry==='poison'&&mark?'throw':me.carry?'use':null,
    target:mark?.id??null,why:'测试策略'};
  };
  for(const name of ['测试甲','测试乙']){
   const agent=new Agent({decide,name,intervalMs:400});
   agents.push(agent);agent.join(WS,code);await delay(250);
  }
  await wait('lobby',m=>m.players.length===3);

  host.send(JSON.stringify({type:'start'}));
  await wait('countdown');
  await delay(12000);

  const state=inbox.filter(m=>m.type==='state').at(-1);
  assert.ok(state,'the match produced authoritative state');
  for(const agent of agents){
   const player=state.game.players.find(p=>p.id===agent.id);
   assert.ok(player,'the agent is a real player in the room');
   assert.ok(agent.stats.calls>5,`agent only decided ${agent.stats.calls} times`);
   assert.equal(agent.stats.errors,0,agent.stats.lastError);
  }
  const best=Math.max(...agents.map(a=>state.game.players.find(p=>p.id===a.id)?.meters??0));
  // An agent that cannot descend would sit at the top and be caught by the danger line almost at once.
  const earlyWin=state.game.phase==='finished'&&state.game.players.filter(p=>p.alive).length===1;
  // Last-survivor brawls now finish immediately; a legal early victory may precede 60m.
  assert.ok(best>(earlyWin?15:60),`agents barely moved: best was ${best} m`);
  if(earlyWin)assert.ok(state.game.result.some(r=>r.rank===1&&agents.some(a=>a.id===r.id)));
 }finally{
  for(const agent of agents)agent.leave();
  try{host?.close();}catch{}
  server.kill('SIGTERM');
 }
});

test('every hand-plotted badge grid is rectangular and uses known colours',async()=>{
 const {BADGE_ART,VENDOR_BADGE,GRID,FLAG_W,FLAG_H}=await import('../public/ai/badges.js');
 const {MARKS,FLAGS,PALETTE}=BADGE_ART;

 for(const [name,rows] of Object.entries(MARKS)){
  assert.equal(rows.length,GRID,`${name} needs ${GRID} rows`);
  rows.forEach((row,i)=>{
   // A row of the wrong length silently shears the whole picture, so it is caught here instead.
   assert.equal(row.length,GRID,`${name} row ${i} is ${row.length} wide, expected ${GRID}`);
   for(const ch of row)assert.ok(ch in PALETTE,`${name} row ${i} uses unknown colour "${ch}"`);
  });
 }
 for(const [name,rows] of Object.entries(FLAGS)){
  assert.equal(rows.length,FLAG_H,`flag ${name} needs ${FLAG_H} rows`);
  for(const row of rows)assert.equal(row.length,FLAG_W,`flag ${name} row is ${row.length} wide`);
 }

 // Every provider the panel can offer needs a badge, and every badge needs art behind it.
 const {PROVIDERS:offered}=await import('../public/ai/providers.js');
 for(const key of Object.keys(offered)){
  const badge=VENDOR_BADGE[key];
  assert.ok(badge,`${key} has no badge`);
  assert.ok(MARKS[badge.mark],`${key} points at missing art "${badge.mark}"`);
  if(badge.flag)assert.ok(FLAGS[badge.flag],`${key} points at missing flag "${badge.flag}"`);
 }
 assert.equal(VENDOR_BADGE.glm.home,'中国');
 assert.equal(VENDOR_BADGE.anthropic.home,'美国');
});

test('each vendor has its own character, so switching model changes the avatar',async()=>{
 const {readFile}=await import('node:fs/promises');
 const src=await readFile(new URL('../public/ai/panel.js',import.meta.url),'utf8');
 const {PROVIDERS:offered}=await import('../public/ai/providers.js');
 const {TRAITS}=await import('../public/appearance.js');

 const table=src.match(/const VENDOR_LOOK=\{([\s\S]*?)\n\};/);
 assert.ok(table,'the panel must map vendors to characters');
 const entries=[...table[1].matchAll(/['\"]?([\w-]+)['\"]?:\{fruit:(\d+),animal:(\d+)\}/g)]
  .map(([,key,fruit,animal])=>({key,fruit:Number(fruit),animal:Number(animal)}));

 for(const key of Object.keys(offered))
  assert.ok(entries.some(e=>e.key===key),`${key} has no character; its slot would keep the previous one`);
 for(const e of entries){
  assert.ok(e.fruit<TRAITS.fruit.length,`${e.key} fruit ${e.fruit} is out of range`);
  assert.ok(e.animal<TRAITS.animal.length,`${e.key} animal ${e.animal} is out of range`);
 }
 // Two vendors sharing a character would make them indistinguishable during a match.
 const pairs=entries.map(e=>e.fruit+'/'+e.animal);
 assert.equal(new Set(pairs).size,pairs.length,'two vendors share the same character');

 // Changing vendor must ALWAYS change the avatar — an unconditional rebuild, no opt-outs. A
 // "keep my manual re-roll" guard here once made the avatar silently stop following the vendor.
 assert.match(src,/look=lookFor\(provider\.value,i\);paintFace\(\);/);
 assert.ok(!/custom=true/.test(src),'no flag may decouple the avatar from the vendor');
 // A re-roll may only vary the trim: species stays locked to the vendor.
 assert.match(src,/randomLook\(\{fruit:true,animal:true\}/);
});
