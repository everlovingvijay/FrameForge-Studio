import { create } from 'zustand';
import { AUTO_PRESETS } from '../config/autoPresets';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_AUDIO_STATE,
  DEFAULT_SNAP_SETTINGS,
  DEFAULT_TIMELINE_TRACKS,
  INITIAL_ENHANCEMENT_PRESETS,
  INITIAL_VIDEO_ENHANCEMENTS,
  NEUTRAL_VIDEO_ENHANCEMENTS,
} from '../config/defaults';
import { classifyEnhancementState } from '../config/enhancementProfiles';
import {
  buildHardwareProfile,
  INITIAL_EXPORT_QUEUE,
  INITIAL_PROJECTS,
  INITIAL_RENDER_HISTORY,
  INITIAL_TIMELINE_CLIPS,
  INITIAL_TIMELINE_MARKERS,
  SAMPLE_MEDIA_ASSETS,
} from '../data/studioMocks';
import { autoEditEngine } from '../services/autoEditEngine';
import { engineClient } from '../services/engineClient';
import {
  buildRustAutoEditRequest,
  serializeProjectDocument,
} from '../services/projectService';
import {
  AutoEditPlanResult,
  AutoEditSceneSegment,
} from '../types/autoEditEngine';
import { FrameForgeProjectDocument } from '../types/projectSchema';
import {
  AppSettingsState,
  AudioStudioState,
  AutoPresetId,
  AutoStudioConfig,
  ClipKeyframe,
  CustomEnhancementPreset,
  ExportQueueJob,
  HardwareEncoderId,
  HardwareProfile,
  HostPlatform,
  KeyframeProperty,
  MarkerCategory,
  MediaAsset,
  NavSection,
  PreviewAspect,
  PreviewQuality,
  RenderHistoryItem,
  StudioProject,
  TimelineClip,
  TimelineMarker,
  TimelineSnapSettings,
  TimelineTrackId,
  TimelineTrackState,
  VideoEnhancementState,
} from '../types/studio';
import { resolutionToDimensions } from '../utils/formatters';
import {
  createTimelineClipFromAsset,
  splitClipAtTime,
  trimClipEdgeAtTime,
} from '../utils/timelineOperations';

interface StudioState {
  activeSection: NavSection;
  sidebarCollapsed: boolean;
  projects: StudioProject[];
  activeProjectId: string;
  mediaPool: MediaAsset[];
  renderHistory: RenderHistoryItem[];
  exportQueue: ExportQueueJob[];
  hardware: HardwareProfile;
  autoConfig: AutoStudioConfig;
  autoPlanPreview: AutoEditPlanResult | null;
  enhancements: VideoEnhancementState;
  enhancementPresets: CustomEnhancementPreset[];
  audio: AudioStudioState;
  timelineTracks: TimelineTrackState[];
  timelineClips: TimelineClip[];
  timelineHistoryPast: TimelineClip[][];
  timelineHistoryFuture: TimelineClip[][];
  timelineMarkers: TimelineMarker[];
  snapSettings: TimelineSnapSettings;
  timelineZoom: number;
  playheadSec: number;
  isPlayingPreview: boolean;
  previewSpeed: 0.5 | 1 | 1.5 | 2;
  previewQuality: PreviewQuality;
  previewAspect: PreviewAspect;
  selectedClipId: string | null;
  selectedMarkerId: string | null;
  appSettings: AppSettingsState;

  // Modals
  isNewProjectModalOpen: boolean;
  isImportMediaModalOpen: boolean;
  isOpenProjectModalOpen: boolean;

  // Actions
  setActiveSection: (section: NavSection) => void;
  toggleSidebar: () => void;
  openNewProjectModal: (open: boolean) => void;
  openImportMediaModal: (open: boolean) => void;
  openProjectPickerModal: (open: boolean) => void;
  selectProject: (projectId: string, navigateToWorkspace?: boolean) => void;
  createAndActivateProject: (input: {
    name: string;
    directory: string;
    width: number;
    height: number;
    fps: StudioProject['fps'];
    colorSpace: StudioProject['colorSpace'];
    initialWorkspace: 'auto-studio' | 'pro-editor';
  }) => Promise<void>;
  deleteProject: (projectId: string) => void;
  importFilesFromBrowser: (files: FileList | File[]) => Promise<MediaAsset[]>;
  removeMediaAsset: (mediaId: string) => void;
  switchSimulatedPlatform: (platform: HostPlatform) => void;
  setActiveHardwareEncoder: (encoderId: HardwareEncoderId) => void;

  // Auto Studio Actions
  applyAutoPreset: (presetId: AutoPresetId) => void;
  updateAutoConfig: (partial: Partial<AutoStudioConfig>) => void;
  toggleAutoMediaSelection: (mediaId: string) => void;
  generateAutoPlanPreview: () => Promise<void>;
  regenerateAutoPlanVariant: () => Promise<void>;
  replaceAutoPlanSceneClip: (sceneId: string, replacementMediaId: string) => void;
  toggleAutoPlanSceneLock: (sceneId: string) => void;
  updateAutoPlanScene: (
    sceneId: string,
    partial: Partial<Pick<AutoEditSceneSegment, 'appliedEffects' | 'transitionIn' | 'speedMultiplier' | 'durationSec'>>
  ) => void;
  sendAutoPlanToTimeline: () => void;
  queueAutoPlanExport: () => void;

