"""Draw the 20 animated shots and pipe the frames to FFmpeg."""
from functools import lru_cache
from pathlib import Path
from math import sin, cos, pi, hypot
import argparse
import json
import os
import random
import subprocess
from PIL import Image, ImageDraw, ImageFont

W,H=540,960
INK='#090c14'
CYAN='#8bf4e7'
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

CAMERA=os.getenv('STICKMAN_FIXED_CAMERA')!='1'
PAPER='#fff8e9'
ROSE='#ff9fbd'
FADED='#92a5b6'

def mix(a,b,p):
    return a+(b-a)*p

def ease(t,start=0,end=1):
    u=max(0,min(1,(t-start)/(end-start)))
    return u*u*(3-2*u)

def lerp(a,b,p):
    return tuple(mix(x,y,p) for x,y in zip(a,b))

def path(d,points,color,width=2):
    d.line(points,fill=color,width=max(1,round(width)),joint='curve')

def disk(d,x,y,r,color,outline=None,w=1):
    d.ellipse((x-r,y-r,x+r,y+r),fill=color,outline=outline,width=max(1,round(w)))

def rig(d,x,y,s=1,*,legs=None,hands=None,lean=0,tilt=0,turn=0,accent=GOLD):
    """Draw an articulated stick figure anchored at the hip. Return hand positions."""
    def point(p):
        return (x+p[0]*s,y+p[1]*s)
    def limb(points,width=5):
        coords=[point(p) for p in points]
        path(d,coords,'#8793a0',width*s+2)
        path(d,coords,INK,width*s)
        for px,py in coords[1:-1]:
            disk(d,px,py,max(1,width*s/2),INK)
    hip=(0,0)
    neck=(lean,-35)
    head=(lean+tilt+turn*5,-56+abs(tilt)*.16)
    legs=legs or (((-9,22),(-16,45)),((9,22),(17,45)))
    hands=hands or (((-11,-16),(-19,7)),((12,-16),(21,7)))
    for knee,foot in legs:
        limb((hip,knee,foot))
        fx,fy=foot
        limb((foot,(fx+(6 if fx>=0 else -6),fy)),4)
    limb((hip,neck),6)
    shoulder=(lean*.86,-30)
    for elbow,hand in hands:
        limb((shoulder,elbow,hand),4.6)
    hx,hy=point(head)
    disk(d,hx,hy,17*s,PAPER,INK,3.8*s)
    nx,ny=point(neck)
    path(d,[(nx-8*s,ny+3*s),(nx+8*s,ny+3*s),(nx+14*s+turn*4*s,ny+12*s)],accent,4.2*s)
    return tuple(point(hand) for _,hand in hands)

def walker(d,x,floor,s,t,*,accent=GOLD,direction=1):
    phase=t*2*pi*1.44
    reach=sin(phase)
    step=[]
    arms=[]
    for sign in (-1,1):
        stride=sign*reach*direction
        lift=max(0,sign*cos(phase))*11
        step.append(((stride*13-6*direction,22-lift*.75),(stride*24,45-lift)))
        arms.append(((-stride*10,-15),(-stride*20,4+abs(stride)*5)))
    hip=floor-(45+2*abs(cos(phase)))*s
    return rig(d,x,hip,s,legs=step,hands=arms,lean=4*direction,tilt=2*direction,accent=accent)

def seated(d,x,hip,s,t,look,*,gesture=0,accent=GOLD):
    return rig(d,x,hip,s,legs=(((23,8),(40,34)),((33,11),(53,31))),
               hands=(((-10,-12),(-18,5)),((14,-12),(29,-1-gesture*27))),
               lean=look*6,tilt=look*7,turn=look,accent=accent)

def arm_to(shoulder,target,bend=1):
    """Resolve two fixed-length arm segments toward the contact point."""
    dx,dy=target[0]-shoulder[0],target[1]-shoulder[1]
    distance=max(.01,hypot(dx,dy))
    ux,uy=dx/distance,dy/distance
    upper,lower=23,27
    reach=min(upper+lower-.2,max(lower-upper+.2,distance))
    along=(upper**2-lower**2+reach**2)/(2*reach)
    height=(upper**2-along**2)**.5
    elbow=(shoulder[0]+ux*along-uy*height*bend,shoulder[1]+uy*along+ux*height*bend)
    hand=(shoulder[0]+ux*reach,shoulder[1]+uy*reach)
    return elbow,hand

