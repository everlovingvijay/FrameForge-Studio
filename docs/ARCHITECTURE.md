# FrameForge Studio — Architecture & Code Quality Guide

## 1. Design Principles

1. **Offline-First & Zero Cloud Dependency**: All media inspection, timeline editing, enhancement math, project serialization, and future rendering operate 100% locally. No cloud APIs, external LLM tokens, or remote render queues.
2. **Strict Separation of Concerns**:
   - **Views (`src/components/views/`)**: Presentation and user interaction wiring only.
   - **Domain & Reusable Components (`src/components/editor/`, `auto/`, `enhancements/`, `ui/`, `shell/`, `modals/`)**: Self-contained modular widgets.
   - **Configuration (`src/config/`)**: Static editing presets (`autoPresets.ts`), enhancement & camera simulation profiles (`enhancementProfiles.ts`), and neutral defaults (`defaults.ts`).
   - **Business Logic & Engine Services (`src/services/`, `src/utils/`)**: Pure functions for project serialization (`projectService.ts`), deterministic auto-edit planning (`autoEditEngine.ts`), timeline math (`timelineOperations.ts`, `timelineSnap.ts`), audio ducking (`audioDucking.ts`), and cubic-bezier keyframe interpolation (`keyframeInterpolation.ts`).
   - **State (`src/store/useStudioStore.ts`)**: Single Zustand store orchestrating workspace state and dispatching async calls through `engineClient`.
   - **Simulated Fixtures (`src/data/studioMocks.ts`)**: Isolated browser-preview sample assets, simulated hardware profiles, and demo timelines.

---

## 2. Component Architecture

```text
App.tsx
├── shell/
│   ├── SidebarNav                 # 10-section studio navigation rail
│   └── TopWorkspaceBar            # Active project context, Quick Actions, offline mode banner
├── views/
│   ├── HomeDashboardView          # Project launchpad, storage & hardware summary, render log
│   ├── AutoStudioView             # 8-step automated editing workflow + auto/AutoExportPanel
│   ├── ProEditorView              # 4-region NLE (MediaBrowser, PreviewMonitor, ClipInspector, Multitrack Timeline)
│   ├── VideoEnhancementsView      # 8-category restoration/simulation + enhancements/EnhancementComparisonMonitor
│   ├── AudioStudioView            # 5-band EQ, compressor/limiter, LUFS target, multi-track mixer
│   ├── ExportCenterView           # FFmpeg delivery configurator & render queue
│   └── LibraryAndSystemViews      # PresetLibraryView, ProjectManagerView, HardwareSettingsView, AppSettingsView
└── modals/
    ├── NewProjectModal
    ├── OpenProjectModal
    └── ImportMediaModal
```

### Reusable Primitive Layer (`src/components/ui/`)
- `StudioSliderControl`: Precision NLE slider with `tabular-nums` value readout, signed prefix option, helper text, and single-parameter reset button.
- `SectionHeader`: Standard studio workspace title, subtitle, and right-aligned action bar.

---

## 3. Shared Project Data Model (`.ffproj`)

Defined in `src/types/projectSchema.ts` and `schemas/frameforge-project.schema.json` (`FFPROJ_SCHEMA_VERSION = "1.0.0"`):

- `metadata`: Project ID, name, schema version, ISO timestamps, `.ffproj` path, last active workspace (`auto-studio` | `pro-editor`).
- `sequence`: Canvas width, height, frame rate (`FrameRateOption`), color space (`Rec.709`, `Rec.2020 HLG`, `sRGB`, `Apple Log`), working bit depth (`8` | `10` | `32`).
- `mediaIndex`: Indexed clips with OS absolute & project-relative paths, codec, sample rate, file size, SHA-256 checksum, and optional proxy path.
- `timeline`: Track states (`V3..V1`, `A1..A3`), `TimelineClip[]` (trim, speed, transitions, transforms, color, audio ducking, cubic-bezier keyframes), `TimelineMarker[]`, snapping rules, playhead, and zoom.
- `enhancements`: Full 8-category `VideoEnhancementState` separating genuine restoration parameters from stylistic camera simulation & optical FX.
- `audio`: Master DSP chain (`noiseReduction`, `voiceEnhancement`, 5-band EQ, compressor, limiter, LUFS target, ducking) and track mixer.
- `autoStudio`: Active `AutoStudioConfig` + export parameters.
- `renderHistory`: Local completed export log.

SQLite (`catalog.sqlite3`) stores `SqliteProjectCatalogRow` summaries for instant dashboard/project-manager loading without parsing full `.ffproj` JSON manifests until a project is opened.

---

## 4. Production Interfaces vs. Mock Boundaries

| Layer | Production Interface | Browser Preview (Mock) | Desktop Target (Rust / Tauri) |
| :--- | :--- | :--- | :--- |
| **Runtime Selector** | `src/services/engineClient.ts` | `mockEngineAdapter.ts` | `tauriEngineAdapter.ts` |
| **Media Probe** | `probeNativePath` / `probeBrowserFile` | HTML5 `<video>`/`<audio>`/`<img>` metadata + sample fixtures | `ffprobe -v quiet -print_format json -show_format -show_streams` |
| **Hardware Detection** | `detectHardwareProfile` | `buildHardwareProfile()` presets (`studioMocks.ts`) | Native OS probe (`system_profiler` / WMI / DXGI / VideoToolbox / NVENC) |
| **Auto Edit Planner** | `RustAutoEditEngineBridge` (`autoEditEngine.ts`) | Deterministic hash-based local plan preview | OpenCV optical flow, histogram scene cuts, optional ONNX tracking |
| **Video Enhancements** | `VideoEnhancementState` | Real-time CSS/SVG filter + `<video>` sync approximation | 32-bit float GPU shaders (Metal/Vulkan/WGSL) + FFmpeg/OpenCV filters |
| **Export & Rendering** | `enqueueRenderJob` / `cancelRenderJob` | Creates queued job handle (`simulated-ready`) + CLI preview | `tokio` worker spawning `ffmpeg` with `-progress pipe:1` |
| **Project Storage** | `saveProjectDocument` / `loadProjectDocument` | In-memory Zustand state | Atomic `.ffproj` file write + `rusqlite` SQLite catalog update |
