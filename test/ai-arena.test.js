import test from 'node:test';
import assert from 'node:assert/strict';
import {recordMatch,topStandings} from '../public/ai/standings.js';
import {MODEL_CHOICES,PROVIDERS} from '../public/ai/providers.js';
import {Room,sanitizeBadge} from '../shared/room.js';
import {makeGame,eliminate,step} from '../public/engine.js';

const fakeStorage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};

test('the standings board ranks by win rate, then depth, and never double-counts a match',()=>{
 const store=fakeStorage();
 assert.equal(recordMatch(store,'seed:1',[
  {provider:'glm',model:'glm-4.6',meters:900,rank:1},
  {provider:'anthropic',model:'claude-sonnet-5',meters:1400,rank:2},
 ]),true);
 assert.equal(recordMatch(store,'seed:1',[{provider:'glm',model:'glm-4.6',meters:99999,rank:1}]),false,
  'the same finished game arriving twice must not double-count');
 recordMatch(store,'seed:2',[
  {provider:'glm',model:'glm-4.6',meters:700,rank:2},
  {provider:'anthropic',model:'claude-sonnet-5',meters:800,rank:1},
 ]);
 const rows=topStandings(store);
 assert.equal(rows.length,2);
 // Both are 1 win / 2 matches; Claude's average depth is higher, so it leads.
 assert.equal(rows[0].provider,'anthropic');
 assert.equal(rows[0].wins,1);assert.equal(rows[0].matches,2);
 assert.equal(rows[0].avgMeters,1100);
 assert.equal(rows[1].avgMeters,800);
 // A lab that always wins outranks a deeper lab that loses.
 recordMatch(store,'seed:3',[{provider:'deepseek',model:'deepseek-chat',meters:300,rank:1}]);
 assert.equal(topStandings(store)[0].provider,'deepseek');
});

test('every vendor offers model choices and its default is offered or typable',()=>{
 for(const key of Object.keys(PROVIDERS)){
  assert.ok(key in MODEL_CHOICES,`${key} has no model list`);
  const preset=PROVIDERS[key];
  if(MODEL_CHOICES[key].length)
   assert.ok(MODEL_CHOICES[key].includes(preset.model),`${key} default ${preset.model} is not in its own dropdown`);
 }
});

test('a vendor badge rides the whole pipeline: join, lobby, match state, final ranking',()=>{
 assert.equal(sanitizeBadge('anthropic'),'anthropic');
 assert.equal(sanitizeBadge('<script>'),null,'anything off the whitelist is treated as absent');
 assert.equal(sanitizeBadge(undefined),null);

 const sent=[];
 const sock=()=>({readyState:1,send:d=>sent.push(JSON.parse(d))});
 const r=new Room('ABC123');r.claimed=true;
 const a=sock(),b=sock();
 r.attach(a);r.handle(a,JSON.stringify({type:'create',name:'裁判',rules:{mode:'brawl'}}));
 r.attach(b);r.handle(b,JSON.stringify({type:'join',name:'AI选手',badge:'deepseek'}));
 const lobby=sent.filter(m=>m.type==='lobby').at(-1);
 assert.equal(lobby.players.find(p=>p.name==='AI选手').badge,'deepseek');
 assert.equal(lobby.players.find(p=>p.name==='裁判').badge,null,'humans carry no badge');

 r.handle(a,JSON.stringify({type:'start'}));
 const countdown=sent.filter(m=>m.type==='countdown').at(-1);
 const player=countdown.game.players.find(p=>p.name==='AI选手');
 assert.equal(player.badge,'deepseek','the badge reaches the players everyone renders');

 for(const p of countdown.game.players)eliminate(countdown.game,p,'测试');
 step(countdown.game,{});
 const ranked=countdown.game.result.find(p=>p.name==='AI选手');
 assert.equal(ranked.badge,'deepseek','the final ranking still knows which lab this was');
});