  // Pro Editor Actions
  setTimelineZoom: (zoom: number) => void;
  setPlayheadSec: (sec: number) => void;
  togglePreviewPlayback: () => void;
  setPreviewSpeed: (speed: 0.5 | 1 | 1.5 | 2) => void;
  setPreviewQuality: (quality: PreviewQuality) => void;
  setPreviewAspect: (aspect: PreviewAspect) => void;
  selectTimelineClip: (clipId: string | null) => void;
  recordTimelineSnapshot: () => void;
  undoTimeline: () => void;
  redoTimeline: () => void;
  splitSelectedClipAtPlayhead: () => void;
  trimSelectedClipToPlayhead: (edge: 'in' | 'out') => void;
  deleteSelectedClip: () => void;
  updateClipProperties: (clipId: string, partial: Partial<TimelineClip>) => void;
  moveTimelineClip: (clipId: string, startSec: number, trackId?: TimelineTrackId) => void;
  trimTimelineClip: (clipId: string, startSec: number, durationSec: number, trimInSec?: number) => void;
  addMediaToTimeline: (asset: MediaAsset, trackId?: TimelineTrackId) => void;
  toggleTrackLock: (trackId: TimelineTrackId) => void;
  toggleTrackVisibility: (trackId: TimelineTrackId) => void;
  toggleTrackMute: (trackId: TimelineTrackId) => void;
  toggleTrackSolo: (trackId: TimelineTrackId) => void;
  toggleClipKeyframe: (clipId: string, property: KeyframeProperty) => void;
  upsertClipKeyframe: (clipId: string, keyframe: ClipKeyframe) => void;
  replacePropertyKeyframes: (clipId: string, property: KeyframeProperty, nextForProperty: ClipKeyframe[]) => void;
  removeClipKeyframe: (clipId: string, keyframeId: string) => void;
  jumpToClipKeyframe: (clipId: string, direction: 'prev' | 'next') => void;
  toggleSnapping: () => void;
  updateSnapSettings: (partial: Partial<TimelineSnapSettings>) => void;
  selectMarker: (markerId: string | null) => void;
  addMarkerAtPlayhead: (input?: {
    label?: string;
    color?: TimelineMarker['color'];
    category?: MarkerCategory;
    notes?: string;
  }) => void;
  updateMarker: (markerId: string, partial: Partial<TimelineMarker>) => void;
  deleteMarker: (markerId: string) => void;
  jumpToAdjacentMarker: (direction: 'prev' | 'next') => void;

  // Enhancements & Audio
  updateEnhancement: <K extends keyof VideoEnhancementState>(key: K, value: VideoEnhancementState[K]) => void;
  updateEnhancementsBatch: (partial: Partial<VideoEnhancementState>) => void;
  resetEnhancements: () => void;
  resetEnhancementCategory: (keys: (keyof VideoEnhancementState)[]) => void;
  saveCustomEnhancementPreset: (input: { name: string; notes?: string }) => void;
  applyCustomEnhancementPreset: (presetId: string) => void;
  deleteCustomEnhancementPreset: (presetId: string) => void;
  updateAudioState: (partial: Partial<AudioStudioState>) => void;
  toggleAudioTrackFlag: (trackId: string, flag: 'muted' | 'solo') => void;
  updateAudioTrackVolume: (trackId: string, volumeDb: number) => void;

  // Export Queue
  addExportJob: (job: Omit<ExportQueueJob, 'id' | 'progressPct' | 'status'>) => void;
  cancelExportJob: (jobId: string) => void;
  retryExportJob: (jobId: string) => void;
  removeExportJob: (jobId: string) => void;

