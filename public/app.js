import {showResultPoster} from './result-poster.js';
import './i18n.js';
import {ARENA_WEAPONS,CHAPTER_RELICS,drawRelic} from './arena-items.js';
import {CHAPTERS,campaignProgress,drawCampaignHazards} from './campaign.js';
import {drawBossTheater,previewBossIndex,chapterMarkup,theaterBeat} from './boss-theater.js';
import {drawUltimate,drawGeneratedSkill} from './ultimate-vfx.js';
import {readSave,writeSave} from './save-game.js';
import {heroSkill} from './hero-skills.js';
let celebrationActors=[],celebrationFrame=0;const heardPunchVoices=new Map();const heardSkills=new Map();let heardBossAudio=0;
import {drawFallBoss,loadFallBossArt,FALL_KINGS} from './fall-boss.js';
loadFallBossArt();
import {drawEncounter,createEncounter,CHAPTER_GIANTS} from './encounters.js';
import {BATTLEFIELDS} from './world-config.js';
import {cpuInput} from './cpu.js';
import {drawCombat} from './combat.js';
import {loadSprites} from './sprites.js';
import {enhanceSelects} from './pixel-select.js';
import {createAIPanel} from './ai/panel.js';
import {drawVendor,VENDOR_BADGE} from './ai/badges.js';
import {previewGuardian,GUARDIANS,guardianKind,drawGuardian,chapterGuardian} from './guardians.js';
import {randomName,cleanName,uniqueName} from './names.js';
import {pixelBackground,pixelPlatform,pixelItem,pixelBeast,pixelShield,WORLDS,worldIndex} from './pixel-world.js';
import {SKINS,loadCharacterSkins,TRAITS,DEFAULT_LOOK,PALETTE,sanitizeLook,randomLook,lookName,drawCharacter} from './appearance.js';
import {Soundtrack,TRACKS} from './sound.js';
import {makeGame,step,endCpuSpectating,W,H,COLORS,sanitizeRules} from './engine.js';
const $=s=>document.querySelector(s);const canvas=$('#arena'),ctx=canvas.getContext('2d');
$('.arena-bottom').before($('#touch-controls'));
let spectateId=null;
let ws,myId='',room=null,game=null,mode='preview',countUntil=0,sound=true,audio=null,finishedShown=false;
const soundtrack=new Soundtrack();
let podiumTimer;let nextChatter=performance.now()+22000;
let previewManualUntil=0,previewAutoAt=performance.now()+11000,previewDirection=1;
let matchRules={mode:'endless',duration:60};
function syncRules(prefix,rules,disabled=false){$('#'+prefix+'-mode').value=rules.mode;$('#'+prefix+'-duration').value=rules.duration;$('#'+prefix+'-mode').disabled=disabled;$('#'+prefix+'-duration').disabled=disabled;$('#'+prefix+'-duration').hidden=rules.mode!=='timed';document.querySelector('label[for="'+prefix+'-duration"]').hidden=rules.mode!=='timed';if(prefix==='match')$('#solo').disabled=rules.mode==='coop'||rules.mode==='brawl';$('#'+prefix+'-rules').textContent=rules.mode==='brawl'?'2–12 人 · J 拳击积累失衡 · K 投炸弹（8 秒冷却）· Q 用道具，F 扔道具 · 一血开局，最后存活者获胜':rules.mode==='coop'?'仅 2 人 · 共同深度取两人较小值 · 每人随身 1 颗红心 · 濒死 6 秒内靠近按住 E 救援，Q 吃心，F 传球（接住回血）':rules.mode==='timed'?'按最终距离排名 · 沙漏每个 +5 秒，最多加 30 秒 · 可提前淘汰':'最后存活者获胜 · 单人挑战最远距离 · 无限加速';}
for(const prefix of ['match','room'])for(const field of ['mode','duration'])$('#'+prefix+'-'+field).onchange=()=>{const rules=sanitizeRules({mode:$('#'+prefix+'-mode').value,duration:Number($('#'+prefix+'-duration').value)});if(prefix==='room')send({type:'settings',rules});else{matchRules=rules;syncRules('match',rules);}};
syncRules('match',matchRules);

let look={...DEFAULT_LOOK},draft={...DEFAULT_LOOK},locked={},variants=[],previewZone=0,previewDeathUntil=0;
try{const savedLook=localStorage.getItem('man18-look');look=savedLook?sanitizeLook(JSON.parse(savedLook)):{...DEFAULT_LOOK,skin:2};sound=localStorage.getItem('man18-sound')!=='off';}catch{look={...DEFAULT_LOOK,skin:2};}
const input={left:false,right:false,jump:false,drop:false,rescue:false,eat:false,pass:false,punch:false,bomb:false,fire:false,heavy:false,reward:false};let toastTimer,uiClock=0,last=performance.now(),acc=0;const smooth=new Map();
try{$('#nickname').value=cleanName(localStorage.getItem('man18-name'))||randomName();}catch{$('#nickname').value=randomName();}
$('#random-name').onclick=()=>{$('#nickname').value=uniqueName('',new Set([$('#nickname').value]));$('#nickname').dispatchEvent(new Event('change'));};
$('#nickname').addEventListener('change',()=>{const cleaned=cleanName($('#nickname').value)||randomName();$('#nickname').value=cleaned;try{localStorage.setItem('man18-name',cleaned);}catch{}});
const quickEntry=$('#entry-quick');quickEntry.insertBefore(quickEntry.querySelector('.entry-description'),quickEntry.querySelector('.entry-footnote'));
const params=new URLSearchParams(location.search);if(params.has('room'))$('#room-code').value=params.get('room').slice(0,6).toUpperCase();
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function name(){const n=cleanName($('#nickname').value)||randomName();$('#nickname').value=n;try{localStorage.setItem('man18-name',n);}catch{}return n;}
function tone(freq=440,duration=.1){soundtrack.tone(freq,duration);}
function unlockAudio(){if(sound)try{soundtrack.enable(true);if(!game)soundtrack.update(true,-1);const lang=document.documentElement.lang==='en'?'en':'zh';const hero=['pineapple','chicken','rocket','ram','whale','leviathan'][look.skin]||'pineapple';for(const key of [hero,'idle-a','idle-b'])soundtrack.load('voice-'+key+'-'+lang).catch(()=>{});}catch{}}
window.addEventListener('pointerdown',unlockAudio,{once:true});
window.addEventListener('keydown',unlockAudio,{once:true});
function send(m){if(ws?.readyState!==1){toast('尚未连接服务器，请稍等或刷新页面');return false;}ws.send(JSON.stringify(m));return true;}
// The backend is a Combos Worker in production and this same origin during local development.
const RUNTIME=String(window.MAN18_RUNTIME_URL||'').replace(/\/+$/,'');
const httpBase=()=>RUNTIME||location.origin;
const wsBase=()=>RUNTIME?RUNTIME.replace(/^http/,'ws'):`${location.protocol==='https:'?'wss':'ws'}://${location.host}`;
let reconnectToken='',reconnectTimer,networkPaused=false,pending=null;
// A socket is opened per room, so the lobby reports backend health over plain HTTP instead.
function probeBackend(){fetch(httpBase()+'/health').then(r=>r.ok?r.json():Promise.reject(new Error('unhealthy'))).then(()=>{$('#connection').textContent='联机服务就绪';}).catch(()=>{$('#connection').textContent='联机服务离线';});}
function connect(){if(!pending)return;ws=new WebSocket(`${wsBase()}/ws?room=${encodeURIComponent(pending.code)}&intent=${pending.intent}`);ws.onopen=()=>{$('#connection').textContent='联机服务就绪';};ws.onclose=()=>{$('#connection').textContent='网络中断 · 正在重连';networkPaused=!!room;clearTimeout(reconnectTimer);if(pending)reconnectTimer=setTimeout(connect,800);};ws.onerror=()=>{};ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='hello'){if(mode!=='solo')myId=m.id;if(reconnectToken&&room)ws.send(JSON.stringify({type:'resume',token:reconnectToken}));else{ws.send(JSON.stringify({type:'enableReconnect'}));ws.send(JSON.stringify(pending.payload));}}
 if(m.type==='session')reconnectToken=m.token;
 if(m.type==='resumed'){myId=m.id;networkPaused=false;if(m.game){game=m.game;mode='online';finishedShown=false;countUntil=performance.now()+m.seconds*1000;show('game');if(game.phase==='finished')results();}release();}
 if(m.type==='resumeFailed'){networkPaused=false;room=null;reset();reconnectToken='';ws.send(JSON.stringify({type:'enableReconnect'}));if(pending){pending.intent='join';pending.payload={...pending.payload,type:'join',code:pending.code};ws.send(JSON.stringify(pending.payload));}toast('重连窗口已结束，正在重新加入房间');}
 if(m.type==='network'){networkPaused=m.paused;toast(m.message);}
 if(m.type==='latency')$('#connection').textContent='联机 '+Math.max(0,Date.now()-m.at)+' ms';
if(m.type==='error')toast(m.message);
 if(m.type==='lobby'){room=m;if(pending){pending.intent='join';pending.payload={...pending.payload,type:'join',code:pending.code};}const assigned=m.players.find(p=>p.id===myId);if(assigned){$('#nickname').value=assigned.name;if(pending)pending.payload.name=assigned.name;try{localStorage.setItem('man18-name',assigned.name);}catch{}}if(mode!=='online'||!game){show('room');renderRoom();}else if(game.phase==='finished'){$('#again').disabled=room.host!==myId;$('#again').textContent=room.host===myId?'再来一局 ↻':'等待房主开始下一局';}}
 if(m.type==='countdown'){game=m.game;mode='online';countUntil=performance.now()+m.seconds*1000;finishedShown=false;clearEffects();smooth.clear();show('game');tone(350,.15);}
 if(m.type==='state'){game=m.game;mode='online';countUntil=0;if(game.phase==='finished')results();}
 if(m.type==='left'){networkPaused=false;room=null;pending=null;clearTimeout(reconnectTimer);try{ws.close(1000,'Left');}catch{}reset();}
 };}
setInterval(()=>{if(ws?.readyState===1)ws.send(JSON.stringify({type:'latency',at:Date.now()}));},3000);
function show(panel){$('#save-exit').hidden=panel!=='game'||mode!=='solo';if(panel==='lobby')refreshSave();$('#spectator-actions').hidden=true;$('#immersive').disabled=!['game','result'].includes(panel);document.body.classList.toggle('coop-view',['coop','brawl'].includes(game?.rules.mode));if(!['game','result'].includes(panel))setImmersive(false);clearTimeout(podiumTimer);$('#podium').hidden=true;if(panel==='result')podiumTimer=setTimeout(()=>{if(game?.phase==='finished'&&!game.earlyExit)$('#podium').hidden=false;},1700);for(const p of ['lobby','room','game','result'])$(`#${p}-panel`).hidden=p!==panel;$('#scene-caption').hidden=panel==='game'||panel==='result';document.body.classList.toggle('playing',panel==='game');$('#touch-controls').hidden=panel!=='game';$('#coop-controls').hidden=panel!=='game'||!['coop','brawl'].includes(game?.rules.mode);
 $('#act-punch').hidden=$('#act-bomb').hidden=game?.rules.mode!=='brawl';
 if(game?.rules.mode==='brawl'){$('#act-rescue').hidden=true;syncBagLabels();}
 else {$('#act-rescue').hidden=false;$('#act-eat').textContent='Q · 自己吃心';$('#act-pass').textContent='F · 传给搭子';}$('#act-reward').hidden=panel!=='game'||!game?.players.find(p=>p.id===myId)?.bossRewards?.length;$('#endless-hud').hidden=panel!=='game';$('#spectating').hidden=true;$('#theme-preview').hidden=panel==='game'||panel==='result';if(panel==='game'){setImmersive(true);$('#chapter-book').close();$('#audio-mixer').close();$('#avatar-editor').close();document.activeElement?.blur();$('.arena-wrap').scrollIntoView({block:'start',behavior:'instant'});}}
// In a brawl the two action buttons narrate the bag, because "无法吃道具" almost always means
// "the opening poison is still in it": capacity is 1, poison cannot be eaten, F is the only way out.
const BAG_NAME={freeze:'冰冻果',poison:'毒果',heart:'红心',shield:'护盾'};
function syncBagLabels(){
 const me=game?.players.find(p=>p.id===myId);
 const carry=me?.carry;
 $('#act-eat').disabled=!me?.alive||!!me?.downed||!carry;
 $('#act-pass').disabled=!me?.alive||!!me?.downed||!carry;
 $('#act-eat').textContent=carry==='heart'?(me.hp>=me.maxHp?'Q · 已满血，红心保留':'Q · 吃红心 +1'):carry==='shield'?(me.shield?'Q · 已有护盾，备用保留':'Q · 穿上护盾'):carry==='freeze'?'Q · 冰果只可投掷':carry==='poison'?'Q · 毒果吃不得':'Q · 背包是空的';
 $('#act-pass').textContent=carry?`F · 扔出${BAG_NAME[carry]}`:'F · 没东西可扔';
}

