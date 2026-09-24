// The AI battle module, split the way the lobby is actually used: a compact card in the lobby
// (start button, live status, the standings board) and a <dialog> holding the six-slot roster
// configuration. Keys live in page memory for the session only: nothing is written to storage
// and nothing leaves the machine except through the local relay.
import {Agent} from './agent.js';
import {PROVIDERS,MODEL_CHOICES,testConnection,listModels} from './providers.js';
import {TRAITS,DEFAULT_LOOK,lookName,randomLook,drawCharacter} from '../appearance.js';
import {drawVendor,VENDOR_BADGE} from './badges.js';
import {recordMatch,topStandings,replaceLessons,getLessons,recordHistory,getHistory} from './standings.js';
import {createFeed} from './feed.js';

const SLOTS=6;
const STATE_LABEL={idle:'未上场',connecting:'连接中',joining:'加入中',ready:'已就位',playing:'对战中',eliminated:'已淘汰',finished:'已结束',offline:'已离线'};
const CUSTOM_MODEL='__custom__';

// The character is the model's identity on screen: the vendor picks the species, the slot only
// varies the trim, and a re-roll may never drift a slot away from what it is running.
const VENDOR_LOOK={
 anthropic:{fruit:6,animal:7},   // 橙子狐狸
 openai:{fruit:1,animal:6},      // 西瓜兔
 deepseek:{fruit:5,animal:3},    // 葡萄鸭
 glm:{fruit:7,animal:4},         // 火龙果猫
 'glm-coding':{fruit:2,animal:2},// 柠檬鸡 —— 同为智谱，但两个席位在场上必须分得开
 typesafe:{fruit:3,animal:5},    // 菠萝狗
 custom:{fruit:0,animal:0},      // 草莓牛
};
function lookFor(provider,i){
 const base=VENDOR_LOOK[provider]||VENDOR_LOOK.custom;
 return {...DEFAULT_LOOK,fruit:base.fruit,animal:base.animal,
  eyes:(i*2)%TRAITS.eyes.length,mouth:(i*5)%TRAITS.mouth.length,
  hat:(i*4+2)%TRAITS.hat.length,color:(i*2+3)%12};
}

// One downscaled JPEG of the arena per decision. The camera is shared, so the same frame serves
// every vision seat; 420px keeps a frame around 25-45KB, inside the relay's request cap.
function snapshotArena(){
 const arena=document.querySelector('#arena');
 if(!arena)return null;
 const w=420,h=Math.round(w*arena.height/arena.width);
 const c=snapshotArena.canvas||(snapshotArena.canvas=document.createElement('canvas'));
 c.width=w;c.height=h;
 c.getContext('2d').drawImage(arena,0,0,w,h);
 try{return c.toDataURL('image/jpeg',0.55);}catch{return null;}
}

