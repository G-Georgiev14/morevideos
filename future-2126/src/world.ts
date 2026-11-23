import * as T from 'three';
import {drawRig, ease, idle, mix, travel, walk, PIXEL, SOLE, blend, type Pose, type Pt} from './rig';

type Vec=[number,number,number];
type Tick=(t:number)=>void;
const ink='#22263e', warm='#ffd897', teal='#8beddb', pearl='#f2ecdc';
const cold=['#253054','#323658','#4a5b7b','#627791','#72688a'];
const sunset=['#635379','#827088','#b17b89','#d0a18f','#6a7287'];
const boxGeo=new T.BoxGeometry();
const sphereGeo=new T.SphereGeometry(1,18,12);
const cylGeo=new T.CylinderGeometry(1,1,1,20);
const edgeGeo=new T.EdgesGeometry(boxGeo);
const edge=new T.LineBasicMaterial({color:ink,transparent:true,opacity:.55});
const mats=new Map<string,T.Material>();
function material(color:string,glow=false){
  const name=color+glow;
  if(!mats.has(name)) mats.set(name,glow?new T.MeshBasicMaterial({color}):
    new T.MeshLambertMaterial({color}));
  return mats.get(name)!;
}
function mesh(g:T.Object3D,geo:T.BufferGeometry,p:Vec,s:Vec,c:string,glow=false){
  const m=new T.Mesh(geo,material(c,glow));
  m.position.set(...p);m.scale.set(...s);g.add(m);return m;
}
function box(g:T.Object3D,p:Vec,s:Vec,c:string,outline=false,glow=false){
  const m=mesh(g,boxGeo,p,s,c,glow);
  if(outline) m.add(new T.LineSegments(edgeGeo,edge));
  return m;
}
const ball=(g:T.Object3D,p:Vec,s:Vec,c:string,glow=false)=>mesh(g,sphereGeo,p,s,c,glow);
const tube=(g:T.Object3D,p:Vec,s:Vec,c:string,glow=false)=>mesh(g,cylGeo,p,s,c,glow);
const group=(g:T.Object3D,p:Vec=[0,0,0])=>{const o=new T.Group();o.position.set(...p);g.add(o);return o;};

const labelCache=new Map<string,T.CanvasTexture>();
function label(g:T.Object3D,p:Vec,w:number,h:number,text:string,c=teal){
  const key=text+c;
  if(!labelCache.has(key)){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=c;ctx.font='800 82px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(text,256,68,478);
    const tx=new T.CanvasTexture(canvas);tx.colorSpace=T.SRGBColorSpace;labelCache.set(key,tx);
  }
  const display=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:labelCache.get(key),transparent:true}));
  display.position.set(...p);g.add(display);return display;
}

function slab(g:T.Object3D,y=0,c='#54637c'){
  box(g,[0,y-.24,0],[60,.48,70],c);
}
function tiles(g:T.Object3D,z=-2,c='#718a96',span=8){
  for(let n=-4;n<=4;n++)box(g,[n*1.65,.004,z],[.018,.01,span],c);
  for(let n=-4;n<=4;n++)box(g,[0,.006,z+n*.9],[14,.01,.016],c);
}
function greenery(g:T.Object3D,x:number,z:number,s=1,c='#608d87'){
  const leafy=group(g,[x,0,z]);
  tube(leafy,[0,.9*s,0],[.10*s,1.8*s,.10*s],'#71647a');
  for(const [a,b] of [[0,2.25],[-.45,1.74],[.52,1.88]]){
    ball(leafy,[a*s,b*s,0],[.61*s,.64*s,.51*s],c);
    ball(leafy,[(a-.14)*s,(b+.12)*s,.24*s],[.40*s,.42*s,.22*s],'#91a995');
  }
  return leafy;
}

