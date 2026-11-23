# What If You Woke Up 100 Years in the Future?

A 60-second, 20-shot animated stickman explainer. Every human is drawn from the same articulated rig, including crowds and the figures in the photograph. Each frame is drawn from scene geometry. The renderer interpolates poses, solves hand contact for props, cycles footfalls, and moves separate vehicles and machines through the set. The export is 1080 × 1920 at 30 fps.

The finished video and thumbnail are in `out/`. The standalone subtitles are in `assets/subtitles.srt`.

## Reproduce the export

Install Python 3, NumPy, Pillow, DejaVu Sans fonts, and FFmpeg with libx264. Run these commands from this folder.

```sh
python -m pip install numpy pillow
python render.py
```

The supplied stems, mix, and subtitle timing let you re-render offline. FFmpeg writes `out/what-if-2126.mp4`. The same command renders `out/thumbnail.png`. To review representative frames first, run `python render.py --stills --output previews`.

## Edit the short

- Edit the corresponding branch of `scene()` in `render.py` to change a shot. `rig()` draws the stickman, `walker()` drives each foot and arm, and `arm_to()` solves the elbow and wrist. The canvas is 540 × 960 and FFmpeg scales the export to 1080 × 1920. Each shot is 90 frames at 30 fps.
- Set `STICKMAN_FIXED_CAMERA=1` before running the renderer to review character, prop, and vehicle animation with the camera locked.
- Change the narration and scene timing in `audio.py`. The bundled track uses the Piper US English Lessac medium voice. To synthesize new dialogue with that voice, install `piper-tts`, download the Lessac medium ONNX model and its matching JSON configuration, and run the command below.
- The subtitle text appears in both `assets/captions.json` for burn-in and `assets/subtitles.srt` for upload. Phrase timings are estimated from the fitted narration segments. When editing manually, update both files.
- `assets/narration.wav`, `assets/music.wav`, and `assets/effects.wav` are separate stems. The procedural score and effects are generated in `audio.py`. `assets/mix.wav` is the export mix.

```sh
PIPER_MODEL=/path/to/en_US-lessac-medium.onnx python audio.py
python render.py
```

Without a model path, the synthesis script tries Edge TTS if installed and then FFmpeg Flite if available. The narration model is a build dependency and is separate from the supplied project and WAV stems.

Voice model and configuration are available from the [Piper voice repository](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/lessac/medium).
