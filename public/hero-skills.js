import {drawGeneratedSkill} from './ultimate-vfx.js';
export const HERO_SKILLS=[
 {name:'菠萝轰炸',kind:'pineapple',color:'#f4ce6d',count:3,damage:16},
 {name:'尖叫鸡突袭',kind:'chicken',color:'#ffd888',count:1,damage:48},
 {name:'火箭齐射',kind:'rocket',color:'#f5ac85',count:3,damage:16},
 {name:'金角羊冲阵',kind:'ram',color:'#dfd57f',count:1,damage:48},
 {name:'鲸鱼喷泉',kind:'whale',color:'#a6ecfa',count:1,damage:44},
 {name:'蓝莓玄鲸炮',kind:'leviathan',color:'#9abdf7',count:1,damage:44}
];
export const heroSkill=p=>HERO_SKILLS[p.look?.skin]||HERO_SKILLS[0];
// Read button edges in simulation time; holding keys cannot produce repeated commands.
export function comboStep(p,input,t){
 const prev=p.comboHeld||{},edges=['down','left','right','attack'].filter(k=>input[k]&&!prev[k]);p.comboHeld={...input};
 if(p.combo&&t-p.combo.at>1.2)p.combo=null;
 if(edges.length>1){p.combo=null;return false;}
 let done=false;for(const key of edges){if(key==='down')p.combo={step:1,at:t};else if((key==='left'||key==='right')&&p.combo?.step===1)p.combo.step=2;else if(key==='attack'){done=p.combo?.step===2;p.combo=null;}else p.combo=null;}
 if(!done)return false;
 if((p.skillEnergy||0)<100){p.comboMessage='灵气不足';p.comboMessageUntil=t+1;return false;}
 if(t<(p.skillReady||0))return false;p.skillEnergy=0;p.skillReady=t+4;p.skillAt=t;p.comboMessage=heroSkill(p).name+'！';p.comboMessageUntil=t+1.4;return true;
}
export function launchSkill(p,b,t,shots){const skill=heroSkill(p),x=p.x,y=p.y-35,angle=Math.atan2(b.y-y,b.x-x);
 for(let i=0;i<skill.count;i++){const a=angle+(i-(skill.count-1)/2)*.15;shots.push({born:t,from:p.id,x,y,vx:Math.cos(a)*410,vy:Math.sin(a)*410,damage:skill.damage,skill:skill.kind,color:skill.color,until:t+3.2});}
}
export function steerSkill(s,b,dt){if(!s.skill)return;const a=Math.atan2(b.y-s.y,b.x-s.x),speed=s.skill==='chicken'?530:440;s.vx+=(Math.cos(a)*speed-s.vx)*Math.min(1,dt*8);s.vy+=(Math.sin(a)*speed-s.vy)*Math.min(1,dt*8);}
export function drawSkill(c,s,camera,t){return drawGeneratedSkill(c,s,camera,t);}
