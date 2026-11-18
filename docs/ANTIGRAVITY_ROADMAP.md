# FrameForge Studio — Google Antigravity Roadmap & Incomplete Functionality Audit

## 1. Honest Audit of Current Mock / Incomplete Functionality

The current codebase provides a **complete, interactive React/TypeScript UI** paired with deterministic browser-preview simulation. The following capabilities are **NOT yet real native media processing**:

| Feature Area | Current Browser Behavior | What Remains Incomplete |
| :--- | :--- | :--- |
| **Video/Audio Export (`ExportCenterView`, `AutoExportPanel`)** | Queues `ExportQueueJob` items with status `simulated-ready` and estimated file sizes. | Real FFmpeg filtergraph compilation, muxing, and `-progress pipe:1` worker execution. |
| **Media Probing (`mockEngineAdapter.probeBrowserFile`)** | Reads duration/dimensions of user-dropped files via HTML5 `<video>`/`<audio>`; sample assets use static metadata. | `ffprobe` stream inspection (10-bit depth, color primaries, audio channels, bitrate) and filmstrip/waveform extraction. |
| **Hardware & Storage Telemetry (`studioMocks.ts`)** | `buildHardwareProfile()` simulates macOS Apple Silicon, Windows NVIDIA, and Windows Intel/AMD profiles. | Real OS GPU/RAM/NVMe probing and live FFmpeg encoder verification. |
| **Project Persistence (`ProjectManagerView`, `useStudioStore`)** | Stores project list and edits in volatile Zustand memory (`exportActiveProjectDocument()` serializes `.ffproj` JSON). | Reading/writing `.ffproj` manifests to disk and indexing projects in SQLite (`catalog.sqlite3`). |
| **Pro Editor Preview & Audio Playback** | Visual composite uses `<img>`/`<video>` layers + CSS filters/transforms; audio sliders/ducking adjust state & waveform envelope graphics without WebAudio/native audio mixing. | Frame-accurate multi-track native video decode + real-time mixed audio engine (WebAudio AudioWorklet preview or Rust `cpal`/FFmpeg audio buffer). |
| **Video Enhancement DSP** | Uses real-time CSS filters, SVG `feColorMatrix`, and CSS/SVG overlays to approximate adjustments. | True 32-bit float GPU shaders (Metal/Vulkan/WGSL) for highlights/shadows roll-off, OpenCV `nlmeans`/temporal denoise, `vidstab`, optical flow, and 3D `.cube` LUT parsing. |
| **Auto Studio AI/CV Analysis** | `autoEditEngine.ts` uses deterministic hashing + FPS heuristics (`engineMode: 'deterministic-local-preview'`). | OpenCV optical-flow motion scoring, audio beat detection, silence trimming, and optional local ONNX face/subject tracking. |

---

## 2. Recommended Next Development Tasks for Google Antigravity

### Phase 1: Desktop Shell, SQLite & Real Media Probe
1. Initialize `src-tauri/` using `Cargo.toml.template` and `tauri.conf.json.template`.
2. Implement `get_engine_capabilities`, `create_project`, `save_project_document`, and `load_project_document` in Rust using `rusqlite` and `contracts.rs`.
3. Implement `probe_media_file` invoking bundled `ffprobe` sidecar + writing real clip thumbnails & peak waveform `.json` caches to scratch disk.
4. Implement `detect_hardware_profile` querying real host CPU/RAM/disk and `ffmpeg -encoders`.

### Phase 2: Real FFmpeg Render Queue & Timeline Compiler
5. Build a Rust `ffmpeg_graph_builder.rs` converting `FrameForgeProjectDocument` (`timeline.clips`, transitions, crop, transforms, color, audio ducking keyframes) into a deterministic FFmpeg `filter_complex` pipeline.
6. Implement `enqueue_ffmpeg_render` and `cancel_ffmpeg_render` using `tokio::process::Command` and streaming `render://progress` events back to `ExportCenterView`.

### Phase 3: Enhancement Shaders & OpenCV Restoration
7. Implement `render_enhancement_preview_frame` for 1:1 native enhancement parity (FFmpeg `eq`/`colorbalance`/`lut3d`/`hqdn3d`/`unsharp` + OpenCV deblock/temporal denoise).
8. Wire FFmpeg `vidstabdetect` / `vidstabtransform` and OpenCV DIS optical flow for Motion stabilization and slow-motion interpolation.

### Phase 4: Local Auto Studio Intelligence
9. Replace `autoEditEngine.ts` browser heuristics with Rust `auto_edit_analyze_and_plan` using OpenCV scene cut/motion scoring + audio RMS onset/silence detection.
10. Optionally bundle quantized local `.onnx` models under `--features onnx-local` for Portrait face masking and Subject Tracking.

### Phase 5: Hardening & Commercial Packaging
11. Add automated Vitest unit suites + `cargo test` FFmpeg integration tests.
12. Configure macOS hardened runtime notarization and Windows Authenticode signing for offline installers.
