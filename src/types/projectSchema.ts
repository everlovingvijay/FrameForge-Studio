import { AutoStudioConfig, AudioStudioState, FrameRateOption, MediaAsset, RenderHistoryItem, TimelineClip, TimelineMarker, TimelineSnapSettings, TimelineTrackState, VideoEnhancementState } from './studio';

/**
 * Semantic version of the portable `.ffproj` JSON/SQLite manifest format.
 * Both the TypeScript frontend and Rust `serde` backend validate against this version.
 */
export const FFPROJ_SCHEMA_VERSION = '1.0.0' as const;

export type ProjectColorSpace = 'Rec.709' | 'Rec.2020 HLG' | 'sRGB' | 'Apple Log';

export interface ProjectMetadata {
  id: string;
  name: string;
  schemaVersion: typeof FFPROJ_SCHEMA_VERSION;
  createdAtIso: string;
  updatedAtIso: string;
  filePath: string;
  lastWorkspace: 'auto-studio' | 'pro-editor';
}

export interface ProjectVideoSequenceSettings {
  width: number;
  height: number;
  fps: FrameRateOption;
  colorSpace: ProjectColorSpace;
  workingBitDepth: 8 | 10 | 32;
}

export interface ProjectMediaReference {
  id: string;
  name: string;
  relativePath: string;
  absolutePath: string;
  kind: MediaAsset['kind'];
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  sampleRateHz?: number;
  bitrateMbps: number;
  fileSizeBytes: number;
  hasAudio: boolean;
  checksumSha256?: string;
  proxyFilePath?: string;
}

export interface ProjectTimelineDocument {
  tracks: TimelineTrackState[];
  clips: TimelineClip[];
  markers: TimelineMarker[];
  snapSettings: TimelineSnapSettings;
  playheadSec: number;
  zoom: number;
}

/**
 * Portable `.ffproj` document manifest persisted locally on disk alongside SQLite index entries.
 * Zero cloud dependencies; designed for deterministic Windows/macOS portability.
 */
export interface FrameForgeProjectDocument {
  metadata: ProjectMetadata;
  sequence: ProjectVideoSequenceSettings;
  mediaIndex: ProjectMediaReference[];
  timeline: ProjectTimelineDocument;
  enhancements: VideoEnhancementState;
  audio: AudioStudioState;
  autoStudio: AutoStudioConfig;
  renderHistory: RenderHistoryItem[];
}

/**
 * Lightweight SQLite catalog row summarizing a `.ffproj` project without loading full timelines.
 */
export interface SqliteProjectCatalogRow {
  id: string;
  name: string;
  filePath: string;
  schemaVersion: string;
  width: number;
  height: number;
  fps: FrameRateOption;
  colorSpace: ProjectColorSpace;
  durationSeconds: number;
  clipCount: number;
  diskSizeMb: number;
  updatedAtIso: string;
  lastWorkspace: 'auto-studio' | 'pro-editor';
}
