import React from 'react';

export const cream = '#fff3db';
export const amber = '#ffd35e';
export const ice = '#74e9ff';
export const navy = '#070c1b';
const coral = '#f47762';
const mono = 'DejaVu Sans Mono, monospace';
export const clamp = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
type Motion = {t: number; p: number};
const wave = (t: number, n = 1) => Math.sin(t * n * Math.PI * 2);
const range = (n: number) => Array.from({length: n}, (_, i) => i);

export const Stars = ({t}: {t: number}) => <g>
  {range(104).map(i => <circle key={i} cx={(i * 433 + 30 + t * (i % 3) * 11) % 1100}
    cy={(i * 797 + 63) % 1830} r={i % 9 === 0 ? 3.4 : 1 + i % 3 * .55}
    fill={i % 13 ? '#a3bde3' : cream} opacity={.22 + (i % 7) * .068 + wave(t + i, .25) * .12}/>)}
</g>;

export const Sky = ({t, day, space = false}: {t: number; day: number; space?: boolean}) => <>
  <defs>
    <linearGradient id="dark-sky" x2="0" y2="1">
      <stop stopColor="#080b21"/><stop offset=".58" stopColor={space ? '#12203c' : '#172d51'}/>
      <stop offset="1" stopColor="#071024"/>
    </linearGradient>
    <linearGradient id="day-sky" x2="0" y2="1">
      <stop stopColor="#287aa3"/><stop offset=".44" stopColor="#70b3b7"/>
      <stop offset=".68" stopColor="#f0c58a"/><stop offset="1" stopColor="#947e74"/>
    </linearGradient>
    <radialGradient id="nebula">
      <stop stopColor={space ? '#4e418c' : '#4e75a1'} stopOpacity=".34"/>
      <stop offset="1" stopColor="#2b4784" stopOpacity="0"/>
    </radialGradient>
  </defs>
  <rect x="-220" y="-260" width="1520" height="2440" fill="url(#dark-sky)"/>
  <ellipse cx="720" cy="880" rx="670" ry="820" fill="url(#nebula)"/>
  <g opacity={1 - day}><Stars t={t}/></g>
  <g opacity={day}>
    <rect x="-220" y="-260" width="1520" height="2440" fill="url(#day-sky)"/>
    {!space && range(4).map(i => <g key={i} transform={`translate(${(-230 + i * 420 + t * 34) % 1500} ${520 + (i % 3) * 147})`} fill="#fff2d4" opacity={.29 + .1 * (i % 2)}>
      <path d="M-132 34q32-48 93-33 40-67 115-5 82-12 123 38Z"/>
      <path d="M-91 58H122" stroke="#fff2d4" strokeWidth="5" opacity=".6" strokeLinecap="round"/>
    </g>)}
  </g>
</>;

