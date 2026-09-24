// Combos-generated art is rendered behind collision geometry, on the 300px grid.
let sprite,failed=false,previewStarted=-Infinity;
export const chapterGuardian=chapter=>[0,0,0,1,2,1,0,2,2][chapter%9]??0;
export const GUARDIANS=[{name:'苔角守望者',color:'#b8d98b'},{name:'熔心牛魔',color:'#f2a16e'},{name:'星渊水母',color:'#b7bbf8'}];
export function guardianKind(kind){return ['fire','mars','asteroid'].includes(kind)?1:['moon','ice','nebula','orbit','blackhole'].includes(kind)?2:0;}
export function guardianPose(t,index=0,preview=false){
 const clock=preview?t:(t+index*1.7)%24;
 const phase=Math.max(0,clock%24);
 const approach=phase<3?phase/3:phase<7?1:phase<10?1-(phase-7)/3:0;
 return {visible:phase<10,approach,reach:phase<4?0:phase<5?(phase-4):phase<6?1:phase<7?7-phase:0,alpha:.12+.38*approach,side:Math.floor(t/24+index)%2,stage:phase<3?'窥视':phase<4?'靠近':phase<7?'伸爪':'退场'};
}
export function previewGuardian(t){previewStarted=t;}
export function drawGuardian(ctx,kind,t,reduced=false,{showcase=false,index:chosen,started=0}={}){
 if(!sprite&&!failed&&typeof Image!=='undefined'){sprite=new Image();sprite.onerror=()=>{failed=true;};sprite.src='/combos-assets/guardian-cutouts.webp';}
 if(!sprite?.complete||!sprite.naturalWidth||failed)return false;
 const index=chosen??guardianKind(kind),manual=t-previewStarted>=0&&t-previewStarted<10;
 const pose=showcase?{visible:true,approach:1,reach:0,alpha:.78,side:0}:reduced?{visible:true,approach:.25,reach:0,alpha:.16,side:index%2}:guardianPose(manual?t-previewStarted:t,index,manual);
 if(!pose.visible)return true;
 const side=pose.side,clock=manual?t-previewStarted:t-started;
 const x=showcase?(reduced?40:35+Math.sin(clock*.55)*23):side?268-pose.approach*45:-52+pose.approach*45,y=showcase?18+(reduced?0:Math.sin(clock*.9)*8):45+(reduced?0:Math.round(Math.sin(t*.7)*5)),w=showcase?88:84,h=showcase?140:154;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=pose.alpha;ctx.globalCompositeOperation='source-over';
 const sw=sprite.naturalWidth/3;
 ctx.drawImage(sprite,index*sw,0,sw,sprite.naturalHeight,Math.round(x),y,w,h);
 if(showcase){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.9;ctx.fillStyle=GUARDIANS[index].color;ctx.font='5px "Fusion Pixel",monospace';ctx.textAlign='center';ctx.fillText(GUARDIANS[index].name+' · 神兽巡游',x+w/2,y+h+8);}
 ctx.restore();return true;
}
