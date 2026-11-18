# FrameForge Studio — Testing & Verification Guide

## 1. Current Verification Commands (Frontend)

Run both static type-checking and Vite production bundling before every commit:

```bash
# 1. TypeScript strict check (no emit)
npm run lint

# 2. Production bundle build
npm run build
```

---

## 2. Recommended Unit Test Suite (Pure Business Logic)

The codebase separates pure domain logic from React views so core editing algorithms can be tested deterministically in Node without a browser or DOM:

| Target Module | What to Test |
| :--- | :--- |
| `src/utils/timelineOperations.ts` | `splitClipAtTime` boundary guards (`< 0.3s` from edges), `trimClipEdgeAtTime` (`in`/`out` trim + `trimInSec` offset), `createTimelineClipFromAsset`. |
| `src/utils/timelineSnap.ts` | Magnetic snap priority across clip edges, timeline markers, transition points, playhead, and ruler grid. |
| `src/utils/audioDucking.ts` | `isVoiceOverClip` detection, overlapping interval calculation on `A2`/`A3` under `A1`, attenuation ramp envelope math. |
| `src/utils/keyframeInterpolation.ts` | `evaluateCubicBezier` endpoint accuracy (`t=0` and `t=1`), multi-keyframe linear/bezier/hold interpolation, freehand stroke fitting. |
| `src/services/autoEditEngine.ts` | Deterministic `variantSeed` output stability, preservation of `locked` scenes during `regenerateAlternativePlan`, beat-grid rounding. |
| `src/services/projectService.ts` | `serializeProjectDocument` compliance against `schemas/frameforge-project.schema.json`, `buildExportJobInput` bitrate/size estimation. |
| `src/config/enhancementProfiles.ts` | `classifyEnhancementState` distinction between `restoration`, `stylistic`, and `hybrid` presets. |

### Adding Vitest (Recommended Next PR)
```bash
npm install -D vitest
npx vitest run
```

---

## 3. Manual Interactive Smoke Checklist

1. **Home Dashboard**: Create a new project via *New Project* modal, import a local `.mp4`/`.jpg` file via *Import Media*, switch simulated host platform (`macOS Apple Silicon`, `Windows NVIDIA RTX`).
2. **Auto Studio**: Step through Steps `1`–`8`, toggle locked scenes in Step `7`, regenerate an alternative cut, and send the plan to Pro Editor.
3. **Pro Editor**: Toggle timeline snapping (`Magnet`), add/edit/navigate `TimelineMarkers`, split a clip at playhead, enable **Audio Ducking** on an `A2` music clip, open the **Keyframe Graph Overlay** to drag bezier handles or sketch a curve, and toggle Undo/Redo.
4. **Video Enhancement Studio**: Switch between `Split Wipe` and `Side-by-Side`, scrub synchronized playback, toggle **Optional Skin Smoothing** (`05. Portrait`), apply a **Camera Simulation** profile (`07. Camera Sim`), verify classification updates (`Genuine Restoration Only` vs `Stylistic Camera Simulation`), and save/apply/delete a custom preset.

---

## 4. Future Rust / Tauri Integration Testing (`src-tauri/`)

Once `Cargo.toml` is activated:
```bash
cd src-tauri
cargo test
```
- Validate `FrameForgeProjectDocument` round-trip serialization against `schemas/frameforge-project.schema.json`.
- Run integration tests against tiny 2-second synthetic `ffmpeg -f lavfi -i testsrc=duration=2` fixtures verifying `ffprobe` parsing, `.ffproj` SQLite indexing, and headless `ffmpeg` export completion.