const limb = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => `M${x1} ${y1}Q${x2} ${y2} ${x3} ${y3}`;
type Pose = 'look' | 'shock' | 'torch' | 'cold' | 'walk' | 'rest';
export const Figure = ({t, x, y, scale = 1, pose = 'look', jacket = 0, facing = 1}: {
  t: number; x: number; y: number; scale?: number; pose?: Pose; jacket?: number; facing?: number;
}) => {
  const bounce = wave(t, 1.15), sway = wave(t, .66), shiver = pose === 'cold' ? wave(t, 8) * 8 : 0;
  const walk = pose === 'walk' ? wave(t, 1.85) * 63 : sway * 13;
  const arms: Record<Pose, [number, number, number, number]> = {
    look: [-82, 122, 108, -1], shock: [-129, -56, 137, -98], torch: [-103, 102, 140, 13],
    cold: [-25, 103, 21, 112], walk: [-125, 104, 115, 107], rest: [-68, 105, 77, 114],
  };
  const [lx, ly, rx, ry] = arms[pose];
  const stroke = '#0a182a';
  const left = limb(-15, 0, -103, 57 + sway * 20, lx + bounce * 13, ly + sway * 17);
  const right = limb(15, 0, 114, 55 - sway * 19, rx - sway * 14, ry + bounce * 15);
  const legs = limb(-12, 136, -51 - walk, 222, -67 - walk, 301) + limb(12, 136, 65 + walk, 220, 78 + walk, 301 - Math.abs(walk * .36));
  return <g transform={`translate(${x + shiver} ${y + bounce * 7}) scale(${facing * scale} ${scale}) rotate(${(pose === 'shock' ? -8 : 0) + sway * 3})`}>
    <ellipse cy="315" rx="140" ry="22" fill="#060a18" opacity=".50"/>
    {pose === 'torch' && <path d={`M${rx + 10} ${ry + bounce * 15}L725 ${-285 + sway * 45}V${286 + sway * 45}Z`} fill="#c8ffff" opacity=".18"/>}
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={legs} stroke={stroke} strokeWidth="27"/>
      <path d={legs} stroke="#a2c6dc" strokeWidth="13"/>
      <path d={`M${-76-walk} 305h37m${93 + 2 * walk} -${Math.abs(walk * .36)}h38`} stroke={cream} strokeWidth="17"/>
      <path d={left + right} stroke={stroke} strokeWidth={jacket ? 37 : 26}/>
      <path d={left + right} stroke={jacket ? (jacket === 2 ? '#94cce6' : '#db9c70') : cream} strokeWidth={jacket ? 22 : 13}/>
      <path d="M0-8V141" stroke={stroke} strokeWidth={jacket ? 105 : 28}/>
      <path d="M0-5V133" stroke={jacket ? (jacket === 2 ? '#5c959f' : '#da976b') : cream} strokeWidth={jacket ? 83 : 14}/>
      {jacket > 0 && <path d="M0 15V140m-25-18h50" stroke="#354363" strokeWidth="6"/>}
      {jacket === 2 && <path d={`M-43 -4l76 20q37 5 82 ${-24 + wave(t, 2) * 24}`} stroke={coral} strokeWidth="21"/>}
    </g>
    <circle cx={lx + bounce * 13} cy={ly + sway * 17} r="13" fill={cream} stroke={stroke} strokeWidth="6"/>
    <circle cx={rx - sway * 14} cy={ry + bounce * 15} r="13" fill={cream} stroke={stroke} strokeWidth="6"/>
    {pose === 'torch' && <rect x={rx - sway * 14 + 3} y={ry + bounce * 15 - 18} width="41" height="16" rx="6" fill={ice} stroke={stroke} strokeWidth="5"/>}
    <g transform={`rotate(${-11 + sway * 4} 0 -7)`}>
      <circle cy="-81" r="74" fill={cream} stroke={stroke} strokeWidth="12"/>
      <path d="M-47-121q17-18 41-19" fill="none" stroke="#fff" strokeWidth="6" opacity=".75" strokeLinecap="round"/>
      {jacket === 2 && <path d="M-73 -91q-7-55 68-69 68-5 78 63Z" fill="#748ec6" stroke={stroke} strokeWidth="8"/>}
    </g>
  </g>;
};

