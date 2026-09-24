// Loads the Combos-generated sprite sheets that tools/slice-atlas.py cut into single files.
// Every draw path keeps its procedural version: a sheet that fails to load must not blank the game.
const BASE='./combos-assets/sprites/';
const GROUPS={
 items:['heart','hourglass','shield','poison','platform-solid','platform-cracked','platform-collapsing','platform-conveyor','spikes-down','spikes-up','spring-idle','spring-fired'],
 beast:['eyes-hidden','eye-opening','eyes-glowing','head-out','arm-wind','arm-reach','claw-grip','arm-retract'],
 cave:['wall-roots','wall-pebbles','wall-vein','wall-root-vein','top-moss','top-rootbeam','top-cracked','top-vine','prop-vines','prop-leaves','prop-tendrils','prop-fruit'],
};
const images=new Map();
let started=false;

export function loadSprites(){
 if(started)return;started=true;
 for(const [group,names] of Object.entries(GROUPS))for(const name of names){
  const img=new Image();
  img.decoding='async';
  img.onload=()=>{if(img.naturalWidth)images.set(group+'/'+name,img);};
  img.onerror=()=>{};
  img.src=`${BASE}${group}/${name}.webp`;
 }
}

export function sprite(group,name){return images.get(group+'/'+name)||null;}
export function spritesReady(){return images.size>0;}

// Pixel art must never be resampled; every sheet is drawn nearest-neighbour on a 3px grid.
const snap=v=>Math.round(v/3)*3;

/** Draw a slab of arbitrary width without stretching its ends: fixed caps, tiled centre. */
export function drawSlab(ctx,img,x,y,w,h,cap=0.28){
 const sw=img.naturalWidth,sh=img.naturalHeight;
 const capSrc=Math.max(1,Math.floor(sw*cap));
 const scale=h/sh;
 const capDst=Math.max(3,snap(capSrc*scale));
 const smoothing=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
 if(w<=capDst*2){
  ctx.drawImage(img,0,0,sw,sh,snap(x),snap(y),Math.max(3,snap(w)),Math.max(3,snap(h)));
  ctx.imageSmoothingEnabled=smoothing;return;
 }
 const midSrc=sw-capSrc*2,midDst=w-capDst*2;
 ctx.drawImage(img,0,0,capSrc,sh,snap(x),snap(y),capDst,snap(h));
 // Tile rather than stretch so rock grain keeps a constant pixel size at any platform width.
 const step=Math.max(3,snap(midSrc*scale));
 for(let drawn=0;drawn<midDst;drawn+=step){
  const piece=Math.min(step,midDst-drawn);
  const src=Math.max(1,Math.round(piece/scale));
  ctx.drawImage(img,capSrc,0,src,sh,snap(x+capDst+drawn),snap(y),Math.max(3,snap(piece)),snap(h));
 }
 ctx.drawImage(img,sw-capSrc,0,capSrc,sh,snap(x+w-capDst),snap(y),capDst,snap(h));
 ctx.imageSmoothingEnabled=smoothing;
}

/** Draw a sprite centred on (x, y) at a target height, preserving its aspect ratio. */
export function drawSprite(ctx,img,x,y,targetH){
 const scale=targetH/img.naturalHeight,w=snap(img.naturalWidth*scale),h=snap(targetH);
 const smoothing=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
 ctx.drawImage(img,0,0,img.naturalWidth,img.naturalHeight,snap(x-w/2),snap(y-h/2),Math.max(3,w),Math.max(3,h));
 ctx.imageSmoothingEnabled=smoothing;
}
