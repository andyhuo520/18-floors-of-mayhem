import test from 'node:test';import assert from 'node:assert/strict';
import {createEncounter,encounterBoxes,encounterStep,CHAPTER_GIANTS} from '../public/encounters.js';
import {worldRelicStep,applyRelic} from '../public/arena-items.js';
import {makeGame,collectItem} from '../public/engine.js';
test('nine chapter creatures use bounded target-locked boxes and leave escape space',()=>{
 assert.equal(new Set(CHAPTER_GIANTS.map(x=>x.name)).size,9);
 for(let chapter=0;chapter<9;chapter++)for(let n=1;n<=2;n++){
  const g={camera:2000,t:5,campaign:{chapter},difficulty:'easy'};const e=createEncounter(g,n,{x:450,y:2300});
  assert.equal(e.chapter,chapter);assert.ok(e.at-g.t>=2);const boxes=encounterBoxes(e);
  assert.ok(boxes.every(r=>r.x>=0&&r.x+r.w<=900&&r.h<680));
  assert.ok(boxes.reduce((a,r)=>a+r.w*r.h,0)<900*680*.4);
 }
});
test('lane attacks leave the middle safe and damage only their marked lanes once',()=>{
 const g={camera:2000,t:5,campaign:{chapter:3},platforms:[],players:[{id:'safe',alive:true,x:450,y:2300},{id:'hit',alive:true,x:300,y:2300}]};
 g.encounter=createEncounter(g,1,g.players[0]);g.t=g.encounter.at;const hit=[];
 encounterStep(g,0,(g,p)=>hit.push(p.id),()=>{});encounterStep(g,0,(g,p)=>hit.push(p.id),()=>{});assert.deepEqual(hit,['hit']);
});
test('one exploration relic per chapter, collected once even with a carried brawl item',()=>{
 const g=makeGame([{id:'p'}],1,{mode:'brawl'});g.camera=1000;g.campaign={chapter:0,depth:12,base:0};g.platforms=[{id:999,x:100,y:1250,w:120,type:'solid'}];g.items=[];
 worldRelicStep(g);worldRelicStep(g);assert.equal(g.items.length,1);const p=g.players[0];p.carry='heart';
 assert.equal(collectItem(g,p,g.items[0]),true);assert.equal(p.shield,true);assert.equal(p.carry,'heart');assert.equal(collectItem(g,p,g.items[0]),false);
});
test('relics have real bounded effects: ammo, cleansing, energy, weapon and cooldown',()=>{
 const g={t:20,bossShots:[{x:110,y:100},{x:800,y:100}],eliteShots:[]},p={x:100,y:128,skillEnergy:10,bossAmmo:22,frozenUntil:99,skillReady:40};
 applyRelic(g,p,1);assert.equal(p.bossAmmo,24);applyRelic(g,p,2);assert.equal(g.bossShots.length,1);
 applyRelic(g,p,3);assert.equal(p.shield,true);assert.equal(p.frozenUntil,0);applyRelic(g,p,4);assert.equal(p.skillEnergy,45);
 applyRelic(g,p,5);assert.equal(p.bossWeapon,1);assert.equal(p.bossAmmo,12);applyRelic(g,p,6);assert.equal(p.skillEnergy,65);
 applyRelic(g,p,7);assert.equal(p.skillReady,20);assert.equal(p.skillEnergy,90);applyRelic(g,p,8);assert.equal(p.skillEnergy,100);
});