const coast = [
  'M-208-72q27-116 139-142l68 35 81-13 28 56-58 38-14 74-71 22-34 90-54 18-32-86-48-22Z',
  'M14 88l82-51 54 30 27 54-35 54-31 37-59-5-11-59Z',
  'M144-157l54 37 26 117-46 18-24-65 9-31-42-39Z',
  'M-174 141l29-33 47 5 23 52-38 32-55-14Z',
];
export const Earth = ({x, y, r, light, t, id = 'earth'}: {x: number; y: number; r: number; light: number; t: number; id?: string}) => <g transform={`translate(${x} ${y}) scale(${r / 232})`}>
  <defs>
    <radialGradient id={`${id}-sea`} cx=".33" cy=".30"><stop stopColor="#55badb"/><stop offset=".69" stopColor="#226691"/><stop offset="1" stopColor="#14274d"/></radialGradient>
    <linearGradient id={`${id}-shade`} x1="1" x2="0"><stop stopColor="#060a1a"/><stop offset=".66" stopColor="#0a1329" stopOpacity=".81"/><stop offset="1" stopColor="#0b1530" stopOpacity=".48"/></linearGradient>
    <clipPath id={`${id}-clip`}><circle r="232"/></clipPath>
  </defs>
  <circle r="253" fill="#64d9fb" opacity={.06 + light * .22}/>
  <circle r="242" fill="none" stroke="#7cecff" strokeWidth="4" opacity={.35 + light * .46}/>
  <circle r="232" fill={`url(#${id}-sea)`}/>
  <g clipPath={`url(#${id}-clip)`}>
    <g transform={`rotate(${-15 + t * 5}) translate(${wave(t, .16) * 18} 0)`}>
      {coast.map(d => <path key={d} d={d} fill="#80b693" stroke="#4b9b8a" strokeWidth="6" strokeLinejoin="round"/>)}
      <path d="M-240-106q108-26 214 11q103 42 240-14M-243 126q105-24 174 4t249 7" fill="none" stroke="#c7edf2" strokeWidth="16" strokeLinecap="round" opacity=".48"/>
    </g>
    <circle r="232" fill={`url(#${id}-shade)`} opacity={1 - .72 * light}/>
    <g fill="#f9c66d" opacity={.8 * (1 - light)}>
      {range(63).map(i => <circle key={i} cx={-137 + (i * 43) % 195} cy={-121 + (i * 97) % 214}
        r={1 + i % 5 * .45} opacity={.22 + (i % 9) * .085}/>)}
    </g>
  </g>
</g>;


export const mint = '#8af0ad';
const line = '#659aad';
const pulse = (t:number, speed=1) => Math.sin(t*speed*2*Math.PI);
type Panel = Motion & {mode?:string};

const Rings = ({x,y,r,t,color=ice}: {x:number;y:number;r:number;t:number;color?:string}) => <g fill="none" stroke={color}>
  {[1.14,1.29,1.48].map((k,i)=><circle key={k} cx={x} cy={y} r={r*k} strokeWidth={i===0?5:2.5}
    strokeDasharray={i===1?'8 15':undefined} opacity={.22+(i===0?.29:0)}/>)}
  <circle cx={x} cy={y} r={r*1.29} strokeWidth="7" pathLength="100" strokeDasharray="10 90"
    opacity=".78" transform={`rotate(${t*48} ${x} ${y})`}/>
</g>;

export const Orbital = ({t,p,mode='grow'}:Panel) => {
  const ease=smooth(p);
  const r=mode==='grow'?154+ease*191:mode==='stretch'?291+ease*52:mode==='ocean'?366:344;
  const y=mode==='ocean'?1058:1003;
  const color=mode==='ocean'?mint:ice;
  return <>
    <Sky t={t} day={0} space/>
    <ellipse cx="540" cy={y} rx="514" ry="490" fill="#365e85" opacity=".18"/>
    <Rings x={540} y={y} r={r} t={t} color={color}/>
    <Earth x={540} y={y} light={1} r={r} t={t}/>
    {mode==='stretch' && <g fill="none" stroke={mint} strokeWidth="5" opacity={.5+.24*pulse(t,.5)}>
      <path d="M222 719l-65-57m10 36-10-36 38 3m667 57 66-57m-40 1 40-1-12 42M220 1308l-63 63m38-7-38 7 6-40m696-23 66 63m-12-42 12 42-41-10"/>
    </g>}
    {mode==='ocean' && <g transform="translate(540 1490)" fill={ice} fontFamily={mono} fontSize="27" textAnchor="middle">
      <path d="M-313 0h626" fill="none" stroke="#6da9aa" strokeWidth="2" opacity=".55"/>
      <text y="48">OCEANS &amp; CONTINENTS · ILLUSTRATION</text>
    </g>}
  </>;
};