function sky(g:T.Object3D,top:string,bottom:string,sun:string){
  const m=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    uniforms:{top:{value:new T.Color(top)},bottom:{value:new T.Color(bottom)}},
    vertexShader:'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 p;uniform vec3 top;uniform vec3 bottom;void main(){float f=smoothstep(-.12,.76,normalize(p).y);gl_FragColor=vec4(mix(bottom,top,f),1.);\n#include <colorspace_fragment>\n}'});
  const bg=new T.Mesh(new T.SphereGeometry(85,28,16),m);bg.renderOrder=-10;g.add(bg);
  ball(g,[14,15,-46],[3.8,3.8,.7],sun,true);
  for(let i=0;i<7;i++){
    const x=-30+i*9.7,y=9+Math.sin(i*1.91)*4;
    ball(g,[x,y,-48],[2.8+i%3, .32+i%2*.26,.30],i%2?bottom:'#b1bacc',true);
  }
}
function architecture(g:T.Object3D,seed:number,isWarm:boolean){
  const palette=isWarm?sunset:cold;
  for(let layer=0;layer<2;layer++){
    for(let i=-5;i<=5;i++){
      const q=i+6,kind=(q+layer+seed)%4;
      const x=i*(layer?2.38:3.1)+((seed%3)-1)*.70;
      if(layer===1 && (q+seed)%5===0) continue;
      const z=-13-layer*-6+Math.cos(seed+q*2)*1.1;
      const h=3.2+((q*7+seed*3+layer*5)%11)*.54;
      const w=1.24+(q%3)*.21;
      const c=palette[(q+seed+layer)%palette.length];
      const b=group(g,[x,0,z]);
      if(kind===0){
        tube(b,[0,h/2,0],[w*.51,h,w*.42],c);
        for(let y=.7;y<h;y+=.47)tube(b,[0,y,0],[w*.55,.065,w*.45],layer?'#71899a':c);
        tube(b,[0,h+.36,0],[.025,.72,.025],teal,true);
      }else if(kind===1){
        for(let k=0;k<3;k++){
          const wide=w*(1-k*.22);
          box(b,[k*.08,(k+.5)*h/3,0],[wide,h/3,w],c);
          box(b,[k*.08,(k+1)*h/3,.03],[wide+.10,.08,w+.13],'#8997a6');
        }
        for(let y=.52;y<h-.23;y+=.51)
          box(b,[0,y,w*.507],[w*.47,.10,.024],layer?(Math.round(y*7)%3?teal:warm):c,false,layer===1);
      }else{
        box(b,[0,h/2,0],[w,h,w*.76],c,true);
        box(b,[w*.19,h*.52,w*.35],[w*.62,h*.95,.17],palette[(q+2)%5]);
        box(b,[0,h+.08,0],[w*1.10,.17,w*.85],'#8290a3');
        if(kind===2)box(b,[-w*.26,h+.30,-.08],[w*.31,.40,w*.36],c);
        for(let j=0;j<3;j++)
          box(b,[w*(j*.27-.27),h*.52,w*.402],[.037,h*.86,.02],'#92a5ad');
        if(layer) for(let y=.74;y<h-.32;y+=.70)
          box(b,[w*.09,y,w*.418],[w*.58,.03,.014],warm,false,true);
      }
    }
  }
}
function room(g:T.Object3D,variant=0){
  const palettes=[['#364965','#4e6980'],['#344763','#607b8d'],['#4b526d','#737f8e'],['#5e5573','#8e8092']];
  const [a,b]=palettes[variant];
  slab(g,0,b);tiles(g,-1.5,'#8699a5',11);
  box(g,[0,4.7,-5.3],[21,9.4,.40],a);
  for(let i=-6;i<=6;i++){
    const x=i*1.65;
    box(g,[x,4.5,-5],[.07,9,.13],b);
    box(g,[x+.74,2.5,-5.01],[1.2,.92,.08],i%2?a:b);
    if(i%3===0)box(g,[x,6.3,-4.92],[.048,3.0,.09],teal,false,true);
  }
  box(g,[0,4.95,-4.97],[18,.08,.10],'#8196aa');
  box(g,[-4,6,1],[.28,10,4.4],a,true);
  box(g,[4.2,5.4,.1],[.45,11,3.6],a,true);
}
function windowFrame(g:T.Object3D,z=-2){
  for(const x of [-3.2,3.2])box(g,[x,3.5,z],[.55,7.4,.80],'#4a5d76',true);
  box(g,[0,.57,z],[6.8,.53,.83],'#4a5d76',true);
  box(g,[0,6.67,z],[6.8,.53,.83],'#4a5d76',true);
  box(g,[0,.89,z+.15],[6.7,.08,.61],'#afc3bd');
}
function console(g:T.Object3D,p:Vec,name:string,readout:string,wide=1.65){
  const o=group(g,p);
  box(o,[0,0,0],[wide,1.16,.27],'#405875',true);
  box(o,[0,.08,.145],[wide*.88,.82,.035],'#263f59');
  label(o,[0,.25,.173],wide*.76,.25,name,'#9db6c7');
  const display=label(o,[0,-.035,.174],wide*.80,.39,readout);
  for(let k=0;k<4;k++)ball(o,[(k-1.5)*.15,-.40,.163],[.035,.035,.018],k===3?warm:teal,true);
  return {o,display};
}

