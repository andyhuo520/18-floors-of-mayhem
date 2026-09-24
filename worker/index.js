import {DurableObject} from 'cloudflare:workers';
import {Room as RoomCore,randomCode} from '../shared/room.js';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};

export default {
 async fetch(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(path==='/health')return Response.json({ok:true},{headers:cors});
  // Opening the backend in a browser is a reasonable thing to try; say what it is instead of 404.
  if(path==='/')return Response.json({service:'真男人就下 18 层 · 联机后端',note:'这里只提供联机服务，不是游戏页面。',endpoints:{'GET /health':'健康检查','POST /room':'申请一个房间码','GET /ws?room=CODE&intent=create|join':'WebSocket 联机'}},{headers:cors});
  // The Durable Object name is the room code, so a code has to be claimed before the browser opens its socket.
  if(path==='/room'&&request.method==='POST'){
   for(let attempt=0;attempt<8;attempt++){
    const code=randomCode();
    if(await env.ROOM.getByName(code).claim(code))return Response.json({code},{headers:cors});
   }
   return Response.json({error:'房间码暂时分配不出来，请稍后重试'},{status:503,headers:cors});
  }
  if(path==='/ws'){
   const code=String(url.searchParams.get('room')||'').toUpperCase();
   if(!/^[0-9A-F]{6}$/.test(code))return new Response('房间码格式不正确',{status:400,headers:cors});
   return env.ROOM.getByName(code).fetch(request);
  }
  return new Response('Not found',{status:404,headers:cors});
 },
};

export class Room extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  this.core=null;this.loop=null;this.sockets=0;
 }

 // Reserving a code lets `join` still fail on a room nobody ever created.
 async claim(code){
  const held=await this.ctx.storage.get('code');
  if(held)return false;
  await this.ctx.storage.put('code',code);
  this.core=this.core||new RoomCore(code);
  this.core.claimed=true;
  return true;
 }

 async ensureCore(code){
  if(this.core)return this.core;
  this.core=new RoomCore(code);
  this.core.claimed=Boolean(await this.ctx.storage.get('code'));
  return this.core;
 }

 async fetch(request){
  const url=new URL(request.url);
  if(url.pathname!=='/ws')return new Response('Not found',{status:404,headers:cors});
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket upgrade required',{status:426,headers:cors});
  const code=String(url.searchParams.get('room')||'').toUpperCase();
  const intent=url.searchParams.get('intent')==='create'?'create':'join';
  const core=await this.ensureCore(code);
  const [client,server]=Object.values(new WebSocketPair());
  server.accept();
  if(!core.claimed&&intent!=='create'){
   server.send(JSON.stringify({type:'error',message:'没有找到这个房间，请检查房间码'}));
   try{server.close(1000,'Unknown room');}catch{}
   return new Response(null,{status:101,webSocket:client});
  }
  this.sockets++;
  const drop=()=>{if(server.dropped)return;server.dropped=true;this.sockets--;core.interrupted(server);};
  server.addEventListener('message',e=>core.handle(server,typeof e.data==='string'?e.data:''));
  server.addEventListener('close',drop);
  server.addEventListener('error',drop);
  core.attach(server);
  this.startLoop();
  return new Response(null,{status:101,webSocket:client});
 }

 // Timers registered inside a fetch die with that request's context, so the match clock is an
 // explicit loop held open by waitUntil for as long as the room still has someone in it.
 startLoop(){
  if(this.loop)return;
  this.loop=(async()=>{
   try{
    // Keep ticking while anyone is still attached: a socket that has not sent `join` yet holds no seat.
    while(this.core&&this.sockets>0){this.core.advance();await scheduler.wait(1000/60);}
   }finally{this.loop=null;}
  })();
  this.ctx.waitUntil(this.loop);
 }
}
