export const PALETTE=['#cbf578','#a3beff','#ff9e76','#e5afff','#7fe2dc','#ffe38c','#ed99b1','#ece5ce','#8fb98b','#ffb854','#9cb6c1','#c5a880'];
export const TRAITS={fruit:['草莓','西瓜','柠檬','菠萝','桃子','葡萄','橙子','火龙果'],animal:['牛','羊','鸡','鸭','猫','狗','兔','狐狸'],shape:['糯米团','方土豆','歪梨子','大腮帮'],eyes:['大小眼','没睡醒','斗鸡眼','豆豆眼','独眼怪','黑眼圈'],mouth:['两颗龅牙','香肠嘴','吐舌头','歪嘴笑','小獠牙','震惊圈'],hat:['三根毛','头顶长草','荷包蛋','马桶搋子','小犄角','创可贴']};
export const SKINS=[{name:'自由捏脸',detail:'水果 × 动物'},{name:'建国',detail:'金毛橙子鸡'},{name:'老马',detail:'菠萝太空狗'},{name:'老雷',detail:'猕猴桃绵羊'},{name:'阿特',detail:'青苹果猫'},{name:'小梁',detail:'蓝莓鲸鱼'}];
export const DEFAULT_LOOK={skin:0,fruit:0,animal:0,shape:2,eyes:0,mouth:0,hat:1,color:0,width:50,spacing:50};
export function sanitizeLook(raw){const src=raw&&typeof raw==='object'?raw:{};const out={};for(const k of ['skin',...Object.keys(TRAITS),'color','width','spacing']){const max=k==='skin'?SKINS.length-1:k==='color'?11:k==='width'||k==='spacing'?100:TRAITS[k].length-1;out[k]=Number.isFinite(src[k])?Math.max(0,Math.min(max,Math.round(src[k]))):DEFAULT_LOOK[k];}return out;}
export function randomLook(locked={},current=DEFAULT_LOOK,random=Math.random){const out={...sanitizeLook(current)};out.skin=0;for(const k of Object.keys(out)){if(k==='skin'||locked[k])continue;out[k]=Math.floor(random()*(k==='color'?12:k==='width'||k==='spacing'?101:TRAITS[k].length));}return out;}
export function lookName(a){a=sanitizeLook(a);if(a.skin)return SKINS[a.skin].name+' · '+SKINS[a.skin].detail;return `${TRAITS.fruit[a.fruit]}${TRAITS.animal[a.animal]} · ${TRAITS.eyes[a.eyes]}`;}
// All costumes share the same physics hitbox. ctx drawing is shared by portraits and the arena.
function drawSmoothCharacter(ctx,raw,x,y,scale=1,t=0,pose={}){
 const a=sanitizeLook(raw),fruitColors=['#ef6880','#70b966','#f1d566','#dbb867','#f4a0a7','#a17bc3','#f29f54','#e763ae'],accent=PALETTE[a.color],color='#'+[1,3,5].map(i=>Math.round(parseInt(fruitColors[a.fruit].slice(i,i+2),16)*.8+parseInt(accent.slice(i,i+2),16)*.2).toString(16).padStart(2,'0')).join(''),w=.83+a.width*.0034,gap=5+a.spacing*.07;
 const box=(x,y,w,h,r,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
 const oval=(x,y,rx,ry,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
 const stroke=(pts,c,width=2)=>{ctx.strokeStyle=c;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);const bounce=pose.bounce||0;ctx.scale(1+bounce*.12,1-bounce*.12);const moving=Math.abs(pose.vx||0)>1,walk=moving?Math.sin(t*19)*4:Math.sin(t*2)*.6;
 // Animal silhouette is independent from fruit and face: ears, horn, wings and tail.
 if(a.animal===0){stroke([[19,-19],[29,-24],[30,-14]],'#836c55',3);oval(30,-12,3,4,'#554647');}
 if(a.animal===1){oval(24,-16,6,6,'#efe7cd');}
 if(a.animal===4){stroke([[19,-16],[31,-19],[33,-31],[28,-36]],accent,5);}
 if(a.animal===5){stroke([[20,-16],[32,-25],[34,-30]],'#c09267',6);}
 if(a.animal===6)oval(23,-15,5,5,'#f4e4d5');
 if(a.animal===7){oval(27,-21,12,8,'#da9564');oval(35,-22,5,6,'#fae9c7');}
 oval(0,3,24,5,'#08120c44');box(-13,-10+walk,10,11,4,'#31312c');box(4,-10-walk,10,11,4,'#31312c');
 stroke([[-18,-27],[-24,-15+walk]],color,7);stroke([[18,-28],[24,-15-walk]],color,7);
 ctx.save();ctx.scale(w,1);ctx.fillStyle=color;ctx.beginPath();
 const fat=a.shape===1?1.1:a.shape===2?.91:a.shape===3?1.15:1;
 ctx.save();ctx.scale(fat,a.shape===3?.9:a.shape===2?1.04:1);
 ctx.fillStyle=color;ctx.beginPath();
 if(a.fruit===0){ctx.moveTo(-22,-43);ctx.bezierCurveTo(-29,-69,30,-66,24,-42);ctx.bezierCurveTo(17,-20,4,-5,0,-7);ctx.bezierCurveTo(-11,-12,-18,-24,-22,-43);}
 else if(a.fruit===1||a.fruit===6)ctx.ellipse(0,-32,25,26,0,0,Math.PI*2);
 else if(a.fruit===2){ctx.moveTo(0,-61);ctx.bezierCurveTo(8,-51,23,-56,24,-34);ctx.bezierCurveTo(23,-17,6,-13,0,-7);ctx.bezierCurveTo(-5,-17,-24,-15,-24,-34);ctx.bezierCurveTo(-23,-55,-7,-51,0,-61);}
 else if(a.fruit===3)ctx.roundRect(-21,-56,42,48,13);
 else if(a.fruit===4){ctx.moveTo(0,-51);ctx.bezierCurveTo(-30,-71,-34,-25,0,-9);ctx.bezierCurveTo(34,-25,30,-71,0,-51);}
 else if(a.fruit===5){ctx.roundRect(-21,-55,42,44,15);}
 else{ctx.ellipse(0,-33,22,26,0,0,Math.PI*2);}
 ctx.fill();ctx.save();ctx.clip();
 oval(22,-26,12,35,'#00000016');oval(-12,-48,13,5,'#ffffff24');
 if(a.fruit===0){for(let yy=-49;yy<-13;yy+=10)for(let xx=-16;xx<20;xx+=11)oval(xx+(yy%3),yy,1.2,2,'#ffeab5');}
 if(a.fruit===1){for(let xx=-21;xx<27;xx+=11)stroke([[xx,-60],[xx-4,-43],[xx+1,-24],[xx,-9]],'#328664',3);}
 if(a.fruit===3){for(let xx=-40;xx<30;xx+=12){stroke([[xx,-60],[xx+44,-8]],'#b58958',1.4);stroke([[xx+44,-60],[xx,-8]],'#b58958',1.4);}}
 if(a.fruit===4)stroke([[0,-51],[4,-35],[1,-15]],'#d97791',2);
 if(a.fruit===6){for(let i=0;i<17;i++)oval(Math.sin(i*5)*20,-18-(i*7)%36,1,1,'#d58449');}
 if(a.fruit===7){oval(0,-34,16,23,'#f7e9d0');for(let i=0;i<21;i++)oval(Math.sin(i*5)*12,-15-(i*9)%38,1,1.4,'#52374c');}
 ctx.restore();
 if(a.fruit===5){for(const [xx,yy] of [[-17,-49],[15,-48],[-21,-32],[20,-31],[-11,-15],[10,-14]]){oval(xx,yy,9,10,'#a782ca');oval(xx-2,yy-3,3,2,'#c6a6df');}}
 // Fruit tops remain visible alongside the chosen animal ears.
 if(a.fruit===0){for(const [xx,yy] of [[-13,-57],[0,-61],[13,-57]]){stroke([[0,-53],[xx,yy]],'#679d56',5);}}
 if(a.fruit===3){for(let i=-2;i<=2;i++)stroke([[i*3,-55],[i*7,-69+Math.abs(i)*4]],'#679f68',4);}
 if([1,2,4,5,6,7].includes(a.fruit)){stroke([[0,-56],[2,-63]],'#7a7152',3);oval(9,-61,7,3,'#6aa15c');}
 if(a.animal===0){oval(-24,-46,8,5,'#f2d5b1');oval(24,-46,8,5,'#f2d5b1');stroke([[-16,-54],[-21,-65]],'#e9d3ad',5);stroke([[16,-54],[21,-65]],'#e9d3ad',5);oval(-15,-45,5,6,'#483b4055');}
 if(a.animal===1){for(let i=-2;i<=2;i++)oval(i*8,-56+Math.abs(i)*2,7,7,'#f2e8d0');oval(-24,-41,7,4,'#d8b69f');oval(24,-41,7,4,'#d8b69f');}
 if(a.animal===2){for(let i=-1;i<=1;i++)oval(i*5,-61-Math.abs(i)*-2,4,6,'#dd5d61');oval(-25,-24,6,10,'#ecd6ad');oval(25,-24,6,10,'#ecd6ad');}
 if(a.animal===3){oval(-24,-26,7,9,'#f7df93');oval(24,-26,7,9,'#f7df93');}
 if(a.animal===4||a.animal===7){for(const sign of [-1,1]){ctx.fillStyle=a.animal===4?accent:'#e4a06b';ctx.beginPath();ctx.moveTo(sign*10,-50);ctx.lineTo(sign*23,-70);ctx.lineTo(sign*25,-43);ctx.fill();ctx.fillStyle='#e7a4ad';ctx.beginPath();ctx.moveTo(sign*15,-51);ctx.lineTo(sign*22,-63);ctx.lineTo(sign*23,-48);ctx.fill();}}
 if(a.animal===5){oval(-23,-42,7,16,'#ad825e');oval(23,-42,7,16,'#ad825e');}
 if(a.animal===6){oval(-13,-66,6,15,'#eee0c6');oval(13,-66,6,15,'#eee0c6');oval(-13,-67,3,9,'#dd9ea9');oval(13,-67,3,9,'#dd9ea9');}
 ctx.restore();
 oval(-15,-25,5,3,'#ed72765c');oval(15,-25,5,3,'#ed72765c');
 const blink=Math.sin(t*1.7)>.994;const eye=(ex,ey,r,pupil=0)=>{oval(ex,ey,r,blink?1:r,'#fff6d9');if(!blink)oval(ex+pupil,ey+1,Math.max(1.6,r*.36),Math.max(2,r*.4),'#2d2730');};
 if(a.eyes===0){eye(-gap,-37,7,1);eye(gap,-34,4,-1);}
 if(a.eyes===1){for(const ex of [-gap,gap]){eye(ex,-36,6);box(ex-6,-43,12,7,2,color);stroke([[ex-7,-37],[ex+6,-38]],'#4f5042',1.6);}}
 if(a.eyes===2){eye(-gap,-36,6,3);eye(gap,-36,6,-3);}
 if(a.eyes===3){oval(-gap,-37,2.4,3.5,'#352e2b');oval(gap,-35,2.4,3.5,'#352e2b');stroke([[-gap-4,-45],[-gap+3,-44]],'#514532');}
 if(a.eyes===4){eye(0,-38,11,Math.sin(t)*2);stroke([[-9,-51],[9,-49]],'#59513f',3);}
 if(a.eyes===5){oval(-gap,-34,8,7,'#795878');oval(gap,-34,8,7,'#795878');eye(-gap,-37,6);eye(gap,-37,6);}
 if(a.mouth===0){box(-8,-24,17,10,5,'#4b3731');box(-6,-24,5,8,1,'#fff3cf');box(1,-24,6,10,1,'#fff3cf');}
 if(a.mouth===1){box(-11,-24,22,7,4,'#c35e69');box(-10,-20,22,7,4,'#f19698');stroke([[-8,-19],[9,-19]],'#9a4a58',1);}
 if(a.mouth===2){box(-9,-25,19,10,5,'#503541');box(0,-20,9,13,4,'#ed828f');stroke([[5,-19],[5,-12]],'#b4526a',1);}
 if(a.mouth===3){stroke([[-9,-19],[0,-17],[9,-25]],'#493f36',2);box(4,-25,5,5,1,'#fff6dd');}
 if(a.mouth===4){box(-11,-24,22,9,4,'#443342');box(-8,-24,4,9,1,'#fff6dd');box(5,-24,4,9,1,'#fff6dd');}
 if(a.mouth===5){oval(0,-20,6,8,'#4c3845');oval(1,-17,3,3,'#e3939a');}
 if(a.animal===0){oval(0,-27,9,4,'#e4a5a0');oval(-4,-27,1.5,1.5,'#60434c');oval(4,-27,1.5,1.5,'#60434c');}
 if(a.animal===2||a.animal===3){box(-8,-30,a.animal===3?20:15,7,3,'#f4b663');stroke([[-4,-26],[7,-26]],'#a57648',1);}
 if(a.animal===4||a.animal===7){oval(0,-29,3,2,'#a16875');for(const sign of [-1,1]){stroke([[sign*9,-25],[sign*22,-27]],'#6f5559',1);stroke([[sign*9,-22],[sign*23,-20]],'#6f5559',1);}}
 if(a.animal===5){oval(0,-28,5,3,'#58433d');}
 if(a.hat===0){stroke([[-5,-55],[-9,-66]],'#403e34',2);stroke([[0,-56],[2,-69]],'#403e34',2);stroke([[6,-54],[12,-64]],'#403e34',2);}
 if(a.hat===1){stroke([[0,-55],[1,-71]],'#75a14c',3);oval(-6,-66,8,4,'#b6d76a');oval(7,-71,8,4,'#93be59');}
 if(a.hat===2){oval(0,-56,22,7,'#fff5da');oval(3,-59,9,6,'#ffc345');oval(1,-61,4,2,'#ffe39a');}
 if(a.hat===3){stroke([[0,-58],[-4,-77]],'#c69c68',5);box(-13,-61,26,7,4,'#e77e85');oval(0,-61,10,9,'#dc7480');}
 if(a.hat===4){ctx.fillStyle='#f4dfb4';for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(sign*12,-52);ctx.lineTo(sign*21,-68);ctx.lineTo(sign*22,-47);ctx.fill();}}
 if(a.hat===5){ctx.save();ctx.translate(5,-48);ctx.rotate(.25);box(-13,-4,26,8,3,'#e8b98e');box(-5,-4,10,8,1,'#d99c7a');for(let i=-10;i<=10;i+=20)oval(i,0,1,1,'#a97d61');ctx.restore();}
 ctx.restore();ctx.restore();
}

// Six actual drawn poses per skin, processed once and cached at game resolution.
const skinSprites=[],combatSprites=[];let skinLoading;
export const COMBAT_FRAMES={windup:0,punch:1,throw:2,hurt:3,eat:4,defeat:5};
export function characterFrame(t=0,pose={}){
 if(pose.action==='jump'||(pose.airborne&&pose.vy<0))return 4;
 if(pose.action==='fall'||pose.airborne)return 5;
 if(pose.action==='run'||Math.abs(pose.vx||0)>1)return 2+(Math.floor(t*9)%2);
 return !pose.reducedMotion&&t%3.6>3.38?1:0;
}
function loadAtlas(path,target){
 return new Promise((resolve,reject)=>{
  const img=new Image();img.onerror=()=>{skinLoading=null;reject(new Error('角色素材加载失败'));};
  img.onload=()=>{try{
   for(let row=0;row<5;row++){
    const frames=[];let factor=1;
    for(let col=0;col<6;col++){
     const left=Math.round(col*img.width/6),right=Math.round((col+1)*img.width/6),top=Math.round((target===combatSprites?[0,154,296,440,576][row]/768:row/5)*img.height),bottom=Math.round((target===combatSprites?[154,296,440,576,768][row]/768:(row+1)/5)*img.height);
     const c=document.createElement('canvas');c.width=right-left;c.height=bottom-top;
     const cc=c.getContext('2d',{willReadFrequently:true});cc.drawImage(img,-left,-top);
     const pixels=cc.getImageData(0,0,c.width,c.height);let x0=c.width,y0=c.height,x1=0,y1=0;
     for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
      const i=(y*c.width+x)*4,d=pixels.data;
      if(d[i]>150&&d[i+2]>150&&d[i+1]<120&&d[i]-d[i+1]>80&&d[i+2]-d[i+1]>80)d[i+3]=0;
      else if(d[i+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
     }
     if(target===combatSprites){
      // Remove tiny fragments from a neighbouring cell; keep detached feet and larger effects.
      const visited=new Uint8Array(c.width*c.height),parts=[];let largest=0;
      for(let n=0;n<visited.length;n++){if(visited[n]||!pixels.data[n*4+3])continue;const part=[n];visited[n]=1;
       for(let at=0;at<part.length;at++){const q=part[at],xx=q%c.width;for(const r of [xx? q-1:-1,xx<c.width-1?q+1:-1,q-c.width,q+c.width])if(r>=0&&r<visited.length&&!visited[r]&&pixels.data[r*4+3]){visited[r]=1;part.push(r);}}
       largest=Math.max(largest,part.length);parts.push(part);
      }
      for(const part of parts)if(part.length<largest*.03)for(const q of part)pixels.data[q*4+3]=0;
      x0=c.width;y0=c.height;x1=0;y1=0;
      for(let n=0;n<visited.length;n++)if(pixels.data[n*4+3]){const xx=n%c.width,yy=Math.floor(n/c.width);x0=Math.min(x0,xx);x1=Math.max(x1,xx);y0=Math.min(y0,yy);y1=Math.max(y1,yy);}
     }
     cc.putImageData(pixels,0,0);if(col===0)factor=80/(y1-y0+1);
     const sprite=document.createElement('canvas');sprite.height=Math.round((y1-y0+1)*factor);sprite.width=Math.round((x1-x0+1)*factor);
     const sc=sprite.getContext('2d');sc.imageSmoothingEnabled=false;sc.drawImage(c,x0,y0,x1-x0+1,y1-y0+1,0,0,sprite.width,sprite.height);frames.push(sprite);
    }target[row+1]=frames;
   }resolve();
  }catch(error){skinLoading=null;reject(error);}};
  img.src=new URL(path,import.meta.url).href;
 });
}
export function loadCharacterSkins(){return skinLoading??=Promise.all([loadAtlas('./character-art/odd-five-actions-v1.webp',skinSprites),loadAtlas('./combos-assets/combat-actions.webp',combatSprites)]).catch(e=>{skinLoading=null;throw e;});}
const spriteCache=new Map();
export function drawCharacter(ctx,raw,x,y,scale=1,t=0,pose={}){
 const a=sanitizeLook(raw),frame=Math.floor(t*8)%8,walk=Math.abs(pose.vx||0)>1,bounce=Math.round((pose.bounce||0)*3)/3;
 if(a.skin&&skinSprites[a.skin]){
  const combat=COMBAT_FRAMES[pose.action];const sprite=combat!==undefined&&combatSprites[a.skin]?combatSprites[a.skin][combat]:skinSprites[a.skin][characterFrame(t,pose)],bob=0;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y+bob*scale));
  ctx.scale(scale*(1+bounce*.08),scale*(1-bounce*.1));
  if((combat!==undefined?(pose.facing||1):pose.vx)<0)ctx.scale(-1,1);
  ctx.drawImage(sprite,-sprite.width/2,-sprite.height);ctx.restore();return;
 }
 const key=JSON.stringify(a)+':'+frame+':'+walk+':'+bounce;
 let sprite=spriteCache.get(key);
 if(!sprite){sprite=document.createElement('canvas');sprite.width=48;sprite.height=52;const sc=sprite.getContext('2d',{willReadFrequently:true});drawSmoothCharacter(sc,a,24,47,.55,frame/8,{vx:walk?100:0,bounce});const data=sc.getImageData(0,0,48,52);for(let i=0;i<data.data.length;i+=4){data.data[i+3]=data.data[i+3]<120?0:255;for(let j=0;j<3;j++)data.data[i+j]=Math.round(data.data[i+j]/17)*17;}sc.putImageData(data,0,0);if(spriteCache.size>=512)spriteCache.delete(spriteCache.keys().next().value);spriteCache.set(key,sprite);}
 spriteCache.delete(key);spriteCache.set(key,sprite);
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite,Math.round(x-24/.55*scale),Math.round(y-47/.55*scale),48/.55*scale,52/.55*scale);ctx.restore();
}