test('a pasted full endpoint URL still works as a base',async()=>{
 const {normaliseBase}=await import('../public/ai/providers.js');
 // Groq's docs hand out the completions URL; appending our own path onto it produced
 // /chat/completions/chat/completions and a 404.
 assert.equal(normaliseBase('https://api.groq.com/openai/v1/chat/completions'),'https://api.groq.com/openai/v1');
 assert.equal(normaliseBase('https://api.groq.com/openai/v1/'),'https://api.groq.com/openai/v1');
 assert.equal(normaliseBase('https://api.anthropic.com/v1/messages'),'https://api.anthropic.com/v1');
 assert.equal(normaliseBase('https://api.deepseek.com/v1/models'),'https://api.deepseek.com/v1');
 assert.equal(normaliseBase('  https://open.bigmodel.cn/api/coding/paas/v4  '),'https://open.bigmodel.cn/api/coding/paas/v4');
 // Only endpoint suffixes are trimmed; real path segments stay.
 assert.equal(normaliseBase('https://api.groq.com/openai/v1'),'https://api.groq.com/openai/v1');
});

test('lessons survive between matches, capped, and ride into the next system prompt',async()=>{
 const {recordLessons,getLessons}=await import('../public/ai/standings.js');
 const {buildSystemPrompt,buildReflectionPrompt}=await import('../public/ai/observe.js');
 const store=fakeStorage();
 recordLessons(store,'glm/glm-5.3',['血不满先拿红心','别在碎台停留']);
 recordLessons(store,'glm/glm-5.3',['a','b','c','d']);
 const lessons=getLessons(store,'glm/glm-5.3');
 assert.equal(lessons.length,5,'memory is five lines, not a diary');
 assert.equal(lessons[0],'别在碎台停留','oldest lessons fall off first');
 assert.deepEqual(getLessons(store,'deepseek/x'),[],'lessons are per model');

 const prompt=buildSystemPrompt(lessons);
 assert.ok(prompt.includes('战训')&&prompt.includes('别在碎台停留'),'the next match reads them');
 assert.match(buildReflectionPrompt({rank:2,meters:800}),/JSON 字符串数组/);
});

test('reflection output is salvaged from the shapes models actually produce',async()=>{
 const {parseLessonList}=await import('../public/ai/providers.js');
 assert.deepEqual(parseLessonList('["先拿红心","别恋战"]'),['先拿红心','别恋战']);
 assert.deepEqual(parseLessonList('好的，总结如下：\n```json\n["盾要立刻穿"]\n```'),['盾要立刻穿']);
 assert.deepEqual(parseLessonList('我没有教训'),[]);
 assert.equal(parseLessonList('["a","b","c","d","e","f"]').length,5,'the audited list caps at five');
});

test('a vision frame is spelled correctly for both wire formats',async()=>{
 const {buildUserContent}=await import('../public/ai/providers.js');
 const img='data:image/jpeg;base64,AAAA';
 assert.equal(buildUserContent('openai','obs',null),'obs','text-only stays a plain string');
 const oa=buildUserContent('openai','obs',img);
 assert.equal(oa[0].type,'image_url');assert.equal(oa[0].image_url.url,img);assert.equal(oa[1].text,'obs');
 const an=buildUserContent('anthropic','obs',img);
 assert.equal(an[0].type,'image');assert.equal(an[0].source.data,'AAAA','anthropic wants bare base64');
 assert.equal(an[1].text,'obs');
});

test('with no order and no emergency, the controller stands still and waits for the model',async()=>{
 const {controllerTick}=await import('../public/ai/controller.js');
 const g=makeGame([{id:'ai',name:'AI',look:{}}],2024);
 const p=g.players[0];
 const f=g.platforms.find(x=>x.id===p.ground);
 g.camera=p.y-400;               // comfortably mid-corridor: nothing is urgent
 const input=controllerTick(g,p,null);
 assert.equal(input.drop,false,'no fallback descent: that fallback used to play the whole match');
 assert.equal(input.left||input.right,false);
 g.camera=p.y-120;               // danger line closing in: survival still overrides waiting
 const urgent=controllerTick(g,p,null);
 assert.ok(urgent.drop||urgent.left||urgent.right,'emergencies are not delegated to a sleeping model');
});

