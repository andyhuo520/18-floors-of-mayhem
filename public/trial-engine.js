import {strikeBoss,recoverGuard} from './boss-rules.js';
import {comboStep,launchSkill,steerSkill} from './hero-skills.js';
export const TW=960,TH=600,FLOOR=480;
export const KINGS=[
 {name:'石心猿王',land:'花果残山',color:'#90d3ae',pattern:'stomp'},
 {name:'铁耙山君',land:'高庄古寨',color:'#e1b27d',pattern:'charge'},
 {name:'流沙骸将',land:'流沙古渡',color:'#a8cbd3',pattern:'wave'},
 {name:'金角炎牛',land:'焚风山口',color:'#f4a06e',pattern:'fan'},
 {name:'白骨灯姬',land:'白骨荒寺',color:'#dfc6e9',pattern:'rain'},
 {name:'赤轮童子',land:'三昧火窟',color:'#ff8f7d',pattern:'bounce'},
 {name:'盘丝织后',land:'盘丝悬桥',color:'#d9a0db',pattern:'web'},
 {name:'雷翅鹏尊',land:'雷音云海',color:'#c3b5ff',pattern:'thunder'},
 {name:'玄莲魔尊',land:'黑莲天宫',color:'#f4d998',pattern:'lotus'}
];
export const AFFLICTIONS=[
 {name:'初见妖踪',tip:'观察金色预警，躲开再还击。'},
 {name:'逆风难行',tip:'风会把你推向一侧，移动抵消。'},
 {name:'霜桥失足',tip:'木台结霜，松手后仍会滑行。'},
 {name:'落雷惊魂',tip:'天雷锁定位置后落下，看到光柱就走。'},
 {name:'妖弹回旋',tip:'妖弹速度提高，留好闪避。'},
 {name:'浮云踏空',tip:'重力减轻，跳跃滞空更久。'},
 {name:'烈焰封路',tip:'火焰封住一段木台，跳过红色区域。'},
 {name:'双影迷踪',tip:'攻击多一重虚影，注意第二波。'},
 {name:'劫尽真身',tip:'妖王强化，后半血进入狂暴。'}
];
export const TRIALS=Array.from({length:81},(_,i)=>({index:i,number:i+1,boss:i%9,affliction:Math.floor(i/9),name:KINGS[i%9].name+' · '+AFFLICTIONS[Math.floor(i/9)].name}));
export const WEAPONS=[{name:'穿云弓',gap:.24,damage:8,speed:650},{name:'三花禅杖',gap:.5,damage:5,speed:540},{name:'镇妖葫芦',gap:.7,damage:18,speed:390},{name:'火尖枪',gap:.36,damage:11,speed:780}];
export function makeTrial(index=0,look={},companion=false){
 const trial=TRIALS[Math.max(0,Math.min(80,Math.floor(Number(index)||0)))],hp=360+trial.boss*45+trial.affliction*12;
 return {trial,stats:{hits:0,damage:0,hurt:0,throws:0,ultimates:0},t:0,phase:'playing',look,companion,player:{look,x:180,y:FLOOR,vx:0,vy:0,hp:1,maxHp:3,shield:false,invulnerableUntil:1.5,weapon:0,bombs:3,energy:40,face:1},boss:{x:770,y:FLOOR,hp,maxHp:hp,guard:80+trial.boss*12,maxGuard:80+trial.boss*12,nextAttack:2.3,cycle:0},shots:[],enemy:[],warnings:[],pickups:[],effects:[],events:[],nextPickup:5,nextRefill:12,nextCompanion:1,rng:(index+1)*7831,serial:0};
}
const rnd=g=>((g.rng=(g.rng*1664525+1013904223)>>>0)/4294967296);
function emit(g,type,x,y){g.events.push({id:++g.serial,type,x,y});if(g.events.length>40)g.events.shift();}
function damagePlayer(g){if(g.phase!=='playing')return;const p=g.player;if(g.t<p.invulnerableUntil)return;if(p.shield){p.shield=false;p.invulnerableUntil=g.t+1;emit(g,'shield',p.x,p.y);return;}p.hp--;g.stats.hurt++;p.hurtAt=g.t;p.invulnerableUntil=g.t+1.4;emit(g,'hurt',p.x,p.y);if(p.hp<=0){g.phase='failed';emit(g,'death',p.x,p.y);}}
function damageBoss(g,amount){if(g.phase!=='playing')return;amount=Math.round(amount*(bossState(g)==='recover'?1.3:1));g.stats.hits++;g.stats.damage+=Math.min(g.boss.hp,amount);strikeBoss(g.boss,amount,g.t);g.boss.hitAt=g.t;g.player.energy=Math.min(100,g.player.energy+amount*.9);emit(g,'hit',g.boss.x,g.boss.y-65);if(!g.boss.hp){g.phase='cleared';emit(g,'win',g.boss.x,g.boss.y);}}
export function bossState(g){const b=g.boss;if(g.phase==='cleared')return 'defeated';if(g.t<(b.releaseAt||0))return 'windup';if(g.t<(b.recoverAt||0))return 'attack';if(g.t<(b.restUntil||0))return 'recover';return 'idle';}
function warn(g,kind,x,y,delay=.95){g.warnings.push({kind,x,y,direction:g.player.x<x?-1:1,at:g.t+delay});emit(g,'warning',x,y);}
function bossAttack(g){const b=g.boss,phase=b.hp<b.maxHp*.5,kind=KINGS[g.trial.boss].pattern,cycle=b.cycle++;
 b.targetX=740+Math.sin(cycle*.9)*90;b.startedAt=g.t;
 if(kind==='stomp'||kind==='thunder')warn(g,'pillar',g.player.x,FLOOR,phase?.75:1.05);
 else if(kind==='charge')warn(g,'wave',b.x,FLOOR-14,1);
 else if(kind==='rain'){for(let i=0;i<3;i++)warn(g,'pillar',90+i*270+cycle%2*90,FLOOR,1.25);}
 else if(kind==='web')warn(g,'web',g.player.x,FLOOR,1.15);
 else if(kind==='lotus'){warn(g,'fan',b.x,b.y-70,.9);if(phase)warn(g,'pillar',g.player.x,FLOOR,1.3);}
 else warn(g,kind==='wave'?'wave':kind==='bounce'?'bounce':'fan',b.x,b.y-55,.9);
 if(g.trial.affliction===3)warn(g,'pillar',g.player.x,FLOOR,1.25);
 if(g.trial.affliction===6)warn(g,'fire',200+(cycle%3)*190,FLOOR,1.3);
 if(g.trial.affliction===7)warn(g,'fan',b.x,b.y-85,1.5);
 b.releaseAt=Math.min(...g.warnings.map(w=>w.at));b.recoverAt=Math.max(...g.warnings.map(w=>w.at))+.25;b.restUntil=b.recoverAt+.7;
 b.nextAttack=g.t+Math.max(1.5,3.5-g.trial.boss*.1-g.trial.affliction*.05-(phase?.45:0));
}
export function stepTrial(g,input={},dt=1/60){
 if(g.phase!=='playing')return;dt=Math.min(.05,Math.max(0,dt));g.t+=dt;const p=g.player,b=g.boss,a=g.trial.affliction;
 if(b.hp<b.maxHp*.5&&!b.enraged){b.enraged=true;emit(g,'rage',b.x,b.y);}
 b.targetX=480+280*Math.cos(g.t*.6);
 b.x+=Math.max(-90*dt,Math.min(90*dt,(b.targetX??b.x)-b.x));
 if(Number.isInteger(input.weapon)&&input.weapon>=0&&input.weapon<4)p.weapon=input.weapon;
 recoverGuard(b,g.t);
 const move=(input.right?1:0)-(input.left?1:0);if(move)p.face=move;
 p.vx=a===2?p.vx*.94+move*23:move*300;
 if(input.dash&&g.t>=(p.dashReady||0)){p.dashReady=g.t+1.8;p.dashUntil=g.t+.2;p.invulnerableUntil=Math.max(p.invulnerableUntil,g.t+.25);emit(g,'dash',p.x,p.y);}
 if(g.t<(p.slowUntil||0))p.vx*=.4;
 const dash=g.t<(p.dashUntil||0);p.x=Math.max(28,Math.min(900,p.x+(dash?p.face*850:p.vx+(a===1?Math.sin(g.t*.7)*65:0))*dt));
 if(input.jump&&!p.jumpHeld&&p.y>=FLOOR){p.vy=-490;emit(g,'jump',p.x,p.y);}p.jumpHeld=!!input.jump;
 p.vy+=(a===5?650:1250)*dt;p.y=Math.min(FLOOR,p.y+p.vy*dt);if(p.y===FLOOR)p.vy=0;
 const w=WEAPONS[p.weapon],aim=p.x<=b.x?1:-1;p.aim=aim;
 if(input.fire&&g.t>=(p.fireReady||0)){p.fireReady=g.t+w.gap;p.attackAt=g.t;for(const slope of p.weapon===1?[-.22,0,.22]:[0])g.shots.push({x:p.x+22*aim,y:p.y-45,vx:w.speed*aim,vy:w.speed*slope,damage:w.damage,type:p.weapon,until:g.t+3});emit(g,'shoot',p.x,p.y);}
 if(input.bomb&&!p.bombHeld&&p.bombs>0){p.bombs--;g.stats.throws++;p.throwAt=g.t;g.shots.push({x:p.x,y:p.y-45,vx:340*aim,vy:-230,damage:28,bomb:true,explodeAt:g.t+1.2,until:g.t+1.3});emit(g,'throw',p.x,p.y);}p.bombHeld=!!input.bomb;
 p.skillEnergy=Math.min(100,p.energy+dt*5);
 if(comboStep(p,{down:!!input.down,left:!!input.left,right:!!input.right,attack:!!input.fire},g.t)){g.stats.ultimates++;launchSkill(p,{x:b.x,y:b.y-65},g.t,g.shots);if([4,5].includes(p.look?.skin)){g.enemy=[];g.warnings=[];}p.invulnerableUntil=g.t+.5;emit(g,'ultimate',p.x,p.y);}p.energy=p.skillEnergy;
 if(g.companion&&g.t>=g.nextCompanion){g.nextCompanion=g.t+1;g.shots.push({x:90,y:FLOOR-48,vx:520,vy:0,damage:5,type:0,until:g.t+3});}
 if(g.t>=b.nextAttack)bossAttack(g);
 for(const warning of g.warnings){if(g.t<warning.at)continue;warning.done=true;const {x,y,kind,direction}=warning,speed=a===4?340:260;
  if(['pillar','fire','web'].includes(kind))g.enemy.push({x,y:kind==='pillar'?260:FLOOR-12,kind,w:kind==='pillar'?70:120,h:kind==='pillar'?440:35,until:g.t+(kind==='pillar'?.25:kind==='web'?1.2:1.5)});
  else for(const v of kind==='fan'?[-100,0,100]:[0])g.enemy.push({x,y:kind==='wave'?FLOOR-15:y,vx:speed*direction,vy:v,kind,w:24,h:24,until:g.t+4});
 }
 g.warnings=g.warnings.filter(w=>!w.done);
 for(const s of g.shots){if(s.until<=g.t)continue;steerSkill(s,{x:b.x,y:b.y-65},dt);const oldX=s.x;s.x+=s.vx*dt;s.y+=s.vy*dt;if(s.bomb){s.vy+=600*dt;if(s.y>FLOOR-10){s.y=FLOOR-10;s.vy*=-.45;}if(g.t>=s.explodeAt){s.done=true;g.effects.push({type:'blast',x:s.x,y:s.y,until:g.t+.3});emit(g,'blast',s.x,s.y);if(Math.hypot(s.x-b.x,s.y-(b.y-50))<155)damageBoss(g,s.damage);}}else if(Math.max(s.x,oldX)>=b.x-62&&Math.min(s.x,oldX)<=b.x+62&&Math.abs(s.y-(b.y-65))<80){s.done=true;damageBoss(g,s.damage);}}
 if(g.phase==='cleared')return;
 for(const e of g.enemy){e.x+=(e.vx||0)*dt;e.y+=(e.vy||0)*dt;if(e.kind==='bounce'){e.vy=(e.vy||0)+500*dt;if(e.y>FLOOR-15){e.y=FLOOR-15;e.vy=-280;}}
  if(Math.abs(e.x-p.x)<e.w/2+18&&Math.abs(e.y-(p.y-32))<e.h/2+28){if(e.kind==='web')p.slowUntil=g.t+1.1;damagePlayer(g);}}
 if(g.phase==='failed')return;
 if(g.t>=g.nextPickup){g.nextPickup=g.t+6;g.pickups.push({x:120+rnd(g)*510,y:FLOOR-25,type:['heart','shield','energy'][Math.floor(rnd(g)*3)],until:g.t+10});}
 for(const item of g.pickups)if(Math.abs(item.x-p.x)<32&&Math.abs(item.y-p.y+30)<45){item.done=true;if(item.type==='heart')p.hp=Math.min(3,p.hp+1);if(item.type==='shield')p.shield=true;if(item.type==='energy')p.energy=Math.min(100,p.energy+35);p.eatAt=g.t;emit(g,'eat',p.x,p.y);}
 if(g.t>=g.nextRefill){p.bombs=Math.min(3,p.bombs+1);g.nextRefill=g.t+12;}
 g.shots=g.shots.filter(s=>!s.done&&s.until>g.t&&s.x<1100&&s.x>-100);g.enemy=g.enemy.filter(e=>e.until>g.t&&e.x>-100);g.pickups=g.pickups.filter(i=>!i.done&&i.until>g.t);g.effects=g.effects.filter(e=>e.until>g.t);
}