function member(p,extra,dead=false){const row=document.createElement('div');row.className='member'+(dead?' dead':'');const av=document.createElement('canvas');av.className='avatar';av.width=60;av.height=70;av.setAttribute('aria-label',p.name+'的形象');drawCharacter(av.getContext('2d'),p.look,30,65,.8);const nm=document.createElement('span');nm.className='member-name';nm.textContent=p.name+(p.id===myId?' · 你':'');const status=document.createElement('small');status.textContent=extra;row.append(av,nm,status);return row;}
function renderRoom(){updateFriendTips();updateInvite();syncRules('room',room.rules,room.host!==myId);$('#room-number').textContent=room.code;const self=room.players.find(p=>p.id===myId);if(self&&document.activeElement!==$('#room-nickname'))$('#room-nickname').value=self.name;const seated=room.players.filter(p=>!p.spectator);$('#room-members').replaceChildren(...room.players.map(p=>member(p,(p.id===room.host?'房主':'')+(p.spectator?(p.id===room.host?' · 观众':'观众'):p.id===room.host?'':'已就位'))));$('#start').disabled=room.host!==myId||seated.length<2||(room.rules.mode==='coop'&&seated.length!==2);$('#room-hint').textContent=room.host!==myId?'等待房主开始比赛':room.players.length<2?(room.rules.mode==='coop'?'复制邀请链接，等你的搭子加入（仅 2 人）':'复制邀请链接，等朋友加入（2–12 人）'):`${room.players.length} 人已就位，出发吧`;$('#arena-label').textContent='朋友房间 · 等待集合';}
function reset(){soundtrack.active=false;soundtrack.stopMusic();clearEffects();$('.arena-wrap').className='arena-wrap zone-'+previewZone;game=null;mode='preview';finishedShown=false;countUntil=0;smooth.clear();Object.keys(input).forEach(k=>input[k]=false);show('lobby');$('#countdown').hidden=true;$('#arena-label').textContent='试炼场预览';$('#arena-time').textContent='WAITING FOR CHALLENGERS';$('#floor-label').textContent='没有终点，只有更深处';$('#alive-label').textContent='GOOD LUCK, HAVE FUN ↘';}
let previewBossReaction=-100,bookChapter=0,previewSceneStarted=performance.now()/1000,bookStarted=0;
let replayCpu=false;
function cpuMatch(){spectateId=null;release();myId=myId||'local';const roster=[{id:myId,name:name(),look}];for(const i of [1,2,3,4,5].filter(i=>i!==look.skin).slice(0,4))roster.push({id:'cpu-'+i,name:SKINS[i].name+'·电脑',look:{...DEFAULT_LOOK,skin:i},cpu:true});game=makeGame(roster,Math.floor(Math.random()*1e9),{mode:'brawl',difficulty:$('#cpu-difficulty').value});replayCpu=true;mode='solo';countUntil=performance.now()+2000;finishedShown=false;clearEffects();smooth.clear();show('game');tone();}
$('#cpu-play').onclick=cpuMatch;

function refreshSave(){
 try{const saved=readSave(localStorage);$('#continue-save').disabled=!saved;
 const p=saved?.game.players.find(p=>p.id===saved.playerId);
 $('#save-summary').textContent=saved?`${p.name} · ${saved.game.players.some(p=>p.cpu)?'人机对战':'单人练习'} · 第 ${p.depth||0} 层 / ${Math.floor(p.meters||0)} 米${saved.game.bossArena?' · Boss 战':''} · ${new Date(saved.savedAt).toLocaleString()}`:'暂无存档 · 单人或人机局中可存档';
 }catch{$('#continue-save').disabled=true;$('#save-summary').textContent='旧存档不可用，开始新局后可重新保存';}
}
$('#save-exit').onclick=()=>{
 if(mode!=='solo'||!game||game.phase!=='playing')return;
 if(!game.players.find(p=>p.id===myId)?.alive)return toast('角色已阵亡，无法覆盖存档');
 try{writeSave(localStorage,game,myId);}catch{return toast('保存失败，请检查浏览器存储空间');}
 release();reset();toast('进度已保存，可从大厅继续');
};
$('#continue-save').onclick=()=>{
 let saved;try{saved=readSave(localStorage);}catch{refreshSave();return toast('存档无法读取');}
 if(!saved)return refreshSave();
 if(room)return toast('请先退出朋友房间再继续本机存档');
 release();game=saved.game;myId=saved.playerId;mode='solo';replayCpu=game.players.some(p=>p.cpu);
 matchRules={...game.rules};if(replayCpu)$('#cpu-difficulty').value=game.difficulty||'easy';
 spectateId=null;finishedShown=false;acc=0;last=performance.now();countUntil=last+3000;
 clearEffects();smooth.clear();heardSkills.clear();heardBossAudio=game.bossAudioId||0;
 for(const p of game.players)if(p.skillAt!==undefined)heardSkills.set(p.id,p.skillAt);
 show('game');tone();toast('继续存档 · 3 秒后恢复');
};
refreshSave();

function solo(){replayCpu=false;if(matchRules.mode==='coop')return toast('双人协作需要朋友加入，请创建房间');if(matchRules.mode==='brawl')return toast('道具互殴需要对手，请创建房间');release();myId=myId||'local';game=makeGame([{id:myId,name:name(),color:PALETTE[look.color],look}],Math.floor(Math.random()*1e9),matchRules);mode='solo';countUntil=performance.now()+2000;finishedShown=false;clearEffects();smooth.clear();show('game');tone();}
$('#solo').onclick=solo;
// The room code has to exist before the socket opens: each room is its own backend instance.
$('#create').onclick=async()=>{$('#create').disabled=true;try{const res=await fetch(httpBase()+'/room',{method:'POST'});const body=await res.json();if(!res.ok||!body.code)throw new Error(body.error||'服务器没有返回房间码');pending={code:body.code,intent:'create',payload:{type:'create',name:name(),look,rules:matchRules}};connect();}catch(err){toast('创建房间失败：'+err.message);}finally{$('#create').disabled=false;}};
$('#join').onclick=()=>{const code=$('#room-code').value.trim().toUpperCase();if(!/^[0-9A-F]{6}$/.test(code))return toast('请输入完整的 6 位房间码');pending={code,intent:'join',payload:{type:'join',code,name:name(),look}};connect();};$('#room-code').addEventListener('keydown',e=>{if(e.key==='Enter')$('#join').click();});$('#start').onclick=()=>send({type:'start'});$('#leave').onclick=()=>send({type:'leave'});
$('#room-rename').onclick=()=>{const next=cleanName($('#room-nickname').value);if(!next)return toast('先输入名字，再确认改名');$('#room-nickname').value=next;$('#nickname').value=next;try{localStorage.setItem('man18-name',next);}catch{}send({type:'rename',name:next});$('#room-nickname').blur();};
$('#room-nickname').addEventListener('keydown',e=>{if(e.key==='Enter'){$('#room-rename').click();e.preventDefault();}});
let inviteOrigin=location.origin+location.pathname;
const isLoopback=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
if(isLoopback)fetch('/connection-info').then(r=>r.json()).then(info=>{if(info.lanUrls?.length)inviteOrigin=info.lanUrls[0];if(room)updateInvite();}).catch(()=>{});
function updateInvite(){const url=new URL(inviteOrigin);url.searchParams.set('room',room.code);$('#invite-url').value=url.href;$('#invite-note').textContent=isLoopback?(inviteOrigin===location.origin?'尚未找到局域网地址。localhost 链接只能在本机打开。':'本地联机：朋友需与这台电脑连接同一 Wi-Fi / 局域网。异地邀请需部署公网服务。'):'朋友打开链接后，输入昵称并点击加入。';}
$('#copy').onclick=async()=>{updateInvite();try{await navigator.clipboard.writeText($('#invite-url').value);toast(isLoopback?(inviteOrigin===location.origin?'本机链接已复制；其他设备暂不能使用':'局域网邀请链接已复制，请确认朋友在同一网络'):'邀请链接已复制；朋友打开后点击加入');}catch{$('#invite-url').focus();$('#invite-url').select();toast('请手动复制选中的邀请链接');}};

$('#quit').onclick=()=>{if(mode==='online')send({type:'leave'});else reset();};$('#back').onclick=()=>{if(room){reset();show('room');renderRoom();}else reset();};$('#again').onclick=()=>{if(room)send({type:'start'});else if(replayCpu)cpuMatch();else solo();};
$('#stage-again').onclick=()=>{if(game?.phase==='finished')$('#again').click();};
$('#stage-back').onclick=()=>$('#back').click();
function setImmersive(on){document.body.classList.toggle('immersive',on);$('#immersive').setAttribute('aria-pressed',String(on));$('#immersive').textContent=on?'退出沉浸 [Esc]':'沉浸游玩';if(on)release();}
$('#immersive').onclick=()=>{setImmersive(!document.body.classList.contains('immersive'));document.activeElement?.blur();};
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&document.body.classList.contains('immersive'))setImmersive(false);});
function updateSoundButton(){$('#sound').innerHTML='♫ <span>声音'+(sound?'开':'关')+'</span>';$('#sound').setAttribute('aria-label',sound?'关闭全部声音':'开启全部声音');} updateSoundButton();
$('#sound').onclick=()=>{sound=!sound;try{soundtrack.enable(sound);localStorage.setItem('man18-sound',sound?'on':'off');}catch{}updateSoundButton();tone(520,.12);};
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump',ArrowDown:'drop',KeyS:'drop',KeyE:'rescue',KeyQ:'eat',KeyF:'pass',KeyJ:'punch',KeyK:'bomb',KeyL:'fire',KeyI:'heavy',KeyR:'reward'};
const keyTimers={};
function key(e,value){if($('#avatar-editor').open||$('#audio-mixer').open||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
 // Clicking any button (沉浸游玩, a touch control, 开始) leaves focus on it, and swallowing keys for
 // focused buttons then kills Q/F/E for the rest of the match — "按了没反应" with no error anywhere.
 if(e.target instanceof HTMLButtonElement){if(game?.phase!=='playing')return;e.target.blur();}const k=keyMap[e.code];if(k&&game?.phase==='playing'){e.preventDefault();if(value){clearTimeout(keyTimers[k]);input[k]=true;}else if(k==='jump'||k==='drop'||k==='eat'||k==='pass'||k==='punch'||k==='bomb'||k==='reward'){keyTimers[k]=setTimeout(()=>input[k]=false,100);}else input[k]=false;}}
window.addEventListener('keydown',e=>key(e,true));window.addEventListener('keyup',e=>key(e,false));
function release(){for(const owners of touchOwners.values())owners.clear();document.querySelectorAll('.touch-held').forEach(b=>b.classList.remove('touch-held'));Object.values(keyTimers).forEach(clearTimeout);Object.keys(input).forEach(k=>input[k]=false);if(mode==='online'&&ws.readyState===1)ws.send(JSON.stringify({type:'input',...input}));}window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden){release();soundtrack.stopVoice();soundtrack.stopMusic();}});
const touchOwners=new Map();
for(const b of document.querySelectorAll('[data-key]')){
 const stop=e=>{const k=b.dataset.key,owners=touchOwners.get(k);owners?.delete(e.pointerId);if(owners?.size)return;b.classList.remove('touch-held');clearTimeout(keyTimers[k]);input[k]=false;};
 b.addEventListener('pointerdown',e=>{if(b.disabled)return;e.preventDefault();const k=b.dataset.key;let owners=touchOwners.get(k);if(!owners){owners=new Set();touchOwners.set(k,owners);}owners.add(e.pointerId);b.setPointerCapture(e.pointerId);clearTimeout(keyTimers[k]);input[k]=true;b.classList.add('touch-held');});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,stop);
}

