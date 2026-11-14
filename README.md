# Microcut

Place still screens as named states, cut a [Material 3](https://m3.material.io/styles/motion/overview/how-it-works) transition between them, preview it, and export an MP4.

The sample reel is a small field notebook called Fieldnote: Sites opens into Harbor with a container transform. You can upload your own screens and add Today, which is set up for a fade through.

## Run locally

You need Node.js 22 or newer, and `ffmpeg` on your `PATH` (libx264). The app runs without ffmpeg, but Export MP4 will fail until it is installed.

```bash
npm install
npm run dev
```

Open [http://localhost:3847](http://localhost:3847).

```bash
npm test
npm run paint-demos   # rewrite public/demo/*.png
npm run build
npm start
```

## How to use it

1. The reel opens on Sites → Harbor. Press play, or drag the playhead.
2. Upload one or more PNG, JPEG, or WebP screens. Each file becomes a named state and is added to the reel until the reel is full.
3. Select a state on the timeline to rename it, set how long it holds, and choose its container region (full screen, card, or list row).
4. Select the cut between two states. Pick a transition pattern, then either an easing and duration token or a spring.
5. The panel lists the Material token names that are actually driving that cut.
6. Export MP4 downloads the reel. Sample screens are enough; you do not have to upload anything.

Space plays and pauses when focus is not in a field.

## Motion

Microcut does not invent a timing system. Preview and export share one sampler.

**Easing** comes from the [easing and duration token spec](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs):

| Token | Value |
| --- | --- |
| `md.sys.motion.easing.emphasized` | Android path `M 0,0 C 0.05,0 0.133333,0.06 0.166666,0.4 C 0.208333,0.82 0.25,1 1,1`. CSS has no single cubic-bezier; the spec says to fall back to standard. |
| `md.sys.motion.easing.emphasized.decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1.0)` |
| `md.sys.motion.easing.emphasized.accelerate` | `cubic-bezier(0.3, 0.0, 0.8, 0.15)` |
| `md.sys.motion.easing.standard` | `cubic-bezier(0.2, 0.0, 0, 1.0)` |
| `md.sys.motion.easing.standard.decelerate` | `cubic-bezier(0, 0, 0, 1)` |
| `md.sys.motion.easing.standard.accelerate` | `cubic-bezier(0.3, 0, 1, 1)` |
| `md.sys.motion.easing.linear` | `cubic-bezier(0, 0, 1, 1)` |

**Duration** is the full scale from `md.sys.motion.duration.short1` (50ms) through `md.sys.motion.duration.extra-long4` (1000ms).

**Springs** use damping ratio and stiffness from Compose `ExpressiveMotionTokens` and `StandardMotionTokens`. The scheme is expressive or standard. The token name does not include the scheme.

| Token | Expressive damping / stiffness | Standard damping / stiffness |
| --- | --- | --- |
| `md.sys.motion.spring.fast.spatial` | 0.6 / 800 | 0.9 / 1400 |
| `md.sys.motion.spring.default.spatial` | 0.8 / 380 | 0.9 / 700 |
| `md.sys.motion.spring.slow.spatial` | 0.8 / 200 | 0.9 / 300 |
| `md.sys.motion.spring.fast.effects` | 1 / 3800 | 1 / 3800 |
| `md.sys.motion.spring.default.effects` | 1 / 1600 | 1 / 1600 |
| `md.sys.motion.spring.slow.effects` | 1 / 800 | 1 / 800 |

Spatial springs move bounds, translation, and scale, and they may overshoot. Effects springs drive opacity and do not. Initial velocity is 0. A spring has no duration token; the cut lasts until the spring settles (capped at 2 seconds).

**Patterns** follow the Material transition set:

- **Container transform.** Bounds morph between the two states’ container regions. Incoming content uses `FADE_MODE_IN` over progress 0–0.25. Corner radius uses the enter shape-mask threshold and finishes at 0.75. Row and card corners are `md.sys.shape.corner.large` (16dp). The default pairing is emphasized + `md.sys.motion.duration.long2` (500ms), the spec example for a card opening to full screen.
- **Shared axis.** X and Y slide `mtrl_transition_shared_axis_slide_distance` (30dp). Z scales with `ScaleProvider` (incoming 0.8 → 1, outgoing 1 → 1.1 when moving forward). Opacity is `FadeThroughProvider` at threshold 0.35. Default pairing is emphasized + `md.sys.motion.duration.long1` (450ms).
- **Fade through.** Sequential fade at threshold 0.35. Incoming scale starts at 0.92. Outgoing scale stays off. Same default duration and easing as shared axis.
- **Fade.** Incoming fade ends at progress 0.3 and scales from 0.8, on emphasized decelerate + `md.sys.motion.duration.medium4` (400ms). Outgoing fade has no scale, on emphasized accelerate + `md.sys.motion.duration.short3` (150ms).

Holds (400, 800, 1200, 1600ms) are still frames. They are not motion tokens.

## Export limits

- Resolution: 720×1280 (a 360×640dp stage at 2x)
- Frame rate: 30fps
- Codec: H.264, `yuv420p`, CRF 20, no audio
- Length: 8 seconds maximum
- Reel: 6 states maximum
- Library: 12 screens maximum
- Uploads are resized to the export frame as JPEG. Each image sent to the encoder must stay under about 1.8MB of data-URL text.
- `ffmpeg` must be installed and able to encode with libx264. If it is missing, the preview still runs and export returns an error.
