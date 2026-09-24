import test from 'node:test';
import assert from 'node:assert/strict';
import {HERO_SKILLS,launchSkill} from '../public/hero-skills.js';
import {HERO_ART,BOSS_ART} from '../public/ultimate-vfx.js';
import {BOSS_ATTACK_KINDS,castBossAttack} from '../public/boss-attacks.js';
test('each selectable hero launches a distinct authored effect; old wave saves keep a valid asset',()=>{
 const cells=[];
 for(let skin=0;skin<6;skin++){
  const shots=[];launchSkill({id:'hero',look:{skin},x:100,y:200},{x:500,y:200},10,shots);
  assert.ok(shots.length);assert.ok(HERO_ART[shots[0].skill]);cells.push(HERO_ART[shots[0].skill].join(':'));
 }
 assert.equal(new Set(cells).size,6);assert.deepEqual(HERO_ART.wave,HERO_ART.leviathan);
 assert.equal(HERO_SKILLS[5].name,'蓝莓玄鲸炮');
});
test('every actual boss cast has its own sprite mapping, including delayed area attacks',()=>{
 const cells=[];
 for(let index=0;index<9;index++){
  const g={t:10,bossArena:{floor:550},difficulty:'easy',bossShots:[],bossZones:[]};
  castBossAttack(g,{index,x:700,y:420},{x:180,y:500});
  const effects=[...g.bossShots,...g.bossZones];assert.ok(effects.length);
  for(const e of effects)assert.ok(BOSS_ART[e.kind]);
  cells.push(BOSS_ART[BOSS_ATTACK_KINDS[index]].join(':'));
 }
 assert.equal(new Set(cells).size,9);
});