function vehicle(g:T.Object3D,kind:'train'|'taxi'|'van'|'drone',p:Vec,c:string){
  const v=group(g,p);
  if(kind==='drone'){
    ball(v,[0,0,0],[.46,.13,.29],c);
    for(const x of [-.50,.5]){
      box(v,[x*.64,.025,0],[.34,.052,.08],'#63738d');
      tube(v,[x,.055,0],[.23,.045,.15],'#5a718e');
      tube(v,[x,.086,0],[.19,.015,.12],teal,true);
    }
    ball(v,[.19,-.06,.25],[.085,.035,.026],warm,true);
    return v;
  }
  if(kind==='train'){
    for(const x of [-1.78,.0,1.78]){
      ball(v,[x,.14,0],[1,.35,.36],c);
      box(v,[x,.09,0],[1.62,.37,.63],c,true);
      for(const i of [-.52,0,.52])box(v,[x+i,.25,.33],[.38,.17,.04],'#43657b');
      box(v,[x,.02,.34],[1.54,.043,.03],teal,false,true);
    }
  } else {
    const length=kind==='van'?1.15:1;
    ball(v,[0,.06,0],[1.05*length,.23,.43],c);
    ball(v,[.04,.27,0],[.68*length,.26,.37],kind==='van'?c:'#466578');
    box(v,[-.41,.27,0],[.9*length,kind==='van'?.57:.25,.77],c,true);
    box(v,[.39,.23,.388],[.43,.18,.026],'#38546c');
    for(const x of [-.59,.59]){
      for(const z of [-.37,.37]){
        const tire=tube(v,[x,-.08,z],[.19,.14,.19],ink);tire.rotation.x=Math.PI/2;
        const hub=tube(v,[x,-.08,z*1.23],[.094,.045,.094],'#8999aa');hub.rotation.x=Math.PI/2;
      }
    }
    box(v,[.89,.08,.26],[.16,.06,.10],warm,false,true);
    box(v,[-.89,.08,.26],[.12,.06,.10],'#fa99a7',false,true);
  }
  return v;
}

function actor(g:T.Object3D,p:Vec,s=1,style=0){
  const root=group(g,p);
  const shadow=ball(root,[0,.017,0],[.44*s,.019,.25*s],'#4a5167');
  const cv=document.createElement('canvas');cv.width=480;cv.height=560;
  const ctx=cv.getContext('2d')!;
  const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;
  texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
  const card=new T.Mesh(new T.PlaneGeometry(480*PIXEL*s,560*PIXEL*s),
    new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.05,depthWrite:false}));
  card.position.y=(SOLE-280)*PIXEL*s;
  root.add(card);
  const pose=(p:Pose,t:number,held?:string,angle?:number)=>{drawRig(ctx,p,style,t,held,angle);texture.needsUpdate=true;};
  return {root,card,shadow,pose};
}
function walker(g:T.Object3D,x:number,z:number,s:number,style:number,direction=1,offset=0){
  const a=actor(g,[x,0,z],s,style);
  return (t:number)=>{
    const time=t+offset;
    a.root.position.x=x+travel(t,direction)*s;
    a.pose(walk(time,direction),time);
  };
}
const hand=(p:Pose,target:Pt,other?:Pt)=>{p.hands[1]=target;if(other)p.hands[0]=other;return p;};
function turn(t:number,a:number,b:number,strength:number){
  return strength*(ease(t,a,b)+.10*Math.sin(13*(t-b))*Math.exp(-4*Math.max(0,t-b))*(t>b))-strength*.14*Math.sin(Math.PI*ease(t,a-.22,a));
}
export const SHOT_NAMES=['Wake','Diagnostics','Window reveal','Old phone','Transport','AI concierge','The towers','Factory shift',
  'The turn','Family photo','One century','Alone','Old money','Home address','Museum','Café','Helping hand','Familiar lives','New skyline','Would you?'];

const cams: [Vec,Vec,number][]=[
 [[3.0,3.8,9.9],[.1,1.65,-.22],38], [[-2.6,3.45,8.3],[.35,2.25,-.58],40],
 [[1.2,3.0,10.8],[.1,2.24,-2],36], [[-.76,3.0,7.8],[-.04,2.14,0],40],
 [[2.9,4.7,11.5],[.0,1.82,-1.0],39], [[.28,2.58,10], [.17,1.9,0],41],
 [[-.6,2.3,11.3],[.15,4.35,-6],38], [[4.4,4.8,11],[.11,1.92,-1],39],
 [[.4,2.64,7.65],[.05,2.17,.04],35], [[-1.5,3.05,8.5],[.3,2.13,0],38],
 [[1.1,4.4,8.6],[.1,2.12,0],37], [[2.2,3.65,11.4],[.05,2.05,-2.7],42],
 [[-.46,2.5,9.55],[.32,1.87,0],38], [[3.8,3.65,12.1],[.6,1.83,-2],42],
 [[2.3,4.35,11.3],[.2,2.00,-1.3],41], [[-1.78,3.66,10.4],[.1,1.78,-.15],43],
 [[.25,2.56,10.6],[0,1.67,0],38], [[2.4,3.7,11.6],[.05,2.10,-.7],40],
 [[-.4,3.7,11.7],[.2,2.85,-3],41], [[.45,2.88,8.0],[.0,2.15,0],38],
];
const exterior=new Set([2,4,6,13,15,16,17,18,19]);
const warmSet=new Set([13,15,16,17,18,19]);
type World={root:T.Group; tick:Tick; camera:(camera:T.PerspectiveCamera,t:number,fixed:boolean)=>void; dispose:()=>void};

