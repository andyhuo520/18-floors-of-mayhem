import test from 'node:test';import assert from 'node:assert/strict';
import {makeGame} from '../public/engine.js';import {grantBossReward,bossRewardStep} from '../public/arena-items.js';import {bossCpuInput} from '../public/boss-cpu.js';import {comboStep} from '../public/hero-skills.js';import {encodeSave,decodeSave} from '../public/save-game.js';import {Room} from '../shared/room.js';
test('survivors each earn a reward once and keep it across chapter and save transitions',()=>{
 const g=makeGame([{id:'p'},{id:'bot',cpu:true},{id:'dead'}]);g.players[2].alive=false;grantBossReward(g,0,()=>{});grantBossReward(g,0,()=>{});
 assert.equal(g.players[0].bossRewards.length,1);assert.equal(g.players[1].bossRewards.length,1);assert.equal(g.players[2].bossRewards,undefined);
 g.players.pop();g.t=3;g.clearedBosses=1;const restored=decodeSave(encodeSave(g,'p')).game;assert.equal(restored.players[0].bossRewards[0].relic,0);
 bossRewardStep(restored,{p:{reward:true}},()=>{});assert.equal(restored.players[0].shield,true);assert.equal(restored.players[0].bossRewards.length,0);assert.equal(restored.players[1].bossRewards.length,1);
});
test('holding reward cannot consume two rewards and players cannot consume it in the awarding chapter',()=>{
 const g=makeGame([{id:'p'}]);grantBossReward(g,0,()=>{});g.t=3;bossRewardStep(g,{p:{reward:true}},()=>{});assert.equal(g.players[0].bossRewards.length,1);
 g.clearedBosses=2;grantBossReward(g,1,()=>{});bossRewardStep(g,{},()=>{});bossRewardStep(g,{p:{reward:true}},()=>{});bossRewardStep(g,{p:{reward:true}},()=>{});assert.equal(g.players[0].bossRewards.length,1);
});
test('boss AI produces a valid ordered ultimate and avoids incoming attacks through normal inputs',()=>{
 const p={id:'p',alive:true,x:200,y:520,skillEnergy:100},g={t:0,players:[p],difficulty:'medium',fallBoss:{x:700,y:455,guard:80},bossShots:[],bossZones:[],arenaPickups:[]};let fired=false;
 for(let n=0;n<120;n++){g.t=n/60;const i=bossCpuInput(g,p);if(comboStep(p,{down:!!i.drop,left:!!i.left,right:!!i.right,attack:!!i.punch},g.t)){fired=true;break;}}assert.ok(fired);
 g.bossShots=[{x:160,y:492,vx:200,vy:0}];assert.equal(bossCpuInput(g,p).jump,true);
});
test('two room clients receive identical reward state; forged inventory fields are ignored',()=>{
 const room=new Room('ABC123');const clients=['a','b'].map(pid=>({pid,readyState:1,history:[],send(s){this.history.push(JSON.parse(s));}}));
 for(const ws of clients){room.members.set(ws.pid,{id:ws.pid,ws});ws.room=room;}
 room.game=makeGame(clients.map(w=>({id:w.pid})));room.game.t=3;room.game.clearedBosses=1;grantBossReward(room.game,0,()=>{});room.game.t=5;
 room.handle(clients[0],JSON.stringify({type:'input',reward:true,bossRewards:[{relic:8}],shield:false}));room.advance();room.advance();
 const a=clients[0].history.at(-1).game,b=clients[1].history.at(-1).game;assert.deepEqual(a,b);assert.equal(a.players[0].shield,true);assert.equal(a.players[0].bossRewards.length,0);assert.equal(a.players[1].bossRewards.length,1);
});
test('room peers agree on brawl pickup ownership and shield consumption',()=>{
 const room=new Room('ABC123');const clients=['a','b'].map(pid=>({pid,readyState:1,history:[],send(s){this.history.push(JSON.parse(s));}}));for(const ws of clients){room.members.set(ws.pid,{id:ws.pid,ws});ws.room=room;}
 const g=room.game=makeGame(clients.map(w=>({id:w.pid})),42,{mode:'brawl'});g.players[0].carry=null;g.platforms[0].breakAt=100;g.items=[{id:99,type:'shield',x:300,y:124,platformId:0,offset:(300-210)/480}];
 const pickup=g.items[0];room.advance();room.advance();assert.equal(g.players[0].carry,'shield');assert.equal(pickup.collected,'a');
 room.handle(clients[0],JSON.stringify({type:'input',eat:true}));room.advance();room.advance();assert.equal(g.players[0].shield,true);assert.equal(g.players[0].carry,null);assert.equal(g.players[1].shield,false);assert.deepEqual(clients[0].history.at(-1),clients[1].history.at(-1));
});