export const Compare = ({t,p,mode='radius'}:Panel) => {
  const gravity=mode==='gravity';
  const lit=smooth(p*1.66);
  return <>
    <Sky t={t} day={0} space/>
    <path d="M540 640v732M94 1300h892" fill="none" stroke={line} strokeWidth="4" opacity=".48" strokeDasharray="8 15"/>
    <Earth x={272} y={974} r={107} light={1} t={t} id="original"/>
    <Earth x={779} y={974} r={mode==='radius'?110+104*lit:214} light={1} t={t} id="large"/>
    {!gravity && <g stroke={amber} fill="none" strokeWidth="7">
      <path d="M272 974h107m-107-15v30m107-30v30"/>
      <path d={`M779 974h${mode==='radius'?110+104*lit:214}m-${mode==='radius'?110+104*lit:214}-15v30`}/>
    </g>}
    {gravity && <g fill="none" strokeWidth="6" strokeLinecap="round">
      <path d="M272 720v103m-17-17 17 17 17-17" stroke={ice}/>
      <path d="M731 646v100m-17-17 17 17 17-17M825 646v100m-17-17 17 17 17-17" stroke={amber}/>
    </g>}
    <g textAnchor="middle" fontFamily={mono} fontWeight="bold">
      <text x="272" y="1390" fontSize="65" fill={cream}>{gravity?'1g':'1×'}</text>
      <text x="779" y="1390" fontSize="65" fill={amber}>{gravity?'2g':'2×'}</text>
      <text x="272" y="1452" fontSize="28" fill="#b4c8df">TODAY</text>
      <text x="779" y="1452" fontSize="28" fill="#b4c8df">HYPOTHETICAL</text>
    </g>
  </>;
};

export const Mass = ({t,p}:Motion) => <>
  <Sky t={t} day={0} space/>
  <rect x="106" y="634" width="868" height="742" rx="34" fill="#182b40" stroke="#4d7b8c" strokeWidth="4"/>
  {range(8).map(i=>{
    const reveal=smooth(p*2.45-i*.14);
    const x=235+(i%4)*205, y=828+Math.floor(i/4)*313;
    return <g key={i} opacity={.22+.78*reveal}>
      <circle cx={x} cy={y} r={87+5*pulse(t+i*.21,.48)} fill="#2a5365" stroke="#70aeb6" strokeWidth="3"/>
      <Earth x={x} y={y} r={66*reveal+15} light={1} t={t+i*.12} id={`mass-${i}`}/>
    </g>;
  })}
  <text x="540" y="1458" textAnchor="middle" fill={mint} fontFamily={mono} fontSize="35" fontWeight="bold">2 × 2 × 2 = 8</text>
</>;

export const Ground = ({t,p,mode='hook'}:Panel) => {
  const curved=mode==='hook'||mode==='final'||mode==='horizon';
  const day=mode==='hook'?.87:mode==='final'?.56:.73;
  const edgeY=curved ? 1375-(mode==='hook'?smooth(p):.9)*65:1360;
  return <>
    <Sky t={t} day={day}/>
    {curved ? <>
      <Earth x={576} y={edgeY+821} r={994+(mode==='hook'?smooth(p)*107:0)} light={1} t={.12+t*.12}/>
      <path d={`M-160 ${edgeY+107}Q558 ${edgeY-256} 1240 ${edgeY+75}V2060H-160Z`} fill="#2c6261"/>
      <path d={`M-160 ${edgeY+109}Q558 ${edgeY-244} 1240 ${edgeY+73}`} fill="none" stroke="#b4ead1" strokeWidth="11" opacity=".84"/>
      <path d={`M-160 ${edgeY+269}Q558 ${edgeY-71} 1240 ${edgeY+221}V2060H-160Z`} fill="#204755"/>
    </> : <>
      <path d="M-190 1341q345-210 640-71t796-98v850H-190Z" fill="#518580"/>
      <path d="M-190 1410q345-143 640-40t796-55v730H-190Z" fill="#315d64"/>
      <path d="M-190 1410q345-143 640-40t796-55" fill="none" stroke="#9bc2a9" strokeWidth="7" opacity=".58"/>
    </>}
    <Figure t={t} x={mode==='final'?540:mode==='horizon'?745:454}
      y={edgeY-300-(mode==='hook'?smooth(p)*75:curved?62:0)}
      scale={mode==='final'?.94:1.19} jacket={1} pose={mode==='hook'&&p>.34?'shock':'look'}/>
  </>;
};

