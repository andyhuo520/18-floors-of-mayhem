import {strikeBoss} from './boss-rules.js';
import {worldRelicStep,applyRelic,CHAPTER_RELICS,bossRewardStep} from './arena-items.js';
import {campaignStep} from './campaign.js';
import {fallBossStep} from './fall-boss.js';
import {encounterStep} from './encounters.js';
import {combatStep} from './combat.js';
import {ROUTES,BATTLEFIELDS,worldIndex} from './world-config.js';
import {sanitizeLook,PALETTE} from './appearance.js';
export const W=900, H=680, COLORS=['#cbf578','#a3beff','#ff9e76','#e5afff','#7fe2dc','#ffe38c','#ed99b1','#ece5ce','#8fb98b','#ffb854','#9cb6c1','#c5a880'];
export function sanitizeRules(value={}){return {mode:['timed','coop','brawl'].includes(value?.mode)?value.mode:'endless',duration:[30,60,120].includes(value?.duration)?value.duration:60};}
export function makeGame(roster,seed=42,options={}){
 const rules=sanitizeRules(options);if(rules.mode==='coop'&&roster.length!==2)throw new Error('双人协作需要恰好 2 位玩家');const g={rules,difficulty:['easy','hard'].includes(options.difficulty)?options.difficulty:'medium',throws:[],teamMeters:0,teamDepth:0,events:[],eventId:0,items:[],seed,rng:seed>>>0,nextLayer:1,nextY:350,lastCenter:450,nextId:1,t:0,camera:0,speed:80,phase:'playing',platforms:[{id:0,x:210,baseX:210,y:160,w:480,type:'crumble',layer:0,breakAt:1.8}],players:roster.map((p,i)=>({...p,look:sanitizeLook(p.look),color:p.look?PALETTE[sanitizeLook(p.look).color]:p.color||COLORS[i%12],x:300+(i%6)*55,y:160,vx:0,vy:0,alive:true,stats:{hits:0,heals:0,clocks:0,poison:0,rescues:0,teamRescues:0,receivedRescues:0,passes:0,catches:0,throwHits:0,gifted:0,blocked:0},carry:rules.mode==='brawl'?'poison':null,heart:rules.mode==='coop',milestone:0,hp:1,maxHp:3,invulnerableUntil:0,shield:false,bonusTime:0,timeLeft:rules.duration,depth:0,meters:0,ground:0,lastGroundedAt:-10,jumpBufferedUntil:-10,drop:0,lastSafe:160,score:0})),result:[]};
 if(options.difficulty&&options.difficulty!=='hard'&&rules.mode==='brawl')for(const p of g.players)p.carry=null;
 extendWorld(g);record(g,null,rules.mode==='coop'?"搭子集合！带好红心，互相拉一把。":rules.mode==='brawl'?"人手一颗毒果。谁先动手？":"全员集合，谁才是这局的真男人？","开局宣言");return g;
}
function extendWorld(g){
 const rand=()=>((g.rng=(g.rng*1664525+1013904223)>>>0)/4294967296);
 while(g.nextY<g.camera+1600){const layer=g.nextLayer++,cycle=layer%12;
  const routeIndex=(Math.floor((layer-1)/4)+(g.seed%ROUTES.length))%ROUTES.length,route=ROUTES[routeIndex];
  const widthBonus=(g.difficulty==='easy'?50:0)-(g.campaign?.slot===3?18:0);const w=widthBonus+(layer===1?310:Math.max(155,225-Math.min(45,layer*.5))+rand()*25);const target=route.positions[(layer-1)%4]+100+(rand()-.5)*160;let center=Math.max(130,Math.min(770,g.lastCenter+Math.max(-175,Math.min(175,target-g.lastCenter))));if(g.rejoinCenter!==undefined){center=g.rejoinCenter;delete g.rejoinCenter;}const x=center-w/2,y=g.nextY;g.lastCenter=center;g.nextY+=(g.difficulty==='easy'?160:180)+rand()*35;
  let type=layer===1?'solid':layer===2?'moving':cycle===4?'conveyor':layer>6&&cycle===8?'pulse':['solid','solid','solid','solid','crumble','moving','spring'][Math.floor(rand()*7)];
  if(layer>2&&layer%3===0&&type!=='pulse'&&type!=='conveyor'){if(routeIndex===3&&layer%2)type='crumble';if(routeIndex===4)type='moving';if(routeIndex===5)type=layer%2?'spring':'conveyor';}
  if(g.rules.mode==='coop'&&layer>=10&&layer%10===0)type='seesaw';
  if(g.campaign?.slot===2&&layer%2===0)type='crumble';
  const mainId=g.nextId;const main={id:g.nextId++,x,baseX:x,y,w,type,layer,route:routeIndex};
  // Every seventh main platform is claimed by a wall beast. The seed decides which wall, so the
  // warning appears in the same place for every player in the room.
  if(layer>=7&&layer%7===0&&type!=='pulse')main.beast=rand()<.5?'left':'right';
  if(layer===3){
   main.orchard='branch';main.type='seesaw';main.w=300;main.x=main.baseX=Math.max(170,Math.min(430,center-150));
   for(const [side,dx] of [[0,-135],[1,345]])g.platforms.push({id:g.nextId++,x:main.x+dx,baseX:main.x+dx,y:y-90,w:90,type:'crumble',layer,orchard:'fruit',fruitColor:side});
  }
  const zone=worldIndex(y);g.battlefieldZones??=[];
  if(zone>0&&!g.battlefieldZones.includes(zone)&&y%1200>400&&type!=='pulse'&&type!=='seesaw'&&!main.beast){main.stage=zone;main.type=BATTLEFIELDS[zone].type;g.battlefieldZones.push(zone);}
  g.platforms.push(main);
  const itemEvery=g.rules.mode==='brawl'?3:6;   // a brawl is ABOUT the items; six players starve on the endless cadence
  if(layer%itemEvery===0){const kinds=g.rules.mode==='timed'?['heart','time','poison','shield']:g.rules.mode==='brawl'?['poison','heart','shield','freeze']:['heart','shield','poison','shield'];g.items.push({id:layer,platformId:mainId,type:kinds[(Math.floor(layer/itemEvery)-1+4)%4],offset:(layer%2===0?.7:.3),x:x+100,y:y-36});}
  if(layer>=12&&layer%12===0&&type!=='seesaw'){
   g.rejoinCenter=center;const bx=x+w+150<W?x+w+45:x-145;const branch={id:g.nextId++,x:bx,baseX:bx,y:y+45,w:100,type:'crumble',layer,branch:true};g.platforms.push(branch);
   const reward=g.items.find(i=>i.id===layer);if(reward){reward.platformId=branch.id;reward.offset=.5;reward.x=bx+50;reward.y=branch.y-36;}
  }
  if(type==='pulse'){const sx=x<350?x+w+32:x-152;g.platforms.push({id:g.nextId++,x:sx,baseX:sx,y:y+55,w:120,type:type==='pulse'||routeIndex===2?'solid':'crumble',layer});}
 }
 const occupied=new Set(g.players.filter(p=>p.alive).map(p=>p.ground));
 g.items=g.items.filter(i=>!i.collected&&i.y>g.camera-100);
 g.platforms=g.platforms.filter(f=>f.y>g.camera-180||occupied.has(f.id));
}

