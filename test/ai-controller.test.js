import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGame,step,H} from '../public/engine.js';
import {controllerTick,candidates,bestTarget,nearestBelow,CEILING,FLOOR} from '../public/ai/controller.js';

// Isolate platform navigation from boss combat, covered separately in fall-boss.test.js.
const solo=seed=>({...makeGame([{id:'ai',name:'AI',look:{}}],seed),nextBossDepth:Infinity});
function run(seed,intervalMs,pick,seconds=90){
 const g=solo(seed),p=g.players[0];
 let intent=null,since=1e9;
 for(let f=0;f<60*seconds;f++){
  since+=1000/60;
  if(since>=intervalMs){const t=pick(g,p);intent=t?{action:'descend_to',platformId:t.id}:null;since=0;}
  step(g,{ai:controllerTick(g,p,intent)});
  if(!p.alive||g.phase!=='playing')break;
 }
 return {meters:p.meters,seconds:g.t};
}

test('the controller only proposes platforms that are actually survivable to reach',()=>{
 const g=solo(2024),p=g.players[0];
 for(let i=0;i<60*6;i++)step(g,{ai:controllerTick(g,p,null)});
 for(const f of candidates(g,p)){
  assert.ok(!f.broken,'a broken platform is never a candidate');
  assert.ok(f.y-p.lastSafe<=460,'a candidate must not require a fatal fall');
  assert.ok(f.y>g.camera+CEILING&&f.y<g.camera+FLOOR,'a candidate must be inside the arena');
 }
});

test('a stale or impossible intent never strands the player',()=>{
 const g=solo(101),p=g.players[0];
 // Point at a platform that does not exist, then at one that has been recycled away.
 const ghost={action:'descend_to',platformId:999999};
 for(let i=0;i<60*20;i++)step(g,{ai:controllerTick(g,p,ghost)});
 assert.ok(p.meters>0,'the player still descends when the intent is unusable');
});

test('the controller holds a high station on the platforms it stands on',()=>{
 const g=solo(7),p=g.players[0];
 const standingHeights=[];
 for(let i=0;i<60*40;i++){
  const t=bestTarget(g,p);
  step(g,{ai:controllerTick(g,p,t&&{action:'descend_to',platformId:t.id})});
  if(!p.alive)break;
  // Sample only while grounded: mid-fall height says nothing about the control law, and the
  // frame a run ends on would measure the death rather than the station being held.
  if(p.ground!=null)standingHeights.push(p.y-g.camera);
 }
 assert.ok(standingHeights.length>30,'expected the player to stand somewhere repeatedly');
 const mean=standingHeights.reduce((a,b)=>a+b,0)/standingHeights.length;
 // Living low in the corridor is what leaves nothing below to aim at; this was worth 3.4x distance.
 // (0.66: hazard-dodging exits shift landings a few px lower; the bug this guards was 0.75+.)
 assert.ok(mean<FLOOR*0.66,`mean standing height ${mean.toFixed(0)} is too low in a ${FLOOR} corridor`);
 assert.ok(mean>CEILING+120,`mean standing height ${mean.toFixed(0)} crowds the danger line`);
});

test('the split design tolerates model latency: a slow strategist scores like a fast one',()=>{
 const seeds=[7,101,2024,55555];
 const pick=(g,p)=>bestTarget(g,p);
 const fast=seeds.map(s=>run(s,16,pick).meters);
 const slow=seeds.map(s=>run(s,2000,pick).meters);
 const crawl=seeds.map(s=>run(s,6000,pick).meters);
 const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
 // This is the premise of the whole AI mode: decisions arrive seconds apart and it still plays.
 assert.ok(mean(slow)>mean(fast)*0.6,`2s cadence collapsed: ${mean(slow).toFixed(0)} vs ${mean(fast).toFixed(0)}`);
 // Live models answer in 3-8s. A hold-until-almost-dead policy once made every seat die in one
 // 154-173m cluster at this cadence; survival pacing must never be a function of model latency.
 assert.ok(mean(crawl)>mean(fast)*0.5,`6s cadence collapsed: ${mean(crawl).toFixed(0)} vs ${mean(fast).toFixed(0)}`);
});

test('the fallback is deliberately weaker than the scorer, so model choices can matter',()=>{
 const g=solo(2024),p=g.players[0];
 for(let i=0;i<60*8;i++)step(g,{ai:controllerTick(g,p,null)});
 const options=candidates(g,p);
 if(options.length>1){
  // nearestBelow must not consult hazards or pickups; if it did, an absent model would be free.
  const near=nearestBelow(g,p);
  assert.ok(options.includes(near));
 }
});
