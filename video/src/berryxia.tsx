import React from 'react';
import {AbsoluteFill,Audio,OffthreadVideo,Sequence,staticFile,useCurrentFrame} from 'remotion';

export const BERRYXIA_FRAMES=2700;
const asset=(name:string)=>staticFile('media/'+name);
const source=(name:string)=>staticFile('presenter/'+name);

type VoiceCut={clip:number;at:number;duration:number;sourceStart?:number;visible:Array<[number,number]>};
// Times are in frames. The original 90-second picture is kept intact; only its soundtrack is muted.
const cuts:VoiceCut[]=[
 {clip:1,at:0,duration:181,visible:[[0,181]]},
 {clip:2,at:300,duration:181,visible:[[0,181]]},
 {clip:3,at:576,duration:265,visible:[[0,90],[214,265]]},
 {clip:4,at:954,duration:181,visible:[[0,91]]},
 {clip:5,at:1323,duration:181,visible:[[0,181]]},
 {clip:6,at:1650,duration:301,visible:[[0,72],[122,184]]},
 {clip:7,at:2355,duration:171,visible:[[0,91]]},
 {clip:8,at:2526,duration:84,sourceStart:170,visible:[[0,84]]},
];

function BerryxiaCircle({cut}: {cut:VoiceCut}){
 const f=useCurrentFrame();
 if(!cut.visible.some(([a,b])=>f>=a&&f<b))return null;
 return <div style={{position:'absolute',right:35,bottom:38,zIndex:50}}>
  <div style={{width:213,height:213,borderRadius:'50%',overflow:'hidden',border:'6px solid #d9ee91',boxShadow:'0 0 0 5px #102536, 9px 10px 0 #030c14',background:'#102536'}}>
   <OffthreadVideo src={source(`clip-${cut.clip}.mp4`)} startFrom={cut.sourceStart||0} muted style={{width:'100%',height:'100%',objectFit:'cover',transform:'scale(1.85) translateY(19px)'}}/>
  </div>
  <div style={{position:'absolute',bottom:-13,right:18,background:'#d9ee91',border:'3px solid #102536',padding:'7px 14px',fontFamily:'Pixel,monospace',fontSize:19,color:'#102536',textShadow:'none'}}>Berryxia</div>
 </div>;
}

export const BerryxiaVersion:React.FC=()=>{
 const f=useCurrentFrame();
 const speaking=cuts.some(c=>f>=c.at&&f<c.at+c.duration);
 return <AbsoluteFill style={{background:'#091724'}}>
  <style>{`@font-face{font-family:Pixel;src:url('${asset('pixel.woff2')}') format('woff2');font-display:block}`}</style>
  <OffthreadVideo src={asset('original-story.mp4')} muted style={{width:'100%',height:'100%',objectFit:'fill'}}/>
  {cuts.map(c=><Sequence key={'speaker-'+c.clip} from={c.at} durationInFrames={c.duration}><BerryxiaCircle cut={c}/><Audio src={source(`voice-${c.clip}.m4a`)} startFrom={c.sourceStart||0} volume={1}/></Sequence>)}
  <Audio src={asset('bgm.mp3')} loop volume={speaking?0.055:0.16}/>
 </AbsoluteFill>;
};