const land = "M-110 1264l271-456 158 191 199-333 175 248 109-154 390 473v740H-110Z";
export const Terrain = ({t,p,mode='mountain'}:Panel) => <>
  <Sky t={t} day={mode==='mountain'?.51:.69}/>
  <path d="M-140 1176l294-282 96 102 221-258 141 194 163-147 421 363v740H-140Z"
    fill="#6e969c"/>
  <path d={land} fill="#32646d" stroke="#92b3b0" strokeWidth="6"/>
  <path d="M162 808l-83 140 83-23 62 40 49-17Zm356-142-101 169 99-30 61 53 56-30ZM802 760l-77 111 66-12 71 37 37-12Z"
    fill="#bfdbd4" opacity=".84"/>
  <path d="M-130 1290q196-158 421-2t445-83 533 82v730H-130Z" fill="#204955"/>
  <path d="M-120 1432q274-168 505-104t423-55 362 27v800H-120Z" fill="#1d3e4b"/>
  {mode==='mountain' && <g transform="translate(263 922)" fill="none" stroke={amber} strokeWidth="5">
    <path d="M0 61h568m-568 0v-23m568 23v-23" strokeDasharray="10 13"/>
    <rect x="156" y="114" width="268" height="70" rx="14" fill="#0f2736"/>
    <text x="290" y="160" textAnchor="middle" fontFamily={mono} fontSize="26" fontWeight="bold" fill={cream} stroke="none">ILLUSTRATIVE</text>
  </g>}
  {mode!=='mountain'&&<Figure x={420+p*44} y={1096} t={t} pose="look" jacket={1} scale={1.17}/>}
</>;

const City = ({t,p}:Motion) => <g transform={`translate(${-14-t*7} 0)`}>
  {range(15).map(i=>{
    const x=i*90-60,h=113+(i*103)%256,w=58+(i*61)%29,y=1110-h;
    return <g key={i}>
      <path d={`M${x} ${y}h${w}v${h}h-${w}Z`} fill={['#38636e','#457e7d','#4f727c'][i%3]} stroke="#254a59" strokeWidth="3"/>
      {range(Math.floor(h/32)).map(row=> <g key={row} fill="#b1d5b3" opacity={.19+(i+row)%4*.12}>
        <rect x={x+11} y={y+14+row*30} width="11" height="11" rx="2"/>
        <rect x={x+32} y={y+14+row*30} width="11" height="11" rx="2"/>
      </g>)}
    </g>;
  })}
</g>;

export const Movement = ({t,p,mode='walk'}:Panel) => {
  const jump=mode==='jump';
  const phase=(p*1.3)%1;
  const lift=jump?4*phase*(1-phase)*79.5:0;
  return <>
    <Sky t={t} day={.74}/>
    <City t={t} p={p}/>
    <path d="M-100 1110h1320v826H-100Z" fill="#305a64"/>
    <path d="M-100 1125h1320m-1320 343h1320m-1320 117h1320" stroke="#8cb1af" strokeWidth="5" opacity=".44"/>
    <path d="M-90 1632h1270" stroke="#93b9aa" strokeWidth="5" strokeDasharray="45 74" opacity=".36"/>
    {jump ? <>
      <path d="M151 1123q331.5-318 663 0m-663 0q165.75-159 331.5 0" fill="none" stroke={ice} strokeWidth="6" strokeDasharray="11 15" opacity=".79"/>
      <path d="M876 963v154m-16-20 16 20 16-20" fill="none" stroke={amber} strokeWidth="7"/>
      <Figure t={t} x={151+phase*331.5} y={864-lift} pose="shock" scale={.86} jacket={1}/>
    </> : <>
      <Figure t={t*.75} x={278+p*63} y={1250} pose="cold" jacket={1} scale={.81}/>
      <Figure t={t*.82+.51} x={575+p*76} y={1150} pose="walk" jacket={1} scale={1.03}/>
      <Figure t={t*.70+1.01} x={837+p*42} y={1200} pose="cold" jacket={2} scale={.72}/>
      <g fill="none" stroke={amber} strokeWidth="5" opacity=".72">{[242,576,831].map((x,i)=><path key={x}
        d={`M${x} ${800+i%2*36+6*pulse(t)}v81m-12-17 12 17 12-17`}/>)}</g>
    </>}
  </>;
};

