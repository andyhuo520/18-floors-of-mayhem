import {drawGuardian} from './guardians.js';
const CW=300,CH=227;
import {WORLDS,WORLD_SPAN,worldIndex,BATTLEFIELDS} from './world-config.js';
import {sprite,drawSlab,drawSprite} from './sprites.js';
const CAVE_WALLS=['wall-roots','wall-pebbles','wall-vein','wall-root-vein'];
export {WORLDS,worldIndex};
let buffer,bc;
const hash=n=>{let v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const noise=Array.from({length:1100},(_,i)=>({x:Math.floor(hash(i+1)*300),y:Math.floor(hash(i+2200)*227)}));
function rgb(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));}
function mix(a,b,v){const x=rgb(a),y=rgb(b);return '#'+x.map((c,i)=>Math.round(c+(y[i]-c)*v).toString(16).padStart(2,'0')).join('');}
export function pixelBackground(ctx,scroll,t,preview=null){
 if(!buffer){buffer=document.createElement('canvas');buffer.width=CW;buffer.height=CH;bc=buffer.getContext('2d');}const c=bc;
 const index=preview??worldIndex(scroll),blend=preview!==null?0:Math.max(0,Math.min(1,(scroll%WORLD_SPAN-(WORLD_SPAN-300))/300));const z=WORLDS[index],next=WORLDS[Math.min(WORLDS.length-1,index+1)],pal=z.colors.map((a,i)=>mix(a,next.colors[i],blend));
 if(preview===null&&blend>0&&index<WORLDS.length-1){pixelBackground(ctx,scroll,t,index);ctx.save();ctx.globalAlpha*=blend;pixelBackground(ctx,scroll,t,index+1);ctx.restore();return;}
 const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
 rect(0,0,CW,CH,pal[0]);
 // Pixel dithering creates distant fog and nebulae instead of smooth vector gradients.
 for(let i=0;i<1100;i++){const {x,y}=noise[i],wave=Math.sin(x*.017+t*.22)*25;const light=Math.abs(y-110-wave)<45;
 if(light&&i%3!==0)rect(x,y,2,2,pal[1]);else if(i%8===0)rect(x,y,1,1,pal[1]);}
 // Ruined arcades and hanging gardens adapted from the generated art direction.
 if(['root','glow','water','crystal','fire','moon'].includes(z.kind)){
  for(let side=0;side<2;side++)for(let row=-1;row<4;row++){const yy=row*92-((scroll*.025)%92),xx=side?220:45;
   rect(xx,yy,7,76,pal[1]);rect(xx+28,yy,7,76,pal[1]);rect(xx+5,yy-4,25,6,pal[2]);rect(xx+10,yy-8,15,4,pal[1]);
   for(let j=0;j<5;j++){rect(xx,yy+j*15,7,1,pal[2]);rect(xx+28,yy+j*15,7,1,pal[2]);}
   if(['root','glow'].includes(z.kind)){rect(xx-2,yy-5,39,3,pal[3]);for(let j=0;j<6;j++)rect(xx+j*7,yy-2,2,4+(j%3)*3,pal[2]);}
  }
 }
 if(['moon','mars','asteroid','ice','nebula','orbit','blackhole'].includes(z.kind)){const px=z.kind==='moon'?228:z.kind==='mars'?74:224,py=57+Math.sin(t*.16)*5;const radius=['ice','orbit'].includes(z.kind)?28:z.kind==='nebula'?20:37;
  for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){if(x*x+y*y>radius*radius)continue;const shade=x+y*.5>radius*.25;let col=shade?pal[1]:pal[2];if(z.kind==='moon'&&!shade&&Math.sin(x*.17)+Math.cos(y*.32)+Math.sin((x+y)*.19)>.7)col=pal[3];if(['mars','moon'].includes(z.kind)&&hash(x*11+y*17)>.92)col=pal[3];rect(px+x,py+y,1,1,col);}
  if(['ice','orbit'].includes(z.kind)){for(let x=-49;x<50;x++){const y=Math.round(x*.29);if(Math.abs(x)>15)rect(px+x,py+y,3,1,pal[3]);}}
 }
 if(['moon','mars','asteroid','ice','nebula','orbit','blackhole'].includes(z.kind)){for(let i=0;i<140;i++){const x=hash(i+100)*300,y=(hash(i+470)*260-scroll*.012)%260;const yy=(y+260)%260;const bright=i%13===0;rect(x,yy,bright?2:1,bright?2:1,bright?pal[4]:pal[2]);if(bright&&Math.sin(t*1.6+i)>.7){rect(x-1,yy+1,4,1,pal[4]);rect(x+1,yy-1,1,4,pal[4]);}}
  for(let i=0;i<3;i++){const x=(t*18+i*109)%430-60,y=(i*71+t*5)%200;for(let j=0;j<10;j++)rect(x-j*2,y-j,2,1,j<2?pal[4]:pal[1]);}
 }
 // Four parallax strata frame a deep open shaft, with increasingly sparse rock in space.
 const wallScale=index>=6?.58:1;
 for(let layer=0;layer<3;layer++){const offset=scroll*(.025+layer*.025);for(let side=0;side<2;side++)for(let row=-2;row<19;row++){
  const globalRow=Math.floor(offset/19)+row,yy=row*19-(offset%19);const width=(35+hash(globalRow+side*213+layer*79)*25-layer*10)*wallScale;
  // Where the near wall carries a photographic-detail tile, the flat far strata have to recede or
  // the two styles read as two different games; push them towards the background colour.
  const recede=z.kind==='root'&&sprite('cave','wall-roots')?[.62,.4,0][layer]:0;
  const x=side?300-width:0;rect(x,yy,width,20,recede?mix(pal[[2,1,0][layer]],pal[0],recede):pal[[2,1,0][layer]]);
  if(layer===2){
   // The generated cavern tiles replace flat rock on the nearest wall of the root orchard only;
   // the sheet was drawn for that biome, and every other zone keeps its own palette.
   const tile=z.kind==='root'&&CAVE_WALLS[Math.abs(Math.floor(globalRow+side*3))%CAVE_WALLS.length];
   const img=tile&&sprite('cave',tile);
   if(img){
    c.save();c.imageSmoothingEnabled=false;c.globalAlpha=.92;
    c.drawImage(img,Math.round(x),Math.round(yy)-1,Math.ceil(width),22);
    c.restore();
   }else rect(side?300-width:width-2,yy+2,2,14,pal[2]);
   for(let j=0;j<4;j++){const xx=x+hash(globalRow*7+j+side*87)*width;rect(xx,yy+hash(j*11+globalRow)*16,3,2,pal[1]);}
  }
 }}
 if(['root','glow'].includes(z.kind)){
  const hanging=z.kind==='root'&&sprite('cave','prop-vines')?['prop-vines','prop-leaves','prop-tendrils']:null;
  if(hanging){
   c.save();c.imageSmoothingEnabled=false;
   for(let i=0;i<9;i++){
    const img=sprite('cave',hanging[i%hanging.length]);if(!img)continue;
    const x=i*36+hash(i)*18,h=26+hash(i+99)*26,w=h*img.naturalWidth/img.naturalHeight;
    // Fronds sway from their anchor; the shaft itself stays clear so landings stay readable.
    c.globalAlpha=.85;c.drawImage(img,Math.round(x+Math.sin(t*.9+i)*2),-4,Math.round(w),Math.round(h));
   }
   c.restore();
  }else for(let i=0;i<15;i++){const x=i*23+hash(i)*14,len=15+hash(i+99)*56;for(let yy=0;yy<len;yy+=3){const xx=x+Math.sin(yy*.09+i+t*1.4)*(2+yy*.05);rect(xx,yy,2,3,'#527d43');if(yy%9===0){rect(xx-4,yy,4,2,'#88a64e');rect(xx+2,yy+3,4,2,'#375f39');}}}
  const fruit=z.kind==='root'&&sprite('cave','prop-fruit');
  for(let i=0;i<12;i++){const y=((i*43-scroll*.1)%260+260)%260,x=i%2?272:20;
   if(fruit){c.save();c.imageSmoothingEnabled=false;c.drawImage(fruit,Math.round(x-4),Math.round(y-3),10,13);c.restore();continue;}
   rect(x,y,2,6,'#778064');rect(x-3,y-2,9,3,z.kind==='glow'?(i%2?'#c3a8ed':'#8de4c9'):(i%3===0?'#b5d58c':'#648a67'));}
 }
 if(['mars','fire'].includes(z.kind)){for(let i=0;i<10;i++){const y=((i*37-scroll*.1)%260+260)%260,x=i%2?284:8;rect(x,y,3,12,'#9b5844');rect(x+2,y+9,7,2,'#d58957');}}
 if(z.kind==='water'){for(let i=0;i<6;i++){const x=30+i*47;for(let yy=0;yy<227;yy+=6){rect(x+Math.sin(yy*.09+t)*2,yy,2,4,pal[i%2?1:2]);}}for(let i=0;i<24;i++){const x=hash(i+35)*270+15,y=((i*23-t*8-scroll*.04)%227+227)%227;rect(x,y,2,2,pal[3]);}}
 if(['crystal','ice'].includes(z.kind)){for(let i=0;i<14;i++){const x=i%2?277:17,y=((i*33-scroll*.06)%255+255)%255;for(let r=0;r<9;r++)rect(x-r/2,y+r*2,1+r,2,r%2?pal[3]:pal[2]);rect(x+2,y+5,2,13,pal[4]);}}
 if(z.kind==='moon'){for(let i=0;i<4;i++){const x=i%2?265:24,y=((i*75-scroll*.07)%265+265)%265;rect(x,y,9,20,pal[2]);rect(x-5,y-2,19,3,pal[3]);rect(x+3,y+4,3,7,pal[0]);}}
 if(z.kind==='asteroid'){for(let i=0;i<17;i++){const x=hash(i+26)*260+20,y=((i*31-scroll*.025+t*2)%270+270)%270,sz=3+hash(i+87)*6;rect(x,y,sz,sz,pal[2]);rect(x+2,y+1,sz-2,2,pal[3]);}}
 if(z.kind==='blackhole'){for(let yy=-18;yy<19;yy++){const half=Math.sqrt(Math.max(0,1-yy*yy/361))*66;rect(215-half,64+yy*.28,half*2,1,yy%3?pal[2]:pal[3]);}for(let yy=-27;yy<=27;yy++){const half=Math.sqrt(729-yy*yy);rect(215-half,64+yy,half*2,1,pal[0]);}rect(184,62,62,2,pal[3]);}
 for(let i=0;i<28;i++){const x=(hash(i+78)*300+Math.sin(t*.25+i)*5),y=((hash(i)*227-scroll*.04-t*4)%227+227)%227;rect(x,y,1,i%3===0?2:1,i%4===0?pal[4]:pal[2]);}
 // Original background creatures: silhouette, anticipation, reach, recoil.
 // Visual only: damage remains tied to the visible gameplay hazards.
 const creature=[
 '  hh         hh  ','  hhh       hhh  ','   hhbbbbbbbhh   ',
 '  bbbbbbbbbbbbb  ',' bbbbeebbbeebbbb ',' bbbbEEbbbEEbbbb ',
 'bbbbbbbbbbbbbbbbb',' bbbbfffffffbbbb ','  bbbf f f fbbb  ',
 '   bbbbbbbbbbb   ','  bbbbbbbbbbbbb  ',' bbbbbbbbbbbbbbb ',
 'bbbb bbbbbbb bbbb','bbb   bbbbb   bbb',' bb   bb bb   bb '];
 const cosmic=['ice','nebula','orbit','blackhole'].includes(z.kind),aquatic=z.kind==='water';
 const generatedGuardian=drawGuardian(c,z.kind,t,typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 for(let side=0;side<(generatedGuardian?0:2);side++){
  const phase=((t+side*4.3+index*.7)%10)/10,reach=phase<.58?0:phase<.68?(phase-.58)/.1:phase<.80?1:Math.max(0,1-(phase-.80)/.20);
  const facing=side?-1:1,cx=side?265-reach*9:35+reach*9,cy=85+side*79+Math.sin(t*.55+side*3)*13;
  const skin=pal[1],rim=pal[2],eye=phase>.48&&phase<.82?(cosmic?'#d2b6e9':aquatic?'#9fe9d4':'#f4a46c'):pal[3];
  // Segmented arms emerge towards the open shaft, with hooked fingers.
  for(let arm=0;arm<2;arm++){const base=cy+15+arm*15,extent=18+reach*42;
   for(let j=0;j<extent;j+=3){const yy=base+Math.sin(j*.075+t*.7)*6;rect(cx+facing*j,yy,5,5,skin);rect(cx+facing*j,yy,4,1,rim);}
   const hx=cx+facing*extent,hy=base+Math.sin(extent*.075+t*.7)*6;
   for(let finger=0;finger<3;finger++){rect(hx+facing*finger*3,hy+finger*4,5,2,rim);rect(hx+facing*(finger*3+4),hy+finger*4,2,5,pal[3]);}
  }
  creature.forEach((row,yy)=>[...row].forEach((v,xx)=>{if(v===' ')return;const color=v==='E'?eye:v==='e'?rim:v==='f'?pal[3]:v==='h'?rim:skin;
   rect(cx+(xx-8)*2,cy+(yy-5)*2+Math.sin(t+side)*1.5,2,2,color);
  }));
  if(cosmic){for(let tentacle=0;tentacle<4;tentacle++)for(let j=0;j<12;j++){const xx=cx+(tentacle-1.5)*8+Math.sin(j*.4+t*1.2+tentacle)*5;rect(xx,cy+19+j*2,3,3,j%3===0?rim:skin);}}
  else if(!aquatic){for(let wing=0;wing<2;wing++)for(let j=0;j<8;j++)rect(cx+(wing?1:-1)*(14+j*2),cy-2+j+Math.sin(t*1.5)*j,3,11-j,skin);}
 }
 // Hand-authored arcade animation motifs, on the same 300px pixel grid.
 // Keep bright detail near the edges so platforms and characters stay readable.
 const wrap=(v,n)=>(v%n+n)%n;
 const spark=(x,y,size,col)=>{rect(x-size,y,size*2+1,1,col);rect(x,y-size,1,size*2+1,col);};
 if(['root','glow'].includes(z.kind)){
  for(let i=0;i<22;i++){const x=20+hash(i+938)*260+Math.sin(t*.9+i)*9,y=wrap(hash(i+332)*250-scroll*.055-t*(3+i%3),250);
   if(z.kind==='glow'){if(Math.sin(t*2.2+i)>.1)spark(x,y,i%4===0?2:1,pal[3]);}
   else{rect(x,y,4,2,pal[3]);rect(x+Math.sin(t*3+i)*2,y+2,2,2,pal[2]);}
  }
 }
 if(z.kind==='water'){
  for(const x of [39,251]){rect(x,0,9,227,pal[1]);for(let j=0;j<25;j++){const y=wrap(j*13+t*48-scroll*.08,240)-7;rect(x+2+Math.sin(j+t)*2,y,2,5+j%4,pal[3]);rect(x+6,y+4,1,7,pal[2]);}}
  for(let i=0;i<8;i++){const phase=wrap(t*.8+i*.31,1),x=i%2?259:43,y=wrap(i*39-scroll*.09,250);const w=4+phase*19;c.globalAlpha=(1-phase)*.7;rect(x-w/2,y,w,1,pal[4]);rect(x-w/2-2,y-2,2,2,pal[3]);rect(x+w/2,y-2,2,2,pal[3]);}c.globalAlpha=1;
 }
 if(['fire','mars'].includes(z.kind)){
  for(const edge of [11,278]){for(let j=0;j<42;j++){const y=wrap(j*7-scroll*.09+t*12,240)-7,flow=Math.sin(j*.8+t*2)*3;rect(edge+flow,y,5+Math.sin(t*3+j)*2,8,pal[2]);rect(edge+flow+2,y,2,4,pal[3]);}}
  for(let i=0;i<24;i++){const phase=wrap(t*.5+i*.173,1),x=(i%2?269:24)+Math.sin(i+t)*12,y=wrap(i*37-scroll*.08-phase*75,240);rect(x,y,2,3,pal[3]);if(i%3===0)rect(x,y+5,1,4,pal[2]);}
 }
 if(['crystal','ice'].includes(z.kind)){
  for(let i=0;i<12;i++){const phase=wrap(t*.65+i*.23,1),x=i%2?279:20,y=wrap(i*33-scroll*.06,255)+9;if(phase<.3)spark(x,y,phase<.15?3:1,pal[4]);}
  if(z.kind==='ice')for(let i=0;i<28;i++){const x=wrap(hash(i+819)*300+t*(2+i%3),300),y=wrap(i*19+t*11-scroll*.05,240);rect(x,y,i%4===0?2:1,2,pal[3]);}
 }
 if(z.kind==='moon'){
  for(let i=0;i<7;i++){const x=i%2?274:30,y=wrap(i*47-scroll*.07,265);rect(x,y,2,2,Math.sin(t*2+i)>.4?pal[4]:pal[2]);}
 }
 if(['asteroid','nebula','orbit','blackhole'].includes(z.kind)){
  const velocity=1+Math.min(scroll/6000,2);
  for(let layer=0;layer<3;layer++)for(let i=0;i<16;i++){const x=hash(i+layer*53+201)*300,y=wrap(i*29+layer*81-t*(7+layer*12)*velocity-scroll*(.015+layer*.012),247)-10;
   c.globalAlpha=.35+layer*.22;rect(x,y,1,1+layer*2+velocity,pal[layer===2?4:2]);}c.globalAlpha=1;
 }
 if(z.kind==='nebula'){
  for(let i=0;i<55;i++){const a=i*.37+t*.1,rad=18+i*.8,x=204+Math.cos(a)*rad,y=65+Math.sin(a)*rad*.4;c.globalAlpha=.3;rect(x,y,5,2,pal[i%2?2:3]);}c.globalAlpha=1;
 }
 if(['ice','orbit','blackhole'].includes(z.kind)){
  const cx=z.kind==='blackhole'?215:224,cy=z.kind==='blackhole'?64:57+Math.sin(t*.16)*5;
  for(let i=0;i<48;i++){const a=i*Math.PI/24+t*(z.kind==='blackhole'?1.1:.35),radius=z.kind==='blackhole'?35+(i%4)*8:44;const x=cx+Math.cos(a)*radius,y=cy+Math.sin(a)*radius*.24+(z.kind==='blackhole'?0:Math.cos(a)*11);if(Math.sin(a)>0||Math.abs(Math.cos(a))>.72)rect(x,y,i%3===0?3:2,1,pal[i%4===0?4:3]);}
 }
 // Close, fast-moving debris gives the shaft depth without covering the landing corridor.
 for(let i=0;i<10;i++){const x=i%2?290-hash(i+61)*8:hash(i+81)*8,y=wrap(i*37-scroll*.16-t*7,257)-15;rect(x,y,3,5,pal[2]);rect(x,y,2,2,pal[3]);}
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(buffer,0,0,900,680);ctx.restore();
}
// Which generated slab stands in for each platform type; anything absent stays procedural.
const SLAB={solid:'platform-solid',crumble:'platform-cracked',conveyor:'platform-conveyor',moving:'platform-solid',spring:'platform-solid',pulse:'platform-solid'};
const SLAB_H=30;

