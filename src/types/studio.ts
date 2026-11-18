import {
  AutoEditExportConfig,
  AutoEditPipelineFlags,
  AutoSceneTransition,
} from './autoEditEngine';

export type NavSection =
  | 'home'
  | 'auto-studio'
  | 'pro-editor'
  | 'enhancements'
  | 'audio'
  | 'presets'
  | 'export'
  | 'projects'
  | 'hardware'
  | 'settings';

export type HostPlatform = 'macos-apple-silicon' | 'windows-nvidia' | 'windows-intel-amd' | 'linux-cpu';

export type HardwareEncoderId =
  | 'videotoolbox'
  | 'nvenc'
  | 'qsv'
  | 'amf'
  | 'cpu-fallback';

export type ResolutionPreset = '720p' | '1080p' | '2K' | '4K' | '8K' | 'custom';
export type AspectRatioPreset = '16:9' | '9:16' | '1:1' | '4:5' | '3:4' | '21:9' | 'original' | 'custom';
export type OrientationPreset = 'landscape' | 'portrait' | 'square' | 'custom';
export type FrameRateOption = 23.976 | 24 | 25 | 29.97 | 30 | 50 | 60 | 120;

export type VideoCodec = 'H.264' | 'H.265' | 'AV1';
export type ContainerFormat = 'MP4' | 'MOV' | 'MKV' | 'WebM';

export type AutoPresetId =
  | 'cinematic-film'
  | 'travel-vlog'
  | 'portrait-beauty'
  | 'landscape-pro'
  | 'sports-action'
  | 'wedding'
  | 'product-showcase'
  | 'talking-head'
  | 'night-footage-rescue'
  | 'social-media-reel'
  | 'documentary'
  | 'vintage-film';

export interface AutoPresetDefinition {
  id: AutoPresetId;
  name: string;
  category: 'Narrative' | 'Creator' | 'Commercial' | 'Restoration';
  summary: string;
  cutCadence: string;
  cutRangeSec: [number, number];
  colorProfile: string;
  transitionStyle: string;
  defaultTransition: AutoSceneTransition;
  audioTargetLufs: number;
  previewFilterCss: string;
  defaultAspectRatio: AspectRatioPreset;
  defaultFps: FrameRateOption;
  recommendedSettings: AutoEditPipelineFlags;
}

export interface AutoStudioConfig extends AutoEditPipelineFlags {
  presetId: AutoPresetId;
  selectedMediaIds: string[];
  targetDurationMode: 'auto' | 'custom';
  targetDurationSeconds: number;
  aspectRatio: AspectRatioPreset;
  customAspectWidth: number;
  customAspectHeight: number;
  resolution: ResolutionPreset;
  customWidth: number;
  customHeight: number;
  frameRate: FrameRateOption;
  exportConfig: AutoEditExportConfig;
}

export interface MediaAsset {
  id: string;
  name: string;
  filePath: string;
  folder?: string;
  kind: 'video' | 'audio' | 'image';
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  sampleRateHz?: number;
  bitrateMbps: number;
  fileSizeBytes: number;
  thumbnailUrl: string;
  objectUrl?: string;
  source: 'sample' | 'local-file';
  hasAudio: boolean;
  importedAt: string;
}

export interface StudioProject {
  id: string;
  name: string;
  filePath: string;
  thumbnailUrl: string;
  resolutionWidth: number;
  resolutionHeight: number;
  fps: FrameRateOption;
  colorSpace: 'Rec.709' | 'Rec.2020 HLG' | 'sRGB' | 'Apple Log';
  durationSeconds: number;
  clipCount: number;
  diskSizeMb: number;
  lastModified: string;
  lastWorkspace: 'auto-studio' | 'pro-editor';
}

export interface RenderHistoryItem {
  id: string;
  projectName: string;
  outputFileName: string;
  outputPath: string;
  resolutionLabel: string;
  codec: VideoCodec;
  container: ContainerFormat;
  encoder: HardwareEncoderId;
  durationSeconds: number;
  fileSizeMb: number;
  renderTimeSeconds: number;
  completedAt: string;
  status: 'completed' | 'failed' | 'cancelled';
}

