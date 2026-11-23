"""Composite the illustrated 20-shot edit and encode the final Short."""
import argparse
from functools import lru_cache
import json
from math import exp, pi, sin
from pathlib import Path
import random
import subprocess

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT, FPS = 720, 1280, 30
ASSETS = Path('assets')
CYAN, IVORY, AMBER = '#8bf4e7', '#fcf2e1', '#ffd195'
FONT_PATH = Path('/usr/share/fonts/truetype/dejavu')

# Starting and ending scale plus horizontal and vertical travel (canvas fractions).
CAMERA = [
    (1.18,1.04,.06,-.04), (1.04,1.09,-.04,.04), (1.14,1.00,.05,.06),
    (1.08,1.18,-.04,.025), (1.06,1.14,.08,.012), (1.09,1.03,-.045,0),
    (1.15,1.04,-.02,-.105), (1.04,1.12,.078,.014), (1.04,1.16,.025,-.015),
    (1.08,1.19,-.03,.02), (1.03,1.05,0,0), (1.11,1.01,-.02,.04),
    (1.06,1.14,.022,.015), (1.12,1.05,-.056,.035), (1.04,1.115,.065,-.015),
    (1.1,1.01,.024,.025), (1.02,1.09,-.051,.026), (1.045,1.1,.055,.018),
    (1.18,1.015,-.044,.091), (1.04,1.13,0,-.015),
]

# (subject x, subject y, horizontal drift, vertical drift, radius, cycles)
# Short local motions sell breath, a weight shift, camera parallax, or a passing object.
MOTION = {
    0: (.42,.57,3,9,.23,.58), 1: (.49,.56,-10,7,.24,.48),
    2: (.22,.65,-13,3,.32,.60), 3: (.51,.59,11,-16,.22,.42),
    4: (.49,.66,25,5,.26,.32), 5: (.42,.61,-9,11,.24,.64),
    6: (.75,.45,-9,2,.26,.54), 7: (.38,.47,12,-10,.27,.71),
    8: (.35,.46,4,8,.27,.58), 9: (.57,.54,8,10,.29,.46),
    11: (.48,.64,-7,9,.24,.77), 12: (.31,.61,15,-6,.21,.52),
    13: (.25,.66,-12,3,.31,.52), 14: (.56,.43,6,-4,.34,.51),
    15: (.43,.53,7,9,.29,.82), 16: (.51,.62,8,-11,.29,.65),
    17: (.21,.65,-10,5,.27,.63), 18: (.27,.71,9,2,.36,.49),
    19: (.52,.52,3,-5,.23,.52),
}

TITLE = {
    0: ('100 YEARS LATER', '2126'),
    3: ('YOUR PHONE', 'IS ANCIENT'),
    8: ('BUT HERE’S THE', 'TERRIFYING PART…'),
    18: ('TECHNOLOGY', 'CHANGES EVERYTHING…'),
    19: ('WOULD YOU WAKE', 'UP IN 2126?'),
}

@lru_cache
def font(points, mono=False):
    filename = 'DejaVuSansMono-Bold.ttf' if mono else 'DejaVuSans-Bold.ttf'
    return ImageFont.truetype(str(FONT_PATH / filename), points)

def text(draw, position, value, size, color=IVORY, anchor='mm', stroke=0, mono=False):
    draw.text(position,value,font=font(size,mono),fill=color,anchor=anchor,
              stroke_width=stroke,stroke_fill='#101521')

def art(i):
    with Image.open(ASSETS / 'shots' / f'{i+1:02d}.jpg') as image:
        return image.convert('RGB')

@lru_cache
def image(i):
    return art(i).resize((WIDTH,HEIGHT),Image.Resampling.LANCZOS)

@lru_cache
def shade():
    mask = Image.new('RGBA',(1,HEIGHT))
    mask.putdata([
        (8,14,24,round(100*max(0,1-y/335)**2 + 174*max(0,(y-825)/455)**1.3))
        for y in range(HEIGHT)
    ])
    return mask.resize((WIDTH,HEIGHT))

def curve(u):
    return u*u*(3-2*u)

