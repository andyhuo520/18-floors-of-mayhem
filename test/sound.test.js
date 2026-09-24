import test from 'node:test';
import assert from 'node:assert/strict';
import {deathMix,Soundtrack} from '../public/sound.js';

test('local scream is centered and stronger than nearby and distant players',()=>{
 const listener={x:100,y:100};
 assert.deepEqual(deathMix({x:900,y:900},listener,true),{volume:1,pan:0});
 const near=deathMix({x:150,y:100},listener),far=deathMix({x:800,y:900},listener);
 assert.ok(1>near.volume&&near.volume>far.volume&&far.volume>0);
 assert.ok(near.pan>0&&far.pan<=.85);
 assert.ok(deathMix({x:0,y:100},listener).pan<0);
});

test('simultaneous deaths each play and mute suppresses voices',()=>{
 const nodes=[];const node=()=>({connect(){},disconnect(){},gain:{value:0},pan:{value:0},playbackRate:{value:1},threshold:{value:0},ratio:{value:0},start(){nodes.push(this);}});
 const s=new Soundtrack();s.ctx={state:'running',destination:{},createBufferSource:node,createGain:node,createStereoPanner:node,createDynamicsCompressor:node};s.enabled=true;s.buffers.set('death',{});
 for(let i=0;i<12;i++)s.death({x:i*30,y:100,look:{animal:i%8}},{x:0,y:100},i===0);
 assert.equal(nodes.length,12);assert.equal(s.voiceConnected,true);
 s.enabled=false;s.death({x:0,y:0},{x:0,y:0},true);assert.equal(nodes.length,12);
});
