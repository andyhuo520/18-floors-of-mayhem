import {drawBossSkill} from './ultimate-vfx.js';
export const BOSS_ATTACK_KINDS=['golden','rake','sand','lava','bone','wheel','web','lightning','lotus'];
export function castBossAttack(g,b,target){
 const floor=g.bossArena.floor,kind=BOSS_ATTACK_KINDS[b.index],dir=target.x<b.x?-1:1;
 const speed=(g.difficulty==='easy'?175:220)+b.index*9+(b.enraged?30:0);
 const shot=(x,y,vx,vy,extra={})=>g.bossShots.push({born:g.t,x,y,vx,vy,r:12,kind,until:g.t+4,...extra});
 g.bossZones??=[];
 if(b.index===0){shot(b.x,b.y,dir*speed,0);if(b.enraged)shot(b.x,b.y-45,dir*speed,35);}
 else if(b.index===1||b.index===2){shot(b.x,floor-12,dir*speed,0,{r:15});if(b.enraged)shot(b.x-dir*85,floor-12,dir*speed,0,{r:15});}
 else if(b.index===4){for(let i=0;i<3;i++){const x=Math.max(40,Math.min(860,target.x+(i-1)*130));g.bossZones.push({x,y:floor-220,w:32,h:220,at:g.t+1.1,until:g.t+1.4,kind:'bone',hit:[]});}}
 else if(b.index===7){for(const x of [target.x,...(b.enraged?[target.x+160]:[])])g.bossZones.push({x:Math.max(45,Math.min(855,x)),y:floor-410,w:48,h:410,at:g.t+1.1,until:g.t+1.4,kind:'lightning',hit:[]});}
 else{const angle=Math.atan2(target.y-28-b.y,target.x-b.x),offsets=b.enraged?[-.42,-.21,0,.21,.42]:[-.23,0,.23];for(const d of offsets)shot(b.x,b.y,Math.cos(angle+d)*speed,Math.sin(angle+d)*speed,{bounce:b.index===5});}
}
export function stepBossZones(g,hurt){
 for(const z of g.bossZones||[]){if(g.t<z.at||g.t>z.until)continue;for(const p of g.players)if(p.alive&&!p.downed&&!z.hit.includes(p.id)&&Math.abs(p.x-z.x)<z.w/2+16&&p.y>z.y&&p.y-50<z.y+z.h){z.hit.push(p.id);hurt(g,p,z.kind==='bone'?'被骨雨击中':'被落雷击中');}}
 g.bossZones=(g.bossZones||[]).filter(z=>z.until>g.t);
}
export function drawBossZones(c,g,camera){c.save();for(const z of g.bossZones||[]){const active=g.t>=z.at;
 if(active){const n=Math.ceil(z.h/75),h=z.h/n;for(let i=0;i<n;i++)drawBossSkill(c,z.kind,z.x,z.y+h*(i+.5)-camera,g.t-z.at+i*.06,{width:Math.min(95,z.w+48),height:h+16});}
 else drawBossSkill(c,z.kind,z.x,z.y-camera+30,0,{width:65,height:65,frame:0});
 }c.restore();}

export const BOSS_ULTIMATES=['金光三连阵','九齿封路','流沙回潮','熔火地裂','白骨追魂','三昧回旋','天罗地网','雷翼审判','玄莲星陨'];
export function castBossUltimate(g,b,target){
 const floor=g.bossArena.floor,kind=BOSS_ATTACK_KINDS[b.index],easy=g.difficulty==='easy',lead=easy?1.35:1;
 g.bossZones??=[];g.bossShots??=[];
 const zone=(x,delay,w=48,h=200)=>g.bossZones.push({x:Math.max(40,Math.min(860,x)),y:floor-h,w,h,at:g.t+lead+delay,until:g.t+lead+delay+.35,kind,hit:[]});
 const shot=(x,y,vx,vy,extra={})=>g.bossShots.push({born:g.t,x,y,vx,vy,r:12,kind,until:g.t+4,...extra});
 switch(b.index){
 case 0: for(let i=0;i<3;i++)zone(target.x+(i-1)*145,i*.3,55,155);break;
 case 1: for(const x of [110,290,610,790])zone(x,0,60,90);break;
 case 2: shot(35,floor-18,170,0);shot(865,floor-18,-170,0);zone(target.x,.8,45,160);break;
 case 3: for(let i=0;i<4;i++)zone(140+i*200,i*.35,65,230);break;
 case 4: for(let i=0;i<3;i++)zone(target.x+(i-1)*120,i*.5,35,300);break;
 case 5: for(const dir of [-1,1])shot(b.x,b.y,dir*190,-180,{gravity:280,bounce:true});break;
 case 6: for(const x of [100,260,640,800]){shot(x,floor-350,0,easy?100:145);zone(x,.7,42,100);}break;
 case 7: for(let i=0;i<3;i++)zone(170+i*280,i*.4,48,420);break;
 case 8: for(let i=0;i<5;i++){const a=Math.PI*.15+i*Math.PI*.175;shot(450,floor-340,Math.cos(a)*(easy?145:185),Math.sin(a)*(easy?145:185));}zone(target.x,1,50,300);break;
 }
}
