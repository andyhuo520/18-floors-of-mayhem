import test from 'node:test';
import assert from 'node:assert/strict';
import {theaterBeat} from '../public/boss-theater.js';
test('idle performance automatically completes a readable attack and recovery',()=>{
 const phases=[0,2,4,6,7,9,11].map(time=>theaterBeat(time).phase);
 assert.deepEqual(phases,['patrol','charge','attack','recover','counter','idle','patrol']);
 assert.equal(theaterBeat(104,{started:100}).phase,'attack');
});
test('manual reaction restarts windup and reduced motion/live gameplay suppress performance',()=>{
 assert.equal(theaterBeat(9,{reaction:9}).phase,'charge');
 assert.equal(theaterBeat(10.5,{reaction:9}).phase,'attack');
 for(const state of ['elite','result','victory'])assert.equal(theaterBeat(4,{state}).phase,'idle');
 assert.equal(theaterBeat(4,{reduced:true}).phase,'idle');
});
