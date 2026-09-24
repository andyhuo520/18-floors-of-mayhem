import React from 'react';
import {Composition} from 'remotion';
import {Story,TOTAL_FRAMES} from './story';
import {Hybrid,HYBRID_FRAMES} from './hybrid';
import {BerryxiaVersion,BERRYXIA_FRAMES,BerryxiaTight,BERRYXIA_TIGHT_FRAMES,BerryxiaNewEnding,BERRYXIA_NEW_ENDING_FRAMES,BerryxiaEndingInsert,BerryxiaEndingInsertFinal} from './berryxia';

export const Root:React.FC=()=>
 <>
  <Composition id="Man18Story" component={Story} durationInFrames={TOTAL_FRAMES} fps={30} width={1280} height={720}/>
  <Composition id="Man18PresenterCut" component={Hybrid} durationInFrames={HYBRID_FRAMES} fps={30} width={1280} height={720}/>
  <Composition id="Man18Berryxia" component={BerryxiaVersion} durationInFrames={BERRYXIA_FRAMES} fps={30} width={1280} height={720}/>
  <Composition id="Man18BerryxiaTight" component={BerryxiaTight} durationInFrames={BERRYXIA_TIGHT_FRAMES} fps={30} width={1280} height={720}/>
  <Composition id="Man18BerryxiaNewEnding" component={BerryxiaNewEnding} durationInFrames={BERRYXIA_NEW_ENDING_FRAMES} fps={30} width={1280} height={720}/>
  <Composition id="Man18BerryxiaEndingInsert" component={BerryxiaEndingInsert} durationInFrames={BERRYXIA_TIGHT_FRAMES} fps={30} width={1280} height={720}/>
  <Composition id="Man18BerryxiaEndingInsertFinal" component={BerryxiaEndingInsertFinal} durationInFrames={BERRYXIA_TIGHT_FRAMES} fps={30} width={1280} height={720}/>
 </>;
