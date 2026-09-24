export const CHAPTER_RELICS=[
 {name:'桃枝护身令',tip:'获得一次护盾'}, {name:'丰谷弹药袋',tip:'补充 8 发弹药'}, {name:'净沙瓶',tip:'清除附近弹幕；无弹幕时获得护盾'},
 {name:'避火珠',tip:'护盾并解除减速'}, {name:'镇魂灯',tip:'恢复 35 点灵气'}, {name:'火轮匣',tip:'获得火尖枪与 12 发弹药'},
 {name:'解丝梭',tip:'解除束缚并恢复 20 点灵气'}, {name:'雷羽符',tip:'重置大招冷却并恢复 25 点灵气'}, {name:'星莲印',tip:'灵气充满，准备搓招'}
];
let relicArt;if(typeof Image!=='undefined'){relicArt=new Image();relicArt.src='/combos-assets/world-v5/relics.webp';}
export function drawRelic(c,index,x,y,size=66){if(!relicArt?.naturalWidth)return false;const sw=relicArt.naturalWidth/4,sh=relicArt.naturalHeight/3;c.save();c.imageSmoothingEnabled=false;c.drawImage(relicArt,index%4*sw,Math.floor(index/4)*sh,sw,sh,x-size/2,y-size/2,size,size);c.restore();return true;}
export function applyRelic(g,p,index){
 p.lastRelic=index;
 const energy=n=>{p.skillEnergy=Math.min(100,(p.skillEnergy||0)+n);};
 switch(index){
 case 0:p.shield=true;break;
 case 1:if(!Number.isInteger(p.bossWeapon))p.bossWeapon=0;p.bossAmmo=Math.min(24,(p.bossAmmo||0)+8);break;
 case 2:{const before=(g.bossShots||[]).length+(g.eliteShots||[]).length;g.bossShots=(g.bossShots||[]).filter(s=>Math.hypot(s.x-p.x,s.y-(p.y-28))>220);g.eliteShots=(g.eliteShots||[]).filter(s=>Math.hypot(s.x-p.x,s.y-(p.y-28))>220);if(before===g.bossShots.length+g.eliteShots.length)p.shield=true;break;}
 case 3:p.shield=true;p.frozenUntil=0;break;
 case 4:energy(35);break;
 case 5:p.bossWeapon=1;p.bossAmmo=12;break;
 case 6:p.frozenUntil=0;energy(20);break;
 case 7:p.skillReady=g.t;energy(25);break;
 case 8:p.skillEnergy=100;break;
 }
}
export function worldRelicStep(g){
 if(!g.campaign||g.bossArena||g.bossEntrance||g.campaignComplete)return;
 const chapter=g.campaign.chapter;if(g.worldRelicChapter===chapter||g.campaign.depth-g.campaign.base<12)return;
 const f=g.platforms.find(f=>!f.broken&&f.type!=='pulse'&&f.type!=='crumble'&&f.y>g.camera+180&&f.y<g.camera+500);
 if(!f)return;g.worldRelicChapter=chapter;
 g.items.push({id:'relic-'+chapter,type:'relic',relic:chapter,platformId:f.id,offset:.5,x:f.x+f.w/2,y:f.y-36,collected:false});
}
export const ARENA_WEAPONS=[
 {name:'穿云弓',damage:6,guardDamage:6,speed:650,gap:.42,spread:[-.12,0,.12],color:'#b4f0c9'},
 {name:'火尖枪',damage:10,guardDamage:22,speed:800,gap:.5,spread:[0],color:'#ffb77c'},
 {name:'镇妖葫芦',damage:28,guardDamage:18,speed:360,gap:.8,spread:[0],color:'#d2b0ee'}
];
export function arenaItemStep(g,record){
 if(!g.bossArena)return;
 g.arenaPickups??=[];
 const b=g.fallBoss;if(!b)return;
 if(g.t>=(g.nextArenaPickup??b.spawnAt+7)&&!g.arenaPickups.length){
  const n=g.arenaDropCount||0;g.arenaDropCount=n+1;g.nextArenaPickup=g.t+16;
  g.arenaPickups.push({x:180+(n*173+b.index*53)%500,y:g.bossArena.floor-30,kind:n%3===2?'relic':'weapon',relic:b.index,weapon:(b.index+n)%3,until:g.t+12});
 }
 for(const item of g.arenaPickups){if(item.collected||g.t>item.until)continue;
  for(const p of g.players){if(!p.alive||p.downed||Math.hypot(p.x-item.x,p.y-28-item.y)>35)continue;
   item.collected=true;p.pickupAt=g.t;p.lastPickup=item.kind;p.pickupGain=0;
   if(item.kind==='relic'){applyRelic(g,p,item.relic);record(g,p,CHAPTER_RELICS[item.relic].name+' · '+CHAPTER_RELICS[item.relic].tip,'秘宝生效');}
   else if(item.kind==='shield'){p.shield=true;record(g,p,'拾取护盾，抵挡一次伤害','战地补给');}
   else{p.bossWeapon=item.weapon;p.bossAmmo=12;record(g,p,'拾取'+ARENA_WEAPONS[item.weapon].name+' · L 射击 / 12 发','神兵到手');}
   g.bossAudio??=[];g.bossAudio.push({id:g.bossAudioId=(g.bossAudioId||0)+1,kind:'pickup',x:p.x,y:p.y,at:g.t});if(g.bossAudio.length>32)g.bossAudio.shift();break;
  }
 }
 g.arenaPickups=g.arenaPickups.filter(i=>!i.collected&&i.until>g.t);
}
export function fireArenaWeapon(g,p,b){
 const w=p.bossAmmo>0?ARENA_WEAPONS[p.bossWeapon]:null,a=Math.atan2(b.y-(p.y-35),b.x-p.x);
 p.bossFireReady=g.t+(w?.gap||.3);p.punchAt=g.t;if(w)p.bossAmmo--;
 for(const d of w?.spread||[0])g.heroShots.push({from:p.id,x:p.x,y:p.y-35,vx:Math.cos(a+d)*(w?.speed||650),vy:Math.sin(a+d)*(w?.speed||650),damage:w?.damage||8,guardDamage:w?.guardDamage||8,weapon:w?p.bossWeapon:undefined,color:w?.color,until:g.t+2});
}
export function drawArenaItems(c,g,camera){c.save();c.font='12px "Fusion Pixel",monospace';c.textAlign='center';for(const item of g.arenaPickups||[]){const x=item.x,y=item.y-camera-5+Math.sin(g.t*4)*3;drawRelic(c,item.kind==='relic'?item.relic:item.kind==='weapon'?9+item.weapon:0,x,y);c.fillStyle='#fff0c5';c.fillText(item.kind==='relic'?CHAPTER_RELICS[item.relic].name:item.kind==='shield'?'护盾':ARENA_WEAPONS[item.weapon].name,x,y-40);}c.restore();}

