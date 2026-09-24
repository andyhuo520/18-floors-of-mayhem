import http from 'node:http';
import {networkInterfaces} from 'node:os';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {WebSocketServer} from 'ws';
import {Room,randomCode} from './shared/room.js';

const root=fileURLToPath(new URL('./public/',import.meta.url));
const files={'/game-qr.png':'game-qr.png','/result-poster.js':'result-poster.js','/onboarding.js':'onboarding.js','/i18n.js':'i18n.js','/game-icon.svg':'game-icon.svg','/save-game.js':'save-game.js','/names.js':'names.js','/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css','/engine.js':'engine.js','/appearance.js':'appearance.js','/sound.js':'sound.js','/pixel-world.js':'pixel-world.js','/world-config.js':'world-config.js'};
for(const name of ['space','searching','pressure','land','jump','spring','break','death','zone','warning','click'])files['/audio/'+name+'.mp3']='audio/'+name+'.mp3';
for(const name of ['lobby-8bit',...['pineapple','chicken','rocket','ram','whale','leviathan','idle-a','idle-b'].flatMap(hero=>['zh','en'].map(lang=>'voice-'+hero+'-'+lang))])files['/audio/'+name+'.mp3']='audio/'+name+'.mp3';
files['/art-reference.png']='art-reference.png';files['/credits.html']='credits.html';files['/audio/Kenney-License.txt']='audio/Kenney-License.txt';
files['/fonts/pixel.woff2']='fonts/pixel.woff2';files['/fonts/LICENSE.txt']='fonts/LICENSE.txt';
files['/combos-assets/giant-beam.webp']='combos-assets/giant-beam.webp';
files['/combos-assets/giant-attacks.webp']='combos-assets/giant-attacks.webp';
files['/combos-assets/guardian-cutouts.webp']='combos-assets/guardian-cutouts.webp';
for(const name of ['heroes-a','heroes-b','boss-a','boss-b','boss-c','impacts'])files['/combos-assets/skills-v4/'+name+'.webp']='combos-assets/skills-v4/'+name+'.webp';
for(const name of ['giants-a','giants-b','giants-c','relics'])files['/combos-assets/world-v5/'+name+'.webp']='combos-assets/world-v5/'+name+'.webp';
files['/boss-cpu.js']='boss-cpu.js';
files['/guardians.js']='guardians.js';files['/combos-assets/abyss-guardians.webp']='combos-assets/abyss-guardians.webp';
files['/character-art/odd-five-actions-v1.webp']='character-art/odd-five-actions-v1.webp';
files['/character-art/odd-five-actions-v1.png']='character-art/odd-five-actions-v1.png';
files['/character-art/odd-five-key-v1.png']='character-art/odd-five-key-v1.png';
files['/sprites.js']='sprites.js';files['/pixel-select.js']='pixel-select.js';
for(const name of ['controller','observe','providers','agent','panel','badges','standings','feed','maxims'])files['/ai/'+name+'.js']='ai/'+name+'.js';
// Sliced Combos sheets; the allowlist stays explicit so the public directory is never served wholesale.
for(const name of ['heart','hourglass','shield','poison','platform-solid','platform-cracked','platform-collapsing','platform-conveyor','spikes-down','spikes-up','spring-idle','spring-fired'])files['/combos-assets/sprites/items/'+name+'.webp']='combos-assets/sprites/items/'+name+'.webp';
for(const name of ['badge-anthropic','badge-openai','badge-deepseek','badge-glm','badge-custom','flag-us','flag-cn','badge-crown'])files['/combos-assets/sprites/badges/'+name+'.webp']='combos-assets/sprites/badges/'+name+'.webp';
for(const name of ['eyes-hidden','eye-opening','eyes-glowing','head-out','arm-wind','arm-reach','claw-grip','arm-retract'])files['/combos-assets/sprites/beast/'+name+'.webp']='combos-assets/sprites/beast/'+name+'.webp';
for(const name of ['wall-roots','wall-pebbles','wall-vein','wall-root-vein','top-moss','top-rootbeam','top-cracked','top-vine','prop-vines','prop-leaves','prop-tendrils','prop-fruit'])files['/combos-assets/sprites/cave/'+name+'.webp']='combos-assets/sprites/cave/'+name+'.webp';

for(const name of ['scene-dressing','arena-items','campaign','boss-theater','ultimate-vfx','boss-attacks','combat','cpu','encounters','fall-boss','hero-skills','boss-rules','boss-scenes'])files['/'+name+'.js']=name+'.js';
for(const name of ['eat','death','punch'])files['/audio/combos-'+name+'.mp3']='audio/combos-'+name+'.mp3';
files['/combos-assets/boss-actions.webp']='combos-assets/boss-actions.webp';
files['/combos-assets/combat-actions.webp']='combos-assets/combat-actions.webp';

for(const name of ['trial-arena','trial-bosses'])files['/combos-assets/'+name+'.webp']='combos-assets/'+name+'.webp';
for(let i=0;i<9;i++)for(const kind of ['scene','boss']){const path='/combos-assets/chapters/'+kind+'-'+i+'.webp';files[path]=path.slice(1);}
files['/combos-assets/chapters/ultimates.webp']='combos-assets/chapters/ultimates.webp';
for(const name of ['battle-music','roar','ultimate'])files['/audio/chapters-'+name+'.mp3']='audio/chapters-'+name+'.mp3';
for(const name of [...Array.from({length:9},(_,i)=>'scene-'+i),'boss-0','boss-1','views-0','views-1','props','effects'])files['/combos-assets/scenery-v2/'+name+'.webp']='combos-assets/scenery-v2/'+name+'.webp';
const rooms=new Map();
// A code handed out by /room but never joined would otherwise hold its slot forever.
const CLAIM_TTL=5*60*1000;