/** Mechanism and state overlays drawn on top of a generated slab. */
function decorateSlab(ctx,f,x,y,w,t){
 if(f.type==='spring'){
  const fired=f.compressedAt&&t-f.compressedAt<.3;
  const img=sprite('items',fired?'spring-fired':'spring-idle');
  if(img)drawSprite(ctx,img,x+w/2,y-(fired?24:12),fired?42:24);
 }
 if(f.type==='pulse'){
  const img=sprite('items',f.active?'spikes-up':'spikes-down');
  if(img)for(let i=Math.floor(w*.2);i<w*.85;i+=Math.max(48,Math.floor(w/3)))drawSprite(ctx,img,x+i,y-(f.active?18:6),f.active?33:12);
  // The warning beat has to be legible before the spikes exist, not only once they hurt.
  if(f.warning){ctx.fillStyle='#ffe9af';ctx.fillRect(Math.round((x+w/2-3)/3)*3,y-30,6,12);ctx.fillRect(Math.round((x+w/2-3)/3)*3,y-15,6,3);}
 }
 if(f.type==='moving'){ctx.fillStyle='#a7d7dd';ctx.fillRect(x-12,y+6,6,3);ctx.fillRect(x+w+6,y+6,6,3);}
 if(f.breakAt){
  const fraction=Math.min(1,Math.max(0,f.breakAt-t)/1.05);
  ctx.fillStyle='#ffe3b3';ctx.fillRect(x,y-9,Math.round(w*fraction/3)*3,3);
 }
 if(f.branch){ctx.fillStyle='#f4c58b';ctx.font='12px "Fusion Pixel"';ctx.textAlign='center';ctx.fillText('险路 · 易碎',x+w/2,y+48);}
}

