import React from 'react';
import {AbsoluteFill,Audio,Img,OffthreadVideo,Sequence,interpolate,spring,staticFile,useCurrentFrame} from 'remotion';

const FPS=30;
const frames=[300,276,378,369,327,369,336,345];
const starts=frames.map((_,i)=>frames.slice(0,i).reduce((a,b)=>a+b,0));
export const TOTAL_FRAMES=frames.reduce((a,b)=>a+b,0);
const media=(name:string)=>staticFile('media/'+name);
const ink='#101b28',panel='#182b3e',cream='#f3e6b7',lime='#d8ee92',muted='#a7bac1',coral='#f58f63';

const bar=(width:number,color=lime):React.CSSProperties=>({height:5,width,background:color,boxShadow:`0 4px 0 #09111b`});
const pix=(size:number,color=cream):React.CSSProperties=>({fontFamily:'Pixel, monospace',fontSize:size,color,lineHeight:1.18,textShadow:'4px 4px 0 #07101b'});
const frameBox:React.CSSProperties={border:'3px solid #d9c995',boxShadow:'8px 8px 0 #050b14',background:panel,overflow:'hidden'};

function Stage({children,duration,index,label}:React.PropsWithChildren<{duration:number,index:number,label:string}>){
 const f=useCurrentFrame();
 const fade=interpolate(f,[0,10,duration-10,duration],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return <AbsoluteFill style={{background:ink,opacity:fade,overflow:'hidden'}}>
  <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(#d9e7ac0c 1px,transparent 1px),linear-gradient(90deg,#d9e7ac0c 1px,transparent 1px)',backgroundSize:'34px 34px'}}/>
  <div style={{position:'absolute',top:25,left:54,right:54,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:20}}>
   <span style={{...pix(19,lime),letterSpacing:3}}>COMBOS × 真男人就下18层</span><span style={{...pix(17,muted)}}>0{index} / 08</span>
  </div>
  {children}
  <div style={{position:'absolute',bottom:25,left:54,right:54,display:'flex',alignItems:'center',gap:20,zIndex:20}}>
   <div style={bar(45,coral)}/><span style={{...pix(15,muted),letterSpacing:2}}>{label}</span>
   <div style={{marginLeft:'auto',width:255,height:5,background:'#344454'}}><div style={{height:5,width:`${Math.round((starts[index-1]+f)/TOTAL_FRAMES*100)}%`,maxWidth:'100%',background:lime}}/></div>
  </div>
 </AbsoluteFill>;
}

function Title({eyebrow,headline,sub}: {eyebrow:string,headline:string,sub?:string}){
 const f=useCurrentFrame(),rise=interpolate(f,[0,20],[45,0],{extrapolateRight:'clamp'}),opacity=interpolate(f,[0,17],[0,1],{extrapolateRight:'clamp'});
 return <div style={{transform:`translateY(${rise}px)`,opacity}}><div style={{...pix(18,lime),letterSpacing:4,marginBottom:15}}>{eyebrow}</div><h1 style={{...pix(57),margin:'0 0 18px'}}>{headline}</h1>{sub&&<p style={{...pix(23,muted),margin:0}}>{sub}</p>}</div>;
}

function Hook(){const f=useCurrentFrame();const shots=[
 {from:0,duration:66,file:'solo.mp4',start:180,caption:'一句话，做出这样的游戏？',scale:1.62},
 {from:66,duration:66,file:'boss-live.mp4',start:70,caption:'妖王来了！',scale:1.32},
 {from:132,duration:57,file:'friends.mp4',start:190,caption:'搭子，别掉队！',scale:1.62},
 {from:189,duration:66,file:'boss-live.mp4',start:185,caption:'接招！',scale:1.32},
 {from:255,duration:45,file:'solo.mp4',start:265,caption:'真男人就下 18 层',scale:1.7},
 ];return <AbsoluteFill style={{background:'#091521',overflow:'hidden'}}>
 {shots.map((shot,i)=><Sequence key={i} from={shot.from} durationInFrames={shot.duration}>
  <AbsoluteFill style={{overflow:'hidden'}}>
   <OffthreadVideo src={media(shot.file)} startFrom={shot.start} muted style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${shot.scale})`,filter:'saturate(1.18) contrast(1.08)'}}/>
   <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,#07111c66 0%,transparent 43%,#06101dd9 100%)'}}/>
   <div style={{position:'absolute',left:70,bottom:66,...pix(i===4?67:49,i===3?coral:cream),letterSpacing:3,transform:`translateY(${interpolate(f-shot.from,[0,9],[45,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}px)`}}>{shot.caption}</div>
   <div style={{position:'absolute',top:38,left:70,...pix(18,lime),letterSpacing:3}}>COMBOS × 18 FLOORS OF MAYHEM</div>
   <div style={{position:'absolute',top:38,right:70,...pix(18,cream)}}>0{i+1} / 05</div>
  </AbsoluteFill>
 </Sequence>)}
 <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'repeating-linear-gradient(transparent 0,transparent 3px,#06101a24 4px)',opacity:.28}}/>
 </AbsoluteFill>}

function Terminal(){const f=useCurrentFrame();const appear=(at:number)=>interpolate(f,[at,at+12],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});return <Stage duration={frames[1]} index={2} label="01 Codex × Combos · 发一个链接，直接开工">
  <div style={{position:'absolute',top:113,left:70,right:70}}><Title eyebrow="01 / HOW IT STARTED" headline="把链接，发给 Codex。" sub="GPT-6 Sol × Combos：游戏从一句话开始。"/></div>
  <div style={{position:'absolute',left:85,right:85,top:300,height:305,...frameBox,background:'#0c1723',padding:30}}>
   <div style={{...pix(18,lime),marginBottom:15}}>我发给 Codex 的消息 ↓</div>
   <div style={{...pix(24),lineHeight:1.35,opacity:appear(22)}}>「请安装 combos.converge.ai/cli，<br/>　然后和我一起做一个联机小游戏。」</div>
   <div style={{position:'absolute',left:30,right:30,top:149,opacity:appear(79)}}>
    <div style={{...pix(16,'#8ecdd3'),marginBottom:8}}>CODEX 执行的安装命令</div>
    <div style={{background:'#07111b',border:'2px solid #66848e',padding:'12px 15px',fontFamily:'Menlo, monospace',fontSize:20,lineHeight:1.4,color:cream,whiteSpace:'pre'}}>{'curl -fsSL https://cdn.combos.fun/cli/install.sh | sh && \\\n  . "$HOME/.local/share/combos/env"'}</div>
   </div>
   <div style={{position:'absolute',right:30,top:25,...pix(18,lime),opacity:appear(192),background:'#244334',padding:'9px 12px',border:'2px solid #8db882'}}>✓ 安装完成</div>
  </div>
 </Stage>}

function Assets(){const f=useCurrentFrame(),bob=Math.sin(f/16)*7;return <Stage duration={frames[2]} index={3} label="02 自然语言提需求 · 角色与音效逐步成形">
  <div style={{position:'absolute',left:65,top:125}}><Title eyebrow="02 / JUST DESCRIBE IT" headline="直接说想要什么。" sub="水果 × 动物 × 复古像素风，再加点游戏音效。"/></div>
  <div style={{position:'absolute',left:60,top:295,width:1160,height:300,...frameBox,background:'#1d2c40',display:'flex',alignItems:'center',justifyContent:'center',transform:`translateY(${bob}px)`}}><Img src={media('hero-lineup.png')} style={{width:'100%',height:'100%',objectFit:'contain'}}/></div>
  <div style={{position:'absolute',left:82,top:616,display:'flex',gap:16}}>{['水果 × 动物','5 位怪咖','丑萌像素风'].map((s,i)=><div key={s} style={{...pix(17,i===1?lime:cream),background:'#25374a',padding:'9px 14px',border:'2px solid #8ca1aa'}}>{s}</div>)}</div>
 </Stage>}

function Actions(){const f=useCurrentFrame();const col=Math.min(5,Math.floor(Math.max(0,f-45)/42));return <Stage duration={frames[3]} index={4} label="03 动作帧 · 从静态素材到可玩的角色">
  <div style={{position:'absolute',left:60,top:123}}><Title eyebrow="03 / KEYFRAMES" headline="角色不止站着。" sub="待机 / 跑动 / 出拳 / 投掷 / 受击 / 淘汰"/></div>
  <div style={{position:'absolute',left:59,top:287,width:790,height:380,...frameBox,background:'#e900e8'}}>
   <Img src={media('action-sheet.webp')} style={{width:'100%',height:'100%',objectFit:'fill',imageRendering:'pixelated'}}/>
   <div style={{position:'absolute',left:`${Math.round(col*16.66)}%`,top:0,width:'16.66%',height:'20%',border:'5px solid #fff1ae',boxShadow:'0 0 0 4px #142434',boxSizing:'border-box'}}/>
  </div>
  <div style={{position:'absolute',left:890,top:340,width:300}}><div style={bar(80)}/><h2 style={{...pix(37),margin:'18px 0'}}>一张图<br/>拆成多帧。</h2><p style={{...pix(19,muted),lineHeight:1.5}}>素材表 → 挑帧 → 组合动作 → 游戏内反馈</p></div>
 </Stage>}

function Iteration(){const f=useCurrentFrame();const showBoss=f>155;return <Stage duration={frames[4]} index={5} label="04 对话迭代 · 玩法一步步长出来">
  <div style={{position:'absolute',left:65,top:123}}><Title eyebrow="04 / FROM CHAT TO GAME" headline="一句话，长出一套玩法。"/></div>
  <div style={{position:'absolute',left:70,top:277,width:510,padding:25,...frameBox,background:'#21334a'}}>
   <div style={{...pix(16,lime),marginBottom:18}}>最初的需求</div>
   <div style={{...pix(28),lineHeight:1.45}}>“往下跳、失误淘汰、<br/>最后排名。”</div>
   <div style={{height:3,background:'#627686',margin:'20px 0'}}/>
   <div style={{...pix(17,muted)}}>继续聊天 → 加入关卡、道具、妖王与奖励</div>
  </div>
  <div style={{position:'absolute',left:625,top:270,width:570,height:355,...frameBox}}><Img src={media(showBoss?'ultimate.png':'boss-fight.png')} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'left top'}}/></div>
  <div style={{position:'absolute',left:92,top:555,display:'flex',gap:9}}>{[['heart.webp','红心'],['shield.webp','护盾'],['poison.webp','毒果'],['hourglass.webp','沙漏']].map(([icon,s])=><span key={s} style={{display:'flex',alignItems:'center',gap:6,...pix(16,ink),background:lime,padding:'5px 10px'}}><Img src={media(icon)} style={{width:26,height:26,objectFit:'contain',imageRendering:'pixelated'}}/>{s}</span>)}</div>
 </Stage>}

function GameClip({name,startFrom=0}: {name:string,startFrom?:number}){return <div style={{position:'relative',width:835,height:440,...frameBox,background:'#0b1420'}}><OffthreadVideo src={media(name)} startFrom={startFrom} muted style={{width:'100%',height:'100%',objectFit:'cover',transform:'scale(1.4) translateY(25px)'}}/></div>}

function Solo(){return <Stage duration={frames[5]} index={6} label="05 单人 / 人机 · 真正能操作的坠落冒险">
  <div style={{position:'absolute',left:55,top:110}}><Title eyebrow="05 / PLAYABLE DEMO" headline="选个角色，真的下去。"/></div>
  <div style={{position:'absolute',left:55,top:222}}><GameClip name="solo.mp4" startFrom={125}/></div>
  <div style={{position:'absolute',left:920,top:245,width:285}}>{['改名选角','下降抢道具','躲开陷阱','深入后迎战妖王'].map((s,i)=><div key={s} style={{...pix(19,i===3?lime:cream),padding:'15px 6px',borderBottom:'2px solid #587186'}}><span style={{color:coral}}>0{i+1}　</span>{s}</div>)}</div>
 </Stage>}

function Friends(){return <Stage duration={frames[6]} index={7} label="06 多人在线 · 两个真实浏览器，同一间房">
  <div style={{position:'absolute',left:55,top:110}}><Title eyebrow="06 / MULTIPLAYER" headline="朋友来了，一起往下。"/></div>
  <div style={{position:'absolute',left:55,top:222}}><GameClip name="friends.mp4" startFrom={46}/></div>
  <div style={{position:'absolute',left:920,top:248,width:285}}>{['创建房间','分享链接','真人同步闯关','淘汰后继续观战'].map((s,i)=><div key={s} style={{...pix(19,i===3?lime:cream),padding:'15px 6px',borderBottom:'2px solid #587186'}}><span style={{color:coral}}>0{i+1}　</span>{s}</div>)}</div>
 </Stage>}

function Publish(){const f=useCurrentFrame();const pop=spring({frame:f-145,fps:FPS,config:{damping:14,stiffness:120}});const pageOpacity=interpolate(f,[0,10,120,150],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const cardOpacity=interpolate(f,[130,158],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});return <Stage duration={frames[7]} index={8} label="07 Combos 发布 · 电脑 / 手机均可打开">
  <div style={{position:'absolute',inset:0,opacity:pageOpacity}}><Img src={media('combos-published-clean.png')} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 20%',filter:'brightness(.68)'}}/><div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,#081523cf,transparent 90%)'}}/><div style={{position:'absolute',left:65,top:200,width:820,padding:24,background:'#101e2bdc',border:'3px solid #e5d59c'}}><Title eyebrow="PUBLISHED / COMBOS GAME" headline="真的发布了。" sub="浏览器打开，就能开局。"/></div></div>
  <div style={{opacity:cardOpacity}}><div style={{position:'absolute',left:65,top:120}}><Title eyebrow="07 / SHIP IT" headline="已经发布，欢迎来战。" sub="真男人就下18层　/　18 Floors of Mayhem"/></div>
  <div style={{position:'absolute',left:65,top:295,width:660,height:335,...frameBox}}><Img src={media('hero-poster.png')} style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>
  <div style={{position:'absolute',left:760,top:295,width:450,height:335,...frameBox,background:'#22384c',padding:24,transform:`scale(${Math.max(.1,pop)})`,transformOrigin:'center'}}>
   <div style={{...pix(18,lime),marginBottom:15}}>PLAY ON COMBOS</div>
   <div style={{display:'flex',gap:18,alignItems:'center'}}><Img src={media('game-qr.png')} style={{width:155,height:155,imageRendering:'pixelated',background:'#fff',padding:8}}/><div style={{...pix(25),lineHeight:1.45}}>扫一下，<br/>看你能下几层。</div></div>
   <div style={{height:3,background:'#687b85',margin:'22px 0 15px'}}/>
   <div style={{...pix(21,cream)}}>share.combos.game/p/7820654</div>
  </div></div>
 </Stage>}

const scenes=[Hook,Terminal,Assets,Actions,Iteration,Solo,Friends,Publish];
const voice=['01.mp3','02.mp3','03.mp3','04.mp3','05.mp3','06.mp3','07.mp3','08-short.mp3'];
export const Story:React.FC=()=> <AbsoluteFill style={{backgroundColor:ink}}>
 <style>{`@font-face{font-family:Pixel;src:url('${media('pixel.woff2')}') format('woff2');font-display:block}`}</style>
 {scenes.map((Scene,i)=><Sequence key={i} from={starts[i]} durationInFrames={frames[i]}><Scene/>{voice[i]&&<Audio src={staticFile('voice/'+voice[i])} volume={1}/>}</Sequence>)}
 <Audio src={media('bgm.mp3')} loop volume={f=>f<285?0.19:0.13}/>
 {[10,67,132,189,255].map((start,i)=><Sequence key={'hit'+i} from={start} durationInFrames={30}><Audio src={media(i%2?'punch.mp3':'jump.mp3')} volume={i%2?0.38:0.3}/></Sequence>)}
 {starts.slice(1).map((start,i)=><Sequence key={'sfx'+i} from={start} durationInFrames={30}><Audio src={media('click.mp3')} volume={0.42}/></Sequence>)}
 </AbsoluteFill>;
