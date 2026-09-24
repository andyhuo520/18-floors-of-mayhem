import {bossCpuInput} from '../boss-cpu.js';
// The fast half of an AI player. A language model answers a few times per second at best, while
// the match runs at 60Hz, so the model only chooses *which* platform to go to and this controller
// turns that choice into per-frame input. It also keeps the three lethal limits in view at all
// times, because a stale intent must never be allowed to kill the player on its own.
import {H,surfaceY} from '../engine.js';

// Mirrors the limits enforced in engine.js: above this the danger line catches you, below it you
// fall out of the arena, and a single uninterrupted drop longer than FALL_LIMIT is fatal.
export const CEILING=22, FLOOR=H+65, FALL_LIMIT=470;
const SAFE_FALL=400;      // leaves room for the landing check at 460
const EDGE_MARGIN=26;     // how close to a platform edge counts as "lined up to step off"
// The corridor band the controller holds, measured downwards from the camera. It sits high on
// purpose: each step down gains roughly a platform gap, and from low in the corridor there is
// nothing left below to aim at, so a single missed landing falls straight out of the arena.
// Above DESCEND_ABOVE the danger line is imminent and leaving is mandatory.
const DESCEND_ABOVE=170, HOLD_BELOW=290;
const PACE_FLOOR=320;   // below this the autopilot resumes descending even without an order

const centre=f=>f.x+f.w/2;

// Where on a platform this particular player stands. Aiming everyone at the exact centre stacked
// all the AI seats into one pixel pile; a stable per-player anchor spreads them out. And when the
// platform carries an item this player can take, the item IS the anchor — pickup needs |dx|<29,
// which the centre misses on any platform wider than ~150px.
function landingGoal(g,p,f){
 if(!p.carry){
  const item=g.items.find(i=>!i.collected&&i.platformId===f.id);
  if(item)return f.x+f.w*(item.offset??.5);
 }
 // Roster position spaces the seats evenly. Hashing ids looked cleverer but sequential ids
 // ('seat-0','seat-1') collapsed to near-identical fractions, which is the pile-up this exists
 // to prevent; an index is deterministic, shared by every client, and provably spread.
 const idx=Math.max(0,g.players.findIndex(q=>q.id===p.id));
 const n=Math.max(1,g.players.length);
 const frac=n===1?0.5:0.2+0.6*(idx/(n-1));
 return f.x+f.w*frac;
}

/** Platforms that can be reached from here without breaking the fall limit. */
export function candidates(g,p){
 return g.platforms.filter(f=>{
  if(f.broken)return false;
  const drop=f.y-p.y;
  if(drop<24||drop>330)return false;
  if(f.y-p.lastSafe>SAFE_FALL)return false;
  if(f.y<g.camera+CEILING+40||f.y>g.camera+FLOOR-60)return false;
  return true;
 });
}

/** Default scoring, used as the fallback whenever no model intent is available yet. */
export function scorePlatform(g,p,f){
 let score=0;
 score-=Math.abs(centre(f)-p.x)*1.0;        // prefer what we can actually reach sideways
 score-=Math.abs((f.y-p.y)-170)*0.7;        // prefer a normal-sized step down
 score-=f.w<130?90:0;                       // narrow ledges are risky
 if(f.type==='crumble')score-=70;
 if(f.type==='pulse')score-=f.active?400:f.warning?200:110;
 if(f.beast)score-=f.beastPhase==='lurk'?150:320;
 if(f.type==='spring')score+=25;
 if(f.type==='moving')score-=40;
 const item=g.items.find(i=>!i.collected&&i.platformId===f.id);
 if(item)score+=item.type==='poison'?-120:item.type==='heart'&&p.hp<p.maxHp?150:60;
 return score;
}

export function bestTarget(g,p){
 const options=candidates(g,p);
 if(!options.length)return null;
 return options.reduce((a,b)=>scorePlatform(g,p,b)>scorePlatform(g,p,a)?b:a);
}

/**
 * The controller's own fallback, used when the model has not answered yet or its target died.
 * Deliberately unintelligent: it takes whatever is closest to straight down and makes no judgement
 * about hazards, pickups or width. If this were as good as `bestTarget`, the strategist's choices
 * would not change the outcome and the whole match would measure the controller instead of the model.
 */
export function nearestBelow(g,p){
 const options=candidates(g,p);
 if(!options.length)return null;
 // Still no taste — no item greed, no width preference — but not suicidal either: dodging live
 // spikes and a beast mid-grab is baseline competence. Left blind, the autopilot marched every
 // slow-deciding seat into the first beast/spike gauntlet at layers 7-8 in one tight cluster.
 const safe=options.filter(f=>!(f.type==='pulse'&&(f.active||f.warning))&&!(f.beast&&f.beastPhase&&f.beastPhase!=='lurk'));
 const pool=safe.length?safe:options;
 return pool.reduce((a,b)=>Math.abs(centre(b)-p.x)<Math.abs(centre(a)-p.x)?b:a);
}

const NEUTRAL={left:false,right:false,jump:false,drop:false,rescue:false,eat:false,pass:false};

/**
 * One frame of input for an AI player.
 * `intent` is the model's standing decision; it may be stale, missing, or point at a platform that
 * has since broken. Every one of those cases falls back to the local choice rather than stalling.
 */
