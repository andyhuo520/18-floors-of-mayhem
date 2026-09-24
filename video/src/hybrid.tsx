import React from 'react';
import {AbsoluteFill,Audio,Img,OffthreadVideo,Sequence,interpolate,staticFile,useCurrentFrame} from 'remotion';

const FPS=30;
const durations=[180,180,265,180,180,300,360,180,171,84,180];
const starts=durations.map((_,i)=>durations.slice(0,i).reduce((a,b)=>a+b,0));
export const HYBRID_FRAMES=durations.reduce((a,b)=>a+b,0);
const file=(name:string)=>staticFile('media/'+name);
const presenter=(name:string)=>staticFile('presenter/'+name);
const cream='#f3e6b7',lime='#d9ee91',coral='#ff906a',muted='#b9c8cf';
const pixel=(size:number,color=cream):React.CSSProperties=>({fontFamily:'Pixel,monospace',fontSize:size,color,lineHeight:1.2,textShadow:'4px 4px 0 #07101b'});

function GameVideo({name,start=0,zoom=1.55}: {name:string,start?:number,zoom?:number}){
 return <OffthreadVideo src={file(name)} startFrom={start} muted style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${zoom})`,filter:'saturate(1.1) contrast(1.06)'}}/>;
}
function Backdrop({children}:React.PropsWithChildren){return <AbsoluteFill style={{background:'#0a1623',overflow:'hidden'}}>
 {children}
 <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,#05101a95 0%,transparent 32%,transparent 48%,#06111dcc 100%)',pointerEvents:'none'}}/>
 <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(transparent 0,transparent 3px,#06101a19 4px)',pointerEvents:'none'}}/>
 </AbsoluteFill>}
function Speaker({clip,liveUntil=0,start=0,talking=true}: {clip?:number,liveUntil?:number,start?:number,talking?:boolean}){
 const f=useCurrentFrame();const live=clip&&f<liveUntil;
 return <div style={{position:'absolute',right:42,bottom:35,zIndex:30}}>
  <div style={{position:'relative',width:215,height:215,borderRadius:'50%',overflow:'hidden',border:`6px solid ${talking?lime:'#7f95a2'}`,boxShadow:'0 0 0 6px #0a1b2a, 12px 13px 0 #030b13',background:'#20344a'}}>
   {live?<OffthreadVideo src={presenter(`clip-${clip}.mp4`)} startFrom={start} muted style={{width:'100%',height:'100%',objectFit:'cover',transform:'scale(1.85) translateY(19px)'}}/>:<Img src={presenter('avatar.png')} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
  </div>
  <div style={{position:'absolute',bottom:-10,right:6,padding:'8px 12px',background:talking?'#d9ee91':'#425567',border:'3px solid #0b1520',...pixel(15,talking?'#18232c':cream)}}>{talking?'● 真人解说':'● 游戏实录'}</div>
 </div>;
}
function Chrome({tag}: {tag:string}){return <>
 <div style={{position:'absolute',top:28,left:54,zIndex:20,...pixel(17,lime),letterSpacing:2}}>CODEX × COMBOS</div>
 <div style={{position:'absolute',top:28,right:54,zIndex:20,...pixel(17,cream)}}>真男人就下 18 层</div>
 <div style={{position:'absolute',bottom:23,left:54,zIndex:20,...pixel(15,muted)}}>{tag}</div>
 </>}
function Headline({title,sub,accent=false}: {title:string,sub?:string,accent?:boolean}){
 const f=useCurrentFrame();const rise=interpolate(f,[0,12],[30,0],{extrapolateRight:'clamp'});return <div style={{position:'absolute',left:55,bottom:89,maxWidth:875,zIndex:20,transform:`translateY(${rise}px)`,padding:'14px 18px',background:'#0a1b2ad9',borderLeft:`6px solid ${accent?coral:lime}`}}>
  <div style={{...pixel(39,accent?coral:cream)}}>{title}</div>
  {sub&&<div style={{...pixel(20,muted),marginTop:7}}>{sub}</div>}
 </div>;
}
function Opening(){return <Backdrop>
 <Sequence from={0} durationInFrames={60}><GameVideo name="solo.mp4" start={180}/></Sequence>
 <Sequence from={60} durationInFrames={60}><GameVideo name="boss-live.mp4" start={90} zoom={1.3}/></Sequence>
 <Sequence from={120} durationInFrames={60}><GameVideo name="friends.mp4" start={190}/></Sequence>
 <Chrome tag="01 / 一句话，先看游戏效果"/><Headline title="一句话，做出这样的游戏？" sub="下落 · 打怪 · 和朋友联机" accent/>
 <Speaker clip={1} liveUntil={175}/>
 </Backdrop>}
function Model(){return <Backdrop>
 <GameVideo name="solo.mp4" start={0} zoom={1.23}/>
 <div style={{position:'absolute',top:142,left:62,padding:'20px 24px',background:'#0b1a28e8',border:'3px solid #d4c895',zIndex:10}}>
  <div style={{...pixel(23,lime)}}>这款游戏怎么来的？</div><div style={{...pixel(41),marginTop:16}}>Codex GPT-6 Sol</div><div style={{...pixel(32,coral),marginTop:5}}>× Combos</div>
 </div>
 <Chrome tag="02 / 模型与工具"/><Speaker clip={2} liveUntil={150}/>
 </Backdrop>}
function Assets(){const f=useCurrentFrame();return <Backdrop>
 <GameVideo name="solo.mp4" start={175} zoom={1.45}/>
 <div style={{position:'absolute',top:105,left:60,width:780,height:300,background:'#0a1b2aeb',border:'3px solid #d9c995',padding:22,zIndex:10}}>
  <div style={{...pixel(20,lime)}}>发给 Codex 的一句话</div>
  <div style={{...pixel(25),marginTop:16}}>「安装 Combos，帮我做一个<br/>水果动物混搭的像素联机游戏。」</div>
  <div style={{...pixel(18,'#8fcbd2'),marginTop:18}}>combos.converge.ai/cli</div>
 </div>
 <div style={{position:'absolute',left:60,top:425,width:780,height:168,zIndex:11,background:'#12273ceb',border:'2px solid #718b94',overflow:'hidden',opacity:interpolate(f,[60,82],[0,1],{extrapolateRight:'clamp'})}}><Img src={file('hero-lineup.png')} style={{width:'100%',height:'100%',objectFit:'contain'}}/></div>
 <Chrome tag="03 / 只描述想法，素材逐步成形"/><Speaker clip={3} liveUntil={78}/>
 </Backdrop>}
function Motion(){return <Backdrop>
 <GameVideo name="boss-live.mp4" start={38} zoom={1.25}/>
 <div style={{position:'absolute',top:124,left:60,display:'flex',gap:10,zIndex:12}}>{['跑','跳','拳','受击'].map((action,i)=><div key={action} style={{...pixel(25,i===2?coral:cream),background:'#0b1a28e8',padding:'8px 14px',border:'2px solid #d9c995'}}>{action}</div>)}</div>
 <Chrome tag="04 / 角色有动作，游戏才活起来"/><Headline title="跑、跳、出拳、挨揍。"/><Speaker clip={4} liveUntil={76}/>
 </Backdrop>}
function Iteration(){return <Backdrop>
 <GameVideo name="boss-live.mp4" start={154} zoom={1.28}/>
 <div style={{position:'absolute',top:116,left:62,display:'flex',gap:12,zIndex:15}}>{['关卡','妖王','道具','结算'].map((s,i)=><div key={s} style={{...pixel(20,i===1?coral:cream),background:'#0d1f2de8',border:'2px solid #d5c697',padding:'9px 14px'}}>{s}</div>)}</div>
 <Chrome tag="05 / 一次次对话，把点子变成玩法"/><Headline title="一句话，长出一套玩法。"/><Speaker clip={5} liveUntil={170}/>
 </Backdrop>}
function Solo(){return <Backdrop>
 <GameVideo name="solo.mp4" start={180} zoom={1.55}/>
 <Chrome tag="06 / 单人实机：抢道具、躲机关、挑战 Boss"/><Headline title="自己先下去试试。" sub="选角色 → 往下闯 → 横版妖王战"/><Speaker clip={6} liveUntil={150}/>
 </Backdrop>}
function Friends(){const f=useCurrentFrame();const notes=['创建房间','朋友加入','一起下落','有人淘汰，其他人继续'];const n=Math.min(3,Math.floor(f/90));return <Backdrop>
 <GameVideo name="friends.mp4" start={30} zoom={1.5}/>
 <Chrome tag="07 / 双人房间实录 · 这里让游戏自己说话"/><Headline title="朋友来了，一起往下。" sub={`${String(n+1).padStart(2,'0')} / ${notes[n]}`}/><Speaker talking={false}/>
 </Backdrop>}
function BossBreak(){return <Backdrop>
 <GameVideo name="boss-live.mp4" start={73} zoom={1.3}/>
 <Chrome tag="08 / 深入后迎战妖王 · 实机画面"/><Headline title="下得够深，还得接住妖王的招。" accent/><Speaker talking={false}/>
 </Backdrop>}
function Publish(){return <Backdrop>
 <Img src={file('combos-published-clean.png')} style={{position:'absolute',width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 20%',filter:'brightness(.72)'}}/>
 <Chrome tag="09 / Combos 发布页"/><Headline title="已经发布，电脑手机都能玩。"/><Speaker clip={7} liveUntil={110}/>
 </Backdrop>}
function Challenge(){return <Backdrop>
 <Img src={file('hero-poster.png')} style={{position:'absolute',width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.8)'}}/>
 <Chrome tag="10 / 真人挑战"/><Headline title="真男人就下 18 层。" sub="来试试，你能下几层？" accent/><Speaker clip={8} start={170} liveUntil={84}/>
 </Backdrop>}
function End(){return <Backdrop>
 <Img src={file('hero-poster.png')} style={{position:'absolute',width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.55)'}}/>
 <div style={{position:'absolute',left:80,top:180,zIndex:10,...pixel(58)}}>是兄弟，<br/>就来挑战！</div>
 <div style={{position:'absolute',left:80,top:405,zIndex:10,...pixel(24,lime)}}>真男人就下18层 / 18 Floors of Mayhem</div>
 <div style={{position:'absolute',right:320,top:125,zIndex:10,padding:16,background:'#fff',border:'5px solid #d9c995'}}><Img src={file('game-qr.png')} style={{width:180,height:180}}/></div>
 <div style={{position:'absolute',right:316,top:355,zIndex:10,...pixel(17)}}>share.combos.game/p/7820654</div>
 <Chrome tag="打开 Combos，看看你能下几层"/><Speaker talking={false}/>
 </Backdrop>}

const scenes=[Opening,Model,Assets,Motion,Iteration,Solo,Friends,BossBreak,Publish,Challenge,End];
const audio=[
 {scene:0,clip:1},{scene:1,clip:2},{scene:2,clip:3},{scene:3,clip:4},{scene:4,clip:5},{scene:5,clip:6},{scene:8,clip:7},{scene:9,clip:8,startFrom:170},
];
export const Hybrid:React.FC=()=> <AbsoluteFill style={{background:'#081420'}}>
 <style>{`@font-face{font-family:Pixel;src:url('${file('pixel.woff2')}') format('woff2');font-display:block}`}</style>
 {scenes.map((Scene,i)=><Sequence key={i} from={starts[i]} durationInFrames={durations[i]}><Scene/></Sequence>)}
 {audio.map(({scene,clip,startFrom})=><Sequence key={'audio'+clip} from={starts[scene]} durationInFrames={durations[scene]}><Audio src={presenter(`voice-${clip}.m4a`)} startFrom={startFrom||0} volume={1}/></Sequence>)}
 <Audio src={file('bgm.mp3')} loop volume={f=>f>=starts[6]&&f<starts[8]?0.22:f>=starts[10]?0.22:0.05}/>
 {[60,120,starts[4],starts[6],starts[7],starts[10]].map((at,i)=><Sequence key={'sfx'+i} from={at} durationInFrames={30}><Audio src={file(i%2?'punch.mp3':'jump.mp3')} volume={0.21}/></Sequence>)}
 </AbsoluteFill>;
