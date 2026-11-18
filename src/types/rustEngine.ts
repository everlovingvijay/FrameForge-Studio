import { AutoEditPlanResult, RustAutoEditRequest } from './autoEditEngine';
import { FrameForgeProjectDocument } from './projectSchema';
import {
  AutoStudioConfig,
  ContainerFormat,
  FrameRateOption,
  HardwareEncoderId,
  HardwareProfile,
  HostPlatform,
  MediaAsset,
  ResolutionPreset,
  StudioProject,
  VideoCodec,
  VideoEnhancementState,
} from './studio';

export type EngineRuntimeMode = 'browser-mock' | 'tauri-rust';

export type RustErrorCode =
  | 'REQUIRES_TAURI_RUNTIME'
  | 'FFPROBE_FAILED'
  | 'FFMPEG_EXIT_NONZERO'
  | 'OPENCV_ANALYSIS_FAILED'
  | 'SQLITE_IO_ERROR'
  | 'UNSUPPORTED_CODEC'
  | 'INVALID_PROJECT_SCHEMA'
  | 'INSUFFICIENT_DISK_SPACE'
  | 'CANCELLED';

export interface RustEngineError {
  code: RustErrorCode;
  message: string;
  command: keyof FrameForgeRustCommands;
  details?: string;
}

export interface EngineCapabilities {
  runtime: EngineRuntimeMode;
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  opencvAvailable: boolean;
  sqliteAvailable: boolean;
  onnxRuntimeAvailable: boolean;
  isSimulated: boolean;
}

export interface RenderEncodeRequest {
  jobId: string;
  projectDocument: FrameForgeProjectDocument;
  outputPath: string;
  resolution: ResolutionPreset;
  width: number;
  height: number;
  fps: FrameRateOption;
  codec: VideoCodec;
  container: ContainerFormat;
  bitrateMbps: number;
  qualityPreset: 'Draft' | 'Balanced' | 'High' | 'Master';
  encoder: HardwareEncoderId;
  computePreference: 'gpu-preferred' | 'cpu-only';
}

export interface RenderJobHandle {
  jobId: string;
  accepted: boolean;
  status: 'queued' | 'running' | 'completed' | 'cancelled' | 'failed' | 'simulated-ready';
  isSimulated: boolean;
  commandPreview: string;
}

export interface RenderProgressEvent {
  jobId: string;
  progressPct: number;
  currentFrame: number;
  totalFrames: number;
  fpsSpeed: number;
  etaSeconds: number;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
}

export interface EnhancementPreviewFrameRequest {
  mediaFilePath: string;
  timestampSec: number;
  enhancements: VideoEnhancementState;
  maxWidth: number;
}

export interface EnhancementPreviewFrameResult {
  frameDataUrl: string;
  appliedStages: string[];
  processingTimeMs: number;
  isSimulated: boolean;
}

export interface CreateProjectCommandInput {
  name: string;
  directory: string;
  width: number;
  height: number;
  fps: FrameRateOption;
  colorSpace: StudioProject['colorSpace'];
  initialWorkspace: 'auto-studio' | 'pro-editor';
}

/**
 * Authoritative Tauri 2 IPC command map (`invoke<Response>(command, payload)`).
 * Every method name maps 1:1 to a `#[tauri::command]` handler in `src-tauri/src/`.
 */
export interface FrameForgeRustCommands {
  get_engine_capabilities: {
    request: Record<string, never>;
    response: EngineCapabilities;
  };
  detect_hardware_profile: {
    request: { platformOverride?: HostPlatform };
    response: HardwareProfile;
  };
  probe_media_file: {
    request: { filePath: string };
    response: MediaAsset;
  };
  create_project: {
    request: CreateProjectCommandInput;
    response: StudioProject;
  };
  save_project_document: {
    request: { document: FrameForgeProjectDocument };
    response: { savedPath: string; bytesWritten: number; updatedAtIso: string };
  };
  load_project_document: {
    request: { filePath: string };
    response: FrameForgeProjectDocument;
  };
  auto_edit_analyze_and_plan: {
    request: RustAutoEditRequest;
    response: AutoEditPlanResult;
  };
  render_enhancement_preview_frame: {
    request: EnhancementPreviewFrameRequest;
    response: EnhancementPreviewFrameResult;
  };
  enqueue_ffmpeg_render: {
    request: RenderEncodeRequest;
    response: RenderJobHandle;
  };
  cancel_ffmpeg_render: {
    request: { jobId: string };
    response: { jobId: string; cancelled: boolean };
  };
}

/**
 * Unified frontend service interface implemented by both `mockEngineAdapter` (browser preview)
 * and `tauriEngineAdapter` (desktop Tauri 2 + Rust).
 */
export interface FrameForgeEngineService {
  readonly mode: EngineRuntimeMode;
  readonly isSimulated: boolean;
  getCapabilities(): Promise<EngineCapabilities>;
  detectHardwareProfile(platformOverride?: HostPlatform): Promise<HardwareProfile>;
  probeBrowserFile(file: File): Promise<MediaAsset>;
  probeNativePath(filePath: string): Promise<MediaAsset>;
  createProject(input: CreateProjectCommandInput): Promise<StudioProject>;
  saveProjectDocument(document: FrameForgeProjectDocument): Promise<{
    savedPath: string;
    bytesWritten: number;
    updatedAtIso: string;
  }>;
  loadProjectDocument(filePath: string): Promise<FrameForgeProjectDocument>;
  prepareAutoEditSummary(config: AutoStudioConfig, media: MediaAsset[]): Promise<{
    planId: string;
    estimatedCutCount: number;
    estimatedOutputDurationSec: number;
    pipelineStages: string[];
    requiresNativeEngine: true;
  }>;
  enqueueRenderJob(request: RenderEncodeRequest): Promise<RenderJobHandle>;
  cancelRenderJob(jobId: string): Promise<{ jobId: string; cancelled: boolean }>;
}
