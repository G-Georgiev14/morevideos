import {Pen, INK, shade} from '../../.agents/skills/cartoon-3d-short/templates/bridge/toon';

export type Pt = [number, number];
export const mix = (a:number,b:number,t:number) => a+(b-a)*t;
export const unit = (x:number) => Math.max(0,Math.min(1,x));
export const ease = (t:number,a=0,b=1) => {const u=unit((t-a)/(b-a));return u*u*(3-2*u);};
export const blend = (a:Pt,b:Pt,t:number):Pt => [mix(a[0],b[0],t),mix(a[1],b[1],t)];
const TAU = Math.PI*2;
export const PIXEL = .0085;
export const SOLE = 502;
export const STEP = 132;
export const WALK_SECONDS = 1.12;
const STANCE = .60;

/** During stance root translation cancels the local heel translation. */
export function footAt(cycle:number,direction=1):Pt {
  const phase=((cycle%1)+1)%1;
  if(phase<STANCE) return [direction*STEP*(STANCE/2-phase),SOLE];
  const u=(phase-STANCE)/(1-STANCE);
  // Match stance velocity at contact and toe-off (Hermite boundary tangents).
  const a=-STEP*STANCE/2, b=-a, speed=-STEP*(1-STANCE);
  const x=(2*u**3-3*u*u+1)*a+(u**3-2*u*u+u)*speed+(-2*u**3+3*u*u)*b+(u**3-u*u)*speed;
  return [direction*x,SOLE-35*Math.sin(Math.PI*u)**2];
}

export type Pose = {
  hips:Pt; lean:number; look:number;
  feet:[Pt,Pt]; hands:[Pt,Pt]; legBend:number;
  sitting?:boolean;
};
export function idle(t:number):Pose {
  return {hips:[0,345+2*Math.sin(3.8*t)],lean:2*Math.sin(2.1*t),look:2*Math.sin(2.7*t),
    feet:[[-26,SOLE],[28,SOLE]],hands:[[-49,337],[51,337]],legBend:1};
}
export function walk(t:number,direction=1):Pose {
  const cycle=t/WALK_SECONDS;
  const l=footAt(cycle,direction), r=footAt(cycle+.5,direction);
  const swing=Math.cos(TAU*(cycle-.15))*29*direction;
  return {hips:[0,352-4*Math.cos(TAU*2*(cycle-.13))],lean:8*direction+3*Math.sin(cycle*TAU),
    look:4*direction+3*Math.sin(cycle*TAU-.5),feet:[l,r],
    hands:[[-29+swing,337+Math.abs(swing)*.24],[29-swing,337+Math.abs(swing)*.24]],legBend:direction};
}
export const travel = (t:number,direction=1) => t/WALK_SECONDS*STEP*PIXEL*direction;

export function joint(a:Pt,b:Pt,l1:number,l2:number,bend:number):[Pt,Pt] {
  const dx=b[0]-a[0],dy=b[1]-a[1], distance=Math.hypot(dx,dy);
  const n=Math.max(.01,distance);
  const reach=Math.max(Math.abs(l1-l2)+.01,Math.min(l1+l2-.01,n));
  const ux=distance<.01?1:dx/n,uy=dy/n;
  const along=(l1*l1-l2*l2+reach*reach)/(2*reach);
  const side=Math.sqrt(Math.max(0,l1*l1-along*along))*bend;
  return [[a[0]+ux*along-uy*side,a[1]+uy*along+ux*side],[a[0]+ux*reach,a[1]+uy*reach]];
}

export const styles=[
  {jacket:'#eeb768',pants:'#39354e',detail:'#f9e4a0',trim:'#b96e51',body:1},
  {jacket:'#70c7b4',pants:'#315068',detail:'#bde8d0',trim:'#4a9d9b',body:.86},
  {jacket:'#d589ab',pants:'#5e4269',detail:'#f7bfc2',trim:'#ae5f8d',body:1.13},
  {jacket:'#8eaae0',pants:'#435274',detail:'#dadff7',trim:'#667bbb',body:.93},
];

