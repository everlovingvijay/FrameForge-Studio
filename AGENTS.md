# AGENTS.md — Google Antigravity Workspace Instructions

## Project Overview
**FrameForge Studio** is an offline-first, commercial-grade desktop video editor built with:
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand
- **Desktop Target**: Tauri 2 + Rust (`src-tauri/`)
- **Planned Native Media Engine**: FFmpeg (LGPL build), FFprobe, OpenCV, SQLite (`rusqlite`), optional local ONNX Runtime (`ort`)

## Hard Architectural Rules (Do Not Violate)
1. **Strict Offline-First**: Never add cloud AI APIs, cloud rendering endpoints, subscription checks, or telemetry. Remove unused `@google/genai` template package during desktop dependency cleanup.
2. **Respect the Mock vs. Production Boundary**:
   - Browser simulation lives strictly in `src/data/studioMocks.ts` and `src/services/mockEngineAdapter.ts`.
   - Production contracts live in `src/types/rustEngine.ts`, `src/types/projectSchema.ts`, `src/types/autoEditEngine.ts`, `src-tauri/src/contracts.rs`, and `schemas/frameforge-project.schema.json`.
   - Keep `src/services/tauriEngineAdapter.ts` aligned 1:1 with `#[tauri::command]` handlers in Rust.
3. **Never Claim Mock Features Are Real**: Keep `isSimulated` flags accurate until real FFmpeg/FFprobe/OpenCV/SQLite handlers are wired.
4. **Commercial Licensing**: Use `--enable-lgpl --disable-gpl` FFmpeg sidecars (VideoToolbox, NVENC, QSV, AMF, OpenH264, SVT-AV1) unless commercial x264/x265 licenses are explicitly configured (see `docs/DEPENDENCIES_AND_LICENSING.md`).

## Verification Commands
```bash
npm run lint    # tsc --noEmit
npm run build   # vite build -> dist/
```

## Authoritative Docs for Next Steps
1. `docs/ANTIGRAVITY_ROADMAP.md` — Phased backend implementation plan (Phase 1 -> Phase 5)
2. `docs/RUST_API_CONTRACT.md` — Exact Tauri IPC commands, events & error taxonomy
3. `docs/TAURI_INTEGRATION.md` — Sidecars (`ffmpeg`/`ffprobe`), CSP & SQLite setup
4. `docs/ARCHITECTURE.md` — Component tree, state flow & `.ffproj` project schema
5. `docs/TESTING.md` — Unit test & Rust integration test plan
