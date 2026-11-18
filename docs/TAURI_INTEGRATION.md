# FrameForge Studio — Tauri 2 Desktop Integration Guide

## 1. Prerequisites

- **Rust**: `rustup` (`>= 1.80`) with `cargo`
- **Node.js**: `>= 20.x`
- **Platform Toolchains**:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Visual Studio 2022 C++ Build Tools + Microsoft Edge WebView2 Runtime
- **Sidecar Binaries**: Static builds of `ffmpeg` and `ffprobe` placed in `src-tauri/binaries/` using Tauri's target-triple naming convention:
  - `src-tauri/binaries/ffmpeg-aarch64-apple-darwin`
  - `src-tauri/binaries/ffmpeg-x86_64-apple-darwin`
  - `src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe`
  - (same triples for `ffprobe`)

---

## 2. Initializing Tauri 2 in This Repository

Starter templates are already prepared inside `src-tauri/`:

1. Install Tauri CLI and JS API in the workspace:
   ```bash
   npm install -D @tauri-apps/cli
   npm install @tauri-apps/api @tauri-apps/plugin-shell @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
   ```
2. Rename the template manifests:
   ```bash
   cp src-tauri/Cargo.toml.template src-tauri/Cargo.toml
   cp src-tauri/tauri.conf.json.template src-tauri/tauri.conf.json
   ```
3. Create `src-tauri/src/main.rs` and `src-tauri/src/lib.rs` registering `contracts.rs` and every `#[tauri::command]` listed in `docs/RUST_API_CONTRACT.md`.
4. Add `tauri-plugin-shell` capabilities in `src-tauri/capabilities/default.json` permitting sidecar execution for `binaries/ffmpeg` and `binaries/ffprobe`.

---

## 3. Native Subsystem Integration Notes

### A. Asset Protocol for Local Video Playback
In `tauri.conf.json.template`, `app.security.csp` allows `media-src 'self' asset: blob:;` and `Cargo.toml.template` enables `protocol-asset`. Frontend components can convert local OS file paths using `convertFileSrc(filePath)` so HTML5 `<video>` elements stream gigabyte ProRes/MP4 files directly from disk with zero RAM copying.

### B. SQLite Catalog (`rusqlite`)
Use `rusqlite` with the `bundled` feature flag so Windows and macOS ship an identical SQLite 3 engine with zero system library drift. Store the catalog index at the path configured in `AppSettingsState.sqliteCatalogPath`.

### C. Hardware Encoder Probing
On startup (`detect_hardware_profile`):
1. Run `ffmpeg -hide_banner -encoders` via the sidecar.
2. Probe availability of `h264_videotoolbox` / `hevc_videotoolbox` (macOS), `h264_nvenc` / `hevc_nvenc` / `av1_nvenc` (NVIDIA), `h264_qsv` / `hevc_qsv` (Intel), and `h264_amf` / `hevc_amf` (AMD).
3. Always keep `libx264` / `libx265` / `libsvtav1` enabled as `cpu-fallback`.

### D. Optional OpenCV & Local ONNX
Enable Cargo features incrementally:
- `--features opencv-engine`: requires system OpenCV + LLVM/Clang (`brew install opencv llvm` on macOS, `vcpkg install opencv4` on Windows).
- `--features onnx-local`: bundles local `.onnx` face segmentation / subject tracking models inside the app resource directory; never calls external endpoints.
