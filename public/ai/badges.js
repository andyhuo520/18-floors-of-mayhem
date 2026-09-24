// Pixel badges for the model vendors: a stylised emblem plus a flag for where the lab is based,
// because the panel is a match between rival labs and should read like a scoreboard.
//
// The shipped art is a generated sheet cut by tools/slice-atlas.py, matching the rest of the game.
// The hand-plotted grids below stay as the fallback for the frame before that sheet loads, or for
// good if it fails — the same rule every other sprite in this project follows.
import {sprite} from '../sprites.js';

const PALETTE={
 '.':null,
 o:'#d97757', O:'#a8492f',   // Anthropic orange, and its shaded frame
 w:'#ffffff', W:'#c9ccd4',
 k:'#10111a',
 b:'#2563eb', B:'#12307e',   // DeepSeek blue
 v:'#7c5ce6', V:'#3f2c8f',   // Zhipu violet
 s:'#5b6b7c', S:'#2f3944',   // neutral slate for a custom endpoint
 t:'#14b8a6', T:'#0d6b62',   // TypeSafe teal: a System One model, not a chat model
 r:'#d7263d', y:'#ffd23f',
};

// Every row is exactly GRID characters wide; a badge test enforces that so a mis-typed row is a
// failing build rather than a quietly shifted picture.
export const GRID=24, FLAG_W=12, FLAG_H=8;