let lastInputPacket='',lastInputAt=0;setInterval(()=>{if(mode==='online'&&game?.phase==='playing'&&ws?.readyState===1){const packet=JSON.stringify({type:'input',...input}),now=performance.now();if(packet!==lastInputPacket||now-lastInputAt>250){ws.send(packet);lastInputPacket=packet;lastInputAt=now;}}},33);
function updateUI(){if(!game)return;rememberCodex();updateQuickHelp();const cp=campaignProgress(game);const rewardPlayer=game.players.find(p=>p.id===myId);const reward=rewardPlayer?.bossRewards?.[0];$('#act-reward').hidden=!reward;$('#act-reward').textContent=reward?'R · '+CHAPTER_RELICS[reward.relic].name+'（共 '+rewardPlayer.bossRewards.length+' 件）':'R · 战利品';$('#act-reward').disabled=!rewardPlayer?.alive||game.phase!=='playing';$('#campaign-status').textContent=cp.complete?'八十一难全通 · 九大妖王已败':`第 ${cp.number} / 81 难 · ${CHAPTERS[cp.chapter].name} · ${cp.name} · ${cp.tip}`;$('#combo-input').hidden=!game.bossArena||!$('#combo-guide').checked;const player=game.players.find(p=>p.id===myId);$('#combo-input').textContent=(player?.combo?.step===1?'↓ 已输入 → / ←':player?.combo?.step===2?'↓ → 已输入，按 J 出招':'↓ → J / ↓ ← J · 1.2 秒内完成')+' · 灵气 '+Math.floor(player?.skillEnergy||0)+'/100'+(player?.bossAmmo>0?' · '+ARENA_WEAPONS[player.bossWeapon].name+' '+player.bossAmmo+' 发':'');syncReplay();$('.depth-readout span').textContent='POINTS · 下降积分';const me=game.players.find(p=>p.id===myId)||game.players[0],alive=game.players.filter(p=>p.alive).length;$('#depth').textContent=String(me.score||0).padStart(4,'0');$('#score-value').textContent=String(me.score||0).padStart(5,'0');$('#depth-value').textContent=(me.meters||0)+' m';$('#health-value').textContent='♥'.repeat(me.hp??1)+'♡'.repeat(Math.max(0,3-(me.hp??1)))+(me.shield?' ◆':'');$('#health-value').setAttribute('aria-label',`生命值 ${me.hp??1} / 3${me.shield?'，有护盾':''}`);$('#carry-value').hidden=game.rules.mode!=='brawl';
 if(game.rules.mode==='brawl'){const bag={freeze:'❄ 冰冻果',poison:'✹ 毒果',heart:'♥ 红心',shield:'◆ 护盾'};$('#carry-value').textContent=me.carry?bag[me.carry]:'空手';$('#carry-value').classList.toggle('urgent',!me.carry);}
 $('#timer-value').hidden=game.rules.mode!=='timed';$('#timer-value').textContent=Math.ceil(me.timeLeft??0)+' s';$('#timer-value').classList.toggle('urgent',me.timeLeft<=10);$('#speed-value').textContent=((game.speed||80)/80).toFixed(2)+'×';$('#act-punch').hidden=$('#act-bomb').hidden=!game.fallBoss&&game.rules.mode!=='brawl';if(game.fallBoss){$('#act-punch').textContent='J · 拳击 / 远射';$('#act-bomb').textContent='K · 踢击 / 投弹';$('#act-punch').disabled=$('#act-bomb').disabled=!me.alive;}else $('#act-punch').textContent='J · 拳击';$('#survivors').textContent=alive+' 人存活';$('#mode-name').textContent=(game.rules.mode==='timed'?'限时赛':'无尽赛')+(mode==='solo'?' · 单人':' · '+room?.code);refreshRoster();$('#arena-label').textContent=game.players.some(p=>p.cpu)?'人机乱斗 · 你和 4 个电脑':mode==='solo'?'单人练习':'多人淘汰赛';$('#arena-time').textContent=`${String(Math.floor(game.t/60)).padStart(2,'0')}:${String(Math.floor(game.t%60)).padStart(2,'0')} / ${alive} ALIVE`;$('#floor-label').textContent=`下降 ${me.meters||0} m · ${ZONES[zoneFor(game.camera)].name}`;$('#alive-label').textContent='速度 '+((game.speed||80)/80).toFixed(2)+'× · '+(game.rules.mode==='timed'?'限时距离赛':'永无止境');$('#spectating').hidden=(me.alive&&game.players.some(p=>p.id===myId))||game.phase!=='playing';$('#spectating').textContent=!game.players.some(p=>p.id===myId)?'观众席 · 正在观战':me.timedOut?'时间到 · 成绩已保留 · 正在观战':'已淘汰 · 正在观战';let tip=game.t<2?'出发台 1.8 秒后坍塌，按 S 先走一步！':ZONES[zoneFor(game.camera)].tip;
 if(game.rules.mode==='brawl'){$('#mode-name').textContent='乱斗 · '+game.players.length+' 位选手';$('#coop-status').textContent='J 拳击 · K 炸弹（会炸自己） · Q 用道具 · F 扔道具';syncBagLabels();$('#act-bomb').textContent=game.t<(me.bombReady||0)?'K · '+Math.ceil(me.bombReady-game.t)+'s':'K · 炸弹';$('#act-bomb').disabled=!me.alive||game.t<(me.bombReady||0);$('#act-punch').disabled=!me.alive;
  if(me.carry){const near=game.items.find(i=>!i.collected&&Math.abs(i.x-me.x)<70&&Math.abs(i.y-me.y)<90);
   if(near)tip=`背包里还压着${BAG_NAME[me.carry]}：先按 F 扔出去，才能捡新东西`;}}
 const battle=game.platforms.find(f=>f.id===me.ground&&f.stage!==undefined);$('#live-tip').textContent=battle?BATTLEFIELDS[battle.stage].tip:tip;
 if(game.rules.mode==='coop'){
  $('#depth').textContent=String(game.teamMeters*10).padStart(4,'0');$('#score-value').textContent=String(game.teamMeters*10).padStart(5,'0');$('#depth-value').textContent='共同 '+game.teamMeters+' m';$('#mode-name').textContent='双人协作';$('.depth-readout span').textContent='TEAM POINTS · 共同积分';$('#arena-label').textContent='搭子别松手 · 双人协作';$('#alive-label').textContent='共同 '+game.teamDepth+' 层';$('#floor-label').textContent=`共同下降 ${game.teamMeters} m · ${ZONES[zoneFor(game.camera)].name}`;
  const hanging=game.players.find(p=>p.downed&&p.alive);
  $('#timer-value').hidden=!hanging;$('#timer-value').textContent=hanging?'救援 '+Math.max(0,hanging.downedUntil-game.t).toFixed(1)+' s':'';$('#timer-value').classList.toggle('urgent',!!hanging);
  $('#coop-status').textContent=hanging?(hanging.id===myId?'抓紧！等搭子靠近拉你上来':'靠近挂住的搭子，在平台上按住 E 0.6 秒')+' · '+Math.min(100,Math.floor((hanging.reviveProgress||0)/.6*100))+'%':'随身红心 '+(me.heart?'♥ 1':'— 0')+' · 传球会朝搭子方向飞，接住才回血';
  $('#live-tip').textContent='每人开局 1 颗备用红心。Q 自己吃，F 朝搭子传球；满血接不住。E 按住救援。第 10 层起，每 10 层有跷跷板：跳到另一端，把搭子弹起。';
  document.querySelector('[data-key="eat"]').disabled=!me.heart||me.hp>=me.maxHp||me.downed;
  document.querySelector('[data-key="pass"]').disabled=!me.heart||me.downed;
 }
 if(game.fallBoss){$('#act-bomb').textContent=game.t<(me.bossBombReady||0)?'K · '+Math.ceil(me.bossBombReady-game.t)+'s':'K · 踢击 / 投弹';$('#act-bomb').disabled=!me.alive||game.t<(me.bossBombReady||0);$('#live-tip').textContent=FALL_KINGS[game.fallBoss.index]+' · J轻击 / I重击 / K踢 / 空格+K飞腿 / L射击 · J J K破甲连段 · '+heroSkill(me).name+' '+Math.floor(me.skillEnergy||0)+'% · 1.2秒内 ↓ → J / ↓ ← J 搓招'+(game.t<(me.comboMessageUntil||0)?' · '+me.comboMessage:'');}
 $('#act-fire').hidden=$('#act-heavy').hidden=!game.bossArena;
 if(game.bossArena&&me.alive){$('#coop-controls').hidden=false;$('#coop-status').textContent='J 轻击 · I 重击 · K 脚踢 · 空格+K 飞腿 · J J K 连段 · L 射击 · 蓝槽破后红槽伤害提高 · ↓ → J 专属绝招';const near=Math.abs(me.x-game.fallBoss.x)<145;$('#act-bomb').textContent=near?'K · 踢击':game.t<(me.bossBombReady||0)?'K · '+Math.ceil(me.bossBombReady-game.t)+'s':'K · 投弹';$('#act-bomb').disabled=near?game.t<(me.kickReady||0):game.t<(me.bossBombReady||0);$('#act-fire').disabled=false;}
 else if(!['coop','brawl'].includes(game.rules.mode))$('#coop-controls').hidden=true;
 // Local bots are marked `cpu`, model-driven guests `ai`. The follow-cam was written back when only
 // a local bot match outlived the player, so an AI battle left the HUD frozen on the host's own
 // numbers — zeros, because the host never plays — while the models kept descending. Anything that
 // keeps running after you are out is worth following.
 const spectator=!game.players.some(p=>p.id===myId);
 const watching=(spectator||(game.players.some(p=>p.cpu||p.ai)&&!me.alive))&&game.phase==='playing';
 $('#spectator-actions').hidden=!watching;
 // Bowing out early ends your own session; in a shared room the match is not yours to stop.
 $('#spectate-end').hidden=mode!=='solo';
 if(watching){const survivors=game.players.filter(p=>p.alive),follow=survivors.find(p=>p.id===spectateId)||survivors[0];if(follow){spectateId=follow.id;$('#spectating').textContent=(spectator?'观众席 · 观战 ':'观战 ')+follow.name+(spectator?'':' · '+(follow.ai?'AI 继续比赛':'电脑继续比赛'));$('#depth-value').textContent='观战 '+follow.meters+' m';$('#health-value').textContent='♥'.repeat(follow.hp||0);$('#score-value').textContent=String(follow.score||0).padStart(5,'0');$('#floor-label').textContent=follow.name+' · '+follow.depth+' 层 · '+(follow.score||0)+' 分';$('#live-tip').textContent=spectator?'你是本局观众。可以切换观战对象，比赛结束后自动结算。':mode==='solo'?'你已淘汰。可以切换观战对象，或结束观战查看自己的名次。':'你已淘汰。可以切换观战对象，比赛结束后自动结算。';}$('#touch-controls').hidden=true;$('#coop-controls').hidden=true;}

}
$('#spectate-next').onclick=()=>{const alive=game?.players.filter(p=>p.alive)||[];if(alive.length)spectateId=alive[(alive.findIndex(p=>p.id===spectateId)+1)%alive.length].id;};
$('#spectate-end').onclick=()=>{if(mode==='solo'&&endCpuSpectating(game,myId)){release();results();}};
function results(){if(finishedShown)return;showResultPoster(game,myId);soundtrack.active=false;soundtrack.stopMusic();finishedShown=true;show('result');const me=game.result.find(p=>p.id===myId),won=mode==='online'&&me?.rank===1;$('#result-title').textContent=!me?'看完了，该你上了。':won?'够胆，够深。':'下次，再深一点。';$('#result-subtitle').textContent=!me?`观众席 · 本局冠军 ${game.result.find(p=>p.rank===1)?.name||'-'}`:mode==='solo'?(won?'下一次，还能更深。':`${me?.reason||'挑战结束'} · 下降 ${me?.meters||0} m · ${me?.score||0} 分`):`你获得第 ${me?.rank||'-'} 名 · ${me?.score||0} 分，本房间本局成绩`;
 if(mode==='solo'&&me){let best=0;try{best=Number(localStorage.getItem(game.rules.mode==='timed'?'man18-best-timed-'+game.rules.duration:'man18-best'))||0;if(me.score>best)localStorage.setItem(game.rules.mode==='timed'?'man18-best-timed-'+game.rules.duration:'man18-best',String(me.score));}catch{}$('#result-title').textContent=me.score>best?'新的深渊纪录！':'还可以，再深一点。';$('#result-subtitle').textContent+=' · 最佳 '+Math.max(best,me.score)+' 分';}
 $('#results').replaceChildren(...game.result.map(p=>{const row=member(p,game.rules.mode==='coop'?p.detail:`${p.meters} m · ${p.depth} 层 · ${p.score} 分`);row.classList.add('honor-row');const title=document.createElement('em');title.className='earned-title';title.textContent=p.title;title.title=p.detail;row.append(title);const rank=document.createElement('b');rank.className='result-rank';rank.textContent=game.rules.mode==='coop'?'双人':({1:'01',2:'02',3:'03'})[p.rank]||String(p.rank).padStart(2,'0');rank.setAttribute('aria-label',game.rules.mode==='coop'?'协作搭档':'第 '+p.rank+' 名');row.prepend(rank);return row;}));$('#again').disabled=!!room&&room.host!==myId;$('#again').textContent=room&&room.host!==myId?'等待房主开始下一局':'再来一局 ↻';$('#back').textContent=room?'← 返回房间':'← 返回大厅';$('#countdown').hidden=true;if(game.rules.mode==='timed')$('#result-subtitle').textContent+=' · 限时赛按最终距离排名';if(game.rules.mode==='coop'){$('#result-title').textContent='搭子，下局继续。';$('#result-subtitle').textContent=`共同抵达 ${game.teamMeters} 米 · ${game.teamDepth} 层 · ${game.teamMeters*10} 分`; }if(game.earlyExit){$('#result-title').textContent='你的挑战已结束';$('#result-subtitle').textContent='本次第 '+me.rank+' 名 · '+me.meters+' 米 · 电脑之间尚未决出胜负';}renderPodium();renderFeed();if(won)tone(740,.4);updateUI();}
