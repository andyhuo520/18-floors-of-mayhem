// Same button inputs as human players. No direct damage, teleport or extra resources.
export function bossCpuInput(g,p){
 if(!p||!p.alive||p.downed||!g.fallBoss)return {};
 const b=g.fallBoss,level=g.difficulty||'medium',reaction=level==='easy'?.3:level==='hard'?.85:.55;
 const slot=g.players.findIndex(q=>q.id===p.id),beat=Math.floor(g.t*8+slot*2),close=Math.abs(p.x-b.x)<135;
 const shot=(g.bossShots||[]).find(s=>Math.hypot(s.x-p.x,s.y-(p.y-28))<100&&s.vx*(p.x-s.x)>0);
 const zone=(g.bossZones||[]).find(z=>z.at-g.t<reaction&&Math.abs(z.x-p.x)<z.w/2+35&&z.until>g.t);
 const strike=b.warning&&b.warning.at-g.t<reaction&&Math.abs(p.x-b.warning.x)<150;
 const danger=shot||zone||strike;
 let target=p.x;
 if(zone)target=zone.x+(p.x<zone.x?-105:105);
 else if(strike)target=b.warning.x+(p.x<b.x?-190:190);
 else if(shot)target=p.x+(p.x<450?-70:70);
 else{
  const pickup=(g.arenaPickups||[]).filter(i=>!i.collected&&i.until>g.t).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
  if(pickup&&Math.abs(pickup.x-p.x)<280)target=pickup.x;
  else target=Math.max(65,Math.min(835,b.x+(p.x<b.x?-1:1)*(b.guard>0?120:100)+slot%3*16));
 }
 const i={left:target<p.x-12,right:target>p.x+12,jump:!!shot||!!strike&&beat%2===0,fire:!danger,punch:!danger&&close&&beat%3===0,heavy:!danger&&close&&b.guard>0&&beat%12===4,bomb:!danger&&beat%18===8};
 // Ordered direction edges instead of holding attack forever.
 if(!danger&&(p.skillEnergy||0)>=100&&g.t>=(p.skillReady||0)){
  const phase=beat%12;if(phase<=3){Object.assign(i,{left:false,right:false,drop:false,punch:false,fire:false,heavy:false,bomb:false});if(phase===0)i.drop=true;if(phase===1)i[p.x<b.x?'right':'left']=true;if(phase===2)i.punch=true;}
 }
 i.reward=!!p.bossRewards?.length&&beat%24===6&&(danger||!p.shield||(p.skillEnergy||0)<60||!(p.bossAmmo>0));
 return i;
}