const MARKS={
 // A tick inside a rounded frame: a typed answer, not a paragraph.
 typesafe:[
  '..TTTTTTTTTTTTTTTTTTTT..',
  '..TttttttttttttttttttT..',
  'TTttttttttttttttttttttTT',
  'TttttttttttttttttttttttT',
  'TttttttttttttttttttttttT',
  'TttttttttttttttttttttttT',
  'TttttttttttttttttwwwtttT',
  'TtttttttttttttttwwwwtttT',
  'TttttttttttttttwwwwwtttT',
  'TtttttttttttttwwwwwttttT',
  'TttttttttttttwwwwwtttttT',
  'TttttwwwtttttwwwwttttttT',
  'TttttwwwwtttwwwwtttttttT',
  'TttttwwwwwtwwwwwtttttttT',
  'TtttttwwwwwwwwwttttttttT',
  'TttttttwwwwwwwtttttttttT',
  'TtttttttwwwwwttttttttttT',
  'TttttttttwwwtttttttttttT',
  'TttttttttttttttttttttttT',
  'TttttttttttttttttttttttT',
  'TttttttttttttttttttttttT',
  'TTttttttttttttttttttttTT',
  '..TttttttttttttttttttT..',
  '..TTTTTTTTTTTTTTTTTTTT..'
 ],
 // An eight-ray burst.
 anthropic:[
  '..OOOOOOOOOOOOOOOOOOOO..',
  '.OooooooooooooooooooooO.',
  'OoooooooooowwooooooooooO',
  'OoooooooooowwooooooooooO',
  'OoooooooooowwooooooooooO',
  'OooooooooowwwooooooooooO',
  'OooooooooowwwwoowooooooO',
  'OooooowwwowwwwowwooooooO',
  'OoooooowwwwwwwwwwooooooO',
  'OooooooowwwwwwwwoooooooO',
  'OooooowwwwwwwwwwwwwooooO',
  'OowwwwwwwwwwwwwwwwwwwwoO',
  'OowwwwwwwwwwwwwwwwwwwwoO',
  'OoooowwwwwwwwwwwwwoooooO',
  'OooooooowwwwwwwwoooooooO',
  'OoooooowwwwwwwwwwooooooO',
  'OoooooowwowwwwowwwoooooO',
  'OoooooowoowwwwoooooooooO',
  'OoooooooooowwwoooooooooO',
  'OoooooooooowwooooooooooO',
  'OoooooooooowwooooooooooO',
  'OoooooooooowwooooooooooO',
  '.OooooooooooooooooooooO.',
  '..OOOOOOOOOOOOOOOOOOOO..',
 ],
 // An interlaced ring: six crossings notch the band.
 openai:[
  '..WWWWWWWWWWWWWWWWWWWW..',
  '.WwwwwwwwwwwwwwwwwwwwwW.',
  'WwwwwwwwwwwwwwwwwwwwwwwW',
  'WwwwwwwwwkkwwkkwwwwwwwwW',
  'WwwwwwwkkkkwwkkkkwwwwwwW',
  'WwwwwwkkkkkwwkkkkkwwwwwW',
  'WwwwwkkkkkkwwkkkkkkwwwwW',
  'WwwwwwkkkwwwwwwkkkwwwwwW',
  'WwwwwwwwwwwwwwwwwwwwwwwW',
  'WwwkkkwwwwwwwwwwwwkkkwwW',
  'WwwkkkkwwwwwwwwwwkkkkwwW',
  'WwwkkkwwwwwwwwwwwwkkkwwW',
  'WwwkkkwwwwwwwwwwwwkkkwwW',
  'WwwkkkkwwwwwwwwwwkkkkwwW',
  'WwwkkkwwwwwwwwwwwwkkkwwW',
  'WwwwwwwwwwwwwwwwwwwwwwwW',
  'WwwwwwkkkwwwwwwkkkwwwwwW',
  'WwwwwkkkkkkwwkkkkkkwwwwW',
  'WwwwwwkkkkkwwkkkkkwwwwwW',
  'WwwwwwwkkkkwwkkkkwwwwwwW',
  'WwwwwwwwwkkwwkkwwwwwwwwW',
  'WwwwwwwwwwwwwwwwwwwwwwwW',
  '.WwwwwwwwwwwwwwwwwwwwwW.',
  '..WWWWWWWWWWWWWWWWWWWW..',
 ],
 // A breaching whale.
 deepseek:[
  '..BBBBBBBBBBBBBBBBBBBB..',
  '.BbbbbbbbbbbbbbbbbbbbbB.',
  'BbbbbbbbbbbbbbbbbbbbbbbB',
  'BbbbbbbbbbbbbbbbbbbbbbbB',
  'BbbbbbbbbbbbbbbbbbbbbbbB',
  'BbbbbbbbbbbbbbbbbbbbbbbB',
  'BbbbbbbbbwwwwwbbbbbbbbbB',
  'BbbbbbbwwwwwwwwwbbbbbbbB',
  'BbbbbbwwwwwwwwwwwbbbbbbB',
  'BbbbbwwwwbbwwwwwwwwbbbbB',
  'BbbbwwwwbbbbwwwwwwwwbbbB',
  'BbbbwwwwbbbwwwwwwwwwbbbB',
  'BbbbbwwwwbbwwwwwwwwwbbbB',
  'BbbbbbwwwwwwwwwwwwwbbbbB',
  'BbbbbbbwwwwwwwwwwwbbbbbB',
  'BbbbbbbbbwwwwwwwwbbbbbbB',
  'BbbbbbbwwbbbwwwwbbbbbbbB',
  'BbbbbbwwwwbbbwwbbbbbbbbB',
  'BbbbbbbbbbbbbbbbbbbbbbbB',
  'BbbbbbbbbbbbbbbbbbbbbbbB',
  'BbbbbbbbbbbbbbbbbbbbbbbB',
  'BbbbbbbbbbbbbbbbbbbbbbbB',
  '.BbbbbbbbbbbbbbbbbbbbbB.',
  '..BBBBBBBBBBBBBBBBBBBB..',
 ],
 // A Z stroke between two bars.
 glm:[
  '..VVVVVVVVVVVVVVVVVVVV..',
  '.VvvvvvvvvvvvvvvvvvvvvV.',
  'VvvvvvvvvvvvvvvvvvvvvvvV',
  'VvvvvvvvvvvvvvvvvvvvvvvV',
  'VvvvvvvvvvvvvvvvvvvvvvvV',
  'VvvvvwwwwwwwwwwwwwwvvvvV',
  'VvvvvwwwwwwwwwwwwwwvvvvV',
  'VvvvvvvvvvvvvvvwwwwvvvvV',
  'VvvvvvvvvvvvvvwwwwvvvvvV',
  'VvvvvvvvvvvvvwwwwvvvvvvV',
  'VvvvvvvvvvvvwwwwvvvvvvvV',
  'VvvvvvvvvvvwwwwvvvvvvvvV',
  'VvvvvvvvvvwwwwvvvvvvvvvV',
  'VvvvvvvvvwwwwvvvvvvvvvvV',
  'VvvvvvvvwwwwvvvvvvvvvvvV',
  'VvvvvvvwwwwvvvvvvvvvvvvV',
  'VvvvvvwwwwvvvvvvvvvvvvvV',
  'VvvvvwwwwwwwwwwwwwwvvvvV',
  'VvvvvwwwwwwwwwwwwwwvvvvV',
  'VvvvvvvvvvvvvvvvvvvvvvvV',
  'VvvvvvvvvvvvvvvvvvvvvvvV',
  'VvvvvvvvvvvvvvvvvvvvvvvV',
  '.VvvvvvvvvvvvvvvvvvvvvV.',
  '..VVVVVVVVVVVVVVVVVVVV..',
 ],
 // A question mark: whoever you pointed this at.
 custom:[
  '..SSSSSSSSSSSSSSSSSSSS..',
  '.SssssssssssssssssssssS.',
  'SssssssssssssssssssssssS',
  'SssssssssssssssssssssssS',
  'SssssssssssssssssssssssS',
  'SsssssssswwwwwwssssssssS',
  'SssssssswwwwwwwwsssssssS',
  'SsssssswwwsssswwwssssssS',
  'SsssssswwsssssswwssssssS',
  'SsssssssssssssswwssssssS',
  'SssssssssssssswwwssssssS',
  'SssssssssssswwwwsssssssS',
  'SsssssssssswwwwssssssssS',
  'SsssssssssswwssssssssssS',
  'SsssssssssswwssssssssssS',
  'SssssssssssssssssssssssS',
  'SsssssssssswwssssssssssS',
  'SsssssssssswwssssssssssS',
  'SssssssssssssssssssssssS',
  'SssssssssssssssssssssssS',
  'SssssssssssssssssssssssS',
  'SssssssssssssssssssssssS',
  '.SssssssssssssssssssssS.',
  '..SSSSSSSSSSSSSSSSSSSS..',
 ],
};