export function pixelPlatform(ctx,f,scroll,t){
 if(f.broken)return;const y=Math.round((f.y-scroll)/3)*3;if(y< -40||y>710)return;const x=Math.round(f.x/3)*3,w=Math.floor(f.w/3)*3;
 if(f.stage!==undefined){
  const z=WORLDS[f.stage],material=z.colors[2],light=z.colors[3];
  const rect=(a,b,ww,hh,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(a/3)*3,Math.round(b/3)*3,ww,hh);};
  for(let j=0;j<w;j+=12){const depth=15+Math.round((Math.sin(j*.13+f.stage)+1)*9);rect(x+j,y+15,12,depth,material);rect(x+j,y+18,3,depth-3,light);}
  if([1,4,5].includes(f.stage))for(let j=18;j<w;j+=42){rect(x+j,y+32,15,12,light);rect(x+j+3,y+44,9,6,material);if(f.compressedAt&&t-f.compressedAt<.4)for(let k=0;k<5;k++)rect(x+j+(k%2)*3,y-12-k*9,6,6,z.colors[4]);}
  if([2,6,10].includes(f.stage))for(let j=0;j<w-12;j+=24){const xx=x+((j+t*45)%w);rect(xx,y+29,9,3,light);}
  if([3,7,8,9].includes(f.stage))for(let j=18;j<w;j+=36){rect(x+j,y+27,12,18,light);rect(x+j+3,y+45,6,9,material);}
  if(f.stage===11){rect(x+w/2-9,y+25,18,30,light);rect(x+w/2-21,y+43,42,6,material);}
  ctx.fillStyle=z.colors[4];ctx.font='11px "Fusion Pixel",monospace';ctx.textAlign='center';ctx.fillText(BATTLEFIELDS[f.stage].name,x+w/2,y+76);
 }
 if(f.orchard){
  const rect=(xx,yy,ww,hh,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(xx/3)*3,Math.round(yy/3)*3,ww,hh);};
  const warning=f.breakAt&&f.breakAt-t<1.2;
  if(f.orchard==='fruit'){
   const center=x+w/2;
   for(let j=0;j<18;j++)rect(center+Math.sin(j*.35)*6,y-135+j*8,3,9,'#456747');
   rect(center-15,y-15,30,9,'#abd575');rect(center+6,y-24,18,9,'#5c9c56');
   for(let j=0;j<7;j++){const inset=Math.abs(j-2)*6;rect(x+inset,y+j*6,w-inset*2,6,warning?'#f6b367':f.fruitColor?'#b991cc':'#c58a56');}
   rect(x,y,w,4,'#f5dfa0');rect(x+15,y+12,9,15,'#ffe5ab');
  }else{
   for(let offset=0;offset<w;offset+=6){const yy=y+(offset-w/2)*(f.tilt||0);rect(x+offset,yy,6,24,'#654939');rect(x+offset,yy+6,6,5,'#a67b4b');rect(x+offset,yy-3,6,6,warning?'#f5bc75':'#a5c775');if(offset%30===0)rect(x+offset,yy+17,12,12,'#3b352d');}
   for(let j=0;j<5;j++){const xx=x+30+j*55;for(let k=0;k<5;k++)rect(xx+Math.sin(k+j)*6,y+27+k*9,3,12,'#456646');rect(xx+6,y+47,12,6,'#688b49');}
   if(f.breakAt){for(let j=0;j<4;j++)rect(x+w/2+j*5,y+j*5,4,8,warning?'#ffe3a1':'#231f28');}
   ctx.font='12px "Fusion Pixel",monospace';ctx.textAlign='center';ctx.fillStyle=warning?'#ffe3a1':'#d5e3ad';ctx.fillText(f.breakAt?'树枝断裂 · '+Math.max(0,f.breakAt-t).toFixed(1)+'s':'倒悬果园 · 重心决定倾斜',x+w/2,y+92);
  }
  if(warning){for(let j=0;j<5;j++)rect(x+j*w/5,y+30+((t*65+j*17)%48),3,6,'#dcb374');}
  return;
 }
 if(f.type!=='seesaw'){
  // A crumbling platform switches sheets as its timer runs out, so the warning stays readable.
  let key=SLAB[f.type];
  if(f.type==='crumble'&&f.breakAt){const remaining=Math.max(0,f.breakAt-t);key=remaining<.4?'platform-collapsing':'platform-cracked';}
  const img=key&&sprite('items',key);
  if(img){
   drawSlab(ctx,img,x,y-6,w,SLAB_H);
   decorateSlab(ctx,f,x,y,w,t);
   return;
  }
 }const colors={solid:['#9bb779','#526c52','#293d3d'],crumble:['#d9ad7c','#8b675c','#4d404a'],moving:['#a7d7dd','#597e9e','#303c62'],spring:['#c7a4eb','#806499','#473657'],conveyor:['#81dbbc','#417e72','#274c52'],pulse:f.active?['#ffa29b','#b6516b','#5a2a45']:f.warning?['#ffe4a5','#b58b62','#625244']:['#a498b9','#6d6085','#3e344f']};let [top,face,dark]=colors[f.type]||colors.solid;if(f.type==='solid'){const pal=WORLDS[worldIndex(scroll)].colors;top=mix(pal[3],'#f0ead0',.35);face=pal[2];dark=pal[1];}
 if(f.type==='seesaw'){
  ctx.fillStyle='#bd8f61';ctx.fillRect(x+w/2-9,y+8,18,30);ctx.fillStyle='#efce8b';ctx.fillRect(x+w/2-15,y+26,30,9);
  for(let offset=0;offset<w;offset+=6){const yy=Math.round((y+(offset-w/2)*(f.tilt||0))/3)*3;ctx.fillStyle=offset<w/2?'#719cd2':'#d798b0';ctx.fillRect(x+offset,yy,6,12);ctx.fillStyle='#f6dfa3';ctx.fillRect(x+offset,yy-3,6,3);}
  ctx.fillStyle='#172039';ctx.font='bold 15px monospace';ctx.fillText('↥',x+18,y-10);ctx.fillText('↥',x+w-27,y-10);return;
 }
 const box=(a,b,c,d,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(a/3)*3,Math.round(b/3)*3,Math.max(3,Math.round(c/3)*3),Math.max(3,Math.round(d/3)*3));};
 for(let i=6;i<w-12;i+=18){const depth=12+((i+(f.id??f.layer)*7)%19);box(x+i,y+15,15,depth,dark);box(x+i,y+17,3,depth-4,face);}
 box(x+3,y+6,w,18,dark);box(x,y,w,15,face);box(x,y-3,w,6,top);box(x,y+15,w-6,3,dark);
 for(let i=9;i<w-9;i+=27){box(x+i,y+9,9,3,dark);if(f.type==='solid')box(x+i,y-6,i%2?9:15,3,top);if(f.type==='crumble'){box(x+i,y,3,6,dark);box(x+i+3,y+6,6,3,dark);}}
 if(f.type==='spring'&&f.compressedAt&&t-f.compressedAt<.3){const h=Math.sin((t-f.compressedAt)/.3*Math.PI)*7;box(x+6,y+6,w-12,h+3,top);}
 if(f.type==='spring')for(let i=12;i<w-9;i+=24){box(x+i,y+6,12,3,top);box(x+i+3,y+9,6,3,top);}
 if(f.type==='conveyor')for(let i=0;i<w-12;i+=30){const xx=x+((i+t*(f.layer%2?65:-65))%w+w)%w;box(xx,y+6,6,3,dark);box(xx+(f.layer%2?3:-3),y+9,6,3,dark);}
 if(f.type==='pulse'){for(let i=9;i<w-9;i+=24){const h=f.active?18:f.warning?6:3;box(x+i,y-h,3,h,top);if(f.active)box(x+i-3,y-9,9,6,top);}if(f.warning){box(x+w/2-3,y-30,6,12,'#ffe9af');box(x+w/2-3,y-15,6,3,'#ffe9af');}}
 if(f.breakAt){const remaining=Math.max(0,f.breakAt-t),fraction=Math.min(1,remaining/1.05);box(x,y-3,w*fraction,3,'#ffe3b3');for(let j=0;j<Math.ceil((1-fraction)*5);j++){const cx=x+w*(j+1)/6;box(cx,y,3,12,dark);box(cx+3,y+6,6,3,dark);}}
 if(f.branch){ctx.fillStyle='#f4c58b';ctx.font='12px "Fusion Pixel"';ctx.textAlign='center';ctx.fillText('险路 · 易碎',x+w/2,y+48);}
 if(f.type==='moving'){box(x-12,y+6,6,3,top);box(x+w+6,y+6,6,3,top);}
}

