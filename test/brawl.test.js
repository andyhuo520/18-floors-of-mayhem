import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGame,step,sanitizeRules,collectItem} from '../public/engine.js';

const roster=n=>Array.from({length:n},(_,i)=>({id:'p'+i,name:'猛男'+i,look:{}}));
const brawl=(n=2,seed=2024)=>makeGame(roster(n),seed,{mode:'brawl'});
// Keep everyone standing still on a shared platform so a test measures throwing, not falling.
function park(g){
 const f=g.platforms[0];
 g.players.forEach((p,i)=>{p.x=f.x+60+i*70;p.y=f.y;p.vy=0;p.ground=f.id;p.lastSafe=f.y;});
 return f;
}
const hold=(g,inputs,frames)=>{for(let i=0;i<frames;i++)step(g,inputs);};

test('brawl is a real mode and starts everyone with one poison',()=>{
 assert.equal(sanitizeRules({mode:'brawl'}).mode,'brawl');
 const g=brawl(4);
 assert.equal(g.players.length,4);
 assert.ok(g.players.every(p=>p.carry==='poison'),'everyone opens with ammunition');
 assert.ok(g.players.every(p=>p.hp===1));
});

test('a thrown poison costs the target a life and empties the thrower',()=>{
 const g=brawl(2);park(g);
 const [a,b]=g.players;b.hp=3;
 step(g,{p0:{pass:true}});
 assert.equal(a.carry,null,'throwing spends the carried item');
 assert.equal(g.throws.length,1);
 assert.equal(g.throws[0].type,'poison');
 hold(g,{},40);
 assert.equal(b.hp,2,'the target loses exactly one life');
 assert.equal(a.stats.throwHits,1);
 assert.equal(g.throws.length,0,'a projectile that connects is consumed');
});

test('a shield eats the incoming poison instead of a life',()=>{
 const g=brawl(2);park(g);
 const [a,b]=g.players;b.hp=2;b.shield=true;
 step(g,{p0:{pass:true}});
 hold(g,{},40);
 assert.equal(b.hp,2,'the shield absorbs the hit');
 assert.equal(b.shield,false,'and is used up doing it');
 assert.equal(b.stats.blocked,1);
});

test('a thrown heart heals whoever catches it, opponent included',()=>{
 const g=brawl(2);park(g);
 const [a,b]=g.players;a.carry='heart';b.hp=1;b.maxHp=3;
 step(g,{p0:{pass:true}});
 hold(g,{},40);
 assert.equal(b.hp,2,'the rival is healed by the gift');
 assert.equal(a.stats.gifted,1,'and the thrower is credited with having done it');
});

test('poison cannot be eaten, hearts and shields can',()=>{
 const g=brawl(1);park(g);
 const p=g.players[0];
 p.hp=1;p.carry='poison';
 step(g,{p0:{eat:true}});
 assert.equal(p.carry,'poison','poison stays in hand; throwing is the only way out');
 assert.equal(p.hp,1,'and eating it does not hurt you either');

 p.carry='heart';p.eatHeld=false;
 step(g,{p0:{eat:true}});
 assert.equal(p.hp,2);assert.equal(p.carry,null);

 p.carry='shield';p.eatHeld=false;
 step(g,{p0:{eat:true}});
 assert.equal(p.shield,true);assert.equal(p.carry,null);
});

test('holding a direction aims the throw, otherwise it seeks the nearest rival',()=>{
 const left=brawl(2);park(left);
 left.players[1].x=left.players[0].x+200;          // rival is to the right
 step(left,{p0:{pass:true}});
 assert.ok(left.throws[0].vx>0,'an unaimed throw travels towards the nearest rival');

 const aimed=brawl(2);park(aimed);
 aimed.players[1].x=aimed.players[0].x+200;
 step(aimed,{p0:{pass:true,left:true}});
 assert.ok(aimed.throws[0].vx<0,'holding left throws left even when the rival is right');
});

test('a pickup becomes ammunition rather than taking effect on contact',()=>{
 const g=brawl(2);park(g);
 const p=g.players[0];p.carry=null;p.hp=1;
 const poison={id:1,type:'poison',platformId:g.platforms[0].id,x:p.x,y:p.y-36};
 assert.equal(collectItem(g,p,poison),true);
 assert.equal(p.carry,'poison','picked up, not swallowed');
 assert.equal(p.hp,1,'and it does no damage on the way into the bag');

 const second={id:2,type:'heart',platformId:g.platforms[0].id,x:p.x,y:p.y-36};
 assert.equal(collectItem(g,p,second),false,'a full bag leaves the pickup for someone else');
 assert.equal(second.collected,undefined);
});

test('a projectile cannot tunnel through a player between frames',()=>{
 const g=brawl(2);park(g);
 const [a,b]=g.players;b.hp=3;b.x=a.x+40;
 // One frame is 1/60s, so the projectile has to move far enough in that frame to start before the
 // target and end past it. A point test would miss entirely; only a swept test can catch this.
 const perFrame=7200/60;
 assert.ok(perFrame>2*27,'the test itself must produce a genuine tunnelling case');
 g.throws.push({id:99,type:'poison',from:a.id,x:b.x-40,y:b.y-30,vx:7200,vy:0,until:g.t+3});
 step(g,{});
 assert.ok(g.throws.length===0||g.throws[0].x>b.x+27,'the projectile really did cross the target');
 assert.equal(b.hp,2,'the sweep caught a projectile that moved past the target in one frame');
});

test('brawl never spawns hourglasses, which have nothing to do outside a timed match',()=>{
 const g=brawl(4,777);
 for(let i=0;i<60*40;i++){step(g,{});if(g.phase!=='playing')break;}
 assert.ok(g.items.every(i=>i.type!=='time'),'no timer pickups in a survival brawl');
 assert.ok(g.items.some(i=>i.type==='poison'),'ammunition keeps coming');
});

test('carried heart is consumed, frees the slot, and shield can then be collected and used',()=>{
 const g=brawl();park(g);const p=g.players[0];p.carry=null;
 assert.equal(collectItem(g,p,{type:'heart'}),true);step(g,{p0:{eat:true}});
 assert.equal(p.hp,2);assert.equal(p.carry,null);step(g,{});
 assert.equal(collectItem(g,p,{type:'shield'}),true);step(g,{p0:{eat:true}});
 assert.equal(p.shield,true);assert.equal(p.carry,null);
});
test('poison thrown into a boss damages its guard and emits an impact cue',()=>{
 const g=brawl();g.bossEntrance={until:0};step(g,{});const boss=g.fallBoss;
 const guard=boss.guard;g.throws.push({id:999,type:'poison',from:'p0',x:boss.x,y:boss.y,vx:0,vy:0,until:g.t+1});
 step(g,{});assert.equal(boss.guard,guard-24);assert.ok(g.bossAudio.some(a=>a.kind==='impact'));assert.ok(!g.throws.some(a=>a.id===999));
});