// Original procedural art: layered rock, roots, fireflies, platforms and soft toy challengers.
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
const backdrop=document.createElement('canvas');backdrop.width=W;backdrop.height=H;const backdropCtx=backdrop.getContext('2d');let backdropAt=-1,backdropZone=-1,backdropGame=false;
function background(camera,t,zone=0){
 const now=performance.now();if(now-backdropAt>=1000/30||zone!==backdropZone||backdropGame!==!!game){pixelBackground(backdropCtx,camera,reducedMotion?0:t,game?null:zone);backdropCtx.fillStyle='#050a1629';backdropCtx.fillRect(0,0,W,H);backdropAt=now;backdropZone=zone;backdropGame=!!game;}
 ctx.drawImage(backdrop,0,0);
}
function platform(f,camera,t){pixelPlatform(ctx,f,camera,t);}
function dude(p,x,y,t,local=false){
 const a=p.look||{...DEFAULT_LOOK,color:Math.max(0,PALETTE.indexOf(p.color))};
 const age=game?game.t-(p.landedAt??-10):10;
 const bounce=age<.23?Math.sin(age/.23*Math.PI):0;
 ctx.save();if(game&&game.t<(p.invulnerableUntil||0))ctx.globalAlpha=Math.floor(t*12)%2?.45:1;ctx.translate(x,y);if(p.downed){ctx.rotate(Math.PI);ctx.translate(0,48);}const flight=game&&p.ground===null?Math.min(1,Math.abs(p.vy||0)/650):0;const hurt=game?Math.max(0,1-(game.t-(p.hurtAt??-10))/.3):0;
 if(!reducedMotion){ctx.rotate(Math.sin(t*45)*hurt*.07);ctx.scale(1-flight*.07,1+flight*.09);}
 drawCharacter(ctx,a,0,0,1,t,{vx:p.vx,vy:p.vy,airborne:p.ground===null,action:game?(game.t-(p.hurtAt??-10)<.3?'hurt':game.t-(p.heavyAt??-10)<.28?'windup':game.t-(p.heavyAt??-10)<.48?'punch':game.t-(p.punchAt??-10)<.28?(game.t-p.punchAt<.1?'windup':'punch'):game.t-(p.throwAt??-10)<.35?'throw':game.t-(p.eatAt??-10)<.5?'eat':undefined):p.previewAction,facing:p.facing,reducedMotion,bounce:reducedMotion?0:bounce});ctx.restore();
 const shatter=shieldBreaks.get(p.id);
 if(p.shield)pixelShield(ctx,x,y,t,{reducedMotion});
 else if(shatter!==undefined&&frameSeconds-shatter<.42)pixelShield(ctx,x,y,t,{reducedMotion,shatter:frameSeconds-shatter});
 if(p.downed){line(x,y-45,x,y-8,'#f3cd80',3);ctx.fillStyle='#15202e';ctx.fillRect(x-30,y+12,60,6);ctx.fillStyle='#f2c773';ctx.fillRect(x-30,y+12,60*Math.min(1,(p.reviveProgress||0)/.6),6);}
 if(p.heart){ctx.fillStyle='#ff8292';ctx.font='18px "Fusion Pixel",monospace';ctx.textAlign='center';ctx.fillText('♥',x+33,y-49);}
 if(local){poly([[x-5,y-88],[x+5,y-88],[x,y-81]],'#e0f6a8');}
 if(p.name){ctx.textAlign='center';ctx.font='500 11px "Fusion Pixel",monospace';const w=ctx.measureText(p.name).width+16;rounded(x-w/2,y-114,w,20,4,'#132119bb');ctx.fillStyle=local?'#d9f79b':'#d5dfcc';ctx.fillText(p.name,x,y-100);
  if(p.badge)drawVendor(ctx,p.badge,x-12,y-141,24);}
}
const previewPlatforms=[{x:100,y:285,w:200,type:'seesaw',orchard:'branch',layer:1},{x:440,y:435,w:185,type:'seesaw',orchard:'branch',layer:2},{x:240,y:622,w:170,type:'crumble',orchard:'fruit',layer:3}];
function previewCast(t){
 const beat=theaterBeat(t,{started:previewSceneStarted,reaction:previewBossReaction,reduced:reducedMotion});
 return [[150,285],[250,285],[480,435],[580,435],[325,622]].map(([x,y],i)=>{
  const phase=reducedMotion?5:(t+i*1.1)%6,run=phase<2,jump=phase>=2&&phase<3.4;
  const progress=(phase-2)/1.4;
  const dodge=beat.phase==='attack'?Math.sin(beat.progress*Math.PI)*76:0;
  return {look:{...DEFAULT_LOOK,skin:i+1},name:SKINS[i+1].name,previewAction:beat.phase==='counter'?(i%2?'throw':'punch'):undefined,
   x:x+(run?Math.sin(phase*Math.PI)*14:0),y:y-dodge-(jump?Math.sin(progress*Math.PI)*68:0),
   vx:run?Math.cos(phase*Math.PI)*44:0,vy:jump?-Math.cos(progress*Math.PI)*153:0,ground:jump?null:0};
 });
}
let giantDemo=null,giantDemoIndex=0,giantPreviewEpoch=-1;
$('#preview-giant').onclick=()=>{const t=performance.now()/1000;giantDemo={t,camera:0,campaign:{chapter:previewZone}};giantDemo.encounter=createEncounter(giantDemo,++giantDemoIndex,{x:450,y:365});};
let renderTotal=0,renderCount=0,renderPeak=0,renderReport=0;
function render(now){const t=now/1000;ctx.clearRect(0,0,W,H);if(!game){
 if(!reducedMotion&&now>previewManualUntil&&now>previewAutoAt){previewAutoAt=now+11000;previewSceneStarted=t;previewBossReaction=-100;if(previewZone>=CHAPTERS.length-1)previewDirection=-1;if(previewZone<=0)previewDirection=1;previewZone+=previewDirection;$('#world-preview').value=previewZone;$('#demo-zone').textContent=CHAPTERS[previewZone].name+' / 自动巡游';$('#preview-giant').textContent=CHAPTER_GIANTS[previewZone].name;}
 if(!reducedMotion&&giantPreviewEpoch!==previewSceneStarted&&t-previewSceneStarted>.35){giantPreviewEpoch=previewSceneStarted;giantDemo={t,camera:0,campaign:{chapter:previewZone}};giantDemo.encounter=createEncounter(giantDemo,1,{x:450,y:365});}advanceEffects(now);background(reducedMotion?0:(t*35)%1200,t,previewZone);canvas.dataset.previewScene=String(previewZone);canvas.dataset.previewBossPhase=theaterBeat(t,{started:previewSceneStarted,reaction:previewBossReaction,reduced:reducedMotion}).phase;drawBossTheater(ctx,previewBossIndex(previewZone),t,{reduced:reducedMotion,reaction:previewBossReaction,started:previewSceneStarted,state:room?'room':$('#avatar-editor').open?'editor':'lobby'});ctx.save();ctx.scale(3,3);drawGuardian(ctx,'root',t,reducedMotion,{showcase:true,index:chapterGuardian(previewZone),started:previewSceneStarted});ctx.restore();if(giantDemo){giantDemo.t=t;if(t>giantDemo.encounter.at+.45)giantDemo=null;else drawEncounter(ctx,giantDemo,0,false);}previewPlatforms.forEach((f,i)=>platform({...f,orchard:undefined,stage:undefined,type:i===2?'crumble':'solid'},0,t));drawRelic(ctx,previewZone,550,391+Math.sin(t*3)*3,58);previewCast(t).forEach((p,i)=>{if(i||now>previewDeathUntil)dude(p,p.x,p.y,t);});const beat=theaterBeat(t,{started:previewSceneStarted,reaction:previewBossReaction,reduced:reducedMotion});if(beat.phase==='counter'){previewCast(t).forEach((p,i)=>{const q=(beat.age-6.7-i*.18)/1.05;if(q<0||q>1)return;const skill=heroSkill(p);drawGeneratedSkill(ctx,{skill:skill.kind,x:p.x+(700-p.x)*q,y:p.y-35+(355-p.y)*q,vx:250,vy:0,born:t-q},0,t);});}if(giantDemo)drawEncounter(ctx,giantDemo,0,true);drawBossTheater(ctx,previewBossIndex(previewZone),t,{front:true,reduced:reducedMotion});ctx.fillStyle='#aec48b';ctx.font='11px "Fusion Pixel",monospace';ctx.textAlign='left';ctx.fillText('↓  THE ONLY WAY IS DOWN',610,614);drawEffects(0);return;}
 const camera=game.camera;const zone=zoneFor(camera);collectEffects(now,zone);trackShields(game,frameSeconds);ctx.save();if(!reducedMotion&&shake>0)ctx.translate(Math.sin(now*1.3)*shake,Math.cos(now*.9)*shake);background(game.bossArena?camera+t*10:camera,t,zone);drawEncounter(ctx,game,camera,false);for(const f of game.platforms)if(!game.bossArena&&f.beast)pixelBeast(ctx,f,camera,t);if(!game.bossArena)for(const f of game.platforms)platform(f,camera,game.t);for(const item of game.bossArena?[]:game.items){const f=game.platforms.find(f=>f.id===item.platformId);if(f&&!f.broken&&!item.collected){if(item.type==='relic')drawRelic(ctx,item.relic,f.x+f.w*item.offset,item.y-camera,58);else pixelItem(ctx,{...item,x:f.x+f.w*item.offset},camera,t);}}
 for(const p of game.players)if(p.skillAt!==undefined&&heardSkills.get(p.id)!==p.skillAt){heardSkills.set(p.id,p.skillAt);const kind=heroSkill(p).kind;const listener=game.players.find(v=>v.id===myId)||p;soundtrack.chatter(p,'skill',p.id===myId,listener);soundtrack.event('ultimate');soundtrack.tone(kind==='chicken'?900:kind==='rocket'?120:480,.25,kind==='chicken'?'sawtooth':'triangle',.04,kind==='chicken'?240:80);}
 for(const e of game.bossAudio||[])if(e.id>heardBossAudio){heardBossAudio=e.id;if(e.kind==='pickup')soundtrack.event('eat');else if(e.kind==='roar')soundtrack.event('roar');else if(e.kind==='impact')soundtrack.event('punch');else if(e.kind==='break')soundtrack.event('break');else soundtrack.tone(e.kind==='shot'?650:e.kind==='swing'?340:110,e.kind==='shot'?.07:.18,'sawtooth',.045,60);}
 drawFallBoss(ctx,game,camera);drawCampaignHazards(ctx,game,camera);if(game.elite)drawBossTheater(ctx,game.elite.chapter,t,{backdrop:false,reduced:reducedMotion,state:'elite'});drawCombat(ctx,game,camera);for(const blast of game.blasts||[])if(!heardBlasts.has(blast.id)){heardBlasts.add(blast.id);tone(65,.22);if(!reducedMotion)shake=Math.max(shake,4);}
 for(const ball of game.throws||[]){ctx.save();for(let i=1;i<=4;i++){ctx.globalAlpha=(5-i)*.14;ctx.fillStyle='#ff9bab';ctx.fillRect(ball.x-ball.vx*.025*i-3,ball.y-camera-ball.vy*.025*i-3,6,6);}ctx.restore();pixelItem(ctx,ball,camera,t);}
 for(const victim of game.players.filter(p=>p.downed&&p.alive)){const helper=game.players.find(p=>p.id===victim.helperId);if(helper){line(helper.x,helper.y-camera-32,victim.x,victim.y-camera-25,'#efdc9d',6);}else{const wave=reducedMotion?0:Math.round(Math.sin(t*9))*6;line(victim.x-15,victim.y-camera-15,victim.x-32,victim.y-camera-32+wave,'#efdc9d',6);}}

 for(const p of game.players){if(!p.alive)continue;let s=smooth.get(p.id);if(!s){s={x:p.x,y:p.y};smooth.set(p.id,s);}if(p.rescueAt&&s.rescueAt!==p.rescueAt){s.rescueAt=p.rescueAt;s.x=p.x;s.y=p.y;}s.x+=(p.x-s.x)*.45;s.y+=(p.y-s.y)*.45;dude(p,s.x,s.y-camera,t,p.id===myId);if(game.t<(p.frozenUntil||0)){ctx.strokeStyle='#b4f3ff';ctx.lineWidth=3;ctx.strokeRect(s.x-25,s.y-camera-45,50,45);}}
 for(const p of game.players){const age=game.t-(p.rescueAt??-10);if(age>=0&&age<.65&&p.rescueFrom){ctx.save();ctx.globalAlpha=1-age/.65;ctx.strokeStyle='#99ddce';ctx.lineWidth=3;ctx.setLineDash([6,9]);ctx.beginPath();ctx.moveTo(p.rescueFrom.x,Math.max(25,Math.min(H-25,p.rescueFrom.y-camera)));ctx.quadraticCurveTo(p.x+80,p.y-camera-110,p.x,p.y-camera-20);ctx.stroke();ctx.setLineDash([]);ctx.strokeRect(p.x-27,p.y-camera-62,54,64);ctx.restore();}}
 drawEncounter(ctx,game,camera,true);drawUltimate(ctx,game,camera,myId,reducedMotion);if(game.phase==='finished')drawBossTheater(ctx,Math.min(8,game.campaign?.chapter||0),t,{backdrop:false,reduced:reducedMotion,state:game.campaignComplete?'victory':'result'});
 for(const p of game.players)if(!p.alive&&game.t-(p.diedAt??-10)<.45){ctx.save();ctx.globalAlpha=1-(game.t-p.diedAt)/.45;drawCharacter(ctx,p.look,p.x,p.y-camera,1,t,{action:'defeat',facing:p.facing});ctx.restore();}
 drawEffects(camera);
 const dead=game.players.find(p=>p.id===myId&&!p.alive&&!p.timedOut);if(dead&&game.t-(dead.diedAt||0)<1.8){const dx=Math.max(35,Math.min(W-35,dead.deathX??dead.x)),dy=Math.max(50,Math.min(H-45,(dead.deathY??dead.y)-camera));ctx.strokeStyle='#ff8c90';ctx.lineWidth=3;ctx.strokeRect(dx-25,dy-50,50,55);ctx.fillStyle='#111c2eee';ctx.fillRect(W/2-195,H/2-26,390,52);ctx.fillStyle='#ffd3a4';ctx.font='24px "Fusion Pixel"';ctx.textAlign='center';ctx.fillText(dead.reason||'挑战结束',W/2,H/2+8);}
 if(networkPaused&&mode==='online'){ctx.fillStyle='#101927df';ctx.fillRect(0,H/2-35,W,70);ctx.fillStyle='#f4dfab';ctx.font='24px "Fusion Pixel"';ctx.textAlign='center';ctx.fillText('网络重连中 · 本局暂时停留',W/2,H/2+8);}
 ctx.restore();
 // Fixed viewport boundary; HUD shows only score, depth and speed.
 for(let edge of [0,W-9]){ctx.fillStyle='#e7ad90';ctx.fillRect(edge,0,9,24);ctx.fillRect(edge===0?9:W-18,0,9,12);}
 const left=countUntil-now;$('#countdown').hidden=left<=0;if(left>0)$('#countdown').textContent=Math.ceil(left/1000);
}
function loop(now){
 if(!game&&!$('#audio-mixer').open)soundtrack.update(true,-1);
 if(game?.phase==='playing')for(const actor of game.players){if(actor.punchAt!==undefined&&heardPunchVoices.get(actor.id)!==actor.punchAt){heardPunchVoices.set(actor.id,actor.punchAt);if(actor.id===myId&&Math.random()<.12)soundtrack.chatter(actor,'idle');}}
 if(now>nextChatter){nextChatter=now+25000+Math.random()*20000;if(!document.hidden&&(!game||game.phase==='playing')&&Math.random()<.7){const actor=game?.players.find(p=>p.id===myId&&p.alive)||(!game?{id:'preview',alive:true,x:0,y:0,look}:null);if(actor)soundtrack.chatter(actor,'idle');}}
 let dt=Math.min((now-last)/1000,.1);last=now;if(game&&mode==='solo'&&game.phase==='playing'&&now>=countUntil){acc+=dt;while(acc>=1/60){const inputs={[myId]:input};for(const p of game.players)if(p.cpu&&p.alive)inputs[p.id]=cpuInput(game,p);step(game,inputs);acc-=1/60;}if(game.phase==='finished')results();}else acc=0;const renderStart=performance.now();frameSeconds=now/1000;render(now);renderPortrait(now);renderChapterBook(now);renderCelebration(now);const cost=performance.now()-renderStart;renderTotal+=cost;renderCount++;renderPeak=Math.max(renderPeak,cost);if(now-renderReport>2000){canvas.dataset.renderMs=(renderTotal/renderCount).toFixed(2);canvas.dataset.renderPeakMs=renderPeak.toFixed(2);renderTotal=0;renderCount=0;renderPeak=0;renderReport=now;}if(now-uiClock>120){updateUI();uiClock=now;}requestAnimationFrame(loop);}
