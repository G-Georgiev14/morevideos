"""Draw the 20 animated shots and pipe the frames to FFmpeg."""
from functools import lru_cache
from pathlib import Path
from math import sin, cos, pi
import argparse
import json
import random
import subprocess
from PIL import Image, ImageDraw, ImageFont

W,H=540,960
INK='#080e19'
CYAN='#8ffce6'
GOLD='#ffcb8b'
WHITE='#f5f7ff'
PAL=[
 ((11,17,39),(38,61,87)),
 ((15,26,49),(31,79,95)),
 ((27,72,107),(223,168,145)),
 ((18,37,59),(54,116,124)),
 ((24,52,90),(140,142,180)),
 ((23,48,66),(79,142,138)),
 ((18,46,86),(123,152,201)),
 ((35,42,75),(88,104,148)),
 ((24,20,43),(56,36,70)),
 ((36,26,49),(89,58,67)),
 ((38,23,50),(77,47,77)),
 ((16,22,43),(61,64,91)),
 ((33,29,49),(75,66,92)),
 ((34,49,68),(150,112,112)),
 ((25,36,63),(57,79,106)),
 ((85,60,86),(240,157,124)),
 ((70,58,83),(224,146,119)),
 ((87,60,94),(232,156,118)),
 ((46,47,83),(230,143,121)),
 ((43,44,76),(185,94,97)),
]
LABELS={0:('100 YEARS','LATER…'),3:('YOUR PHONE','IS ANCIENT'),8:('HERE’S THE','TERRIFYING PART…'),18:('TECHNOLOGY','CHANGES EVERYTHING…'),19:('WOULD YOU WAKE','UP IN 2126?')}
NAMES=['Wake','The room','First look','Old phone','Autonomous lanes','AI concierge','The towers','Robot shift','The turn','Family photo','One century','Alone','Card rejected','Home address','Museum 2026','The plaza','A helping hand','Familiar lives','The new skyline','Would you?']
CAPTIONS=Path('assets/captions.json')

@lru_cache(None)
def font(sz, mono=False):
    name='DejaVuSansMono-Bold' if mono else 'DejaVuSans-Bold'
    return ImageFont.truetype(f'/usr/share/fonts/truetype/dejavu/{name}.ttf',sz)

@lru_cache(None)
def background(i):
    a,b=PAL[i]
    col=Image.new('RGB',(1,H))
    col.putdata([tuple(round(x+(y-x)*(v/H)**.82) for x,y in zip(a,b)) for v in range(H)])
    return col.resize((W,H))

def tx(d,x,y,s,sz=20,fill=WHITE,anchor='mm',outline=0,mono=False):
    d.text((x,y),s,font=font(sz,mono),fill=fill,anchor=anchor,stroke_width=outline,stroke_fill=INK)

def box(d, coords, fill, outline=None, radius=0, width=2):
    d.rounded_rectangle(coords,radius,fill=fill,outline=outline,width=width)

def panel(d,x,y,w,h,title,info='',tone=CYAN):
    box(d,(x,y,x+w,y+h),'#142638','#447780',12)
    d.line((x+12,y+12,x+46,y+12),fill=tone,width=2)
    tx(d,x+13,y+24,title,12,tone,'lm',mono=True)
    if info:
        tx(d,x+w/2,y+h/2+10,info,min(38,int(w/max(len(info),1)*1.45)),WHITE,mono=True)

def dots(d,t,seed=4,n=60, color='#b3c7cc'):
    rng=random.Random(seed)
    for _ in range(n):
        x=(rng.randrange(W)+t*rng.randrange(4,20))%W
        y=rng.randrange(85,745)
        r=rng.choice((.6,1,1,1.8))
        d.ellipse((x-r,y-r,x+r,y+r),fill=color)

