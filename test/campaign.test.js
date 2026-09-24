import test from 'node:test';import assert from 'node:assert/strict';
import {CAMPAIGN_TRIALS,CHAPTERS,campaignProgress,campaignStep} from '../public/campaign.js';
import {makeGame,step} from '../public/engine.js';
import {fallBossStep} from '../public/fall-boss.js';
import {castBossAttack,stepBossZones} from '../public/boss-attacks.js';
import {encodeSave,decodeSave} from '../public/save-game.js';
const game=()=>makeGame([{id:'p',name:'闯关者'}],42,{mode:'endless',difficulty:'easy'});
test('81 distinct trials contain six exploration, two elite and one boss in each chapter',()=>{
 assert.equal(CAMPAIGN_TRIALS.length,81);assert.equal(new Set(CAMPAIGN_TRIALS.map(t=>t.name)).size,81);
 for(let c=0;c<9;c++){const trials=CAMPAIGN_TRIALS.slice(c*9,c*9+9);assert.deepEqual(trials.map(t=>t.kind),['explore','explore','explore','explore','explore','explore','elite','elite','boss']);assert.equal(trials[8].name,CHAPTERS[c].boss);}
});
test('depth selects trials and chapter progress only advances after boss victory',()=>{
 const g=game();for(let slot=0;slot<9;slot++){g.players[0].depth=slot*4;assert.equal(campaignProgress(g).slot,slot);}
 g.players[0].depth=36;g.t=60;fallBossStep(g,{},0,()=>{},()=>{});assert.equal(g.bossEntrance.index,0);g.t=63;fallBossStep(g,{},0,()=>{},()=>{});
 assert.equal(campaignProgress(g).chapter,0);g.fallBoss.hp=0;fallBossStep(g,{},0,()=>{},()=>{});
 assert.equal(campaignProgress(g).chapter,1);assert.equal(campaignProgress(g).slot,0);assert.equal(g.nextBossLayer,72);
});
test('elite hazards telegraph before damage, hit independently and cannot repeat damage',()=>{
 const g=game(),p=g.players[0];p.depth=24;g.t=10;campaignStep(g,0,()=>{},()=>{});assert.equal(g.elite.variant,0);g.t=12;let hits=0;campaignStep(g,0,()=>hits++,()=>{});assert.equal(hits,0);g.t=13.7;campaignStep(g,0,()=>hits++,()=>{});assert.equal(hits,1);campaignStep(g,0,()=>hits++,()=>{});assert.equal(hits,1);
});
test('all bosses cast distinct projectiles or zones and lightning has a dodge window',()=>{
 const signatures=[];
 for(let i=0;i<9;i++){const g=game();g.bossArena={floor:520};g.bossShots=[];g.t=10;castBossAttack(g,{index:i,x:700,y:450},g.players[0]);signatures.push((g.bossZones?.[0]||g.bossShots[0]).kind);if(i===7){let hits=0;stepBossZones(g,()=>hits++);assert.equal(hits,0);g.players[0].y=520;g.t=11.15;stepBossZones(g,()=>hits++);assert.equal(hits,1);}}
 assert.equal(new Set(signatures).size,9);
});
test('blue guard break stops new attacks and preserves recovery window',()=>{
 const g=game();g.players[0].depth=36;g.t=60;fallBossStep(g,{},0,()=>{},()=>{});g.t=63;fallBossStep(g,{},0,()=>{},()=>{});g.fallBoss.guard=0;g.fallBoss.brokenUntil=70;g.fallBoss.nextAttack=63;fallBossStep(g,{},0,()=>{},()=>{});assert.equal(g.fallBoss.warning,null);assert.ok(g.fallBoss.nextAttack>g.t);
});
test('ninth boss completes campaign and does not spawn a tenth boss',()=>{
 const g=game();g.clearedBosses=8;g.bossCount=8;g.players[0].depth=324;g.t=100;fallBossStep(g,{},0,()=>{},()=>{});g.t=103;fallBossStep(g,{},0,()=>{},()=>{});assert.equal(g.fallBoss.index,8);g.fallBoss.hp=0;step(g,{},0);assert.equal(g.campaignComplete,true);assert.equal(g.phase,'finished');assert.match(g.result[0].title,/劫尽/);assert.equal(g.fallBoss,null);
});
test('chapter and elite timers persist exactly through save and resume',()=>{
 const g=game();g.players[0].depth=28;g.t=10;campaignStep(g,0,()=>{},()=>{});g.t=12;campaignStep(g,0,()=>{},()=>{});const restored=decodeSave(encodeSave(g,'p')).game;assert.deepEqual(restored.eliteShots,g.eliteShots);assert.deepEqual(campaignProgress(restored),campaignProgress(g));
});
test('elite chapters have distinct attack layouts beyond names and colors',async()=>{const {ELITE_PATTERNS}=await import('../public/campaign.js');assert.equal(new Set(ELITE_PATTERNS.map(({hint,...p})=>JSON.stringify(p))).size,9);});