const ZONES=WORLDS;const zoneFor=worldIndex;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let seenRevived=new Map();
const heardBlasts=new Set();let lastEncounterAt=-1;
let floaters=[],seenHurt=new Map(),seenPickup=new Map(),smoke=[],particles=[],seenLand=new Map(),seenJump=new Map(),seenDead=new Set(),seenBroken=new Set(),lastZone=-1,bannerUntil=0,shake=0,lastFx=0,lastWarning=0,lastCount=0;
// A shield that disappears has just absorbed something; the engine reports the new state, not the
// event, so the moment is reconstructed from the transition.
const shieldBreaks=new Map(),shieldWas=new Map();
let frameSeconds=0;   // wall-clock seconds for this frame; uiClock is a 120ms-throttled ms stamp
function trackShields(game,now){
 if(!game){shieldBreaks.clear();shieldWas.clear();return;}
 const live=new Set();
 for(const p of game.players){
  live.add(p.id);
  if(shieldWas.get(p.id)&&!p.shield&&p.alive)shieldBreaks.set(p.id,now);
  shieldWas.set(p.id,!!p.shield);
 }
 for(const id of [...shieldWas.keys()])if(!live.has(id)){shieldWas.delete(id);shieldBreaks.delete(id);}
}

function clearEffects(){heardBossAudio=0;lastEncounterAt=-1;heardBlasts.clear();rosterRows.clear();$('#players').replaceChildren();lastFeedId=0;$('#match-feed').innerHTML='<li class="feed-empty">开局后，在这里看谁续命、谁嘴硬、谁先下班。</li>';$('#feed-status').textContent='等待开局';floaters=[];seenRevived.clear();seenHurt.clear();seenPickup.clear();smoke=[];particles=[];seenLand.clear();seenJump.clear();seenDead.clear();seenBroken.clear();lastZone=-1;bannerUntil=0;shake=0;lastFx=performance.now();lastWarning=0;lastCount=0;$('#zone-banner').hidden=true;}
function burst(x,y,color,n=12){if(reducedMotion)return;for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*170,vy:-30-Math.random()*150,life:.35+Math.random()*.4,max:.8,color,size:2+Math.random()*4});if(particles.length>240)particles.splice(0,particles.length-240);}
function deathSmoke(p,camera=game?.camera??0){
 const y=Math.max(camera+35,Math.min(camera+H-28,p.y-25));
 smoke.push({x:p.x,y,age:0,seed:Math.random()*6});if(smoke.length>24)smoke.shift();
}
function banner(title,subtitle,now){const el=$('#zone-banner');el.replaceChildren(document.createTextNode(title));const sub=document.createElement('small');sub.textContent=subtitle;el.append(sub);el.hidden=false;bannerUntil=now+2100;}
function advanceEffects(now){
 const dt=Math.min(.06,Math.max(0,(now-lastFx)/1000));lastFx=now;shake=Math.max(0,shake-dt*24);
 for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=420*dt;}particles=particles.filter(p=>p.life>0);for(const v of floaters)v.life-=dt;floaters=floaters.filter(v=>v.life>0).slice(-48);for(const puff of smoke)puff.age+=dt;smoke=smoke.filter(p=>p.age<1.65);
}
function collectEffects(now,zone){
 if(game.encounter&&lastEncounterAt!==game.encounter.at){lastEncounterAt=game.encounter.at;soundtrack.event('warning');}
 renderFeed();
 advanceEffects(now);
 if(zone!==lastZone){if(lastZone>=0)soundtrack.event('zone');lastZone=zone;$('.arena-wrap').className='arena-wrap zone-'+zone;}
 if(now>bannerUntil)$('#zone-banner').hidden=true;
 for(const p of game.players){
 if(p.revivedAt&&seenRevived.get(p.id)!==p.revivedAt){seenRevived.set(p.id,p.revivedAt);floaters.push({x:p.x,y:p.y-75,text:'搭子救回来了！',color:'#a7f0cd',life:1.3});burst(p.x,p.y-30,'#a7f0cd',16);soundtrack.event('zone');}
 if(p.hurtAt&&seenHurt.get(p.id)!==p.hurtAt){seenHurt.set(p.id,p.hurtAt);floaters.push({x:p.x,y:p.y-75,text:p.lastHit,color:'#ffa0a5',life:1});if(p.alive&&p.id===myId){soundtrack.event(p.lastHit?.startsWith('拳击')?'punch':'warning');shake=3;}}
 if(p.pickupAt&&seenPickup.get(p.id)!==p.pickupAt){seenPickup.set(p.id,p.pickupAt);const names={relic:(CHAPTER_RELICS[p.lastRelic]?.name||'秘宝')+' · 生效',weapon:ARENA_WEAPONS[p.bossWeapon]?.name+' · 12 发',freeze:'冰冻果入袋',heart:p.pickupGain?'+1 生命':game.rules.mode==='brawl'&&p.carry==='heart'?'红心入袋 · Q 回血':game.rules.mode==='coop'?'红心已装好':'生命已满',time:p.pickupGain?'+'+p.pickupGain+' 秒':'加时已达上限',shield:game.rules.mode==='brawl'&&p.carry==='shield'?'护盾入袋 · Q 使用':'护盾已生效',poison:game.rules.mode==='brawl'?'毒果入袋 · F 投掷':'毒果！'};floaters.push({x:p.x,y:p.y-100,text:names[p.lastPickup],color:p.lastPickup==='poison'?'#d7a2ed':'#ffe9a0',life:1.2});if(p.id===myId)soundtrack.event(p.lastPickup==='poison'?'warning':'eat');}
 if(p.jumpedAt&&seenJump.get(p.id)!==p.jumpedAt){seenJump.set(p.id,p.jumpedAt);if(p.id===myId)soundtrack.event('jump');}if(p.landedAt&&seenLand.get(p.id)!==p.landedAt){seenLand.set(p.id,p.landedAt);burst(p.x,p.y,PALETTE[p.look?.color??0],10);if(p.id===myId)soundtrack.event(p.landedType==='spring'?'spring':'land');}if(!p.alive&&!seenDead.has(p.id)){seenDead.add(p.id);if(p.timedOut)continue;if(p.id===myId||(p.y>=game.camera-30&&p.y<=game.camera+H+50))deathSmoke(p);const listener=game.players.find(v=>v.id===myId);const ear=listener?.alive?listener:{x:listener?.x??W/2,y:game.camera+H/2};soundtrack.death(p,ear,p.id===myId);if(p.id===myId)shake=6;}}
 const activeIds=new Set(game.platforms.map(f=>f.id));for(const id of seenBroken)if(!activeIds.has(id))seenBroken.delete(id);
 for(const f of game.platforms){if(f.broken&&!seenBroken.has(f.id)){seenBroken.add(f.id);if(f.y>game.camera-30&&f.y<game.camera+H){burst(f.x+f.w/2,f.y,'#dba16e',20);soundtrack.event('break');shake=Math.max(shake,3);}}}
 const me=game.players.find(p=>p.id===myId);const danger=me?.alive&&me.y-game.camera<130;
 if(danger&&now-lastWarning>1600){lastWarning=now;soundtrack.event('warning');}
 const count=Math.ceil((countUntil-now)/1000);if(count>0&&count!==lastCount){lastCount=count;soundtrack.tone(420+count*100,.12);}
 if(!$('#audio-mixer').open||game.phase==='playing')soundtrack.update(game.phase==='playing'&&count<=0,zone,danger,!!game.bossArena);
}
function drawEffects(camera){
 const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x/3)*3,Math.round(y/3)*3,Math.ceil(w/3)*3,Math.ceil(h/3)*3);};
 for(const p of particles){ctx.globalAlpha=Math.min(1,p.life/.3);box(p.x,p.y-camera,p.size,p.size,p.color);}
 for(const puff of smoke){const a=puff.age,fade=Math.min(1,a/.07)*Math.min(1,(1.65-a)/.6);ctx.globalAlpha=Math.max(0,fade);
  for(let i=0;i<9;i++){const angle=i*2.4+puff.seed,spread=reducedMotion?6:8+a*23,sz=9+a*10+(i%3)*3;
   const x=puff.x+Math.sin(angle+a)*spread,y=puff.y-camera-(reducedMotion?0:a*42)+Math.cos(angle)*spread*.55;
   box(x-sz/2,y-sz/2,sz,sz,'#527b78');box(x-sz/2+3,y-sz/2-3,sz-6,sz,'#9ebeb0');box(x-sz/2+3,y-sz/2,sz-6,6,'#d6dfbd');
  }
  if(a<.2){const d=9+a*100;box(puff.x-d,puff.y-camera,6,3,'#ecf4c8');box(puff.x+d,puff.y-camera,6,3,'#ecf4c8');}
 }
 for(const v of floaters){ctx.globalAlpha=Math.min(1,v.life*2);ctx.fillStyle=v.color;ctx.font='12px "Fusion Pixel",monospace';ctx.textAlign='center';ctx.fillText(v.text,v.x,v.y-camera-(1.2-v.life)*30);}
 ctx.globalAlpha=1;
}
let previewAction='idle';
function paintSkinCards(){for(const c of document.querySelectorAll('[data-skin] canvas')){const cc=c.getContext('2d');cc.clearRect(0,0,c.width,c.height);drawCharacter(cc,{...DEFAULT_LOOK,skin:Number(c.parentNode.dataset.skin)},45,88,1);}}
function paintQuickSkinCards(){for(const c of document.querySelectorAll('[data-quick-skin] canvas')){const cc=c.getContext('2d');cc.clearRect(0,0,c.width,c.height);drawCharacter(cc,{...DEFAULT_LOOK,skin:Number(c.parentNode.dataset.quickSkin)},32,69,.78);}}
function initQuickSkins(){
 const list=$('#quick-skins');
 for(let i=1;i<SKINS.length;i++){
  const button=document.createElement('button');button.type='button';button.dataset.quickSkin=String(i);button.title=SKINS[i].name+' · '+SKINS[i].detail;button.setAttribute('aria-label','选择'+SKINS[i].name+'，'+SKINS[i].detail);
  const portrait=document.createElement('canvas');portrait.width=64;portrait.height=72;portrait.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=SKINS[i].name;
  button.append(portrait,label);button.onclick=()=>{look={...look,skin:i};try{localStorage.setItem('man18-look',JSON.stringify(look));}catch{}refreshLook();};list.append(button);
 }
 paintQuickSkinCards();
}
function initEditor(){
 const actions=document.createElement('div');actions.className='action-preview';actions.setAttribute('aria-label','动作预览');
 for(const [key,label] of [['idle','待机'],['run','跑动'],['jump','起跳'],['fall','下落'],['windup','蓄力'],['punch','出拳'],['throw','投掷'],['ultimate','专属大招'],['hurt','受击'],['eat','吃果'],['defeat','淘汰']]){const b=document.createElement('button');b.textContent=label;b.dataset.previewAction=key;b.setAttribute('aria-pressed',String(key==='idle'));b.onclick=()=>{previewAction=key;for(const button of actions.children)button.setAttribute('aria-pressed',String(button===b));};actions.append(b);}$('#portrait').parentElement.after(actions);

 SKINS.forEach((skin,i)=>{const b=document.createElement('button');b.dataset.skin=i;b.setAttribute('aria-label',skin.name+' · '+skin.detail);const c=document.createElement('canvas');c.width=90;c.height=94;const label=document.createElement('span');label.textContent=skin.name;b.append(c,label);b.onclick=()=>{draft.skin=i;syncEditor();};$('#skin-options').append(b);});paintSkinCards();

 const labels={fruit:'水果身体',animal:'融合动物',shape:'脸型',eyes:'眼睛',mouth:'嘴巴',hat:'头顶那玩意'};
 for(const [key,names] of Object.entries(TRAITS)){
  const row=document.createElement('div');row.className='trait-row';row.dataset.group=['fruit','animal'].includes(key)?'species':['shape','eyes','mouth'].includes(key)?'face':'hat';const heading=document.createElement('div');heading.className='trait-heading';const label=document.createElement('span');label.textContent=labels[key];const lock=document.createElement('button');lock.dataset.lock=key;lock.textContent='锁定';lock.setAttribute('aria-label','锁定'+labels[key]);lock.setAttribute('aria-pressed','false');heading.append(label,lock);
  const opts=document.createElement('div');opts.className='trait-options';names.forEach((name,i)=>{const b=document.createElement('button');b.textContent=name;b.dataset.trait=key;b.dataset.value=i;b.setAttribute('aria-pressed','false');opts.append(b);});row.append(heading,opts);$('#trait-controls').append(row);
 }
 PALETTE.forEach((color,i)=>{const b=document.createElement('button');b.dataset.trait='color';b.dataset.value=i;b.style.setProperty('--swatch',color);b.setAttribute('aria-label',['青苹果','蓝莓','蜜桃','香芋','薄荷','奶黄','草莓','米白','橄榄','橘子','灰蓝','奶茶'][i]);$('#color-options').append(b);});
 const open=()=>{draft={...look};generateVariants();syncEditor();selectTraitTab('species');$('#avatar-editor').showModal();};$('#edit-look').onclick=open;$('#room-edit-look').onclick=open;
 $('#close-editor').onclick=()=>$('#avatar-editor').close();
 $('#avatar-editor').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.trait){draft[b.dataset.trait]=Number(b.dataset.value);syncEditor();tone(330+draft[b.dataset.trait]*60,.05);}if(b.dataset.lock){locked[b.dataset.lock]=!locked[b.dataset.lock];syncEditor();}});
 $('#random-look').onclick=()=>{draft=randomLook(locked,draft);generateVariants();syncEditor();soundtrack.tone(220,.15,'triangle',.06,660);};
 $('#face-width').oninput=e=>{draft.width=Number(e.target.value);$('#width-value').textContent=draft.width;};$('#eye-spacing').oninput=e=>{draft.spacing=Number(e.target.value);$('#spacing-value').textContent=draft.spacing;};
 $('#save-look').onclick=()=>{if(room&&game?.phase==='playing')return toast('本局已开始，下一局再换脸');look=sanitizeLook(draft);try{localStorage.setItem('man18-look',JSON.stringify(look));}catch{}if(room)send({type:'appearance',look});$('#avatar-editor').close();refreshLook();toast('新形象就位，下去丢人吧！');};
 for(const [i,z] of CHAPTERS.entries()){const option=document.createElement('option');option.value=i;option.textContent=String(i+1).padStart(2,'0')+' · '+z.name;$('#world-preview').append(option);}
 $('#demo-zone').textContent=CHAPTERS[previewZone].name+' / 场景预览';
 const setWorld=i=>{previewZone=(i+CHAPTERS.length)%CHAPTERS.length;$('#world-preview').value=previewZone;$('.arena-wrap').className='arena-wrap zone-'+previewZone;$('#demo-zone').textContent=CHAPTERS[previewZone].name+' / '+CHAPTER_GIANTS[previewZone].name;$('#preview-giant').textContent=CHAPTER_GIANTS[previewZone].name;$('#preview-relic').title=CHAPTER_RELICS[previewZone].name+'：'+CHAPTER_RELICS[previewZone].tip;previewSceneStarted=performance.now()/1000;previewBossReaction=-100;previewManualUntil=performance.now()+11000;previewAutoAt=previewManualUntil;};
 $('#world-preview').onchange=e=>setWorld(Number(e.target.value));$('#previous-world').onclick=()=>setWorld(previewZone-1);$('#next-world').onclick=()=>setWorld(previewZone+1);
 for(const b of document.querySelectorAll('[data-trait-tab]'))b.onclick=()=>selectTraitTab(b.dataset.traitTab);
 $('#combination-count').textContent=Object.values(TRAITS).reduce((n,a)=>n*a.length,12).toLocaleString()+' 种混搭组合，还能微调脸宽与眼距。';
 initMixer();
 refreshLook();
}
function selectTraitTab(group){for(const r of document.querySelectorAll('[data-group]'))r.hidden=r.dataset.group!==group;for(const b of document.querySelectorAll('[data-trait-tab]'))b.setAttribute('aria-pressed',String(b.dataset.traitTab===group));}

