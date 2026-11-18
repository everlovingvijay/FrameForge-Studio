import {
  AutoStudioConfig,
  AudioStudioState,
  ContainerFormat,
  ExportQueueJob,
  FrameRateOption,
  HardwareEncoderId,
  HardwareProfile,
  MediaAsset,
  OrientationPreset,
  RenderHistoryItem,
  ResolutionPreset,
  StudioProject,
  TimelineClip,
  TimelineMarker,
  TimelineSnapSettings,
  TimelineTrackState,
  VideoCodec,
  VideoEnhancementState,
} from '../types/studio';
import { RustAutoEditRequest, AutoEditSceneSegment } from '../types/autoEditEngine';
import {
  FFPROJ_SCHEMA_VERSION,
  FrameForgeProjectDocument,
} from '../types/projectSchema';
import { resolutionToDimensions } from '../utils/formatters';

export interface SerializeProjectInput {
  project: StudioProject;
  mediaPool: MediaAsset[];
  tracks: TimelineTrackState[];
  clips: TimelineClip[];
  markers: TimelineMarker[];
  snapSettings: TimelineSnapSettings;
  playheadSec: number;
  timelineZoom: number;
  enhancements: VideoEnhancementState;
  audio: AudioStudioState;
  autoStudio: AutoStudioConfig;
  renderHistory: RenderHistoryItem[];
}

export function serializeProjectDocument(
  input: SerializeProjectInput
): FrameForgeProjectDocument {
  const nowIso = new Date().toISOString();
  return {
    metadata: {
      id: input.project.id,
      name: input.project.name,
      schemaVersion: FFPROJ_SCHEMA_VERSION,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
      filePath: input.project.filePath,
      lastWorkspace: input.project.lastWorkspace,
    },
    sequence: {
      width: input.project.resolutionWidth,
      height: input.project.resolutionHeight,
      fps: input.project.fps,
      colorSpace: input.project.colorSpace,
      workingBitDepth: 10,
    },
    mediaIndex: input.mediaPool.map((asset) => ({
      id: asset.id,
      name: asset.name,
      relativePath: asset.name,
      absolutePath: asset.filePath,
      kind: asset.kind,
      durationSeconds: asset.durationSeconds,
      width: asset.width,
      height: asset.height,
      fps: asset.fps,
      codec: asset.codec,
      sampleRateHz: asset.sampleRateHz,
      bitrateMbps: asset.bitrateMbps,
      fileSizeBytes: asset.fileSizeBytes,
      hasAudio: asset.hasAudio,
    })),
    timeline: {
      tracks: input.tracks,
      clips: input.clips,
      markers: input.markers,
      snapSettings: input.snapSettings,
      playheadSec: input.playheadSec,
      zoom: input.timelineZoom,
    },
    enhancements: input.enhancements,
    audio: input.audio,
    autoStudio: input.autoStudio,
    renderHistory: input.renderHistory,
  };
}

export function estimateExportSizeMb(bitrateMbps: number, durationSeconds: number): number {
  return Math.max(8, Math.round((bitrateMbps * Math.max(1, durationSeconds)) / 8));
}

export function buildExportJobInput(params: {
  projectName: string;
  outputBaseName: string;
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
  durationSeconds: number;
}): Omit<ExportQueueJob, 'id' | 'progressPct' | 'status'> {
  const ext = params.container.toLowerCase();
  const cleanName = params.outputBaseName.trim() || 'FrameForge_Export';
  return {
    projectName: params.projectName,
    outputName: cleanName.endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`,
    resolution: params.resolution,
    customWidth: params.customWidth,
    customHeight: params.customHeight,
    orientation: params.orientation,
    codec: params.codec,
    container: params.container,
    fps: params.fps,
    bitrateMbps: params.bitrateMbps,
    qualityPreset: params.qualityPreset,
    encoder: params.computePreference === 'cpu-only' ? 'cpu-fallback' : params.encoder,
    computePreference: params.computePreference,
    estimatedSizeMb: estimateExportSizeMb(params.bitrateMbps, params.durationSeconds),
  };
}

export function buildRustAutoEditRequest(
  config: AutoStudioConfig,
  mediaPool: MediaAsset[],
  variantSeed: number,
  lockedScenes: AutoEditSceneSegment[] = []
): RustAutoEditRequest {
  const selected = mediaPool.filter((m) => config.selectedMediaIds.includes(m.id));
  const primaryVisual = selected.find((m) => m.kind !== 'audio') ?? selected[0];
  const dims = resolutionToDimensions(
    config.resolution,
    config.aspectRatio,
    config.customWidth,
    config.customHeight,
    primaryVisual?.width ?? 1920,
    primaryVisual?.height ?? 1080
  );

  return {
    presetId: config.presetId,
    mediaAssets: selected.map((m) => ({
      id: m.id,
      name: m.name,
      filePath: m.filePath,
      kind: m.kind,
      durationSeconds: m.durationSeconds,
      width: m.width,
      height: m.height,
      fps: m.fps,
      hasAudio: m.hasAudio,
    })),
    targetDurationMode: config.targetDurationMode,
    targetDurationSeconds: config.targetDurationSeconds,
    outputFormat: {
      aspectRatio: config.aspectRatio,
      width: dims.width,
      height: dims.height,
      resolutionTier: config.resolution,
      fps: config.frameRate,
    },
    flags: {
      bestMovementDetection: config.bestMovementDetection,
      sceneSelection: config.sceneSelection,
      motionBasedZoom: config.motionBasedZoom,
      subjectTracking: config.subjectTracking,
      automaticCrop: config.automaticCrop,
      videoStabilization: config.videoStabilization,
      colorCorrection: config.colorCorrection,
      noiseReduction: config.noiseReduction,
      audioEnhancement: config.audioEnhancement,
      silenceRemoval: config.silenceRemoval,
      automaticTransitions: config.automaticTransitions,
      musicSynchronization: config.musicSynchronization,
      speedRamps: config.speedRamps,
    },
    variantSeed,
    lockedScenes,
  };
}

export function computeStorageSummary(hardware: HardwareProfile): {
  usedGb: number;
  usedPct: number;
} {
  const usedGb = Math.max(0, hardware.storageTotalGb - hardware.storageAvailableGb);
  const usedPct = hardware.storageTotalGb > 0
    ? Math.round((usedGb / hardware.storageTotalGb) * 100)
    : 0;
  return { usedGb, usedPct };
}
