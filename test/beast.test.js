import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGame,step,surfaceY,BEAST_BANDS,BEAST_HOLD} from '../public/engine.js';

const roster=seats=>Array.from({length:seats},(_,i)=>({id:'p'+i,name:'猛男'+i,look:{}}));
const run=(g,seconds,inputs={})=>{for(let i=0;i<Math.round(seconds*60);i++)step(g,inputs);};
// Moving the camera without moving the players would push them past the danger line and end the
// match, so every scripted jump re-seats everyone on the platform under test.
function focus(g,f,onScreen){
 g.camera=f.y-onScreen;
 for(const p of g.players){p.x=f.x+f.w/2;p.y=f.y;p.vy=0;p.ground=f.id;p.lastSafe=f.y;}
}

test('wall beasts are seeded deterministically and only claim some platforms',()=>{
 const a=makeGame(roster(1),2024),b=makeGame(roster(1),2024),c=makeGame(roster(1),99);
 const marks=g=>g.platforms.filter(f=>f.beast).map(f=>f.layer+':'+f.beast).join(',');
 assert.equal(marks(a),marks(b),'the same seed must produce the same beasts for every client');
 const claimed=a.platforms.filter(f=>f.beast);
 assert.ok(claimed.length>0,'some platform should be claimed');
 assert.ok(claimed.every(f=>f.layer%7===0&&f.layer>=7),'beasts follow the seeded layer cadence');
 assert.ok(a.platforms.some(f=>!f.beast),'most platforms stay safe');
 assert.ok(claimed.every(f=>f.beast==='left'||f.beast==='right'));
 // A different seed should not be forced to agree, but both must stay on the same cadence.
 assert.ok(makeGame(roster(1),99).platforms.filter(f=>f.beast).every(f=>f.layer%7===0));
 assert.ok(c.platforms.filter(f=>f.beast).length>0);
});

test('a claimed platform warns before the claw closes, then tips and breaks',()=>{
 const g=makeGame(roster(1),2024);
 const target=g.platforms.find(f=>f.beast);
 assert.ok(target,'expected a claimed platform');

 // Far below the trigger the beast only lurks, and the slab is untouched.
 focus(g,target,BEAST_BANDS.lurk+60);
 step(g,{});
 assert.equal(target.beastPhase,'lurk');
 assert.equal(target.grabbedAt,undefined);
 assert.equal(target.broken,undefined);

 // A warning band exists between lurking and the grab, so the platform is readable before landing.
 focus(g,target,BEAST_BANDS.lurk-20);
 step(g,{});
 assert.equal(target.beastPhase,'warn');
 assert.equal(target.grabbedAt,undefined,'warning alone must not destroy the platform');

 focus(g,target,BEAST_BANDS.warn-20);
 step(g,{});
 assert.equal(target.beastPhase,'reach');
 assert.equal(target.grabbedAt,undefined);

 focus(g,target,BEAST_BANDS.reach-20);
 step(g,{});
 assert.equal(target.beastPhase,'grip');
 assert.notEqual(target.grabbedAt,undefined,'the claw should close once it reaches the slab');
 const grabbedAt=target.grabbedAt;

 // The slab tips away from the wall the arm came from.
 run(g,BEAST_HOLD/2);
 assert.equal(target.grabbedAt,grabbedAt,'the grab must not restart every frame');
 assert.ok(Math.abs(target.tilt)>0,'a held slab tilts');
 assert.equal(Math.sign(target.tilt),target.beast==='left'?1:-1);
 assert.notEqual(surfaceY(target,target.x),surfaceY(target,target.x+target.w),'the walking surface follows the tilt');

 run(g,BEAST_HOLD);
 assert.equal(target.broken,true,'the slab gives way after the hold');
});

test('the beast announces itself in the match log exactly once per platform',()=>{
 const g=makeGame(roster(2),2024);
 const target=g.platforms.find(f=>f.beast);
 focus(g,target,BEAST_BANDS.reach-20);
 run(g,1.5);
 const shouts=g.events.filter(e=>e.title==='恶兽出手'&&e.text.includes('石台'));
 assert.ok(shouts.length>=1,'the grab should be reported');
 const perPlatform=g.platforms.filter(f=>f.beast&&f.grabbedAt!==undefined).length;
 assert.ok(shouts.length<=perPlatform+1,'one announcement per grabbed platform, not one per frame');
});

test('a beast grab does not damage players on its own', ()=>{
 const g=makeGame(roster(1),2024);
 const p=g.players[0];
 const target=g.platforms.find(f=>f.beast);
 focus(g,target,BEAST_BANDS.reach-20);
 p.hp=3;
 step(g,{});
 assert.equal(target.beastPhase,'grip');
 // Losing the floor is the threat; the claw itself must never take a life directly.
 assert.equal(p.hp,3,'the claw deals no contact damage');
 assert.equal(p.alive,true);
});
