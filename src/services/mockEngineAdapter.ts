import { buildHardwareProfile } from '../data/studioMocks';
import {
  CreateProjectCommandInput,
  EngineCapabilities,
  FrameForgeEngineService,
  RenderEncodeRequest,
  RenderJobHandle,
} from '../types/rustEngine';
import { FrameForgeProjectDocument } from '../types/projectSchema';
import {
  AutoStudioConfig,
  HardwareProfile,
  HostPlatform,
  MediaAsset,
  StudioProject,
} from '../types/studio';

function formatNowTime(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Browser-only simulated adapter implementing `FrameForgeEngineService`.
 * Clearly marks all hardware, project persistence, and render capabilities as simulated
 * until connected to the Tauri 2 + Rust native desktop backend.
 */
export const mockEngineAdapter: FrameForgeEngineService = {
  mode: 'browser-mock',
  isSimulated: true,

  async getCapabilities(): Promise<EngineCapabilities> {
    return {
      runtime: 'browser-mock',
      ffmpegAvailable: false,
      ffprobeAvailable: false,
      opencvAvailable: false,
      sqliteAvailable: false,
      onnxRuntimeAvailable: false,
      isSimulated: true,
    };
  },

  async detectHardwareProfile(platformOverride?: HostPlatform): Promise<HardwareProfile> {
    const inferred: HostPlatform =
      platformOverride ??
      (typeof navigator !== 'undefined' && /Win/i.test(navigator.platform)
        ? 'windows-nvidia'
        : 'macos-apple-silicon');
    return buildHardwareProfile(inferred);
  },

  async probeBrowserFile(file: File): Promise<MediaAsset> {
    const objectUrl = URL.createObjectURL(file);
    const isAudio = file.type.startsWith('audio/');
    const isImage = file.type.startsWith('image/');
    const kind: MediaAsset['kind'] = isAudio ? 'audio' : isImage ? 'image' : 'video';

    let width = 1920;
    let height = 1080;
    let durationSeconds = isImage ? 5 : 15;

    if (kind === 'video') {
      await new Promise<void>((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = objectUrl;
        video.onloadedmetadata = () => {
          width = video.videoWidth || 1920;
          height = video.videoHeight || 1080;
          durationSeconds =
            Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 12;
          resolve();
        };
        video.onerror = () => resolve();
      });
    } else if (kind === 'audio') {
      await new Promise<void>((resolve) => {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.src = objectUrl;
        audio.onloadedmetadata = () => {
          durationSeconds =
            Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 30;
          width = 0;
          height = 0;
          resolve();
        };
        audio.onerror = () => resolve();
      });
    } else {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.src = objectUrl;
        img.onload = () => {
          width = img.naturalWidth || 1920;
          height = img.naturalHeight || 1080;
          resolve();
        };
        img.onerror = () => resolve();
      });
    }

    const ext = file.name.split('.').pop()?.toUpperCase() || 'MEDIA';

    return {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      filePath: `Local Browser File · ${file.name}`,
      folder: isAudio ? 'Audio Stems' : isImage ? 'Stills & Titles' : 'Imported',
      kind,
      durationSeconds: Math.round(durationSeconds * 10) / 10,
      width,
      height,
      fps: 30,
      codec: `${ext} (Browser Probe)`,
      bitrateMbps: Math.max(
        2,
        Math.round(((file.size * 8) / Math.max(durationSeconds, 1)) / 1_000_000)
      ),
      fileSizeBytes: file.size,
      thumbnailUrl: isImage
        ? objectUrl
        : '/src/assets/images/clip_alpine_aerial_1795031196673.jpg',
      objectUrl,
      source: 'local-file',
      hasAudio: kind !== 'image',
      importedAt: `Today, ${formatNowTime()}`,
    };
  },

  async probeNativePath(filePath: string): Promise<MediaAsset> {
    throw new Error(
      `Native FFprobe path inspection requires Tauri 2 desktop runtime (path: ${filePath}).`
    );
  },

  async createProject(input: CreateProjectCommandInput): Promise<StudioProject> {
    const safeSlug =
      input.name.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'Untitled_Project';
    return {
      id: `proj-${Date.now()}`,
      name: input.name.trim() || 'Untitled Project',
      filePath: `${input.directory.replace(/\/$/, '')}/${safeSlug}.ffproj`,
      thumbnailUrl: '/src/assets/images/clip_alpine_aerial_1795031196673.jpg',
      resolutionWidth: input.width,
      resolutionHeight: input.height,
      fps: input.fps,
      colorSpace: input.colorSpace,
      durationSeconds: 0,
      clipCount: 0,
      diskSizeMb: 12,
      lastModified: `Today, ${formatNowTime()}`,
      lastWorkspace: input.initialWorkspace,
    };
  },

  async saveProjectDocument(document: FrameForgeProjectDocument) {
    const serialized = JSON.stringify(document);
    return {
      savedPath: document.metadata.filePath,
      bytesWritten: serialized.length,
      updatedAtIso: new Date().toISOString(),
    };
  },

  async loadProjectDocument(filePath: string): Promise<FrameForgeProjectDocument> {
    throw new Error(
      `Native disk `.concat(`loadProjectDocument(${filePath}) requires Tauri 2 + SQLite runtime.`)
    );
  },

  async prepareAutoEditSummary(config: AutoStudioConfig, media: MediaAsset[]) {
    const selected = media.filter((m) => config.selectedMediaIds.includes(m.id));
    const totalRawSec = selected.reduce((sum, item) => sum + item.durationSeconds, 0);
    const estimatedOutputDurationSec =
      config.targetDurationMode === 'custom'
        ? config.targetDurationSeconds
        : Math.max(15, Math.min(90, Math.round(totalRawSec * 0.42)));

    const stages: string[] = [
      'FFprobe stream & color metadata inspection (Planned Rust IPC)',
      config.bestMovementDetection
        ? 'OpenCV optical-flow & highlight scoring pass (Planned Native)'
        : 'Chronological scene segmentation (Planned Native)',
      config.videoStabilization
        ? '2-pass camera motion stabilization matrix'
        : 'Direct frame pass-through',
      config.colorCorrection ? '3D LUT & tone-curve transform' : 'Bypass color transform',
      config.audioEnhancement
        ? 'Loudness normalization (-14 LUFS) & spectral denoise'
        : 'Bypass audio DSP',
      `Assemble timeline at ${config.aspectRatio} · ${config.resolution} @ ${config.frameRate}fps`,
    ];

    return {
      planId: `plan-${Date.now()}`,
      estimatedCutCount: Math.max(4, Math.round(estimatedOutputDurationSec / 2.6)),
      estimatedOutputDurationSec,
      pipelineStages: stages,
      requiresNativeEngine: true as const,
    };
  },

  async enqueueRenderJob(request: RenderEncodeRequest): Promise<RenderJobHandle> {
    return {
      jobId: request.jobId,
      accepted: true,
      status: 'simulated-ready',
      isSimulated: true,
      commandPreview: `ffmpeg -i "${request.projectDocument.metadata.filePath}" -s ${request.width}x${request.height} -r ${request.fps} -b:v ${request.bitrateMbps}M "${request.outputPath}"`,
    };
  },

  async cancelRenderJob(jobId: string) {
    return { jobId, cancelled: true };
  },
};