function refreshLook(){const c=$('#mini-look');const cctx=c.getContext('2d');cctx.clearRect(0,0,c.width,c.height);drawCharacter(cctx,look,48,93,1.1);$('#look-name').textContent=lookName(look);$('#selected-hero-skill').textContent=heroHelp(look.skin);for(const button of document.querySelectorAll('[data-quick-skin]'))button.setAttribute('aria-pressed',String(Number(button.dataset.quickSkin)===look.skin));}
function syncEditor(){
 updateQuickHelp();
 $('.action-preview').hidden=false;
 for(const b of document.querySelectorAll('[data-skin]'))b.setAttribute('aria-pressed',String(Number(b.dataset.skin)===draft.skin));
 for(const b of document.querySelectorAll('[data-trait],[data-lock],#face-width,#eye-spacing'))b.disabled=!!draft.skin;
 $('#skin-hint').textContent=(draft.skin?'怪咖整套皮肤':'自由捏脸 · 水果 × 动物')+' · 专属大招：'+heroSkill({look:draft}).name+' · 实战灵气蓄满后依次按 ↓、← 或 →、J。';
for(const b of document.querySelectorAll('[data-trait]'))b.setAttribute('aria-pressed',String(draft[b.dataset.trait]===Number(b.dataset.value)));for(const b of document.querySelectorAll('[data-lock]')){const value=!!locked[b.dataset.lock];b.setAttribute('aria-pressed',String(value));b.textContent=value?'已锁定':'锁定';}$('#face-width').value=draft.width;$('#eye-spacing').value=draft.spacing;$('#width-value').textContent=draft.width;$('#spacing-value').textContent=draft.spacing;$('#trait-caption').textContent=lookName(draft);}
function generateVariants(){variants=Array.from({length:4},()=>randomLook(locked,draft));$('#variations').replaceChildren(...variants.map((a,i)=>{const b=document.createElement('button');b.setAttribute('aria-label','使用候选形象 '+(i+1));const c=document.createElement('canvas');c.width=90;c.height=100;drawCharacter(c.getContext('2d'),a,45,94,1);b.append(c);b.onclick=()=>{draft={...a};syncEditor();};return b;}));}
function renderPortrait(now){if(!$('#avatar-editor').open)return;const c=$('#portrait'),cc=c.getContext('2d');cc.clearRect(0,0,c.width,c.height);cc.save();cc.scale(c.width/900,c.height/680);drawBossTheater(cc,previewBossIndex(previewZone),now/1000,{reduced:reducedMotion,state:'editor'});cc.fillStyle='#15232a99';cc.fillRect(0,0,900,680);cc.restore();const phase=(now/1000)%6,showSkill=previewAction==='ultimate'||previewAction==='idle'&&phase>3.2&&!reducedMotion;drawCharacter(cc,draft,220,337+(reducedMotion?0:Math.sin(now/600)*3),3.2,now/1000,{action:showSkill?'throw':previewAction,reducedMotion});if(showSkill){const skill=heroSkill({look:draft});drawGeneratedSkill(cc,{skill:skill.kind,x:325,y:180,vx:1,vy:0,born:now/1000-(reducedMotion?.2:phase)},0,now/1000);cc.fillStyle='#ffe7aa';cc.font='15px "Fusion Pixel",monospace';cc.textAlign='center';cc.fillText(skill.name,c.width/2,32);}}


