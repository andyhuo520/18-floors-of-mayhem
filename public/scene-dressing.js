// Art-directed placements. No repeated wallpaper of a boss's emblem.
export const DRESSING=[
 [[0,100,474,100],[11,815,515,145],[6,695,525,75],[3,185,265,74]],
 [[1,110,510,145],[2,770,525,105],[5,670,480,65],[8,190,235,85]],
 [[15,100,510,150],[2,810,480,90],[10,765,350,155],[3,160,275,76]],
 [[14,120,515,108],[4,790,160,130],[13,800,510,110],[5,195,390,70]],
 [[0,140,480,90],[11,795,515,150],[7,720,510,42],[3,145,235,72]],
 [[5,120,512,98],[14,770,510,120],[4,805,155,116],[10,105,295,130]],
 [[9,130,515,145],[11,785,510,110],[5,730,470,62],[3,175,245,86]],
 [[8,140,320,125],[10,775,410,165],[13,120,525,100],[3,815,255,74]],
 [[12,140,445,140],[10,790,390,155],[8,790,200,84],[13,140,525,100]]
];
export const SCENE_EFFECTS=[
 [[3,390,380,220],[2,190,265,82]],[[2,185,250,92],[3,600,440,180]],
 [[3,430,480,210]],[[0,155,490,70],[3,650,395,150]],
 [[1,170,260,64],[3,450,465,260]],[[0,725,500,80],[2,150,265,86]],
 [[2,170,245,86],[3,600,470,200]],[[2,800,260,84],[3,390,420,260]],
 [[1,735,285,58],[3,450,455,230]]
];
let props,effects;
if(typeof Image!=='undefined'){props=new Image();props.src='/combos-assets/scenery-v2/props.webp';effects=new Image();effects.src='/combos-assets/scenery-v2/effects.webp';}
function cell(c,im,i,x,feet,size){if(!im?.naturalWidth)return;const w=im.naturalWidth/4,h=im.naturalHeight/4;c.drawImage(im,i%4*w,Math.floor(i/4)*h,w,h,Math.round(x-size/2),Math.round(feet-size),size,size);}
export function drawSceneDressing(c,index,t,{foreground=false}={}){
 c.save();c.imageSmoothingEnabled=false;
 if(!foreground){for(const [id,x,y,size]of DRESSING[index]){c.globalAlpha=.82;cell(c,props,id,x,y,size);}
 for(const [row,x,y,size]of SCENE_EFFECTS[index]){c.globalAlpha=row===3?.24:.8;const frame=Math.floor(t*(row===0?7:4))%4;cell(c,effects,row*4+frame,x,y+(row===1?Math.sin(t*1.4)*7:0),size);}}
 else{c.globalAlpha=.55;const [id]=DRESSING[index][1];cell(c,props,id,892,693,150);}
 c.restore();
}