  // App Settings & Portable Schema Export
  updateAppSettings: (partial: Partial<AppSettingsState>) => void;
  exportActiveProjectDocument: () => FrameForgeProjectDocument | null;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  activeSection: 'home',
  sidebarCollapsed: false,
  projects: INITIAL_PROJECTS,
  activeProjectId: INITIAL_PROJECTS[0].id,
  mediaPool: SAMPLE_MEDIA_ASSETS,
  renderHistory: INITIAL_RENDER_HISTORY,
  exportQueue: INITIAL_EXPORT_QUEUE,
  hardware: buildHardwareProfile('macos-apple-silicon'),
  autoConfig: {
    presetId: 'cinematic-film',
    selectedMediaIds: ['med-alpine-01', 'med-surf-04', 'med-tokyo-02', 'med-audio-score-06'],
    targetDurationMode: 'auto',
    targetDurationSeconds: 45,
    aspectRatio: '21:9',
    customAspectWidth: 21,
    customAspectHeight: 9,
    resolution: '4K',
    customWidth: 3840,
    customHeight: 1646,
    frameRate: 24,
    bestMovementDetection: true,
    sceneSelection: true,
    motionBasedZoom: false,
    subjectTracking: true,
    automaticCrop: true,
    videoStabilization: true,
    colorCorrection: true,
    noiseReduction: false,
    audioEnhancement: true,
    silenceRemoval: false,
    automaticTransitions: true,
    musicSynchronization: true,
    speedRamps: false,
    exportConfig: {
      outputFileName: 'AutoStudio_Cinematic_Master',
      codec: 'H.265',
      container: 'MP4',
      qualityPreset: 'High',
      bitrateMbps: 42,
      encoder: 'videotoolbox',
      computePreference: 'gpu-preferred',
    },
  },
  autoPlanPreview: null,
  enhancements: INITIAL_VIDEO_ENHANCEMENTS,
  enhancementPresets: INITIAL_ENHANCEMENT_PRESETS,
  audio: DEFAULT_AUDIO_STATE,
  timelineTracks: DEFAULT_TIMELINE_TRACKS,
  timelineClips: INITIAL_TIMELINE_CLIPS,
  timelineHistoryPast: [],
  timelineHistoryFuture: [],
  timelineMarkers: INITIAL_TIMELINE_MARKERS,
  snapSettings: DEFAULT_SNAP_SETTINGS,
  timelineZoom: 18,
  playheadSec: 6.5,
  isPlayingPreview: false,
  previewSpeed: 1,
  previewQuality: 'Full',
  previewAspect: '16:9',
  selectedClipId: 'tl-1',
  selectedMarkerId: null,
  appSettings: DEFAULT_APP_SETTINGS,

  isNewProjectModalOpen: false,
  isImportMediaModalOpen: false,
  isOpenProjectModalOpen: false,

  setActiveSection: (section) => set({ activeSection: section }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openNewProjectModal: (open) => set({ isNewProjectModalOpen: open }),
  openImportMediaModal: (open) => set({ isImportMediaModalOpen: open }),
  openProjectPickerModal: (open) => set({ isOpenProjectModalOpen: open }),

  selectProject: (projectId, navigateToWorkspace = true) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    set({
      activeProjectId: projectId,
      isOpenProjectModalOpen: false,
      activeSection: navigateToWorkspace ? project.lastWorkspace : get().activeSection,
    });
  },

  createAndActivateProject: async (input) => {
    const created = await engineClient.createProject(input);
    set((s) => ({
      projects: [created, ...s.projects],
      activeProjectId: created.id,
      isNewProjectModalOpen: false,
      activeSection: input.initialWorkspace,
    }));
  },

  deleteProject: (projectId) => {
    set((s) => {
      const remaining = s.projects.filter((p) => p.id !== projectId);
      const nextActive =
        s.activeProjectId === projectId ? (remaining[0]?.id ?? '') : s.activeProjectId;
      return { projects: remaining, activeProjectId: nextActive };
    });
  },

  importFilesFromBrowser: async (files) => {
    const fileList = Array.from(files);
    const probed = await Promise.all(fileList.map((f) => engineClient.probeBrowserFile(f)));
    set((s) => ({
      mediaPool: [...probed, ...s.mediaPool],
      autoConfig: {
        ...s.autoConfig,
        selectedMediaIds: [...probed.map((p) => p.id), ...s.autoConfig.selectedMediaIds],
      },
    }));
    return probed;
  },

  removeMediaAsset: (mediaId) => {
    set((s) => ({
      mediaPool: s.mediaPool.filter((m) => m.id !== mediaId),
      autoConfig: {
        ...s.autoConfig,
        selectedMediaIds: s.autoConfig.selectedMediaIds.filter((id) => id !== mediaId),
      },
    }));
  },

  switchSimulatedPlatform: (platform) => {
    set({ hardware: buildHardwareProfile(platform) });
  },

  setActiveHardwareEncoder: (encoderId) => {
    set((s) => ({
      hardware: {
        ...s.hardware,
        activeEncoderId: encoderId,
      },
    }));
  },

  applyAutoPreset: (presetId) => {
    const preset = AUTO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    set((s) => ({
      autoConfig: {
        ...s.autoConfig,
        presetId,
        aspectRatio: preset.defaultAspectRatio,
        frameRate: preset.defaultFps,
        ...preset.recommendedSettings,
      },
      autoPlanPreview: null,
    }));
  },

  updateAutoConfig: (partial) =>
    set((s) => ({
      autoConfig: { ...s.autoConfig, ...partial },
      autoPlanPreview: null,
    })),

  toggleAutoMediaSelection: (mediaId) =>
    set((s) => {
      const exists = s.autoConfig.selectedMediaIds.includes(mediaId);
      const next = exists
        ? s.autoConfig.selectedMediaIds.filter((id) => id !== mediaId)
        : [...s.autoConfig.selectedMediaIds, mediaId];
      return {
        autoConfig: { ...s.autoConfig, selectedMediaIds: next },
        autoPlanPreview: null,
      };
    }),

