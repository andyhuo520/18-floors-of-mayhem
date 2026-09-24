export const SAVE_KEY='man18-save-v1';
const VERSION=1;
export function decodeSave(raw){
 const s=JSON.parse(raw),g=s?.game;
 if(s?.version!==VERSION||!Number.isFinite(s.savedAt)||!g||g.phase!=='playing'||!Array.isArray(g.players)||!g.players.length||!Array.isArray(g.platforms)||!Array.isArray(g.items)||!Array.isArray(g.events)||!g.rules||!['endless','timed','brawl'].includes(g.rules.mode)||!Number.isFinite(g.t)||!Number.isFinite(g.camera)||!Number.isFinite(g.rng))throw Error('存档格式不兼容');
 const me=g.players.find(p=>p.id===s.playerId);
 if(!me||me.cpu||!me.alive||g.players.some(p=>p.id!==s.playerId&&!p.cpu)||g.players.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('存档角色无效');
 return s;
}
export function encodeSave(game,playerId,now=Date.now()){
 return JSON.stringify(decodeSave(JSON.stringify({version:VERSION,savedAt:now,playerId,game})));
}
export function readSave(storage){const raw=storage.getItem(SAVE_KEY);return raw?decodeSave(raw):null;}
export function writeSave(storage,game,playerId){const raw=encodeSave(game,playerId);storage.setItem(SAVE_KEY,raw);return decodeSave(raw);}