def position(d,x,y,scale,hand,*,accent=GOLD,lean=0,tilt=0,turn=0):
    target=((hand[0]-x)/scale,(hand[1]-y)/scale)
    arm=arm_to((lean*.86,-30),target)
    return rig(d,x,y,scale,hands=(((-14,-14),(-22,5)),arm),
               lean=lean,tilt=tilt,turn=turn,accent=accent)[1]

def floor(d,y,tone='#18283b',line='#3a5668',vanish=270):
    d.rectangle((0,y,W,H),fill=tone)
    path(d,[(0,y),(W,y)],line,3)
    for xx in range(-520,1100,140):
        path(d,[(vanish+(xx-vanish)*.08,y),(xx,H)],line)
    for j in (15,43,84,142):
        path(d,[(0,y+j),(W,y+j)],line)

def tower(d,x,base,w,h,kind,tone,light):
    y=base-h
    shade='#253c54'
    if kind==0:
        shell=[(x,base),(x,y+24),(x+w*.53,y),(x+w,y+53),(x+w,base)]
        d.polygon(shell,fill=tone,outline=INK,width=2)
        d.polygon([(x+w*.53,y),(x+w,y+53),(x+w,base),(x+w*.68,base)],fill=shade)
        for j in range(1,5):
            xx=x+w*j/6
            path(d,[(xx,y+52),(xx,base)],light,1)
    elif kind==1:
        shell=[(x,base),(x,y+h*.34),(x+w*.16,y+h*.34),(x+w*.16,y+h*.16),
               (x+w*.35,y+h*.16),(x+w*.35,y),(x+w*.77,y),(x+w*.77,y+h*.31),(x+w,y+h*.31),(x+w,base)]
        d.polygon(shell,fill=tone,outline=INK,width=2)
        for j in (0.38,.49,.6,.71,.82,.93):
            d.rectangle((x+5,y+h*j,x+w-6,y+h*j+4),fill=light)
        for xx in (.22,.44,.72):
            d.rectangle((x+w*xx,y+h*.33-10,x+w*xx+10,y+h*.33),fill='#437d65')
    else:
        box(d,(x,y,x+w,base+30),tone,INK,round(w*.32),2)
        for j in range(12):
            yy=y+25+j*(h-30)/12
            d.arc((x+6,yy-10,x+w-6,yy+13),0,180,fill=light,width=2)
        path(d,[(x+w*.52,y),(x+w*.52,y-24)],light,2)
        disk(d,x+w*.52,y-24,2.3,GOLD)

@lru_cache(None)
def skyline(i):
    image=background(i).copy()
    d=ImageDraw.Draw(image)
    warm=i in (13,15,16,17,18,19)
    sun=(390,325) if i in (2,18) else (109,338)
    for r,col in ((103,'#c49288' if warm else '#658c9e'),(79,'#ffc595' if warm else '#a4ccd0')):
        disk(d,*sun,r,col)
    rng=random.Random(i+28)
    for x in range(-22,550,37):
        h=rng.randrange(82,235)
        d.rectangle((x,709-h,x+rng.randrange(20,44),735),fill='#506781')
    layouts={
        2:[(-41,122,364,1),(80,94,265,2),(184,103,439,0),(294,126,311,1),(435,95,388,2)],
        4:[(-31,117,312,0),(91,111,242,2),(210,117,350,1),(351,84,247,0),(452,88,308,1)],
        6:[(-118,178,509,2),(37,191,578,0),(213,173,453,1),(397,172,545,0)],
        13:[(-34,159,251,2),(320,120,410,1),(446,111,355,0)],
        18:[(-18,97,316,1),(92,106,412,0),(202,81,287,2),(302,122,356,1),(432,110,272,2)],
    }
    for n,(x,w,h,k) in enumerate(layouts.get(i,[(-15,119,307,2),(123,93,231,1),(280,115,309,0),(412,130,249,1)])):
        col=['#395773','#375b66','#4c617e','#3e555f','#425970'][n]
        tower(d,x,728,w,h,k,col,'#a6b5ab' if warm else '#7297a7')
    return image

