# FrameForge Studio — Dependencies & Commercial Licensing Audit

## 1. Current Frontend Dependencies (`package.json`)

| Package | Version | License | Status in FrameForge Studio |
| :--- | :--- | :--- | :--- |
| `react` / `react-dom` | `^19.0.1` | MIT | Core UI runtime |
| `zustand` | `^5.1.0` | MIT | Global editor & project state |
| `lucide-react` | `^0.546.0` | ISC | UI iconography |
| `motion` | `^12.23.24` | MIT | Optional UI transitions |
| `tailwindcss` / `@tailwindcss/vite` | `^4.3.3` | MIT | Styling system |
| `vite` / `@vitejs/plugin-react` | `^8.3.0` / `^6.1.1` | MIT | Frontend bundler & dev server |
| `typescript` | `^7.0.2` | Apache-2.0 | Static type checker |
| `@google/genai` | `^2.4.0` | Apache-2.0 | **Unused template dependency — REMOVE before desktop shipping.** FrameForge Studio uses zero cloud AI APIs. |
| `express` / `dotenv` / `tsx` | MIT / BSD-2 | MIT/BSD | **Unused template dev-server deps** (retained only for template compatibility; not bundled in desktop client). |

---

## 2. Planned Desktop / Native Engine Dependencies & Licensing Risk Review

Because FrameForge Studio is intended for **commercial desktop distribution**, copyleft license boundaries must be respected explicitly:

| Component | Recommended License Configuration | Commercial Distribution Notes |
| :--- | :--- | :--- |
| **Tauri 2 (`tauri`)** | MIT / Apache-2.0 | Permissive. Fully compatible with proprietary commercial software. |
| **SQLite (`rusqlite` bundled)** | Public Domain | Zero licensing restrictions. |
| **OpenCV (`opencv` crate)** | Apache-2.0 (v4.5+) | Permissive when compiled **without** `OPENCV_ENABLE_NONFREE` (SIFT/SURF patents/non-free modules excluded). |
| **ONNX Runtime (`ort`)** | MIT | Permissive for local inference execution. Model weights bundled must also use permissive commercial licenses (Apache-2.0 / MIT / BSD). |
| **FFmpeg & FFprobe (CRITICAL)** | **LGPL v2.1+ (Recommended) or GPL v3** | **IMPORTANT:** Default FFmpeg builds containing `libx264` or `libx265` are **GPL-licensed**, which requires disclosing your entire application source code if statically/dynamically linked or bundled as an integral engine unless you obtain a commercial x264/x265 license or keep an LGPL-only build! |

### Recommended Commercial FFmpeg Strategy
1. **LGPL Dynamic Build**: Compile `ffmpeg`/`ffprobe` with `--enable-lgpl --disable-gpl --disable-nonfree`, relying on:
   - **Hardware Encoders**: Apple VideoToolbox, NVIDIA NVENC, Intel QSV, AMD AMF (all OS/driver-provided, LGPL-compatible).
   - **Permissive Software Codecs**: Cisco **OpenH264** (BSD), **libvpx** (BSD), **SVT-AV1** (`libsvtav1`, BSD-2-Clause-Patent), **Opus/FLAC/AAC**.
2. Provide LGPL dynamic linking / object relinking compliance notice and FFmpeg build configuration inside the app's About / Legal dialog.
3. If `libx264` or `libx265` GPL binaries are ever desired, purchase commercial encoder licenses or keep them strictly out of default commercial bundles.