function contentType(path){
 if(path.endsWith('.svg'))return 'image/svg+xml';
 if(path.endsWith('.webp'))return 'image/webp';
 if(path.endsWith('.woff2'))return 'font/woff2';
 if(path.endsWith('.png'))return 'image/png';
 if(path.endsWith('.mp3'))return 'audio/mpeg';
 if(path.endsWith('.txt'))return 'text/plain; charset=utf-8';
 if(path.endsWith('.js'))return 'text/javascript';
 if(path.endsWith('.css'))return 'text/css';
 return 'text/html; charset=utf-8';
}

function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(body));}

const server=http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/trials.html'){res.writeHead(302,{Location:'/'});res.end();return;}
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'});return res.end();}
 if(path==='/room'&&req.method==='POST'){
  for(let attempt=0;attempt<8;attempt++){
   const code=randomCode();
   if(rooms.has(code))continue;
   const room=new Room(code);room.claimed=true;room.claimedAt=Date.now();
   rooms.set(code,room);
   return json(res,200,{code});
  }
  return json(res,503,{error:'房间码暂时分配不出来，请稍后重试'});
 }
 // Local-only relay for AI battles. Browsers are blocked from most model endpoints by CORS, and
 // sending a key to a published backend would be worse than this: here the key is supplied per
 // request by the page, forwarded once, and never written down. Deliberately absent from the Worker.
 if(path==='/ai/complete'&&req.method==='POST'){
  let raw='';
  req.on('data',chunk=>{raw+=chunk;if(raw.length>200000)req.destroy();});
  req.on('end',async()=>{
   let call;
   try{call=JSON.parse(raw);}catch{return json(res,400,{error:'请求不是合法 JSON'});}
   const {kind,base,path:endpoint,apiKey,body}=call||{};
   if(!apiKey)return json(res,400,{error:'缺少 API key'});
   if(!/^https:\/\//.test(String(base||'')))return json(res,400,{error:'base 必须是 https 地址'});
   if(!/^\/[A-Za-z0-9/_-]{1,64}$/.test(String(endpoint||'')))return json(res,400,{error:'不合法的接口路径'});
   // GET exists for /models discovery; anything else stays a completion POST.
   const method=call.method==='GET'?'GET':'POST';
   const headers={'Content-Type':'application/json'};
   if(kind==='anthropic'){headers['x-api-key']=apiKey;headers['anthropic-version']='2023-06-01';}
   else headers.Authorization='Bearer '+apiKey;
   try{
    const upstream=await fetch(base+endpoint,{method,headers,body:method==='GET'?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
    const text=await upstream.text();
    res.writeHead(upstream.status,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});
    res.end(text);
   }catch(err){json(res,502,{error:'模型请求失败：'+(err?.message||'未知错误')});}
  });
  return;
 }
 if(path==='/connection-info'){
  const lanUrls=Object.entries(networkInterfaces()).filter(([name])=>/^(en|eth|wl)/.test(name)).flatMap(([,addresses])=>addresses).filter(a=>a.family==='IPv4'&&!a.internal).map(a=>'http://'+a.address+':'+server.address().port);
  return json(res,200,{lanUrls});
 }
 if(path==='/health')return json(res,200,{ok:true,rooms:rooms.size});
 if(!files[path]){res.writeHead(404);return res.end('Not found');}
 try{
  const data=await readFile(root+files[path]);
  res.writeHead(200,{'Content-Type':contentType(path),'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
  res.end(data);
 }catch(err){
  // An allowlisted asset that is not on disk yet is missing, not broken; 500 would tell the client
  // to treat a pending generated sheet as a server fault.
  const missing=err&&err.code==='ENOENT';
  res.writeHead(missing?404:500);
  res.end(missing?'Not found':'Unable to load');
 }
});

const wss=new WebSocketServer({server,maxPayload:2048});
wss.on('connection',(ws,req)=>{
 const url=new URL(req.url,'http://localhost');
 const code=String(url.searchParams.get('room')||'').toUpperCase();
 const intent=url.searchParams.get('intent')==='create'?'create':'join';
 if(!/^[0-9A-F]{6}$/.test(code)){ws.send(JSON.stringify({type:'error',message:'房间码格式不正确'}));return ws.close(1000,'Bad room');}
 let room=rooms.get(code);
 if(!room){
  if(intent!=='create'){ws.send(JSON.stringify({type:'error',message:'没有找到这个房间，请检查房间码'}));return ws.close(1000,'Unknown room');}
  room=new Room(code);room.claimed=true;room.claimedAt=Date.now();rooms.set(code,room);
 }
 ws.alive=true;ws.on('pong',()=>ws.alive=true);
 ws.on('message',raw=>room.handle(ws,String(raw)));
 ws.on('close',()=>room.interrupted(ws));
 ws.on('error',()=>{});
 room.attach(ws);
});

const tick=setInterval(()=>{
 const now=Date.now();
 for(const [code,room] of rooms){
  const live=room.advance();
  // A room that emptied out is done; one that was never joined only expires after its claim window.
  if(!live&&(room.everJoined||now-room.claimedAt>CLAIM_TTL))rooms.delete(code);
 }
},1000/60);
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);

const port=Number(process.env.PORT)||3180;
server.listen(port,'0.0.0.0',()=>console.log(`真男人就下 18 层 → http://localhost:${port}`));
function shutdown(){clearInterval(tick);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();server.close();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