export function record(g,p,text,title){
 g.events.push({id:++g.eventId,t:g.t,playerId:p?.id,name:p?.name||'深渊播报',title:title||'水果猛男',text});if(g.events.length>40)g.events.shift();
}
export function award(p,rank,multiplayer=true){
 const s=p.stats||{};
 if(multiplayer&&rank===1)return {title:'笑到最后的真男人',detail:'本局第一名，奖牌归你'};
 // Brawl-only honours: what you did with the items says more than how deep you got.
 if(s.throwHits>=3)return {title:'百步穿果的男人',detail:'至少 3 次毒果命中'};
 if(s.gifted>=2)return {title:'烂好人',detail:'把 2 件好东西送给了对手'};
 if(s.blocked>=2)return {title:'油盐不进的男人',detail:'护盾挡下至少 2 次攻击'};
 if(s.throwHits>=1&&s.hits===0)return {title:'只打人不挨打的男人',detail:'打中过对手，自己一滴血没掉'};
 if(p.meters>=1000)return {title:'深不可测真男人',detail:'突破 1000 米深渊'};
 if(s.clocks>=2)return {title:'向天再借五秒的男人',detail:'至少拾取 2 个沙漏'};
 if(s.heals>=2)return {title:'极限续命的男人',detail:'至少成功回血 2 次'};
 if(s.poison>=2)return {title:'以身试毒的男人',detail:'尝过至少 2 颗毒果'};
 if(s.rescues>=2)return {title:'命硬的男人',detail:'至少 2 次失足获救'};
 if(s.hits===0&&p.meters>=100)return {title:'稳如老狗的男人',detail:'无伤下降至少 100 米'};
 if(s.hits>=1)return {title:'嘴硬的男人',detail:'掉过血，嘴上依然说没事'};
 return {title:'初来乍到的猛男',detail:'每位高手，都从第一跳开始'};
}
export function eliminate(g,p,reason){if(p.alive){p.alive=false;p.diedAt=g.t;p.deathX=p.x;p.deathY=p.y;p.reason=reason;p.ground=null;
 if(g.players.some(q=>q.cpu))for(const field of ['bombs','throws','heroShots']){for(const shot of g[field]||[])if(shot.from===p.id){shot.cancelled=true;shot.until=0;}if(g[field])g[field]=g[field].filter(shot=>!shot.cancelled);}
 record(g,p,p.timedOut?`时间到，以 ${p.meters} 米完赛`:`${reason}，止步 ${p.meters} 米`,p.timedOut?'准时下班的男人':'下次一定的男人');}}
