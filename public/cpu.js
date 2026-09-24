import {bossCpuInput} from './boss-cpu.js';
import {bestTarget,controllerTick} from './ai/controller.js';
export function cpuInput(g,p){
 if(g.bossArena)return bossCpuInput(g,p);
 const target=bestTarget(g,p);const i=controllerTick(g,p,target?{action:'descend_to',platformId:target.id}:null);i.reward=!!p.bossRewards?.length&&!p.shield&&Math.floor(g.t*4)%16===0;
 const rivals=g.players.filter(q=>q.id!==p.id&&q.alive);const q=rivals.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 const level=g.difficulty||'medium',grace=level==='easy'?25:level==='hard'?4:10,cadence=level==='easy'?16:level==='hard'?4:8;
 const beat=Math.floor(g.t*3+g.players.indexOf(p));
 if(g.t>3&&p.ground!==null&&q?.ground===p.ground&&Math.abs(q.y-p.y)<60&&Math.abs(q.x-p.x)<78){if(level!=='easy'){i.left=q.x<p.x;i.right=!i.left;}i.punch=beat%cadence===0;}
 if(q&&Math.abs(q.y-p.y)<130&&Math.abs(q.x-p.x)>100&&Math.abs(q.x-p.x)<300){i.bomb=level==='easy'?g.t>40&&beat%96===0:beat%(cadence*3)===0;i.pass=beat%(cadence*2)===0;}
 i.eat=p.carry==='shield'||p.carry==='heart'&&p.hp<p.maxHp;
 const danger=(g.bombs||[]).find(b=>b.explodeAt-g.t<.75&&Math.hypot(b.x-p.x,b.y-p.y)<120);
 if(danger&&p.ground!==null)i.jump=true;
 if(g.t<grace){i.punch=false;i.bomb=false;i.pass=false;}if(g.fallBoss){i.punch=g.t>=grace;i.bomb=g.t>=grace&&beat%cadence===0;}return i;
}