def city(d,t,base=730,scale=1.,seed=4,warm=False):
    rng=random.Random(seed)
    d.ellipse((305,255,440,390),fill='#ffc5a2' if warm else '#9ddadb')
    for layer,(colors, shift) in enumerate([
        (('#557283','#426473','#5f7788'),13),
        (('#304f66','#224259','#3b5a70'),27),
        (('#172b42','#233d55','#1b324a'),48),
    ]):
        x=-160-t*shift
        floor=base+layer*33
        for _ in range(17):
            w=rng.randint(32,94)*scale
            h=rng.randint(105,340)*scale*(1+layer*.14)
            y=floor-h
            c=rng.choice(colors)
            d.polygon([(x,y+13),(x+w*.72,y),(x+w,y+17),(x+w,floor),(x,floor)],fill=c,outline='#142439')
            d.polygon([(x+w*.72,y),(x+w,y+17),(x+w,floor),(x+w*.72,floor)],fill=colors[0])
            d.line((x+4,y+17,x+w*.67,y+5),fill='#83b2bb',width=2)
            if layer>0:
                for offset in range(10,int(w*.67),13):
                    wx=x+offset
                    for wy in range(int(y)+28,int(floor)-12,19):
                        if rng.random()>.29:
                            d.rectangle((wx,wy,wx+4,wy+7),fill=rng.choice(('#73bdb5','#e6b68e','#446e7b')))
            if rng.random()>.67:
                d.line((x+w*.67,y,x+w*.67,y-27),fill='#6097a2',width=2)
                d.ellipse((x+w*.67-2,y-29,x+w*.67+2,y-25),fill=GOLD)
            x+=w+rng.randint(8,22)
    d.rectangle((0,base+66,W,H),fill='#101e30')
    for j in range(3):
        y=base+47+j*40
        d.line((0,y+35,W,y-37),fill='#446075',width=4)
        for k in range(5):
            x=(k*143+t*(70+j*17))%(W+80)-38
            yy=y+35-x*.13
            d.line((x-24,yy+3,x+16,yy-2),fill=GOLD if j==0 else CYAN,width=2)

def ground(d,y=770,t=0,warm=False):
    d.rectangle((0,y,W,H),fill='#302a3a' if warm else '#142339')
    for x in range(-365,1000,94):
        d.line((270+(x-270)*.11,y,x,H),fill='#405468',width=1)
    for k in range(7):
        v=(k/7+t*.11)%1
        d.line((0,y+(H-y)*v*v,W,y+(H-y)*v*v),fill='#405468',width=1)

def person(d,x,y,s=1.,t=0,pose='idle',accent=CYAN,face='#e3edee'):
    """Coordinates are anchored at the feet."""
    bounce=sin(t*5)*2 if pose=='walk' else sin(t*2.8)*1.5
    def xy(a,b): return (x+a*s,y+(b+bounce)*s)
    def line(points,w=8,color=face):
        ps=[xy(a,b) for a,b in points]
        d.line(ps,fill=INK,width=max(2,round((w+5)*s)),joint='curve')
        d.line(ps,fill=color,width=max(1,round(w*s)),joint='curve')
    shadow=25*s
    d.ellipse((x-shadow,y-3*s,x+shadow,y+6*s),fill='#0a1420')
    swing=sin(t*8)*15 if pose=='walk' else 0
    line([(0,-48),(-10+swing*.4,-24),(-16+swing,0)])
    line([(0,-48),(11-swing*.4,-23),(18-swing,0)])
    line([(0,-79),(0,-46)],11)
    if pose in ('reach','help','hold'):
        line([(0,-75),(-13,-62),(-26,-78 if pose=='hold' else -52)])
        line([(0,-75),(20,-62),(39,-76 if pose=='hold' else -57)])
    elif pose=='up':
        line([(0,-75),(-20,-66),(-31,-88)])
        line([(0,-75),(18,-67),(32,-91)])
    else:
        line([(0,-75),(-13,-63),(-22-swing*.7,-49)])
        line([(0,-75),(13,-63),(22+swing*.7,-50)])
    hx,hy=xy(0,-99)
    r=16*s
    d.ellipse((hx-r,hy-r,hx+r,hy+r),fill=face,outline=INK,width=max(2,round(3*s)))
    line([(-10,-82),(12,-82)],5,accent)
    line([(5,-81),(19,-69)],4,accent)