export function hurt(g,p,reason){
 if(!p.alive||p.downed||g.t<p.invulnerableUntil)return false;
 p.invulnerableUntil=g.t+1.4;p.hurtAt=g.t;
 if(p.shield){p.shield=false;p.lastHit='护盾抵挡';record(g,p,'护盾碎了，人还在！','有备而来的男人');return true;}
 p.stats.hits++;p.hp=Math.max(0,p.hp-1);p.lastHit=reason+' · −1 生命';
 if(p.hp===1)record(g,p,'只剩 1 格血：我还能跳！','嘴硬的男人');
 if(p.hp===0){if(g.rules.mode==='coop')downPlayer(g,p,reason);else eliminate(g,p,reason);}return true;
}
function rescue(g,p,reason){
 hurt(g,p,reason);if(!p.alive||p.downed)return;
 const safe=g.platforms.filter(f=>!f.broken&&!(f.type==='pulse'&&f.active)&&f.y>g.camera+100&&f.y<g.camera+H-70).sort((a,b)=>Math.abs(a.y-(g.camera+300))-Math.abs(b.y-(g.camera+300)))[0];
 if(!safe){eliminate(g,p,reason);return;}
 p.rescueAt=g.t;p.rescueFrom={x:p.x,y:p.y};p.stats.rescues++;record(g,p,'失足获救，重新站上平台','命硬的男人');p.x=safe.x+safe.w/2;p.y=safe.y;p.vy=0;p.ground=safe.id;p.lastSafe=safe.y;
}
export function collectItem(g,p,item){
 if(item.collected||!p.alive||p.downed||(g.rules.mode==='coop'&&item.type==='heart'&&p.heart))return false;
 if(item.type==='relic'){item.collected=p.id;p.pickupAt=g.t;p.lastPickup='relic';p.pickupGain=0;applyRelic(g,p,item.relic);record(g,p,CHAPTER_RELICS[item.relic].name+' · '+CHAPTER_RELICS[item.relic].tip,'秘宝生效');return true;}
 // In a brawl nothing takes effect on contact: a pickup is ammunition, and what it does depends
 // on whether you spend it on yourself or throw it at somebody.
 if(g.rules.mode==='brawl'){
  if(p.carry)return false;
  item.collected=p.id;p.carry=item.type;p.pickupAt=g.t;p.lastPickup=item.type;p.pickupGain=0;
  record(g,p,item.type==='freeze'?'捡到冰冻果，按 F 投掷减速':item.type==='poison'?'捡到一颗毒果，找个人送出去':item.type==='heart'?'揣好红心：自己吃，还是做个好人？':'捡到护盾，按 Q 穿上',item.type==='poison'?'弹药充足的男人':'有货在手的男人');
  return true;
 }
 // An item that can do nothing for this player is left on the ledge instead of being spent for
 // nothing. Every other path already works this way — an uncatchable heart keeps flying past
 // (`ball.caught=false`), coop refuses a second heart, a full brawl pack refuses everything — and
 // contact pickup was the one route still destroying items silently. Walking over a heart at full
 // health used to delete it, which reads as the pickup being broken rather than declined.
 if(item.type==='heart'&&g.rules.mode!=='coop'&&p.hp>=p.maxHp)return false;
 if(item.type==='shield'&&p.shield)return false;
 if(item.type==='time'&&g.rules.mode==='timed'&&p.bonusTime>=30)return false;
 item.collected=p.id;p.pickupAt=g.t;p.lastPickup=item.type;p.pickupGain=0;
 if(item.type==='heart'&&g.rules.mode==='coop'){p.heart=true;record(g,p,'装好一颗红心：自己吃，还是传给搭子？','有粮在手的男人');}
 else if(item.type==='heart'){p.pickupGain=Math.min(1,p.maxHp-p.hp);p.hp+=p.pickupGain;if(p.pickupGain){p.stats.heals++;record(g,p,'吃下红心，生命 +1','极限续命的男人');}}
 if(item.type==='shield'){p.shield=true;record(g,p,'捡到护盾，这次有备而来','有备而来的男人');}
 if(item.type==='time'&&g.rules.mode==='timed'){p.pickupGain=Math.min(5,30-p.bonusTime);p.bonusTime+=p.pickupGain;if(p.pickupGain){p.stats.clocks++;record(g,p,`抢到沙漏，给自己加了 ${p.pickupGain} 秒`,'向天再借五秒的男人');}}
 if(item.type==='poison'){p.stats.poison++;record(g,p,'吃了紫色毒果：这果不对劲！','以身试毒的男人');hurt(g,p,'误食了毒果');}return true;
}
// Outliving the rest of the roster is not the end of the run, it is the reward for it: whoever is
// left keeps descending until the shaft takes them too. This used to apply only when the survivor
// was a human playing against bots, which quietly cut every AI-vs-AI match short at the first
// death and left the winner's real depth unmeasured. Ranking already sorts by who lasted longest,
// so nothing had to change for the result to stay meaningful.
function finish(g){
 g.phase='finished';
 if(g.rules.mode==='coop'){
  g.result=g.players.map(p=>({...p,rank:1,score:g.teamMeters*10,title:p.stats.teamRescues?'救命恩人真男人':p.stats.catches?'接得住的真男人':p.stats.passes?'有福同享的男人':p.stats.receivedRescues?'全靠兄弟的男人':'最佳搭子真男人',detail:`救援 ${p.stats.teamRescues} 次 · 传球 ${p.stats.passes} 次 · 接球 ${p.stats.catches} 次`}));
  record(g,null,`这对搭子共同抵达 ${g.teamMeters} 米 / ${g.teamDepth} 层`,'双人协作结算');return;
 }

 const sorted=[...g.players].sort((a,b)=>g.rules.mode==='timed'?b.score-a.score:Number(b.alive)-Number(a.alive)||(b.diedAt??g.t)-(a.diedAt??g.t));
 g.result=sorted.map((p,i)=>{let prev=sorted[i-1];const tied=prev&&(g.rules.mode==='timed'?prev.score===p.score:prev.alive===p.alive&&(p.alive||Math.abs(prev.diedAt-p.diedAt)<.001));return {id:p.id,name:p.name,color:p.color,look:p.look,badge:p.badge||null,depth:p.depth,meters:p.meters,score:p.score,alive:p.alive,reason:p.reason,rank:tied?null:i+1};});
 g.result.forEach((r,i)=>{if(r.rank===null)r.rank=g.result[i-1].rank;Object.assign(r,g.campaignComplete&&r.alive?{title:'劫尽归来的真男人',detail:'通关八十一难 · 击败九大妖王'}:award(sorted[i],r.rank,g.players.length>1));});for(const r of g.result.filter(r=>r.rank===1))record(g,r,`以 ${r.meters} 米获得${g.players.length>1?'本局第一':'本次练习成绩'}`,r.title);
}
function jump(g,p){p.vy=-340;p.ground=null;p.jumpedAt=g.t;p.lastGroundedAt=-10;p.jumpBufferedUntil=-10;}
export function step(g,inputs={},dt=1/60){
 if(g.phase!=='playing')return;
 g.t+=dt;
 if(g.chapterTransition){if(g.t<g.chapterTransition.until){if(g.rules.mode==='timed')for(const p of g.players)p.bonusTime+=dt;return;}delete g.chapterTransition;}
 campaignStep(g,dt,hurt,record);worldRelicStep(g);bossRewardStep(g,inputs,record);
 if(g.bossArena){
  const floor=g.bossArena.floor;
  for(const p of g.players){if(p.downed&&g.t>=p.downedUntil)eliminate(g,p,'搭子没能及时拉住你');if(!p.alive||p.downed)continue;const i=inputs[p.id]||{};p.vx=((i.right?1:0)-(i.left?1:0))*300*(g.t<(p.frozenUntil||0)?.45:1);if(g.t<(p.flyKickUntil||0))p.vx=p.flyKickDir*520;p.x=Math.max(25,Math.min(875,p.x+p.vx*dt));
   if(i.jump&&!p.jumpHeld&&p.y>=floor){p.vy=-340;p.jumpedAt=g.t;}p.jumpHeld=!!i.jump;p.vy+=1350*dt;p.y=Math.min(floor,p.y+p.vy*dt);if(p.y===floor){p.vy=0;p.ground=-999;}else p.ground=null;
   if(g.rules.mode==='timed'){p.timeLeft=Math.max(0,g.rules.duration+p.bonusTime-g.t);if(!p.timeLeft){p.timedOut=true;eliminate(g,p,'时间到');}}
  }
  if(g.rules.mode==='brawl')brawlStep(g,inputs,dt);
  fallBossStep(g,inputs,dt,hurt,record);
  if(g.rules.mode==='coop'){coopStep(g,inputs,dt);if(g.players.every(p=>p.downed||!p.alive)){for(const p of g.players)if(p.downed)eliminate(g,p,'救援机会耗尽');finish(g);return;}}
  const alive=g.players.filter(p=>p.alive);if(g.campaignComplete||!alive.length)finish(g);return;
 }
 // Fixed view: world scroll depends only on distance, never on a player's position.
 g.speed=(80+180*(1-Math.exp(-g.camera/6000)))*(g.difficulty==='easy'?.70:g.difficulty==='hard'?1.12:1);
 if(g.t>.8)g.camera+=g.speed*dt*(g.rules.mode==='coop'&&g.players.some(p=>p.downed)?.25:1);
 extendWorld(g);
 for(const f of g.platforms){const old=f.x;if(f.type==='moving')f.x=f.baseX+Math.sin(g.t*(g.campaign?.slot===3?1.65:1.3)+f.id)*55;f.dx=f.x-old;if(f.type==='pulse'){const phase=(g.t*(g.campaign?.slot===5?1.15:1)+f.id*.27)%4.5;f.warning=phase>=2.6&&phase<3.6;f.active=phase>=3.6;} if(f.beast)beastStep(g,f);if(f.breakAt&&g.t>=f.breakAt)f.broken=true;}
 for(const f of g.platforms){
  if(f.grabbedAt===undefined||f.broken)continue;
  // Tip away from the claw so the slab visibly sheds anyone still standing on it.
  const ramp=Math.min(1,(g.t-f.grabbedAt)/BEAST_HOLD);
  f.tilt=(f.beast==='left'?.24:-.24)*ramp;
 }
 for(const f of g.platforms.filter(f=>f.type==='seesaw')){
  const weight=g.players.filter(p=>p.alive&&!p.downed&&p.ground===f.id).reduce((n,p)=>n+(p.x-f.x-f.w/2)/(f.w/2),0);
  f.tilt=(f.tilt||0)+(Math.max(-.13,Math.min(.13,weight*.13))-(f.tilt||0))*Math.min(1,dt*8);
 }
 for(const p of g.players){
  if(!p.alive)continue;
  if(p.downed){if(g.t>=p.downedUntil)eliminate(g,p,'搭子没能及时拉住你');continue;}

  if(g.rules.mode==='timed'){p.timeLeft=Math.max(0,g.rules.duration+p.bonusTime-g.t);if(p.timeLeft<=0){p.timedOut=true;eliminate(g,p,'时间到');continue;}}
  if(g.campaign?.slot===1)p.x=Math.max(25,Math.min(875,p.x+Math.sin(g.t*.7)*(g.difficulty==='easy'?18:30)*dt));
  const input=inputs[p.id]||{};const ground=g.platforms.find(f=>f.id===p.ground);
  if(ground&&!ground.broken)p.x+=(ground.dx||0)+(ground.type==='conveyor'?(ground.layer%2?100:-100)*dt:0);
  if(ground?.stage===11)p.x+=Math.sign(ground.x+ground.w/2-p.x)*Math.min(55*dt,Math.abs(ground.x+ground.w/2-p.x));
  if(ground&&!ground.broken){p.lastGroundedAt=g.t;if(ground.type==='seesaw'||ground.grabbedAt!==undefined)p.y=surfaceY(ground,p.x);}
  if(ground?.broken)p.ground=null;
  if(input.jump&&!p.jumpHeld)p.jumpBufferedUntil=g.t+.14;
  p.jumpHeld=!!input.jump;
  p.drop=Math.max(0,p.drop-dt);
  p.knockback=(p.knockback||0)*Math.max(0,1-dt*7);p.vx=((input.left?-300:0)+(input.right?300:0))*(g.t<(p.frozenUntil||0)?.45:1)+p.knockback;p.x=Math.max(18,Math.min(W-18,p.x+p.vx*dt));
  if(input.drop&&p.ground!==null){p.drop=.28;p.ground=null;p.lastGroundedAt=-10;p.jumpBufferedUntil=-10;p.y+=3;}
  if(p.jumpBufferedUntil>=g.t&&p.drop<=0&&(p.ground!==null||g.t-p.lastGroundedAt<=.12)){jump(g,p);}
  const oldY=p.y;p.vy=Math.min(650,p.vy+1350*dt);p.y+=p.vy*dt;p.ground=null;
  if(p.vy>=0&&p.drop<=0){
   for(const f of g.platforms){if(f.broken)continue;
    const fy=surfaceY(f,p.x);
    if(p.x+13>f.x&&p.x-13<f.x+f.w&&oldY<=fy+Math.abs((f.tilt||0)*p.vx*dt)+.5&&p.y>=fy){
     if(f.y-p.lastSafe>460){hurt(g,p,'坠落太深');if(!p.alive||p.downed)break;}
     if(f.type==='pulse'&&f.active){hurt(g,p,'踩中了启动的尖刺');if(!p.alive||p.downed)break;}
     if(f.type==='seesaw'&&!f.orchard&&p.vy>180&&g.t>=(f.launchAt||0)){
      const other=g.players.find(q=>q.id!==p.id&&q.alive&&!q.downed&&q.ground===f.id&&(q.x-f.x-f.w/2)*(p.x-f.x-f.w/2)<0);
      if(other){other.vy=-460;other.ground=null;other.lastGroundedAt=-10;other.jumpedAt=g.t;f.launchAt=g.t+1.2;record(g,p,`把 ${other.name} 弹了起来！`,'人形弹簧的男人');}
     }
     if(p.vy>100){p.landedAt=g.t;p.landedType=f.type;}
     p.y=fy;p.vy=0;p.ground=f.id;p.lastSafe=f.y;p.depth=Math.max(p.depth,f.layer);
     if(f.orchard==='branch'&&!f.breakAt){f.breakAt=g.t+4;record(g,null,'倒悬果园：树枝开始断裂，4 秒内寻找下一个落点！','战场坍塌');}
     if(f.type==='crumble'&&!f.breakAt)f.breakAt=g.t+(g.difficulty==='easy'?(f.branch?.9:1.4):(f.branch?.65:1.05));
     if(f.type==='spring'&&g.t>=(p.springReadyAt||0)){p.vy=f.stage===5?-480:f.stage===4?-440:-400;p.ground=null;p.springReadyAt=g.t+.95;p.lastGroundedAt=-10;p.jumpBufferedUntil=-10;f.compressedAt=g.t;}
     if(p.ground!==null&&p.jumpBufferedUntil>=g.t)jump(g,p);
     break;
    }
   }
  }
  if(p.downed||!p.alive)continue;
  for(const item of g.items){if(item.collected)continue;const base=g.platforms.find(f=>f.id===item.platformId);if(!base||base.broken)continue;item.x=base.x+base.w*item.offset;item.y=base.y-36;
   if(Math.abs(p.x-item.x)<29&&Math.min(oldY,p.y)-57<=item.y+12&&Math.max(oldY,p.y)>=item.y-12)collectItem(g,p,item);
  }
  if(p.downed||!p.alive)continue;
  if(g.rules.mode==='timed')p.timeLeft=Math.max(0,g.rules.duration+p.bonusTime-g.t);
  p.meters=Math.max(p.meters,Math.floor(Math.max(0,p.y-160)/10));p.score=p.meters*10;const milestone=Math.floor(p.meters/100);if(milestone>p.milestone){p.milestone=milestone;record(g,p,`突破 ${milestone*100} 米，继续往下！`,milestone>=10?'深不可测真男人':'一路向下的男人');}
  if(p.y<g.camera+22)rescue(g,p,'被危险线追上');
  else if(p.y>g.camera+H+65)rescue(g,p,'掉出安全区域');
  else if(p.y-p.lastSafe>470)rescue(g,p,'连续坠落过深');
 }
 fallBossStep(g,inputs,dt,hurt,record);
 if(!g.fallBoss&&!g.bossEntrance)encounterStep(g,dt,hurt,record);
 if(g.rules.mode==='brawl'){brawlStep(g,inputs,dt);combatStep(g,g.fallBoss?Object.fromEntries(Object.entries(inputs).map(([id,i])=>[id,{...i,bomb:false}])):inputs,dt,hurt,record);}
 if(g.rules.mode==='coop'){
  coopStep(g,inputs,dt);
  g.teamMeters=Math.min(...g.players.map(p=>p.meters));g.teamDepth=Math.min(...g.players.map(p=>p.depth));
  if(g.players.some(p=>!p.alive)||g.players.every(p=>p.downed)){
   for(const p of g.players)if(p.downed)eliminate(g,p,'救援机会耗尽');
   finish(g);return;
  }
 }
 const alive=g.players.filter(p=>p.alive);
 if(!alive.length)finish(g);
}

