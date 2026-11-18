// FrameForge Studio — Authoritative Rust <-> TypeScript IPC & Schema Contracts
// Mirrors `src/types/rustEngine.ts`, `src/types/projectSchema.ts`, and `src/types/autoEditEngine.ts`.

use serde::{Deserialize, Serialize};

pub const FFPROJ_SCHEMA_VERSION: &str = "1.0.0";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineCapabilities {
    pub runtime: String, // "tauri-rust"
    pub ffmpeg_available: bool,
    pub ffprobe_available: bool,
    pub opencv_available: bool,
    pub sqlite_available: bool,
    pub onnx_runtime_available: bool,
    pub is_simulated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RustEngineError {
    pub code: String,
    pub message: String,
    pub command: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectCommandInput {
    pub name: String,
    pub directory: String,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub color_space: String,
    pub initial_workspace: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderEncodeRequest {
    pub job_id: String,
    pub project_document: serde_json::Value,
    pub output_path: String,
    pub resolution: String,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub codec: String,
    pub container: String,
    pub bitrate_mbps: f64,
    pub quality_preset: String,
    pub encoder: String,
    pub compute_preference: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderJobHandle {
    pub job_id: String,
    pub accepted: bool,
    pub status: String,
    pub is_simulated: bool,
    pub command_preview: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderProgressEvent {
    pub job_id: String,
    pub progress_pct: f64,
    pub current_frame: u64,
    pub total_frames: u64,
    pub fps_speed: f64,
    pub eta_seconds: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnhancementPreviewFrameRequest {
    pub media_file_path: String,
    pub timestamp_sec: f64,
    pub enhancements: serde_json::Value,
    pub max_width: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnhancementPreviewFrameResult {
    pub frame_data_url: String,
    pub applied_stages: Vec<String>,
    pub processing_time_ms: f64,
    pub is_simulated: bool,
}
