// An AI player is an ordinary client. It opens its own WebSocket to the room, receives the same
// authoritative state every human receives, and sends the same input packets — it simply decides
// what to press with a model instead of a keyboard. The server needs no knowledge of any of this,
// and an agent can therefore never do anything a player could not.
import {controllerTick} from './controller.js';
import {observe,serialiseObservation,buildSystemPrompt,buildReflectionPrompt,ACTION_SCHEMA,
        buildJevState,buildJevQuestions,worthAsking} from './observe.js';
import {complete,judge,parseDecision,parseLessonList,PROVIDERS} from './providers.js';
import {buildReflectionQuestions,selectMaxims,describeReport} from './maxims.js';

// Below this the Choice distribution is nearly flat: no option is a clear winner, so acting on the
// pick is a coin flip. The local controller's own fallback is better than a guess, and ignoring the
// answer costs nothing because the request was already paid for.
const MIN_CONFIDENCE=0.45;

/**
 * The item half of a System One answer, as the one-shot instruction drive() executes.
 * A throw with nobody to aim at is still a throw: the engine picks a direction itself, and getting
 * rid of poison is the only way to free the hand for a heart. Requiring a target here left every
 * lone survivor holding poison for the rest of the run, never able to pick anything up again.
 */
export function itemIntentFromAnswers(answers){
 const act=answers?.item_action?.choice;
 if(act==='use')return {do:'use'};
 if(act==='throw')return {do:'throw',target:answers?.target?.choice??null};
 return null;
}

const NEUTRAL={left:false,right:false,jump:false,drop:false,rescue:false,eat:false,pass:false};

export class Agent {
 /**
  * @param config {provider, model, apiKey, base, intervalMs, name, look}
  * @param hooks  {onStatus(agent), onLog(agent, line)}
  */
 constructor(config,hooks={}){
  this.config={intervalMs:800,...config};
  this.hooks=hooks;
  this.id=null;this.ws=null;this.game=null;this.room=null;
  this.intent=null;this.pendingItem=null;
  this.stats={calls:0,errors:0,tokensIn:0,tokensOut:0,lastMs:0,avgMs:0,lastWhy:'',lastError:''};
  this.state='idle';
  this.lastPacket='';this.lastSentAt=0;
  this.stopped=false;
  this.seq=0;this.lastEventId=0;
 }

 get me(){return this.game?.players.find(p=>p.id===this.id)||null;}

 log(line){this.hooks.onLog?.(this,line);}
 /** One structured record for the live decision feed. Kinds: think | skip | exec | engine | error. */
 emit(record){this.hooks.onDecision?.(this,{t:this.game?.t??0,seq:++this.seq,...record});}
 touch(){this.hooks.onStatus?.(this);}
 setState(state){this.state=state;this.touch();}

 join(wsBase,code){
  this.stopped=false;
  this.setState('connecting');
  this.ws=new WebSocket(`${wsBase}/ws?room=${encodeURIComponent(code)}&intent=join`);
  this.ws.onopen=()=>this.setState('joining');
  this.ws.onclose=()=>{if(!this.stopped){this.setState('offline');}};
  this.ws.onerror=()=>{};
  this.ws.onmessage=event=>this.receive(JSON.parse(event.data));
 }

 leave(){
  this.stopped=true;
  clearTimeout(this.timer);
  this.abort?.abort();
  try{this.ws?.send(JSON.stringify({type:'leave'}));this.ws?.close();}catch{}
  this.setState('idle');
 }