export interface ExportQueueJob {
  id: string;
  projectName: string;
  outputName: string;
  resolution: ResolutionPreset;
  customWidth: number;
  customHeight: number;
  orientation: OrientationPreset;
  codec: VideoCodec;
  container: ContainerFormat;
  fps: FrameRateOption;
  bitrateMbps: number;
  qualityPreset: 'Draft' | 'Balanced' | 'High' | 'Master';
  encoder: HardwareEncoderId;
  computePreference: 'gpu-preferred' | 'cpu-only';
  progressPct: number;
  status: 'queued' | 'simulated-ready' | 'cancelled' | 'failed';
  estimatedSizeMb: number;
}

export interface HardwareProfile {
  platform: HostPlatform;
  osLabel: string;
  cpuModel: string;
  cpuCores: number;
  ramTotalGb: number;
  ramAvailableGb: number;
  gpuModel: string;
  vramGb: number;
  storageVolumeName: string;
  storageTotalGb: number;
  storageAvailableGb: number;
  scratchDiskPath: string;
  availableEncoders: {
    id: HardwareEncoderId;
    label: string;
    vendor: string;
    decodeSupport: boolean;
    encodeSupport: boolean;
    codecs: VideoCodec[];
    available: boolean;
    notes: string;
  }[];
  activeEncoderId: HardwareEncoderId;
  isSimulated: true;
}

export type EnhancementCategoryId =
  | 'basic'
  | 'color'
  | 'detail'
  | 'noise'
  | 'portrait'
  | 'motion'
  | 'camera-sim'
  | 'advanced';

export type CameraSimulationId =
  | 'none'
  | 'budget-android'
  | 'older-smartphone'
  | 'standard-hd-mobile'
  | 'premium-smartphone'
  | 'professional-camera'
  | 'low-light-phone';

export type EnhancementLutId =
  | 'none'
  | 'rec709-natural'
  | 'kodak-2383'
  | 'teal-orange'
  | 'fuji-eterna'
  | 'monochrome-hi';

export interface VideoEnhancementState {
  // 1. Basic adjustments (Genuine Restoration)
  exposure: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;

  // 2. Color (Genuine Restoration)
  temperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
  redChannel: number;
  greenChannel: number;
  blueChannel: number;
  curveLift: number;
  curveGamma: number;
  curveGain: number;
  lutId: EnhancementLutId;
  lutIntensity: number;

  // 3. Detail (Genuine Restoration)
  sharpness: number;
  clarity: number;
  texture: number;
  deblocking: number;
  detailRecovery: number;

  // 4. Noise (Genuine Restoration)
  lumaNoiseReduction: number;
  chromaNoiseReduction: number;
  temporalDenoising: number;
  noiseReduction: number;
  grain: number;

  // 5. Portrait (Genuine Restoration)
  portraitSmoothingEnabled: boolean;
  smoothing: number;
  faceAwareAdjustments: number;
  skinTonePreservation: number;

  // 6. Motion (Genuine Restoration)
  stabilization: number;
  motionBlur: number;
  opticalFlow: number;
  slowMotionRate: number;
  speedRampIntensity: number;

  // 7. Camera simulation (Stylistic Simulation)
  cameraSimulation: CameraSimulationId;
  cameraSimulationIntensity: number;

  // 8. Advanced (Stylistic Optical FX & Framing)
  vignette: number;
  lensDistortion: number;
  chromaticAberration: number;
  filmGrain: number;
  cinematicEffects: number;
  zoom: number;
  cropPercent: number;
  rotationDeg: number;
}

export interface CustomEnhancementPreset {
  id: string;
  name: string;
  classification: 'restoration' | 'stylistic' | 'hybrid';
  notes: string;
  createdAt: string;
  isBuiltIn?: boolean;
  state: VideoEnhancementState;
}

export interface AudioStudioState {
  noiseReduction: number;
  voiceEnhancement: number;
  eqLowDb: number;
  eqLowMidDb: number;
  eqMidDb: number;
  eqHighMidDb: number;
  eqHighDb: number;
  compressorThresholdDb: number;
  compressorRatio: number;
  limiterCeilingDb: number;
  targetLufs: number;
  normalizationEnabled: boolean;
  silenceDetectionEnabled: boolean;
  silenceThresholdDb: number;
  fadeInSec: number;
  fadeOutSec: number;
  musicDuckingDb: number;
  tracks: {
    id: string;
    name: string;
    role: 'Dialogue' | 'Music' | 'SFX';
    volumeDb: number;
    pan: number;
    muted: boolean;
    solo: boolean;
  }[];
}