export function makeWorld(id:number):World{
  const root=new T.Group();
  const golden=warmSet.has(id);
  const end=id===18||id===19;
  const top=golden?(end?'#7a748f':'#6c8daf'):'#6387ab';
  const horizon=golden?'#f8c49c':'#bfd4d0';
  const outside=exterior.has(id);
  root.add(new T.HemisphereLight(golden?'#ffe6c5':'#e0f5f7',golden?'#745c93':'#5b608e',2.15));
  const key=new T.DirectionalLight(golden?'#ffe6bd':'#dfeef8',2.15);
  key.position.set(golden?-7:4,8,5);root.add(key);
  const update:Tick[]=[];
  if(outside){
    sky(root,top,horizon,golden?'#ffddac':'#d0ebe3');
    slab(root,0,golden?'#8d7f92':'#687e95');
    architecture(root,id,golden);
  }else if(id!==11){
    room(root,id===8||id===9||id===10?3:id===7?2:id<2?0:1);
  }
  const add=(fn:Tick)=>update.push(fn);
  const make=(p:Vec,s=1,style=0)=>actor(root,p,s,style);
  const walking=(x:number,z:number,s:number,style:number,dir=1,offset=0)=>add(walker(root,x,z,s,style,dir,offset));
  const moving=(v:T.Group,start:number,speed:number,base:number,amp=0)=>add(t=>{
    v.position.x=start+t*speed;v.position.y=base+amp*Math.sin(t*2.6+start);
  });
  const pod=()=>{
    const g=group(root,[-.38,0,0]);
    box(g,[0,.34,0],[3.07,.30,1.18],'#3e5873',true);
    ball(g,[0,.61,0],[1.63,.27,.63],'#759dac');
    box(g,[0,.65,.05],[2.93,.24,1.05],'#7195a8',true);
    ball(g,[-.79,.80,.03],[.47,.15,.41],'#c7d5d2');
    box(g,[0,.43,.601],[2.41,.065,.025],teal,false,true);
    for(const x of [-1.24,1.24])box(g,[x,.17,0],[.32,.36,.85],'#647a8b',true);
  };
  if(id===0){
    pod();
    console(root,[.82,3.2,-4.93],'WAKE SEQUENCE','2126',1.72);
    const a=make([-.21,.09,.36],.79);
    add(t=>{
      const rise=ease(t,.47,1.68),breathe=Math.sin(t*4);
      const p=idle(t),sit=1-rise;
      p.hips=[0,mix(346,405,rise)];
      p.feet=[blend([-13,493],[81,482],rise),blend([11,498],[115,482],rise)];
      p.legBend=-1;
      p.lean=-9*Math.sin(Math.PI*rise);
      p.hands=[blend([-22,332],[-44,419],rise),blend([34,307],[80,386],rise)];
      p.look=-13*turn(t,1.72,2.6,1)+breathe;
      a.root.position.y=.02+.27*rise;
      a.root.position.z=.36+.41*rise;
      a.pose(p,t,undefined,-1.55*sit);
    });
  }else if(id===1){
    pod();
    const a=make([-.92,.22,.78],.91);
    const diagnostics=[console(root,[1.40,3.36,-.70],'SYSTEM','ONLINE',1.49),console(root,[1.73,2.17,-.95],'VITALS','STABLE',1.52)];
    add(t=>{
      const p=idle(t);p.hips=[-4,407];p.feet=[[89,492],[112,501]];p.legBend=-1;p.lean=turn(t,.57,1.35,18);
      p.look=turn(t,.28,1.22,24)-turn(t,1.75,2.71,30);
      a.pose(hand(p,blend([44,376],[95,253],ease(t,.67,1.47)) ),t);
      diagnostics.forEach(({o},j)=>{const f=ease(t,.34+j*.57,.74+j*.57);o.scale.setScalar(.03+.97*f);o.position.y=(j?2.17:3.36)-.2*(1-f);});
    });
  }else if(id===2){
    windowFrame(root,-2);
    const doors=[-1,1].map(s=>{
      const g=group(root,[s*1.43,3.62,-2.19]);box(g,[0,0,0],[2.91,5.56,.22],'#4b6983',true);
      for(let j=0;j<4;j++)box(g,[0,1.9-j*1.24,.13],[2.72,.042,.03],j===0?teal:'#93a5ad',false,j===0);
      box(g,[-s*1.11,-.44,.15],[.12,.54,.06],'#b5c4c5',true);return g;
    });
    const a=make([-.94,0,-.35],.9);
    moving(vehicle(root,'drone',[-3,5,-4.5],pearl),-3.4,2.3,5.1,.11);
    add(t=>{
      const q=ease(t,.45,1.69);
      const p=idle(t);p.lean=turn(t,.24,.87,15)-turn(t,1.27,2.20,8);
      p.look=turn(t,.25,.73,10)+turn(t,1.25,2.42,15);
      doors.forEach((d,j)=>d.position.x=(j?1:-1)*(1.44+q*2.75));
      a.root.position.x=-.92-.43*q;
      a.pose(hand(p,blend([60,337],[121,264],ease(t,.16,.65)-ease(t,1.65,2.5))),t);
    });
  }else if(id===3){
    walking(1.5,-2.2,.67,1,-1,.17);walking(-2,-3.4,.56,2,1,.48);
    const a=make([-.48,0,.28],1.0);
    console(root,[1.34,3.45,-2.2],'DEVICE AGE','100 YRS',1.36);
    add(t=>{
      const p=idle(t),up=ease(t,.62,1.57);
      p.lean=turn(t,.34,.71,-10)+turn(t,1.32,1.89,23);
      p.look=turn(t,.52,1.23,21)+2*Math.sin(t*5);
      const reach=blend([44,342],[32,370],ease(t,.1,.48));
      a.pose(hand(p,blend(reach,[108,216],up)),t, t>.58?'phone':undefined);
    });
  }else if(id===4){
    for(const [y,z,c] of [[.17,0,'#505b77'],[1.22,-2.5,'#73859a'],[2.45,-5,'#677c96']] as [number,number,string][]){
      box(root,[0,y-.15,z],[26,.31,1.65],c,true);
      box(root,[0,y+.08,z-.71],[26,.07,.071],'#a4b5bc');
      for(let j=-8;j<=8;j++){box(root,[j*1.45,y+.018,z+.3],[.53,.021,.053],warm);if(j%2===0)box(root,[j*1.45,y/2-.14,z],[.2,y+.2,.24],c);}
    }
    moving(vehicle(root,'taxi',[0,0,0],'#79c2b8'),-5.4,3.75,.27);
    moving(vehicle(root,'van',[0,0,-2.5],'#d4a078'),5.3,-3.65,1.33);
    moving(vehicle(root,'train',[0,0,-5],pearl),-6.7,4.3,2.53);
  }else if(id===5){
    console(root,[.45,3.70,-4.91],'TRANSIT','ROUTE READY',2.35);
    const robot=group(root,[1.02,0,-.30]);
    ball(robot,[0,1.13,0],[.64,.87,.44],'#a8c6c5');
    ball(robot,[0,2.14,0],[.55,.43,.44],pearl);
    box(robot,[0,2.16,.39],[.77,.34,.15],'#3d5873',true);
    const eye=ball(robot,[-.19,2.16,.484],[.077,.076,.026],teal,true);
    const arm=group(robot,[-.39,1.56,.34]);
    box(arm,[-.36,0,0],[.74,.115,.112],'#c2cfcd',true);
    const card=box(arm,[-.72,.09,.033],[.26,.15,.032],teal,true,true);
    const a=make([-1.04,0,.14],.85);
    add(t=>{
      const offer=ease(t,.32,1.10),receive=ease(t,.96,1.87),back=ease(t,2.05,2.77);
      eye.position.x=-.20+.25*offer;
      arm.rotation.z=.72-.98*offer+.69*back;
      card.visible=t<2.04;
      const p=idle(t);p.lean=turn(t,.75,1.49,19)-turn(t,2.11,2.75,21);p.look=turn(t,.47,1.12,19);
      a.pose(hand(p,blend(blend([47,338],[128,283],receive),[52,303],back)),t,t>=2.04?'card':undefined);
    });
  }else if(id===6){
    const shaft=group(root,[.27,0,-4.9]);
    box(shaft,[0,3.46,0],[1.43,6.92,1.66],'#476782',true);
    for(const x of [-.38,.38])box(shaft,[x,3.46,.858],[.067,6.8,.05],teal,false,true);
    const lift=box(shaft,[0,2.0,.93],[.71,.53,.18],pearl,true);
    box(root,[0,1.20,-2.72],[23,.25,1.35],'#728ba0',true);
    moving(vehicle(root,'train',[0,0,-2.72],pearl),-7.9,5.7,1.29);
    moving(vehicle(root,'drone',[0,0,-1.5],'#c2d0c9'),4.4,-3.20,4.63,.18);
    moving(vehicle(root,'drone',[0,0,-4.03],'#9caec3'),-5.4,3.55,5.75,.1);
    add(t=>lift.position.y=1.64+3.8*ease(t,.13,2.87));
  }else if(id===7){
    for(let i=-3;i<=3;i++)box(root,[i*1.25,4.22,-4.83],[.96,1.28,.13],'#9aa3bc',true);
    box(root,[0,.86,-1],[6.3,.31,.93],'#546781',true);
    for(let i=-5;i<6;i++){
      const m=box(root,[i*.57,1.19,-.97],[.28,.18,.46],'#9dc9b7',true);
      add(t=>m.position.x=((i*.57+t*.88+6.6)%6.6)-3.3);
    }
    for(const [x,phase] of [[-1.39,0],[1.55,1.24]]){
      const pivot=group(root,[x,.96,-1.42]);tube(pivot,[0,0,0],[.30,.32,.30],'#7e8fa1');
      const upper=group(pivot,[0,.12,0]);box(upper,[0,.57,0],[.18,1.26,.21],'#dcb174',true);
      const fore=group(upper,[0,1.12,0]);ball(fore,[0,0,0],[.18,.16,.15],'#667e93');
      box(fore,[0,.43,0],[.145,.94,.18],'#e4c388',true);
      for(const j of [-1,1])box(fore,[j*.13,.86,0],[.075,.23,.14],'#9eb4bc',true);
      add(t=>{upper.rotation.z=.72*Math.sin(2.8*t+phase);fore.rotation.z=1+.73*Math.sin(2.8*t+phase+.66);});
    }
    walking(-1.66,.48,.63,3,1,.3);
  }else if(id===8){
    const panel=box(root,[0,3.12,-4.97],[5.2,6.23,.06],'#665877');
    panel.rotation.z=.07;
    const a=make([.01,0,.24],1.08);
    add(t=>{
      const p=idle(t);const shock=turn(t,.27,.65,1),down=turn(t,.91,1.71,1);
      p.hips=[-shock*9+down*5,345+down*17];p.lean=15*shock-25*down;p.look=22*shock-37*down;
      a.pose(hand(p,[57+16*shock,203+135*down]),t,'phone');
    });
  }else if(id===9){
    box(root,[.39,.74,-.65],[3.6,.19,1.4],'#ab8181',true);
    for(const x of [-1.02,1.78])box(root,[x,.36,-.67],[.19,.73,1.12],'#64556d',true);
    const a=make([-.59,0,.05],1.0);
    add(t=>{
      const p=idle(t);const pickup=ease(t,.66,1.57),consider=turn(t,1.54,2.44,1);
      p.lean=turn(t,.16,.62,25)-turn(t,.73,1.45,16);
      p.look=22*consider+9*pickup;
      a.pose(hand(p,blend([80,373],[112,238+4*Math.sin(t*3)],pickup)),t,t>.60?'photo':undefined);
    });
  }else if(id===10){
    box(root,[0,.84,-.08],[5.2,.26,2.07],'#ab8c88',true);
    const cal=group(root,[0,1.03,.15]);
    box(cal,[0,1.09,-.02],[2.64,2.20,.27],'#ae7b8f',true);
    for(const x of [.89,-.89])tube(cal,[x,2.19,.04],[.086,.25,.086],warm);
    const sheet=group(cal,[0,2.09,.17]);
    box(sheet,[0,-1.0,0],[2.49,1.94,.058],'#f2d9b7',true);
    const year=Array.from({length:16},(_,n)=>label(sheet,[0,-.97,.035],2.26,.68,''+(2026+Math.round(n*100/15)),'#514355'));
    label(sheet,[0,-.37,.035],1.84,.27,'ELAPSED TIME','#65516a');
    add(t=>{const flips=Math.min(15,t*5.55),j=Math.floor(flips);
      sheet.rotation.x=-Math.PI*.47*Math.sin((flips%1)*Math.PI)**5;
      year.forEach((y,i)=>y.visible=i===j);
    });
  }else if(id===11){
    slab(root,0,'#63778b');tiles(root,-5,'#8295a1',24);
    box(root,[0,4,-18],[27,8,.25],'#485a76');
    for(let i=0;i<8;i++){
      const z=2-i*2.34;
      const arch=new T.TorusGeometry(3.3,.075,7,24,Math.PI);
      mesh(root,arch,[0,1.64,z],[1,1,1],'#9eb2b8');
      for(const x of [-3.3,3.3])box(root,[x,.81,z],[.126,1.63,.14],'#8098a8');
      box(root,[0,4.999,z],[1.1,.025,.12],teal,false,true);
    }
    walking(-1.65,.51,.92,0,1,.2);walking(1.92,-4.8,.62,3,-1,.49);
    walking(-1.75,-7.64,.55,1,1,.68);
  }else if(id===12){
    const terminal=group(root,[1.0,0,-.23]);
    box(terminal,[0,.72,0],[.44,1.46,.55],'#59768d',true);
    const screen=console(terminal,[0,2.21,0],'PAYMENT','SCAN',1.45);
    const declined=label(screen.o,[0,-.04,.18],1.14,.39,'DECLINED','#ffafbd');
    const sensor=ball(terminal,[-.47,1.49,.23],[.10,.10,.039],teal,true);
    const a=make([-.98,0,.26],.88);
    add(t=>{
      const reach=ease(t,.27,1.10),retreat=ease(t,1.46,2.37);
      const p=idle(t);p.lean=turn(t,.37,1.12,24)-turn(t,1.45,2.28,33);
      p.look=11*reach-20*retreat;
      a.pose(hand(p,blend(blend([42,346],[118,284],reach),[60,318],retreat)),t,'card');
      sensor.scale.set(.10+.027*Math.sin(19*t),.1,.039);
      screen.display.visible=t<1.33;declined.visible=t>=1.33;
    });
  }else if(id===13){
    const h=group(root,[.31,0,-1.6]);
    box(h,[0,1.23,0],[3.0,2.46,1.94],'#c78e85',true);
    const roof=mesh(h,new T.CylinderGeometry(1,1,1,3),[0,2.65,0],[1.97,2.11,.81],'#805875');
    roof.rotation.x=Math.PI/2;roof.rotation.y=Math.PI/2;
    box(h,[.89,2.84,-.43],[.40,.75,.36],'#8f798a',true);
    for(const x of [-.98,.99]){
      box(h,[x,1.58,1.0],[.54,.63,.072],warm,true,true);
      box(h,[x,1.58,1.055],[.045,.65,.03],'#8d6474');
      box(h,[x,1.56,1.06],[.57,.046,.04],'#8d6474');
    }
    const hinge=group(h,[-.29,0,1]);box(hinge,[.29,.58,0],[.60,1.16,.078],'#7f6378',true);
    const resident=make([.31,0,-.24],.39,2);
    walking(-2.03,.66,.69,0,1,.43);greenery(root,2.06,-1.24,.74);
    add(t=>{
      const op=ease(t,.55,1.44),step=ease(t,1.06,2.14);
      hinge.rotation.y=-1.51*op;
      resident.root.visible=t>1.05;resident.root.position.z=-.34+.7*step;
      resident.pose(walk(Math.min(t-1.05,1.05),1),t);
    });
  }else if(id===14){
    console(root,[0,4.32,-4.88],'HISTORY COLLECTION','2026',2.85);
    for(const [n,x] of [-1.62,0,1.63].entries()){
      const g=group(root,[x,0,-.64]);
      box(g,[0,.69,0],[1.29,1.34,1.21],'#586d87',true);
      box(g,[0,1.39,0],[1.36,.143,1.28],'#a3b7bd',true);
      const art=group(g,[0,1.71,0]);
      if(n===0){box(art,[0,.17,0],[.40,.66,.056],'#557089',true);box(art,[0,.17,.044],[.32,.51,.039],teal,true);}
      if(n===1){const car=vehicle(art,'taxi',[0,0,0],'#b29cc6');car.scale.setScalar(.47);}
      if(n===2){box(art,[0,.21,0],[.64,.53,.32],'#c4b7ad',true);box(art,[0,.23,.18],[.47,.36,.052],'#4f778b',true);box(art,[0,-.07,.18],[.75,.07,.39],'#c8b5a7',true);}
      add(t=>{art.rotation.y=.32+t*.72;art.position.y=1.71+.08*Math.sin(t*3+n);});
    }
    walking(-2.57,.52,.65,0,1,.39);
  }else if(id===15){
    const café=group(root,[.35,0,-1.9]);
    box(café,[0,1.65,-.62],[5.84,3.29,.45],'#a57b8e',true);
    label(café,[.03,2.89,-.35],1.31,.38,'CAFÉ',pearl);
    for(let j=-5;j<=5;j++)box(café,[j*.50,2.49,.16],[.50,.16,1.29],j%2?'#cc9796':'#edbb9c',true);
    const table=group(root,[0,0,.22]);tube(table,[0,.71,0],[.69,.11,.69],'#c19583');
    tube(table,[0,.34,0],[.12,.69,.12],'#797284');
    const tree=greenery(root,-2.20,-.61,.89);
    for(const x of [-1.02,.96]){
      const seat=group(root,[x,0,.21]);
      box(seat,[0,.51,0],[.64,.12,.62],'#a17d89',true);
      box(seat,[0,.80,-.26],[.61,.58,.075],'#a17d89',true);
      for(const f of [-.24,.24])box(seat,[f,.24,.19],[.077,.53,.077],'#776f86');
    }
    const a=make([-.88,0,.30],.69,1),b=make([.84,0,.26],.72,2);
    walking(1.87,-1,.52,3,-1,.76);
    add(t=>{
      tree.rotation.z=.022*Math.sin(t*2.1);
      for(const [j,o] of [a,b].entries()){
        const p=idle(t);const wave=(Math.sin(4*t-2.6*j)+1)/2;
        p.hips=[0,405];p.feet=[[-27,SOLE],[52,SOLE]];
        p.lean=6*j+8*wave;p.look=12*(j?-1:1)+wave*6;
        o.pose(hand(p,[39+26*wave,329-63*wave]),t,j===0?'cup':undefined);
      }
    });
  }else if(id===16){
    const steps=group(root,[0,0,-1.92]);
    for(let j=0;j<3;j++)box(steps,[0,.13+j*.16,-j*.41],[9.6,.25+j*.32,.94],'#a291a4',true);
    greenery(root,-2.14,-.95,.71,'#6e938c');
    const a=make([-.85,0,.15],.84),b=make([.90,0,.02],.79,2);
    const bag=group(root,[0,0,.22]);box(bag,[0,.24,0],[.60,.48,.29],'#e4b981',true);
    for(const side of [-1,1]){
      const grip=mesh(bag,new T.TorusGeometry(.083,.025,7,18,Math.PI),
        [side*.31,.42,.04],[1,1,1],'#95737d');
      grip.rotation.z=-side*Math.PI/2;
    }
    add(t=>{
      const lower=ease(t,.22,1.12),up=ease(t,1.36,2.57),dip=lower*(1-up);
      bag.position.y=.66*up;bag.position.x=.12*up;
      for(const [j,o] of [a,b].entries()){
        const sign=j?-1:1,p=idle(t),scale=j?.79:.84;
        o.root.position.x=(j?.90:-.85)+sign*.15*dip+.12*up;
        p.hips=[sign*16*dip,345+84*dip];p.look=turn(t,.27,.90,18)*sign;
        p.lean=sign*(12+44*dip);p.legBend=sign;p.feet=[[-38,SOLE],[32,SOLE]];
        const grip:Pt=[(bag.position.x-sign*.32-o.root.position.x)/(PIXEL*scale),
          SOLE-(bag.position.y+.46)/(PIXEL*scale)];
        o.pose(hand(p,blend([sign*49,337],grip,ease(t,.45,1.2))),t);
      }
    });
  }else if(id===17){
    for(const [x,z,s] of [[-2.1,-1.0,.96],[1.76,-1.74,1],[.7,-3.3,.66],[-2.5,-3.45,.78]])greenery(root,x,z,s);
    box(root,[0,.34,-1.4],[2.92,.44,.68],'#9b8b9d',true);
    box(root,[0,.64,-1.4],[2.96,.16,.88],'#b7a592',true);
    walking(2.2,.18,.85,1,-1,.27);walking(2.85,-.36,.54,2,-1,.67);
    const a=make([-.99,0,-.39],.72);
    add(t=>{
      const p=idle(t);p.look=turn(t,.49,2.1,31);
      a.pose(hand(p,[47+12*Math.sin(t*2),332-36*ease(t,.85,1.86)]),t);
    });
  }else if(id===18){
    box(root,[0,.13,1.34],[7.3,.26,2.72],'#887f97',true);
    box(root,[0,.92,-.36],[7.5,.12,.11],'#9e92a6',true);
    for(let j=-4;j<=4;j++)box(root,[j*.79,.54,-.36],[.08,.91,.08],'#838397');
    box(root,[0,1.48,-4.14],[28,.31,1.26],'#9e93a7',true);
    moving(vehicle(root,'train',[0,0,-4.14],pearl),-7,4.8,1.63);
    moving(vehicle(root,'drone',[0,0,-4.7],pearl),4.2,-3.07,4.6,.12);
    const a=make([-1.12,.27,.58],.76);
    add(t=>{
      const p=idle(t);p.lean=turn(t,.22,1.31,12);p.look=turn(t,1.07,2.60,38);
      a.pose(hand(p,[54+turn(t,.72,1.61,46),329-42*ease(t,.82,1.83)]),t);
    });
  }else{
    box(root,[0,.12,1.31],[8.1,.26,3.2],'#746b86',true);
    moving(vehicle(root,'drone',[0,0,-3.99],'#ced7d8'),4.2,-3.2,4.85,.08);
    const a=make([.01,.24,.18],1.0);
    add(t=>{
      const p=idle(t),wave=ease(t,.43,1.05)-ease(t,2.33,2.95);
      p.lean=turn(t,.15,.71,-16)+turn(t,1.1,1.7,17);p.look=turn(t,.3,1.01,18)-turn(t,1.33,2.69,23);
      a.pose(hand(p,[51+wave*(47+16*Math.sin(10*t)),330-140*wave]),t);
    });
  }
  const [start,target,fov]=cams[id];
  return {
    root,
    tick:t=>{for(const fn of update)fn(t);},
    camera:(cam,t,fixed)=>{
      const q=fixed?0:ease(t,0,3);
      cam.position.set(start[0]+q*(id===18?-.52:.29),start[1]+q*(id===6?.38:-.13),start[2]+q*(id===18?.71:-.38));
      cam.lookAt(target[0],target[1]+.11*q,target[2]);cam.fov=fov;cam.updateProjectionMatrix();
    },
    dispose:()=>{
      root.traverse((o)=>{
        if(o instanceof T.Mesh){
          if(![boxGeo,sphereGeo,cylGeo].includes(o.geometry))o.geometry.dispose();
          if(o.material instanceof T.MeshBasicMaterial && o.material.map && ![...labelCache.values()].includes(o.material.map))o.material.map.dispose();
          if(![...mats.values()].includes(o.material))o.material.dispose();
        }
      });
    }
  };
}
