# What If Earth Suddenly Became Twice as Big?

A 60-second, 1080 × 1920 vertical Short at 30 fps. It uses the supplied narration verbatim, original SVG animation, 22 named shots, word-timed captions, and a synthesized soundtrack.

| Deliverable | File |
| --- | --- |
| Finished H.264/AAC MP4 | [out/video.mp4](out/video.mp4) |
| Vertical PNG thumbnail | [out/thumbnail.png](out/thumbnail.png) |
| Subtitles | [out/subtitles.srt](out/subtitles.srt) |
| Voice | [public/audio/narration.mp3](public/audio/narration.mp3) |
| Exact script | [narration.txt](narration.txt) |
| Remotion scenes, captions and audio mix | [src/index.tsx](src/index.tsx) |
| Original SVG art | [src/art.tsx](src/art.tsx) |
| Word timing data | [src/timing.json](src/timing.json) |

## Science

The assumption is a spherical Earth with twice its original radius and unchanged average density. Volume increases by 2³ = 8, so mass does too. Surface gravity is proportional to mass divided by the square of radius. The ratio is 8 ÷ 2² = 2, ignoring rotation. Existing objects would weigh twice as much at the new surface. At the same vertical launch speed, a jump would reach half its previous height. The outcome for the atmosphere, terrain, infrastructure, or society depends on how this physically unspecified transformation occurs; those shots illustrate possible effects, not specific forecasts.

- [OpenStax, Newton’s Law of Universal Gravitation](https://openstax.org/books/university-physics-volume-1/pages/13-1-newtons-law-of-universal-gravitation)
- [OpenStax, Projectile Motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion)

## Render or edit

From this project folder, with Node.js, npm and FFmpeg installed:

```sh
npm ci
bash scripts/render.sh
```

Set `REMOTION_CHROMIUM` to a Chromium executable if the bundled browser is unavailable. The included assets allow rendering without another TTS request. Open the named composition with `npx remotion studio src/index.tsx`. Most shot starts are keyed to narration words. The thumbnail is a separate composition.

The supplied script was synthesized verbatim with free Edge TTS using `en-US-AndrewNeural`. To regenerate the narration, install `edge-tts` in a Python virtual environment and run `python3 scripts/narrate.py`. That refreshes both the timing manifest and the SRT. Fresh Edge synthesis requires the speech service. The `--local` option uses FFmpeg Flite offline with estimated word alignment. Run `python3 scripts/sound.py` to regenerate the original score and effects.
