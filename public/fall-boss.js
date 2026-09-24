import {drawBossSkill,drawImpact} from './ultimate-vfx.js';
import {BOSS_ULTIMATES,castBossUltimate,BOSS_ATTACK_KINDS} from './boss-attacks.js';
import {arenaItemStep,fireArenaWeapon,drawArenaItems,grantBossReward} from './arena-items.js';
import {castBossAttack,stepBossZones,drawBossZones} from './boss-attacks.js';
import {drawBossBackdrop} from './boss-scenes.js';
import {strikeBoss,recoverGuard,bossMove} from './boss-rules.js';
import {comboStep,launchSkill,steerSkill,drawSkill} from './hero-skills.js';
// The exploration scroll pauses only during a sealed boss arena.
export const FALL_KINGS=['孙悟空','铁耙山君','流沙骸将','金角炎牛','白骨灯姬','赤轮童子','盘丝织后','雷翅鹏尊','玄莲魔尊'];
function cue(g,kind,x,y){g.bossAudio??=[];g.bossAudio.push({id:g.bossAudioId=(g.bossAudioId||0)+1,kind,x,y,at:g.t});if(g.bossAudio.length>32)g.bossAudio.shift();}
export function fallBossStep(g,inputs,dt,hurt,record){
 const alive=g.players.filter(p=>p.alive&&!p.downed);if(!alive.length)return;
 g.bossShots??=[];g.heroShots??=[];
 const reached=Math.max(...alive.map(p=>p.depth||0));
 if(!g.campaignComplete&&!g.fallBoss&&!g.bossEntrance&&reached>=(g.nextBossLayer??36)&&g.t>=60&&g.nextBossDepth!==Infinity){
  g.elite=null;g.eliteShots=[];g.bossEntrance={index:(g.bossCount||0)%9,at:g.t,until:g.t+3};g.encounter=null;
  record(g,null,'抵达第 '+reached+' 层，深处传来妖王的脚步……','妖气渐近');
 }
 if(g.bossEntrance&&g.t>=g.bossEntrance.until){g.bossEntrance=null;
  const index=(g.bossCount||0)%9;g.bossCount=(g.bossCount||0)+1;
  const maxHp=360+index*55+Math.max(0,alive.length-1)*110,maxGuard=80+index*12;
  g.fallBoss={index,x:730,y:g.camera+455,hp:maxHp,maxHp,guard:maxGuard,maxGuard,spawnAt:g.t,nextAttack:g.t+2,cycle:0};
  g.bossArena={floor:g.camera+520};g.encounter=null;g.bombs=[];g.blasts=[];g.throws=[];
  g.platforms.push({id:-999,x:0,baseX:0,y:g.bossArena.floor,w:900,type:'solid',layer:reached});
  for(const [n,p] of alive.entries()){p.x=150+n*65;p.y=g.bossArena.floor;p.lastSafe=p.y;p.vy=0;p.ground=-999;p.invulnerableUntil=g.t+2;}
  record(g,null,FALL_KINGS[index]+'封住去路！打破蓝色护体，破防后攻击红色生命','妖王决战');
 }
 const b=g.fallBoss;if(!b)return;
 arenaItemStep(g,record);
 const target=alive[b.cycle%alive.length];
 // Follow the scrolling shaft and chase the selected player's altitude, keeping landing lanes open.
 recoverGuard(b,g.t);b.y=(g.bossArena?.floor??g.camera+520)-65;
 b.face=target.x>b.x?1:-1;b.moving=!b.warning;
 if(!b.warning){const targetX=450+280*Math.cos((g.t-b.spawnAt)*.45);b.x+=Math.max(-85*dt,Math.min(85*dt,targetX-b.x));}
 if(b.warning&&/棒|爪|踢|耙|铲|斧|腿|掌|拍/.test(b.move)){const closeX=Math.max(100,Math.min(800,b.warning.x+(b.x>b.warning.x?90:-90)));b.x+=Math.max(-340*dt,Math.min(340*dt,closeX-b.x));}
 if(b.hp<b.maxHp*.5&&!b.enraged){b.enraged=true;cue(g,'roar',b.x,b.y);record(g,null,FALL_KINGS[b.index]+'进入第二阶段，招式强化！','妖王狂怒');}
 if(!b.guard){b.warning=null;b.nextAttack=Math.max(b.nextAttack,g.t+.6);}
 if(b.guard>0&&g.t>=b.nextAttack&&!b.warning){b.ultimate=b.cycle%3===2;b.move=b.ultimate?BOSS_ULTIMATES[b.index]:bossMove(b.index,b.cycle);b.warning={x:target.x,y:target.y-28,at:g.t+(b.ultimate?(g.difficulty==='easy'?1.8:1.5):(b.index===0?1.35:1.1))};record(g,null,b.move+'蓄力！观察起手并闪避','妖王出招');}
 if(b.warning&&g.t>=b.warning.at){const w=b.warning;b.attackAt=g.t;
  if(b.ultimate){castBossUltimate(g,b,{x:w.x,y:w.y+28});cue(g,'roar',b.x,b.y);}
  else if(/棒|爪|踢|耙|铲|斧|腿|掌|拍/.test(b.move)){
   b.strike={x:b.x+(w.x<b.x?-85:85),y:b.y+25,until:g.t+.28,hit:[]};cue(g,'swing',b.x,b.y);
  }else{castBossAttack(g,b,{x:w.x,y:w.y+28});cue(g,'cannon',b.x,b.y);}
  b.warning=null;b.cycle++;b.nextAttack=g.t+Math.max(1.8,3.5-b.index*.1-(b.enraged?.35:0))+(g.difficulty==='easy'?.6:0);
 }
 if(b.strike&&g.t<b.strike.until)for(const p of alive){if(!b.strike.hit.includes(p.id)&&Math.abs(p.x-b.strike.x)<78&&Math.abs(p.y-28-b.strike.y)<60){b.strike.hit.push(p.id);hurt(g,p,'中了'+b.move);cue(g,'impact',p.x,p.y);}}
 for(const p of alive){const i=inputs[p.id]||{};p.skillEnergy=Math.min(100,(p.skillEnergy??40)+dt*5);
  if(comboStep(p,{down:!!i.drop,left:!!i.left,right:!!i.right,attack:!!i.punch},g.t)){launchSkill(p,b,g.t,g.heroShots);if([4,5].includes(p.look?.skin))g.bossShots=[];record(g,p,p.comboMessage,'绝招出手');}
  const close=Math.abs(p.x-b.x)<145&&Math.abs(p.y-35-b.y)<100;
  if(i.heavy&&!p.heavyHeld&&g.t>=(p.heavyReady||0)){p.heavyReady=g.t+1;p.heavyAt=g.t;p.heavyHitAt=g.t+.28;p.comboMessage='重击蓄力';p.comboMessageUntil=g.t+.4;cue(g,'swing',p.x,p.y);}p.heavyHeld=!!i.heavy;
  if(p.heavyHitAt!==undefined&&g.t>=p.heavyHitAt){delete p.heavyHitAt;if(close){const guarded=b.guard>0;strikeBoss(b,guarded?34:24,g.t);p.skillEnergy=Math.min(100,p.skillEnergy+12);cue(g,guarded&&!b.guard?'break':'impact',b.x,b.y);p.comboMessage='重击命中';p.comboMessageUntil=g.t+.6;}}
  const airborne=p.y<(g.bossArena?.floor??p.y)-8;
  const pressed=i.punch&&!p.meleeHeld,kicked=i.bomb&&!p.bossBombHeld&&g.t>=(p.kickReady||0);p.meleeHeld=!!i.punch;
  if(close&&((pressed&&g.t>=(p.meleeReady||0))||kicked)){
   const chain=kicked&&p.meleeChain>=2&&g.t-(p.meleeAt||0)<.9;
   if(kicked){p.kickReady=g.t+.55;if(airborne){p.flyKickUntil=g.t+.18;p.flyKickDir=b.x<p.x?-1:1;}}
   p.meleeChain=pressed?(g.t-(p.meleeAt||-10)<.9?(p.meleeChain||0)+1:1):0;p.meleeAt=g.t;p.meleeReady=g.t+.24;p.punchAt=g.t;p.kickAt=kicked?g.t:p.kickAt;
   const guarded=b.guard>0;strikeBoss(b,chain?42:kicked?(airborne?26:18):12,g.t);p.skillEnergy=Math.min(100,p.skillEnergy+(chain?20:8));p.comboMessage=chain?'二连拳 · 破甲踢！':kicked?(airborne?'飞腿命中':'踢击'):p.meleeChain+' 连拳';p.comboMessageUntil=g.t+.8;cue(g,guarded&&!b.guard?'break':'impact',b.x,b.y);
  }
  if((i.fire||i.punch&&!close)&&g.t>=(p.bossFireReady||0)){cue(g,'shot',p.x,p.y);fireArenaWeapon(g,p,b);}
  if(!close&&i.bomb&&!p.bossBombHeld&&g.t>=(p.bossBombReady||0)){p.bossBombReady=g.t+5;cue(g,'cannon',p.x,p.y);p.throwAt=g.t;const a=Math.atan2(b.y-(p.y-35),b.x-p.x);g.heroShots.push({from:p.id,x:p.x,y:p.y-35,vx:Math.cos(a)*460,vy:Math.sin(a)*460,damage:28,bomb:true,until:g.t+3});}p.bossBombHeld=!!i.bomb;
 }
 for(const s of g.heroShots){if(s.cancelled||s.until<=g.t)continue;steerSkill(s,b,dt);s.x+=s.vx*dt;s.y+=s.vy*dt;if(Math.hypot(s.x-b.x,s.y-b.y)<65){s.until=0;const guarded=b.guard>0;strikeBoss(b,guarded?(s.guardDamage||s.damage):s.damage,g.t);cue(g,guarded&&!b.guard?'break':s.bomb?'cannon':'impact',b.x,b.y);if(!s.skill){const owner=g.players.find(p=>p.id===s.from);if(owner)owner.skillEnergy=Math.min(100,(owner.skillEnergy||0)+s.damage*.8);}}}
 stepBossZones(g,hurt);
 for(const s of g.bossShots){if(s.gravity)s.vy+=s.gravity*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;if(s.bounce&&s.y>g.bossArena.floor-12){s.y=g.bossArena.floor-12;s.vy=-Math.abs(s.vy);}if(s.until<=g.t)continue;for(const p of alive)if(Math.hypot(s.x-p.x,s.y-(p.y-28))<s.r+22){hurt(g,p,'被妖王的追击命中');s.until=0;break;}}
 g.heroShots=g.heroShots.filter(s=>s.until>g.t);g.bossShots=g.bossShots.filter(s=>s.until>g.t);
 if(b.hp<=0){grantBossReward(g,b.index,record);const won=b.hp<=0;record(g,null,won?FALL_KINGS[b.index]+'被击退！继续往深处闯':FALL_KINGS[b.index]+'退入黑暗，下一难再见',won?'坠落降妖真男人':'暂时甩开妖王');g.bossDefeat={index:b.index,x:b.x,y:b.y,at:g.t,won};g.chapterTransition={index:b.index,at:g.t,until:g.t+3,floor:g.bossArena.floor};g.clearedBosses=(g.clearedBosses??Math.max(0,(g.bossCount||1)-1))+1;g.chapterBase=reached;if(g.clearedBosses>=9){g.campaignComplete=true;record(g,null,'八十一难已尽，九大妖王全部击败！','劫尽归来的真男人');}g.fallBoss=null;g.bossArena=null;g.arenaPickups=[];delete g.nextArenaPickup;const bridge=g.platforms.find(f=>f.id===-999);if(bridge){bridge.breakAt=g.t+6;bridge.type='crumble';}for(const p of alive){p.lastSafe=p.y;p.invulnerableUntil=g.t+5;}g.bossShots=[];g.bossZones=[];g.heroShots=[];g.nextBossDepth=g.camera+1500;g.nextBossLayer=reached+36;g.nextEncounter=g.t+5;}
}
let atlas,frames=[],actionFrames=[],richFrames=[],viewFrames=[];
const requestedBossArt=new Set();
export function loadFallBossArt(index=0){if(typeof Image==='undefined'||requestedBossArt.has(index))return;requestedBossArt.add(index);const im=new Image();im.onload=()=>{richFrames[index]=im;};im.src=index<2?'/combos-assets/scenery-v2/boss-'+index+'.webp':'/combos-assets/chapters/boss-'+index+'.webp';}
export function drawBossFigure(c,b,x,feet,t,size=230){
 loadFallBossArt(b.index);if(Number.isInteger(b.view)&&!viewFrames[b.index]){const im=new Image();im.src='/combos-assets/scenery-v2/views-'+b.index+'.webp';viewFrames[b.index]=im;}
 const view=viewFrames[b.index];if((Number.isInteger(b.view)||b.index<2&&!richFrames[b.index])&&view?.naturalWidth){const sw=view.naturalWidth/2,sh=view.naturalHeight/2,v=b.view??0;c.drawImage(view,v%2*sw,Math.floor(v/2)*sh,sw,sh,x-size/2,feet-size+size*12/256,size,size);return;}
 const phase=b.warning?1:t-(b.attackAt??-10)<.35?(b.index===0&&b.move==='踢腿'?3:2):t-(b.attackAt??-10)<.8?(b.index===0?0:3):0;
 const rich=richFrames[b.index];
 if(rich){const pose=b.pose??(b.hp<=0?7:t-(b.hitAt??-10)<.13?4:b.guard===0&&t<(b.brokenUntil||0)?5:b.warning?2:t-(b.attackAt??-10)<.42?(/棒|爪|踢|耙|铲|斧|腿|掌|拍/.test(b.move||'')?3:6):b.moving&&Math.floor(t*5)%2?1:0);
  const sw=rich.naturalWidth/4,sh=rich.naturalHeight/2,breath=pose===0?Math.sin(t*2.5)*2:0;
  c.save();c.translate(x,feet);if(b.face===1)c.scale(-1,1);c.drawImage(rich,(pose%4)*sw,Math.floor(pose/4)*sh,sw,sh,-size/2,-size+breath+size*12/256,size,size-breath);c.restore();return;}
 if(b.index<2)return;
 const action=b.index<3?actionFrames[b.index*4+phase]:null,base=frames[b.index];
 if(action){c.drawImage(action,x-size/2,feet-size,size,size);return;}
 if(!base)return;
 const sw=base.width,sh=base.height,beat=Math.sin(t*5),reach=phase===2?16:phase===1?-7:beat*2;
 // Separate outer arm regions and lower legs; all pieces retain their source proportions.
 c.drawImage(base,sw*.25,0,sw*.5,sh*.72,x-size*.25,feet-size,size*.5,size*.72);
 c.drawImage(base,0,0,sw*.25,sh*.72,x-size*.5-reach,feet-size+beat*2,size*.25,size*.72);
 c.drawImage(base,sw*.75,0,sw*.25,sh*.72,x+size*.25+reach,feet-size-beat*2,size*.25,size*.72);
 for(let side=0;side<2;side++)c.drawImage(base,side*sw*.5,sh*.72,sw*.5,sh*.28,x-size*.5+side*size*.5,feet-size*.28+(side?1:-1)*beat*3,size*.5,size*.28);
}