// 12x8 flags: enough to read the nationality at a glance without becoming the loudest thing on screen.
const FLAGS={
 us:[
  'bbbbbrrrrrrr',
  'bwbwbwwwwwww',
  'bbbbbrrrrrrr',
  'bwbwbwwwwwww',
  'rrrrrrrrrrrr',
  'wwwwwwwwwwww',
  'rrrrrrrrrrrr',
  'wwwwwwwwwwww',
 ],
 cn:[
  'rrrrrrrrrrrr',
  'ryyrryrrrrrr',
  'ryyrrrrrrrrr',
  'rrrrryrrrrrr',
  'rrrrrrrrrrrr',
  'rrrryrrrrrrr',
  'rrrrrrrrrrrr',
  'rrrrrrrrrrrr',
 ],
};

export const VENDOR_BADGE={
 glm:{mark:'glm',flag:'cn',home:'中国'},
 'glm-coding':{mark:'glm',flag:'cn',home:'中国'},
 deepseek:{mark:'deepseek',flag:'cn',home:'中国'},
 openai:{mark:'openai',flag:'us',home:'美国'},
 anthropic:{mark:'anthropic',flag:'us',home:'美国'},
 typesafe:{mark:'typesafe',flag:null,home:'System One'},
 custom:{mark:'custom',flag:null,home:'自备'},
};

