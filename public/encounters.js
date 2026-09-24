let giantAtlas;
if(typeof Image!=='undefined'){giantAtlas=new Image();giantAtlas.src='/combos-assets/giant-attacks.webp';}
export function giantFrame(remaining){return remaining>1.4?0:remaining>.55?1:remaining>0?2:3;}
import {drawBossSkill} from './ultimate-vfx.js';
export const CHAPTER_GIANTS=[
 {name:'古藤龙首',patterns:['point','band']},{name:'吞仓獠口',patterns:['point','lanes']},{name:'沙海魔瞳',patterns:['band','point']},
 {name:'熔岩角兽',patterns:['lanes','point']},{name:'冥城骨掌',patterns:['point','lanes']},{name:'三昧狮首',patterns:['band','point']},
 {name:'千丝毒螯',patterns:['lanes','band']},{name:'雷鹏巨翼',patterns:['band','lanes']},{name:'虚空星触',patterns:['point','lanes']}
];
const giantSheets=[];
if(typeof Image!=='undefined')for(const name of ['giants-a','giants-b','giants-c']){const im=new Image();im.src='/combos-assets/world-v5/'+name+'.webp';giantSheets.push(im);}
export function createEncounter(g,index,p){
 const chapter=Math.max(0,Math.min(8,g.campaign?.chapter??g.clearedBosses??0)),def=CHAPTER_GIANTS[chapter],pattern=def.patterns[(index-1)%2],tier=Math.min(1,Math.max(0,(g.camera-1400)/10000));
 return {chapter,pattern,kind:pattern==='band'?'back':'front',x:Math.max(120,Math.min(780,p.x)),y:Math.max(g.camera+180,Math.min(g.camera+500,p.y-25)),radius:65+tier*25,at:g.t+Math.max(1.3,2.2-tier*.8+(g.difficulty==='easy'?.65:0)),done:false};
}
export function encounterBoxes(e){
 const pattern=e.pattern??(e.kind==='front'?'point':'band');
 if(pattern==='band')return [{x:25,y:e.y-38,w:850,h:76}];
 if(pattern==='lanes')return [-150,150].map(dx=>({x:Math.max(25,Math.min(785,e.x+dx-45)),y:e.y-130,w:90,h:260}));
 return [{x:e.x-e.radius,y:e.y-105,w:e.radius*2,h:210}];
}
// One target-locked strike at a time, with the same boxes used for warning and damage.
export function encounterStep(g,dt,hurt,record){
 if(g.camera<1400||g.bossArena||g.bossEntrance)return;
 const tier=Math.min(1,(g.camera-1400)/10000);
 if(!g.encounter&&g.t>=(g.nextEncounter||0)&&!g.elite&&!g.platforms.some(f=>f.beastPhase==='reach'||f.beastPhase==='grip'&&!f.broken)){
  const alive=g.players.filter(p=>p.alive&&!p.downed);if(!alive.length)return;
  const index=g.encounterIndex=(g.encounterIndex||0)+1,p=alive[(index-1)%alive.length];g.encounter=createEncounter(g,index,p);
  record(g,null,CHAPTER_GIANTS[g.encounter.chapter].name+'来袭 · '+({point:'巨物抬手时向两侧闪避',band:'看准起手，跳开横扫',lanes:'从两侧巨物之间穿过'}[g.encounter.pattern]),'巨物来袭');
 }
 const e=g.encounter;if(!e)return;
 if(g.t>=e.at&&!e.done){e.done=true;for(const p of g.players){const hit=encounterBoxes(e).some(r=>p.x>r.x&&p.x<r.x+r.w&&p.y-30>r.y&&p.y-30<r.y+r.h);if(p.alive&&!p.downed&&hit)hurt(g,p,'被'+(CHAPTER_GIANTS[e.chapter]?.name||'深渊巨物')+'击中');}}
 if(g.t>e.at+.45){g.encounter=null;g.nextEncounter=g.t+(g.campaign?.slot===4?11:14)-tier*6+(g.difficulty==='easy'?3:0);}
}
export function drawEncounter(c,g,camera,front=false){
 const e=g.encounter;if(!e||(e.kind==='front')!==front)return;
 const y=e.y-camera,remaining=e.at-g.t,attack=remaining<=0,frame=attack?(remaining>-.2?2:3):giantFrame(remaining),chapter=e.chapter??0;
 c.save();c.imageSmoothingEnabled=false;
 const boxes=encounterBoxes(e);
 const im=giantSheets[Math.floor(chapter/3)];
 const targets=e.pattern==='lanes'?boxes.map(r=>({x:r.x+r.w/2,y:r.y+r.h/2-camera})): [{x:e.x,y}];
 for(const target of targets){const size=e.pattern==='lanes'?220:300,yy=target.y-(attack?0:Math.max(0,remaining)*35);
  if(im?.naturalWidth){const sw=im.naturalWidth/4,sh=im.naturalHeight/3;c.save();c.translate(target.x,yy);if(target.x>450)c.scale(-1,1);c.drawImage(im,frame*sw,chapter%3*sh,sw,sh,-size/2,-size/2,size,size);c.restore();}
  else if(giantAtlas?.naturalWidth){const sw=giantAtlas.naturalWidth/4,sh=giantAtlas.naturalHeight/2;c.drawImage(giantAtlas,frame*sw,(front?0:1)*sh,sw,sh,target.x-size/2,yy-size/2,size,size);}
 }
 if(attack&&e.pattern==='band'){const kind=['golden','rake','sand','lava','bone','wheel','web','lightning','lotus'][chapter];for(let i=0;i<7;i++)drawBossSkill(c,kind,85+i*120,y,g.t-e.at,{width:125,height:86,facing:-1});}
 c.font='14px "Fusion Pixel",monospace';c.textAlign='center';c.fillStyle='#fff0c5';c.fillText((CHAPTER_GIANTS[chapter]?.name||'巨物')+' · '+(attack?'闪开！':Math.max(0,remaining).toFixed(1)+'s'),e.x,y-150);c.restore();
}