 receive(m){
  if(m.type==='hello'){
   this.id=m.id;
   this.ws.send(JSON.stringify({type:'join',ai:true,name:this.config.name,look:this.config.look,badge:this.config.badge||null}));
   return;
  }
  if(m.type==='error'){this.stats.lastError=m.message;this.log('✕ '+m.message);this.touch();return;}
  if(m.type==='lobby'){this.room=m;if(this.state!=='playing')this.setState('ready');return;}
  if(m.type==='countdown'||m.type==='state'){
   this.game=m.game;
   if(m.type==='countdown'){this.setState('playing');this.schedule(0);}
   // The engine narrates what it did with each input — "生命已满，红心保留在背包" is the answer to
   // "why didn't it eat" — so those lines go into the feed right under the decision they answer.
   for(const ev of this.game.events||[]){
    if(ev.id<=this.lastEventId)continue;
    this.lastEventId=ev.id;
    if(ev.playerId===this.id)this.emit({kind:'engine',t:ev.t,text:ev.text,title:ev.title});
   }
   this.drive();
   const me=this.me;
   if(me&&!me.alive&&this.state==='playing')this.eliminated();
   if(this.game.phase==='finished')this.finish();
   return;
  }
 }

 /**
  * Our player is out, but the match is not: whoever is still falling keeps going. Stop thinking
  * (there is nothing left to decide) and stop burning tokens, while staying connected so the final
  * ranking still arrives and reaches the standings board.
  */
 eliminated(){
  if(this.state==='eliminated')return;
  clearTimeout(this.timer);
  this.abort?.abort();
  this.setState('eliminated');
  const me=this.me;
  this.stats.lastWhy=`淘汰 · ${me?.meters??0}m`+(me?.reason?' · '+me.reason:'');
  this.stats.lastMs=0;
  this.touch();
 }

 finish(){
  if(this.state==='finished')return;
  clearTimeout(this.timer);
  this.setState('finished');
  const me=this.me;
  if(me)this.log(`结束 · ${me.meters} m · ${me.alive?'存活':me.reason||'淘汰'}`);
  this.reflect();
 }

 /** One extra call after the whistle: the model writes its own lessons for next time. */
 async reflect(){
  const me=this.me;
  if(!me||!this.config.apiKey||this.config.learn===false||this.reflected)return;
  this.reflected=true;
  const ranked=(this.game.result||[]).find(p=>p.id===this.id);
  const report={
   rank:ranked?.rank??null,meters:me.meters,reason:me.reason||(me.alive?'存活到最后':''),hp:me.hp,
   heals:me.stats?.heals??0,throwHits:me.stats?.throwHits??0,hitsTaken:me.stats?.hits??0,
   itemsPicked:(me.stats?.heals??0)+(me.stats?.passes??0),
   carriedAtEnd:me.carry||null,passes:me.stats?.passes??0,
   // Whether the last stretch was played alone: rank 1 does not say so literally, and the maxim
   // about dumping poison only makes sense when there is nobody left to throw it at.
   aloneAtEnd:this.game.players.filter(p=>p.id!==this.id&&p.alive).length===0&&(me.alive||(me.diedAt??0)>=Math.max(0,...this.game.players.filter(p=>p.id!==this.id).map(p=>p.diedAt??-1))),
  };
  // Every seat remembers its last few matches; the System One state reads them back as sentences.
  this.hooks.onHistory?.(this,report);
  // A System One model returns judgments, not prose: its lessons are selected from a library.
  if((PROVIDERS[this.config.provider]||{}).kind==='typesafe')return this.reflectJev(report);
  try{
   const {text}=await complete({
    provider:this.config.provider,model:this.config.model,apiKey:this.config.apiKey,
    base:this.config.base,temperature:0.4,
    system:'你是这名选手本人，在赛后复盘。',user:buildReflectionPrompt(report,this.config.lessons||[]),
   });
   const lessons=parseLessonList(text);
   if(lessons.length){this.hooks.onLessons?.(this,lessons);this.log('战训：'+lessons.join('；'));}
  }catch{/* a failed reflection just means no new lessons */}
 }

 /** Post-match for a System One seat: judge the report against every maxim in one request. */
 async reflectJev(report){
  try{
   const {answers,ms}=await judge({
    provider:this.config.provider,model:this.config.model,apiKey:this.config.apiKey,base:this.config.base,
    state:{战报:describeReport(report),带着的战训:this.config.lessons||[]},questions:buildReflectionQuestions(),
   });
   const picked=selectMaxims(answers);
   const lessons=picked.map(m=>m.text);
   this.hooks.onLessons?.(this,lessons);            // an empty list clears stale ones on purpose
   this.emit({kind:'lesson',ms:Math.round(ms),picked,report});
   this.log(lessons.length?'战训：'+lessons.join('；'):'战训：本局没有需要特别记住的');
  }catch(err){this.emit({kind:'error',text:'复盘失败：'+(err?.message||'')});}
 }