export const BADGE_ART={MARKS,FLAGS,PALETTE};

function paintGrid(ctx,rows,x,y,scale){
 rows.forEach((row,j)=>[...row].forEach((ch,i)=>{
  const colour=PALETTE[ch];
  if(!colour)return;
  ctx.fillStyle=colour;
  ctx.fillRect(x+i*scale,y+j*scale,scale,scale);
 }));
}

/**
 * Draw one vendor badge: the stylised mark, with its flag tucked into the bottom-right corner.
 * Everything scales from `scale`, so the same art serves a slot row and a results card.
 */
export function drawBadge(ctx,provider,x=0,y=0,scale=2){
 const badge=VENDOR_BADGE[provider]||VENDOR_BADGE.custom;
 ctx.save();
 ctx.imageSmoothingEnabled=false;
 paintGrid(ctx,MARKS[badge.mark]||MARKS.custom,x,y,scale);
 if(badge.flag){
  // The flag is a corner sticker, not a second emblem: at most a third of the badge across.
  // Rounding this up instead of down once made a 12x8 flag the same scale as the 16x16 mark,
  // which covered most of it.
  const f=Math.max(1,Math.floor(scale*GRID/3/FLAG_W));
  const fw=FLAG_W*f,fh=FLAG_H*f;
  const fx=x+GRID*scale-fw-f,fy=y+GRID*scale-fh-f;
  // A dark mat keeps the flag legible whichever mark it sits on.
  ctx.fillStyle='#0d1219';
  ctx.fillRect(fx-f,fy-f,fw+f*2,fh+f*2);
  paintGrid(ctx,FLAGS[badge.flag],fx,fy,f);
 }
 ctx.restore();
}

const SPRITE_NAME={
 anthropic:'badge-anthropic',openai:'badge-openai',deepseek:'badge-deepseek',
 glm:'badge-glm','glm-coding':'badge-glm',custom:'badge-custom',
};
const FLAG_SPRITE={us:'flag-us',cn:'flag-cn'};

/** Vendor badge at a target pixel size, preferring the generated art and falling back to the grid. */
export function drawVendor(ctx,provider,x,y,size){
 const badge=VENDOR_BADGE[provider]||VENDOR_BADGE.custom;
 const art=sprite('badges',SPRITE_NAME[provider]||SPRITE_NAME.custom);
 if(!art){
  // Pixel art has to land on whole pixels, so the fallback uses the largest integer scale that
  // fits and centres the remainder rather than smearing the grid across a fractional one.
  const scale=Math.max(1,Math.floor(size/GRID));
  const pad=Math.floor((size-GRID*scale)/2);
  drawBadge(ctx,provider,x+pad,y+pad,scale);
  return;
 }
 ctx.save();
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage(art,x,y,size,size);
 const flag=badge.flag&&sprite('badges',FLAG_SPRITE[badge.flag]);
 if(flag){
  // The flag rides the bottom-right corner at a fixed fraction, so it never swamps the emblem.
  const fw=Math.round(size*0.34),fh=Math.round(fw*flag.naturalHeight/flag.naturalWidth);
  ctx.fillStyle='#0d1219';
  ctx.fillRect(x+size-fw-3,y+size-fh-3,fw+3,fh+3);
  ctx.drawImage(flag,x+size-fw-1,y+size-fh-1,fw,fh);
 }else if(badge.flag){
  const f=Math.max(1,Math.round(size/GRID*0.75));
  const fw=FLAG_W*f,fh=FLAG_H*f;
  ctx.fillStyle='#0d1219';
  ctx.fillRect(x+size-fw-f*2,y+size-fh-f*2,fw+f*2,fh+f*2);
  paintGrid(ctx,FLAGS[badge.flag],x+size-fw-f,y+size-fh-f,f);
 }
 ctx.restore();
}