export function createAIPanel({mount,onStart,getWsBase,enhanceSelects,toast,getHostedRoom,requestStart,isMatchRunning}){
 if(window.MAN18_RUNTIME_URL){
  mount.innerHTML='<p class="ai-note">线上版支持普通电脑对战与朋友联机。自填模型 API 的高级 AI 对战暂仅本地版提供。</p>';
  return;
 }
 const slots=[];
 const agents=[];
 let running=false;

 // ---- the lobby card -------------------------------------------------------------------------
 const card=document.createElement('div');
 card.className='ai-card';
 card.innerHTML=`<div class="panel-kicker">AI 对战 <span>MODEL vs MODEL</span></div>
  <p class="ai-note" id="ai-summary"></p>
  <div class="ai-actions">
   <button class="secondary" id="ai-config">配置选手 <span>⚙</span></button>
   <button class="primary" id="ai-start">开始 AI 对战 <span>↯</span></button>
   <button class="secondary" id="ai-stop" hidden>停止并清场</button>
  </div>
  <p class="ai-cost" id="ai-cost"></p>
  <div class="ai-board">
   <div class="ai-board-head">模型战绩榜 <span>本机历史</span></div>
   <ol id="ai-board-list"></ol>
  </div>`;
 mount.append(card);
 // The decision feed lives in its own column beside the arena; it only shows while seats are live.
 const feedCol=document.querySelector('#ai-log-col');
 const feed=feedCol?createFeed(feedCol):null;
 const setLive=on=>{feed?.show(on);document.querySelector('.workspace')?.classList.toggle('ai-live',on);};

 // ---- the roster dialog ----------------------------------------------------------------------
 const dialog=document.createElement('dialog');
 dialog.id='ai-settings';
 dialog.innerHTML=`<div class="dialog-head"><b>AI 选手配置</b><button type="button" id="ai-settings-close" aria-label="关闭">✕</button></div>
  <p class="ai-note">填入各自的 key，先「测试连通」，再回大厅开战。密钥只保存在本页内存，不写入本地存储，只经过本机服务转发给模型厂商。</p>
  <div class="ai-slots"></div>`;
 document.body.append(dialog);
 const list=dialog.querySelector('.ai-slots');
 dialog.querySelector('#ai-settings-close').onclick=()=>dialog.close();

 for(let i=0;i<SLOTS;i++){
  const row=document.createElement('div');
  row.className='ai-slot';
  const providerOptions=Object.entries(PROVIDERS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
  row.innerHTML=`
   <label class="ai-toggle"><input type="checkbox" ${i<2?'checked':''}><b>${i+1}</b></label>
   <button type="button" class="ai-face" aria-label="第 ${i+1} 位选手换个形象"><canvas width="56" height="62"></canvas><small></small></button>
   <div class="ai-fields">
    <div class="ai-vendor"><canvas class="ai-badge" width="48" height="48" aria-hidden="true"></canvas><span class="ai-home"></span></div>
    <select class="ai-provider" aria-label="第 ${i+1} 位选手的模型厂商">${providerOptions}</select>
    <select class="ai-model-pick" aria-label="第 ${i+1} 位选手的模型"></select>
    <input class="ai-model" placeholder="手动输入模型 id" hidden aria-label="第 ${i+1} 位选手的模型 id">
    <input class="ai-key" type="password" placeholder="API key" autocomplete="off" aria-label="第 ${i+1} 位选手的 API key">
    <input class="ai-base" placeholder="自定义 base URL（可整段粘贴，会自动剪掉 /chat/completions）" hidden aria-label="第 ${i+1} 位选手的接口地址">
    <input class="ai-persona" placeholder="人格提示词（可选）例：激进抢毒果，见人就扔" aria-label="第 ${i+1} 位选手的人格设定">
    <label class="ai-vision"><input type="checkbox">视觉观察（每次决策附赛场截图，需视觉模型，更贵）</label>
    <div class="ai-test-row"><button type="button" class="ai-fetch">拉取模型</button><button type="button" class="ai-test">测试连通</button><span class="ai-test-result"></span></div>
    <div class="ai-lessons" hidden></div>
   </div>
   <div class="ai-status"><b class="ai-state">未上场</b><small class="ai-why"></small></div>`;
  const on=row.querySelector('input[type=checkbox]');
  const provider=row.querySelector('.ai-provider');
  const modelPick=row.querySelector('.ai-model-pick');
  const model=row.querySelector('.ai-model');
  const key=row.querySelector('.ai-key');
  const base=row.querySelector('.ai-base');
  const stateEl=row.querySelector('.ai-state');
  const whyEl=row.querySelector('.ai-why');
  const persona=row.querySelector('.ai-persona');
  const vision=row.querySelector('.ai-vision input');
  const lessonsEl=row.querySelector('.ai-lessons');
  // Deliberately does not call config(): this runs from syncProvider() during slot construction,
  // before `config` is initialised — reaching for it there is a TDZ crash that takes the whole
  // panel down (the same failure shape as the earlier SLOTS regression).
  const currentModelId=()=>modelPick.value===CUSTOM_MODEL?model.value.trim():modelPick.value;
  const paintLessons=()=>{
   const lessons=getLessons(localStorage,provider.value+'/'+(currentModelId()||''));
   lessonsEl.hidden=!lessons.length;
   lessonsEl.textContent=lessons.length?'战训：'+lessons.join(' / '):'';
  };
  const testBtn=row.querySelector('.ai-test');
  const fetchBtn=row.querySelector('.ai-fetch');
  const testOut=row.querySelector('.ai-test-result');

  const faceBtn=row.querySelector('.ai-face');
  const faceCanvas=faceBtn.querySelector('canvas');
  const faceName=faceBtn.querySelector('small');
  let look=lookFor('glm',i);
  const paintFace=()=>{
   const c=faceCanvas.getContext('2d');
   c.clearRect(0,0,faceCanvas.width,faceCanvas.height);
   drawCharacter(c,look,28,58,.78);
   faceName.textContent=lookName(look);
   faceBtn.title='点一下换个形象 · '+lookName(look);
  };
  // Re-rolling varies the trim only; the species stays locked to the vendor.
  faceBtn.addEventListener('click',()=>{look=randomLook({fruit:true,animal:true},look);paintFace();});
  paintFace();

  const badgeCanvas=row.querySelector('.ai-badge');
  const homeEl=row.querySelector('.ai-home');
  const paintBadge=()=>{
   const c=badgeCanvas.getContext('2d');
   c.clearRect(0,0,badgeCanvas.width,badgeCanvas.height);
   drawVendor(c,provider.value,0,0,48);
   homeEl.textContent=(VENDOR_BADGE[provider.value]||VENDOR_BADGE.custom).home;
  };

  const fillModelPick=(choices,keep)=>{
   modelPick.replaceChildren(
    ...choices.map(id=>{const o=document.createElement('option');o.value=id;o.textContent=id;return o;}),
    Object.assign(document.createElement('option'),{value:CUSTOM_MODEL,textContent:'手动输入…'}));
   modelPick.value=keep&&choices.includes(keep)?keep:(choices[0]||CUSTOM_MODEL);
   model.hidden=modelPick.value!==CUSTOM_MODEL;
  };
  const syncModelChoices=()=>fillModelPick(MODEL_CHOICES[provider.value]||[]);
  modelPick.addEventListener('change',()=>{model.hidden=modelPick.value!==CUSTOM_MODEL;if(!model.hidden)model.focus();paintLessons();});

  const syncProvider=()=>{
   paintBadge();
   // Jev takes text only, so a screenshot would be silently dropped rather than read.
   const textOnly=PROVIDERS[provider.value]?.kind==='typesafe';
   vision.disabled=textOnly;
   if(textOnly)vision.checked=false;
   vision.closest('.ai-vision').title=textOnly?'Jev 只接受文本输入':'';
   look=lookFor(provider.value,i);paintFace();
   syncModelChoices();
   base.hidden=provider.value!=='custom';
   testOut.textContent='';
   paintLessons();
  };
  provider.addEventListener('change',syncProvider);
  syncProvider();

  const config=()=>{
   const preset=PROVIDERS[provider.value];
   const chosen=modelPick.value===CUSTOM_MODEL?model.value.trim():modelPick.value;
   const id=provider.value+'/'+(chosen||preset?.model||'');
   return {
    provider:provider.value,badge:provider.value,
    model:chosen||preset?.model||'',
    apiKey:key.value.trim(),
    base:base.value.trim()||preset?.base||'',
    name:`${(preset?.label||'AI').replace(/\s*\(.*\)/,'')}·${i+1}`,
    look,intervalMs:700+i*110,
    persona:persona.value.trim(),
    vision:vision.checked,
    getSnapshot:snapshotArena,
    lessons:getLessons(localStorage,id),
    history:getHistory(localStorage,id),
   };
  };

  // Ask the endpoint itself which models this key can use. The static list is only a starter;
  // "Unsupported model" errors end here instead of during a match.
  fetchBtn.addEventListener('click',async()=>{
   const c=config();
   if(!c.apiKey){testOut.textContent='✗ 先填 API key';testOut.classList.add('is-bad');return;}
   fetchBtn.disabled=true;testOut.textContent='拉取中…';testOut.classList.remove('is-bad');
   try{
    const models=await listModels(c);
    fillModelPick(models,modelPick.value===CUSTOM_MODEL?model.value.trim():modelPick.value);
    testOut.textContent=`✓ 该 key 可用 ${models.length} 个模型，已填入下拉`;
   }catch(err){
    testOut.textContent='✗ '+(err?.message||'拉取失败');
    testOut.classList.add('is-bad');
   }finally{fetchBtn.disabled=false;}
  });

  // The whole point of the button: find out the key is wrong before the match, not during it.
  testBtn.addEventListener('click',async()=>{
   const c=config();
   if(!c.apiKey){testOut.textContent='✗ 先填 API key';return;}
   if(!c.model){testOut.textContent='✗ 先选或填模型';return;}
   testBtn.disabled=true;testOut.textContent='测试中…';
   try{
    const {ms}=await testConnection(c);
    testOut.classList.remove('is-bad');
    testOut.textContent=`✓ 畅通 · ${ms}ms · ${c.model}`;
   }catch(err){
    testOut.textContent='✗ '+(err?.message||'连接失败');
    testOut.classList.add('is-bad');
   }finally{testBtn.disabled=false;}
  });

  on.addEventListener('change',()=>summary());
  slots.push({row,on,provider,modelPick,model,key,base,stateEl,whyEl,config});
  list.append(row);
 }

 card.querySelector('#ai-config').onclick=()=>{dialog.showModal();};

 // ---- status, summary and the standings board -------------------------------------------------
 function summary(){
  const chosen=slots.filter(s=>s.on.checked);
  card.querySelector('#ai-summary').textContent=chosen.length
   ? `${chosen.length} 位选手待命：`+chosen.map(s=>(PROVIDERS[s.provider.value]?.label||'AI').replace(/\s*\(.*\)/,'')).join(' vs ')
   : '还没有启用任何选手，先去「配置选手」。';
 }

 function paintBoard(){
  const rows=topStandings(localStorage,8);
  const ol=card.querySelector('#ai-board-list');
  if(!rows.length){ol.innerHTML='<li class="ai-board-empty">还没有战绩 · 打一场就有了</li>';return;}
  ol.replaceChildren(...rows.map((r,idx)=>{
   const li=document.createElement('li');
   const rank=document.createElement('b');rank.textContent=String(idx+1).padStart(2,'0');
   const bc=document.createElement('canvas');bc.width=22;bc.height=22;drawVendor(bc.getContext('2d'),r.provider,0,0,22);
   const label=document.createElement('span');
   label.innerHTML=`<i>${(PROVIDERS[r.provider]?.label||r.provider).replace(/\s*\(.*\)/,'')}${r.model?' · '+r.model:''}</i><small>${(VENDOR_BADGE[r.provider]||VENDOR_BADGE.custom).home} · ${r.wins}胜/${r.matches}局 · 均 ${r.avgMeters}m</small>`;
   li.append(rank,bc,label);
   return li;
  }));
 }

 const recorded=new Set();
 function maybeRecord(agent){
  const g=agent.game;
  if(!g||g.phase!=='finished'||!Array.isArray(g.result)||!g.result.length)return;
  const matchId='seed:'+g.seed;
  if(recorded.has(matchId))return;
  const byId=new Map(agents.map(a=>[a.id,a]));
  const entries=g.result.filter(p=>byId.has(p.id)).map(p=>({
   provider:byId.get(p.id).config.provider,
   model:byId.get(p.id).config.model,
   name:p.name,meters:p.meters,rank:p.rank,
  }));
  if(!entries.length)return;
  recorded.add(matchId);
  if(recordMatch(localStorage,matchId,entries))paintBoard();
 }

 function paint(){
  let calls=0,tin=0,tout=0,errors=0;
  for(const agent of agents){
   const slot=agent.slot;
   slot.stateEl.textContent=STATE_LABEL[agent.state]||agent.state;
   const s=agent.stats;
   const bits=[];
   if(s.lastPlan)bits.push('计划·'+s.lastPlan);
   if(s.lastWhy)bits.push(s.lastWhy);
   if(s.lastMs)bits.push(s.lastMs+'ms');
   if(s.lastError)bits.push('⚠ '+s.lastError);
   slot.whyEl.textContent=bits.join(' · ');
   calls+=s.calls;tin+=s.tokensIn;tout+=s.tokensOut;errors+=s.errors;
   maybeRecord(agent);
  }
  card.querySelector('#ai-cost').textContent=agents.length
   ? `已调用 ${calls} 次 · 输入 ${tin} tok · 输出 ${tout} tok · 失败 ${errors} 次`
   : '';
 }

 function stop(){
  for(const agent of agents)agent.leave();
  agents.length=0;
  running=false;
  setLive(false);
  card.querySelector('#ai-start').hidden=false;
  card.querySelector('#ai-stop').hidden=true;
  for(const slot of slots){slot.stateEl.textContent='未上场';slot.whyEl.textContent='';}
  paint();
 }

 card.querySelector('#ai-stop').onclick=stop;

 // Clicking start means the match starts. The room ceremony only applies when the player has
 // deliberately opened a friend room — then the AI seats walk into it and the player keeps
 // the whistle. Nobody should have to press a second start button for a battle they just started.
 function blowWhistle(){
  const began=Date.now();
  const timer=setInterval(()=>{
   if(isMatchRunning?.()||agents.some(a=>a.state==='playing')){clearInterval(timer);return;}
   if(Date.now()-began>15000){clearInterval(timer);toast('AI 对战没能自动开局，请在房间面板手动开始');return;}
   requestStart?.();
  },500);
 }

 card.querySelector('#ai-start').onclick=async()=>{
  if(running)return;
  const chosen=slots.filter(s=>s.on.checked).map(s=>({slot:s,config:s.config()}));
  if(chosen.length<1){dialog.showModal();return toast('至少启用一位 AI 选手');}
  const missing=chosen.find(c=>!c.config.apiKey);
  if(missing){dialog.showModal();return toast('已启用的选手需要填入 API key');}
  const hosted=getHostedRoom?.();
  const code=hosted||await onStart();
  if(!code)return;
  running=true;
  card.querySelector('#ai-start').hidden=true;
  card.querySelector('#ai-stop').hidden=false;
  feed?.clear();setLive(true);
  feed?.setSeats(chosen.map(c=>({id:null,name:c.config.name})));
  for(const {slot,config} of chosen){
   const agent=new Agent(config,{onStatus:paint,onLog:(a,line)=>{slot.whyEl.textContent=line;},
    onDecision:(a,record)=>feed?.push(a,record),
    onHistory:(a,report)=>{recordHistory(localStorage,a.config.provider+'/'+a.config.model,report);},
    onLessons:(a,lessons)=>{replaceLessons(localStorage,a.config.provider+'/'+a.config.model,lessons);}});
   agent.slot=slot;
   agents.push(agent);
   agent.join(getWsBase(),code);
   await new Promise(r=>setTimeout(r,200));
  }
  paint();
  feed?.setSeats(agents.map(a=>({id:a.id,name:a.config.name})));
  if(hosted)toast('AI 选手已进入你的房间，人齐后由你开始比赛');
  else blowWhistle();
 };

 enhanceSelects?.(dialog);
 summary();
 paintBoard();
 setInterval(paint,600);
 return {stop,agents,dialog};
}
