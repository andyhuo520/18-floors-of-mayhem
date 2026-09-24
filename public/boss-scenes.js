import {drawSceneDressing} from './scene-dressing.js';
export const BOSS_SCENES=[
 ['花果山 · 水帘洞','#142a28','#47705a','tree'],['高庄夜寨','#252137','#906045','house'],['流沙古渡','#292c3b','#b09367','sand'],['焚风火山','#321923','#c06038','volcano'],['白骨荒寺','#251c35','#89788f','bone'],['三昧火窟','#361b21','#e88c4c','fire'],['盘丝悬桥','#241a34','#956b9e','web'],['雷音云海','#182b45','#7a94c2','thunder'],['黑莲天宫','#151629','#9c829e','lotus']
];
export const sceneArtPath=index=>'/combos-assets/scenery-v2/scene-'+index+'.webp';
const chapterArt=[];function chapterImage(i){if(!chapterArt[i]&&typeof Image!=='undefined'){const im=new Image();im.src=sceneArtPath(i);chapterArt[i]=im;}return chapterArt[i];}
export function drawBossBackdrop(c,index,t,w=900,h=680){
 index=((index%9)+9)%9;const [name,sky,stone]=BOSS_SCENES[index];c.save();c.scale(w/900,h/680);c.imageSmoothingEnabled=false;
 c.fillStyle=sky;c.fillRect(0,0,900,680);const im=chapterImage(index);
 // Each chapter owns a different image. Loading failures never substitute one shared arena.
 if(im?.naturalWidth)c.drawImage(im,0,0,900,680);
 else{c.fillStyle=stone+'44';for(let i=0;i<4;i++)c.fillRect(i*250,340-i%2*70,170,340+i%2*70);}
 drawSceneDressing(c,index,t);c.font='14px "Fusion Pixel",monospace';c.fillStyle='#e3d1ac';c.textAlign='left';c.fillText(name,22,120);c.restore();
}
