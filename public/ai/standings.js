// The home-page leaderboard: which lab wins, kept per browser. Storage is injected so the ranking
// logic itself runs (and is tested) in Node, where localStorage does not exist.
const KEY='man18-ai-standings';

function load(storage){
 try{const raw=storage.getItem(KEY);const data=raw?JSON.parse(raw):null;return Array.isArray(data?.rows)?data:{rows:[],matches:[]};}
 catch{return {rows:[],matches:[]};}
}
function save(storage,data){try{storage.setItem(KEY,JSON.stringify(data));}catch{}}

/**
 * Record one finished match. `entries` are the AI participants:
 * {provider, model, name, meters, rank} — rank 1 counts as the win.
 * `matchId` de-duplicates: the same finished game arriving twice must not double-count.
 */
export function recordMatch(storage,matchId,entries){
 const data=load(storage);
 if(data.matches.includes(matchId))return false;
 data.matches.push(matchId);
 if(data.matches.length>200)data.matches.shift();
 for(const e of entries){
  const id=e.provider+'/'+(e.model||'');
  let row=data.rows.find(r=>r.id===id);
  if(!row){row={id,provider:e.provider,model:e.model||'',matches:0,wins:0,bestMeters:0,totalMeters:0};data.rows.push(row);}
  row.matches++;
  if(e.rank===1)row.wins++;
  row.bestMeters=Math.max(row.bestMeters,e.meters||0);
  row.totalMeters+=e.meters||0;
 }
 save(storage,data);
 return true;
}

/** Ranked rows: win rate first, then depth — a lab that wins shallow still beats one that loses deep. */
export function topStandings(storage,limit=8){
 const {rows}=load(storage);
 return rows
  .map(r=>({...r,winRate:r.matches?r.wins/r.matches:0,avgMeters:r.matches?Math.round(r.totalMeters/r.matches):0}))
  .sort((a,b)=>b.winRate-a.winRate||b.avgMeters-a.avgMeters||b.bestMeters-a.bestMeters)
  .slice(0,limit);
}

export function clearStandings(storage){try{storage.removeItem(KEY);}catch{}}

// ---- lessons: the model's own post-match notes, replayed into its next system prompt ------------
const LESSON_KEY='man18-ai-lessons';

export function recordLessons(storage,id,lessons){
 if(!lessons?.length)return;
 let data;
 try{data=JSON.parse(storage.getItem(LESSON_KEY)||'{}');}catch{data={};}
 if(typeof data!=='object'||!data)data={};
 const merged=[...(Array.isArray(data[id])?data[id]:[]),...lessons];
 // Newest last, capped: five short lines is memory, fifty is noise the prompt pays for.
 data[id]=merged.slice(-5);
 try{storage.setItem(LESSON_KEY,JSON.stringify(data));}catch{}
}

export function getLessons(storage,id){
 try{const data=JSON.parse(storage.getItem(LESSON_KEY)||'{}');return Array.isArray(data?.[id])?data[id]:[];}
 catch{return [];}
}

/** The audited list replaces the old one wholesale — survival of lessons is decided by results. */
export function replaceLessons(storage,id,lessons){
 let data;
 try{data=JSON.parse(storage.getItem(LESSON_KEY)||'{}');}catch{data={};}
 if(typeof data!=='object'||!data)data={};
 data[id]=(Array.isArray(lessons)?lessons:[]).slice(0,5);
 try{storage.setItem(LESSON_KEY,JSON.stringify(data));}catch{}
}

// ---- history: the last few match reports, replayed into a System One seat's state -----------
const HISTORY_KEY='man18-ai-history';

export function recordHistory(storage,id,report){
 let data;
 try{data=JSON.parse(storage.getItem(HISTORY_KEY)||'{}');}catch{data={};}
 if(typeof data!=='object'||!data)data={};
 // Three matches is a memory; more is a distraction the state pays tokens for.
 data[id]=[...(Array.isArray(data[id])?data[id]:[]),report].slice(-3);
 try{storage.setItem(HISTORY_KEY,JSON.stringify(data));}catch{}
}

export function getHistory(storage,id){
 try{const data=JSON.parse(storage.getItem(HISTORY_KEY)||'{}');return Array.isArray(data?.[id])?data[id]:[];}
 catch{return [];}
}