const Car = ({x,y,t}: {x:number;y:number;t:number}) => <g transform={`translate(${x} ${y+pulse(t,3)*3})`}>
  <path d="M-155 46V0l57-22 47-64h124l58 76 31 13v49Z" fill="#e1a676" stroke={navy} strokeWidth="9" strokeLinejoin="round"/>
  <path d="M-39-72h100l41 51h-179Z" fill="#a9dae2" stroke="#435d71" strokeWidth="5"/>
  <path d="M11-74v51" stroke="#435d71" strokeWidth="5"/>
  <path d="M143 5h18" stroke={cream} strokeWidth="9"/>
  {[-102,98].map(k=><g key={k}><circle cx={k} cy="45" r="29" fill={navy} stroke="#121b2d" strokeWidth="6"/><circle cx={k} cy="45" r="12" fill="#788c98"/></g>)}
</g>;

export const Bridge = ({t,p,mode='road'}:Panel) => {
  const sag=mode==='stress'?33+11*pulse(t,.8):7;
  return <>
    <Sky t={t} day={.68}/>
    <path d="M-140 1159q312-256 592-85t804-76v950H-140Z" fill="#406d75"/>
    <City t={t} p={p}/>
    <path d="M-190 1485q416-134 864-35t600-80v640H-190Z" fill="#18394f"/>
    {range(14).map(i=><path key={i} d={`M${(i*237+t*67)%1280-90} ${1461+(i*77)%394}h${85+i%6*41}`} stroke="#7cabb5" strokeWidth="4" opacity=".32"/>)}
    <path d="M194 1019v660m681-660v660m-684-664h687" stroke="#6c8580" strokeWidth="28" fill="none"/>
    <path d="M194 1022Q531 1312 875 1022" fill="none" stroke="#b2c5a7" strokeWidth="11"/>
    {range(10).map(i=>{
      const x=222+i*69, k=(x-194)/681;
      return <path key={i} d={`M${x} ${1022+4*k*(1-k)*147}V1288`} stroke="#a6baac" strokeWidth="5"/>;
    })}
    <path d={`M-140 1260Q540 ${1287+sag} 1240 1260v72Q540 ${1370+sag} -140 1332Z`}
      fill="#354b59" stroke="#142e40" strokeWidth="10"/>
    <path d="M-135 1300q656 35 1365 0" fill="none" stroke="#adbbb1" strokeWidth="8" strokeDasharray="51 63" opacity=".63"/>
    <Car x={mode==='stress'?544:153+p*800} y={1259+sag*.4} t={t}/>
    {mode==='stress' && <g stroke={amber} strokeWidth="7" fill="none">
      {[271,540,814].map((x,i)=><path key={x}
        d={`M${x} ${787+pulse(t+i*.1)*8}v118m-15-20 15 20 15-20`} opacity=".78"/>)}
    </g>}
  </>;
};