def robot(d,x,y,s,t):
    for sign in (-1,1):
        ax=x+sign*27*s
        ay=y-(42+12*sin(t*5+sign))*s
        d.line((x+sign*13*s,y-60*s,ax,ay,ax+sign*9*s,ay-11*s),fill=INK,width=max(2,int(7*s)))
        d.line((x+sign*13*s,y-60*s,ax,ay),fill='#86aaaa',width=max(2,int(4*s)))
    box(d,(x-19*s,y-74*s,x+19*s,y-18*s),'#759aa5',INK,8,3)
    box(d,(x-24*s,y-113*s,x+24*s,y-76*s),'#d8e8df',INK,9,3)
    box(d,(x-17*s,y-103*s,x+17*s,y-86*s),'#1c3347',radius=4)
    d.line((x-9*s,y-94*s,x+9*s,y-94*s),fill=CYAN,width=max(2,int(2*s)))
    for v in (-12,12):
        d.ellipse((x+(v-7)*s,y-24*s,x+(v+7)*s,y),fill=INK)
    d.ellipse((x-4*s,y-58*s,x+4*s,y-50*s),fill=GOLD)

def car(d,x,y,s,accent=CYAN):
    d.ellipse((x-63*s,y-5*s,x+63*s,y+15*s),fill='#141c2a')
    d.polygon([(x-66*s,y),(x-51*s,y-17*s),(x-26*s,y-23*s),(x-8*s,y-36*s),(x+29*s,y-36*s),(x+53*s,y-19*s),(x+69*s,y-11*s),(x+60*s,y+6*s),(x-58*s,y+6*s)],fill='#6e95ab',outline=INK,width=max(2,int(3*s)))
    d.polygon([(x-15*s,y-21*s),(x-4*s,y-31*s),(x+25*s,y-31*s),(x+42*s,y-20*s)],fill='#293d58')
    d.line((x-53*s,y,x+55*s,y),fill=accent,width=max(1,int(2*s)))

def photo(d,x,y,s,t):
    box(d,(x,y,x+280*s,y+220*s),'#f7dfc5',INK,9,3)
    box(d,(x+10*s,y+10*s,x+270*s,y+177*s),'#977a82',radius=3)
    d.ellipse((x+179*s,y+22*s,x+235*s,y+78*s),fill=GOLD)
    for k,c in enumerate((CYAN,GOLD,'#f1a4bb')):
        person(d,x+(68+k*72)*s,y+168*s,s*.78,t,'up',c)
    tx(d,x+140*s,y+199*s,'SUMMER 2026',max(8,int(16*s)),INK,mono=True)

def phone(d,x,y,s):
    box(d,(x-44*s,y-74*s,x+44*s,y+74*s),'#121823','#8094a5',int(12*s),max(2,int(3*s)))
    box(d,(x-36*s,y-58*s,x+36*s,y+55*s),'#28475d',radius=int(6*s))
    for j in range(3):
        for k in range(3):
            xx=x+(-26+k*22)*s
            yy=y+(-38+j*22)*s
            box(d,(xx,yy,xx+13*s,yy+13*s),(CYAN,GOLD,'#a595d8')[(j+k)%3],radius=int(3*s))
    d.ellipse((x-4*s,y+59*s,x+4*s,y+67*s),fill='#84949d')

