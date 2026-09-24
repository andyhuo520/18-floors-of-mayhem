export const HERO_ART={pineapple:['heroes-a',0],chicken:['heroes-a',1],rocket:['heroes-a',2],ram:['heroes-b',0],whale:['heroes-b',1],leviathan:['heroes-b',2],wave:['heroes-b',2]};
export const BOSS_ART={golden:['boss-a',0],rake:['boss-a',1],sand:['boss-a',2],lava:['boss-b',0],bone:['boss-b',1],wheel:['boss-b',2],web:['boss-c',0],lightning:['boss-c',1],lotus:['boss-c',2]};
const sheets=new Map();
function sheet(name){if(!sheets.has(name)&&typeof Image!=='undefined'){const im=new Image();im.src='/combos-assets/skills-v4/'+name+'.webp';sheets.set(name,im);}return sheets.get(name);}
export function drawSkillArt(c,entry,x,y,age,{width=150,height=width,facing=1,frame,reduced=false}={}){
 if(!entry)return false;const im=sheet(entry[0]);if(!im?.naturalWidth)return false;
 const sw=im.naturalWidth/4,sh=im.naturalHeight/3,f=frame??(reduced?2:Math.floor(Math.max(0,age)*10)%4);
 c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));if(facing<0)c.scale(-1,1);
 c.drawImage(im,f*sw,entry[1]*sh,sw,sh,-width/2,-height/2,width,height);c.restore();return true;
}
export function drawGeneratedSkill(c,s,camera,t){
 return drawSkillArt(c,HERO_ART[s.skill],s.x,s.y-camera,t-(s.born??0),{width:s.skill==='rocket'?110:s.skill==='leviathan'||s.skill==='wave'?185:150,facing:s.vx<0?-1:1});
}
export function drawBossSkill(c,kind,x,y,age,options={}){return drawSkillArt(c,BOSS_ART[kind]||BOSS_ART.golden,x,y,age,options);}
export function drawImpact(c,kind,x,y,age,size=100){return drawSkillArt(c,['impacts',kind==='break'?1:kind==='smoke'?2:0],x,y,age,{width:size,frame:Math.min(3,Math.floor(Math.max(0,age)*12))});}
export function drawUltimate(c,g,camera,localId,reduced){
 c.save();
 for(const p of g.players){const age=g.t-(p.skillAt??-10);if(p.id!==localId||age<0||age>.85)continue;
  c.fillStyle='#ffe7aa';c.font='16px "Fusion Pixel",monospace';c.textAlign='center';c.fillText((p.comboMessage||'绝招出手').replace('！',''),Math.max(100,Math.min(800,p.x)),Math.max(36,p.y-camera-95));
 }
 for(const e of g.bossAudio||[]){const age=g.t-(e.at??-10);if(age<0||age>.32||!['impact','break','cannon'].includes(e.kind))continue;drawImpact(c,e.kind,e.x,e.y-camera,age,e.kind==='cannon'?140:100);}
 c.restore();
}
