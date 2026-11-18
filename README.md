# FrameForge Studio

**Offline-first commercial-grade desktop video editor** built with React, TypeScript, Vite, Tailwind CSS v4, and Zustand, architected for **Tauri 2 + Rust + FFmpeg + FFprobe + OpenCV + SQLite** across Windows and macOS.

> **Current Build Status (Honest Disclosure):**  
> This repository currently ships the **complete interactive frontend workspace** running in **browser preview mode (`mockEngineAdapter`)**. Real native video transcoding, FFprobe stream inspection, hardware GPU encoding, OpenCV optical flow, and SQLite persistence activate once the Rust backend (`src-tauri/`) is compiled and linked via Tauri 2. No cloud AI APIs, cloud rendering, or subscriptions are used anywhere in the application.

---

## Key Workspaces Implemented

1. **Home Dashboard**: Project launcher, recent `.ffproj` projects, local hardware/storage monitor, and render history log.
2. **Auto Studio (8-Step Workflow)**: Multi-clip ingest, 12 editing presets (separate config in `src/config/autoPresets.ts`), aspect ratio & quality selection (`720p`–`8K`), 13 deterministic/local pipeline toggles, deterministic edit plan assembly (`autoEditEngine.ts`), scene-level clip replacement/locking/regeneration, and dedicated export config.
3. **Pro Editor (4-Region NLE)**: Media Browser, Preview Monitor (transport, frame stepping, aspect framing, quality selector, layer compositor), Multitrack Timeline (`V3..V1`, `A1..A3` with track Lock/Visibility/Mute/Solo, snapping, Timeline Markers, Split/Trim/Undo/Redo), and Inspector with **Audio Ducking** and an interactive **Keyframe Graph Overlay** (cubic-bezier handles + freehand curve drawing).
4. **Video Enhancement Studio**: Synchronized Before/After video comparison (`Split Wipe`, `Side-by-Side`, `After Only`), 8 categorized toolsets separating **Genuine Restoration** (`Basic`, `Color` with Tone Curve + LUTs, `Detail`, `Noise`, `Portrait`, `Motion`) from **Stylistic Camera Simulation** (6 camera profiles) and **Advanced Optical FX**, plus custom preset saving.
5. **Audio Studio, Preset Library, Export Center, Project Manager, Hardware Settings, Application Settings**.

---

## Monorepo / Repository Structure

```text
frameforge-studio/
├── docs/                           # Architecture, Rust IPC contract, Tauri, Licensing & Roadmap
│   ├── ARCHITECTURE.md
│   ├── RUST_API_CONTRACT.md
│   ├── TAURI_INTEGRATION.md
│   ├── ANTIGRAVITY_ROADMAP.md
│   ├── DEPENDENCIES_AND_LICENSING.md
│   └── TESTING.md
├── schemas/
│   └── frameforge-project.schema.json  # Shared portable .ffproj JSON Schema
├── src/
│   ├── assets/                     # Local bundled visual preview media
│   ├── components/
│   │   ├── auto/                   # Auto Studio export & planner panels
│   │   ├── editor/                 # Pro Editor monitor, browser, inspector, markers, spline graph
│   │   ├── enhancements/           # Synchronized Before/After video monitor
│   │   ├── modals/                 # New project, open project, import media dialogs
│   │   ├── shell/                  # Left rail & top workspace header
│   │   ├── ui/                     # Reusable low-level UI primitives (sliders, section headers)
│   │   └── views/                  # Top-level workspace pages
│   ├── config/                     # Production defaults, Auto presets, Enhancement & LUT profiles
│   ├── data/                       # Browser-preview sample fixtures ONLY (`studioMocks.ts`)
│   ├── services/                   # Rust IPC contract adapters (`engineClient`, `tauriEngineAdapter`, `mockEngineAdapter`, `autoEditEngine`, `projectService`)
│   ├── store/                      # Zustand global studio state (`useStudioStore.ts`)
│   ├── types/                      # TypeScript interfaces (`studio.ts`, `projectSchema.ts`, `rustEngine.ts`, `autoEditEngine.ts`)
│   └── utils/                      # Pure math & domain helpers (snapping, ducking, bezier keyframes, timeline ops, formatters)
├── src-tauri/                      # Tauri 2 + Rust desktop scaffold templates & shared Rust contracts
│   ├── Cargo.toml.template
│   ├── tauri.conf.json.template
│   └── src/
│       └── contracts.rs
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Installation & Local Development

### Prerequisites
- **Node.js**: `>= 20.x` (LTS)
- **npm** (or `bun` / `pnpm`)
- *(Optional for Desktop Tauri 2 build)* **Rust** (`rustup` stable toolchain `>= 1.80`), Xcode Command Line Tools (macOS) or Visual Studio C++ Build Tools + WebView2 (Windows), plus `ffmpeg` & `ffprobe` sidecar binaries.

### Frontend Web / Preview Development
```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev server on port 3000
npm run dev

# 3. Type-check and build production bundle
npm run lint
npm run build
```

See:
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Component architecture, `.ffproj` project schema, mock vs. production boundary
- [`docs/RUST_API_CONTRACT.md`](docs/RUST_API_CONTRACT.md) — Complete Tauri 2 Rust IPC commands & payloads
- [`docs/TAURI_INTEGRATION.md`](docs/TAURI_INTEGRATION.md) — Tauri 2 desktop & sidecar setup guide
- [`docs/ANTIGRAVITY_ROADMAP.md`](docs/ANTIGRAVITY_ROADMAP.md) — Google Antigravity implementation roadmap & incomplete functionality audit
- [`docs/DEPENDENCIES_AND_LICENSING.md`](docs/DEPENDENCIES_AND_LICENSING.md) — Commercial licensing compliance (FFmpeg LGPL/GPL, OpenCV, SQLite, ONNX)
- [`docs/TESTING.md`](docs/TESTING.md) — Frontend & Rust testing instructions
