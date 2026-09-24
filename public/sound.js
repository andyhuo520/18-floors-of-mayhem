import {WORLDS} from './world-config.js';
export const TRACKS={lobby:{title:'深渊投币口 · 8-bit Lobby',author:'Combos · Suno',url:'/audio/lobby-8bit.mp3'},boss:{title:'九境妖王 · 决战',author:'Combos · Suno',url:'/audio/chapters-battle-music.mp3'},space:{title:'Space Arp (Faster)',author:'Centurion_of_war',url:'/audio/space.mp3'},searching:{title:'Searching',author:'yd',url:'/audio/searching.mp3'},pressure:{title:'Pressure',author:'yd',url:'/audio/pressure.mp3'}};
const COMBOS_SFX={roar:'/audio/chapters-roar.mp3',ultimate:'/audio/chapters-ultimate.mp3',eat:'/audio/combos-eat.mp3',punch:'/audio/combos-punch.mp3',death:'/audio/combos-death.mp3'};
// Listener-relative mix: the local death stays centered; remote voices fade with distance.
export function deathMix(victim,listener,local=false){
 if(local)return {volume:1,pan:0};
 const dx=victim.x-listener.x,dy=victim.y-listener.y;
 return {volume:.42/(1+Math.hypot(dx,dy)/240),pan:Math.max(-.85,Math.min(.85,dx/450))};
}
export class Soundtrack {
 constructor(){this.enabled=false;this.ctx=null;this.buffers=new Map();this.loading=new Map();this.current=null;this.sources=new Set();this.pending='';this.token=0;this.active=false;this.musicVolume=.25;this.effectsVolume=.55;this.lastEvents=new Map();this.failed=false;this.voiceVolume=.7;this.voiceUntil=0;this.voiceLast=new Map();this.voiceSource=null;}
 enable(value){this.enabled=value;if(value){this.failed=false;this.ctx||=new AudioContext();this.ctx.resume();for(const key of ['roar','ultimate','eat','punch','land','jump','spring','break','death','zone','warning','click'])this.load(key).catch(()=>{});}else{this.stopVoice();this.stopMusic();this.ctx?.suspend();}}
 async load(key){if(this.buffers.has(key))return this.buffers.get(key);if(this.loading.has(key))return this.loading.get(key);const task=(async()=>{const res=await fetch(COMBOS_SFX[key]||TRACKS[key]?.url||`/audio/${key}.mp3`,{signal:AbortSignal.timeout(15000)});if(!res.ok)throw new Error('Audio unavailable');const buffer=await this.ctx.decodeAudioData(await res.arrayBuffer());this.buffers.set(key,buffer);return buffer;})();this.loading.set(key,task);try{return await task;}finally{this.loading.delete(key);}}
 tone(freq,duration=.1,type='triangle',volume=.05,to=freq){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(20,to),c.currentTime+duration);g.gain.setValueAtTime(volume*this.effectsVolume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration);o.onended=()=>{o.disconnect();g.disconnect();};}
 event(kind){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;const now=this.ctx.currentTime;if(now-(this.lastEvents.get(kind)??-10)<.06)return;this.lastEvents.set(kind,now);const buffer=this.buffers.get(kind);if(!buffer){this.load(kind).catch(()=>{});this.tone(kind==='death'?140:380,.08);return;}const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=this.effectsVolume*(kind==='warning'?.5:.75);source.connect(gain);gain.connect(this.ctx.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();}
 death(victim,listener,local=false){
 if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
 if(local)this.stopVoice();
 const {volume,pan}=deathMix(victim,listener,local),buffer=this.buffers.get('death');
 if(!buffer){this.load('death').catch(()=>{});this.tone(180,.3,'sawtooth',.09*volume,60);return;}
 const c=this.ctx,source=c.createBufferSource(),gain=c.createGain(),panner=c.createStereoPanner();
 source.buffer=buffer;source.playbackRate.value=1+((victim.look?.skin||victim.look?.animal||0)%5-2)*.06;
 gain.gain.value=this.effectsVolume*volume;panner.pan.value=pan;
 source.connect(gain);gain.connect(panner);this.voiceBus||=c.createDynamicsCompressor();this.voiceBus.threshold.value=-10;this.voiceBus.ratio.value=8;if(!this.voiceConnected){this.voiceBus.connect(c.destination);this.voiceConnected=true;}panner.connect(this.voiceBus);
 source.onended=()=>{source.disconnect();gain.disconnect();panner.disconnect();};source.start();
 }
 stopVoice(){if(this.voiceSource){try{this.voiceSource.stop();}catch{}this.voiceSource=null;}this.voiceUntil=0;this.duckMusic(false);}
 duckMusic(on){if(this.current&&this.ctx){const gain=this.current.gain.gain;gain.cancelScheduledValues(this.ctx.currentTime);gain.setTargetAtTime(this.musicVolume*(on?.35:1),this.ctx.currentTime,.15);}}
 async chatter(player,kind='idle',local=true,listener=player){
  if(!this.enabled||!this.ctx||this.ctx.state!=='running'||globalThis.document?.hidden||!this.voiceVolume||!player?.alive)return;
  const now=this.ctx.currentTime,id=player.id||'preview';
  if(now<this.voiceUntil||now-(this.voiceLast.get(id)??-100)<(kind==='skill'?7:24))return;
  const mix=deathMix(player,listener,local);if(mix.volume<.1)return;
  const hero=['pineapple','chicken','rocket','ram','whale','leviathan'][player.look?.skin]||'pineapple';
  const variant=kind==='skill'||Math.random()<.45?hero:(Math.random()<.5?'idle-a':'idle-b');
  const language=document.documentElement.lang==='en'?'en':'zh';
  this.voiceLast.set(id,now);this.voiceUntil=now+5;
  try{
   const buffer=await this.load('voice-'+variant+'-'+language);
   if(!player.alive||!this.enabled||globalThis.document?.hidden||!this.voiceVolume||this.ctx.state!=='running'||this.ctx.currentTime-now>3){this.voiceUntil=0;return;}
   const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),pan=this.ctx.createStereoPanner();source.buffer=buffer;
   source.playbackRate.value=[1.08,1.12,.94,.9,1.02,.98][player.look?.skin]||1;
   gain.gain.value=this.voiceVolume*mix.volume;pan.pan.value=mix.pan;source.connect(gain);gain.connect(pan);pan.connect(this.ctx.destination);
   this.voiceSource=source;this.voiceUntil=this.ctx.currentTime+buffer.duration/source.playbackRate.value+2;this.duckMusic(true);
   source.onended=()=>{source.disconnect();gain.disconnect();pan.disconnect();if(this.voiceSource===source){this.voiceSource=null;this.duckMusic(false);}};source.start();
  }catch{this.voiceUntil=0;}
 }
 async playMusic(key){if(this.pending===key||this.current?.key===key)return;const token=++this.token;this.pending=key;this.failed=false;this.report();try{const buffer=await this.load(key);if(token!==this.token||!this.enabled||!this.active)return;const c=this.ctx,source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.loop=true;source.playbackRate.value=key==='boss'?1.12:1;source.connect(gain);gain.connect(c.destination);gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(this.musicVolume,c.currentTime+1.8);const previous=this.current;if(previous){previous.gain.gain.cancelScheduledValues(c.currentTime);previous.gain.gain.setValueAtTime(previous.gain.gain.value,c.currentTime);previous.gain.gain.linearRampToValueAtTime(0,c.currentTime+1.8);previous.source.stop(c.currentTime+1.9);}const item={key,source,gain};this.current=item;this.sources.add(item);source.onended=()=>{this.sources.delete(item);source.disconnect();gain.disconnect();};source.start();}catch{if(token===this.token)this.failed=true;}finally{if(token===this.token){this.pending='';this.report();}}}
 stopMusic(){if(!this.current&&!this.pending&&!this.sources.size)return;++this.token;this.pending='';for(const item of this.sources){try{item.source.stop();}catch{}}this.sources.clear();this.current=null;this.report();}
 setVolume(kind,value){const v=Math.min(1,Math.max(0,Number(value)||0));if(kind==='music'){this.musicVolume=v;if(this.current){const g=this.current.gain.gain;g.cancelScheduledValues(this.ctx.currentTime);g.setTargetAtTime(v,this.ctx.currentTime,.1);}}else if(kind==='voice'){this.voiceVolume=v;if(!v)this.stopVoice();}else this.effectsVolume=v;}
 update(active,zone,danger=false,boss=false){this.active=active;if(!active||!this.enabled||globalThis.document?.hidden){this.stopMusic();return;}const key=boss?'boss':zone===-1?'lobby':WORLDS[Math.min(zone,WORLDS.length-1)].music;if(!this.failed)this.playMusic(key);}
 preview(key){this.active=true;if(!this.enabled)this.enable(true);this.playMusic(key);}
 report(){const el=document.querySelector('#now-playing');if(!el)return;el.textContent=this.failed?'音乐加载失败，可关闭后重新开启':this.pending?'正在加载音乐…':this.current?`${TRACKS[this.current.key].title} · ${TRACKS[this.current.key].author}`:'随下降场景切换音乐';el.dataset.track=this.current?.key||'';el.dataset.status=this.failed?'error':this.pending?'loading':this.current?'playing':'idle';}
}