function initMixer(){
 try{soundtrack.setVolume('music',Number(localStorage.getItem('man18-music-volume')??.25));soundtrack.setVolume('effects',Number(localStorage.getItem('man18-effects-volume')??.55));}catch{}
 $('#music-volume').value=Math.round(soundtrack.musicVolume*100);$('#effects-volume').value=Math.round(soundtrack.effectsVolume*100);
 $('#mix').onclick=()=>{for(const b of document.querySelectorAll('[data-track]'))b.disabled=game?.phase==='playing';$('#audio-mixer').showModal();};$('#close-mixer').onclick=()=>{$('#audio-mixer').close();if(!game||game.phase!=='playing'){soundtrack.active=false;soundtrack.stopMusic();}};
 $('#audio-mixer').addEventListener('cancel',()=>{if(!game||game.phase!=='playing'){soundtrack.active=false;soundtrack.stopMusic();}});
 for(const kind of ['music','effects'])$('#'+kind+'-volume').oninput=e=>{soundtrack.setVolume(kind,Number(e.target.value)/100);try{localStorage.setItem('man18-'+kind+'-volume',String(Number(e.target.value)/100));}catch{}};
 for(const b of document.querySelectorAll('[data-track]'))b.onclick=()=>{sound=true;updateSoundButton();soundtrack.enable(true);soundtrack.preview(b.dataset.track);};
 for(const [id,local] of [['preview-death',true],['preview-neighbor',false]])$('#'+id).onclick=async()=>{sound=true;updateSoundButton();soundtrack.enable(true);try{await soundtrack.load('death');if(!$('#audio-mixer').open)return;soundtrack.death({x:local?0:300,y:0,look},{x:0,y:0},local);}catch{toast('惨叫音效加载失败，请稍后再试');}};
 $('#preview-sfx').onclick=()=>{sound=true;updateSoundButton();soundtrack.enable(true);soundtrack.event('spring');};soundtrack.report();
}

initQuickSkins();initEditor();loadSprites();enhanceSelects();probeBackend();
loadCharacterSkins().then(()=>{paintSkinCards();paintQuickSkinCards();refreshLook();rosterRows.clear();if(room)renderRoom();}).catch(()=>toast('怪咖素材加载失败，请刷新重试'));
// AI battles reuse the ordinary room flow: the page hosts a brawl and each agent joins as a guest.
createAIPanel({
 mount:$('#ai-panel'),
 enhanceSelects,
 toast,
 getWsBase:wsBase,
 // If the player already hosts a friend room, AI seats join it and the player keeps the whistle.
 getHostedRoom:()=>room&&room.host===myId&&(!game||game.phase==='finished')?room.code:null,
 requestStart:()=>{if(ws?.readyState===1)ws.send(JSON.stringify({type:'start'}));},
 isMatchRunning:()=>!!game&&game.phase==='playing',
 async onStart(){
  try{
   const res=await fetch(httpBase()+'/room',{method:'POST'});
   const body=await res.json();
   if(!res.ok||!body.code)throw new Error(body.error||'服务器没有返回房间码');
   matchRules={mode:'brawl',duration:matchRules.duration};
   syncRules('match',matchRules);
   // An AI battle is watched, not played: the host owns the room but takes no seat in the match.
   pending={code:body.code,intent:'create',payload:{type:'create',name:name(),look,rules:matchRules,spectate:true}};
   connect();
   return body.code;
  }catch(err){toast('开不了房：'+err.message);return null;}
 },
});requestAnimationFrame(loop);

$('#preview-relic').onclick=()=>{const r=CHAPTER_RELICS[previewZone];toast(r.name+'：'+r.tip+' · 闯关中拾取生效');};
$('#preview-guardian').onclick=()=>{previewGuardian(performance.now()/1000);toast(GUARDIANS[chapterGuardian(previewZone)].name+' · 神兽巡游');};
$('#preview-death-fx').onclick=async()=>{
 if(game||performance.now()<previewDeathUntil)return;
 if(sound){unlockAudio();try{await soundtrack.load('death');}catch{}}
 if(game)return;
 const p=previewCast(performance.now()/1000)[0];previewDeathUntil=performance.now()+1800;deathSmoke(p,0);soundtrack.death(p,p,true);
};

let lastFeedId=0;
function renderFeed(){
 if(!game)return;$('#feed-status').textContent=game.phase==='finished'?'本局归档':'LIVE · 本局';
 for(const entry of game.events||[]){if(entry.id<=lastFeedId)continue;lastFeedId=entry.id;$('#match-feed .feed-empty')?.remove();
  const li=document.createElement('li'),time=document.createElement('time'),name=document.createElement('strong'),title=document.createElement('span'),body=document.createElement('p');
  time.textContent=String(Math.floor(entry.t/60)).padStart(2,'0')+':'+String(Math.floor(entry.t%60)).padStart(2,'0');
  name.textContent=entry.name+(entry.playerId===myId?' · 你':'');title.className='feed-title';title.textContent=entry.title;body.textContent=entry.text;
  li.append(time,name,title,body);$('#match-feed').prepend(li);
 }
 while($('#match-feed').children.length>20)$('#match-feed').lastElementChild.remove();
}
function renderPodium(){syncReplay();celebrationActors=[];
 const local=game.result.find(p=>p.id===myId)||game.result[0];$('#podium h2').textContent=local?.title||'本局荣耀时刻';$('#podium-note').textContent=game.rules.mode==='coop'?`共同 ${game.teamMeters} 米 · ${game.teamDepth} 层 · 一起创造的成绩`:game.players.length===1?'单人练习 · 这是你的本局称号':(game.rules.mode==='timed'?'按最终距离排名':'按存活时间排名')+' · 同成绩并列，同享奖牌';
 if(game.players.length===1){const me=game.result[0];let best=me.score;try{best=Math.max(best,Number(localStorage.getItem(game.rules.mode==='timed'?'man18-best-timed-'+game.rules.duration:'man18-best'))||0);}catch{}$('#podium-note').textContent=`${me.reason||'挑战结束'} · ${me.meters} 米 · ${best>me.score?'距最佳还差 '+Math.ceil((best-me.score)/10)+' 米':'已达到个人最佳'}`;}
 const winners=game.result.filter(p=>p.rank<=3);
 $('#podium-cards').replaceChildren(...winners.map(p=>{
  const card=document.createElement('article');card.className='podium-card medal-'+p.rank;
  const medal=document.createElement('span');medal.className='podium-medal';medal.textContent=game.rules.mode==='coop'?'双人 · 最佳搭档':game.players.length===1?'本次挑战':['','01 · 金牌','02 · 银牌','03 · 铜牌'][p.rank];
  const av=document.createElement('canvas');av.width=150;av.height=180;celebrationActors.push({canvas:av,player:p,offset:celebrationActors.length*.65});av.setAttribute('aria-label',p.name+'选择的头像');drawCharacter(av.getContext('2d'),p.look,75,145,1.7);
  if(p.badge){const tag=document.createElement('span');tag.className='podium-vendor';
   const bc=document.createElement('canvas');bc.width=28;bc.height=28;drawVendor(bc.getContext('2d'),p.badge,0,0,28);
   const home=document.createElement('i');home.textContent=(VENDOR_BADGE[p.badge]||VENDOR_BADGE.custom).home;
   tag.append(bc,home);card.append(tag);}
  const name=document.createElement('b');name.textContent=p.name+(p.id===myId?' · 你':'');const title=document.createElement('strong');title.textContent=p.title;title.title=p.detail;
  const score=document.createElement('small');score.textContent=game.rules.mode==='coop'?p.detail:p.meters+' m / '+p.depth+' 层';card.append(medal,av,name,title,score);const banter=document.createElement('p');banter.className='podium-banter';const pair=game.rules.mode==='coop'?['你管下落，我管兜底。','You drop. I’ve got your back.']:game.players.length===1?['先拿自己练手，再找朋友交手。','Practice today. Challenge friends tomorrow.']:p.rank===1?['这局我先笑，不服再来。','My turn to laugh. Rematch?']:p.rank===2?['就差一点。下局你别跑。','So close. Don’t run from the rematch.']:['名次可以让，嘴不能输。','You win the medal. I win the banter.'];banter.textContent=helpText(...pair);card.append(banter);return card;
 }));
}

const rosterRows=new Map();
function syncReplay(){if(!game||game.phase!=='finished')return;const waiting=!!room&&room.host!==myId;$('#stage-again').disabled=waiting;$('#stage-again').textContent=waiting?'等待房主再开一局':'再来一局 ↻';$('#stage-back').textContent=room?'返回房间':'返回大厅';}
function refreshRoster(){
 const parent=$('#players');
 for(const p of game.players){let entry=rosterRows.get(p.id);if(!entry){const node=member(p,'');entry={node,status:node.querySelector('small')};rosterRows.set(p.id,entry);}if(entry.node.parentNode!==parent)parent.append(entry.node);
  entry.node.classList.toggle('dead',!p.alive);const label=p.downed&&p.alive?'待救援 · '+Math.max(0,p.downedUntil-game.t).toFixed(1)+'s':p.alive?`${p.hp}♥ · ${p.meters||0} m${game.rules.mode==='timed'?' · '+Math.ceil(p.timeLeft)+'s':''}`:p.timedOut?'已完赛':'已淘汰';if(entry.status.textContent!==label)entry.status.textContent=label;
 }
 for(const [id,entry] of rosterRows)if(!game.players.some(p=>p.id===id)){entry.node.remove();rosterRows.delete(id);}
}

function reactToBoss(){if(game)return;const now=performance.now()/1000;if(now-previewBossReaction<2)return;previewBossReaction=now;if(sound){soundtrack.enable(true);soundtrack.event('roar');}toast(CHAPTERS[previewBossIndex(previewZone)].boss+'发现你了！');}
$('#boss-reaction').onclick=reactToBoss;
canvas.addEventListener('click',e=>{if(game)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;if(x>570&&y>160&&y<540)reactToBoss();});
let codexCleared=0;try{codexCleared=Math.max(0,Math.min(81,Number(localStorage.getItem('man18-codex-cleared-v1'))||0));}catch{}
function rememberCodex(){
 const me=game?.players.find(p=>p.id===myId);if(!me?.alive||!game.campaign)return;
 const reached=game.campaignComplete?81:Math.max(0,game.campaign.number-1);
 if(reached>codexCleared){codexCleared=reached;try{localStorage.setItem('man18-codex-cleared-v1',String(codexCleared));}catch{}}
}
function selectChapter(i){bookChapter=i;bookStarted=performance.now()/1000;const data=chapterMarkup(i),open=codexCleared>i*9;
 $('#chapter-name').textContent=open?data.title:helpText('未解锁 · 完成本境试炼后逐步揭示','Locked · Complete trials to reveal');
 $('#chapter-trials').replaceChildren(...data.trials.map(trial=>{const li=document.createElement('li'),b=document.createElement('b'),small=document.createElement('small'),unlocked=trial.number<=codexCleared;b.textContent=String(trial.number).padStart(2,'0')+' · '+(unlocked?trial.name:helpText('未解锁','Locked'));small.textContent=unlocked?trial.tip:helpText('通过对应试炼后解锁','Complete this trial to unlock');li.append(b,small);return li;}));
 for(const [n,button]of [...$('#chapter-tabs').children].entries()){button.textContent=(n+1)+' · '+(codexCleared>n*9?CHAPTERS[n].name:helpText('未解锁','Locked'));button.setAttribute('aria-pressed',String(n===i));}
 $('#chapter-preview').setAttribute('aria-label',helpText('妖王图鉴：击败后解锁预览','Boss codex: defeat to unlock preview'));
}
for(const [i]of CHAPTERS.entries()){const b=document.createElement('button');b.textContent=(i+1)+' · '+helpText('未解锁','Locked');b.onclick=()=>selectChapter(i);$('#chapter-tabs').append(b);}
$('#open-chapters').onclick=()=>{rememberCodex();selectChapter(Math.min(8,Math.floor(Math.max(0,codexCleared-1)/9)));$('#chapter-book').showModal();};
$('#close-chapters').onclick=()=>$('#chapter-book').close();
function renderChapterBook(now){if(!$('#chapter-book').open)return;const c=$('#chapter-preview').getContext('2d');c.clearRect(0,0,900,680);if(codexCleared<(bookChapter+1)*9){c.fillStyle='#101c2a';c.fillRect(0,0,900,680);c.fillStyle='#e5dca7';c.textAlign='center';c.font='28px "Fusion Pixel"';c.fillText(helpText('未知妖王','UNKNOWN BOSS'),450,300);c.font='18px "Fusion Pixel"';c.fillText(helpText('击败本境妖王后，解锁形象与动作','Defeat this realm’s boss to reveal its appearance'),450,355);return;}drawBossTheater(c,bookChapter,now/1000,{reduced:reducedMotion,started:bookStarted});drawBossTheater(c,bookChapter,now/1000,{front:true,reduced:reducedMotion});}