// A brisk alternate edit: keep the source film and its visual language, remove
// static pauses between lines, and use existing gameplay for two long stills.
const tightDurations=[300,180,265,180,180,300,240,171,84,90];
const tightStarts=tightDurations.map((_,i)=>tightDurations.slice(0,i).reduce((a,b)=>a+b,0));
export const BERRYXIA_TIGHT_FRAMES=tightDurations.reduce((a,b)=>a+b,0);
const tightCuts:VoiceCut[]=[
 {clip:1,at:tightStarts[0],duration:181,visible:[[0,181]]},
 {clip:2,at:tightStarts[1],duration:180,visible:[[0,180]]},
 {clip:3,at:tightStarts[2],duration:265,visible:[[0,90],[214,265]]},
 {clip:4,at:tightStarts[3],duration:180,visible:[[0,91]]},
 {clip:5,at:tightStarts[4],duration:180,visible:[[0,180]]},
 {clip:6,at:tightStarts[5],duration:300,visible:[[0,72],[122,184]]},
 {clip:7,at:tightStarts[7],duration:171,visible:[[0,91]]},
 {clip:8,at:tightStarts[8],duration:84,sourceStart:170,visible:[[0,84]]},
];
function SourceShot({start}: {start:number}){return <OffthreadVideo src={asset('original-story.mp4')} startFrom={start} muted style={{width:'100%',height:'100%',objectFit:'fill'}}/>}
function GameplayShot({name,start,zoom}: {name:string,start:number,zoom:number}){return <AbsoluteFill style={{overflow:'hidden'}}><OffthreadVideo src={asset(name)} startFrom={start} muted style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${zoom})`}}/></AbsoluteFill>}
const tightVisuals=[
 [{from:0,duration:300,kind:'source',start:0}],
 [{from:0,duration:180,kind:'source',start:311}],
 [{from:0,duration:120,kind:'source',start:587},{from:120,duration:145,kind:'solo',start:180}],
 [{from:0,duration:85,kind:'source',start:965},{from:85,duration:95,kind:'boss',start:75}],
 [{from:0,duration:95,kind:'source',start:1334},{from:95,duration:85,kind:'boss',start:185}],
 [{from:0,duration:300,kind:'source',start:1661}],
 [{from:0,duration:240,kind:'source',start:2030}],
 [{from:0,duration:171,kind:'source',start:2366}],
 [{from:0,duration:84,kind:'source',start:2526}],
 [{from:0,duration:90,kind:'source',start:2610}],
];
export const BerryxiaTight:React.FC=()=>{
 const f=useCurrentFrame();
 const speaking=tightCuts.some(c=>f>=c.at&&f<c.at+c.duration);
 return <AbsoluteFill style={{background:'#091724'}}>
  <style>{`@font-face{font-family:Pixel;src:url('${asset('pixel.woff2')}') format('woff2');font-display:block}`}</style>
  {tightVisuals.map((shots,i)=><Sequence key={'scene-'+i} from={tightStarts[i]} durationInFrames={tightDurations[i]}>
   {shots.map((shot,j)=><Sequence key={j} from={shot.from} durationInFrames={shot.duration}>
    {shot.kind==='source'?<SourceShot start={shot.start}/>:<GameplayShot name={shot.kind==='boss'?'boss-live.mp4':'solo.mp4'} start={shot.start} zoom={shot.kind==='boss'?1.3:1.55}/>}
   </Sequence>)}
  </Sequence>)}
  {tightCuts.map(c=><Sequence key={'voice-'+c.clip} from={c.at} durationInFrames={c.duration}><BerryxiaCircle cut={c}/><Audio src={source(`voice-${c.clip}.m4a`)} startFrom={c.sourceStart||0} volume={1}/></Sequence>)}
  <Audio src={asset('bgm.mp3')} loop volume={speaking?0.055:0.17}/>
 </AbsoluteFill>;
};

// The supplied ending is a 10-second picture cut. The existing Berryxia
// narration and music remain underneath, while its former picture-in-picture
// is covered by the full-screen presenter shot.
export const BERRYXIA_NEW_ENDING_FRAMES=tightStarts[7]+300;
export const BerryxiaNewEnding:React.FC=()=> <AbsoluteFill>
 <BerryxiaTight/>
 <Sequence from={tightStarts[7]} durationInFrames={300} style={{zIndex:100}}>
  <AbsoluteFill style={{zIndex:100}}>
   <OffthreadVideo src={source('generated-ending.mp4')} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>
  </AbsoluteFill>
 </Sequence>
</AbsoluteFill>;

// Keep every frame of the approved tight cut; use the supplied video only as
// the lower-right presenter insert in its ending section.
export const BerryxiaEndingInsert:React.FC=()=> <AbsoluteFill>
 <BerryxiaTight/>
 <Sequence from={tightStarts[7]} durationInFrames={300} style={{zIndex:100}}>
  <div style={{position:'absolute',right:35,bottom:38,zIndex:100}}>
   <div style={{width:213,height:213,borderRadius:'50%',overflow:'hidden',border:'6px solid #d9ee91',boxShadow:'0 0 0 5px #102536, 9px 10px 0 #030c14',background:'#102536'}}>
    <OffthreadVideo src={source('generated-ending.mp4')} muted style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center'}}/>
   </div>
   <div style={{position:'absolute',bottom:-13,right:18,background:'#d9ee91',border:'3px solid #102536',padding:'7px 14px',fontFamily:'Pixel,monospace',fontSize:19,color:'#102536',textShadow:'none'}}>Berryxia</div>
  </div>
 </Sequence>
</AbsoluteFill>;

// Preserve the same game cut while keeping the supplied insert on screen
// through the final frame. Only the clip's post-narration tail is slowed.
export const BerryxiaEndingInsertFinal:React.FC=()=> <AbsoluteFill>
 <BerryxiaTight/>
 <Sequence from={tightStarts[7]} durationInFrames={BERRYXIA_TIGHT_FRAMES-tightStarts[7]} style={{zIndex:100}}>
  <div style={{position:'absolute',right:35,bottom:38,zIndex:100}}>
   <div style={{position:'relative',width:213,height:213,borderRadius:'50%',overflow:'hidden',border:'6px solid #d9ee91',boxShadow:'0 0 0 5px #102536, 9px 10px 0 #030c14',background:'#102536'}}>
    <Sequence from={0} durationInFrames={255}>
     <OffthreadVideo src={source('generated-ending.mp4')} muted style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center'}}/>
    </Sequence>
    <Sequence from={255} durationInFrames={90}>
     <OffthreadVideo src={source('generated-ending.mp4')} startFrom={255} playbackRate={0.5} muted style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center'}}/>
    </Sequence>
   </div>
   <div style={{position:'absolute',bottom:-13,right:18,background:'#d9ee91',border:'3px solid #102536',padding:'7px 14px',fontFamily:'Pixel,monospace',fontSize:19,color:'#102536',textShadow:'none'}}>Berryxia</div>
  </div>
 </Sequence>
</AbsoluteFill>;
