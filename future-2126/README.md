# What If You Woke Up 100 Years in the Future?

A 60-second, 20-shot stickman short rendered at 1080 × 1920 and 30 fps. The [cartoon-3d-short skill](../.agents/skills/cartoon-3d-short/SKILL.md) supplies the Remotion/Three.js workflow and the Canvas2D Pen used to ink the character cards. The original narration, music, sound effects, caption timing, and three-second shots carry over to this cut.

## Render

Install Node.js, Chromium with WebGL, and FFmpeg with libx264. Run these commands from `future-2126/` in the full repository checkout.

```sh
npm ci
npm run render
```

Specify a browser with `CHROMIUM_BIN` if Chromium is installed at a nonstandard path. The render uses software WebGL for portability, renders the picture at 810 × 1440, then exports at 1080 × 1920 with the original mix. The result and cover are in `out/`. The standalone subtitle track is `assets/subtitles.srt`.

## Edit and review

- `src/rig.ts` defines the faceless cast, round-capped limbs, two-bone joint solves, and walk cycle. The stance foot travels backward in local space at the same rate the root moves forward, so it stays planted against the set. Clothing and the main character's scarf use separate, delayed poses.
- `src/world.ts` defines the 20 sets and their actor blocking, cameras, articulated robot arms, doors, moving traffic, and props.
- `src/index.tsx` defines the Remotion composition and existing caption overlay. Pass `{"fixedCamera":true,"noText":true}` as Remotion input props to check the scene motion with a fixed camera and hidden captions.
- `assets/narration.wav`, `assets/music.wav`, and `assets/effects.wav` are the source stems. `assets/mix.wav` is the exact 60-second export mix. The caption overlay reads `assets/captions.json`.
- `audio.py` is the original audio build. Install NumPy, `piper-tts`, and the [Lessac medium model and configuration](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/lessac/medium) to resynthesize the narration with `PIPER_MODEL=/path/to/en_US-lessac-medium.onnx python audio.py`.

The picture follows the brief's faceless stickman style and keeps its captions and 1080p format.