 /** One frame of control. Runs on every state packet, independent of the model's cadence. */
 drive(){
  const me=this.me;
  if(!me||!me.alive||this.game.phase!=='playing')return;
  if(this.intent?.action==='descend_to'&&!this.intent.done&&me.ground===this.intent.platformId){
   this.intent.done=true;
   this.schedule(Math.max(250,this.config.intervalMs/3));
  }
  const input={...controllerTick(this.game,me,this.intent)};
  // Item actions are one-shot: consume the model's instruction the first frame it is executable.
  if(this.pendingItem&&me.carry){
   let aimed=null;
   if(this.pendingItem.do==='use')input.eat=true;
   else if(this.pendingItem.do==='throw'){
    input.pass=true;
    const target=this.game.players.find(p=>p.id===this.pendingItem.target&&p.alive);
    // Aim by holding a direction, which is how the engine reads a directed throw.
    if(target){input.left=target.x<me.x;input.right=target.x>me.x;aimed=target.name;}
   }
   this.emit({kind:'exec',action:this.pendingItem.do,carry:me.carry,target:aimed});
   this.pendingItem=null;
  }
  const packet=JSON.stringify({type:'input',...input});
  const now=performance.now();
  if(packet!==this.lastPacket||now-this.lastSentAt>250){
   if(this.ws?.readyState===1)this.ws.send(packet);
   this.lastPacket=packet;this.lastSentAt=now;
  }
 }

 schedule(delay=this.config.intervalMs){
  clearTimeout(this.timer);
  if(this.stopped)return;
  this.timer=setTimeout(()=>this.think(),delay);
 }

 async think(){
  const me=this.me;
  if(this.stopped||!me||!me.alive||this.game?.phase!=='playing')return;
  // A `decide` function stands in for the model. Nothing in the app supplies one; it exists so the
  // agent loop can be exercised end to end without a paid key.
  if(this.config.decide){
   const decision=this.config.decide(this.game,me);
   this.stats.calls++;this.stats.lastMs=0;
   if(decision){this.stats.lastWhy=decision.why||'';this.apply(decision);this.emit({kind:'think',model:'stub',ms:0,decision});}
   this.touch();this.schedule();
   return;
  }
  const view=observe(this.game,me);
  if((PROVIDERS[this.config.provider]||{}).kind==='typesafe')return this.judgeTick(view);
  // Working memory: the plan the model wrote last time comes back to it verbatim. Without this
  // every decision is amnesiac, and reactive one-step choices never read as an agent.
  const planLine=this.plan?`你此前的计划：${this.plan}\n`:'';
  const prompt=`${planLine}${serialiseObservation(view)}\n\n${ACTION_SCHEMA}`;
  // The system prompt is per-agent: shared rules + the model's own past-match lessons + whatever
  // persona the player wrote for this seat. This is where seats stop being interchangeable.
  let system=buildSystemPrompt(this.config.lessons||[]);
  if(this.config.persona)system+=`\n\n【本席位人格设定——在不违反生存优先级的前提下贯彻】\n${this.config.persona}`;
  const image=this.config.vision?this.config.getSnapshot?.():null;
  this.abort=new AbortController();
  try{
   const {text,usage,ms}=await complete({
    provider:this.config.provider,model:this.config.model,apiKey:this.config.apiKey,
    base:this.config.base,system,user:prompt,image:image||undefined,signal:this.abort.signal,
   });
   this.stats.calls++;
   this.stats.tokensIn+=usage.in;this.stats.tokensOut+=usage.out;
   this.stats.lastMs=Math.round(ms);
   this.stats.avgMs=Math.round(this.stats.avgMs+(ms-this.stats.avgMs)/this.stats.calls);
   const decision=parseDecision(text);
   if(!decision){
    this.stats.errors++;this.stats.lastError='无法解析回复';
    this.emit({kind:'error',text:'无法解析回复',raw:String(text).slice(0,120)});
   }else{
    this.apply(decision);
    this.stats.lastWhy=decision.why;
    if(decision.plan){this.plan=decision.plan;this.stats.lastPlan=decision.plan;}
    this.emit({kind:'think',model:this.config.model,ms:Math.round(ms),view,decision});
   }
  }catch(err){
   if(err?.name!=='AbortError'){this.stats.errors++;this.stats.lastError=err?.message||'请求失败';this.log('✕ '+this.stats.lastError);this.emit({kind:'error',text:this.stats.lastError});}
  }
  this.touch();
  this.schedule();
 }