test('an empty-handed agent sent to an item platform actually lands on the item',async()=>{
 const {controllerTick}=await import('../public/ai/controller.js');
 const g=makeGame(Array.from({length:2},(_,i)=>({id:'p'+i,name:'猛男'+i,look:{}})),2024,{mode:'brawl'});
 const p=g.players[0];p.carry=null;
 // March the match forward until an item platform is reachable, then order the agent onto it.
 let picked=null;
 for(let frame=0;frame<60*120&&!picked;frame++){
  const item=g.items.find(i=>!i.collected&&i.y>p.y+20&&i.y<p.y+320);
  const intent=item?{action:'descend_to',platformId:item.platformId}:null;
  step(g,{p0:controllerTick(g,p,intent),p1:controllerTick(g,g.players[1],null)});
  picked=p.carry;      // the bag started empty, so anything in it was swept off a platform
  if(!p.alive||g.phase!=='playing')break;
 }
 // The old centre-aimed landing left every agent 30-60px short of the pickup radius.
 assert.ok(picked,'the landing goal must be the item, not the platform centre');
});

test('two agents ordered to the same platform stand apart instead of stacking',async()=>{
 const {controllerTick,bestTarget}=await import('../public/ai/controller.js');
 // bestTarget for both seats: identical judgement, so they share platforms constantly — exactly
 // the pile-up scenario. The roster anchors are the only thing keeping them apart.
 const gaps=[];
 for(const seed of [777,2024,31337]){
  const g=makeGame(Array.from({length:2},(_,i)=>({id:'seat-'+i,name:'猛男'+i,look:{}})),seed,{mode:'brawl'});
  for(let frame=0;frame<60*60;frame++){
   const inputs={};
   for(const p of g.players){
    // Bags stay full (opening poison) so the item anchor cannot converge them onto one pickup.
    const t=bestTarget(g,p);
    inputs[p.id]=controllerTick(g,p,t?{action:'descend_to',platformId:t.id}:null);
   }
   step(g,inputs);
   const [a,b]=g.players;
   if(!a.alive||!b.alive||g.phase!=='playing')break;
   if(a.ground!=null&&a.ground===b.ground)gaps.push(Math.abs(a.x-b.x));
  }
 }
 assert.ok(gaps.length>60,`the seats should share platforms often; got ${gaps.length} samples`);
 const avg=gaps.reduce((x,y)=>x+y,0)/gaps.length;
 assert.ok(avg>40,`roster anchors should keep them apart; average gap was ${avg.toFixed(1)}px`);
});

test('the audit loop replaces lessons and confronts the model with its old ones',async()=>{
 const {replaceLessons,recordLessons,getLessons}=await import('../public/ai/standings.js');
 const {buildReflectionPrompt}=await import('../public/ai/observe.js');
 const store=fakeStorage();
 recordLessons(store,'glm/glm-5.3',['老经验一','老经验二']);
 replaceLessons(store,'glm/glm-5.3',['本局验证有效的','新学到的']);
 assert.deepEqual(getLessons(store,'glm/glm-5.3'),['本局验证有效的','新学到的'],
  'the audited list supersedes, it does not append');
 const prompt=buildReflectionPrompt({rank:3,meters:200},['老经验一']);
 assert.ok(prompt.includes('老经验一'),'the model must see what it believed last time');
 assert.match(prompt,/没用或有害的删除|完整替换/,'and be told stale beliefs are for deleting');
 assert.match(buildReflectionPrompt({rank:1,meters:900}),/JSON 字符串数组/);
});

test('the plan field is working memory: parsed, bounded, and offered back',async()=>{
 const {parseDecision}=await import('../public/ai/providers.js');
 const {ACTION_SCHEMA}=await import('../public/ai/observe.js');
 const d=parseDecision('{"go":4,"plan":"苟到前三再抢红心","why":"稳"}');
 assert.equal(d.plan,'苟到前三再抢红心');
 assert.equal(parseDecision('{"go":4}').plan,null,'no plan stays no plan');
 assert.ok(parseDecision('{"plan":"'+'长'.repeat(60)+'"}').plan.length<=30,'a rambling plan is clipped');
 assert.match(ACTION_SCHEMA,/工作记忆/,'the schema must explain the plan comes back to them');
});