export function controllerTick(g,p,intent){
 if(g.bossArena)return bossCpuInput(g,p);
 if(!p||!p.alive||p.downed)return {...NEUTRAL};
 const input={...NEUTRAL};
 const height=p.y-g.camera;
 // Descending is not the goal: keeping station is. Dropping the moment a landing is available
 // sinks the player faster than the world scrolls, and a few platforms later there is nothing left
 // below to catch them. Leave a platform only when the danger line is closing in.
 const urgent=height<DESCEND_ABOVE;
 const settled=height>HOLD_BELOW;           // comfortably low in the corridor: let the world come up
 const ground=p.ground!=null?g.platforms.find(f=>f.id===p.ground&&!f.broken):null;

 let target=null;
 if(intent&&intent.action==='descend_to'&&intent.platformId!=null)
  target=g.platforms.find(f=>f.id===intent.platformId&&!f.broken)||null;
 // A target we can no longer reach safely is worse than no target at all.
 if(target&&(target.y-p.y<8||target.y-p.lastSafe>SAFE_FALL))target=null;
 if(!target&&intent&&intent.action==='hold'&&!urgent){
  input.left=intent.dir==='left';input.right=intent.dir==='right';
  return input;
 }
 if(!target&&intent&&intent.action==='wait'&&!urgent&&ground)return input;
 if(!target){
  // No standing order: hold station only while comfortably placed, so a responsive model owns
  // pace and path. But survival pacing may NEVER depend on model latency — the scroll speeds up
  // with depth, and hold-until-almost-dead made every seat in a match die within metres of each
  // other (154~173m clusters at 3s decision cadence) the moment answers took seconds.
  const holdGround=ground&&!((ground.breakAt&&ground.breakAt-g.t<0.6)||(ground.beast&&ground.beastPhase&&ground.beastPhase!=='lurk')||(ground.type==='pulse'&&(ground.warning||ground.active)));
  if(holdGround&&height>=PACE_FLOOR&&!urgent)return input;
  target=nearestBelow(g,p);
 }

 if(!target){
  // Nothing reachable: drift towards the middle of the shaft, where platforms are densest.
  input.left=p.x>520;input.right=p.x<380;
  if(urgent&&ground)input.drop=true;
  return input;
 }

 const goal=landingGoal(g,p,target),dx=goal-p.x;

 if(!ground){
  // Airborne. The chosen target may already be above us, or unreachable sideways before we pass
  // its height; in the air the only thing that matters is landing on *something*, so re-aim at
  // whatever is still catchable rather than committing to a target we can no longer make.
  const airborne=g.platforms.filter(f=>!f.broken&&f.y>p.y+10&&f.y<g.camera+FLOOR-60&&!(f.type==='pulse'&&f.active));
  let aim=target&&target.y>p.y+10?target:null;
  const timeTo=f=>Math.max(.05,(f.y-p.y)/Math.max(60,p.vy||260));
  const reachable=f=>Math.abs(centre(f)-p.x)<=260*timeTo(f)+f.w*.45;
  if(!aim||!reachable(aim)){
   const catchable=airborne.filter(reachable);
   aim=catchable.length?catchable.reduce((a,b)=>b.y<a.y?b:a):null;   // the soonest one we can make
  }
  if(!aim)aim=airborne.reduce((a,b)=>!a||Math.abs(centre(b)-p.x)<Math.abs(centre(a)-p.x)?b:a,null);
  if(aim){const adx=landingGoal(g,p,aim)-p.x;input.left=adx<-6;input.right=adx>6;}
  return input;
 }

 // On a platform. Leaving it is the whole job: standing still rides up into the danger line.
 // Ground that is about to hurt overrides the hold: waiting out a model reply on live spikes
 // is how a "smart" seat dies looking stupid.
 const groundDanger=(ground.breakAt&&ground.breakAt-g.t<0.45)
  ||(ground.beast&&ground.beastPhase&&ground.beastPhase!=='lurk')
  ||(ground.type==='pulse'&&(ground.warning||ground.active));
 const standingOverTarget=goal>ground.x-EDGE_MARGIN&&goal<ground.x+ground.w+EDGE_MARGIN;
 if(Math.abs(dx)>12){input.left=dx<0;input.right=dx>0;}

 // Only ever leave a platform when something below is actually lined up to catch us, and only once
 // we are high enough in the corridor that the descent is worth spending.
 const landing=target&&Math.abs(goal-p.x)<target.w*0.5+40;
 const wantsToGo=!settled||urgent||groundDanger;
 if(wantsToGo&&standingOverTarget&&landing&&Math.abs(dx)<ground.w*0.45)input.drop=true;
 if(urgent&&!input.drop&&landing)input.drop=true;

 // A platform that is about to be taken away is not somewhere to linger.
 // A platform about to be taken away is not somewhere to linger, even while holding station.
 if(ground.breakAt&&ground.breakAt-g.t<0.45&&landing)input.drop=true;
 if(ground.beast&&ground.beastPhase&&ground.beastPhase!=='lurk'&&landing)input.drop=true;
 if(ground.type==='pulse'&&(ground.warning||ground.active)&&landing)input.drop=true;

 return input;
}