def transit(d,x,y,s,kind,t,m=-1):
    """Draw each moving vehicle using its own silhouette and running gear."""
    def pt(a,b):
        return (x+a*s*m,y+b*s)
    def poly(coords,color):
        d.polygon([pt(a,b) for a,b in coords],fill=color,outline=INK,width=max(1,round(2*s)))
    if kind=='drone':
        body=[(-32,-2),(-23,-8),(16,-8),(28,-3),(21,6),(-23,6)]
        poly(body,'#d0dbe5')
        for px in (-27,26):
            q,r=pt(px,-7)
            path(d,[(q-13*s,r),(q+13*s,r)],CYAN,2*s)
        disk(d,*pt(15,1),2*s,ROSE)
        return
    modes={
        'compact':([(-50,0),(-48,-14),(-31,-18),(-14,-34),(14,-34),(29,-19),(44,-15),(50,-4),(47,4),(-45,4)],(-28,30),'#59b6ab'),
        'van':([(-59,3),(-59,-42),(-3,-42),(14,-35),(32,-34),(55,-13),(55,4)],(-37,35),'#df946b'),
        'rail':([(-115,0),(-115,-35),(80,-35),(102,-28),(115,-14),(115,0)],(), '#e6ddc8'),
    }
    shell,wheels,color=modes[kind]
    poly(shell,color)
    if kind=='rail':
        for j in range(-100,90,31):
            poly([(j,-28),(j+24,-28),(j+25,-13),(j,-13)],'#33556b')
        path(d,[pt(-111,-5),pt(112,-5)],CYAN,2*s)
    else:
        poly([(-8,-29),(12,-29),(26,-17),(-15,-17)],'#2a4560')
        path(d,[pt(32,-11),pt(47,-9)],GOLD,2*s)
        for wx in wheels:
            a,b=pt(wx,3)
            disk(d,a,b,10*s,INK)
            disk(d,a,b,5*s,'#8b9ca8')
            path(d,[(a,b),(a+cos(t*12)*4*s,b+sin(t*12)*4*s)],PAPER,s)

def phone(d,x,y,s,t,powered=True):
    box(d,(x-18*s,y-30*s,x+18*s,y+30*s),'#281e32',INK,5,2)
    box(d,(x-14*s,y-24*s,x+14*s,y+21*s),'#34586a' if powered else '#202938',radius=3)
    if powered:
        for a,b,c in [(-10,-18,CYAN),(0,-18,GOLD),(-10,-7,ROSE),(0,-7,'#a0aff7')]:
            box(d,(x+a*s,y+b*s,x+(a+7)*s,y+(b+7)*s),c,radius=2)
        sweep=y+(-23+(t*24)%42)*s
        path(d,[(x-12*s,sweep),(x+12*s,sweep)],'#9fedd7',s)
    disk(d,x,y+25*s,2*s,'#b8bacc')

def manipulator(d,x,y,t,pickup,drop,phase=0):
    u=(t/2.8+phase)%1
    move=ease(u,.22,.73)
    base=(x,y)
    fingers=lerp(pickup,drop,move)
    fingers=(fingers[0],fingers[1]-sin(move*pi)*44)
    elbow=(x+(fingers[0]-x)*.51,y-93-18*sin(move*pi))
    path(d,[base,elbow,fingers],INK,16)
    path(d,[base,elbow,fingers],'#dbad62',10)
    for xx,yy in (base,elbow):
        disk(d,xx,yy,12,'#3e6274',INK,3)
        disk(d,xx,yy,4,CYAN)
    fx,fy=fingers
    spread=11-5*ease(u,.06,.23)+5*ease(u,.72,.88)
    path(d,[(fx-spread,fy+7),fingers,(fx+spread,fy+7)],PAPER,3)
    if .13<u<.83:
        box(d,(fx-8,fy+6,fx+8,fy+17),'#8fc4bd',INK,3)

def room(d,ground=735):
    d.polygon([(0,305),(290,230),(540,294),(540,ground),(0,ground)],fill='#253951')
    for x in range(-80,590,108):
        path(d,[(x,298),(x+38,ground)],'#344a65',2)
    path(d,[(0,332),(288,258),(540,319)],'#577f92',6)
    path(d,[(20,338),(289,271),(519,326)],CYAN,2)
    floor(d,ground)