// Keep the first-visit decision small; all existing game controls retain their handlers.
for(const button of document.querySelectorAll('[data-entry]'))button.addEventListener('click',()=>{
 const friends=button.dataset.entry==='friends';
 document.querySelector('#entry-quick').hidden=friends;
 document.querySelector('#entry-friends').hidden=!friends;
 for(const tab of document.querySelectorAll('[data-entry]'))tab.setAttribute('aria-pressed',String(tab===button));
});
if(params.has('room'))document.querySelector('[data-entry="friends"]').click();

const voiceLabel=document.createElement('label');voiceLabel.htmlFor='voice-volume';voiceLabel.textContent='角色语音';
const voiceSlider=document.createElement('input');voiceSlider.id='voice-volume';voiceSlider.type='range';voiceSlider.min=0;voiceSlider.max=100;voiceSlider.value=70;
try{voiceSlider.value=localStorage.getItem('man18-voice-volume')??70;}catch{}
soundtrack.setVolume('voice',Number(voiceSlider.value)/100);voiceSlider.oninput=()=>{soundtrack.setVolume('voice',Number(voiceSlider.value)/100);try{localStorage.setItem('man18-voice-volume',voiceSlider.value);}catch{}};
const voicePreview=document.createElement('button');voicePreview.textContent='试听当前角色语音 ♪';voicePreview.className='secondary';voicePreview.onclick=()=>{sound=true;updateSoundButton();soundtrack.enable(true);soundtrack.voiceLast.clear();soundtrack.voiceUntil=0;soundtrack.chatter({id:'preview',alive:true,x:0,y:0,look},'skill');};
$('#now-playing').before(voiceLabel,voiceSlider,voicePreview);
const audioHint=document.createElement('p');audioHint.className='panel-note';audioHint.textContent='首次点击后开启复古音乐 · 语音设为 0 可关闭角色台词';$('#entry-quick').append(audioHint);

// Short, contextual help: preview in the lobby; revisit without pausing a live match.
function helpText(zh,en){return document.documentElement.lang==='en'?en:zh;}
function modeHelp(mode){return ({
 endless:['活到最后就赢。A / D 移动，S 下落；别停在危险线上。','Last survivor wins. A / D move, S drops; keep away from the danger above.'],
 timed:['倒计时结束比谁更深。沙漏 +5 秒；提前死亡也会保留成绩。','Deepest at the buzzer wins. Hourglasses add 5s; elimination keeps your score.'],
 coop:['两个人一起下，按较浅的一人计分。队友濒死时，6 秒内靠近按住 E 救援。','Descend together; the shallower player sets team depth. Hold E nearby within 6s to revive.'],
 brawl:['最后存活者获胜。J 拳击，K 炸弹，Q 用道具，F 扔道具；炸弹也会伤到自己。','Last alive wins. J punch, K bomb, Q use, F throw. Your bombs can hurt you too.']
 })[mode]||modeHelp('endless');}
function heroHelp(skin){const descriptions=[
 ['菠萝轰炸','Pineapple barrage','连续投出 3 颗追踪菠萝，轰击妖王。','Launch three homing pineapple bombs.'],
 ['尖叫鸡突袭','Screaming chicken','放出尖叫鸡追击妖王，集中打击。','Release a screaming chicken to chase the boss.'],
 ['火箭齐射','Rocket salvo','发射 3 枚追踪火箭，连续命中。','Fire three homing rockets in a salvo.'],
 ['金角羊冲阵','Golden ram charge','召唤金角羊冲向妖王，集中撞击。','Summon a golden ram to charge the boss.'],
 ['鲸鱼喷泉','Whale fountain','释放鲸鱼水柱，追踪冲击妖王。','Unleash a homing whale fountain.'],
 ['蓝莓玄鲸炮','Deep-whale cannon','释放玄鲸炮追击妖王。','Fire a deep-whale cannon at the boss.']
 ];const h=descriptions[skin]||descriptions[0];return helpText(h[0],h[1])+' · '+helpText(h[2],h[3]);}
function updateQuickHelp(){
 for(const prefix of ['match','room']){const target=$('#'+prefix+'-quick-help');if(target){const lines=modeHelp($('#'+prefix+'-mode').value);target.textContent=helpText(...lines);const select=$('#'+prefix+'-mode');select.title=target.textContent;select.closest('.pixel-select')?.setAttribute('title',target.textContent);}}
 const editor=$('#hero-quick-help');if(editor)editor.textContent=heroHelp(draft.skin)+' '+helpText('灵气满 100：依次按 ↓ → J（或 ↓ ← J），1.2 秒内完成。方向键要分开按。','At 100 energy: enter ↓ → J (or ↓ ← J) within 1.2s. Press directions separately.');
 const current=$('#battle-quick-help');if(current){const player=game?.players.find(p=>p.id===myId);current.textContent=heroHelp(player?.look?.skin??look.skin)+' '+helpText('灵气满 100 后，↓ → J / ↓ ← J 搓招（1.2 秒内）。J 轻击 · I 重击破蓝槽 · K 近身踢击 / 远处投弹 · L 射击（需弹药）。','At 100 energy: ↓ → J / ↓ ← J within 1.2s. J light · I heavy breaks blue posture · K close kick / ranged bomb · L shoot (ammo required).');
 const box=current.parentElement;const boss=!!game?.bossArena;if(boss&&!box.dataset.bossSeen){box.open=true;box.dataset.bossSeen='yes';}if(!boss)delete box.dataset.bossSeen;
 }
}
for(const prefix of ['match','room']){
 const details=document.createElement('details');details.className='quick-help';details.open=true;
 const summary=document.createElement('summary');summary.textContent='玩法速读 / Quick guide';const text=document.createElement('p');text.id=prefix+'-quick-help';details.append(summary,text);$('#'+prefix+'-rules').after(details);$('#'+prefix+'-rules').hidden=true;
 $('#'+prefix+'-mode').addEventListener('change',updateQuickHelp);
}
const heroHint=document.createElement('p');heroHint.id='hero-quick-help';heroHint.className='hero-help';heroHint.setAttribute('aria-live','polite');$('#skin-hint').after(heroHint);
const battleHelp=document.createElement('details');battleHelp.className='quick-help';battleHelp.innerHTML='<summary>招式提示 / Move guide</summary><p id="battle-quick-help"></p>';$('#live-tip').parentElement.after(battleHelp);
for(const button of document.querySelectorAll('[data-skin]'))button.title=heroHelp(Number(button.dataset.skin));
new MutationObserver(()=>{updateQuickHelp();refreshLook();for(const button of document.querySelectorAll('[data-skin]'))button.title=heroHelp(Number(button.dataset.skin));}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
updateQuickHelp();

import './onboarding.js';

$('#podium').append($('#podium .retry-actions'));
const podiumShare=document.createElement('button');podiumShare.id='podium-share';podiumShare.className='primary';podiumShare.textContent='晒出我的称号 · 发起挑战 ↗';podiumShare.onclick=()=>document.querySelector('.poster-entry').click();$('#podium .retry-actions').before(podiumShare);

const mobileHelp=document.createElement('p');mobileHelp.id='mobile-controls-tip';mobileHelp.textContent='双手操作：左手移动 / 下落，右手跳跃；上排使用攻击和道具。';$('#touch-controls').after(mobileHelp);

$('#touch-controls>div').append($('#touch-controls [data-key=drop]'));

function renderCelebration(now){
 if($('#podium').hidden||document.hidden||!game||game.phase!=='finished'||now-celebrationFrame<80)return;
 celebrationFrame=now;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(const actor of celebrationActors){const c=actor.canvas.getContext('2d'),p=actor.player,t=now/1000+actor.offset,phase=t%3.2,win=game.rules.mode==='coop'||(game.players.length>1&&p.rank===1),jump=!reduced&&win&&phase<.85,hop=jump?Math.sin(phase/.85*Math.PI)*22:0;
 c.clearRect(0,0,150,180);c.save();c.fillStyle=win?'#d5b76055':'#7f97aa44';c.fillRect(35,162,80,5);c.restore();
 drawCharacter(c,p.look,75,161-hop,1.6,t,{action:reduced?'idle':jump?'jump':phase>2.2?'run':'idle',vx:!reduced&&!jump&&phase>2.2?Math.sin(t*6)*25:0,reducedMotion:reduced,bounce:jump?.3:0});
 if(win){c.fillStyle='#f9d16a';for(let k=0;k<3;k++){const x=43+k*30,y=12+(reduced?8:(t*22+k*31)%48);c.fillRect(x,y,5,5);}}
 }
}

// Invitation guidance uses authoritative room rules once connected.
const friendTips=document.createElement('div');friendTips.className='friend-tips';friendTips.dataset.noTranslate='';
friendTips.innerHTML='<strong></strong><p></p><button type="button"></button><small></small>';
$('#entry-friends').prepend(friendTips);
const joinedTips=document.createElement('p');joinedTips.className='friend-tips';joinedTips.dataset.noTranslate='';$('#room-members').before(joinedTips);
friendTips.querySelector('button').onclick=()=>{const identity=$('.lobby-identity');identity.scrollIntoView({block:'center',behavior:'smooth'});$('#nickname').focus();};
function updateFriendTips(){
 const tip=document.querySelector('#entry-friends .friend-tips');if(!tip)return;
 tip.querySelector('strong').textContent=helpText('朋友集合 · 10 秒准备','Friends incoming · 10-second setup');
 tip.querySelector('p').textContent=helpText('① 确认昵称和头像 → ② 点击加入 → ③ 看本局规则，等房主开局。','1. Pick your name and avatar → 2. Join → 3. Check the rules and wait for the host.');
 tip.querySelector('button').textContent=helpText('修改我的昵称 / 头像 ↗','Edit my name / avatar ↗');
 tip.querySelector('small').textContent=helpText('加入别人的房间时，玩法以房主设置为准；加入后会显示本局规则。','When joining, the host chooses the mode. The actual rules appear inside the room.');
 const joined=document.querySelector('#room-panel .friend-tips');if(joined&&room)joined.textContent=helpText('本局怎么玩：','This round: ')+helpText(...modeHelp(room.rules.mode))+(room.rules.mode==='timed'?helpText(' 基础时长 '+room.rules.duration+' 秒。',' Base time: '+room.rules.duration+' seconds.'):'')+helpText(' 每人 1 条命出发；空格跳跃。',' Start with 1 HP; Space jumps.');
}
updateFriendTips();new MutationObserver(updateFriendTips).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
if(params.has('room'))$('.lobby-identity').classList.add('invited');
// Measure actual controls instead of assuming a fixed header height inside embeds.
function fitPlayViewport(){
 if(!document.body.classList.contains('playing')||!document.body.classList.contains('immersive'))return;
 const arena=$('.arena-wrap'),box=$('.canvas-box');if(!arena||!box)return;
 let chrome=0;for(const child of arena.children)if(child!==box&&getComputedStyle(child).position!=='absolute'&&getComputedStyle(child).position!=='fixed')chrome+=child.getBoundingClientRect().height;
 const touch=matchMedia('(pointer:coarse)').matches;
 const dock=touch?($('#touch-controls').getBoundingClientRect().height+($('#coop-controls').hidden?0:$('#coop-controls').getBoundingClientRect().height)):0;
 const height=Math.max(100,(window.visualViewport?.height||innerHeight)-chrome-dock-32);
 const value=Math.floor(height)+'px';if(document.body.style.getPropertyValue('--play-height')!==value)document.body.style.setProperty('--play-height',value);
}
const playResize=new ResizeObserver(fitPlayViewport);for(const node of [$('.arena-top'),$('#coop-controls'),$('.arena-bottom')])if(node)playResize.observe(node);
new MutationObserver(fitPlayViewport).observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',fitPlayViewport);window.visualViewport?.addEventListener('resize',fitPlayViewport);
