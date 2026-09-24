import test from 'node:test';
import assert from 'node:assert/strict';
import {TRIALS,makeTrial,stepTrial,FLOOR} from '../public/trial-engine.js';
const advance=(g,n,input={})=>{for(let i=0;i<n;i++)stepTrial(g,input);};
test('81 trials have distinct boss/rule pairs; start with one life on a fixed floor',()=>{
 assert.equal(new Set(TRIALS.map(t=>t.boss+':'+t.affliction)).size,81);
 for(let i=0;i<81;i++){const g=makeTrial(i);assert.equal(g.player.hp,1);g.boss.nextAttack=Infinity;advance(g,120);assert.equal(g.player.y,FLOOR);}
});
test('fatal hit stops the round before a same-frame heart can revive player',()=>{
 const g=makeTrial();g.player.invulnerableUntil=0;g.enemy.push({x:180,y:448,w:70,h:70,until:9});g.pickups.push({x:180,y:455,type:'heart',until:9});stepTrial(g);assert.equal(g.phase,'failed');assert.equal(g.player.hp,0);const t=g.t;advance(g,60);assert.equal(g.t,t);
});
test('shield absorbs one hit and grants a grace period',()=>{
 const g=makeTrial();g.player.invulnerableUntil=0;g.player.shield=true;g.enemy.push({x:180,y:448,w:70,h:70,until:9});stepTrial(g);assert.equal(g.player.shield,false);assert.equal(g.player.hp,1);advance(g,20);assert.equal(g.phase,'playing');
});
test('bomb is edge triggered and ultimate spends charge, clears threats',()=>{
 const g=makeTrial();advance(g,10,{bomb:true});assert.equal(g.player.bombs,2);stepTrial(g,{});stepTrial(g,{bomb:true});assert.equal(g.player.bombs,1);
 g.player.energy=100;g.player.look={skin:4};g.enemy.push({x:100,y:300,w:10,h:10,until:9});stepTrial(g,{down:true});stepTrial(g,{right:true});stepTrial(g,{fire:true});assert.equal(g.player.energy,0);assert.equal(g.enemy.length,0);assert.ok(g.shots.some(s=>s.skill==='whale'));
});
test('all 81 bosses can be defeated; one victory event and no post-victory damage',()=>{
 for(let i=0;i<81;i++){const g=makeTrial(i);g.player.invulnerableUntil=Infinity;advance(g,3600,{fire:true});assert.equal(g.phase,'cleared','trial '+i);assert.equal(g.events.filter(e=>e.type==='win').length,1);assert.equal(g.player.hp>=1,true);}
});
test('jump returns to stage and dodge provides temporary invulnerability',()=>{const g=makeTrial();stepTrial(g,{jump:true,dash:true});assert.ok(g.player.y<FLOOR);assert.ok(g.player.dashUntil>g.t);g.boss.nextAttack=Infinity;advance(g,120);assert.equal(g.player.y,FLOOR);});
test('weapons face the boss even when player has crossed behind it',()=>{const g=makeTrial();g.player.x=890;g.player.invulnerableUntil=Infinity;g.boss.nextAttack=Infinity;advance(g,180,{fire:true});assert.ok(g.boss.hp<g.boss.maxHp);assert.equal(g.player.aim,-1);});
test('boss movement is continuous and attacks have windup and recovery',async()=>{
 const {bossState}=await import('../public/trial-engine.js');const g=makeTrial();g.player.invulnerableUntil=Infinity;advance(g,140);assert.equal(bossState(g),'windup');const x=g.boss.x;stepTrial(g);assert.ok(Math.abs(g.boss.x-x)<=1.51);advance(g,78);assert.equal(bossState(g),'recover');
});
test('web slow persists after leaving the web',()=>{
 const g=makeTrial();g.player.invulnerableUntil=Infinity;g.enemy.push({kind:'web',x:180,y:448,w:70,h:70,until:9});stepTrial(g);g.enemy=[];stepTrial(g,{right:true});assert.equal(g.player.vx,120);advance(g,75,{right:true});assert.equal(g.player.vx,300);
});
test('recovery is a real damage opportunity',()=>{
 const normal=makeTrial(),open=makeTrial();for(const g of [normal,open]){g.player.x=650;g.boss.nextAttack=Infinity;g.boss.guard=0;g.boss.brokenUntil=999;g.shots.push({x:700,y:435,vx:650,vy:0,damage:10,until:3});}open.boss.restUntil=9;advance(normal,2);advance(open,2);assert.equal(normal.boss.hp-open.boss.hp,4.5);
});
test('every consecutive stage changes boss, and every nine-stage round introduces one rule',()=>{
 assert.deepEqual(TRIALS.slice(0,9).map(t=>t.boss),[0,1,2,3,4,5,6,7,8]);
 for(let round=0;round<9;round++){const stages=TRIALS.slice(round*9,round*9+9);assert.equal(new Set(stages.map(t=>t.boss)).size,9);assert.ok(stages.every(t=>t.affliction===round));}
 for(let i=1;i<81;i++)assert.notEqual(TRIALS[i].boss,TRIALS[i-1].boss);
});
