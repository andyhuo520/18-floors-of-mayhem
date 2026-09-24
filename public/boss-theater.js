import {CHAPTER_GIANTS} from './encounters.js';
import {CHAPTER_RELICS} from './arena-items.js';
import {drawBossSkill} from './ultimate-vfx.js';
import {BOSS_ATTACK_KINDS} from './boss-attacks.js';
import {drawSceneDressing} from './scene-dressing.js';
import {CHAPTERS,CAMPAIGN_TRIALS} from './campaign.js';
import {drawBossFigure} from './fall-boss.js';
import {drawBossBackdrop} from './boss-scenes.js';
export const previewBossIndex=zone=>((Math.floor(zone)%CHAPTERS.length)+CHAPTERS.length)%CHAPTERS.length;
export const THEATER_SKILLS=['金光分身 · 如意横扫','九齿裂地','流沙怒潮','熔岩冲阵','幽灯夜行','三昧火轮','天罗地网','九霄雷落','玄莲星陨'];
// Cosmetic clock: never advances or damages the live simulation.
export function theaterBeat(time,{started=0,reaction=-100,reduced=false,state='lobby'}={}){
 if(reduced||!['lobby','room','editor'].includes(state))return {phase:'idle',pose:0,age:0,progress:0};
 const clicked=time-reaction>=0&&time-reaction<5.5;
 const age=clicked?time-reaction+1.8:((Math.max(0,time-started)%11)+11)%11;
 const phase=age<1.8?'patrol':age<3?'charge':age<5.3?'attack':age<6.7?'recover':age<8.5?'counter':'idle';
 return {phase,age,progress:Math.max(0,Math.min(1,(age-3)/2.3)),pose:{patrol:1,charge:2,attack:3,recover:6,counter:4,idle:0}[phase]};
}
function special(c,index,b,t,color){
 const kind=BOSS_ATTACK_KINDS[index];
 if(b.phase==='charge'){drawBossSkill(c,kind,680,360,0,{width:150,frame:0,facing:-1});return;}
 if(b.phase!=='attack')return;
 const p=b.progress;
 if(index===0){for(let i=0;i<2;i++){c.save();c.globalAlpha=.35;drawBossFigure(c,{index:0,pose:3},640-p*(170+i*160),490,t,240);c.restore();}}
 if(index===4||index===7){for(let i=0;i<3;i++){const q=p-i*.16;if(q<0||q>.55)continue;drawBossSkill(c,kind,500-i*150,310+q*240,q,{width:index===7?180:150,height:310});}}
 else drawBossSkill(c,kind,670-p*500,index===1||index===2?430:365,b.age-3,{width:index===2?270:250,facing:-1});
}
export function drawBossTheater(c,index,time,{front=false,reduced=false,reaction=-100,state='lobby',backdrop=true,started=0}={}){
 const t=reduced?0:time,b=theaterBeat(time,{started,reaction,reduced,state}),color=CHAPTERS[index].color;
 c.save();c.imageSmoothingEnabled=false;
 if(!front){
  if(backdrop){c.globalAlpha=.82;drawBossBackdrop(c,index,t);c.globalAlpha=1;}
  c.globalAlpha=.95;
  const walk=b.phase==='patrol'?Math.sin(b.age*3)*24:0;
  const lunge=b.phase==='attack'?Math.sin(b.progress*Math.PI)*75:0;
  const pose=state==='victory'?7:state==='result'?6:b.pose;
  drawBossFigure(c,{index,pose},720+walk-lunge,490-(b.phase==='attack'&&index===0?Math.sin(b.progress*Math.PI)*45:0),t,300);
  special(c,index,b,t,color);
  c.globalAlpha=1;c.textAlign='right';c.font='14px "Fusion Pixel",monospace';c.fillStyle=color;
  c.fillText(CHAPTERS[index].boss+' · '+(b.phase==='charge'?'蓄力中…':b.phase==='attack'?THEATER_SKILLS[index]:b.phase==='counter'?'接招！':'等待挑战者'),865,590);
 }else drawSceneDressing(c,index,t,{foreground:true});
 c.restore();
 return b;
}
export function chapterMarkup(index){const ch=CHAPTERS[index];return {title:ch.name+' · '+ch.boss,trials:CAMPAIGN_TRIALS.slice(index*9,index*9+9).map((trial,i)=>({...trial,tip:i===4?CHAPTER_GIANTS[index].name+' · 观察起手并及时闪避':i===3?CHAPTER_RELICS[index].name+'：'+CHAPTER_RELICS[index].tip:trial.tip}))};}
