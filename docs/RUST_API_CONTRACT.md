# FrameForge Studio — Rust Engine IPC & API Contract

This document defines the typed communication contract between the React/TypeScript frontend (`src/types/rustEngine.ts`, `src/types/autoEditEngine.ts`, `src/types/projectSchema.ts`) and the Tauri 2 Rust backend (`src-tauri/src/contracts.rs`).

All payloads serialize as **camelCase JSON** via `#[serde(rename_all = "camelCase")]`.

---

## 1. Tauri IPC Commands (`invoke`)

### `get_engine_capabilities`
- **Request**: `{}`
- **Response (`EngineCapabilities`)**:
  ```json
  {
    "runtime": "tauri-rust",
    "ffmpegAvailable": true,
    "ffprobeAvailable": true,
    "opencvAvailable": true,
    "sqliteAvailable": true,
    "onnxRuntimeAvailable": false,
    "isSimulated": false
  }
  ```

### `detect_hardware_profile`
- **Request**: `{ "platformOverride"?: HostPlatform }`
- **Response**: `HardwareProfile` — Real CPU cores/model, RAM free/total, GPU VRAM, scratch disk free space, and probed hardware encoders (`videotoolbox`, `nvenc`, `qsv`, `amf`, `cpu-fallback`).

### `probe_media_file`
- **Request**: `{ "filePath": string }`
- **Response**: `MediaAsset` — Executes `ffprobe` to extract exact codec, pixel format, SAR/DAR, variable/constant FPS, audio sample rate, and writes a cached thumbnail JPEG to the scratch disk.

### `create_project`
- **Request**: `CreateProjectCommandInput` (`name`, `directory`, `width`, `height`, `fps`, `colorSpace`, `initialWorkspace`)
- **Response**: `StudioProject` — Creates `<name>.ffproj` manifest on disk and inserts a row into `catalog.sqlite3`.

### `save_project_document` / `load_project_document`
- **Save Request**: `{ "document": FrameForgeProjectDocument }`
- **Save Response**: `{ "savedPath": string, "bytesWritten": number, "updatedAtIso": string }`
- **Load Request**: `{ "filePath": string }`
- **Load Response**: `FrameForgeProjectDocument`

### `auto_edit_analyze_and_plan`
- **Request**: `RustAutoEditRequest` (preset ID, selected media paths, target duration, output format, 13 pipeline flags, `variantSeed`, and `lockedScenes[]`).
- **Response**: `AutoEditPlanResult` — Preserves any user-locked scenes verbatim while scoring unlocked clips via OpenCV optical flow and audio onset detection.

### `render_enhancement_preview_frame`
- **Request**: `EnhancementPreviewFrameRequest` (`mediaFilePath`, `timestampSec`, `enhancements: VideoEnhancementState`, `maxWidth`)
- **Response**: `EnhancementPreviewFrameResult` — Applies exact FFmpeg/OpenCV/GPU shader pipeline to a single frame and returns base64/asset preview URI + processing time.

### `enqueue_ffmpeg_render` / `cancel_ffmpeg_render`
- **Enqueue Request**: `RenderEncodeRequest` (full `FrameForgeProjectDocument` + output codec/container/bitrate/encoder/computePreference).
- **Enqueue Response**: `RenderJobHandle` (`jobId`, `accepted`, `status`, `commandPreview`).
- **Cancel Request**: `{ "jobId": string }` -> `{ "jobId": string, "cancelled": boolean }`.

---

## 2. Streaming Tauri Events (`app.emit`)

| Event Name | Payload Type | Description |
| :--- | :--- | :--- |
| `render://progress` | `RenderProgressEvent` | Emitted every ~250ms parsed from FFmpeg `-progress pipe:1` (`progressPct`, `currentFrame`, `totalFrames`, `fpsSpeed`, `etaSeconds`, `status`). |
| `analysis://progress` | `{ jobId, stage, progressPct }` | Progress updates during OpenCV stabilization / motion scoring / proxy transcoding. |

---

## 3. Error Taxonomy (`RustEngineError`)

Every failed Tauri command returns structured JSON matching `RustEngineError`:
```ts
interface RustEngineError {
  code:
    | 'REQUIRES_TAURI_RUNTIME'
    | 'FFPROBE_FAILED'
    | 'FFMPEG_EXIT_NONZERO'
    | 'OPENCV_ANALYSIS_FAILED'
    | 'SQLITE_IO_ERROR'
    | 'UNSUPPORTED_CODEC'
    | 'INVALID_PROJECT_SCHEMA'
    | 'INSUFFICIENT_DISK_SPACE'
    | 'CANCELLED';
  message: string;
  command: keyof FrameForgeRustCommands;
  details?: string;
}
```