def trees(d,x,y,s,color='#568477'):
    path(d,[(x,y),(x+5*s,y-64*s)],'#645164',6*s)
    for a,b,r in ((-14,-54,23),(11,-55,25),(1,-80,22)):
        disk(d,x+a*s,y+b*s,r*s,color,INK,1.5*s)

def book(d,x,y,t):
    box(d,(x-110,y-49,x+110,y+57),'#735469',INK,8,3)
    for a in (-1,1):
        d.polygon([(x,y-47),(x+a*103,y-57),(x+a*103,y+39),(x,y+47)],
                  fill='#f6ddbd',outline='#946e75',width=2)
        for j in range(5):
            path(d,[(x+a*14,y-25+j*11),(x+a*82,y-31+j*11)],'#b38985',1)
    phase=ease(t,.35,2.7)
    x1=x+105*cos(phase*pi)
    yd=sin(phase*pi)*44
    d.polygon([(x,y-47),(x1,y-57-yd),(x1,y+42-yd),(x,y+47)],fill='#fff1ce',outline='#9f7778',width=2)

def scene(i,t,thumbnail=False):
    exterior=(2,4,6,13,18,19)
    image=(skyline(18 if thumbnail else i) if i in exterior or thumbnail else background(i)).copy()
    d=ImageDraw.Draw(image)
    p=ease(t,0,3)
    if thumbnail:
        d.rectangle((0,758,W,H),fill='#25293d')
        path(d,[(0,761),(W,761)],'#d5a780',7)
        rig(d,132,728,1.9,hands=(((-14,-12),(-24,4)),((18,-21),(36,-31))),turn=1)
        for x,y,s in [(440,518,.82),(287,555,.48)]:
            transit(d,x,y,s,'drone',t)
        tx(d,44,136,'2026',22,GOLD,'lm',2,True)
        tx(d,496,136,'2126',22,CYAN,'rm',2,True)
        path(d,[(111,136),(430,136)],PAPER,2)
        tx(d,270,209,'100 YEARS',66,PAPER,outline=5)
        tx(d,270,285,'LATER',86,CYAN,outline=5)
        return image
    if i==0:
        room(d,729)
        panel(d,308,366,181,94,'SLEEP POD','2126')
        path(d,[(322,445),(322+145*ease(t,.3,1.6),445)],CYAN,3)
        box(d,(36,638,473,753),'#47647b',INK,19,4)
        box(d,(37,685,473,746),'#263d55',INK,12,4)
        box(d,(259,629,406,654),'#adbec8',INK,8,3)
        sit=ease(t,.38,1.64)
        layer=Image.new('RGBA',image.size)
        ld=ImageDraw.Draw(layer)
        hx,hy=266,666
        seated(ld,hx,hy,1.54,t,sin(t*4)*ease(t,1.5,2.3),gesture=ease(t,1.75,2.35))
        layer=layer.rotate(86*(1-sit),center=(hx,hy),resample=Image.Resampling.BICUBIC)
        image.paste(layer,(0,0),layer)
        path(d,[(55,721),(454,721)],'#6ba9aa',3)
    elif i==1:
        room(d,731)
        box(d,(36,696,226,766),'#416078',INK,14,4)
        x,y=119,703
        look=sin(t*3-1.2)
        target=(235+30*p,574-63*ease(t,.3,1.6))
        seated(d,x,y,1.68,t,look,gesture=ease(t,.4,1.3))
        for k,(px,py,w,label,value) in enumerate([(251,354,210,'DATE','2126'),(294,474,169,'VITALS','STABLE')]):
            pop=ease(t,k*.6+.43,k*.6+.88)
            if pop>.09:
                panel(d,px,py+22*(1-pop),w,82,label,value)
                yy=py+47+((t-k*.4)*55)%28
                path(d,[(px+12,yy),(px+w-12,yy)],'#385f72',2)
        disk(d,*target,4+3*abs(sin(t*5)),CYAN)
    elif i==2:
        transit(d,-75+t*193,553+sin(t*2)*11,.56,'drone',t)
        transit(d,577-t*180,689,.56,'rail',t,1)
        path(d,[(0,693),(W,693)],'#638ba1',7)
        open_=ease(t,.43,1.65)
        edge=205-194*open_
        for left,right in [(0,edge),(W-edge,W)]:
            d.rectangle((left,0,right,748),fill='#192337')
            path(d,[(right if left==0 else left,0),(right if left==0 else left,748)],'#5f91a1',5)
        d.rectangle((0,726,W,744),fill='#425c73')
        floor(d,750)
        x,y=255-112*open_,724
        position(d,x,y,1.82,(edge+20,652),lean=-6*open_,tilt=-8+20*open_,turn=1)
    elif i==3:
        d.polygon([(0,299),(540,180),(540,737),(0,776)],fill='#396072')
        for xx in range(-70,650,95):
            path(d,[(xx,250),(xx+106,755)],'#5b8291',3)
        floor(d,751)
        walker(d,490-t*46,727,.9,t,accent=ROSE,direction=-1)
        walker(d,272+t*53,696,.67,t+.6,accent=CYAN)
        lift=ease(t,.21,1.23)
        hand=(169+67*lift,728-117*lift+4*sin(t*5)*lift)
        hand=position(d,153,727,2.1,hand,lean=8,tilt=8+10*lift,turn=1)
        if lift>.09:
            phone(d,hand[0]+4,hand[1]-27,1.18,t,lift>.64)
        panel(d,333,383,158,74,'DEVICE AGE','100 YRS',GOLD)
    elif i==4:
        for k,(y,col) in enumerate([(570,'#3f526d'),(659,'#354e61'),(783,'#222f44')]):
            d.polygon([(0,y-16),(540,y-70),(540,y-22),(0,y+46)],fill=col,outline=INK,width=3)
            for x in range(0,W,92):
                path(d,[(x,y+7-x*.1),(x+35,y+4-x*.1)],'#91aab0',2)
        for kind,s,start,speed,y in [('rail',.79,-150,246,584),('van',.91,670,-241,676),
                                     ('compact',1.26,-89,265,801),('compact',.95,-382,242,796)]:
            x=start+t*speed
            transit(d,x,y-x*.1,s,kind,t,1 if speed<0 else -1)
    elif i==5:
        d.polygon([(0,570),(252,271),(540,398),(540,741),(0,741)],fill='#305865')
        for x in range(-60,600,75):
            path(d,[(x,565),(293+(x-293)*.25,320)],'#538595',2)
        floor(d,747)
        panel(d,142,342,257,98,'TRANSIT CONCIERGE','ROUTE READY',CYAN)
        box(d,(316,528,443,729),'#a9bac4',INK,18,4)
        box(d,(306,492,453,573),'#d5dfda',INK,21,4)
        box(d,(325,512,435,550),'#274357',INK,10,2)
        eye=352+42*ease(t,.5,1.2)
        disk(d,eye,531,8,CYAN)
        qr=ease(t,.67,1.5)
        arm=(301-68*qr,634-61*qr)
        path(d,[(329,601),(299,624),arm],INK,12)
        path(d,[(329,601),(299,624),arm],'#c4d2cd',7)
        card=(arm[0]-5,arm[1]-10)
        if t<=2.05:
            box(d,(card[0]-10,card[1]-7,card[0]+11,card[1]+7),CYAN,INK,3)
        reach=ease(t,1,1.85)
        leave=ease(t,2.05,2.91)
        hand=lerp((179,682),(card[0]-6,card[1]+6),reach)
        hand=lerp(hand,(167,630),leave)
        wrist=position(d,160+24*reach-32*leave,683-40*reach+42*leave,1.67,hand,
                       lean=3+7*reach-12*leave,tilt=10-15*leave,turn=1)
        if leave>0:
            box(d,(wrist[0]-8,wrist[1]-15,wrist[0]+11,wrist[1]-3),CYAN,INK,3)
    elif i==6:
        d.polygon([(0,758),(W,638),(W,672),(0,801)],fill='#35495e',outline=INK,width=3)
        path(d,[(0,771),(W,644)],CYAN,4)
        xx=-145+t*280
        transit(d,xx,764-xx*.229,.92,'rail',t)
        for k in range(3):
            x=(t*(112+k*25)+k*204+45)%670-61
            y=320+k*71+18*sin(t*2+k)
            transit(d,x,y,.44+k*.13,'drone',t)
        x=246
        y=620-230*ease(t,.2,2.65)
        box(d,(x,y,x+28,y+44),'#d9e3db',INK,5)
        path(d,[(x+6,y+13),(x+21,y+13)],CYAN,3)
    elif i==7:
        d.rectangle((0,338,W,728),fill='#3b405b')
        for x in range(24,540,87):
            d.rectangle((x,344,x+51,541),fill='#5b687f')
            path(d,[(x,344),(x,568)],'#858da1',3)
        floor(d,739,'#252a40','#485672')
        box(d,(22,695,517,756),'#394c60',INK,12,4)
        for k in range(7):
            x=(t*105+k*82)%514+15
            disk(d,x,731,9,'#778a94',INK,2)
            box(d,(x-11,683,x+10,699),'#9ebcb1',INK,3)
        manipulator(d,161,712,t,(87,684),(212,679))
        manipulator(d,394,709,t,(445,682),(302,674),.44)
        walker(d,-42+t*186,811,1.07,t,accent=CYAN)
    elif i==8:
        d.polygon([(100,761),(203,303),(352,303),(451,761)],fill='#50415f')
        d.polygon([(214,733),(274,366),(326,733)],fill='#695571')
        floor(d,743,'#2c273d','#514663')
        slump=ease(t,.38,1.42)
        fingers=lerp((325,620),(320,710),slump)
        fingers=position(d,251,708+32*slump,2.48,fingers,lean=12*slump,tilt=17*slump,turn=-slump)
        box(d,(fingers[0]-11,fingers[1]-6,fingers[0]+12,fingers[1]+8),'#b3aa9e',INK,2)
        for k in range(4):
            xx=69+k*142
            yy=402+15*sin(t*4+k)
            path(d,[(xx,yy),(xx,yy+39)],'#807789',2)
    elif i==9:
        d.polygon([(0,564),(W,481),(W,798),(0,826)],fill='#71576a',outline=INK,width=3)
        lift=ease(t,.22,1.31)
        x=219+12*lift
        y=549-111*lift+4*sin(4*t)*lift
        hand=position(d,141,715,2.17,(x+8,y+187),lean=4+7*lift,tilt=11,turn=1)
        x,y=hand[0]-8,hand[1]-187
        box(d,(x,y,x+249,y+208),'#f5d9b5',INK,8,3)
        box(d,(x+9,y+9,x+239,y+174),'#b48186',radius=4)
        disk(d,x+193,y+40,25,GOLD)
        for k,c in enumerate((CYAN,ROSE,GOLD)):
            rig(d,x+56+k*69,y+130,.74,accent=c,
                hands=(((-13,-23),(-20,-43)),((14,-16),(25,-36))))
        tx(d,x+124,y+191,'SUMMER 2026',16,INK,mono=True)
    elif i==10:
        d.polygon([(0,548),(W,513),(W,H),(0,H)],fill='#65516a')
        box(d,(73,398,467,726),'#302c44',INK,25,4)
        flip=min(14.999,t*5.2)
        phase=flip%1
        year=2026+min(100,round(flip/14.8*100))
        box(d,(83,412,457,700),'#f2d5b2',INK,17,3)
        tx(d,271,465,'ELAPSED TIME',20,INK,mono=True)
        tx(d,271,555,str(year),96,INK,mono=True)
        tx(d,271,654,f'+{year-2026:03} YEARS',19,'#63506a',mono=True)
        if phase<.37 and t<2.82:
            y=410+280*sin(phase/.37*pi)
            d.polygon([(85,410),(451,410),(449,y),(92,y+16)],fill='#d0a68e',outline=INK)
        for x in (116,421):
            d.arc((x-14,379,x+14,437),183,356,fill=GOLD,width=8)
    elif i==11:
        floor(d,710,'#293347','#466478')
        for k in range(7):
            f=1.22-k*.15
            x=270-254*f
            y=518-195*f
            bw=508*f
            hh=223*f
            d.arc((x,y,x+bw,y+hh),179,360,fill='#577185',width=max(1,round(8*f)))
            path(d,[(x,y+hh*.5),(x,708)],'#506579',max(1,round(5*f)))
            path(d,[(x+bw,y+hh*.5),(x+bw,708)],'#506579',max(1,round(5*f)))
        walker(d,132+112*p,790-15*p,1.53,t)
        for k in range(3):
            walker(d,309+k*32-t*(13+k*6),696+k*7,.42,t+k*.4,accent=FADED,direction=-1)
        path(d,[(30,750),(190,750)],'#67808b',2)
    elif i==12:
        floor(d,741,'#263447','#51657b')
        box(d,(297,388,503,775),'#344c63',INK,24,4)
        pay=ease(t,.28,.94)
        back=ease(t,1.53,2.1)
        flash=t>1.03
        panel(d,314,419,173,118,'PAYMENT','DECLINED' if flash else 'SCAN CARD',ROSE if flash else CYAN)
        hand=(215+110*pay-84*back,674-65*pay+43*back)
        hand=position(d,162+40*pay-31*back,740-24*pay+16*back,2.12,hand,lean=4+7*pay-13*back,tilt=-8+10*pay,turn=1)
        box(d,(hand[0]-8,hand[1]-29,hand[0]+59,hand[1]+8),'#d5ae75',INK,5,3)
        d.rectangle((hand[0]+2,hand[1]-20,hand[0]+15,hand[1]-8),fill='#6e5c64')
        for k in range(3):
            r=13+10*k
            d.arc((381-r,600-r,381+r,600+r),-58,60,fill=ROSE if flash else '#83cab9',width=2)
    elif i==13:
        floor(d,745,'#372f42','#665567')
        d.rectangle((169,559,412,738),fill='#b88679',outline=INK,width=3)
        for y in range(567,734,19):
            path(d,[(171,y),(409,y)],'#936e70')
        d.polygon([(145,560),(287,475),(434,560)],fill='#694a5f',outline=INK,width=4)
        box(d,(281,625,333,739),'#44334c',INK,4,3)
        for x in (202,359):
            d.rectangle((x,589,x+35,632),fill=GOLD,outline=INK,width=3)
            path(d,[(x+17,590),(x+17,631)],'#8b6670',3)
        door=ease(t,.86,1.64)
        if door:
            d.polygon([(282,626),(282+49*door,634),(282+49*door,734),(282,738)],
                      fill='#ac775f',outline=INK,width=2)
            walker(d,310+58*door,748,.66,t,accent=ROSE)
        walker(d,78+35*p,808,1.33,t)
        tree_shift=3*sin(t*2)
        trees(d,471+tree_shift,751,1.15,'#697671')
    elif i==14:
        d.polygon([(0,372),(259,257),(540,357),(540,724),(0,724)],fill='#314964')
        floor(d,721)
        panel(d,160,294,220,89,'HISTORY COLLECTION','2026')
        for k,(x,word) in enumerate([(30,'PHONE'),(193,'VEHICLE'),(356,'COMPUTER')]):
            box(d,(x,458,x+151,722),'#26374e','#75a8aa',12,3)
            y=571+11*sin(t*3+k*1.3)
            if k==0:
                phone(d,x+77,y,1.27,t)
            elif k==1:
                transit(d,x+75+12*sin(t*2),y+12,.9,'compact',t)
            else:
                box(d,(x+33,y-42,x+117,y+23),'#b4a0ab',INK,7,2)
                box(d,(x+40,y-34,x+109,y+13),'#395974',radius=4)
                path(d,[(x+45,y-21+(t*25)%27),(x+104,y-21+(t*25)%27)],CYAN,2)
            tx(d,x+75,675,word,13,PAPER,mono=True)
        walker(d,115+t*104,812,.86,t)
    elif i==15:
        d.polygon([(0,420),(540,378),(540,748),(0,748)],fill='#a47578')
        d.rectangle((249,482,516,716),fill='#754f65',outline=INK,width=3)
        for k in range(9):
            d.rectangle((247+k*30,482,260+k*30,510),fill=GOLD if k%2 else '#df8f85')
        floor(d,733,'#654e60','#926871')
        trees(d,59,741,1.3)
        box(d,(164,683,397,715),'#b28077',INK,8,3)
        path(d,[(180,712),(176,780)],INK,5)
        path(d,[(377,710),(386,782)],INK,5)
        for x,look,c in [(147,1,CYAN),(399,-1,ROSE)]:
            wave=.5+.5*sin(t*6+x/47)
            seated(d,x,733,1.6,t,look,gesture=wave,accent=c)
        walker(d,-42+t*102,778,.85,t,accent=FADED)
        tx(d,310,556,'CAFÉ',25,PAPER,mono=True)
    elif i==16:
        d.polygon([(0,421),(415,365),(540,445),(540,749),(0,749)],fill='#997481')
        for x in range(27,540,105):
            box(d,(x,465,x+71,690),'#5d576e','#c99f9a',12,2)
        floor(d,731,'#634e60','#896674')
        drop=ease(t,0,.52)
        lift=ease(t,1.28,2.52)
        yy=682+79*drop-97*lift
        xx=287-26*drop+62*lift
        bend=ease(t,.38,1.22)-ease(t,1.43,2.65)
        legs=(((20*bend,19),(4,44-17*bend)),((-17*bend,21),(-21,44-17*bend)))
        for base,direction,c in [(170,1,GOLD),(367,-1,ROSE)]:
            x=base+direction*27*bend+42*lift
            hy=717+42*bend
            reach=ease(t,.42,1.24)
            target=lerp((x+direction*24,hy-24),(xx-direction*12,yy-15),reach)
            hw=(target[0]-x)/1.7,(target[1]-hy)/1.7
            lean=direction*(5+18*bend)
            arm=arm_to((lean*.86,-30),hw,direction)
            rig(d,x,hy,1.7,legs=legs,hands=(((-13,-14),(-18,7)),arm),
                lean=lean,tilt=direction*7,turn=direction,accent=c)
        box(d,(xx-29,yy-11,xx+29,yy+26),'#d4b08b',INK,6,3)
        d.arc((xx-15,yy-23,xx+15,yy+4),180,360,fill=INK,width=3)
        disk(d,xx+17,yy-9,6,'#d88c7a')
    elif i==17:
        d.polygon([(0,538),(270,507),(540,551),(540,760),(0,760)],fill='#78977d')
        floor(d,730,'#686c68','#8e9581')
        for x,s in ((36,1.6),(174,.88),(396,1.05),(511,1.48)):
            trees(d,x,746,s)
        box(d,(182,703,418,726),'#6d655f',INK,6,3)
        path(d,[(201,726),(191,761)],INK,5)
        path(d,[(396,726),(407,761)],INK,5)
        book(d,303,655,t)
        walker(d,445-70*t,783,1.22,t,accent=CYAN,direction=-1)
        walker(d,489-69*t,788,.73,t+.6,accent=ROSE,direction=-1)
        arm=(125+18*sin(t*4),707-34*ease(t,1.2,2.2))
        position(d,88,753,1.28,arm,lean=7,tilt=10,turn=1)
    elif i==18:
        path(d,[(0,728),(540,645)],'#566879',12)
        path(d,[(0,722),(540,639)],'#adaba4',4)
        x=-136+250*t
        transit(d,x,723-x*.155,.86,'rail',t)
        transit(d,572-t*209,475-18*sin(t*2),.64,'drone',t,1)
        d.polygon([(0,749),(540,790),(540,960),(0,960)],fill='#292d42')
        path(d,[(0,754),(540,793)],'#e0ad86',6)
        for xx in (54,192,331,469):
            path(d,[(xx,752+xx*.078),(xx,813+xx*.078)],'#a8877e',4)
        move=ease(t,.08,1.12)
        position(d,114+28*move,739,1.57,(163+38*move,643-35*ease(t,1.2,2.4)),
                 lean=4+8*move,tilt=13,turn=1)
    else:
        d.polygon([(0,704),(W,665),(W,H),(0,H)],fill='#29374b')
        path(d,[(0,713),(W,674)],'#77a2a8',4)
        wave=ease(t,.22,1.13)*(1-ease(t,2.64,2.96))
        hand=(301+40*wave+18*sin(10*t)*wave,690-120*wave)
        position(d,256,735,2.63,hand,lean=5*sin(t*2),tilt=11*sin(t*2.3),turn=sin(t*2))
        transit(d,575-t*191,438+12*sin(t*3),.54,'drone',t,1)

    if i in LABELS:
        a,b=LABELS[i]
        yy=169+round(13*(1-ease(t,0,.36)))
        tx(d,270,yy,a,39,PAPER,outline=4)
        size=51
        while d.textlength(b,font=font(size))>465:
            size-=1
        tx(d,270,yy+57,b,size,ROSE if i==8 else CYAN,outline=4)
    return image

def frame(i,t,captions):
    image=scene(i,t)
    if CAMERA and i in (2,6,11,18):
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
    parser.add_argument('--output', default='out')
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
