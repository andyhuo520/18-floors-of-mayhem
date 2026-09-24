// One room's authoritative state and protocol, shared by the local Node host and the Cloudflare Durable Object.
// Transport differences (socket events, timers, randomness) stay outside; this file never imports either runtime.
import {sanitizeLook,PALETTE} from '../public/appearance.js';
import {uniqueName} from '../public/names.js';
import {makeGame,step,eliminate,COLORS,sanitizeRules} from '../public/engine.js';

export const CODE_LENGTH=6;
const CODE_ALPHABET='0123456789ABCDEF';
export function randomCode(random=defaultRandom){let code='';for(const b of random(CODE_LENGTH))code+=CODE_ALPHABET[b&15];return code;}
export function randomId(bytes,random=defaultRandom){return [...random(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function defaultRandom(size){const out=new Uint8Array(size);globalThis.crypto.getRandomValues(out);return out;}

// An AI seat announces which lab is driving it; anything not on this list is treated as absent.
const BADGES=new Set(['glm','glm-coding','deepseek','openai','anthropic','custom']);
export const sanitizeBadge=v=>BADGES.has(v)?v:null;

export const GRACE_MS=8000;
export const COUNTDOWN_MS=2000;
export const MAX_PLAYERS=12;

export class Room {
 constructor(code,{random=defaultRandom,now=()=>Date.now()}={}){
  this.code=code;this.random=random;this.now=now;
  this.members=new Map();this.inputs={};this.game=null;this.rules=sanitizeRules(null);
  this.host=null;this.startsAt=null;this.reconnects=new Map();this.frames=0;
  this.claimed=false;
 }

 get empty(){return this.members.size===0;}
 // Spectators sit in the room without a seat in the match: they never count toward capacity, the
 // coop pair, or the two-player minimum, and they are left out of the roster the game is built from.
 get players(){return [...this.members.values()].filter(p=>!p.spectator);}

 send(ws,data){try{if(ws.readyState===1)ws.send(JSON.stringify(data));}catch{}}
 broadcast(data){for(const p of this.members.values())this.send(p.ws,data);}
 lobby(){this.broadcast({type:'lobby',code:this.code,host:this.host,rules:this.rules,players:[...this.members.values()].map(({id,name,color,look,badge,ai,spectator})=>({id,name,color,look,badge,ai,spectator:!!spectator})),phase:this.game?.phase||'lobby'});}

 // A socket belongs to the room before it has a player; `hello` gives it an id to resume with.
 attach(ws){ws.pid=randomId(6,this.random);ws.room=null;this.send(ws,{type:'hello',id:ws.pid});}

 handle(ws,raw,{crossRoomNames}={}){
  try{
   if(typeof raw!=='string'||raw.length>2048)return;
   const m=JSON.parse(raw);if(!m||typeof m!=='object')return;
   const now=this.now();if(!ws.window||now-ws.window>1000){ws.window=now;ws.count=0;}if(++ws.count>100)return;
   if(m.type==='enableReconnect'){ws.resumeToken=randomId(24,this.random);this.send(ws,{type:'session',token:ws.resumeToken});return;}
   if(m.type==='resume')return this.resume(ws,m);
   if(m.type==='latency')return this.send(ws,{type:'latency',at:m.at});
   if(m.type==='create'||m.type==='join')return this.enter(ws,m,crossRoomNames);
   if(m.type==='leave'){this.leave(ws);this.send(ws,{type:'left'});return;}
   if(!this.members.has(ws.pid))return;
   if(m.type==='settings')return this.settings(ws,m);
   if(m.type==='appearance')return this.appearance(ws,m);
   if(m.type==='rename')return this.rename(ws,m,crossRoomNames);
   if(m.type==='start')return this.start(ws);
   if(m.type==='input')this.inputs[ws.pid]={left:m.left===true,right:m.right===true,jump:m.jump===true,drop:m.drop===true,rescue:m.rescue===true,eat:m.eat===true,pass:m.pass===true,punch:m.punch===true,bomb:m.bomb===true,fire:m.fire===true,heavy:m.heavy===true,reward:m.reward===true};
  }catch{this.send(ws,{type:'error',message:'无法识别的请求'});}
 }

 enter(ws,m,crossRoomNames){
  if(ws.room)return this.send(ws,{type:'error',message:'请先离开当前房间'});
  if(m.type==='create'){
   if(this.members.size)return this.send(ws,{type:'error',message:'这个房间码已经被使用，请重新创建'});
   this.rules=sanitizeRules(m.rules);this.host=ws.pid;this.claimed=true;
  }else{
   if(!this.members.size)return this.send(ws,{type:'error',message:'没有找到这个房间，请检查房间码'});
   if(this.game?.phase==='playing'||this.startsAt)return this.send(ws,{type:'error',message:'比赛已经开始，请等下一局'});
   if(m.spectate!==true){
    if(this.rules.mode==='coop'&&this.players.length>=2)return this.send(ws,{type:'error',message:'双人协作房间已满（2 人）'});
    if(this.players.length>=MAX_PLAYERS)return this.send(ws,{type:'error',message:`房间已满（${MAX_PLAYERS} 人）`});
   }
  }
  const taken=new Set([...(crossRoomNames||[]),...[...this.members.values(),...(this.game?.players||[])].map(p=>p.name)]);
  const name=uniqueName(m.name,taken);
  const used=new Set([...this.members.values()].map(p=>p.color));
  const fallback=COLORS.find(c=>!used.has(c))||COLORS[0];
  const look=sanitizeLook(m.look);
  this.members.set(ws.pid,{id:ws.pid,name,color:PALETTE[look.color]||fallback,look,ai:m.ai===true,spectator:m.spectate===true,badge:sanitizeBadge(m.badge),ws});
  this.everJoined=true;
  ws.room=this.code;this.lobby();
 }

 resume(ws,m){
  const saved=this.reconnects.get(m.token);
  if(!saved||this.now()>saved.member.deadline)return this.send(ws,{type:'resumeFailed'});
  const {member}=saved;this.reconnects.delete(m.token);
  ws.pid=member.id;ws.room=this.code;ws.resumeToken=m.token;member.ws=ws;
  member.graceSpent=(member.graceSpent||0)+this.now()-member.disconnectedAt;
  delete member.deadline;delete member.disconnectedAt;
  this.send(ws,{type:'resumed',id:ws.pid,game:this.game,seconds:this.startsAt?Math.max(0,(this.startsAt-this.now())/1000):0});
  this.lobby();this.broadcast({type:'network',paused:this.paused,message:'队友已重连'});
 }

 settings(ws,m){
  if(this.host!==ws.pid||this.game?.phase==='playing'||this.startsAt)return this.send(ws,{type:'error',message:'仅房主可在开局前设置模式'});
  const next=sanitizeRules(m.rules);
  if(next.mode==='coop'&&this.players.length>2)return this.send(ws,{type:'error',message:'双人协作需要恰好 2 人，请创建双人房间'});
  this.rules=next;this.lobby();
 }

 appearance(ws,m){
  if(this.game?.phase==='playing'||this.startsAt)return this.send(ws,{type:'error',message:'比赛中不能更改形象'});
  const p=this.members.get(ws.pid);p.look=sanitizeLook(m.look);p.color=PALETTE[p.look.color];this.lobby();
 }

 rename(ws,m,crossRoomNames){
  if(this.game?.phase==='playing'||this.startsAt)return this.send(ws,{type:'error',message:'比赛开始后不能改名'});
  const p=this.members.get(ws.pid);
  const taken=new Set([...(crossRoomNames||[]),...[...this.members.values()].filter(q=>q.id!==ws.pid).map(q=>q.name)]);
  p.name=uniqueName(m.name,taken);this.lobby();
 }

 start(ws){
  if(this.host!==ws.pid||this.startsAt||this.game?.phase==='playing')return;
  if(this.players.length<2)return this.send(ws,{type:'error',message:'至少需要 2 位玩家；也可以返回单人练习'});
  if(this.rules.mode==='coop'&&this.players.length!==2)return this.send(ws,{type:'error',message:'双人协作需要恰好 2 人'});
  if(this.paused)return this.send(ws,{type:'error',message:'请等待队友重连'});
  for(const p of this.members.values())p.graceSpent=0;
  this.inputs={};
  const seed=new DataView(this.random(4).buffer).getUint32(0);
  this.game=makeGame(this.players.map(({id,name,color,look,badge,ai})=>({id,name,color,look,badge,ai})),seed,this.rules);
  this.startsAt=this.now()+COUNTDOWN_MS;
  this.broadcast({type:'countdown',game:this.game,seconds:COUNTDOWN_MS/1000});
 }

 get paused(){return [...this.members.values()].some(p=>p.deadline);}

 leave(ws){
  if(!this.members.has(ws.pid))return;
  this.members.delete(ws.pid);
  if(this.game){const p=this.game.players.find(p=>p.id===ws.pid);if(p)eliminate(this.game,p,'连接已断开');}
  delete this.inputs[ws.pid];
  if(ws.resumeToken)this.reconnects.delete(ws.resumeToken);
  ws.room=null;
  if(!this.members.size){this.game=null;this.startsAt=null;this.host=null;return;}
  if(this.host===ws.pid)this.host=this.members.keys().next().value;
  this.lobby();
  this.broadcast({type:'network',paused:this.paused,message:'房间成员已更新'});
 }

 // A dropped socket keeps its seat for the remainder of this player's grace budget.
 interrupted(ws){
  const member=this.members.get(ws.pid);
  if(!member||member.ws!==ws)return;
  if(!ws.resumeToken)return this.leave(ws);
  const allowance=GRACE_MS-(member.graceSpent||0);
  if(allowance<=0)return this.leave(ws);
  member.disconnectedAt=this.now();member.deadline=this.now()+allowance;
  this.inputs[ws.pid]={};
  this.reconnects.set(ws.resumeToken,{member,ws});
  this.broadcast({type:'network',paused:true,message:'队友正在重连，最多等待 '+Math.ceil(allowance/1000)+' 秒'});
 }

 // One physics frame. Returns false once the room holds nobody, so the host can retire it.
 advance(){
  this.frames++;
  for(const [token,saved] of this.reconnects){
   if(this.now()>=saved.member.deadline){
    this.reconnects.delete(token);this.leave(saved.ws);
    this.broadcast({type:'network',paused:this.paused,message:'重连超时，房间已更新'});
   }
  }
  if(this.empty)return false;
  if(!this.game||this.game.phase!=='playing')return true;
  if(this.paused){if(this.startsAt)this.startsAt+=1000/60;return true;}
  if(this.startsAt){if(this.now()<this.startsAt)return true;this.startsAt=null;}
  step(this.game,this.inputs);
  if(this.frames%2===0||this.game.phase==='finished')this.broadcast({type:'state',game:this.game});
  return true;
 }
}
