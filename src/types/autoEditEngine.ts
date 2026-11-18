import {
  AspectRatioPreset,
  AutoPresetId,
  ContainerFormat,
  FrameRateOption,
  HardwareEncoderId,
  MediaAsset,
  ResolutionPreset,
  VideoCodec,
} from './studio';

/**
 * Deterministic local algorithms + optional offline ONNX inference toggles
 * passed to the future Tauri 2 + Rust Auto Edit Engine.
 */
export interface AutoEditPipelineFlags {
  bestMovementDetection: boolean;
  sceneSelection: boolean;
  motionBasedZoom: boolean;
  subjectTracking: boolean;
  automaticCrop: boolean;
  videoStabilization: boolean;
  colorCorrection: boolean;
  noiseReduction: boolean;
  audioEnhancement: boolean;
  silenceRemoval: boolean;
  automaticTransitions: boolean;
  musicSynchronization: boolean;
  speedRamps: boolean;
}

export type AutoSceneTransition = 'Cut' | 'Cross Dissolve' | 'Dip to Black' | 'Whip Pan' | 'Match Cut';

export interface AutoEditSceneSegment {
  id: string;
  orderIndex: number;
  mediaId: string;
  mediaName: string;
  thumbnailUrl: string;
  kind: 'video' | 'image';
  startSec: number;
  durationSec: number;
  sourceInSec: number;
  sourceOutSec: number;
  locked: boolean;
  motionScore: number;
  speedMultiplier: number;
  transitionIn: AutoSceneTransition;
  appliedEffects: string[];
  selectionRationale: string;
}

export interface AutoEditOutputFormat {
  aspectRatio: AspectRatioPreset;
  width: number;
  height: number;
  resolutionTier: ResolutionPreset;
  fps: FrameRateOption;
}

export interface AutoEditPlanResult {
  planId: string;
  variantIndex: number;
  seed: number;
  presetId: AutoPresetId;
  presetName: string;
  selectedClips: MediaAsset[];
  audioBedClip: MediaAsset | null;
  timelineScenes: AutoEditSceneSegment[];
  appliedEffects: string[];
  estimatedOutputDurationSec: number;
  estimatedCutCount: number;
  outputFormat: AutoEditOutputFormat;
  pipelineStages: string[];
  engineMode: 'deterministic-local-preview' | 'tauri-rust-native';
  requiresNativeEngine: true;
  createdAt: string;
}

/**
 * Typed IPC request payload for the Rust `auto_edit_assemble` command.
 */
export interface RustAutoEditRequest {
  presetId: AutoPresetId;
  mediaAssets: Pick<
    MediaAsset,
    'id' | 'name' | 'filePath' | 'kind' | 'durationSeconds' | 'width' | 'height' | 'fps' | 'hasAudio'
  >[];
  targetDurationMode: 'auto' | 'custom';
  targetDurationSeconds: number;
  outputFormat: AutoEditOutputFormat;
  flags: AutoEditPipelineFlags;
  variantSeed: number;
  lockedScenes: AutoEditSceneSegment[];
}

export interface AutoEditExportConfig {
  outputFileName: string;
  codec: VideoCodec;
  container: ContainerFormat;
  qualityPreset: 'Draft' | 'Balanced' | 'High' | 'Master';
  bitrateMbps: number;
  encoder: HardwareEncoderId;
  computePreference: 'gpu-preferred' | 'cpu-only';
}

export interface RustAutoEditEngineBridge {
  readonly mode: 'deterministic-local-preview' | 'tauri-rust-native';
  generateEditPlan(
    request: RustAutoEditRequest,
    sourcePool: MediaAsset[]
  ): Promise<AutoEditPlanResult>;
  regenerateAlternativePlan(
    request: RustAutoEditRequest,
    sourcePool: MediaAsset[],
    currentPlan: AutoEditPlanResult
  ): Promise<AutoEditPlanResult>;
  replaceSceneMedia(
    plan: AutoEditPlanResult,
    sceneId: string,
    replacementAsset: MediaAsset
  ): AutoEditPlanResult;
  toggleSceneLock(plan: AutoEditPlanResult, sceneId: string): AutoEditPlanResult;
  updateSceneConfiguration(
    plan: AutoEditPlanResult,
    sceneId: string,
    partial: Partial<Pick<AutoEditSceneSegment, 'appliedEffects' | 'transitionIn' | 'speedMultiplier' | 'durationSec'>>
  ): AutoEditPlanResult;
}