export function grantBossReward(g,index,record){
 for(const p of g.players){if(!p.alive||p.downed)continue;p.bossRewardsEarned??=[];if(p.bossRewardsEarned.includes(index))continue;
  p.bossRewardsEarned.push(index);p.bossRewards??=[];p.bossRewards.push({chapter:index,relic:index,earnedAt:g.t});
  record(g,p,'获得战利品 '+CHAPTER_RELICS[index].name+(index<8?' · 下一章按 R 使用':' · 终章通关纪念'),'妖王战利品');
 }
}
export function bossRewardStep(g,inputs,record){
 for(const p of g.players){const pressed=!!inputs[p.id]?.reward,edge=pressed&&!p.rewardHeld;p.rewardHeld=pressed;
  if(!edge||!p.alive||p.downed||g.campaignComplete)continue;const reward=p.bossRewards?.[0];if(!reward||(g.clearedBosses||0)<=reward.chapter||g.t<reward.earnedAt+1)continue;
  p.bossRewards.shift();applyRelic(g,p,reward.relic);p.pickupAt=g.t;p.lastPickup='relic';p.pickupGain=0;
  record(g,p,'使用战利品 '+CHAPTER_RELICS[reward.relic].name+' · '+CHAPTER_RELICS[reward.relic].tip,'战利品生效');
 }
}
