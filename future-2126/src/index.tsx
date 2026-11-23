import React, {useEffect, useMemo} from 'react';
import {AbsoluteFill, Composition, getInputProps, registerRoot, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {Color, PerspectiveCamera, NoToneMapping} from 'three';
import captions from '../assets/captions.json';
import {makeWorld, SHOT_NAMES} from './world';
import {ease} from './rig';

const WIDTH=1080,HEIGHT=1920,FPS=30,SHOT=90;
const hook: Record<number,[string,string]>={
  0:['100 YEARS','LATER…'],3:['YOUR PHONE','IS ANCIENT'],8:['HERE’S THE','TERRIFYING PART…'],
  18:['TECHNOLOGY','CHANGES EVERYTHING…'],19:['WOULD YOU WAKE','UP IN 2126?'],
};
function Scene({id,t,fixed}:{id:number;t:number;fixed:boolean}){
  const world=useMemo(()=>makeWorld(id),[id]);
  const {camera,scene}=useThree();
  const backdrop=useMemo(()=>new Color(id===11?'#475a75':'#526985'),[id]);
  scene.background=backdrop;
  useEffect(()=>()=>world.dispose(),[world]);
  world.tick(t);
  world.camera(camera as PerspectiveCamera,t,fixed);
  return <primitive object={world.root} dispose={null}/>;
}
const font='Arial, Helvetica, sans-serif';
const shadow='0 3px 0 #252238, 2px 0 #252238, -2px 0 #252238, 0 -2px #252238, 0 3px 12px #241726';
function Video(){
  const frame=useCurrentFrame(),id=Math.min(19,Math.floor(frame/SHOT)),t=(frame%SHOT)/FPS;
  const input=getInputProps() as {fixedCamera?:boolean;noText?:boolean;renderDpr?:number;cover?:boolean};
  const cue=(captions as [number,number,string][]).find(([a,b])=>a<=frame/FPS&&frame/FPS<b);
  const words=cue?.[2].split(' ')??[];
  const focus=words.reduce((long,w,i)=>w.length>(words[long]?.length??0)?i:long,0);
  const title=input.cover?['100 YEARS','LATER']:hook[id];
  return <AbsoluteFill style={{background:'#7187a6'}}>
    <ThreeCanvas width={WIDTH} height={HEIGHT} dpr={input.renderDpr??.55}
      gl={{antialias:true,alpha:false,powerPreference:'high-performance',toneMapping:NoToneMapping}}
      camera={{fov:40,near:.1,far:110}}>
      <Scene id={id} t={t} fixed={!!input.fixedCamera}/>
    </ThreeCanvas>
    {!input.noText&&<AbsoluteFill style={{fontFamily:font,fontWeight:900,color:'#fff9eb',pointerEvents:'none'}}>
      <div style={{position:'absolute',inset:0,background:
        'linear-gradient(180deg, #26243b33 0%, transparent 30%, transparent 72%, #28233e46 100%)'}}/>
      {title&&<div style={{position:'absolute',top:146+21*(1-ease(t,0,.36)),left:55,right:55,textAlign:'center',
        textShadow:shadow,lineHeight:.99,letterSpacing:1}}>
        <div style={{fontSize:73}}>{title[0]}</div>
        <div style={{fontSize:Math.min(106,1570/title[1].length),color:id===8?'#ffb7ca':'#9bf5df',marginTop:11}}>{title[1]}</div>
      </div>}
      {input.cover&&<div style={{position:'absolute',top:78,left:91,right:91,display:'flex',justifyContent:'space-between',fontSize:40,textShadow:shadow,color:'#ffe6b5'}}><span>2026</span><span>2126</span></div>}
      {cue&&!input.cover&&<div style={{position:'absolute',left:38,right:112,bottom:233-9*(1-ease(frame/FPS,cue[0],cue[0]+.15)),
        display:'flex',justifyContent:'center',alignItems:'baseline',columnGap:14,textShadow:shadow,
        whiteSpace:'nowrap',fontSize:cue[2].length>30?43:53}}>
        {words.map((w,i)=><span key={i} style={{color:i===focus?'#9bf5df':'#fff9eb'}}>{w}</span>)}
      </div>}
    </AbsoluteFill>}
  </AbsoluteFill>;
}
registerRoot(()=> <Composition id="Future2126" component={Video} width={WIDTH} height={HEIGHT}
  fps={FPS} durationInFrames={SHOT*SHOT_NAMES.length}/>);