  generateAutoPlanPreview: async () => {
    const { autoConfig, mediaPool } = get();
    const seed = 4201 + autoConfig.selectedMediaIds.length * 13;
    const request = buildRustAutoEditRequest(autoConfig, mediaPool, seed, []);
    const plan = await autoEditEngine.generateEditPlan(request, mediaPool);
    set({ autoPlanPreview: plan });
  },

  regenerateAutoPlanVariant: async () => {
    const { autoConfig, mediaPool, autoPlanPreview } = get();
    if (!autoPlanPreview) {
      await get().generateAutoPlanPreview();
      return;
    }
    const lockedScenes = autoPlanPreview.timelineScenes.filter((sc) => sc.locked);
    const request = buildRustAutoEditRequest(
      autoConfig,
      mediaPool,
      autoPlanPreview.seed,
      lockedScenes
    );
    const nextPlan = await autoEditEngine.regenerateAlternativePlan(
      request,
      mediaPool,
      autoPlanPreview
    );
    set({ autoPlanPreview: nextPlan });
  },

  replaceAutoPlanSceneClip: (sceneId, replacementMediaId) => {
    const { autoPlanPreview, mediaPool } = get();
    if (!autoPlanPreview) return;
    const replacement = mediaPool.find((m) => m.id === replacementMediaId);
    if (!replacement) return;
    set({
      autoPlanPreview: autoEditEngine.replaceSceneMedia(autoPlanPreview, sceneId, replacement),
    });
  },

  toggleAutoPlanSceneLock: (sceneId) => {
    const { autoPlanPreview } = get();
    if (!autoPlanPreview) return;
    set({
      autoPlanPreview: autoEditEngine.toggleSceneLock(autoPlanPreview, sceneId),
    });
  },

  updateAutoPlanScene: (sceneId, partial) => {
    const { autoPlanPreview } = get();
    if (!autoPlanPreview) return;
    set({
      autoPlanPreview: autoEditEngine.updateSceneConfiguration(
        autoPlanPreview,
        sceneId,
        partial
      ),
    });
  },

  sendAutoPlanToTimeline: () => {
    const { autoConfig, mediaPool, autoPlanPreview } = get();
    if (autoPlanPreview && autoPlanPreview.timelineScenes.length > 0) {
      const videoClips: TimelineClip[] = autoPlanPreview.timelineScenes.map((scene, index) => ({
        id: `auto-tl-${Date.now()}-${index}`,
        mediaId: scene.mediaId,
        trackId: 'V1',
        kind: scene.kind,
        label: scene.mediaName,
        startSec: scene.startSec,
        durationSec: scene.durationSec,
        trimInSec: scene.sourceInSec,
        speed: scene.speedMultiplier,
        transitionIn:
          scene.transitionIn === 'Dip to Black'
            ? 'Dip to Black'
            : scene.transitionIn === 'Whip Pan'
            ? 'Whip Pan'
            : scene.transitionIn === 'Cross Dissolve' || scene.transitionIn === 'Match Cut'
            ? 'Cross Dissolve'
            : 'None',
        transitionDurationSec: scene.transitionIn === 'Cut' ? 0 : 0.8,
        scalePct: scene.appliedEffects.includes('Motion Zoom') ? 106 : 100,
        contrast: autoConfig.colorCorrection ? 8 : 0,
        saturation: autoConfig.colorCorrection ? 6 : 0,
        keyframesCount: scene.appliedEffects.includes('Motion Zoom') ? 2 : 0,
        keyframes: [],
        thumbnailUrl: scene.thumbnailUrl,
      }));

      const audioClips: TimelineClip[] = autoPlanPreview.audioBedClip
        ? [
            {
              id: `auto-aud-${Date.now()}`,
              mediaId: autoPlanPreview.audioBedClip.id,
              trackId: 'A2',
              kind: 'audio',
              label: autoPlanPreview.audioBedClip.name.replace(/\.[^/.]+$/, ''),
              startSec: 0,
              durationSec: Math.min(
                autoPlanPreview.audioBedClip.durationSeconds,
                autoPlanPreview.estimatedOutputDurationSec
              ),
              trimInSec: 0,
              speed: 1,
              volumeDb: -10,
              audioDuckingEnabled: true,
              audioDuckingDb: -12,
              keyframesCount: 0,
              keyframes: [],
            },
          ]
        : [];

      const combined = [...videoClips, ...audioClips];
      set({
        timelineClips: combined,
        playheadSec: 0,
        selectedClipId: combined[0]?.id ?? null,
        activeSection: 'pro-editor',
      });
      return;
    }

    const selected = mediaPool.filter((m) => autoConfig.selectedMediaIds.includes(m.id));
    if (selected.length === 0) return;

    let cursor = 0;
    const generatedClips: TimelineClip[] = selected.map((asset, index) => {
      const segDuration = Math.min(12, Math.max(4, Math.round(asset.durationSeconds * 0.35)));
      const clip: TimelineClip = {
        id: `auto-tl-${Date.now()}-${index}`,
        mediaId: asset.id,
        trackId: asset.kind === 'audio' ? 'A2' : 'V1',
        kind: asset.kind,
        label: asset.name.replace(/\.[^/.]+$/, ''),
        startSec: asset.kind === 'audio' ? 0 : cursor,
        durationSec: segDuration,
        trimInSec: 0,
        speed: 1,
        transitionIn:
          asset.kind !== 'audio' && autoConfig.automaticTransitions ? 'Cross Dissolve' : 'None',
        transitionDurationSec:
          asset.kind !== 'audio' && autoConfig.automaticTransitions ? 1.0 : 0,
        keyframesCount: autoConfig.motionBasedZoom ? 2 : 0,
        thumbnailUrl: asset.thumbnailUrl,
      };
      if (asset.kind !== 'audio') cursor += segDuration;
      return clip;
    });

    set({
      timelineClips: generatedClips,
      playheadSec: 0,
      selectedClipId: generatedClips[0]?.id ?? null,
      activeSection: 'pro-editor',
    });
  },