export const Atmosphere = ({t,p}:Motion) => <>
  <Sky t={t} day={0} space/>
  <Earth x={540} y={1678} r={770} light={1} t={t*.45}/>
  <path d={`M-150 1206Q540 ${359+smooth(p)*97} 1230 1206`} fill="none" stroke="#8fdee8" strokeWidth="11" opacity=".55"/>
  <path d={`M-150 1132Q540 ${278+smooth(p)*138} 1230 1132`} fill="none" stroke="#75baff" strokeWidth="7" opacity=".36"/>
  {range(57).map(i=><circle key={i} cx={(i*197+t*26)%1180-50}
    cy={709+(i*91)%183+63*smooth(p)+pulse(t+i,.67)*15} r={2+i%4*.7} fill="#d2f8f0" opacity=".43"/>)}
  <g stroke={amber} strokeWidth="7" strokeLinecap="round" fill="none">
    {[275,540,805].map((x,i)=><path key={x} d={`M${x} ${625+(i%2?0:29)+p*64}v131m-17-21 17 21 17-21`} opacity=".88"/>)}
  </g>
  <g transform="translate(540 1400)" fontFamily={mono} textAnchor="middle">
    <rect x="-391" y="-54" width="782" height="113" rx="19" fill="#132a3d" stroke="#8fd4cf" strokeWidth="4"/>
    <text y="10" fill={mint} fontSize="31" fontWeight="bold">STRONGER PULL ON THE AIR</text>
  </g>
</>;

export const GlobeRoom = ({t,p}:Motion) => <>
  <Sky t={t} day={.15}/>
  <rect x="-110" y="615" width="1320" height="810" fill="#233e4a" stroke="#425b6a" strokeWidth="8"/>
  <rect x="78" y="658" width="924" height="546" fill="#172d42" stroke="#587383" strokeWidth="8"/>
  <path d="M95 806h892m-892 151h892m-892 148h892" stroke="#6090a0" strokeWidth="4" opacity=".34"/>
  <path d="M448 1273h534l65 73H409Zm-6 72v205m517-205v205" fill="#658777" stroke="#152c3c" strokeWidth="14"/>
  <Figure x={259} y={1104} t={t} scale={1.14} pose="look" jacket={1}/>
  <Rings x={729} y={990} r={154+p*41} t={t} color={mint}/>
  <Earth x={729} y={991} r={118+p*73} light={1} t={t}/>
  <path d="M729 1189v57m-76 0h152" stroke="#a0c8b5" strokeWidth="13" strokeLinecap="round"/>
</>;

export const AdaptiveCity = ({t,p}:Motion) => <>
  <Sky t={t} day={.61}/>
  <path d="M-130 1185q452-247 814-61t565-26v879H-130Z" fill="#376668"/>
  {range(10).map(i=>{
    const k=smooth(p*2.4-i*.11);
    const x=96+i*105,w=93,h=153+i%4*37,y=1300-h*k;
    return <g key={i} opacity={.29+.71*k}>
      <path d={`M${x} ${y}h${w}v${h*k}h-${w}Z`} fill={i%2?'#4d8984':'#376876'} stroke="#193b51" strokeWidth="8"/>
      <path d={`M${x-8} ${y}h${w+14}m-${w-17} 42h36`} stroke={mint} strokeWidth="5" opacity=".75"/>
    </g>;
  })}
  <path d="M-120 1381Q534 1225 1240 1386v600H-120Z" fill="#30595d"/>
  <path d="M-120 1443Q534 1272 1240 1443" fill="none" stroke="#b4d6bc" strokeWidth="9"/>
  <Figure x={314+p*95} y={1208} t={t} scale={.88} pose="walk" jacket={2}/>
  <Figure x={743-p*63} y={1193} t={t+.26} scale={.85} pose="walk" facing={-1} jacket={1}/>
  <g transform="translate(544 809)">
    <circle r="115" fill="#173940" stroke={mint} strokeWidth="4" opacity=".86"/>
    <circle r="100" fill="none" stroke={mint} strokeWidth="7" pathLength="100" strokeDasharray={`${p*100} 100`} transform="rotate(-90)"/>
    <path d="M0-49V0l47 23" fill="none" stroke={cream} strokeWidth="8" strokeLinecap="round"/>
  </g>
</>;