const ITEM_PIXELS={
 heart:['  rr rr  ',' rRRRRRr ','rRRWRRRRr','rRRRRRRRr',' rRRRRRr ','  rRRRr  ','   rRr   ','    r    '],
 time:['yyyyyyyyy',' y     y ','  ywwwy  ','   ywy   ','    y    ','   ywy   ','  ywwwy  ',' ywwwwwy ','yyyyyyyyy'],
 shield:['    g    ',' gggGggg ','gGGGWGGGg','gGGWGGGGg','gGGGGGGGg',' gGGGGGg ','  gGGGg  ','   gGg   ','    g    '],
 poison:[' p  g  p ','  pgggp  ',' pPPPPPp ','pPPwPwPPp',' pPPPPPp ','pPPwwwPPp',' pPPPPPp ','  pPPp   ',' p    p  ']};
// The wall beast that claims a platform. Drawn on the arena canvas rather than the background
// buffer so the claw stays locked to the slab it is about to take.
export function pixelBeast(ctx,f,scroll,t){
 if(!f.beast)return;
 const y=Math.round((f.y-scroll)/3)*3;if(y<-140||y>800)return;
 const left=f.beast==='left',phase=f.beastPhase||'lurk';
 const head=phase==='lurk'?'eyes-hidden':phase==='warn'?(Math.sin(t*7)>-.2?'eyes-glowing':'eye-opening'):'head-out';
 const headImg=sprite('beast',head);
 const snap=v=>Math.round(v/3)*3;
 const headH=phase==='lurk'?72:phase==='warn'?90:108;
 const wallX=left?0:900;
 ctx.save();ctx.imageSmoothingEnabled=false;
 if(!left){ctx.translate(900,0);ctx.scale(-1,1);}
 if(headImg){
  const w=snap(headH*headImg.naturalWidth/headImg.naturalHeight);
  ctx.globalAlpha=phase==='lurk'?.72:1;
  ctx.drawImage(headImg,snap(-w*.28),snap(y-headH/2),w,snap(headH));
 }
 if(phase==='reach'||phase==='grip'){
  // The generated grip frame carries its own slab; next to the real platform that reads as two
  // platforms, so the open claw is used right up to the break and the torn slab only after it.
  const armName=f.broken?'arm-retract':'arm-reach';
  const armImg=sprite('beast',armName);
  if(armImg){
   // The arm spans from the wall to the near edge of its platform, so the grab reads as contact.
   const edge=left?f.x:900-(f.x+f.w);
   const span=Math.max(90,Math.min(430,edge+36));
   const h=snap(span*armImg.naturalHeight/armImg.naturalWidth);
   ctx.globalAlpha=f.broken?.7:1;
   ctx.drawImage(armImg,snap(-18),snap(y-h*.46),snap(span),h);
  }
 }
 ctx.restore();
 if(phase!=='grip'){
  // The slab is marked from the moment it enters the screen: the beast sits at the edge of vision
  // while you are choosing where to land, so the platform itself has to carry the warning.
  ctx.save();ctx.globalAlpha=phase==='lurk'?.3:.55+Math.sin(t*9)*.3;ctx.fillStyle='#ffb347';
  const cx=snap(f.x+f.w/2);
  for(const dx of [-9,0,9])ctx.fillRect(cx+dx,snap(y-24),6,6);
  ctx.restore();
 }
}