export function surfaceY(f,x){return f.y+(f.type==='seesaw'||f.grabbedAt!==undefined?(x-f.x-f.w/2)*(f.tilt||0):0);}

// How far a beast platform has travelled up the screen decides its phase, so the warning always
// arrives at the same place on screen and the window shortens naturally as the fall speeds up.
export const BEAST_BANDS={lurk:600,warn:470,reach:380};
export const BEAST_HOLD=.55;
function beastStep(g,f){
 const onScreen=f.y-g.camera;
 const phase=onScreen>BEAST_BANDS.lurk?'lurk':onScreen>BEAST_BANDS.warn?'warn':onScreen>BEAST_BANDS.reach?'reach':'grip';
 f.beastPhase=phase;
 if(phase!=='grip'||f.grabbedAt!==undefined)return;
 // The claw closes once; from here the slab tips towards the wall it came from and gives way.
 f.grabbedAt=g.t;f.breakAt=g.t+BEAST_HOLD;
 record(g,null,'恶兽抓住了一块石台，站上去的赶紧走','恶兽出手');
}
function downPlayer(g,p,reason){
 const mate=g.players.find(q=>q.id!==p.id&&q.alive&&!q.downed);
 const anchor=g.platforms.filter(f=>!f.broken&&f.type!=='pulse'&&f.y>g.camera+65&&f.y<g.camera+H-100).sort((a,b)=>Math.abs(a.y-(mate?.y||p.y))-Math.abs(b.y-(mate?.y||p.y)))[0];
 if(!anchor){eliminate(g,p,reason);return;}
 p.downed=true;p.downedUntil=g.t+6;p.downedAt=g.t;p.reviveProgress=0;p.vx=0;p.vy=0;p.anchorId=anchor.id;p.ground=anchor.id;
 p.x=Math.max(anchor.x+18,Math.min(anchor.x+anchor.w-18,mate?.x||p.x));p.y=anchor.y+45;p.rescueAt=g.t;p.rescueFrom=null;
 record(g,p,'挂住了！搭子靠近按住 E，6 秒内拉我一把！','等你救命的男人');
}
// 道具互殴: one carried item, and the only interesting question is who you spend it on.
// Poison is the weapon, a heart heals whoever catches it — including an opponent — and a shield
// eats the next hit. Nothing here needs fast hands, which is what makes it a decision worth making.
export const THROW_SPEED=300, THROW_LIFT=-190, THROW_LIFE=2.6;

