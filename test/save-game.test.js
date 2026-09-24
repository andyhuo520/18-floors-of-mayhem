import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGame,step} from '../public/engine.js';
import {encodeSave,decodeSave,writeSave,readSave} from '../public/save-game.js';
const roster=[{id:'me',name:'存档侠'},{id:'cpu',name:'电脑',cpu:true}];
test('local CPU snapshot preserves deterministic continuation and independent copy',()=>{
 const g=makeGame(roster,123,{mode:'brawl',difficulty:'easy'});
 for(let i=0;i<30;i++)step(g,{});
 const restored=decodeSave(encodeSave(g,'me')).game;
 assert.deepEqual(restored,JSON.parse(JSON.stringify(g)));
 for(let i=0;i<30;i++){step(g,{});step(restored,{});}
 assert.deepEqual(restored,JSON.parse(JSON.stringify(g)));
 restored.players[0].hp=99;assert.notEqual(g.players[0].hp,99);
});
test('boss, projectiles, timers and inventory survive snapshot',()=>{
 const g=makeGame(roster,123,{mode:'brawl'});
 g.bossArena={hp:200,guard:40,until:90};g.bossShots=[{x:10,y:20,vx:50}];g.players[0].carry='shield';g.players[0].bonusTime=20;
 assert.deepEqual(decodeSave(encodeSave(g,'me')).game,JSON.parse(JSON.stringify(g)));
});
test('rejects corrupt, incompatible, finished, dead and real multiplayer saves',()=>{
 assert.throws(()=>decodeSave('broken'));
 const g=makeGame(roster,123,{mode:'brawl'});
 const s=JSON.parse(encodeSave(g,'me'));s.version=99;assert.throws(()=>decodeSave(JSON.stringify(s)));
 g.players[1].cpu=false;assert.throws(()=>encodeSave(g,'me'));g.players[1].cpu=true;
 g.players[0].alive=false;assert.throws(()=>encodeSave(g,'me'));g.players[0].alive=true;
 g.phase='finished';assert.throws(()=>encodeSave(g,'me'));
});
test('storage errors propagate; reading save never consumes checkpoint',()=>{
 const m=new Map(),storage={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 assert.equal(readSave(storage),null);
 writeSave(storage,makeGame(roster,123,{mode:'brawl'}),'me');
 assert.deepEqual(readSave(storage),readSave(storage));
 assert.throws(()=>writeSave({setItem(){throw Error('Quota');}},makeGame(roster,123,{mode:'brawl'}),'me'));
});