function prop(p:Pen,kind:string,h:Pt,beat:number) {
  const [x,y]=h;
  const g=p.g;
  if(kind==='phone'){
    g.save();g.translate(x,y-30);g.rotate(.12);
    p.poly([[-19,-27],[17,-27],[19,25],[-19,25]],'#3e4761',4);
    p.poly([[-14,-21],[13,-21],[13,15],[-14,15]],'#8de3cc',2);
    p.stroke([[-9,-10],[8,-10], [8,5-9*beat]],3,'#638ea2');
    g.restore();
  } else if(kind==='photo'){
    p.poly([[x-22,y-80],[x+105,y-84],[x+109,y+11],[x-18,y+15]],'#f8e5c6',4);
    p.poly([[x-14,y-70],[x+96,y-72],[x+99,y-2],[x-13,y+1]],'#b18498',2);
    for(const dx of [11,42,73]){
      p.line([[x+dx-9,y-6],[x+dx,y-25],[x+dx+10,y-8]],INK,4,false);
      p.line([[x+dx,y-23],[x+dx,y-42],[x+dx+12,y-32]],INK,4,false);
      p.ell(x+dx,y-47,8,8,'#fff8e9',2);
    }
  } else if(kind==='card'){
    p.poly([[x-8,y-28],[x+48,y-31],[x+49,y+3],[x-8,y+6]],'#d3b6f5',4);
    p.poly([[x+2,y-21],[x+13,y-21],[x+13,y-12],[x+2,y-12]],'#f3cc86',1);
    p.stroke([[x+22,y-9],[x+39,y-10]],2,'#8175aa');
  } else if(kind==='bag'){
    p.poly([[x-26,y+7],[x+30,y+7],[x+25,y+60],[x-23,y+62]],'#e5bc78',4);
    p.arc(x+2,y+8,16,18,180,360,4);
    p.line([[x-16,y+18],[x-12,y+52]],'#f4d29a',3,false);
  } else if(kind==='cup'){
    p.poly([[x-13,y-21],[x+14,y-21],[x+11,y+9],[x-8,y+9]],'#cce8dc',3);
    p.arc(x+14,y-8,9,10,-90,90,3);
  }
}

/** The source skill's Pen supplies the rounded plum ink and clipped colour shapes. */
export function drawRig(g:CanvasRenderingContext2D,pose:Pose,styleId:number,t:number,held?:string,chairAngle=0){
  const p=new Pen(g);
  const style=styles[styleId];
  p.ol=3.0;
  g.clearRect(0,0,480,560);
  g.save();g.translate(240,0);
  if(chairAngle){g.translate(0,365);g.rotate(chairAngle);g.translate(0,-365);}
  const [hx,hy]=pose.hips;
  const tilt=pose.lean;
  const shoulder:Pt=[hx+tilt,hy-94];
  const neck:Pt=[hx+tilt*1.10,hy-106];
  const pivot=(x:number,y:number):Pt=>[x+hx,y+hy];
  const farLeg=pivot(-14,0), nearLeg=pivot(14,0);
  const makeLeg=(start:Pt,target:Pt,color:string)=>{
    const heel:Pt=[target[0],target[1]-8];
    const [knee,ankle]=joint(start,heel,81,75,pose.legBend);
    p.line([start,knee,ankle],color,13);
    p.line([[ankle[0]-5,ankle[1]+2],[ankle[0]+12*pose.legBend,ankle[1]+2]],'#626078',14);
    p.stroke([[ankle[0]-5,ankle[1]+8],[ankle[0]+14*pose.legBend,ankle[1]+8]],3);
  };
  makeLeg(farLeg,pose.feet[0],shade(style.pants,.75));
  const across=22*style.body;
  const arm=(side:number,goal:Pt)=>{
    const start:Pt=[shoulder[0]+side*across,shoulder[1]+4];
    const [elbow,wrist]=joint(start,goal,56,55,side);
    p.line([start,elbow,wrist],side<0?shade(style.jacket,.77):style.jacket,11);
    p.ell(wrist[0],wrist[1],7,7,'#f8f2de',3);
    return wrist;
  };
  arm(-1,pose.hands[0]);
  makeLeg(nearLeg,pose.feet[1],style.pants);
  p.line([neck,[neck[0],neck[1]-24]],'#eee4d6',11);
  const torso:Pt[]=[[shoulder[0]-across,shoulder[1]],[shoulder[0]-7,shoulder[1]-10],
    [shoulder[0]+across-2,shoulder[1]],[shoulder[0]+across+3,shoulder[1]+15],
    [hx+21,hy-2],[hx-20,hy+1],[shoulder[0]-across-5,shoulder[1]+15]];
  p.poly(torso,style.jacket,4);
  g.save();p.path(torso,true);g.clip();
  p.poly([[shoulder[0]+4,shoulder[1]-14],[shoulder[0]+30,shoulder[1]-6],[hx+36,hy+5],[hx+5,hy+6]],shade(style.jacket,.82),0);
  p.stroke([[shoulder[0]+3,shoulder[1]+4],[hx+3,hy-5]],3,style.trim);
  g.restore();
  p.line([[neck[0]-15,neck[1]+8],[neck[0]+3,neck[1]+11],[neck[0]+16,neck[1]+3]],style.detail,9);
  if(styleId===0){
    const tail=7*Math.sin(4*t)+pose.lean*.38;
    p.line([[neck[0]+13,neck[1]+8],[neck[0]+23+tail,neck[1]+24],[neck[0]+25+tail,neck[1]+35]],style.detail,8);
  } else if(styleId===2){
    p.stroke([[shoulder[0]-13,shoulder[1]+8],[hx+16,hy-12]],5,style.detail);
  }
  const wrist=arm(1,pose.hands[1]);
  if(held) prop(p,held,wrist,(Math.sin(t*9)+1)/2);
  const head:Pt=[neck[0]+pose.look,neck[1]-61+Math.abs(pose.look)*.10];
  p.ell(head[0],head[1],49,49,'#fff9ed',5);
  p.arc(head[0]+2,head[1]+2,39,38,24,120,3,'#e0d9d6');
  g.restore();
}