function throwItem(g,p,dir){
 const type=p.carry;p.carry=null;p.stats.passes++;p.throwAt=g.t;
 const x=p.x+dir*18,y=p.y-32;
 const candidates=g.players.filter(q=>q.id!==p.id&&q.alive&&!q.downed).map(q=>({x:q.x,y:q.y-28}));
 if(g.fallBoss?.hp>0&&['poison','freeze'].includes(type))candidates.push({x:g.fallBoss.x,y:g.fallBoss.y});
 const target=candidates.filter(q=>(q.x-x)*dir>=0&&Math.abs(q.x-x)<650&&Math.abs(q.y-y)<300).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
 const flight=target?Math.max(.18,Math.abs(target.x-x)/THROW_SPEED):0;
 const vy=target?(target.y-y)/flight-210*flight:THROW_LIFT;
 g.throws.push({id:++g.nextId,type,from:p.id,x,y,vx:dir*THROW_SPEED,vy,until:g.t+THROW_LIFE});
 return type;
}

function brawlStep(g,inputs,dt){
 for(const p of g.players){
  if(!p.alive||p.downed)continue;
  const input=inputs[p.id]||{};
  // Q spends the carried item on yourself. Poison has no self use; throwing it is the only exit.
  if(input.eat&&!p.eatHeld&&p.carry){
   if(p.carry==='heart'&&p.hp<p.maxHp){p.carry=null;p.hp++;p.stats.heals++;p.eatAt=g.t;p.pickupAt=g.t;p.lastPickup='heart';p.pickupGain=1;record(g,p,'吃下随身红心，生命 +1','极限续命的男人');}
   else if(p.carry==='shield'&&!p.shield){p.carry=null;p.shield=true;p.pickupAt=g.t;p.lastPickup='shield';record(g,p,'护盾穿上了，来啊','有备而来的男人');}
   else if(p.carry==='freeze')record(g,p,'冰冻果用来投掷，按 F 冻住对手','道具提示');
   else if(p.carry==='heart')record(g,p,'生命已满，红心保留在背包','道具提示');
   else if(p.carry==='shield')record(g,p,'护盾已经生效，备用护盾留在背包','道具提示');
   else if(p.carry==='poison')record(g,p,'毒果自己是吃不得的，扔出去','以身试毒的男人');
  }
  // F throws it. Aim follows the direction you are holding, or the nearest rival if you hold none.
  if(input.pass&&!p.passHeld&&p.carry){
   let dir=input.left?-1:input.right?1:0;
   if(!dir){
    const rivals=g.players.filter(q=>q.id!==p.id&&q.alive&&!q.downed);
    const near=rivals.length?rivals.reduce((a,b)=>Math.abs(b.x-p.x)<Math.abs(a.x-p.x)?b:a):null;
    dir=near?Math.sign(near.x-p.x)||1:g.fallBoss?.hp>0?Math.sign(g.fallBoss.x-p.x)||1:(p.facing||1);
   }
   p.throwAt=g.t;const type=throwItem(g,p,dir);
   record(g,p,type==='freeze'?'冰果出手，冻住他的脚步':type==='poison'?'毒果出手了，接好':type==='heart'?'把红心扔了出去，谁接到算谁的':'把护盾扔了出去','出手了的男人');
  }
  p.eatHeld=!!input.eat;p.passHeld=!!input.pass;
 }

 for(const ball of g.throws){
  if(ball.cancelled||ball.caught||ball.until<=g.t)continue;
  const oldX=ball.x,oldY=ball.y;
  ball.vy+=420*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
  // Swept test, so a fast projectile cannot tunnel through a player between two frames.
  const victim=g.players.find(q=>q.id!==ball.from&&q.alive&&!q.downed
   &&Math.max(oldX,ball.x)>q.x-27&&Math.min(oldX,ball.x)<q.x+27
   &&Math.max(oldY,ball.y)>q.y-60&&Math.min(oldY,ball.y)<q.y+6);
  if(!victim){
   const b=g.fallBoss;
   if(b?.hp>0&&['poison','freeze'].includes(ball.type)&&Math.max(oldX,ball.x)>b.x-55&&Math.min(oldX,ball.x)<b.x+55&&Math.max(oldY,ball.y)>b.y-65&&Math.min(oldY,ball.y)<b.y+65){
    ball.caught=true;strikeBoss(b,ball.type==='poison'?24:16,g.t);
    if(ball.type==='freeze')b.nextAttack=Math.max(b.nextAttack||0,g.t+1.5);
    g.bossAudio??=[];g.bossAudio.push({id:g.bossAudioId=(g.bossAudioId||0)+1,kind:'impact',x:b.x,y:b.y,at:g.t});if(g.bossAudio.length>32)g.bossAudio.shift();
    record(g,g.players.find(p=>p.id===ball.from),ball.type==='poison'?'毒果命中妖王，造成伤害':'冰果命中妖王，打断出招节奏','道具命中');
   }
   continue;
  }
  ball.caught=true;
  const thrower=g.players.find(q=>q.id===ball.from);
  if(ball.type==='poison'){
   const hadShield=victim.shield;
   if(hurt(g,victim,`吃了 ${thrower?.name||'某人'} 扔来的毒果`)){
    if(thrower){thrower.stats.throwHits++;record(g,thrower,`一颗毒果命中 ${victim.name}${hadShield?'，被护盾挡了':''}`,'百步穿果的男人');}
    if(hadShield)victim.stats.blocked++;
   }
  }else if(ball.type==='freeze'){
   if(g.t>=victim.invulnerableUntil){if(victim.shield)hurt(g,victim,'冰果被护盾挡住');else{victim.frozenUntil=g.t+1.2;victim.invulnerableUntil=g.t+.6;victim.hurtAt=g.t;victim.lastHit='冰果 · 减速 1.2 秒';record(g,victim,'被冰果冻住脚步，还能跳跃躲避','冻得哆嗦的男人');}}
  }else if(ball.type==='heart'){
   if(victim.hp<victim.maxHp){
    victim.hp++;victim.stats.catches++;victim.stats.heals++;victim.pickupAt=g.t;victim.lastPickup='heart';victim.pickupGain=1;
    if(thrower){thrower.stats.gifted++;record(g,thrower,`把红心送给了 ${victim.name}，图什么呢`,'烂好人');}
   }else ball.caught=false;
  }else if(ball.type==='shield'){
   if(!victim.shield){victim.shield=true;victim.stats.catches++;if(thrower)thrower.stats.gifted++;record(g,victim,`接住了 ${thrower?.name||'某人'} 的护盾`,'接得住的真男人');}
   else ball.caught=false;
  }
 }
 g.throws=g.throws.filter(b=>!b.caught&&b.until>g.t&&b.y<g.camera+H+80&&b.x>-40&&b.x<W+40);
}

