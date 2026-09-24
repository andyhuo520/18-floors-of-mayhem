import test from 'node:test';import assert from 'node:assert/strict';import {makeGame,step,eliminate,collectItem} from '../public/engine.js';
const roster=[{id:'a',name:'A'},{id:'b',name:'B'}];
test('seeded opening is repeatable and streamed ahead',()=>{const a=makeGame(roster,72),b=makeGame(roster,72);assert.deepEqual(a,b);assert.ok(a.platforms.length>=6);assert.ok(a.platforms.at(-1).y>1000);});
test('movement stays inside world and drop passes through starting platform',()=>{const g=makeGame([roster[0]]);step(g,{a:{drop:true}});assert.ok(g.players[0].y>160);assert.equal(g.players[0].ground,null);for(let i=0;i<100;i++)step(g,{a:{left:true}});assert.ok(g.players[0].x>=18);});
test('a swept fall lands on platform instead of tunnelling through',()=>{const g=makeGame([roster[0]]),p=g.players[0];p.x=300;p.y=155;p.vy=550;p.ground=null;step(g);assert.equal(p.y,160);assert.equal(p.vy,0);});
test('crumbling is shared and expires after activation',()=>{const g=makeGame(roster);g.platforms[0].type='crumble';delete g.platforms[0].breakAt;step(g);assert.ok(g.platforms[0].breakAt);for(let i=0;i<83;i++)step(g);assert.equal(g.platforms[0].broken,true);});
test('same-tick elimination shares rank',()=>{const g=makeGame(roster);g.players.forEach(p=>eliminate(g,p,'test'));step(g);assert.equal(g.phase,'finished');assert.deepEqual(g.result.map(r=>r.rank),[1,1]);});
test('a survivor plays on after a rival dies, then ranks ahead of them at the finish',()=>{const g=makeGame(roster);g.t=2;eliminate(g,g.players[0],'test');step(g);assert.equal(g.phase,'playing','being the last one left is the reward, not the end of the run');assert.equal(g.players[1].alive,true);g.t=4;eliminate(g,g.players[1],'test');step(g);assert.equal(g.phase,'finished');assert.equal(g.result[0].id,'b');assert.equal(g.result[0].rank,1);});
test('an item that cannot help is left on the ledge instead of being spent for nothing',()=>{
 const item=t=>({id:99,type:t,platformId:0,offset:.5,x:0,y:0});
 // Full health: the heart stays where it is, for later or for somebody else.
 let g=makeGame(roster),p=g.players[0];p.hp=p.maxHp;
 let heart=item('heart');
 assert.equal(collectItem(g,p,heart),false);
 assert.equal(heart.collected,undefined,'the heart must not be consumed');
 assert.equal(p.hp,p.maxHp);
 // Hurt first, and the same heart is picked up normally.
 p.hp=1;assert.equal(collectItem(g,p,heart),true);assert.equal(p.hp,2);assert.ok(heart.collected);
 // A second shield while one is already up is declined, not eaten.
 g=makeGame(roster);p=g.players[0];p.shield=true;
 const shield=item('shield');
 assert.equal(collectItem(g,p,shield),false);
 assert.equal(shield.collected,undefined);
 p.shield=false;assert.equal(collectItem(g,p,shield),true);assert.equal(p.shield,true);
 // Timed mode caps the bonus at 30s; a clock beyond that would add nothing.
 g=makeGame(roster,42,{mode:'timed'});p=g.players[0];p.bonusTime=30;
 const clock=item('time');
 assert.equal(collectItem(g,p,clock),false);
 assert.equal(clock.collected,undefined);
 p.bonusTime=25;assert.equal(collectItem(g,p,clock),true);assert.equal(p.bonusTime,30);
 // Poison still lands: it is a trap, not a benefit, and declining it would defuse it.
 g=makeGame(roster);p=g.players[0];p.hp=3;
 const poison=item('poison');
 assert.equal(collectItem(g,p,poison),true);assert.ok(poison.collected);assert.equal(p.hp,2);
});
test('passing the old floor 18 and time limit no longer ends solo play',()=>{const g=makeGame([roster[0]]);g.players[0].depth=19;g.t=120;step(g);assert.equal(g.phase,'playing');assert.equal(g.players[0].alive,true);});
test('scrolling is independent of player position and keeps accelerating',()=>{const a=makeGame([roster[0]]),b=makeGame([roster[0]]);b.players[0].y=400;b.players[0].lastSafe=400;for(let i=0;i<20;i++){step(a);step(b);assert.equal(a.camera,b.camera);}const start=a.speed;a.camera=5000;a.players[0].y=5300;a.players[0].lastSafe=5300;step(a);assert.ok(a.speed>start);});
test('endless generation stays bounded, has no finish platform, and scores depth',()=>{const g=makeGame([roster[0]]);for(let scroll=0;scroll<100000;scroll+=100){g.camera=scroll;const p=g.players[0];p.y=scroll+300;p.lastSafe=p.y;p.ground=null;step(g);assert.equal(p.alive,true);assert.equal(g.phase,'playing');assert.ok(g.platforms.length<35);assert.ok(g.platforms.at(-1).y>scroll+1000);assert.ok(g.platforms.every(f=>f.type!=='final'));}assert.ok(g.players[0].meters>9000);assert.equal(g.players[0].score,g.players[0].meters*10);});

test('human survivor continues after all CPU opponents die, then ends on own death',()=>{
 const g=makeGame([{id:'human',name:'Human'},{id:'cpu',name:'CPU',cpu:true}],72,{mode:'brawl'});g.t=2;
 eliminate(g,g.players[1],'test');step(g);assert.equal(g.phase,'playing');assert.equal(g.players[0].alive,true);
 eliminate(g,g.players[0],'test');step(g);assert.equal(g.phase,'finished');assert.equal(g.result[0].id,'human');
});
test('a CPU survivor plays on after the human dies, exactly as a human survivor does',()=>{
 // The continuation used to be a human-only privilege, which cut every bot-vs-bot match short at
 // the first death and left the winner's real depth unmeasured.
 const g=makeGame([{id:'human',name:'Human'},{id:'cpu',name:'CPU',cpu:true}],72,{mode:'brawl'});g.t=2;
 eliminate(g,g.players[0],'test');step(g);assert.equal(g.phase,'playing');assert.equal(g.players[1].alive,true);
 g.t=4;eliminate(g,g.players[1],'test');step(g);assert.equal(g.phase,'finished');assert.equal(g.result[0].id,'cpu');
});

test('network AI guests do not end the human survivor campaign',()=>{const g=makeGame([{id:'human'},{id:'model',ai:true}],42,{mode:'brawl'});g.t=2;eliminate(g,g.players[1],'test');step(g);assert.equal(g.phase,'playing');});