def camera(i,u):
    zoom1,zoom2,dx,dy=CAMERA[i]
    ease=curve(u)
    zoom=zoom1+(zoom2-zoom1)*ease
    ww,hh=WIDTH/zoom,HEIGHT/zoom
    x=max(0,min(WIDTH-ww,(WIDTH-ww)/2+(ease-.5)*dx*WIDTH))
    y=max(0,min(HEIGHT-hh,(HEIGHT-hh)/2+(ease-.5)*dy*HEIGHT))
    if i not in MOTION:
        return image(i).transform((WIDTH,HEIGHT),Image.Transform.EXTENT,(x,y,x+ww,y+hh),
                                  resample=Image.Resampling.BICUBIC)

    cx,cy,mx,my,radius,cycles=MOTION[i]
    phase=sin(2*pi*cycles*u)
    xs=[round(k*WIDTH/9) for k in range(10)]
    ys=[round(k*HEIGHT/14) for k in range(15)]
    def source_point(px,py):
        a,b=px/WIDTH,py/HEIGHT
        strength=phase*exp(-((a-cx)**2+(b-cy)**2)/(2*radius**2))
        strength*=min(1,8*a,8*b,8*(1-a),8*(1-b))
        return x+a*ww+mx*strength,y+b*hh+my*strength
    vertices={(px,py):source_point(px,py) for px in xs for py in ys}
    mesh=[]
    for left,right in zip(xs,xs[1:]):
        for top,bottom in zip(ys,ys[1:]):
            corners=((left,top),(left,bottom),(right,bottom),(right,top))
            mesh.append(((left,top,right,bottom),sum((vertices[key] for key in corners),())))
    return image(i).transform((WIDTH,HEIGHT),Image.Transform.MESH,mesh,
                              resample=Image.Resampling.BICUBIC)

@lru_cache
def particles(i):
    rng=random.Random(2126+i)
    return [(rng.random(),rng.random(),rng.uniform(.5,1.7),rng.uniform(.5,1.5))
            for _ in range(40)]

def atmosphere(layer,i,t):
    d=ImageDraw.Draw(layer)
    if i in (1,5,7,14):
        # Soft reflected scan light tracks through diagnostics, machine bays and glass cases.
        x=int((-0.3+t*.54)*WIDTH)
        for j in range(80):
            alpha=round(23*sin(pi*j/80)**2)
            d.line((x+j,0,x+j+218,HEIGHT),fill=(139,244,231,alpha),width=2)
    if i in (8,11,13):
        # Rain streaks pass in front of the damp night exteriors.
        for x,y,r,v in particles(i):
            xx=(x*WIDTH-t*43*v)%WIDTH
            yy=(y*HEIGHT+t*323*v)%HEIGHT
            d.line((xx,yy,xx-4*v,yy+20*v),fill=(160,195,211,round(21*r)),width=1)
    if i in (2,6,18):
        # A handful of distant transit lights follow independent tracks.
        for k in range(4):
            x=((k*.23+t*(.12+k*.011))*WIDTH)%(WIDTH+75)-30
            y=(.36+k*.106)*HEIGHT-x*.09
            d.line((x-14,y+2,x,y),fill=(174,253,244,88),width=2)
            d.ellipse((x,y-2,x+4,y+2),fill=(243,255,247,200))
    if i in (15,16,17,18):
        for x,y,r,v in particles(i)[:22]:
            xx=(x*WIDTH+t*22*v)%WIDTH
            yy=(y*HEIGHT-t*29*v)%HEIGHT
            d.ellipse((xx-r,yy-r,xx+r,yy+r),fill=(255,217,162,round(31*v)))