  queueAutoPlanExport: () => {
    const { autoConfig, autoPlanPreview, projects, activeProjectId, hardware } = get();
    const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
    const dims = resolutionToDimensions(
      autoConfig.resolution,
      autoConfig.aspectRatio,
      autoConfig.customWidth,
      autoConfig.customHeight
    );
    const estDuration = autoPlanPreview?.estimatedOutputDurationSec ?? autoConfig.targetDurationSeconds;
    const exp = autoConfig.exportConfig;
    const ext = exp.container.toLowerCase();
    const orientation =
      dims.width > dims.height
        ? 'landscape'
        : dims.height > dims.width
        ? 'portrait'
        : 'square';
    const estimatedSizeMb = Math.max(8, Math.round((exp.bitrateMbps * estDuration) / 8));

    get().addExportJob({
      projectName: `${activeProject?.name ?? 'FrameForge'} (Auto Studio)`,
      outputName: `${exp.outputFileName || 'AutoStudio_Export'}.${ext}`,
      resolution: autoConfig.resolution,
      customWidth: dims.width,
      customHeight: dims.height,
      orientation,
      codec: exp.codec,
      container: exp.container,
      fps: autoConfig.frameRate,
      bitrateMbps: exp.bitrateMbps,
      qualityPreset: exp.qualityPreset,
      encoder: exp.computePreference === 'cpu-only' ? 'cpu-fallback' : exp.encoder || hardware.activeEncoderId,
      computePreference: exp.computePreference,
      estimatedSizeMb,
    });
  },

  setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(6, Math.min(48, zoom)) }),
  setPlayheadSec: (sec) => set({ playheadSec: Math.max(0, Number(sec.toFixed(2))) }),
  togglePreviewPlayback: () => set((s) => ({ isPlayingPreview: !s.isPlayingPreview })),
  setPreviewSpeed: (previewSpeed) => set({ previewSpeed }),
  setPreviewQuality: (previewQuality) => set({ previewQuality }),
  setPreviewAspect: (previewAspect) => set({ previewAspect }),
  selectTimelineClip: (clipId) => set({ selectedClipId: clipId, selectedMarkerId: null }),

  recordTimelineSnapshot: () =>
    set((s) => ({
      timelineHistoryPast: [...s.timelineHistoryPast.slice(-29), s.timelineClips],
      timelineHistoryFuture: [],
    })),

  undoTimeline: () =>
    set((s) => {
      if (s.timelineHistoryPast.length === 0) return s;
      const previous = s.timelineHistoryPast[s.timelineHistoryPast.length - 1];
      return {
        timelineClips: previous,
        timelineHistoryPast: s.timelineHistoryPast.slice(0, -1),
        timelineHistoryFuture: [s.timelineClips, ...s.timelineHistoryFuture.slice(0, 29)],
      };
    }),

  redoTimeline: () =>
    set((s) => {
      if (s.timelineHistoryFuture.length === 0) return s;
      const next = s.timelineHistoryFuture[0];
      return {
        timelineClips: next,
        timelineHistoryPast: [...s.timelineHistoryPast.slice(-29), s.timelineClips],
        timelineHistoryFuture: s.timelineHistoryFuture.slice(1),
      };
    }),

  splitSelectedClipAtPlayhead: () => {
    const { selectedClipId, playheadSec, timelineClips, timelineTracks } = get();
    const target = timelineClips.find((c) => c.id === selectedClipId);
    if (!target) return;
    const track = timelineTracks.find((t) => t.id === target.trackId);
    if (track?.locked) return;
    const result = splitClipAtTime(timelineClips, target.id, playheadSec);
    if (!result) return;
    set((s) => ({
      timelineHistoryPast: [...s.timelineHistoryPast.slice(-29), s.timelineClips],
      timelineHistoryFuture: [],
      timelineClips: result.clips,
      selectedClipId: result.nextSelectedId,
    }));
  },

  trimSelectedClipToPlayhead: (edge) => {
    const { selectedClipId, playheadSec, timelineClips, timelineTracks } = get();
    const target = timelineClips.find((c) => c.id === selectedClipId);
    if (!target) return;
    const track = timelineTracks.find((t) => t.id === target.trackId);
    if (track?.locked) return;
    const updated = trimClipEdgeAtTime(timelineClips, target.id, edge, playheadSec);
    if (!updated) return;
    set((s) => ({
      timelineHistoryPast: [...s.timelineHistoryPast.slice(-29), s.timelineClips],
      timelineHistoryFuture: [],
      timelineClips: updated,
    }));
  },

  deleteSelectedClip: () => {
    const { selectedClipId, timelineClips, timelineTracks } = get();
    const target = timelineClips.find((c) => c.id === selectedClipId);
    if (!target) return;
    const track = timelineTracks.find((t) => t.id === target.trackId);
    if (track?.locked) return;
    set((s) => {
      const remaining = s.timelineClips.filter((c) => c.id !== target.id);
      return {
        timelineHistoryPast: [...s.timelineHistoryPast.slice(-29), s.timelineClips],
        timelineHistoryFuture: [],
        timelineClips: remaining,
        selectedClipId: remaining[0]?.id ?? null,
      };
    });
  },

  updateClipProperties: (clipId, partial) =>
    set((s) => ({
      timelineClips: s.timelineClips.map((c) => {
        if (c.id !== clipId) return c;
        const next = { ...c, ...partial };
        if (partial.transitionIn === 'None') {
          next.transitionDurationSec = 0;
        } else if (partial.transitionIn && !next.transitionDurationSec) {
          next.transitionDurationSec = 1.0;
        }
        return next;
      }),
    })),

  moveTimelineClip: (clipId, startSec, trackId) =>
    set((s) => {
      const target = s.timelineClips.find((c) => c.id === clipId);
      if (!target) return s;
      const srcTrack = s.timelineTracks.find((t) => t.id === target.trackId);
      const dstTrack = trackId ? s.timelineTracks.find((t) => t.id === trackId) : srcTrack;
      if (srcTrack?.locked || dstTrack?.locked) return s;
      return {
        timelineClips: s.timelineClips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                startSec: Math.max(0, Number(startSec.toFixed(2))),
                trackId: trackId ?? c.trackId,
              }
            : c
        ),
      };
    }),

  trimTimelineClip: (clipId, startSec, durationSec, trimInSec) =>
    set((s) => {
      const target = s.timelineClips.find((c) => c.id === clipId);
      if (!target) return s;
      const track = s.timelineTracks.find((t) => t.id === target.trackId);
      if (track?.locked) return s;
      return {
        timelineClips: s.timelineClips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                startSec: Math.max(0, Number(startSec.toFixed(2))),
                durationSec: Math.max(0.5, Number(durationSec.toFixed(2))),
                trimInSec:
                  trimInSec !== undefined ? Math.max(0, Number(trimInSec.toFixed(2))) : c.trimInSec,
              }
            : c
        ),
      };
    }),

  addMediaToTimeline: (asset, trackId) => {
    const newClip = createTimelineClipFromAsset(asset, get().timelineClips, trackId);
    set((s) => ({
      timelineHistoryPast: [...s.timelineHistoryPast.slice(-29), s.timelineClips],
      timelineHistoryFuture: [],
      timelineClips: [...s.timelineClips, newClip],
      selectedClipId: newClip.id,
      selectedMarkerId: null,
    }));
  },

  toggleTrackLock: (trackId) =>
    set((s) => ({
      timelineTracks: s.timelineTracks.map((t) =>
        t.id === trackId ? { ...t, locked: !t.locked } : t
      ),
    })),

  toggleTrackVisibility: (trackId) =>
    set((s) => ({
      timelineTracks: s.timelineTracks.map((t) =>
        t.id === trackId ? { ...t, visible: !t.visible } : t
      ),
    })),

  toggleTrackMute: (trackId) =>
    set((s) => ({
      timelineTracks: s.timelineTracks.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t
      ),
    })),

  toggleTrackSolo: (trackId) =>
    set((s) => ({
      timelineTracks: s.timelineTracks.map((t) =>
        t.id === trackId ? { ...t, solo: !t.solo } : t
      ),
    })),

  toggleClipKeyframe: (clipId, property) => {
    const { playheadSec, timelineClips } = get();
    const clip = timelineClips.find((c) => c.id === clipId);
    if (!clip) return;
    const relOffset = Number(
      Math.max(0, Math.min(clip.durationSec, playheadSec - clip.startSec)).toFixed(2)
    );
    const existingList = clip.keyframes ?? [];
    const existingAtOffset = existingList.find(
      (k) => k.property === property && Math.abs(k.timeOffsetSec - relOffset) < 0.15
    );

    const numericValue =
      property === 'position'
        ? clip.positionX ?? 0
        : property === 'scale'
        ? clip.scalePct ?? 100
        : property === 'rotation'
        ? clip.rotationDeg ?? 0
        : property === 'opacity'
        ? clip.opacityPct ?? 100
        : clip.volumeDb ?? 0;

    const valueLabel =
      property === 'position'
        ? `${clip.positionX ?? 0},${clip.positionY ?? 0}`
        : property === 'scale'
        ? `${clip.scalePct ?? 100}%`
        : property === 'rotation'
        ? `${clip.rotationDeg ?? 0}°`
        : property === 'opacity'
        ? `${clip.opacityPct ?? 100}%`
        : `${clip.volumeDb ?? 0} dB`;

    const updatedKeyframes: ClipKeyframe[] = existingAtOffset
      ? existingList.filter((k) => k.id !== existingAtOffset.id)
      : [
          ...existingList,
          {
            id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            timeOffsetSec: relOffset,
            property,
            valueLabel,
            numericValue,
            easing: 'ease-in-out' as const,
            bezierHandles: [0.42, 0, 0.58, 1] as [number, number, number, number],
          },
        ].sort((a, b) => a.timeOffsetSec - b.timeOffsetSec);

    set((s) => ({
      timelineClips: s.timelineClips.map((c) =>
        c.id === clipId
          ? { ...c, keyframes: updatedKeyframes, keyframesCount: updatedKeyframes.length }
          : c
      ),
    }));
  },

  upsertClipKeyframe: (clipId, keyframe) =>
    set((s) => ({
      timelineClips: s.timelineClips.map((c) => {
        if (c.id !== clipId) return c;
        const list = c.keyframes ?? [];
        const exists = list.some((k) => k.id === keyframe.id);
        const nextList = (exists
          ? list.map((k) => (k.id === keyframe.id ? keyframe : k))
          : [...list, keyframe]
        ).sort((a, b) => a.timeOffsetSec - b.timeOffsetSec);
        return { ...c, keyframes: nextList, keyframesCount: nextList.length };
      }),
    })),

  replacePropertyKeyframes: (clipId, property, nextForProperty) =>
    set((s) => ({
      timelineClips: s.timelineClips.map((c) => {
        if (c.id !== clipId) return c;
        const others = (c.keyframes ?? []).filter((k) => k.property !== property);
        const merged = [...others, ...nextForProperty].sort(
          (a, b) => a.timeOffsetSec - b.timeOffsetSec
        );
        return { ...c, keyframes: merged, keyframesCount: merged.length };
      }),
    })),

  removeClipKeyframe: (clipId, keyframeId) =>
    set((s) => ({
      timelineClips: s.timelineClips.map((c) => {
        if (c.id !== clipId) return c;
        const nextKfs = (c.keyframes ?? []).filter((k) => k.id !== keyframeId);
        return { ...c, keyframes: nextKfs, keyframesCount: nextKfs.length };
      }),
    })),

  jumpToClipKeyframe: (clipId, direction) => {
    const { timelineClips, playheadSec } = get();
    const clip = timelineClips.find((c) => c.id === clipId);
    const kfs = [...(clip?.keyframes ?? [])].sort((a, b) => a.timeOffsetSec - b.timeOffsetSec);
    if (!clip || kfs.length === 0) return;
    const currentRel = playheadSec - clip.startSec;
    const eps = 0.05;
    const target =
      direction === 'next'
        ? kfs.find((k) => k.timeOffsetSec > currentRel + eps) ?? kfs[0]
        : [...kfs].reverse().find((k) => k.timeOffsetSec < currentRel - eps) ?? kfs[kfs.length - 1];
    if (target) {
      set({ playheadSec: Number((clip.startSec + target.timeOffsetSec).toFixed(2)) });
    }
  },

  toggleSnapping: () =>
    set((s) => ({
      snapSettings: { ...s.snapSettings, enabled: !s.snapSettings.enabled },
    })),

  updateSnapSettings: (partial) =>
    set((s) => ({
      snapSettings: { ...s.snapSettings, ...partial },
    })),

  selectMarker: (markerId) => set({ selectedMarkerId: markerId, selectedClipId: null }),

  addMarkerAtPlayhead: (input) => {
    const timeSec = Number(get().playheadSec.toFixed(2));
    const count = get().timelineMarkers.length + 1;
    const category = input?.category ?? 'Story Beat';
    const defaultColor: TimelineMarker['color'] =
      category === 'Transition Point'
        ? 'sky'
        : category === 'Audio Cue'
        ? 'emerald'
        : category === 'Note'
        ? 'rose'
        : 'amber';
    const marker: TimelineMarker = {
      id: `mk-${Date.now()}`,
      timeSec,
      label: input?.label?.trim() || `Marker ${count}`,
      color: input?.color ?? defaultColor,
      category,
      notes: input?.notes?.trim() || '',
    };
    set((s) => ({
      timelineMarkers: [...s.timelineMarkers, marker],
      selectedMarkerId: marker.id,
      selectedClipId: null,
    }));
  },

  updateMarker: (markerId, partial) =>
    set((s) => ({
      timelineMarkers: s.timelineMarkers.map((m) =>
        m.id === markerId
          ? {
              ...m,
              ...partial,
              timeSec:
                partial.timeSec !== undefined
                  ? Math.max(0, Number(partial.timeSec.toFixed(2)))
                  : m.timeSec,
            }
          : m
      ),
    })),

  deleteMarker: (markerId) =>
    set((s) => ({
      timelineMarkers: s.timelineMarkers.filter((m) => m.id !== markerId),
      selectedMarkerId: s.selectedMarkerId === markerId ? null : s.selectedMarkerId,
    })),

  jumpToAdjacentMarker: (direction) => {
    const { timelineMarkers, playheadSec } = get();
    if (timelineMarkers.length === 0) return;
    const sorted = [...timelineMarkers].sort((a, b) => a.timeSec - b.timeSec);
    const eps = 0.05;
    const target =
      direction === 'next'
        ? sorted.find((m) => m.timeSec > playheadSec + eps) ?? sorted[0]
        : [...sorted].reverse().find((m) => m.timeSec < playheadSec - eps) ?? sorted[sorted.length - 1];
    if (target) {
      set({
        playheadSec: target.timeSec,
        selectedMarkerId: target.id,
        selectedClipId: null,
      });
    }
  },

  updateEnhancement: (key, value) =>
    set((s) => ({
      enhancements: { ...s.enhancements, [key]: value },
    })),

  updateEnhancementsBatch: (partial) =>
    set((s) => ({
      enhancements: { ...s.enhancements, ...partial },
    })),

  resetEnhancements: () => set({ enhancements: NEUTRAL_VIDEO_ENHANCEMENTS }),

  resetEnhancementCategory: (keys) =>
    set((s) => {
      const next = { ...s.enhancements };
      keys.forEach((k) => {
        (next as Record<string, unknown>)[k as string] = NEUTRAL_VIDEO_ENHANCEMENTS[k];
      });
      return { enhancements: next };
    }),

  saveCustomEnhancementPreset: (input) => {
    const trimmed = input.name.trim();
    if (!trimmed) return;
    const current = get().enhancements;
    const preset: CustomEnhancementPreset = {
      id: `preset-custom-${Date.now()}`,
      name: trimmed,
      classification: classifyEnhancementState(current),
      notes: input.notes?.trim() || 'Saved user enhancement configuration',
      createdAt: 'Custom Preset',
      isBuiltIn: false,
      state: { ...current },
    };
    set((s) => ({
      enhancementPresets: [preset, ...s.enhancementPresets],
    }));
  },

  applyCustomEnhancementPreset: (presetId) => {
    const target = get().enhancementPresets.find((p) => p.id === presetId);
    if (!target) return;
    set({ enhancements: { ...target.state } });
  },

  deleteCustomEnhancementPreset: (presetId) =>
    set((s) => ({
      enhancementPresets: s.enhancementPresets.filter((p) => p.id !== presetId || p.isBuiltIn),
    })),

  updateAudioState: (partial) =>
    set((s) => ({
      audio: { ...s.audio, ...partial },
    })),

  toggleAudioTrackFlag: (trackId, flag) =>
    set((s) => ({
      audio: {
        ...s.audio,
        tracks: s.audio.tracks.map((t) => (t.id === trackId ? { ...t, [flag]: !t[flag] } : t)),
      },
    })),

  updateAudioTrackVolume: (trackId, volumeDb) =>
    set((s) => ({
      audio: {
        ...s.audio,
        tracks: s.audio.tracks.map((t) => (t.id === trackId ? { ...t, volumeDb } : t)),
      },
    })),

  addExportJob: (job) =>
    set((s) => ({
      exportQueue: [
        {
          ...job,
          id: `job-${Date.now()}`,
          progressPct: 0,
          status: 'simulated-ready',
        },
        ...s.exportQueue,
      ],
    })),

  cancelExportJob: (jobId) =>
    set((s) => ({
      exportQueue: s.exportQueue.map((j) => (j.id === jobId ? { ...j, status: 'cancelled' } : j)),
    })),

  retryExportJob: (jobId) =>
    set((s) => ({
      exportQueue: s.exportQueue.map((j) =>
        j.id === jobId ? { ...j, status: 'simulated-ready', progressPct: 0 } : j
      ),
    })),

  removeExportJob: (jobId) =>
    set((s) => ({
      exportQueue: s.exportQueue.filter((j) => j.id !== jobId),
    })),

  updateAppSettings: (partial) =>
    set((s) => ({
      appSettings: { ...s.appSettings, ...partial },
    })),

  exportActiveProjectDocument: () => {
    const s = get();
    const project = s.projects.find((p) => p.id === s.activeProjectId) ?? s.projects[0];
    if (!project) return null;
    return serializeProjectDocument({
      project,
      mediaPool: s.mediaPool,
      tracks: s.timelineTracks,
      clips: s.timelineClips,
      markers: s.timelineMarkers,
      snapSettings: s.snapSettings,
      playheadSec: s.playheadSec,
      timelineZoom: s.timelineZoom,
      enhancements: s.enhancements,
      audio: s.audio,
      autoStudio: s.autoConfig,
      renderHistory: s.renderHistory,
    });
  },
}));
