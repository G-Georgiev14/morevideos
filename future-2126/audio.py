"""Generate narration, subtitle cues, and original audio stems."""
from pathlib import Path
import asyncio
import json
import os
import subprocess
import wave
import numpy as np

# Entries are aligned to picture edits, in seconds.
CUES = [
 (0,3,'What if you woke up 100 years in the future?'),
 (3,8.4,'You open your eyes, and the world looks completely different.'),
 (9,11.8,'Your phone? Ancient history.'),
 (12,17.8,'Cars might drive themselves, and artificial intelligence could be everywhere.'),
 (18,23.8,'Cities might have buildings hundreds of floors tall, while robots handle jobs we do today.'),
 (24,26.8,"But here's the terrifying part."),
 (27,32.3,'Everyone you knew would be 100 years older…'),
 (33,35.5,'or no longer around.'),
 (36,38.8,'Your money might be worthless.'),
 (39,41.8,'Your home could belong to someone else.'),
 (42,44.9,'And the world you remember would exist only in history books.'),
 (45,47.1,'But not everything would be unfamiliar.'),
 (47.2,51,'People would still laugh, argue, fall in love, and make friends.'),
 (51.1,53.8,'Technology might change everything.'),
 (54,54.9,'But humans?'),
 (55,57,'Maybe not as much as you’d think.'),
 (57.2,59.9,'Would you want to wake up in 2126?'),
]
RATE = 48000
ASSETS = Path('assets')
ASSETS.mkdir(exist_ok=True)
RAW = Path('voice')
RAW.mkdir(exist_ok=True)

async def neural():
    import edge_tts
    async def make(i, line):
        speech = line.replace('100','one hundred').replace('2126','twenty-one twenty-six')
        await edge_tts.Communicate(speech, 'en-US-GuyNeural').save(str(RAW / f'{i}.mp3'))
    for start in range(0,len(CUES),4):
        await asyncio.gather(*(make(i,line) for i,(_,_,line) in enumerate(CUES) if start<=i<start+4))

def ff(*args, capture=False):
    return subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*args],check=True,stdout=subprocess.PIPE if capture else None).stdout

def stamp(t):
    m,s = divmod(round(t*1000),60000)
    return f'00:{m:02}:{s//1000:02},{s%1000:03}'

def wav(name, samples):
    with wave.open(str(ASSETS/name),'wb') as stream:
        stream.setparams((1,2,RATE,0,'NONE',''))
        stream.writeframes(np.int16(np.clip(samples,-1,1)*32767).tobytes())