export type TimelineTrackId = 'V3' | 'V2' | 'V1' | 'A1' | 'A2' | 'A3';

export interface TimelineTrackState {
  id: TimelineTrackId;
  label: string;
  kind: 'video' | 'audio';
  locked: boolean;
  visible: boolean;
  muted: boolean;
  solo: boolean;
}

export type KeyframeProperty = 'position' | 'scale' | 'rotation' | 'opacity' | 'volume';

export type EasingPresetId = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'hold' | 'custom';

export interface ClipKeyframe {
  id: string;
  timeOffsetSec: number;
  property: KeyframeProperty;
  valueLabel: string;
  numericValue?: number;
  easing?: EasingPresetId;
  bezierHandles?: [number, number, number, number];
}

export type PreviewQuality = 'Full' | '1/2' | '1/4';
export type PreviewAspect = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';

export interface TimelineClip {
  id: string;
  mediaId: string;
  trackId: TimelineTrackId;
  kind?: 'video' | 'audio' | 'image';
  label: string;
  startSec: number;
  durationSec: number;
  trimInSec: number;
  speed: number;
  transitionIn?: 'Cross Dissolve' | 'Dip to Black' | 'Whip Pan' | 'None';
  transitionDurationSec?: number;
  textOverlay?: string;
  positionX?: number;
  positionY?: number;
  scalePct?: number;
  rotationDeg?: number;
  cropTopPct?: number;
  cropRightPct?: number;
  cropBottomPct?: number;
  cropLeftPct?: number;
  opacityPct?: number;
  exposure?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  volumeDb?: number;
  audioMuted?: boolean;
  audioDuckingEnabled?: boolean;
  audioDuckingDb?: number;
  keyframesCount: number;
  keyframes?: ClipKeyframe[];
  thumbnailUrl?: string;
}

export type MarkerCategory = 'Story Beat' | 'Transition Point' | 'Audio Cue' | 'Note';

export interface TimelineMarker {
  id: string;
  timeSec: number;
  label: string;
  color: 'amber' | 'sky' | 'emerald' | 'rose';
  category?: MarkerCategory;
  notes?: string;
}

export interface TimelineSnapSettings {
  enabled: boolean;
  snapToClips: boolean;
  snapToMarkers: boolean;
  snapToTransitions: boolean;
  snapToPlayhead: boolean;
  snapToGrid: boolean;
  tolerancePx: number;
}

export interface AppSettingsState {
  projectDirectory: string;
  scratchDirectory: string;
  sqliteCatalogPath: string;
  autosaveIntervalMin: number;
  proxyGenerationMode: 'off' | 'above-4k' | 'always';
  defaultFrameRate: FrameRateOption;
  defaultColorSpace: 'Rec.709' | 'Rec.2020 HLG' | 'sRGB';
  portableProjectFormat: '.ffproj (SQLite + Manifest)';
  telemetryOptIn: false;
  offlineVerificationMode: boolean;
}

/**
 * Typed IPC contract intended for Tauri 2 Rust backend (`invoke(...)`).
 */
export interface FrameForgeNativeBridge {
  readonly mode: 'browser-preview' | 'tauri-rust';
  detectHardwareProfile(platformOverride?: HostPlatform): Promise<HardwareProfile>;
  probeLocalMediaFile(file: File): Promise<MediaAsset>;
  createProject(input: {
    name: string;
    directory: string;
    width: number;
    height: number;
    fps: FrameRateOption;
    colorSpace: StudioProject['colorSpace'];
    initialWorkspace: 'auto-studio' | 'pro-editor';
  }): Promise<StudioProject>;
  prepareAutoEditPlan(config: AutoStudioConfig, media: MediaAsset[]): Promise<{
    planId: string;
    estimatedCutCount: number;
    estimatedOutputDurationSec: number;
    pipelineStages: string[];
    requiresNativeEngine: true;
  }>;
}
