"""Create the original instrumental and effects with FFmpeg lavfi."""
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "public/audio"
root.mkdir(parents=True, exist_ok=True)

def sound(name, source, filters=None):
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", source]
    if filters is not None:
        cmd.extend(["-af", filters])
    subprocess.run([*cmd, "-ar", "48000", "-b:a", "128k", str(root / f"{name}.mp3")], check=True)

def synth(name, expr, duration, filters=None):
    sound(name, f"aevalsrc=exprs='{expr}':d={duration}:s=48000", filters)

synth("score",
      ".11*sin(2*PI*55*t)+.063*sin(2*PI*82.41*t)+.054*sin(2*PI*110*t)"
      "+.045*(.45+.55*sin(2*PI*.12*t))*sin(2*PI*130.81*t)"
      "+.065*exp(-11*mod(t,0.8))*sin(2*PI*48*t)"
      "+.04*exp(-7*mod(t+0.4,0.8))*sin(2*PI*220*t)",
      60, "afade=t=in:d=1.5,afade=t=out:st=58.2:d=1.8,lowpass=f=900")
sound("whoosh", "anoisesrc=color=pink:seed=41:d=0.49",
      "bandpass=f=870:w=605,afade=t=in:d=0.12,afade=t=out:st=0.17:d=0.32")
sound("wind", "anoisesrc=color=brown:seed=64:d=24",
      "highpass=f=115,lowpass=f=1150,tremolo=f=0.39:d=0.44,afade=t=in:d=2,afade=t=out:st=22:d=2")
synth("vanish", ".53*sin(2*PI*(111*t-69*t*t))*exp(-4.2*t)+.22*sin(2*PI*(499*t-280*t*t))*exp(-9*t)",
      1.15, "afade=t=out:st=0.73:d=0.42")
synth("space", ".27*sin(2*PI*(95*t+38*t*t))*exp(-2.1*t)+.15*sin(2*PI*137*t)*exp(-2.4*t)",
      1.35, "afade=t=in:d=0.07,afade=t=out:st=0.96:d=0.39")
synth("return", ".25*(sin(2*PI*261.63*t)+.6*sin(2*PI*329.63*t)+.6*sin(2*PI*392*t))*exp(-1.8*t)",
      1.8, "afade=t=in:d=0.035,afade=t=out:st=1.38:d=0.42")
synth("rumble", ".40*sin(2*PI*(61*t-9*t*t))*exp(-1.55*t)+.15*sin(2*PI*36*t)*exp(-2*t)",
      2.35, "afade=t=in:d=0.07,afade=t=out:st=1.7:d=0.65")
synth("step", ".43*sin(2*PI*85*t)*exp(-25*mod(t,0.4))+.12*sin(2*PI*177*t)*exp(-38*mod(t,0.4))",
      1.08, "afade=t=in:d=0.02,afade=t=out:st=0.89:d=0.19")
synth("reveal", ".19*(sin(2*PI*146.83*t)+.8*sin(2*PI*220*t)+.5*sin(2*PI*329.63*t))*exp(-1.35*t)",
      2.2, "afade=t=in:d=0.12,afade=t=out:st=1.75:d=0.45")