export function drawFallBoss(c,g,camera){const b=g.fallBoss;c.save();c.imageSmoothingEnabled=false;
 const transition=g.chapterTransition;if(transition){const age=g.t-transition.at;c.save();c.globalAlpha=Math.max(0,1-Math.max(0,age-1.7)/1.3);drawBossBackdrop(c,transition.index,g.t);const fy=transition.floor-camera;c.fillStyle='#715747';c.fillRect(0,fy,900,10);c.restore();c.font='22px "Fusion Pixel"';c.fillStyle='#f7e7af';c.textAlign='center';c.fillText(age<1.6?'妖王击败 · 战利品已收下':'下一境 · 继续向下',450,220);}
 const entrance=g.bossEntrance;if(entrance){const k=Math.min(1,(g.t-entrance.at)/3);c.fillStyle='rgba(40,23,54,'+(.12+Math.sin(k*Math.PI)*.18)+')';c.fillRect(0,0,900,680);c.fillStyle='#201829dd';c.fillRect(160,180,580,80);c.fillStyle='#f6d3a1';c.font='20px "Fusion Pixel",monospace';c.textAlign='center';c.fillText('妖气渐近 · '+FALL_KINGS[entrance.index],450,212);c.font='14px "Fusion Pixel",monospace';c.fillText('继续下跳 · '+Math.ceil(entrance.until-g.t)+' 秒后进入平台决战',450,241);for(let i=0;i<10;i++){c.fillStyle='#b886ad66';c.fillRect((i*97)%900,680-k*500-i*14,6,20);}}

 if(g.bossArena){c.save();c.globalAlpha=Math.min(1,(g.t-b.spawnAt)/.8);drawBossBackdrop(c,b.index,g.t);c.restore();const fy=g.bossArena.floor-camera;c.fillStyle='#302935';c.fillRect(0,fy,900,160);c.fillStyle='#b59c74';c.fillRect(0,fy,900,8);for(let x=0;x<900;x+=45){c.fillStyle='#715747';c.fillRect(x+3,fy+10,39,26);}}
 if(b){const y=b.y-camera,wind=!!b.warning,art=frames[b.index];c.globalAlpha=g.t-(b.hitAt??-10)<.08?.5:1;drawBossFigure(c,b,b.x+Math.max(0,1-(g.t-b.spawnAt)/.8)*220,y+65,g.t,b.index===0?285:230);c.globalAlpha=1;
  c.save();c.translate(0,90);c.fillStyle='#19172d';c.fillRect(230,35,440,65);c.fillStyle='#af536a';c.fillRect(236,62,428*b.hp/b.maxHp,8);c.font='14px "Fusion Pixel",monospace';c.textAlign='center';c.fillStyle='#ffe2aa';c.fillStyle='#74bdfa';c.fillRect(236,78,428*b.guard/b.maxGuard,8);c.fillStyle='#ffe2aa';c.fillText(FALL_KINGS[b.index]+' · '+Math.ceil(b.hp)+' / '+b.maxHp+' · '+(b.enraged?'狂怒 · ':'')+(b.guard>0?'护体中':'破防！'),450,54);c.restore();
  for(const [i,hit] of (b.hits||[]).entries()){const age=g.t-hit.at;if(age<0||age>1)continue;c.save();c.globalAlpha=1-age;c.textAlign='center';c.font='20px "Fusion Pixel"';c.fillStyle=hit.hp?'#ffb395':'#8aceff';c.fillText('-'+Math.ceil(hit.hp||hit.guard),hit.x+(i%3-1)*28,hit.y-camera-90-age*50);c.restore();}
  if(wind){drawBossSkill(c,BOSS_ATTACK_KINDS[b.index],b.x,y-40,0,{width:135,frame:0,facing:b.face===1?1:-1});c.fillStyle='#ffe2aa';c.fillText(b.move||'蓄力',b.x,y-142);}
  const castAge=g.t-(b.attackAt??-10);if(castAge>=0&&castAge<.65)drawBossSkill(c,BOSS_ATTACK_KINDS[b.index],b.x+(b.face===1?70:-70),y,castAge,{width:200,facing:b.face===1?1:-1});
 }
 if(b?.strike&&g.t<b.strike.until)drawBossSkill(c,BOSS_ATTACK_KINDS[b.index],b.strike.x,b.strike.y-camera,g.t-(b.strike.until-.3),{width:165,facing:b.strike.x<b.x?-1:1});
 drawArenaItems(c,g,camera);drawBossZones(c,g,camera);
 for(const s of g.bossShots||[])drawBossSkill(c,s.kind,s.x,s.y-camera,g.t-(s.born??0),{width:s.r*4+20,facing:s.vx<0?-1:1});
 for(const s of g.heroShots||[]){if(s.skill){drawSkill(c,s,camera,g.t);continue;}c.fillStyle=s.color||(s.bomb?'#ffbd64':'#a8f4d0');c.fillRect(s.x-5,s.y-camera-5,s.bomb?14:10,s.bomb?14:10);}
 for(const p of g.players)if(g.t-(p.kickAt??-10)<.22){c.fillStyle='#f6ddaa';const dir=b&&b.x<p.x?-1:1;c.fillRect(p.x+(dir<0?-48:10),p.y-camera-20,38,12);c.fillStyle='#555c76';c.fillRect(p.x+(dir<0?-58:38),p.y-camera-24,20,20);}
 const d=g.bossDefeat;if(d&&g.t-d.at<2.2){drawBossFigure(c,{index:d.index||0,pose:7},d.x,d.y-camera+65,g.t,d.index===0?285:230);c.globalAlpha=Math.max(0,1-(g.t-d.at)/2.2);drawImpact(c,'smoke',d.x,d.y-camera-30*(g.t-d.at),g.t-d.at,200);}c.restore();}