const ITEM_SPRITE={heart:'heart',time:'hourglass',shield:'shield',poison:'poison'};

export function pixelItem(ctx,item,camera,t){
 if(item.type==='freeze'){ctx.save();ctx.fillStyle='#417f9f';ctx.fillRect(item.x-12,item.y-camera-12,24,24);ctx.fillStyle='#c5f9ff';ctx.fillRect(item.x-3,item.y-camera-16,6,32);ctx.fillRect(item.x-16,item.y-camera-3,32,6);ctx.fillRect(item.x-9,item.y-camera-9,18,18);ctx.restore();return;}

 const colors={r:'#9c354e',R:'#ff647a',w:'#fff1ba',W:'#fff1ba',y:'#efc368',g:'#357c76',G:'#81e4b4',p:'#663b8e',P:'#b479e4'};
 const pixels=ITEM_PIXELS[item.type];if(!pixels)return;
 const y=Math.round((item.y-camera+Math.sin(t*3+item.x)*4)/3)*3;if(y< -40||y>710)return;
 ctx.save();const x=Math.round(item.x/3)*3;ctx.fillStyle='#10182bbb';ctx.fillRect(x-18,y-18,36,36);
 const img=sprite('items',ITEM_SPRITE[item.type]);
 if(img)drawSprite(ctx,img,x,y,30);
 else pixels.forEach((row,j)=>[...row].forEach((v,i)=>{if(v!==' '){ctx.fillStyle=colors[v];ctx.fillRect(x+(i-4)*3,y+(j-4)*3,3,3);}}));
 ctx.fillStyle=item.type==='poison'?'#d0a3eb':'#fff1ba';if(Math.sin(t*4+item.x)>.4){ctx.fillRect(x-21,y-8,3,3);ctx.fillRect(x+18,y+5,3,3);}ctx.restore();
}