 /**
  * One decision from a System One model. Three questions ride in a single request; the code reads
  * the ones that apply. There is no plan and no `why` to parse, so `why` is built from the
  * probability the model actually returned rather than from a sentence it wrote afterwards.
  */
 async judgeTick(view){
  // 78-82% of grounded ticks offer no choice at all. Skipping those is most of the saving.
  if(!worthAsking(view)){
   this.stats.skipped=(this.stats.skipped||0)+1;
   this.stats.lastWhy='无可选项，交给本地控制器';
   this.emit({kind:'skip',reachable:view.reachable.length,carry:view.me.carry});
   this.touch();this.schedule();
   return;
  }
  this.abort=new AbortController();
  try{
   const {answers,usage,ms}=await judge({
    provider:this.config.provider,model:this.config.model,apiKey:this.config.apiKey,
    base:this.config.base,state:buildJevState(view,{history:this.config.history||[]}),
    questions:buildJevQuestions(view,this.config.persona,this.config.lessons||[]),signal:this.abort.signal,
   });
   this.stats.calls++;
   this.stats.tokensIn+=usage.in;this.stats.tokensOut+=usage.out;
   this.stats.lastMs=Math.round(ms);
   this.stats.avgMs=Math.round(this.stats.avgMs+(ms-this.stats.avgMs)/this.stats.calls);
   const go=answers.go;
   const me=this.me;
   if(go&&go.confidence>=MIN_CONFIDENCE){
    const p=go.probabilities?.[go.choice];
    const ledge=view.reachable.find(f=>String(f.id)===String(go.choice));
    this.stats.lastWhy=`${Math.round((p??go.confidence)*100)}% · ${ledge?ledge.type:go.choice}`
     +(ledge?.item?' 有'+ledge.item:'');
    this.apply({go:go.choice,item:null,target:null});
   }else if(go){
    // Say so rather than acting: an honest "not sure" is the point of having confidence at all.
    this.stats.lastWhy=`拿不准(${go.confidence.toFixed(2)})，交给本地控制器`;
   }
   // Item questions are answered every tick; they only mean anything while something is carried.
   if(me?.carry)this.pendingItem=itemIntentFromAnswers(answers);
   this.stats.lastConfidence=go?.confidence??null;
   this.emit({kind:'think',model:this.config.model,ms:Math.round(ms),view,answers,
    acted:!!(go&&go.confidence>=MIN_CONFIDENCE),item:me?.carry?this.pendingItem:null});
  }catch(err){
   if(err?.name!=='AbortError'){this.stats.errors++;this.stats.lastError=err?.message||'请求失败';this.log('✕ '+this.stats.lastError);this.emit({kind:'error',text:this.stats.lastError});}
  }
  this.touch();
  this.schedule();
 }

 apply(decision){
  if(decision.go!==null&&decision.go!==undefined){
   const target=this.game.platforms.find(f=>String(f.id)===String(decision.go)&&!f.broken);
   // A hallucinated platform id is ignored rather than acted on; the controller keeps the old plan.
   if(target)this.intent={action:'descend_to',platformId:target.id};
   else{this.stats.errors++;this.stats.lastError=`平台 ${decision.go} 不存在`;}
  }
  if(decision.item)this.pendingItem={do:decision.item,target:decision.target};
 }
}

export {PROVIDERS};
