import {t} from './i18n.js';
import {drawCharacter,loadCharacterSkins} from './appearance.js';
const themes={A:{bg:'#101e30',ink:'#f7e8b0',accent:'#f0ca67',label:['冠军战绩卡','RESULT CARD']},B:{bg:'#dec69a',ink:'#37271e',accent:'#a73329',label:['深渊通缉令','ABYSS WANTED']},C:{bg:'#102c28',ink:'#e3d7ae',accent:'#bd9856',label:['九境成就榜','NINE REALMS']}};
let snapshot=null,variant='A',generation=0;const qr=new Image();qr.src='./game-qr.png';qr.onload=()=>{if(snapshot)render();};const backdrop=new Image();backdrop.src='./combos-assets/scenery-v2/scene-0.webp';backdrop.onload=()=>{if(snapshot)render();};
const dialog=document.createElement('dialog');dialog.id='poster-dialog';dialog.dataset.noTranslate='';dialog.setAttribute('aria-label','战绩分享 / Share result');dialog.innerHTML='<div class="poster-tools"><div><button data-poster="A">A · 冠军卡 / Results</button><button data-poster="B">B · 通缉令 / Wanted</button><button data-poster="C">C · 成就榜 / Realms</button></div><button id="poster-close" aria-label="关闭 / Close">×</button></div><div class="poster-preview"><canvas id="result-poster" width="960" height="1440"></canvas></div><div class="poster-tools"><button id="poster-download">保存图片 / Save PNG</button><button id="poster-copy-link">复制游戏链接</button><button id="poster-share">分享 / Share</button></div><p id="poster-status" role="status"></p>';document.body.append(dialog);
const entry=document.createElement('button');entry.className='poster-entry';entry.dataset.noTranslate='';entry.innerHTML='<canvas width="240" height="360" aria-hidden="true"></canvas><span>我的称号海报 · 保存 / 分享 ↗<br><small>My result poster · Save / Share</small></span>';document.querySelector('#results').before(entry);
entry.onclick=()=>{variant='A';dialog.showModal();render();};dialog.querySelector('#poster-close').onclick=()=>dialog.close();for(const b of dialog.querySelectorAll('[data-poster]'))b.onclick=()=>{variant=b.dataset.poster;render();};
const lang=()=>document.documentElement.lang==='en';const words=(zh,en)=>lang()?en:zh;
function text(c,s,x,y,size=28,max=800){c.font=`${size}px "Fusion Pixel",monospace`;while(c.measureText(s).width>max&&size>12)c.font=`${--size}px "Fusion Pixel",monospace`;c.fillText(s,x,y);}
function seconds(n){return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');}
export async function showResultPoster(g,id){snapshot=JSON.parse(JSON.stringify({result:g.result,players:g.players,clearedBosses:g.clearedBosses||0,t:g.t,mode:g.rules.mode,earlyExit:!!g.earlyExit,campaignComplete:!!g.campaignComplete,id}));variant='A';await loadCharacterSkins().catch(()=>{});await document.fonts.ready;render();}
function paint(c,which){if(!snapshot)return;const g=snapshot,p=g.result.find(p=>p.id===g.id)||g.result[0];if(!p)return;const theme=themes[which],co=g.mode==='coop',solo=g.players.length===1,bosses=Math.min(9,g.clearedBosses),duration=p.diedAt??g.t;
 c.save();c.clearRect(0,0,960,1440);c.imageSmoothingEnabled=false;c.fillStyle=theme.bg;c.fillRect(0,0,960,1440);c.strokeStyle=theme.accent;c.lineWidth=8;c.strokeRect(24,24,912,1392);c.lineWidth=2;c.strokeRect(40,40,880,1360);
 for(let i=0;i<24;i++){c.globalAlpha=.15;c.fillStyle=theme.accent;c.fillRect(55+(i*137)%835,80+(i*193)%1230,8,8);}c.globalAlpha=1;c.textAlign='center';c.fillStyle=theme.accent;
 text(c,words('真男人就下18层','18 FLOORS OF MAYHEM'),480,98,30);text(c,theme.label[lang()?1:0],480,162,49);
 const title=which==='B'?words('掉下去可以，认输不行','FALL DOWN. NEVER GIVE UP.'):which==='C'?words(bosses===9?'九境尽破 · 功成归来':'已破 '+bosses+' 境 · 继续向下',bosses===9?'ALL NINE REALMS CLEARED':bosses+' REALMS CLEARED'):words(solo?'本次挑战':co?'最佳搭档':g.earlyExit?'个人成绩 · 比赛尚未结束':'第 '+p.rank+' 名 · 本局战绩',solo?'SOLO RUN':co?'TEAM RESULT':g.earlyExit?'YOUR RESULT · MATCH IN PROGRESS':'RANK '+p.rank+' · MATCH RESULT');
 text(c,title,480,224,29);
 c.fillStyle=which==='B'?'#b69a71':'#233c44';c.fillRect(185,275,590,380);if(backdrop.complete&&backdrop.naturalWidth){c.save();c.globalAlpha=which==='B'?.35:.72;c.drawImage(backdrop,85,270,790,390);c.restore();c.fillStyle=theme.accent;c.fillRect(85,655,790,8);}drawCharacter(c,p.look,480,632,3.7);
 if(which==='B'){c.save();c.translate(750,360);c.rotate(-.18);c.strokeStyle=theme.accent;c.lineWidth=6;c.strokeRect(-80,-35,160,70);c.fillStyle=theme.accent;text(c,words('不服再战','REMATCH'),0,12,28,145);c.restore();}c.fillStyle=theme.ink;text(c,p.name,480,709,36);text(c,t(p.title)||words('初来乍到的猛男','FIRST STEPS'),480,773,42);
 text(c,t(p.detail||''),480,809,20);
 const stats=[[words('层数','FLOOR'),p.depth||0],[words('下降距离','DISTANCE'),(p.meters||0)+' m'],[words('存活时间','SURVIVED'),seconds(duration)]];
 for(let i=0;i<3;i++){const x=190+i*290;c.fillStyle=theme.accent;text(c,String(stats[i][1]),x,883,43,250);c.fillStyle=theme.ink;text(c,stats[i][0],x,919,21,250);}
 text(c,words('本局队伍击败 '+bosses+' 位妖王','TEAM BOSSES DEFEATED: '+bosses),480,966,25);
 if(which==='C'){for(let i=0;i<9;i++){c.fillStyle=i<bosses?theme.accent:'#354643';c.fillRect(73+i*92,1005,76,88);c.fillStyle=i<bosses?theme.bg:theme.ink;text(c,String(i+1),111+i*92,1064,33,60);}text(c,words('亮起的是本局已通过的境界','LIT GATES ARE CLEARED THIS RUN'),480,1136,21);}
 else{const rows=g.result.slice(0,3);for(let i=0;i<rows.length;i++){const r=rows[i],x=(960-rows.length*300)/2+i*300+10;c.fillStyle=['#cfac55','#8798a8','#a36b48'][Math.min(2,(r.rank||i+1)-1)];c.fillRect(x,1002,280,175);drawCharacter(c,r.look,x+54,1100,.72);c.fillStyle='#111e2c';text(c,(co?words('队伍','TEAM'):'#'+r.rank)+' '+r.name,x+160,1050,19,210);text(c,(r.depth||0)+words(' 层',' floors'),x+170,1105,25,170);text(c,t(r.title||''),x+140,1153,17,250);}}
 c.fillStyle=theme.accent;text(c,words('扫码下场，别光嘴硬','SCAN IN. PROVE IT.'),365,1240,34,600);c.fillStyle=theme.ink;text(c,'combos.game',365,1290,25);text(c,words('本局真实战绩 · 不服再来一局','REAL RESULTS · REMATCH?'),365,1334,18,600);if(qr.complete&&qr.naturalWidth)c.drawImage(qr,700,1170,qr.naturalWidth,qr.naturalHeight);c.restore();
}
function localizeControls(){
 dialog.setAttribute('aria-label',words('战绩分享','Share result'));
 const labels={A:words('A · 冠军卡','A · Results'),B:words('B · 通缉令','B · Wanted'),C:words('C · 成就榜','C · Realms')};
 for(const b of dialog.querySelectorAll('[data-poster]'))b.textContent=labels[b.dataset.poster];
 dialog.querySelector('#poster-close').setAttribute('aria-label',words('关闭','Close'));
 dialog.querySelector('#poster-download').textContent=words('保存图片','Save PNG');
 dialog.querySelector('#poster-share').textContent=words('分享图片','Share image');
 dialog.querySelector('#poster-copy-link').textContent=words('复制游戏链接','Copy game link');
 entry.querySelector('span').textContent=words('我的称号海报 · 保存 / 分享 ↗','My result poster · Save / Share ↗');
}
function render(){localizeControls();if(!snapshot)return;generation++;paint(dialog.querySelector('canvas').getContext('2d'),variant);const miniature=entry.querySelector('canvas'),c=miniature.getContext('2d'),source=document.createElement('canvas');source.width=960;source.height=1440;paint(source.getContext('2d'),'A');c.clearRect(0,0,240,360);c.drawImage(source,0,0,240,360);for(const b of dialog.querySelectorAll('[data-poster]'))b.setAttribute('aria-pressed',String(b.dataset.poster===variant));}
const gameURL='https://combos.game/play?post_id=09d6a46e602dfeffd3f77178a6091f8c';
dialog.querySelector('#poster-copy-link').onclick=async()=>{
 const status=dialog.querySelector('#poster-status');
 try{await navigator.clipboard.writeText(gameURL);status.textContent=words('游戏链接已复制，粘贴发给朋友就能玩！','Game link copied. Paste it to invite friends!');}
 catch{
  status.replaceChildren(document.createTextNode(words('请复制游戏链接：','Copy this game link:')));
  const input=document.createElement('input');input.type='text';input.readOnly=true;input.value=gameURL;input.setAttribute('aria-label',words('游戏链接','Game link'));input.style.width='100%';status.append(input);input.focus();input.select();
 }
};
async function blob(){await qr.decode();render();return new Promise((resolve,reject)=>dialog.querySelector('canvas').toBlob(b=>b?resolve(b):reject(new Error('PNG export failed')),'image/png'));}
async function download(){const url=URL.createObjectURL(await blob()),a=document.createElement('a');a.href=url;a.download='man18-'+variant+'-result.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
dialog.querySelector('#poster-download').onclick=async()=>{try{await download();dialog.querySelector('#poster-status').textContent=words('图片已生成，可附上游戏链接分享。','PNG ready. Share it with the game link.');}catch{dialog.querySelector('#poster-status').textContent=words('图片生成失败，请重试。','Export failed. Please retry.');}};
dialog.querySelector('#poster-share').onclick=async()=>{try{const file=new File([await blob()],'man18-result.png',{type:'image/png'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:words('真男人就下18层','18 Floors of Mayhem'),text:words('不服再来一局！','Think you can beat me?'),url:gameURL});else{await download();dialog.querySelector('#poster-status').textContent=words('已保存图片；复制下方链接一起分享：','PNG saved. Include this link:')+gameURL;}}catch(e){if(e.name!=='AbortError')dialog.querySelector('#poster-status').textContent=words('分享未完成，请使用保存图片。','Share failed. Use Save PNG.');}};
localizeControls();
new MutationObserver(()=>{dialog.querySelector('#poster-status').textContent='';render();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
