import {drawBossSkill} from './ultimate-vfx.js';
import {BOSS_ATTACK_KINDS} from './boss-attacks.js';
// Nine chapters, each with six exploration trials, two distinct elite hazards and a sealed boss arena.
export const CHAPTERS=[
 {name:'花果山',boss:'孙悟空',color:'#95c9a1',elites:['藤甲山魈','碎岩猿卫'],trials:['苔阶初醒','穿林逆风','断藤危桥','飞石窄径','悬枝伏影','瀑底回声']},
 {name:'高庄夜寨',boss:'铁耙山君',color:'#d7ac73',elites:['稻草耙卫','谷仓獠牙'],trials:['荒庄落井','风车逆流','朽木连桥','麦垛迷途','暗巷追影','地窖惊蹄']},
 {name:'流沙古渡',boss:'流沙骸将',color:'#d8c894',elites:['沙鳞潜卫','沉舟铲灵'],trials:['古渡流沙','沙瀑逆行','腐船踏板','碎骨沙洲','暗河潜影','沉舟回响']},
 {name:'焚风火山',boss:'金角炎牛',color:'#faad72',elites:['熔甲牛卫','炎斧先锋'],trials:['熔岩裂隙','焚风倒灌','焦桥将断','火雨窄路','岩底巨影','炉心余烬']},
 {name:'白骨鬼城',boss:'白骨灯姬',color:'#c0a5db',elites:['提灯骨侍','断首纸将'],trials:['鬼城入口','阴风回廊','朽骨浮桥','冥灯歧路','帘后人影','荒寺钟声']},
 {name:'红莲火窟',boss:'赤轮童子',color:'#ff927e',elites:['火轮童侍','三昧炉灵'],trials:['赤窟初探','火舌上涌','炭桥连断','飞轮狭道','炉壁魅影','三昧余温']},
 {name:'盘丝幽庭',boss:'盘丝织后',color:'#d6a3d7',elites:['丝刃蛛卫','毒茧女侍'],trials:['幽庭蛛径','丝风缠足','断网悬桥','毒露窄径','茧中伏影','千丝回廊']},
 {name:'雷翅云海',boss:'雷翅鹏尊',color:'#9ec5fa',elites:['雷羽斥候','裂空鹰卫'],trials:['云隙坠落','罡风逆行','残桥雷痕','羽刃窄道','云后巨翼','天门雷鸣']},
 {name:'玄莲终境',boss:'玄莲魔尊',color:'#c3abef',elites:['莲影魔侍','虚空门卫'],trials:['倒悬星阶','虚空逆潮','残月断桥','流星狭路','黑莲伏影','终境回音']}
];
export const ELITE_PATTERNS=[
 {offsets:[0],spread:[-.23,0,.23],hint:'单点重压 / 三向碎石'},
 {offsets:[-70,70],spread:[-.08,.08],hint:'双耙夹击 / 双线突袭'},
 {offsets:[0],band:true,spread:[0],gravity:120,hint:'流沙横带 / 下坠沙弹'},
 {offsets:[-160,0,160],spread:[-.36,-.12,.12,.36],hint:'三柱熔火 / 四向火雨'},
 {offsets:[0,100],echo:true,spread:[-.25,0,.25],hint:'延迟骨刺 / 二次追魂'},
 {offsets:[-110,0,110],spread:[-.4,0,.4],gravity:180,hint:'连环火柱 / 弧线火轮'},
 {offsets:[0],slow:true,spread:[-.32,-.16,0,.16,.32],hint:'蛛丝束缚 / 扇形毒网'},
 {offsets:[-140,140],spread:[-.14,0,.14],speed:1.3,hint:'双雷夹道 / 快速羽刃'},
 {offsets:[-170,0,170],echo:true,spread:[-.4,-.2,0,.2,.4],hint:'黑莲交错 / 五向星弹'}
];
const RULES=['稳步落台，熟悉本章路线','逆风推动身体，及时修正方向','本段新生成的平台更易坍塌','移动平台加速，落点更窄','巨物交错出现，留意攻击起手','平台脉冲更快，准备迎战精英','躲开精英锁定的落点攻击','躲开精英扇形弹幕','打破蓝色架势，击败章末妖王'];
export const CAMPAIGN_TRIALS=CHAPTERS.flatMap((c,chapter)=>[...c.trials,...c.elites,c.boss].map((name,slot)=>({number:chapter*9+slot+1,chapter,slot,name,kind:slot<6?'explore':slot<8?'elite':'boss',tip:slot===6||slot===7?ELITE_PATTERNS[chapter].hint+' · '+RULES[slot]:RULES[slot]})));
export function campaignProgress(g){
 const cleared=g.clearedBosses??Math.max(0,(g.bossCount||0)-(g.fallBoss?1:0));
 const chapter=Math.min(8,cleared),base=g.chapterBase||0;
 const depth=Math.max(base,...g.players.filter(p=>p.alive).map(p=>p.depth||0));
 const slot=g.fallBoss||g.bossEntrance?8:Math.min(8,Math.floor(Math.max(0,depth-base)/4));
 return {...CAMPAIGN_TRIALS[chapter*9+slot],cleared,depth,base,complete:!!g.campaignComplete};
}
export function campaignStep(g,dt,hurt,record){
 const p=campaignProgress(g);g.campaign=p;
 if(g.campaignComplete||g.bossArena||g.bossEntrance)return;
 if(g.trialAnnounced!==p.number){g.trialAnnounced=p.number;record(g,null,`第 ${p.number} / 81 难 · ${p.name}：${p.tip}`,'八十一难');}
 const alive=g.players.filter(p=>p.alive&&!p.downed);if(!alive.length)return;
 g.eliteShots??=[];
 if(p.kind==='elite'&&g.eliteTrial!==p.number){
  g.eliteTrial=p.number;g.elite={chapter:p.chapter,variant:p.slot-6,name:p.name,at:g.t,next:g.t+2,until:g.t+12,cycle:0};
 }
 const e=g.elite;
 if(e&&g.t<e.until){
  if(g.t>=e.next){const target=alive[e.cycle%alive.length];e.cycle++;e.next=g.t+(g.difficulty==='easy'?4.5:3.3);
   const delay=g.difficulty==='easy'?1.65:1.15;
   const pattern=ELITE_PATTERNS[p.chapter];
   if(e.variant===0){for(const [j,offset]of pattern.offsets.entries()){const at=g.t+delay+(pattern.echo?j*.55:0);g.eliteShots.push({kind:pattern.band?'band':'pillar',x:Math.max(40,Math.min(860,target.x+offset)),y:pattern.band?target.y-25:g.camera+650,at,until:at+.32,slow:!!pattern.slow,hit:[]});}}
   else{const x=e.cycle%2?65:835,y=g.camera+190;for(const [j,d]of pattern.spread.entries()){const a=Math.atan2(target.y-25-y,target.x-x)+d,speed=(155+p.chapter*8)*(pattern.speed||1),at=g.t+delay+(pattern.echo?j*.16:0);g.eliteShots.push({kind:'orb',x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,gravity:pattern.gravity||0,slow:!!pattern.slow,at,until:at+3,hit:[]});}}

  }
 }else if(e){record(g,null,e.name+'退回阴影，继续深入','精英试炼结束');g.elite=null;}
 for(const s of g.eliteShots){if(g.t<s.at||g.t>s.until)continue;if(s.kind==='orb'){s.vy+=(s.gravity||0)*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;}
  for(const q of alive){const hit=s.kind==='band'?Math.abs(q.y-25-s.y)<24:s.kind==='pillar'?Math.abs(q.x-s.x)<35:Math.hypot(q.x-s.x,q.y-25-s.y)<30;if(hit&&!s.hit.includes(q.id)){s.hit.push(q.id);if(s.slow)q.frozenUntil=g.t+1.8;else hurt(g,q,'中了'+(e?.name||'精英')+'的攻击');}}
 }
 g.eliteShots=g.eliteShots.filter(s=>s.until>g.t);
}
export function drawCampaignHazards(c,g,camera){
 if(g.bossArena||g.bossEntrance)return;c.save();
 const col=CHAPTERS[g.campaign?.chapter||0].color;
 for(const s of g.eliteShots||[]){const charging=g.t<s.at,kind=BOSS_ATTACK_KINDS[g.campaign?.chapter||0];c.globalAlpha=charging?.55:1;c.strokeStyle=col;
  if(s.kind==='band'){if(charging)drawBossSkill(c,kind,65,s.y-camera,0,{width:95,frame:0});if(!charging)for(let i=0;i<9;i++)drawBossSkill(c,kind,50+i*100,s.y-camera,g.t-s.at,{width:95,height:62});}
  else if(s.kind==='pillar'){if(!charging)for(let i=0;i<8;i++)drawBossSkill(c,kind,s.x,45+i*83,g.t-s.at,{width:85});else drawBossSkill(c,kind,s.x,65,0,{width:90,frame:0});}
  else drawBossSkill(c,kind,s.x,s.y-camera,charging?0:g.t-s.at,{width:64,frame:charging?0:undefined,facing:s.vx<0?-1:1});
 }
 if(g.elite){c.globalAlpha=1;c.textAlign='center';c.fillStyle=col;c.font='15px "Fusion Pixel",monospace';c.fillText(g.elite.name+' · '+(g.elite.variant?'扇形追击':'落点锁定'),450,132);}
 c.restore();
}