def titles(layer,i,t):
    d=ImageDraw.Draw(layer)
    if i in TITLE:
        a,b=TITLE[i]
        # Keep title and captions away from the right-hand Shorts controls.
        y=119+round(18*(1-min(1,t*5))**2)
        text(d,(57,y),a,38,IVORY,'lm',2)
        size=64
        while d.textlength(b,font=font(size))>WIDTH-116:
            size-=1
        text(d,(57,y+57),b,size,AMBER if i==8 else CYAN,'lm',3)
        d.line((58,y+100,111+int(min(1,t*2)*61),y+100),fill=CYAN,width=3)
    if i==10:
        value=100*curve(min(t/2.65,1))
        year=2026+round(value)
        x,y=WIDTH//2,HEIGHT//2
        ink='#2e3231'
        text(d,(x,y-76),'ELAPSED TIME',24,ink,mono=True)
        text(d,(x,y+5),str(year),115,ink,mono=True)
        text(d,(x,y+100),f'+{year-2026:03} YEARS',24,ink,mono=True)
        d.line((x-120,y+135,x+120,y+135),fill=(46,50,49,85),width=3)
        d.line((x-120,y+135,x-120+240*value/100,y+135),fill=ink,width=3)
    if i==12 and t>.74:
        text(d,(48,239),'PAYMENT REJECTED',25,'#ffa69c','lm',2,True)
    if i==14:
        text(d,(48,114),'MUSEUM OF DAILY LIFE',23,CYAN,'lm',2,True)
        text(d,(48,157),'2026 COLLECTION',21,IVORY,'lm',2,True)

def caption(layer,cues,at):
    d=ImageDraw.Draw(layer)
    for start,end,value in cues:
        if not start<=at<end:
            continue
        words=value.split()
        emphasized=max(range(len(words)),key=lambda n:len(words[n].strip('?,.…')))
        sizes=[43 if n==emphasized else 37 for n in range(len(words))]
        widths=[d.textlength(word,font=font(s)) for word,s in zip(words,sizes)]
        span=sum(widths)+11*(len(words)-1)
        if span>565:
            sizes=[round(s*565/span) for s in sizes]
            widths=[d.textlength(word,font=font(s)) for word,s in zip(words,sizes)]
        x=330-(sum(widths)+11*(len(words)-1))/2
        y=1111+round(12*(1-min(1,(at-start)*12))**2)
        for n,(word,size,width) in enumerate(zip(words,sizes,widths)):
            text(d,(x,y),word,size,CYAN if n==emphasized else IVORY,'lm',4)
            x+=width+11
        return

def frame(i,t,cues):
    canvas=camera(i,t/3).convert('RGBA')
    fx=Image.new('RGBA',canvas.size)
    atmosphere(fx,i,t)
    canvas.alpha_composite(fx)
    canvas.alpha_composite(shade())
    graphics=Image.new('RGBA',canvas.size)
    titles(graphics,i,t)
    caption(graphics,cues,i*3+t)
    canvas.alpha_composite(graphics)
    return canvas.convert('RGB')

def thumbnail():
    canvas=camera(18,.45).convert('RGBA')
    canvas.alpha_composite(shade())
    d=ImageDraw.Draw(canvas)
    text(d,(65,106),'2026',30,AMBER,'lm',3,True)
    text(d,(650,106),'2126',30,CYAN,'rm',3,True)
    d.line((172,108,534,108),fill=IVORY,width=2)
    text(d,(360,209),'100 YEARS',86,IVORY,stroke=6)
    text(d,(360,313),'LATER',122,CYAN,stroke=7)
    return canvas.convert('RGB').resize((1080,1920),Image.Resampling.LANCZOS)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',default='out')
    parser.add_argument('--stills',action='store_true')
    args=parser.parse_args()
    out=Path(args.output)
    out.mkdir(parents=True,exist_ok=True)
    cues=json.loads((ASSETS/'captions.json').read_text())
    thumbnail().save(out/'thumbnail.png')
    if args.stills:
        for i in range(20):
            frame(i,1.45,cues).save(out/f'{i+1:02d}.jpg',quality=90)
        return
    command=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24',
             '-s',f'{WIDTH}x{HEIGHT}','-r',str(FPS),'-i','-','-i',str(ASSETS/'mix.wav'),
             '-vf','scale=1080:1920:flags=lanczos,format=yuv420p','-c:v','libx264',
             '-threads','6','-preset','fast','-crf','18','-c:a','aac','-b:a','160k',
             '-movflags','+faststart','-t','60',str(out/'what-if-2126.mp4')]
    with subprocess.Popen(command,stdin=subprocess.PIPE) as ffmpeg:
        for i in range(20):
            for n in range(3*FPS):
                ffmpeg.stdin.write(frame(i,n/FPS,cues).tobytes())
            print(f'Rendered shot {i+1:02d}/20',flush=True)
        ffmpeg.stdin.close()
        if ffmpeg.wait():
            raise RuntimeError('FFmpeg failed')

if __name__=='__main__':
    main()