// A carried shield used to be a plain stroked rectangle around the character. It reads as a UI
// selection box rather than a barrier, and it sits at odds with everything else being drawn as
// chunky pixels. This draws a hexagonal energy shell on the same 3px grid: a stepped rim, a
// rotating highlight so it feels powered, and a shatter burst on the frame it absorbs a hit.
// Sized to clear the tallest headgear: a shell that clips the character reads as a crop, not a barrier.
const SHELL_RX=42, SHELL_RY=50, SHIELD_STEP=3;

/** Points of a hexagonal shell, snapped to the pixel grid the rest of the arena uses. */
function shellPoints(cx,cy,rx,ry){
 const pts=[];
 for(let i=0;i<6;i++){
  const a=Math.PI/2+i*Math.PI/3;
  pts.push([Math.round((cx+Math.cos(a)*rx)/SHIELD_STEP)*SHIELD_STEP,
            Math.round((cy+Math.sin(a)*ry)/SHIELD_STEP)*SHIELD_STEP]);
 }
 return pts;
}

function shellPath(ctx,pts){
 ctx.beginPath();
 pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
 ctx.closePath();
}

/**
 * @param break0 seconds since the shield absorbed a hit, or null while it is simply held.
 */
export function pixelShield(ctx,x,y,t,{reducedMotion=false,shatter=null}={}){
 const cy=y-38;
 ctx.save();
 ctx.lineJoin='miter';
 if(shatter!==null){
  // Absorbing a hit throws the shell outwards and fades it, so the block is unmistakable.
  const k=Math.min(1,shatter/0.42);
  const pts=shellPoints(x,cy,SHELL_RX+k*30,SHELL_RY+k*34);
  ctx.globalAlpha=(1-k)*0.9;
  ctx.strokeStyle='#e8fff6';ctx.lineWidth=6;shellPath(ctx,pts);ctx.stroke();
  ctx.strokeStyle='#8aefcd';ctx.lineWidth=3;
  for(const [px,py] of pts){ctx.beginPath();ctx.moveTo(x,cy);ctx.lineTo(px,py);ctx.stroke();}
  ctx.restore();return;
 }
 const pulse=reducedMotion?0:Math.sin(t*2.6)*2;
 const rx=SHELL_RX+pulse,ry=SHELL_RY+pulse;
 const pts=shellPoints(x,cy,rx,ry);
 // Faint interior wash, so the barrier encloses a volume instead of outlining a box.
 ctx.globalAlpha=0.18;ctx.fillStyle='#7fe6c6';shellPath(ctx,pts);ctx.fill();
 // Stepped double rim: a dark backing keeps it readable over bright cave art.
 ctx.globalAlpha=0.55;ctx.strokeStyle='#123b35';ctx.lineWidth=7;shellPath(ctx,pts);ctx.stroke();
 ctx.globalAlpha=0.9;ctx.strokeStyle='#4fd3ad';ctx.lineWidth=5;shellPath(ctx,pts);ctx.stroke();
 ctx.globalAlpha=1;ctx.strokeStyle='#8aefcd';ctx.lineWidth=3;shellPath(ctx,pts);ctx.stroke();
 // Corner studs mark the hexagon's vertices and give the shell a built, faceted feel.
 ctx.fillStyle='#e8fff6';
 for(const [px,py] of pts)ctx.fillRect(px-3,py-3,6,6);
 if(reducedMotion){ctx.restore();return;}
 // A highlight travelling around the rim reads as "powered" without animating the whole shape.
 const travel=(t*0.55)%1,idx=Math.floor(travel*6),frac=travel*6-idx;
 const [ax,ay]=pts[idx],[bx,by]=pts[(idx+1)%6];
 const hx=Math.round((ax+(bx-ax)*frac)/SHIELD_STEP)*SHIELD_STEP;
 const hy=Math.round((ay+(by-ay)*frac)/SHIELD_STEP)*SHIELD_STEP;
 ctx.globalAlpha=0.9;ctx.fillStyle='#ffffff';ctx.fillRect(hx-4,hy-4,9,9);
 ctx.globalAlpha=0.45;ctx.fillRect(hx-7,hy-7,15,15);
 ctx.restore();
}