function coopStep(g,inputs,dt){
 for(const p of g.players){
  if(!p.alive)continue;
  if(p.downed){
   const f=g.platforms.find(f=>f.id===p.anchorId);
   if(!f||f.broken||f.y<g.camera+28){eliminate(g,p,'抓住的平台消失了');continue;}
   p.x+=f.dx||0;p.y=surfaceY(f,p.x)+45;
   const helper=g.players.find(q=>q.id!==p.id&&q.alive&&!q.downed&&q.ground!==null&&Math.abs(q.x-p.x)<95&&Math.abs(q.y-(p.y-45))<65&&inputs[q.id]?.rescue);
   p.helperId=helper?.id||null;p.reviveProgress=helper?(p.reviveProgress||0)+dt:0;
   if(helper&&p.reviveProgress>=.6){p.downed=false;p.hp=1;p.y=surfaceY(f,p.x);p.ground=f.id;p.lastSafe=p.y;p.invulnerableUntil=g.t+1.8;p.rescueAt=g.t;p.revivedAt=g.t;p.stats.receivedRescues++;helper.stats.teamRescues++;record(g,helper,`把 ${p.name} 拉了回来，生命恢复 1 格`,'救命恩人真男人');}
   continue;
  }
  const input=inputs[p.id]||{};
  if(input.eat&&!p.eatHeld&&p.heart&&p.hp<p.maxHp){p.heart=false;p.hp++;p.stats.heals++;p.eatAt=g.t;p.pickupAt=g.t;p.lastPickup='heart';p.pickupGain=1;record(g,p,'吃下随身红心，生命 +1','极限续命的男人');}
  if(input.pass&&!p.passHeld&&p.heart){
   const mate=g.players.find(q=>q.id!==p.id&&q.alive&&!q.downed);
   if(mate){p.throwAt=g.t;p.heart=false;p.stats.passes++;g.throws.push({id:++g.nextId,type:'heart',from:p.id,x:p.x,y:p.y-32,vx:Math.sign(mate.x-p.x||1)*260,vy:-170,until:g.t+3});record(g,p,`向 ${mate.name} 扔出红心，接住！`,'有福同享的男人');}
  }
  p.eatHeld=!!input.eat;p.passHeld=!!input.pass;
 }
 for(const ball of g.throws){const oldX=ball.x,oldY=ball.y;ball.vy+=420*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
  const receiver=g.players.find(p=>p.id!==ball.from&&p.alive&&!p.downed&&p.hp<p.maxHp&&Math.max(oldX,ball.x)>p.x-27&&Math.min(oldX,ball.x)<p.x+27&&Math.max(oldY,ball.y)>p.y-60&&Math.min(oldY,ball.y)<p.y+6);
  if(receiver){receiver.hp++;receiver.stats.catches++;receiver.stats.heals++;receiver.pickupAt=g.t;receiver.lastPickup='heart';receiver.pickupGain=1;ball.caught=true;record(g,receiver,'接住搭子的红心，生命 +1！','接得住的真男人');}
 }
 g.throws=g.throws.filter(b=>!b.caught&&b.until>g.t&&b.y<g.camera+H+80&&b.x>-40&&b.x<W+40);
}

// A local player may leave a CPU match after elimination without inventing a bot winner.
export function endCpuSpectating(g,id){
 const p=g.players.find(p=>p.id===id);if(g.phase!=='playing'||!p||p.alive||!g.players.some(q=>q.cpu))return false;
 const rank=1+g.players.filter(q=>q.id!==id&&(q.alive||(q.diedAt??0)>(p.diedAt??0))).length;
 g.phase='finished';g.earlyExit=true;g.result=[{...p,rank,...award(p,rank,false)}];return true;
}
