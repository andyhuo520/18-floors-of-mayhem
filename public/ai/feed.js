// The live decision feed: what each AI seat was shown, what it chose, what the agent actually sent
// to the server, and what the engine said back. Formatting is pure so it can be tested in Node;
// only createFeed() touches the DOM.

const ITEM_ZH={heart:'红心',shield:'护盾',poison:'毒果',time:'时钟',freeze:'冰冻果'};
const item=t=>ITEM_ZH[t]||t||'';
const pct=v=>Math.round((v||0)*100)+'%';
const clock=t=>(Number(t)||0).toFixed(1).padStart(5)+'s';

/**
 * One record → {cls, head, lines}. `head` is the one-line summary, `lines` the detail rows.
 * Kinds: think (a model decision) · skip (nothing to decide) · exec (an item input was sent) ·
 * engine (what the engine did with our input) · error.
 */
export function formatRecord(agent,r){
 const name=agent?.config?.name||agent?.id||'AI';
 const head=`${clock(r.t)} ${name}`;
 if(r.kind==='skip')return {cls:'skip',head,lines:[`无可选项（可去 ${r.reachable} 块${r.carry?'，手持 '+item(r.carry):''}）→ 本地控制器`]};
 if(r.kind==='exec')return {cls:'exec',head,lines:[`⚙ 已发送 ${r.action==='use'?'使用':'投掷'} ${item(r.carry)}${r.target?' → '+r.target:r.action==='throw'?'（无目标，顺手扔）':''}`]};
 if(r.kind==='engine')return {cls:'engine',head,lines:[`↳ 引擎：${r.text}`]};
 if(r.kind==='error')return {cls:'error',head,lines:[`✕ ${r.text}${r.raw?' · '+r.raw:''}`]};
 if(r.kind==='lesson'){
  const rep=r.report||{};
  const lines=[`战报：${rep.meters??0}m · ${rep.reason||''}${rep.rank?' · 第 '+rep.rank+' 名':''} · 吃心 ${rep.heals??0} · 命中 ${rep.throwHits??0} · 被打 ${rep.hitsTaken??0}${rep.carriedAtEnd?' · 终局手持 '+item(rep.carriedAtEnd):''}`];
  lines.push(r.picked?.length?'带入下一局：'+r.picked.map(m=>`${m.text} ${pct(m.p)}`).join('；'):'本局没有需要特别记住的');
  return {cls:'lesson',head:`${head} · 赛后复盘 · ${r.ms??0}ms`,lines};
 }
 // think
 const lines=[];
 const v=r.view;
 if(v){
  const me=v.me||{};
  lines.push(`局面：可去 ${v.reachable?.length??0} 块 · 血 ${me.hp}/${me.maxHp} · 手持 ${me.carry?item(me.carry):'空'} · 对手 ${v.rivals?.length??0} · 走廊 ${me.corridor?.height??'-'}`);
 }
 if(r.answers){                                   // System One：带概率分布
  const go=r.answers.go;
  if(go){
   const ranked=Object.entries(go.probabilities||{}).sort((a,b)=>b[1]-a[1]);
   const ledge=v?.reachable?.find(f=>String(f.id)===String(go.choice));
   const desc=ledge?`${ledge.type}${ledge.item?' 有'+item(ledge.item):''}${ledge.spikes?' 尖刺'+ledge.spikes:''}${ledge.beast?' 巨爪'+ledge.beast:''}`:'';
   lines.push(`go → #${go.choice} ${desc} ${pct(go.probabilities?.[go.choice])} · 置信 ${(go.confidence??0).toFixed(2)}${r.acted?'':' → 拿不准，交给本地控制器'}`);
   const rest=ranked.filter(([k])=>String(k)!==String(go.choice)).slice(0,3).map(([k,p])=>`#${k} ${pct(p)}`).join(' · ');
   if(rest)lines.push(`   其他：${rest}`);
  }else if(v&&(v.reachable?.length??0)<2)lines.push('go → 未提问（不足 2 块可去）');
  const ia=r.answers.item_action;
  if(ia){
   const tg=r.answers.target;
   lines.push(`item → ${ia.choice} ${pct(ia.probabilities?.[ia.choice])}${tg?` · target → ${tg.choice} ${pct(tg.probabilities?.[tg.choice])}`:''}${v?.me?.carry?'':'（空手，本轮不执行）'}`);
  }
 }else if(r.decision){                            // LLM：plan / why / go / item
  const d=r.decision;
  if(d.plan)lines.push(`计划：${d.plan}`);
  lines.push(`go → ${d.go??'保持'}${d.item?` · item → ${d.item}${d.target?' → '+d.target:''}`:''}${d.why?` · ${d.why}`:''}`);
 }
 return {cls:'think',head:`${head} · ${r.model||''} · ${r.ms??0}ms`,lines};
}

/** Mount the feed into `col` (the #ai-log-col element). Returns push/clear/setSeats/show. */
export function createFeed(col,{max=200}={}){
 const list=col.querySelector('#ai-log');
 const filter=col.querySelector('#ai-log-filter');
 const pauseBtn=col.querySelector('#ai-log-pause');
 col.querySelector('#ai-log-clear').onclick=()=>{list.replaceChildren();};
 let paused=false;
 pauseBtn.onclick=()=>{paused=!paused;pauseBtn.setAttribute('aria-pressed',String(paused));pauseBtn.textContent=paused?'继续滚动':'暂停滚动';};
 // Scrolling up means the reader is looking at history: stop yanking the view to the bottom.
 let stick=true;
 list.addEventListener('scroll',()=>{stick=list.scrollHeight-list.scrollTop-list.clientHeight<24;});
 filter.onchange=()=>{for(const li of list.children)li.hidden=!!filter.value&&li.dataset.seat!==filter.value;};
 return {
  node:col,
  setSeats(seats){
   filter.replaceChildren(Object.assign(document.createElement('option'),{value:'',textContent:'全部选手'}),
    ...seats.map(s=>Object.assign(document.createElement('option'),{value:s.id,textContent:s.name})));
  },
  show(on){col.hidden=!on;},
  clear(){list.replaceChildren();},
  push(agent,record){
   // Pausing freezes the viewport, not the record: everything still lands in the list.
   const {cls,head,lines}=formatRecord(agent,record);
   const li=document.createElement('li');
   li.className='ai-log-'+cls;li.dataset.seat=agent.id||'';
   li.style.setProperty('--seat',agent.config?.look?.color!=null?String(agent.config.look.color):'0');
   const h=document.createElement('b');h.textContent=head;li.append(h);
   for(const line of lines){const p=document.createElement('span');p.textContent=line;li.append(p);}
   li.hidden=!!filter.value&&li.dataset.seat!==filter.value;
   list.append(li);
   while(list.children.length>max)list.firstChild.remove();
   if(stick&&!paused)list.scrollTop=list.scrollHeight;
  },
 };
}
