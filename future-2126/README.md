# What If You Woke Up 100 Years in the Future?

A 60-second, 20-shot science-fiction short. The video exports at 1080 × 1920 and 30 fps, with burned-in animated captions. The original character rigs, buildings, props, HUD, camera moves, wipes, and typography are drawn procedurally in Python. The drawing canvas is 540 × 960, scaled with Lanczos during export. No footage or downloaded reference frames appear in the render.

The finished video and thumbnail are in `out/`. The standalone subtitles are in `assets/subtitles.srt`.

## Reproduce the export

Install Python 3, NumPy, Pillow, DejaVu Sans fonts, and FFmpeg with libx264. Run these commands from this folder.

```sh
python -m pip install numpy pillow
python render.py
```

The supplied stems, mix, and subtitle timing let you re-render offline. FFmpeg writes `export/what-if-2126.mp4`. The same command draws `export/thumbnail.png`. To review representative frames first, run `python render.py --stills --output previews`.

## Edit the short

- Change the draw routines and shot sections in `render.py` to edit characters, scenes, lighting, or motion. Each shot is 90 frames at 30 fps.
- Change the narration and scene timing in `audio.py`. The bundled track uses the Piper US English Lessac medium voice. To synthesize new dialogue with that voice, install `piper-tts`, download the Lessac medium ONNX model and its matching JSON configuration, and run the command below.
- The subtitle text appears in both `assets/captions.json` for burn-in and `assets/subtitles.srt` for upload. Phrase timings are estimated from the fitted narration segments. When editing manually, update both files.
- `assets/narration.wav`, `assets/music.wav`, and `assets/effects.wav` are separate stems. The procedural score and effects are generated in `audio.py`. `assets/mix.wav` is the export mix.

```sh
PIPER_MODEL=/path/to/en_US-lessac-medium.onnx python audio.py
python render.py
```

Without a model path, the synthesis script tries Edge TTS if installed and then FFmpeg Flite if available. The narration model is a build dependency and is separate from the supplied project and WAV stems.

Voice model and configuration are available from the [Piper voice repository](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/lessac/medium).