def scene(i,t,thumbnail=False):
    image=background(i).copy()
    d=ImageDraw.Draw(image)
    u=t/3
    drift=sin(u*pi/2)
    warm=i>=15
    dots(d,t,i+2126,78,'#9c9cae' if not warm else '#efb79f')
    if i in (2,4,6,7,11,13,15,16,17,18,19):
        city(d,t,670 if i in (2,6,18) else 703,1.28 if i in (6,18) else 1,7 if i in (2,18,19) else i,warm)
    if i in (0,1):
        d.polygon([(0,616),(W,563),(W,H),(0,H)],fill='#151c32')
        d.polygon([(0,630),(W,569),(W,589),(0,666)],fill='#406076')
        for q in range(7):
            d.line((70*q-70,0,70*q+25,610),fill='#23324e',width=2)
        if i==0:
            panel(d,293,329,184,112,'WAKE SEQUENCE','2126')
            box(d,(36,619,462,740),'#172539','#111522',32,6)
            box(d,(40,606,459,681),'#416276',INK,29,5)
            box(d,(53,602,176,650),'#8095a5',INK,19,4)
            if t<.25:
                d.line((141,623,204,638,281,638,318,652),fill=INK,width=15,joint='curve')
                d.line((141,623,204,638,281,638,318,652),fill='#e3edee',width=8,joint='curve')
                d.ellipse((115,605,149,639),fill='#e3edee',outline=INK,width=3)
                d.line((146,621,160,630),fill=CYAN,width=5)
            else:
                p=min(1,(t-.25)/.85)
                person(d,185+42*p,665,1.22+0.56*p,t,'up' if p<.85 else 'hold')
            d.line((53,718,426,718),fill=CYAN,width=2)
        else:
            ground(d,748,t)
            person(d,263,772,2.25,t,'up')
            for k,(x,y,a,b) in enumerate([(22,332,'VITALS','STABLE'),(291,380,'SYSTEM','ONLINE'),(47,510,'DATE','2126')]):
                if t+.25>k*.30:
                    panel(d,x+8*sin(t+k),y+6*sin(t*2+k),198 if k!=2 else 132,85,a,b)
    elif i==2:
        gap=47+205*drift
        for left,right in ((0,270-gap),(270+gap,540)):
            d.rectangle((left,0,right,795),fill='#101d32')
            e=right if left==0 else left
            d.line((e,0,e,795),fill='#70a2ad',width=5)
        ground(d,794,t)
        person(d,249,824,1.8,t,'up')
    elif i==3:
        panel(d,230,289,255,132,'PERSONAL INTERFACE','SYNCED')
        panel(d,280,455,224,90,'HOLOGRAM','ACTIVE')
        person(d,422,729,1.5,t,'reach',GOLD)
        person(d,118,808,2.2,t,'hold')
        phone(d,166+12*drift,533-22*drift,1.56)
    elif i==4:
        for j in range(3):
            y=530+j*113
            d.polygon([(0,y+50),(W,y-52),(W,y+2),(0,y+100)],fill='#202b43',outline='#648697')
            for k in range(3):
                x=(k*214+t*(120+j*24))%700-80
                car(d,x,y+74-x*.19,.68+j*.26,GOLD if k==1 else CYAN)
    elif i==5:
        ground(d,727,t)
        panel(d,105,313,330,98,'CITY CONCIERGE','HOW CAN I HELP?')
        person(d,142+16*drift,779,1.95,t,'reach')
        robot(d,366-15*drift,761,2.25,t)
        for k in range(4):
            r=12+k*13
            d.arc((362-r,441-r,362+r,441+r),190+t*25,335+t*25,fill=CYAN,width=2)
    elif i==6:
        for k in range(4):
            x=(k*159+t*(75+k*8))%680-70
            y=315+93*k+sin(t+k)*17
            car(d,x,y,.43+k*.11)
            d.line((x-28,y,x-65,y+5),fill='#d8cfdd',width=2)
        d.line((22,760,518,624),fill='#89a9b4',width=6)
        car(d,(t*180)%650-50,743-t*48,1.12,GOLD)
    elif i==7:
        ground(d,769,t)
        for k in range(3):
            x=109+k*158
            robot(d,x,724+k*18,1.33,t+k)
            box(d,(x-65,741+k*17,x+67,819+k*17),'#2d465e',INK,10,4)
            box(d,(x-31,748+k*17,x+30,773+k*17),'#596b83',radius=4)
            d.line((x-23,761+k*17,x+sin(t*5+k)*20,761+k*17),fill=CYAN,width=3)
        person(d,-5+t*85,861,1.17,t,'walk',GOLD)
    elif i==8:
        d.polygon([(132,760),(229,301),(327,301),(457,760)],fill='#3b314f')
        for k in range(6):
            y=482+k*48
            d.line((46+k*6,y,492-k*7,y),fill='#62435e',width=1)
        person(d,270,800,2.7+.21*drift,t,'idle')
    elif i==9:
        person(d,101,821,1.45,t,'hold')
        photo(d,83-10*drift,322-15*drift,1.3+.12*drift,t)
    elif i==10:
        year=2026+min(100,int(u*112))
        for k in reversed(range(5)):
            box(d,(61+k*4,317+k*8,475+k*4,686+k*8),'#887286',INK,26,3)
        box(d,(61,309,475,679),'#cdb5b2',INK,26,5)
        box(d,(62,309,474,413),'#614760',radius=21)
        tx(d,268,366,'ELAPSED TIME',18,GOLD,mono=True)
        tx(d,267,515,str(year),100,INK,mono=True)
        tx(d,267,610,f'+{year-2026:03d} YEARS',20,'#644658',mono=True)
        d.rectangle((89,651,447,654),fill='#a28b9b')
        d.rectangle((89,651,89+358*(year-2026)/100,654),fill='#674d73')
    elif i==11:
        ground(d,750,t)
        for x in (68,467):
            d.line((x,750,x,499,x+(24 if x<270 else -24),483),fill=INK,width=8)
            d.line((x-16,484,x+16,484),fill='#c0a1b4',width=4)
        person(d,266,823,1.54-.24*drift,t,'idle')
    elif i==12:
        ground(d,756,t)
        person(d,124,802,2.16,t,'hold')
        box(d,(258,390,497,790),'#283c54',INK,23,5)
        accepted=t<.67
        panel(d,277,417,202,173,'PAYMENT TERMINAL','SCANNING' if accepted else 'REJECTED',CYAN if accepted else '#f6a0a9')
        box(d,(241+35*drift,597,346+35*drift,659), '#cab185',INK,10,4)
        d.rectangle((253+35*drift,612,269+35*drift,625),fill='#64506a')
        d.line((283,684,472,684),fill=CYAN if accepted else '#f6a0a9',width=4)
    elif i==13:
        ground(d,767,t,True)
        x=268-18*drift
        box(d,(x-135,543,x+135,750),'#a69d9c',INK,10,4)
        d.polygon(((x-157,548),(x,454),(x+155,548)),fill='#754e60',outline=INK,width=4)
        box(d,(x-31,605,x+34,750),'#49394e',INK,4,3)
        for a in (-97,65):
            box(d,(x+a,583,x+a+36,627),GOLD,INK,4,3)
        panel(d,358,401,145,73,'ADDRESS FOUND','OCCUPIED',GOLD)
        person(d,101+21*drift,810,1.32,t,'walk')
    elif i==14:
        ground(d,754,t)
        for k,(x,title) in enumerate([(19,'PHONE'),(193,'CAR'),(367,'COMPUTER')]):
            lift=5*sin(t*3+k)
            box(d,(x,420,x+153,753),'#263b5b','#72afa9',15,3)
            tx(d,x+77,698,title,15,CYAN,mono=True)
            if k==0:
                phone(d,x+77,548+lift,.73)
            elif k==1:
                car(d,x+77,573+lift,.82,GOLD)
            else:
                box(d,(x+24,504+lift,x+130,566+lift),'#a49cb5',INK,8,3)
                box(d,(x+32,512+lift,x+122,555+lift),'#283950',radius=4)
                d.line((x+62,579+lift,x+93,579+lift),fill=GOLD,width=4)
        panel(d,153,266,233,110,'MUSEUM OF DAILY LIFE','2026')
    elif i in (15,16,17):
        ground(d,728,t,True)
        colors=(GOLD,'#f1a7b9','#9cc7fa')
        for k in range(6):
            xx=(k*112+(-1)**k*t*21)%590-25
            person(d,xx,735+(k%2)*14,.57,t+k,'walk',colors[k%3],'#caaebb')
        if i==15:
            for k in range(3):
                person(d,118+k*144,802-k%2*25,1.54,t+k,('hold','up','reach')[k],colors[k])
        elif i==16:
            person(d,154+37*drift,808,1.85,t,'help',CYAN)
            person(d,389-31*drift,809,1.85,t,'help',GOLD)
            xx=274+43*cos(t*1.6)
            yy=748-48*sin(min(1,u)*pi)
            box(d,(xx-12,yy-12,xx+12,yy+12),GOLD,INK,4,2)
        else:
            person(d,133,826,2.07,t,'idle')
            person(d,284+t*27,782,1.19,t,'walk',GOLD)
            person(d,450-t*16,805,1.44,t,'walk','#f1a7b9')
    else:
        ground(d,770,t,True)
        person(d,267,832,2.42-.94*drift if i==18 else 2.45+.18*drift,t,'idle')
    if thumbnail:
        tx(d,38,131,'2026',24,GOLD,'lm',2,True)
        tx(d,499,131,'2126',24,CYAN,'rm',2,True)
        d.line((114,132,425,132),fill='#e8c7bb',width=2)
        tx(d,270,176,'100 YEARS',67,WHITE,outline=5)
        tx(d,270,249,'LATER',82,CYAN,outline=5)
        return image
    if i in LABELS:
        a,b=LABELS[i]
        yy=201+int(13*(1-min(1,t*5))**2)
        tx(d,270,yy,a,38,WHITE,outline=4)
        tx(d,270,yy+55,b, min(52,int(630/max(10,len(b)))),CYAN if i!=8 else GOLD,outline=4)
    if i!=0:
        d.line((31,100,62,100),fill=GOLD if warm else CYAN,width=3)
        tx(d,70,101,'2126',13,WHITE,'lm',1,True)
    return image

