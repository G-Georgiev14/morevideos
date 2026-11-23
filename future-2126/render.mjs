import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const output=resolve(process.argv[2]??'out');
mkdirSync(output,{recursive:true});
const temp=mkdtempSync(join(tmpdir(),'future-2126-'));
const picture=join(temp,'picture.mp4');
const cli=resolve('node_modules/@remotion/cli/remotion-cli.js');
const browser=process.env.CHROMIUM_BIN??
  (existsSync('/usr/lib/chromium/chromium')?'/usr/lib/chromium/chromium':null);
const flags=['--gl','angle','--enable-multiprocess-on-linux',
  '--chromium-flags={"use-angle":"swiftshader","enable-unsafe-swiftshader":true}',
  ...(browser?['--browser-executable',browser]:[])];
function run(bin,args){
  const result=spawnSync(bin,args,{stdio:'inherit'});
  if(result.error) throw result.error;
  if(result.status!==0) throw new Error(bin+' exited with '+result.status);
}
try{
  run(process.execPath,[cli,'render','src/index.tsx','Future2126',picture,...flags,
    '--scale','.75','--codec','h264','--crf','17','--concurrency','2','--image-format','jpeg','--jpeg-quality','93']);
  run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',picture,'-i','assets/mix.wav',
    '-map','0:v:0','-map','1:a:0','-vf','scale=1080:1920:flags=lanczos','-c:v','libx264','-preset','fast','-crf','17','-c:a','aac','-b:a','160k',
    '-movflags','+faststart','-t','60',join(output,'what-if-2126.mp4')]);
  run(process.execPath,[cli,'still','src/index.tsx','Future2126',join(output,'thumbnail.png'),
    ...flags,'--frame','1661','--props','{"cover":true}']);
}finally{
  rmSync(temp,{recursive:true,force:true});
}
