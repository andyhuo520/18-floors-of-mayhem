// Shared deterministic combat; authority stays in the simulation, never the renderer.
export function combatStep(g,inputs,dt,hurt,record){
 g.bombs??=[];g.blasts??=[];
 for(const p of g.players){
  if(!p.alive||p.downed)continue;
  const i=inputs[p.id]||{};if(i.left||i.right)p.facing=i.left?-1:1;
  const dir=p.facing||1;
  if(i.punch&&!p.punchHeld&&g.t>=(p.punchReady||0)){
   p.punchReady=g.t+.65;p.punchAt=g.t;p.pendingPunch=g.t+.1;
  }
  if(p.pendingPunch!==undefined&&g.t>=p.pendingPunch){delete p.pendingPunch;
   for(const q of g.players){if(q===p||!q.alive||q.downed||g.t<(q.staggerUntil||0)||g.t<q.invulnerableUntil)continue;
    const dx=(q.x-p.x)*dir;if(dx<0||dx>82||Math.abs(q.y-p.y)>55)continue;
    if(q.shield){hurt(g,q,'拳击被护盾挡住');continue;}
    q.stagger=(q.stagger||0)+35;q.staggerUntil=g.t+.6;q.knockback=dir*(240+q.stagger*2);q.vy=-150;q.ground=null;q.hurtAt=g.t;q.lastHit='拳击 · 失衡 '+q.stagger+'%';
    record(g,p,`一拳击退 ${q.name} · 失衡 ${q.stagger}%`,'拳头硬的男人');
    if(q.stagger>=100){q.stagger=0;hurt(g,q,'连续挨拳，招架不住');}
   }
  }
  if(i.bomb&&!p.bombHeld&&g.t>=(p.bombReady||0)){
   p.throwAt=g.t;p.bombReady=g.t+8;g.bombs.push({id:++g.nextId,from:p.id,x:p.x+dir*25,y:p.y-45,vx:dir*240,vy:-190,explodeAt:g.t+1.6});record(g,p,'扔出炸弹！远离闪烁范围','爆脾气的男人');
  }
  p.punchHeld=!!i.punch;p.bombHeld=!!i.bomb;
 }
 for(const b of g.bombs){if(b.cancelled)continue;const oldY=b.y;b.vy+=650*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.x<12||b.x>888){b.x=Math.max(12,Math.min(888,b.x));b.vx*=-.6;}
  if(b.vy>0){const f=g.platforms.find(f=>!f.broken&&b.x>=f.x&&b.x<=f.x+f.w&&oldY<=f.y-8&&b.y>=f.y-8);if(f){b.y=f.y-8;b.vy=-Math.abs(b.vy)*.32;b.vx*=.7;}}
  if(g.t>=b.explodeAt){b.exploded=true;g.blasts.push({id:b.id,x:b.x,y:b.y,until:g.t+.35});for(const q of g.players)if(!b.cancelled&&q.alive&&Math.hypot(q.x-b.x,q.y-30-b.y)<95){if(hurt(g,q,'被炸弹炸到了')){q.knockback=Math.sign(q.x-b.x||1)*420;q.vy=-230;q.ground=null;}}}
 }
 g.bombs=g.bombs.filter(b=>!b.exploded&&!b.cancelled);g.blasts=g.blasts.filter(b=>b.until>g.t);
}
export function drawCombat(ctx,g,camera){
 ctx.save();ctx.imageSmoothingEnabled=false;
 for(const b of g.bombs||[]){const y=b.y-camera,urgent=b.explodeAt-g.t<.6;ctx.strokeStyle=urgent?'#ffce78':'#a7a8b066';ctx.setLineDash([6,6]);ctx.strokeRect(b.x-90,y-90,180,180);ctx.setLineDash([]);ctx.fillStyle=urgent&&Math.floor(g.t*15)%2?'#ffba65':'#29233c';ctx.fillRect(b.x-10,y-10,20,20);ctx.fillStyle='#ffe39c';ctx.fillRect(b.x+2,y-17,4,9);ctx.fillRect(b.x+4,y-20,7,4);ctx.font='12px "Fusion Pixel",monospace';ctx.textAlign='center';ctx.fillText(Math.max(0,b.explodeAt-g.t).toFixed(1),b.x,y-26);}
 for(const b of g.blasts||[]){ctx.globalAlpha=Math.max(0,(b.until-g.t)/.35);for(let j=0;j<12;j++){const a=j*Math.PI/6,r=95*(1-(b.until-g.t)/.35);ctx.fillStyle=j%2?'#ffe89a':'#f67d52';ctx.fillRect(b.x+Math.cos(a)*r-9,b.y-camera+Math.sin(a)*r-9,18,18);}}
 ctx.globalAlpha=1;for(const p of g.players){if(!p.alive)continue;if(g.t-(p.punchAt??-10)>.1&&g.t-(p.punchAt??-10)<.25){ctx.fillStyle='#ffe6a3';ctx.fillRect(p.x+(p.facing||1)*42-12,p.y-camera-42,24,18);}if(p.stagger){ctx.fillStyle='#ffc47f';ctx.font='12px "Fusion Pixel",monospace';ctx.textAlign='center';ctx.fillText(p.stagger+'%',p.x,p.y-camera-83);}}
 ctx.restore();
}