def main():
    model = os.getenv('PIPER_MODEL')
    if model:
        from piper import PiperVoice
        speaker = PiperVoice.load(model)
        for i, (_, _, line) in enumerate(CUES):
            speech = line.replace('100','one hundred').replace('2126','twenty-one twenty-six')
            with wave.open(str(RAW / f'{i}-piper.wav'),'wb') as stream:
                speaker.synthesize_wav(speech,stream)
    try:
        if not model:
            asyncio.run(asyncio.wait_for(neural(),25))
        backend = 'Piper Lessac' if model else 'Microsoft Guy Neural'
    except Exception as error:
        print('Neural voice unavailable:', error)
        backend = 'FFmpeg Flite RMS'
    voice = np.zeros(60*RATE)
    captions = []
    for i,(start,end,line) in enumerate(CUES):
        p = RAW / (f'{i}-piper.wav' if model else f'{i}.mp3')
        if backend == 'FFmpeg Flite RMS' or not p.exists():
            script = RAW/f'{i}.txt'
            script.write_text(line.replace('100','one hundred').replace('2126','twenty one twenty six').replace('’',"'"))
            p = RAW/f'{i}.wav'
            ff('-f','lavfi','-i',f'flite=textfile={script}:voice=rms',str(p))
        samples = np.frombuffer(ff('-i',str(p),'-af','silenceremove=start_periods=1:start_duration=0.01:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-42dB,areverse','-ar',str(RATE),'-ac','1','-f','f32le','-',capture=True),dtype='<f4')
        trimmed = RAW/f'{i}-trim.wav'
        with wave.open(str(trimmed),'wb') as stream:
            stream.setparams((1,2,RATE,0,'NONE',''))
            stream.writeframes(np.int16(np.clip(samples,-1,1)*32767).tobytes())
        speed = max(.91,len(samples)/RATE/(end-start-.10))
        samples = np.frombuffer(ff('-i',str(trimmed),'-af',f'atempo={speed:.5f},highpass=f=75,acompressor=threshold=0.12:ratio=2.5','-f','f32le','-',capture=True),dtype='<f4').copy()
        samples = samples[:int((end-start-.035)*RATE)]
        samples *= .72 / max(.1,np.max(np.abs(samples)))
        samples[:240] *= np.linspace(0,1,240)
        samples[-480:] *= np.linspace(1,0,480)
        pos = round(start*RATE)
        voice[pos:pos+len(samples)] = samples
        words=line.split()
        groups=[words[j:j+4] for j in range(0,len(words),4)]
        weights=[sum(len(w)+2 for w in group) for group in groups]
        edges=np.r_[0,np.cumsum(weights)]/sum(weights)*len(samples)/RATE+start
        captions.extend((float(a),float(b),' '.join(g)) for a,b,g in zip(edges[:-1],edges[1:],groups))
    (ASSETS/'captions.json').write_text(json.dumps(captions,indent=2))
    (ASSETS/'subtitles.srt').write_text('\n\n'.join(f'{i}\n{stamp(a)} --> {stamp(b)}\n{c}' for i,(a,b,c) in enumerate(captions,1))+'\n')
    (ASSETS/'voice.txt').write_text(backend+'\n'+'\n'.join(line for _,_,line in CUES)+'\n')
    t = np.arange(len(voice))/RATE
    music = np.zeros_like(t)
    for i, chord in enumerate([(55,82.41,130.81),(49,73.42,116.54),(43.65,65.41,103.83),(55,65.41,130.81),(36.71,55,87.31),(43.65,65.41,98),(49,73.42,110),(55,82.41,138.59),(65.41,98,164.81),(55,82.41,146.83)]):
        env = np.maximum(0,1-np.abs(t-(i*6+3))/4)**.75
        for k,f in enumerate(chord):
            carrier = np.sin(2*np.pi*f*t+.22*np.sin(2*np.pi*.19*t+k))
            music += env*(carrier+.17*np.sin(4*np.pi*f*t))*(.049 if k==0 else .031)
    for beat in np.arange(.25,24,.75):
        q = t-beat
        hit = (q>=0)&(q<.35)
        music[hit] += .10*np.sin(2*np.pi*(67*q[hit]-42*q[hit]**2))*np.exp(-14*q[hit])
    sfx = np.zeros_like(t)
    rng = np.random.default_rng(2126)
    for i in range(20):
        start = int((i*3+.12)*RATE)
        if i in (0,1,3,5,10,12,14,19):
            q = np.arange(int(.23*RATE))/RATE
            hit = .13*np.sin(2*np.pi*((460 if i==12 else 710)*q+390*q*q))*np.sin(np.pi*q/.23)**2
        else:
            q = np.arange(int(.58*RATE))/RATE
            noise = np.interp(q,np.arange(600)/1000,rng.uniform(-1,1,600))
            hit = (.05*noise+.10*np.sin(2*np.pi*(100*q-56*q*q)))*np.sin(np.pi*q/.58)**2
        sfx[start:start+len(hit)] += hit
    fade = np.minimum(1,np.minimum(t/.2,(60-t)/.25))
    music *= fade
    wav('narration.wav',voice)
    wav('music.wav',music)
    wav('effects.wav',sfx)
    wav('mix.wav',np.tanh(1.15*(voice+.58*music+.68*sfx)))
    print(backend, len(captions), 'subtitle cues')

if __name__ == '__main__':
    main()
