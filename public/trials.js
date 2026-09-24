import {drawBossBackdrop} from './boss-scenes.js';
import {loadFallBossArt,drawBossFigure} from './fall-boss.js';
loadFallBossArt();
import {heroSkill,drawSkill} from './hero-skills.js';
import {makeTrial,stepTrial,TRIALS,KINGS,AFFLICTIONS,WEAPONS,FLOOR,bossState} from './trial-engine.js';
import {drawCharacter,loadCharacterSkins,sanitizeLook,DEFAULT_LOOK} from './appearance.js';
import {Soundtrack} from './sound.js';
const $=s=>document.querySelector(s),canvas=$('#trial'),c=canvas.getContext('2d'),sound=new Soundtrack(),input={},sprites=[];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let saved=0,look={...DEFAULT_LOOK,skin:1};try{saved=Math.max(0,Math.min(80,Number(localStorage.getItem('man18-trial-progress'))||0));const raw=localStorage.getItem('man18-look');if(raw)look=sanitizeLook(JSON.parse(raw));}catch{}
let selected=saved,g=makeTrial(selected,look),running=false,stamp=performance.now(),acc=0,eventId=0,notified=false,soundOn=false,soundChosen=false,paused=false;
const background=new Image();background.src='/combos-assets/trial-arena.webp';
const atlas=new Image();atlas.src='/combos-assets/trial-bosses.webp';atlas.onload=()=>{
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  const x=Math.round(col*atlas.width/3),y=Math.round(row*atlas.height/3),w=Math.round((col+1)*atlas.width/3)-x,h=Math.round((row+1)*atlas.height/3)-y;
  const out=document.createElement('canvas');out.width=w;out.height=h;const cc=out.getContext('2d',{willReadFrequently:true});cc.drawImage(atlas,-x,-y);const d=cc.getImageData(0,0,w,h);
  for(let i=0;i<d.data.length;i+=4)if(d.data[i]>140&&d.data[i+2]>140&&d.data[i+1]<130&&d.data[i]-d.data[i+1]>65&&d.data[i+2]-d.data[i+1]>65)d.data[i+3]=0;
  cc.putImageData(d,0,0);sprites.push(out);
 }
};
loadCharacterSkins().catch(()=>{});
function route(){const frag=document.createDocumentFragment();for(const trial of TRIALS){const b=document.createElement('button');b.textContent=String(trial.number).padStart(2,'0')+' · '+KINGS[trial.boss].name;b.title=trial.name;b.setAttribute('aria-label','第 '+trial.number+' 难 '+trial.name);b.disabled=trial.index>saved;b.setAttribute('aria-pressed',String(trial.index===selected));b.onclick=()=>{if(running&&g.phase==='playing')return;selected=trial.index;g=makeTrial(selected,look,$('#companion').checked);setup();};frag.append(b);}$('#route').replaceChildren(frag);}
function setup(){running=false;paused=false;$('#pause').disabled=true;$('#resume').hidden=true;notified=false;eventId=0;$('#overlay').hidden=false;$('#outcome').textContent='第 '+(selected+1)+' 难 · '+KINGS[g.trial.boss].name;$('#outcome-note').textContent=AFFLICTIONS[g.trial.affliction].tip;$('#start').hidden=false;$('#retry').hidden=$('#next').hidden=true;route();}
function start(){paused=false;$('#resume').hidden=true;$('#pause').disabled=false;g=makeTrial(selected,look,$('#companion').checked);running=true;notified=false;eventId=0;acc=0;for(const key in input)delete input[key];$('#overlay').hidden=true;if(!soundChosen){soundChosen=true;soundOn=true;sound.enable(true);$('#sound').textContent='声音：开';}sound.update(true,Math.min(11,g.trial.boss));$('#companion').disabled=true;canvas.scrollIntoView({block:'center',behavior:'instant'});}
$('#start').onclick=$('#retry').onclick=start;$('#next').onclick=()=>{if(selected<80){selected++;start();route();}};$('#sound').onclick=()=>{soundChosen=true;soundOn=!soundOn;sound.enable(soundOn);$('#sound').textContent='声音：'+(soundOn?'开':'关');};
function pauseBattle(){if(!running||g.phase!=='playing')return;paused=!paused;release();acc=0;stamp=performance.now();$('#overlay').hidden=!paused;$('#resume').hidden=!paused;$('#start').hidden=$('#retry').hidden=$('#next').hidden=true;if(paused){$('#outcome').textContent='歇口气，再降妖';$('#outcome-note').textContent='战斗已暂停，点击继续或按 Esc 返回。';}sound.update(!paused,g.trial.boss);}
$('#pause').onclick=$('#resume').onclick=pauseBattle;
for(const [i,w] of WEAPONS.entries()){const b=document.createElement('button');b.textContent=(i+1)+' · '+w.name;b.onclick=()=>input.weapon=i;$('#weapons').append(b);}
const keys={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'jump',KeyS:'down',ArrowDown:'down',KeyJ:'fire',KeyK:'bomb',KeyL:'dash',};
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&!e.repeat){e.preventDefault();pauseBattle();return;}if(e.target instanceof HTMLInputElement)return;if(keys[e.code]){e.preventDefault();input[keys[e.code]]=true;}if(/^Digit[1-4]$/.test(e.code))input.weapon=Number(e.code.slice(-1))-1;});window.addEventListener('keyup',e=>{if(keys[e.code])input[keys[e.code]]=false;});
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);input[b.dataset.key]=true;};for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>input[b.dataset.key]=false);}
function release(){for(const key in input)delete input[key];}window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused)pauseBattle();release();acc=0;stamp=performance.now();});
function finish(){if(notified)return;notified=true;running=false;$('#pause').disabled=true;$('#resume').hidden=true;$('#companion').disabled=false;$('#overlay').hidden=false;$('#start').hidden=true;$('#retry').hidden=false;$('#next').hidden=g.phase!=='cleared'||selected===80;
 $('#outcome').textContent=g.phase==='cleared'?(selected===80?'八十一难，功成！':'妖王已伏 · 此难已过'):'此难未过，再战一次';$('#outcome-note').textContent=g.phase==='cleared'?'用时 '+g.t.toFixed(1)+' 秒 · '+(g.stats.hurt===0?'无伤降妖真男人':'绝境翻盘真男人')+' · 命中 '+g.stats.hits+' 次 / 投掷 '+g.stats.throws+' 次 · '+(selected===80?'全部试炼完成':'下一难：'+TRIALS[selected+1].name):'看到标记先离开；L 闪避有短暂无敌，↓ → J 搓出角色绝招。';
 if(g.phase==='cleared'){saved=Math.max(saved,Math.min(80,selected+1));try{localStorage.setItem('man18-trial-progress',saved);}catch{}route();}sound.update(false,g.trial.boss);
}
function events(){for(const e of g.events){if(e.id<=eventId)continue;eventId=e.id;if(e.type==='rage')sound.tone(120,.4,'sawtooth',.04,55);else if(e.type==='death')sound.death({x:e.x,y:e.y,look},g.player,true);else if(e.type==='eat')sound.event('eat');else if(e.type==='hit')sound.event('punch');else if(e.type==='warning')sound.event('warning');else if(e.type==='jump')sound.event('jump');else if(e.type==='blast'||e.type==='ultimate')sound.tone(80,.25,'sawtooth',.045,35);else if(e.type==='shoot')sound.tone(420,.06,'triangle',.02,180);else if(e.type==='win')sound.event('zone');}}
const box=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x/3)*3,Math.round(y/3)*3,w,h);};
function render(now){c.imageSmoothingEnabled=false;const king=KINGS[g.trial.boss],p=g.player,b=g.boss,t=reduced?0:g.t;
 box(0,0,960,600,'#132430');if(background.complete&&background.naturalWidth)c.drawImage(background,0,0,960,655);drawBossBackdrop(c,g.trial.boss,t,960,600);
 c.globalAlpha=.2;box(0,0,960,480,king.color);c.globalAlpha=1;
 // Each family adds animated environmental silhouettes over the shared mountain stage.
 for(let i=0;i<12;i++){const x=(i*89+t*(g.trial.boss===7?90:18))%960,y=100+(i*67)%320;
  if([3,5].includes(g.trial.boss)){box(x,440-(t*35+i*23)%320,6,12,'#ea986b');}
  else if(g.trial.boss===4){c.globalAlpha=.22;box(x,y,18,24,'#e6d5ee');box(x+3,y+6,4,4,'#303240');box(x+11,y+6,4,4,'#303240');c.globalAlpha=1;}
  else if(g.trial.boss===6){c.globalAlpha=.2;box(x,30,2,y,'#d9b7e8');box(x-4,y,10,8,'#d9b7e8');c.globalAlpha=1;}
  else if(g.trial.boss===7){box(x,y,24,3,'#b9acdf');}
 }
 if(g.trial.affliction===2){c.globalAlpha=.3;box(0,FLOOR-5,960,7,'#c3ecff');c.globalAlpha=1;}

 for(let i=0;i<14;i++){box((i*79+t*9)%960,80+Math.sin(i*4+t*.4)*65,3,3,king.color);}
 // Walkable floor always matches the physics plane, regardless of generated background composition.
 box(0,FLOOR,960,45,'#493c32');box(0,FLOOR,960,6,'#c69f65');for(let x=0;x<960;x+=48){box(x,FLOOR+6,3,35,'#251f28');box(x+6,FLOOR+12,32,3,'#735440');}for(let x=35;x<960;x+=180){box(x,FLOOR+45,18,75,'#3a3433');box(x-18,FLOOR+50,54,9,'#705343');}
 for(const warning of g.warnings){const pillar=warning.kind==='pillar',floor=['fire','web'].includes(warning.kind),x=pillar?warning.x-35:floor?warning.x-60:70,y=pillar?40:floor?FLOOR-30:warning.y-28,w=pillar?70:floor?120:800,h=pillar?440:floor?36:56;c.strokeStyle='#ffd17e';c.lineWidth=3;c.setLineDash([8,8]);if(pillar||floor)c.strokeRect(x,y,w,h);else{for(const slope of warning.kind==='fan'?[-100,0,100]:[0]){c.beginPath();c.moveTo(warning.x,warning.kind==='wave'?FLOOR-15:warning.y);c.lineTo(warning.x+warning.direction*700,(warning.kind==='wave'?FLOOR-15:warning.y)+slope*2.5);c.stroke();}}c.setLineDash([]);c.fillStyle='#ffe3a5';c.font='16px Pixel';c.textAlign='center';c.fillText('避开 · '+Math.max(0,warning.at-g.t).toFixed(1),pillar||floor?warning.x:480,Math.max(26,y-12));}
 for(const item of g.pickups){const icons={heart:'♥',shield:'◆',energy:'✦'};c.fillStyle=item.type==='heart'?'#ff91a1':'#bce5df';c.font='27px Pixel';c.textAlign='center';c.fillText(icons[item.type],item.x,item.y+Math.sin(t*4)*3);}
 const state=bossState(g),image=sprites[g.trial.boss];
 if(state==='windup'){c.strokeStyle='#ffd17e';c.lineWidth=4;c.strokeRect(b.x-130,b.y-255,260,260);}
 c.save();c.translate(b.x,b.y);if(!reduced){const squash=state==='windup'?.92:state==='attack'?1.07:1;c.scale(1/squash,squash);c.rotate(state==='attack'?-.06:0);}c.translate(-b.x,-b.y);if(g.t-(b.hitAt??-9)<.08)c.globalAlpha=.45;if(image)drawBossFigure(c,{...b,index:g.trial.boss,warning:state==='windup',attackAt:state==='attack'?g.t:b.attackAt},b.x,b.y,t,250);else{box(b.x-60,b.y-150,120,150,king.color);box(b.x-30,b.y-125,15,15,'#14232d');box(b.x+18,b.y-125,15,15,'#14232d');}c.restore();
 c.save();if(g.t<p.invulnerableUntil&&Math.floor(t*14)%2)c.globalAlpha=.5;drawCharacter(c,look,p.x,p.y,1.2,t,{vx:p.vx,vy:p.vy,airborne:p.y<FLOOR,action:g.phase==='failed'?'defeat':g.t-(p.hurtAt??-9)<.3?'hurt':g.t-(p.throwAt??-9)<.35?'throw':g.t-(p.eatAt??-9)<.45?'eat':g.t-(p.attackAt??-9)<.16?'punch':undefined,facing:p.aim||1,reducedMotion:reduced});c.restore();if(p.shield){c.strokeStyle='#ade4e5';c.strokeRect(p.x-32,p.y-92,64,94);}
 if(g.companion)drawCharacter(c,{...DEFAULT_LOOK,skin:look.skin===3?5:3},90,FLOOR,1,t,{action:'punch'});
 for(const shot of g.shots){if(shot.skill){drawSkill(c,shot,0,g.t);continue;}if(shot.bomb){box(shot.x-8,shot.y-8,16,16,'#242131');box(shot.x,shot.y-14,5,7,'#ffce77');}else{box(shot.x-10,shot.y-3,20,6,['#f4dc9b','#bcf2c4','#d7b1ff','#ff9f6d'][shot.type]);}}
 for(const e of g.enemy){const color=e.kind==='web'?'#b6b0d4':e.kind==='pillar'?'#f4cd88':'#cf719a';c.globalAlpha=.65;box(e.x-e.w/2,e.y-e.h/2,e.w,e.h,color);c.globalAlpha=1;if(e.kind==='pillar'){for(let y=40;y<480;y+=24)box(e.x+Math.sin(y+t*18)*12-3,y,6,24,'#fff0bf');}else if(e.kind==='web'){c.strokeStyle='#eee0f9';for(let j=0;j<5;j++){c.beginPath();c.moveTo(e.x-60+j*30,e.y-17);c.lineTo(e.x+60-j*30,e.y+17);c.stroke();}}else{box(e.x-5,e.y-5,10,10,'#ffe0a2');}}

 for(const e of g.effects){c.globalAlpha=Math.max(0,(e.until-g.t)/(e.type==='ultimate'?.85:.3));if(e.type==='ultimate'){box(0,120,960,330,'#fae7a4');c.fillStyle='#29333b';c.font='45px Pixel';c.textAlign='center';c.fillText('万法 · 破妖！',480,280);}else for(let i=0;i<12;i++)box(e.x+Math.cos(i)*65,e.y+Math.sin(i)*65,18,18,'#ffe4a1');c.globalAlpha=1;}
 $('#battle-status').textContent=paused?'已暂停':g.phase!=='playing'?'准备下一次挑战':({idle:'保持距离，寻找出手机会',windup:'妖王蓄力 · 注意金色预警',attack:'妖招释放 · 跳跃或闪避',recover:'收招破绽 · 现在命中伤害 +30%',defeated:'妖王已伏'})[state]+(g.t<(p.slowUntil||0)?' · 蛛网缠身':'');$('#chapter').textContent='第 '+g.trial.number+' / 81 难 · '+king.land;$('#health').textContent='♥ '+p.hp+' / 3'+(p.shield?' · 护盾':'');$('#boss-name').textContent=king.name+' · '+Math.ceil(b.hp)+' / '+b.maxHp+(b.hp<b.maxHp*.5?' · 狂暴':'');$('#boss-guard').style.width=(b.guard/b.maxGuard*100)+'%';$('#guard-label').textContent=b.guard>0?'护体 '+Math.ceil(b.guard)+' / '+b.maxGuard:'破防 '+Math.max(0,b.brokenUntil-g.t).toFixed(1)+'s';$('#boss-life').style.width=(b.hp/b.maxHp*100)+'%';$('#tip').textContent=AFFLICTIONS[g.trial.affliction].name+'：'+AFFLICTIONS[g.trial.affliction].tip;document.querySelector('[data-key=dash]').textContent='L · 闪避 '+(g.t<(p.dashReady||0)?(p.dashReady-g.t).toFixed(1)+'s':'就绪');$('#bomb').textContent='K · 投掷 '+p.bombs;$('#ultimate').textContent=heroSkill(p).name+' · '+Math.floor(p.energy)+'% · ↓ → J';$('#ultimate').disabled=true;for(const [i,button] of [...$('#weapons').children].entries())button.setAttribute('aria-pressed',String(i===p.weapon));
}
function loop(now){const dt=Math.min(.1,(now-stamp)/1000);stamp=now;if(running&&!paused&&!document.hidden){acc+=dt;while(acc>=1/60&&g.phase==='playing'){stepTrial(g,input);acc-=1/60;}events();if(g.phase!=='playing')finish();}render(now);requestAnimationFrame(loop);}setup();requestAnimationFrame(loop);
