import React, {type ReactNode} from 'react';
import {AbsoluteFill, Composition, Sequence, Still, interpolate, registerRoot, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {AdaptiveCity, Atmosphere, Bridge, Compare, Earth, Figure, GlobeRoom, Ground, Mass, Movement, Orbital, Sky, Terrain, amber, clamp, cream, ice, mint, navy, smooth} from './art';
import timing from './timing.json';

const shots = [
  {name:'Expanding horizon',time:0,title:['WHAT IF EARTH','DOUBLED IN SIZE?'],warm:true,art:Ground,mode:'hook'},
  {name:'Orbital growth',time:[0,6],title:['EARTH STARTS','TO GROW'],art:Orbital,mode:'grow'},
  {name:'Continents stretch',time:4.10,title:['THE WHOLE PLANET','EXPANDS'],art:Orbital,mode:'stretch'},
  {name:'Radius comparison',time:[1,4],title:['2× THE RADIUS'],art:Compare,mode:'radius'},
  {name:'Fixed density assumption',time:[1,8],title:['SAME DENSITY'],sub:'The same mass per unit volume',art:Orbital,mode:'close'},
  {name:'The cubic mass increase',time:[2,0],title:['8 TIMES','THE MASS'],sub:'Two times bigger in every dimension',art:Mass},
  {name:'Gravity from orbit',time:[3,0],title:['WHAT ABOUT','GRAVITY?'],art:GlobeRoom},
  {name:'Surface gravity comparison',time:[3,2],title:['2× SURFACE','GRAVITY'],sub:'8× mass ÷ 4× distance squared',art:Compare,mode:'gravity'},
  {name:'Walking under 2g',time:[4,0],title:['EVERY STEP','FEELS HEAVIER'],art:Movement,mode:'walk'},
  {name:'Reduced jumping height',time:[4,4],title:['A LOWER JUMP'],sub:'At the same push-off speed',art:Movement,mode:'jump'},
  {name:'The everyday cost of 2g',time:[4,10],title:['TWICE THE','WEIGHT'],art:Movement,mode:'walk'},
  {name:'Road and bridge',time:[4,15],title:['MORE LOAD ON','INFRASTRUCTURE'],art:Bridge,mode:'road'},
  {name:'Structural stress',time:[4,19],title:['STRUCTURES','UNDER STRESS'],sub:'Illustration · outcome depends on the change',art:Bridge,mode:'stress'},
  {name:'A changed landscape',time:[4,26],title:['THE CHANGE','WOULD MATTER'],art:Terrain,mode:'mountain'},
  {name:'The stronger pull on air',time:[5,0],title:['THE ATMOSPHERE','CHANGES TOO'],art:Atmosphere},
  {name:'Oceans on the larger globe',time:[6,0],title:['OCEANS &','CONTINENTS'],art:Orbital,mode:'ocean'},
  {name:'A different terrain',time:[6,5],title:['A RESHAPED','LANDSCAPE'],sub:'Illustration · no specific terrain predicted',art:Terrain,mode:'mountain'},
  {name:'The giant globe',time:[7,0],title:['THE BIGGER','PICTURE'],art:GlobeRoom},
  {name:'Before and after',time:[8,0],title:['SAME DENSITY.','DIFFERENT PLANET.'],art:Compare,mode:'after'},
  {name:'Enormous horizon',time:[8,7],title:['A DIFFERENT','WORLD'],warm:true,art:Ground,mode:'horizon'},
  {name:'A hypothetical adapted city',time:[9,0],title:['COULD HUMANITY','ADAPT?'],sub:'One imagined response',art:AdaptiveCity},
  {name:'Closing question',time:[9,6],title:['COULD YOU','LIVE HERE?'],warm:true,art:Ground,mode:'final'},
] as const;

type Scene = typeof shots[number];
type Word = typeof timing.captions[number][number];
const seconds = (scene: Scene) => typeof scene.time === 'number' ? scene.time : timing.lines[scene.time[0]][scene.time[1]].start;
const frameAt = (t: number, fps: number) => Math.round(t * fps);
const accent = (scene: Scene) => 'warm' in scene ? amber : ice;
const face = 'DejaVu Sans, Arial, sans-serif';
const mono = 'DejaVu Sans Mono, monospace';

const Headline = ({title, color, sub, thumbnail = false, children}: {
  title: readonly string[]; color: string; sub?: string; thumbnail?: boolean; children?: ReactNode;
}) => {
  const longest = Math.max(...title.map(line => line.length));
  const size = thumbnail ? 147 : Math.min(146, 1215 / Math.max(8, longest));
  return <div style={{position:'absolute', top:thumbnail ? 255 : 193, left:72, right:72, textAlign:'center',
    color:cream, fontFamily:face, textShadow:'0 7px 30px #030613a8'}}>
    {children}
    <div style={{fontSize:size, fontWeight:900, letterSpacing:-size*.057, lineHeight:.97, margin:'0 auto'}}>
      {title.map((line, index) => <div key={line} style={{color:index === title.length - 1 ? color : cream, whiteSpace:'nowrap'}}>{line}</div>)}
    </div>
    {sub && <div style={{fontSize:31, fontWeight:600, marginTop:24, color:'#f2f2ed'}}>{sub}</div>}
  </div>;
};

const marked = new Set(['earth','twice','eight','times','radius','doubles','density','mass','gravity','harder','stress','atmosphere','different','world','adapt']);
const subtitleText = (words: Word[], time: number, color: string) =>
  words.map((word, i) => {
    const keyword = marked.has(word.text.toLowerCase().replace(/[^a-z0-9]/g,''));
    const active = word.start <= time && time < word.end;
    return <React.Fragment key={word.start}>{i > 0 && ' '}
      <span style={{color:active || keyword ? color : cream, opacity:active || keyword ? 1 : .94}}>{word.text}</span>
    </React.Fragment>;
  });

const Captions = ({color, from}: {color: string; from: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = (from + frame) / fps;
  const cue = timing.captions.find((words, i) => words[0].start <= time &&
    time < Math.min(words.at(-1)!.end + .18, timing.captions[i+1]?.[0].start ?? Infinity));
  if (!cue) return null;
  return <div style={{position:'absolute', left:80, right:110, bottom:291, display:'flex', justifyContent:'center'}}>
    <div style={{fontFamily:face, fontSize:53, lineHeight:1.12, fontWeight:850, textAlign:'center',
      color:cream, background:'#080e1cf0', border:'2px solid #65779769', borderRadius:21,
      boxShadow:'0 8px 26px #07102494', padding:'13px 25px 16px', maxWidth:890}}>
      {subtitleText(cue, time, color)}
    </div>
  </div>;
};

const Stage = ({children, x = 0, y = 0, zoom = 1}: {children:ReactNode; x?:number; y?:number; zoom?:number}) => (
  <svg width="100%" height="100%" viewBox="0 0 1080 1920" role="img">
    <defs>
      <radialGradient id="lens"><stop offset=".55" stopColor="#060918" stopOpacity="0"/><stop offset="1" stopColor="#060918" stopOpacity=".62"/></radialGradient>
      <linearGradient id="safe-title" x2="0" y2="1"><stop stopColor="#07101e" stopOpacity=".84"/><stop offset="1" stopColor="#07101e" stopOpacity="0"/></linearGradient>
    </defs>
    <g transform={`translate(${540+x} ${1000+y}) scale(${zoom}) translate(-540 -1000)`}>{children}</g>
    <rect width="1080" height="1920" fill="url(#lens)"/>
    <rect width="1080" height="745" fill="url(#safe-title)" opacity=".92"/>
  </svg>
);

const SceneShot = ({scene, index, from, duration}: {scene: Scene; index:number; from:number; duration:number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const age = frame/fps;
  const p = clamp(frame/Math.max(1,duration-1));
  const settle = spring({frame, fps, config:{stiffness:192,damping:17,mass:.65}});
  const color = accent(scene);
  const direction = index % 2 ? -1 : 1;
  const shock = index === 0 ? Math.max(0,1 - Math.abs(age-.85)*6) : index === 12 ? Math.max(0,1 - Math.abs(p-.39)*8) : 0;
  const visualProps = {t:age,p};
  const Art = scene.art;
  return <AbsoluteFill style={{background:navy, overflow:'hidden'}}>
    <Stage x={direction * (smooth(p)*16 - 6) + Math.sin(frame*2.2)*shock*11}
      y={Math.sin(p*Math.PI)*13} zoom={index===shots.length-1 ? 1.105 - smooth(p)*.105 : 1.01 + smooth(p)*.073 + (1-settle)*.035}>
      <Art {...visualProps} mode={'mode' in scene ? scene.mode : undefined}/>
    </Stage>
    <AbsoluteFill style={{translate:`0 ${(1-settle)*41}px`, opacity:interpolate(frame,[0,7],[.38,1],{extrapolateRight:'clamp'})}}>
      <Headline title={scene.title} color={color} sub={'sub' in scene ? scene.sub : undefined}/>
    </AbsoluteFill>
    <Captions color={color} from={from}/>
    {index !== 0 && <AbsoluteFill style={{background:color, opacity:Math.max(0, .13*(1-frame/4)), pointerEvents:'none'}}/>}
    <div style={{position:'absolute', top:104, left:78, right:78, height:5, background:'#5f769453', borderRadius:4}}>
      <div style={{width:`${(from+frame+1)/(60*fps)*100}%`, height:'100%', borderRadius:4, background:color}}/>
    </div>
  </AbsoluteFill>;
};

const effects: {clip:string; volume:number; shot?:number; time?:number; lead?:number}[] = [
  {clip:'whoosh',volume:.24,time:0},{clip:'rumble',volume:.34,time:.68},{clip:'space',volume:.20,shot:1},
  {clip:'vanish',volume:.17,shot:2},{clip:'whoosh',volume:.19,shot:3},{clip:'reveal',volume:.21,shot:5},
  {clip:'rumble',volume:.17,shot:7},{clip:'step',volume:.24,shot:8},{clip:'whoosh',volume:.16,shot:9},
  {clip:'step',volume:.19,shot:10},{clip:'rumble',volume:.27,shot:12},{clip:'wind',volume:.08,shot:13},
  {clip:'space',volume:.20,shot:14},{clip:'whoosh',volume:.16,shot:16},{clip:'return',volume:.18,shot:19},
  {clip:'reveal',volume:.21,shot:21},
];

const Soundtrack = () => {
  const {fps} = useVideoConfig();
  return <>
    <Audio src={staticFile('audio/narration.mp3')} volume={.92}/>
    <Audio src={staticFile('audio/score.mp3')} volume={f => interpolate(f/fps,[0,10,31,44,54,60],[.095,.12,.17,.22,.16,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}/>
    {effects.map((effect,index) => {
      const from = frameAt(effect.time ?? (seconds(shots[effect.shot!]) + (effect.lead ?? 0)),fps);
      return <Sequence key={index} from={from} name={effect.clip} layout="none">
        <Audio src={staticFile(`audio/${effect.clip}.mp3`)} volume={effect.volume}/>
      </Sequence>;
    })}
  </>;
};

const EarthShort = () => {
  const {fps, durationInFrames} = useVideoConfig();
  return <AbsoluteFill>
    {shots.map((scene,index) => {
      const from = frameAt(seconds(scene),fps);
      const next = shots[index+1];
      const duration = (next ? frameAt(seconds(next),fps) : durationInFrames)-from;
      return <Sequence key={scene.name} name={scene.name} from={from} durationInFrames={duration}>
        <SceneShot scene={scene} index={index} from={from} duration={duration}/>
      </Sequence>;
    })}
    <Soundtrack/>
  </AbsoluteFill>;
};

const Thumbnail = () => <AbsoluteFill style={{background:navy}}>
  <Stage>
    <Sky t={.34} day={0} space/>
    <Earth x={558} y={966} r={436} light={1} t={.13} id="thumbnail-planet"/>
    <path d="M-160 1592Q536 1223 1250 1515v530H-160Z" fill="#234751"/>
    <path d="M-160 1592Q536 1223 1250 1515" fill="none" stroke="#9ceec9" strokeWidth="11"/>
    <Figure x={410} y={1056} scale={1.19} t={.44} pose="look" jacket={1}/>
  </Stage>
  <div style={{position:'absolute',left:78,right:78,top:230,textAlign:'center',fontFamily:face,
    fontWeight:900,fontSize:160,letterSpacing:-8,color:cream,textShadow:'0 10px 36px #0a1429'}}>
    EARTH <span style={{color:mint}}>x2</span>
  </div>
</AbsoluteFill>;

registerRoot(() => <>
  <Composition id="EarthX2" component={EarthShort} width={1080} height={1920} fps={30} durationInFrames={1800}/>
  <Still id="EarthX2Thumbnail" component={Thumbnail} width={1080} height={1920}/>
</>);