def frame(i,t,captions):
    image=scene(i,t)
    if i not in (0,2,10,18):
        # A restrained camera push keeps the subject centered.
        q=1+.028*t/3
        w,h=round(W*q),round(H*q)
        image=image.resize((w,h),Image.Resampling.BILINEAR).crop(((w-W)//2,(h-H)//2,(w-W)//2+W,(h-H)//2+H))
    d=ImageDraw.Draw(image)
    at=i*3+t
    for start,end,text in captions:
        if start<=at<end:
            words=text.split()
            idx=max(range(len(words)),key=lambda j:len(words[j].strip('?,.…')))
            sizes=[30 if j==idx else 26 for j in range(len(words))]
            widths=[d.textlength(word,font=font(sz)) for word,sz in zip(words,sizes)]
            total=sum(widths)+(len(words)-1)*8
            if total>425:
                sizes=[max(15,int(sz*425/total)) for sz in sizes]
                widths=[d.textlength(word,font=font(sz)) for word,sz in zip(words,sizes)]
            x=247-(sum(widths)+(len(words)-1)*8)/2
            y=845+int(8*max(0,1-(at-start)*12)**2)
            for j,(word,sz,width) in enumerate(zip(words,sizes,widths)):
                tx(d,x,y,word,sz,CYAN if j==idx else WHITE,'lm',3)
                x+=width+8
            break
    return image

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output', default='export')
    parser.add_argument('--stills', action='store_true')
    args=parser.parse_args()
    out=Path(args.output)
    out.mkdir(parents=True,exist_ok=True)
    captions=json.loads(CAPTIONS.read_text())
    thumbnail=scene(18,1.15,thumbnail=True).resize((1080,1920),Image.Resampling.LANCZOS)
    thumbnail.save(out/'thumbnail.png')
    if args.stills:
        for i in range(20):
            frame(i,1.25,captions).save(out/f'{i+1:02d}.png')
        return
    cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','30','-i','-','-i','assets/mix.wav',
         '-vf','scale=1080:1920:flags=lanczos,format=yuv420p','-c:v','libx264','-threads','6','-preset','veryfast',
         '-crf','18','-c:a','aac','-b:a','160k','-movflags','+faststart','-t','60',str(out/'what-if-2126.mp4')]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as ff:
        for i in range(20):
            for j in range(90):
                ff.stdin.write(frame(i,j/30,captions).tobytes())
            print(f'{i+1:02d}/20 {NAMES[i]}',flush=True)
        ff.stdin.close()
        if ff.wait()!=0:
            raise RuntimeError('FFmpeg failed')

if __name__=='__main__':
    main()
