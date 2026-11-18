import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Film,
  Lock,
  Music,
  Pause,
  Play,
  RefreshCw,
  Sliders,
  Unlock,
  Upload,
  Wand2,
} from 'lucide-react';
import { AUTO_PRESETS, AUTO_STUDIO_CORE_STYLE_IDS } from '../../config/autoPresets';
import { useStudioStore } from '../../store/useStudioStore';
import { AutoEditPipelineFlags, AutoSceneTransition } from '../../types/autoEditEngine';
import {
  AspectRatioPreset,
  FrameRateOption,
  ResolutionPreset,
} from '../../types/studio';
import { formatDurationCompact, formatTimecode, resolutionToDimensions } from '../../utils/formatters';
import { AutoExportPanel } from '../auto/AutoExportPanel';

type AutoStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const STEPS: { id: AutoStep; short: string; title: string }[] = [
  { id: 1, short: '1. Footage', title: 'Import & Select Footage' },
  { id: 2, short: '2. Style', title: 'Select Editing Style' },
  { id: 3, short: '3. Output', title: 'Select Output Aspect & Duration' },
  { id: 4, short: '4. Quality', title: 'Select Output Quality' },
  { id: 5, short: '5. Auto Edit', title: 'Configure Automatic Editing' },
  { id: 6, short: '6. Preview', title: 'Generated Auto-Edit Preview' },
  { id: 7, short: '7. Refine', title: 'Edit & Customize Result' },
  { id: 8, short: '8. Export', title: 'Export Configuration' },
];

const ASPECT_OPTIONS: { id: AspectRatioPreset; label: string; desc: string }[] = [
  { id: '9:16', label: '9:16', desc: 'Vertical Reels' },
  { id: '16:9', label: '16:9', desc: 'Widescreen' },
  { id: '1:1', label: '1:1', desc: 'Square Feed' },
  { id: '4:5', label: '4:5', desc: 'Social Portrait' },
  { id: '3:4', label: '3:4', desc: 'Editorial 3:4' },
  { id: '21:9', label: '21:9', desc: 'Cinema Scope' },
  { id: 'original', label: 'Original', desc: 'Match Source' },
  { id: 'custom', label: 'Custom', desc: 'User Ratio' },
];

const QUALITY_TIERS: { id: ResolutionPreset; label: string; sub: string }[] = [
  { id: '720p', label: '720p', sub: 'HD Draft' },
  { id: '1080p', label: '1080p', sub: 'Full HD' },
  { id: '2K', label: '2K', sub: 'QHD Master' },
  { id: '4K', label: '4K', sub: 'Ultra HD' },
  { id: '8K', label: '8K', sub: 'Archival' },
];

const FRAME_RATES: FrameRateOption[] = [23.976, 24, 25, 29.97, 30, 50, 60, 120];

const PIPELINE_CONTROL_GROUPS: {
  group: string;
  items: { key: keyof AutoEditPipelineFlags; label: string; detail: string }[];
}[] = [
  {
    group: 'Motion, Framing & Selection',
    items: [
      { key: 'bestMovementDetection', label: 'Best movement detection', detail: 'Optical-flow velocity scoring' },
      { key: 'sceneSelection', label: 'Scene selection', detail: 'Shot boundary highlight segmentation' },
      { key: 'motionBasedZoom', label: 'Motion-based zoom', detail: 'Dynamic punch-in keyframes' },
      { key: 'subjectTracking', label: 'Subject tracking', detail: 'Local subject center-lock' },
      { key: 'automaticCrop', label: 'Automatic crop', detail: 'Aspect-safe edge reframing' },
      { key: 'videoStabilization', label: 'Video stabilization', detail: '2-pass camera motion matrix' },
    ],
  },
  {
    group: 'Picture & Restoration',
    items: [
      { key: 'colorCorrection', label: 'Color correction', detail: 'Preset tone curve & white balance' },
      { key: 'noiseReduction', label: 'Noise reduction', detail: 'Spatial-temporal luma/chroma denoise' },
    ],
  },
  {
    group: 'Audio, Transitions & Pacing',
    items: [
      { key: 'audioEnhancement', label: 'Audio enhancement', detail: 'Loudness leveling & clarity EQ' },
      { key: 'silenceRemoval', label: 'Silence removal', detail: 'Trim dead-air pauses automatically' },
      { key: 'automaticTransitions', label: 'Automatic transitions', detail: 'Style-matched scene blends' },
      { key: 'musicSynchronization', label: 'Music synchronization', detail: 'Beat-aligned cut timing' },
      { key: 'speedRamps', label: 'Speed ramps', detail: 'Variable slow-mo & burst pacing' },
    ],
  },
];

const SCENE_TRANSITIONS: AutoSceneTransition[] = [
  'Cut',
  'Cross Dissolve',
  'Dip to Black',
  'Whip Pan',
  'Match Cut',
];

const SCENE_EFFECT_CHOICES = [
  'Stabilize',
  'Motion Zoom',
  'Subject Track',
  'Auto Crop',
  'Color Grade',
  'Denoise',
  'Audio LUFS',
  'Trim Silence',
];

export const AutoStudioView: React.FC = () => {
  const mediaPool = useStudioStore((s) => s.mediaPool);
  const autoConfig = useStudioStore((s) => s.autoConfig);
  const autoPlanPreview = useStudioStore((s) => s.autoPlanPreview);

  const applyAutoPreset = useStudioStore((s) => s.applyAutoPreset);
  const updateAutoConfig = useStudioStore((s) => s.updateAutoConfig);
  const toggleAutoMediaSelection = useStudioStore((s) => s.toggleAutoMediaSelection);
  const generateAutoPlanPreview = useStudioStore((s) => s.generateAutoPlanPreview);
  const regenerateAutoPlanVariant = useStudioStore((s) => s.regenerateAutoPlanVariant);
  const replaceAutoPlanSceneClip = useStudioStore((s) => s.replaceAutoPlanSceneClip);
  const toggleAutoPlanSceneLock = useStudioStore((s) => s.toggleAutoPlanSceneLock);
  const updateAutoPlanScene = useStudioStore((s) => s.updateAutoPlanScene);
  const sendAutoPlanToTimeline = useStudioStore((s) => s.sendAutoPlanToTimeline);
  const importFilesFromBrowser = useStudioStore((s) => s.importFilesFromBrowser);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeStep, setActiveStep] = useState<AutoStep>(1);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'audio'>('all');
  const [generating, setGenerating] = useState(false);
  const [previewTimeSec, setPreviewTimeSec] = useState(0);
  const [isPlayingPlan, setIsPlayingPlan] = useState(false);

  const coreStyles = useMemo(
    () =>
      AUTO_STUDIO_CORE_STYLE_IDS.map((id) => AUTO_PRESETS.find((p) => p.id === id)).filter(
        Boolean
      ) as typeof AUTO_PRESETS,
    []
  );

  const selectedPreset = useMemo(
    () => AUTO_PRESETS.find((p) => p.id === autoConfig.presetId) ?? AUTO_PRESETS[0],
    [autoConfig.presetId]
  );

  const selectedMedia = useMemo(
    () => mediaPool.filter((m) => autoConfig.selectedMediaIds.includes(m.id)),
    [mediaPool, autoConfig.selectedMediaIds]
  );

  const visualMediaPool = useMemo(
    () => mediaPool.filter((m) => m.kind === 'video' || m.kind === 'image'),
    [mediaPool]
  );

  const filteredSourceList = useMemo(
    () =>
      mediaPool.filter((m) => {
        if (mediaFilter === 'video') return m.kind === 'video' || m.kind === 'image';
        if (mediaFilter === 'audio') return m.kind === 'audio';
        return true;
      }),
    [mediaPool, mediaFilter]
  );

  const primaryVisualClip =
    selectedMedia.find((m) => m.kind !== 'audio') ?? visualMediaPool[0] ?? mediaPool[0];
  const totalRawDuration = selectedMedia.reduce((acc, m) => acc + m.durationSeconds, 0);

  const resolvedDims = resolutionToDimensions(
    autoConfig.resolution,
    autoConfig.aspectRatio,
    autoConfig.customWidth,
    autoConfig.customHeight,
    primaryVisualClip?.width ?? 1920,
    primaryVisualClip?.height ?? 1080
  );

  const totalPreviewDuration = autoPlanPreview?.estimatedOutputDurationSec ?? 0;

  // Simulated playback across generated scenes in Preview Pane
  useEffect(() => {
    if (!isPlayingPlan || !autoPlanPreview || totalPreviewDuration <= 0) return;
    const timer = window.setInterval(() => {
      setPreviewTimeSec((prev) => {
        const next = prev + 0.1;
        return next >= totalPreviewDuration ? 0 : Number(next.toFixed(1));
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [isPlayingPlan, autoPlanPreview, totalPreviewDuration]);

  const activeScene = useMemo(() => {
    if (!autoPlanPreview || autoPlanPreview.timelineScenes.length === 0) return null;
    return (
      autoPlanPreview.timelineScenes.find(
        (sc) => previewTimeSec >= sc.startSec && previewTimeSec <= sc.startSec + sc.durationSec
      ) ?? autoPlanPreview.timelineScenes[0]
    );
  }, [autoPlanPreview, previewTimeSec]);

  const activePreviewAsset = useMemo(() => {
    if (activeScene) {
      return mediaPool.find((m) => m.id === activeScene.mediaId) ?? primaryVisualClip;
    }
    return primaryVisualClip;
  }, [activeScene, mediaPool, primaryVisualClip]);

  const aspectBoxStyle = useMemo(() => {
    switch (autoConfig.aspectRatio) {
      case '9:16':
        return { aspectRatio: '9 / 16', maxHeight: '300px' };
      case '1:1':
        return { aspectRatio: '1 / 1', maxHeight: '290px' };
      case '4:5':
        return { aspectRatio: '4 / 5', maxHeight: '300px' };
      case '3:4':
        return { aspectRatio: '3 / 4', maxHeight: '300px' };
      case '21:9':
        return { aspectRatio: '21 / 9', width: '100%' };
      case 'original': {
        const w = Math.max(1, primaryVisualClip?.width ?? 16);
        const h = Math.max(1, primaryVisualClip?.height ?? 9);
        return { aspectRatio: `${w} / ${h}`, maxHeight: '300px' };
      }
      case 'custom':
        return {
          aspectRatio: `${Math.max(1, autoConfig.customAspectWidth)} / ${Math.max(
            1,
            autoConfig.customAspectHeight
          )}`,
          maxHeight: '300px',
        };
      default:
        return { aspectRatio: '16 / 9', width: '100%' };
    }
  }, [
    autoConfig.aspectRatio,
    autoConfig.customAspectWidth,
    autoConfig.customAspectHeight,
    primaryVisualClip,
  ]);

  const activeFlagCount = PIPELINE_CONTROL_GROUPS.flatMap((g) => g.items).filter(
    (item) => autoConfig[item.key]
  ).length;

  const handleOneTouchGenerate = async (jumpToPreview = true) => {
    if (selectedMedia.length === 0) return;
    setGenerating(true);
    try {
      await generateAutoPlanPreview();
      setPreviewTimeSec(0);
      setIsPlayingPlan(false);
      if (jumpToPreview) setActiveStep(6);
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenStep = async (stepId: AutoStep) => {
    setActiveStep(stepId);
    if ((stepId === 6 || stepId === 7) && !autoPlanPreview && selectedMedia.length > 0) {
      await handleOneTouchGenerate(false);
    }
  };

  const toggleSceneEffect = (sceneId: string, currentEffects: string[], eff: string) => {
    const next = currentEffects.includes(eff)
      ? currentEffects.filter((e) => e !== eff)
      : [...currentEffects, eff];
    updateAutoPlanScene(sceneId, { appliedEffects: next });
  };

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden bg-[#111215]">
      {/* Top 8-Step Workflow Stepper + One-Touch Auto Trigger */}
      <header className="px-4 py-2.5 border-b border-[#24272F] bg-[#15171B] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <nav className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {STEPS.map((st) => {
            const active = activeStep === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => void handleOpenStep(st.id)}
                className={`px-2.5 py-1.5 rounded text-[11px] font-medium whitespace-nowrap border transition-colors ${
                  active
                    ? 'bg-[#1D283D] border-[#3B82F6] text-white'
                    : 'bg-[#191B21] border-[#252832] text-[#8E95A5] hover:text-white hover:border-[#373D4C]'
                }`}
              >
                {st.short}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={selectedMedia.length === 0 || generating}
            onClick={() => void handleOneTouchGenerate(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white text-[12px] font-medium transition-colors disabled:opacity-50"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{generating ? 'Generating...' : 'One-Touch Auto Edit'}</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 overflow-hidden">
        {/* Left: Active Step Controls (Steps 1–8) */}
        <section className="xl:col-span-7 border-b xl:border-b-0 xl:border-r border-[#24272F] flex flex-col min-h-0 bg-[#13151A]">
          {/* Step Heading Bar */}
          <div className="px-5 py-3 border-b border-[#22252E] flex items-center justify-between gap-3 bg-[#15171C]">
            <div>
              <div className="text-[11px] font-mono text-[#7A8190]">
                STEP {activeStep} OF 8
              </div>
              <h1 className="text-[15px] font-semibold text-[#F3F4F6]">
                {STEPS[activeStep - 1].title}
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={activeStep === 1}
                onClick={() => void handleOpenStep((activeStep - 1) as AutoStep)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#1E2129] hover:bg-[#272B36] text-[#C8CDD8] border border-[#2C313E] text-[11px] disabled:opacity-35"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={activeStep === 8}
                onClick={() => void handleOpenStep((activeStep + 1) as AutoStep)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white text-[11px] font-medium disabled:opacity-35"
              >
                <span>Next</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Step Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* STEP 1: IMPORT FOOTAGE */}
            {activeStep === 1 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded bg-[#171920] border border-dashed border-[#343B4C]">
                  <div>
                    <div className="text-[13px] font-medium text-[#F3F4F6]">
                      Add Multiple Video & Audio Files
                    </div>
                    <div className="text-[11px] text-[#8E95A5]">
                      Select camera footage, B-roll, voice-overs, or music beds for automatic assembly.
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="video/*,audio/*,image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) void importFilesFromBrowser(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white text-[12px] font-medium transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Media Files</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { id: 'all', label: 'All Assets' },
                        { id: 'video', label: 'Video & Stills' },
                        { id: 'audio', label: 'Audio Stems' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setMediaFilter(tab.id)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                          mediaFilter === tab.id
                            ? 'bg-[#202634] text-white border border-[#3B82F6]/60'
                            : 'bg-[#181A20] text-[#8E95A5] border border-[#252832] hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-[#8E95A5] tabular-nums">
                    {selectedMedia.length} selected · {formatDurationCompact(totalRawDuration)} total
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredSourceList.map((clip) => {
                    const checked = autoConfig.selectedMediaIds.includes(clip.id);
                    return (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => toggleAutoMediaSelection(clip.id)}
                        className={`flex items-center gap-3 p-2.5 rounded border text-left transition-colors ${
                          checked
                            ? 'bg-[#1C2434] border-[#3B82F6]/70'
                            : 'bg-[#181A20] border-[#252831] hover:border-[#363C4C]'
                        }`}
                      >
                        <div className="relative w-14 h-9 rounded-sm overflow-hidden bg-[#0E1014] shrink-0 flex items-center justify-center">
                          {clip.kind === 'audio' ? (
                            <Music className="w-4 h-4 text-[#34D399]" />
                          ) : (
                            <img
                              src={clip.thumbnailUrl}
                              alt={clip.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          )}
                          {checked && (
                            <div className="absolute top-1 left-1 w-4 h-4 rounded-xs bg-[#2563EB] flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-medium text-[#E6E8EC] truncate">
                            {clip.name}
                          </div>
                          <div className="text-[10px] font-mono text-[#7A8190] tabular-nums">
                            {formatDurationCompact(clip.durationSeconds)} ·{' '}
                            {clip.kind === 'audio'
                              ? `${clip.codec}`
                              : `${clip.width}×${clip.height} · ${clip.fps}fps`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: SELECT EDITING STYLE */}
            {activeStep === 2 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {coreStyles.map((preset) => {
                    const active = preset.id === autoConfig.presetId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyAutoPreset(preset.id)}
                        className={`p-3 rounded border text-left transition-colors space-y-1 ${
                          active
                            ? 'bg-[#1D283D] border-[#3B82F6] text-white'
                            : 'bg-[#181A20] border-[#252832] text-[#C8CDD8] hover:border-[#3A4152]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold">{preset.name}</span>
                          <span className="text-[10px] font-mono text-[#8E95A5]">
                            {preset.defaultAspectRatio} · {preset.defaultFps}fps
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E95A5] leading-snug">{preset.summary}</p>
                        <div className="text-[10px] font-mono text-[#7A8190] pt-0.5">
                          {preset.cutCadence} · {preset.transitionStyle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: SELECT OUTPUT */}
            {activeStep === 3 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="text-[12px] font-semibold text-[#E6E8EC]">Aspect Ratio</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ASPECT_OPTIONS.map((opt) => {
                      const active = autoConfig.aspectRatio === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateAutoConfig({ aspectRatio: opt.id })}
                          className={`p-3 rounded border text-left transition-colors ${
                            active
                              ? 'bg-[#1D283D] border-[#3B82F6] text-white'
                              : 'bg-[#181A20] border-[#252832] text-[#C8CDD8] hover:border-[#3A4152]'
                          }`}
                        >
                          <div className="text-[13px] font-mono font-semibold">{opt.label}</div>
                          <div className="text-[10px] text-[#8E95A5] mt-0.5">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {autoConfig.aspectRatio === 'custom' && (
                  <div className="p-3.5 rounded bg-[#16181F] border border-[#262A35] grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#9BA2B0] mb-1">
                        Custom Ratio Width
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={32}
                        value={autoConfig.customAspectWidth}
                        onChange={(e) =>
                          updateAutoConfig({ customAspectWidth: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-[#101115] border border-[#282C36] font-mono text-[12px] text-[#E6E8EC]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#9BA2B0] mb-1">
                        Custom Ratio Height
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={32}
                        value={autoConfig.customAspectHeight}
                        onChange={(e) =>
                          updateAutoConfig({ customAspectHeight: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-[#101115] border border-[#282C36] font-mono text-[12px] text-[#E6E8EC]"
                      />
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded bg-[#16181F] border border-[#262A35] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12px] font-medium text-[#E6E8EC]">Target Duration</div>
                      <div className="text-[11px] text-[#7A8190]">
                        Auto scales duration from highlight density, or lock an exact target length.
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-[#101115] border border-[#282C36] rounded p-0.5">
                      <button
                        type="button"
                        onClick={() => updateAutoConfig({ targetDurationMode: 'auto' })}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                          autoConfig.targetDurationMode === 'auto'
                            ? 'bg-[#2563EB] text-white'
                            : 'text-[#8E95A5]'
                        }`}
                      >
                        Auto
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAutoConfig({ targetDurationMode: 'custom' })}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                          autoConfig.targetDurationMode === 'custom'
                            ? 'bg-[#2563EB] text-white'
                            : 'text-[#8E95A5]'
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>
                  {autoConfig.targetDurationMode === 'custom' && (
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={240}
                        step={5}
                        value={autoConfig.targetDurationSeconds}
                        onChange={(e) =>
                          updateAutoConfig({ targetDurationSeconds: Number(e.target.value) })
                        }
                        className="studio-slider flex-1"
                      />
                      <span className="text-[12px] font-mono text-[#E6E8EC] w-14 text-right tabular-nums">
                        {autoConfig.targetDurationSeconds}s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: SELECT QUALITY */}
            {activeStep === 4 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="text-[12px] font-semibold text-[#E6E8EC]">
                    Output Resolution Quality
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {QUALITY_TIERS.map((tier) => {
                      const active = autoConfig.resolution === tier.id;
                      const dims = resolutionToDimensions(
                        tier.id,
                        autoConfig.aspectRatio,
                        autoConfig.customWidth,
                        autoConfig.customHeight,
                        primaryVisualClip?.width ?? 1920,
                        primaryVisualClip?.height ?? 1080
                      );
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => updateAutoConfig({ resolution: tier.id })}
                          className={`p-3 rounded border text-left transition-colors ${
                            active
                              ? 'bg-[#1D283D] border-[#3B82F6] text-white'
                              : 'bg-[#181A20] border-[#252832] text-[#C8CDD8] hover:border-[#3A4152]'
                          }`}
                        >
                          <div className="text-[14px] font-mono font-semibold">{tier.label}</div>
                          <div className="text-[10px] text-[#8E95A5]">{tier.sub}</div>
                          <div className="text-[10px] font-mono text-[#7A8190] mt-1 tabular-nums">
                            {dims.width}×{dims.height}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[12px] font-semibold text-[#E6E8EC]">Frame Rate</div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {FRAME_RATES.map((fps) => (
                      <button
                        key={fps}
                        type="button"
                        onClick={() => updateAutoConfig({ frameRate: fps })}
                        className={`py-2 rounded text-[11px] font-mono border tabular-nums transition-colors ${
                          autoConfig.frameRate === fps
                            ? 'bg-[#1D283D] border-[#3B82F6] text-white'
                            : 'bg-[#181A20] border-[#252832] text-[#9BA2B0] hover:text-white'
                        }`}
                      >
                        {fps}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: CONFIGURE AUTOMATIC EDITING */}
            {activeStep === 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[11px] text-[#8E95A5]">
                  <span>
                    Configure deterministic local algorithms & optional local ONNX passes
                  </span>
                  <button
                    type="button"
                    onClick={() => applyAutoPreset(autoConfig.presetId)}
                    className="text-[#60A5FA] hover:underline"
                  >
                    Reset to {selectedPreset.name} defaults
                  </button>
                </div>

                {PIPELINE_CONTROL_GROUPS.map((group) => (
                  <div key={group.group} className="space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9BA2B0]">
                      {group.group}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.items.map((item) => {
                        const checked = autoConfig[item.key];
                        return (
                          <label
                            key={item.key}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                              checked
                                ? 'bg-[#192130] border-[#3B82F6]/50'
                                : 'bg-[#171920] border-[#252831] hover:border-[#353B49]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-[12px] font-medium text-[#E6E8EC]">
                                {item.label}
                              </div>
                              <div className="text-[10px] text-[#7A8190] truncate">
                                {item.detail}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                updateAutoConfig({ [item.key]: e.target.checked })
                              }
                              className="accent-[#3B82F6] w-3.5 h-3.5 shrink-0"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 6: GENERATED PREVIEW */}
            {activeStep === 6 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#23262E]">
                  <div>
                    <div className="text-[13px] font-semibold text-[#F3F4F6]">
                      {autoPlanPreview
                        ? `Edit Variant #${autoPlanPreview.variantIndex} · ${autoPlanPreview.presetName}`
                        : 'Generate Automatic Edit Preview'}
                    </div>
                    <div className="text-[11px] font-mono text-[#8E95A5] tabular-nums">
                      {autoPlanPreview
                        ? `${autoPlanPreview.estimatedCutCount} scenes · ${autoPlanPreview.estimatedOutputDurationSec}s · ${autoPlanPreview.outputFormat.width}×${autoPlanPreview.outputFormat.height} @ ${autoPlanPreview.outputFormat.fps}fps`
                        : 'Run deterministic local scene scoring to preview the assembled timeline'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={selectedMedia.length === 0 || generating}
                    onClick={() => void handleOneTouchGenerate(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white text-[11px] font-medium disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{autoPlanPreview ? 'Rebuild Preview' : 'Generate Preview'}</span>
                  </button>
                </div>

                {autoPlanPreview ? (
                  <>
                    {/* Summary KPI Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                      <div className="p-2.5 rounded bg-[#16181F] border border-[#242732]">
                        <div className="text-[#7A8190]">Selected Clips</div>
                        <div className="font-mono font-semibold text-[#F3F4F6] mt-0.5 tabular-nums">
                          {autoPlanPreview.selectedClips.length} media files
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-[#16181F] border border-[#242732]">
                        <div className="text-[#7A8190]">Estimated Duration</div>
                        <div className="font-mono font-semibold text-[#F3F4F6] mt-0.5 tabular-nums">
                          {formatDurationCompact(autoPlanPreview.estimatedOutputDurationSec)} (
                          {autoPlanPreview.estimatedOutputDurationSec}s)
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-[#16181F] border border-[#242732]">
                        <div className="text-[#7A8190]">Output Format</div>
                        <div className="font-mono font-semibold text-[#F3F4F6] mt-0.5 tabular-nums">
                          {autoPlanPreview.outputFormat.aspectRatio} ·{' '}
                          {autoPlanPreview.outputFormat.resolutionTier}
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-[#16181F] border border-[#242732]">
                        <div className="text-[#7A8190]">Applied Effects</div>
                        <div className="font-mono font-semibold text-[#F3F4F6] mt-0.5 tabular-nums">
                          {autoPlanPreview.appliedEffects.length} active passes
                        </div>
                      </div>
                    </div>

                    {/* Visual Auto-Assembled Timeline Strip */}
                    <div className="p-3 rounded bg-[#101217] border border-[#242732] space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-[#D1D5DB]">
                          Assembled Sequence Timeline (Click scene to scrub)
                        </span>
                        <span className="font-mono text-[#7A8190] tabular-nums">
                          {autoPlanPreview.timelineScenes.length} V1 scenes
                          {autoPlanPreview.audioBedClip ? ` · A2: ${autoPlanPreview.audioBedClip.name}` : ''}
                        </span>
                      </div>

                      {/* Video Track Strip */}
                      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
                        {autoPlanPreview.timelineScenes.map((sc) => {
                          const isCurrent = activeScene?.id === sc.id;
                          return (
                            <button
                              key={sc.id}
                              type="button"
                              onClick={() => {
                                setPreviewTimeSec(sc.startSec);
                                setIsPlayingPlan(false);
                              }}
                              style={{ minWidth: `${Math.max(82, sc.durationSec * 22)}px` }}
                              className={`relative h-14 rounded-sm overflow-hidden border text-left p-1.5 flex flex-col justify-between transition-colors ${
                                isCurrent
                                  ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]/60'
                                  : 'border-[#2E384D] hover:border-[#4B5E82]'
                              }`}
                            >
                              <img
                                src={sc.thumbnailUrl}
                                alt={sc.mediaName}
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 w-full h-full object-cover opacity-35"
                              />
                              <div className="relative z-10 flex items-center justify-between gap-1 text-[10px] font-medium text-white">
                                <span className="truncate">{sc.mediaName}</span>
                                {sc.locked && <Lock className="w-2.5 h-2.5 text-[#F59E0B] shrink-0" />}
                              </div>
                              <div className="relative z-10 text-[9px] font-mono text-[#D1D5DB] tabular-nums">
                                {sc.durationSec.toFixed(1)}s · {sc.transitionIn}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Synchronized Audio Track Strip */}
                      {autoPlanPreview.audioBedClip && (
                        <div className="h-7 rounded-sm bg-[#142721] border border-[#27463D] px-2.5 flex items-center justify-between text-[10px] font-mono text-[#A7F3D0]">
                          <span className="truncate">
                            A2 Music Bed · {autoPlanPreview.audioBedClip.name}
                          </span>
                          <span className="tabular-nums shrink-0">
                            0.0s – {autoPlanPreview.estimatedOutputDurationSec}s
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Applied Effects & Rust Local Pipeline Stages */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      <div className="p-3 rounded bg-[#16181F] border border-[#242732] space-y-1.5">
                        <div className="font-semibold text-[#D1D5DB]">Applied Effects</div>
                        <div className="text-[#9BA2B0] leading-relaxed">
                          {autoPlanPreview.appliedEffects.length > 0
                            ? autoPlanPreview.appliedEffects.join(' · ')
                            : 'Straight Cut Assembly (No FX passes enabled)'}
                        </div>
                      </div>
                      <div className="p-3 rounded bg-[#16181F] border border-[#242732] space-y-1.5">
                        <div className="font-semibold text-[#D1D5DB]">Local Execution Stages</div>
                        <ol className="space-y-0.5 font-mono text-[10px] text-[#8FA2C7]">
                          {autoPlanPreview.pipelineStages.map((stage, i) => (
                            <li key={stage} className="truncate">
                              {i + 1}. {stage}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-[12px] text-[#7A8190]">
                    Select clips in Step 1 and click Generate Preview to assemble an offline edit plan.
                  </div>
                )}
              </div>
            )}

            {/* STEP 7: EDIT & CUSTOMIZE AUTOMATIC RESULT */}
            {activeStep === 7 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#23262E]">
                  <div>
                    <div className="text-[13px] font-semibold text-[#F3F4F6]">
                      Customize Scenes & Regenerate Variants
                    </div>
                    <div className="text-[11px] text-[#8E95A5]">
                      Lock favorite scenes, replace clips, tweak per-scene effects, or regenerate unlocked cuts.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={selectedMedia.length === 0}
                      onClick={() => void regenerateAutoPlanVariant()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white text-[11px] font-medium disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Regenerate Alternative Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={sendAutoPlanToTimeline}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1F2430] hover:bg-[#2A3142] text-[#E6E8EC] border border-[#323A4E] text-[11px] font-medium"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Pro Editor</span>
                    </button>
                  </div>
                </div>

                {autoPlanPreview ? (
                  <div className="space-y-2.5">
                    {autoPlanPreview.timelineScenes.map((scene) => (
                      <div
                        key={scene.id}
                        className={`p-3 rounded border space-y-2.5 transition-colors ${
                          scene.locked
                            ? 'bg-[#171B24] border-[#F59E0B]/55'
                            : 'bg-[#16181F] border-[#252832]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={scene.thumbnailUrl}
                              alt={scene.mediaName}
                              referrerPolicy="no-referrer"
                              className="w-12 h-8 rounded-xs object-cover shrink-0 bg-black"
                            />
                            <div className="min-w-0">
                              <div className="text-[12px] font-medium text-[#F3F4F6] truncate">
                                Scene {scene.orderIndex + 1} · {scene.mediaName}
                              </div>
                              <div className="text-[10px] font-mono text-[#7A8190] tabular-nums">
                                {scene.startSec.toFixed(1)}s –{' '}
                                {(scene.startSec + scene.durationSec).toFixed(1)}s ·{' '}
                                {scene.selectionRationale}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleAutoPlanSceneLock(scene.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                              scene.locked
                                ? 'bg-[#2B2214] border-[#F59E0B]/60 text-[#FCD34D]'
                                : 'bg-[#1D2028] border-[#2C313D] text-[#9BA2B0] hover:text-white'
                            }`}
                          >
                            {scene.locked ? (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Locked</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>Lock Scene</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Replace Clip / Transition / Speed / Duration */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <label className="space-y-0.5">
                            <span className="text-[10px] text-[#7A8190]">Replace Clip</span>
                            <select
                              value={scene.mediaId}
                              onChange={(e) => replaceAutoPlanSceneClip(scene.id, e.target.value)}
                              className="w-full px-2 py-1 rounded bg-[#101115] border border-[#282C36] text-[#E6E8EC]"
                            >
                              {visualMediaPool.map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                  {asset.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-0.5">
                            <span className="text-[10px] text-[#7A8190]">Transition In</span>
                            <select
                              value={scene.transitionIn}
                              onChange={(e) =>
                                updateAutoPlanScene(scene.id, {
                                  transitionIn: e.target.value as AutoSceneTransition,
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-[#101115] border border-[#282C36] text-[#E6E8EC]"
                            >
                              {SCENE_TRANSITIONS.map((tr) => (
                                <option key={tr} value={tr}>
                                  {tr}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="grid grid-cols-2 gap-1.5">
                            <label className="space-y-0.5">
                              <span className="text-[10px] text-[#7A8190]">Dur (s)</span>
                              <input
                                type="number"
                                min={0.8}
                                max={15}
                                step={0.2}
                                value={scene.durationSec}
                                onChange={(e) =>
                                  updateAutoPlanScene(scene.id, {
                                    durationSec: Math.max(0.8, Number(e.target.value) || 1),
                                  })
                                }
                                className="w-full px-2 py-1 rounded bg-[#101115] border border-[#282C36] font-mono text-[#E6E8EC] tabular-nums"
                              />
                            </label>
                            <label className="space-y-0.5">
                              <span className="text-[10px] text-[#7A8190]">Speed</span>
                              <select
                                value={scene.speedMultiplier}
                                onChange={(e) =>
                                  updateAutoPlanScene(scene.id, {
                                    speedMultiplier: Number(e.target.value),
                                  })
                                }
                                className="w-full px-2 py-1 rounded bg-[#101115] border border-[#282C36] font-mono text-[#E6E8EC]"
                              >
                                <option value={0.5}>0.5x</option>
                                <option value={1}>1.0x</option>
                                <option value={1.25}>1.25x</option>
                                <option value={1.5}>1.5x</option>
                              </select>
                            </label>
                          </div>
                        </div>

                        {/* Per-Scene Effect Toggles */}
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <span className="text-[10px] text-[#7A8190] mr-1">Effects:</span>
                          {SCENE_EFFECT_CHOICES.map((eff) => {
                            const on = scene.appliedEffects.includes(eff);
                            return (
                              <button
                                key={eff}
                                type="button"
                                onClick={() =>
                                  toggleSceneEffect(scene.id, scene.appliedEffects, eff)
                                }
                                className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                  on
                                    ? 'bg-[#1C2A42] border-[#3B82F6]/60 text-[#93C5FD]'
                                    : 'bg-[#121418] border-[#262A34] text-[#6D7484] hover:text-[#C8CDD8]'
                                }`}
                              >
                                {eff}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-[12px] text-[#7A8190]">
                    Generate a preview in Step 6 to edit scenes, lock highlights, or regenerate variants.
                  </div>
                )}
              </div>
            )}

            {/* STEP 8: EXPORT */}
            {activeStep === 8 && <AutoExportPanel />}
          </div>
        </section>

        {/* Right: Persistent Live Output Monitor & Assembly Summary */}
        <aside className="xl:col-span-5 bg-[#0F1013] flex flex-col min-h-0 overflow-y-auto p-4 space-y-4">
          {/* Output Frame Monitor */}
          <div className="rounded-md bg-[#15171B] border border-[#24272F] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-medium text-[#D1D5DB]">
                Auto Studio Monitor <span className="text-[#7A8190]">(Simulated Preview)</span>
              </span>
              <span className="font-mono text-[#9BA2B0] tabular-nums">
                {resolvedDims.width}×{resolvedDims.height} · {autoConfig.aspectRatio} ·{' '}
                {autoConfig.frameRate}fps
              </span>
            </div>

            <div className="bg-[#0A0B0E] border border-[#20232B] rounded flex items-center justify-center p-3 min-h-[240px]">
              {activePreviewAsset ? (
                <div
                  style={aspectBoxStyle}
                  className="relative overflow-hidden rounded-sm border border-[#3B82F6]/50 bg-black flex items-center justify-center mx-auto transition-all duration-200"
                >
                  {activePreviewAsset.objectUrl && activePreviewAsset.kind === 'video' ? (
                    <video
                      src={activePreviewAsset.objectUrl}
                      controls
                      muted
                      className="w-full h-full object-cover"
                      style={{
                        filter: autoConfig.colorCorrection ? selectedPreset.previewFilterCss : 'none',
                        transform: autoConfig.motionBasedZoom ? 'scale(1.06)' : 'scale(1)',
                      }}
                    />
                  ) : (
                    <img
                      src={activePreviewAsset.thumbnailUrl}
                      alt={activePreviewAsset.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300"
                      style={{
                        filter: autoConfig.colorCorrection ? selectedPreset.previewFilterCss : 'none',
                        transform: autoConfig.motionBasedZoom ? 'scale(1.06)' : 'scale(1)',
                      }}
                    />
                  )}
                  <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/75 px-2 py-1 rounded-xs text-[10px] font-mono text-[#E6E8EC]">
                    <span className="truncate">
                      {activeScene
                        ? `Scene ${activeScene.orderIndex + 1} · ${activeScene.mediaName}`
                        : selectedPreset.name}
                    </span>
                    <span className="tabular-nums">
                      {activeScene
                        ? `${activeScene.speedMultiplier}x`
                        : selectedPreset.cutCadence}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-[#7A8190]">
                  Import or select source media to preview framing
                </div>
              )}
            </div>

            {/* Playback Scrub Bar for Generated Preview */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                disabled={!autoPlanPreview}
                onClick={() => setIsPlayingPlan((p) => !p)}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white text-[11px] font-medium disabled:opacity-40"
              >
                {isPlayingPlan ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlayingPlan ? 'Pause' : 'Play Plan'}</span>
              </button>

              <input
                type="range"
                min={0}
                max={Math.max(1, totalPreviewDuration)}
                step={0.1}
                disabled={!autoPlanPreview}
                value={previewTimeSec}
                onChange={(e) => {
                  setIsPlayingPlan(false);
                  setPreviewTimeSec(Number(e.target.value));
                }}
                className="studio-slider flex-1 disabled:opacity-40"
              />

              <span className="font-mono text-[11px] text-[#AEB5C2] tabular-nums">
                {formatTimecode(previewTimeSec, 24)}
              </span>
            </div>
          </div>

          {/* Live Configuration Snapshot */}
          <div className="rounded-md bg-[#15171B] border border-[#24272F] p-3.5 space-y-3 text-[12px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-[#F3F4F6]">
                <Sliders className="w-3.5 h-3.5 text-[#8E95A5]" />
                <span>Pipeline Configuration</span>
              </div>
              <span className="font-mono text-[11px] text-[#7A8190] tabular-nums">
                {activeFlagCount}/13 controls active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded bg-[#111216] border border-[#22252E]">
                <div className="text-[#7A8190]">Style Preset</div>
                <div className="font-medium text-[#E6E8EC] truncate mt-0.5">
                  {selectedPreset.name}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#111216] border border-[#22252E]">
                <div className="text-[#7A8190]">Source Pool</div>
                <div className="font-mono text-[#E6E8EC] tabular-nums mt-0.5">
                  {selectedMedia.length} clips ({formatDurationCompact(totalRawDuration)})
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#111216] border border-[#22252E]">
                <div className="text-[#7A8190]">Target Output</div>
                <div className="font-mono text-[#E6E8EC] tabular-nums mt-0.5">
                  {autoConfig.resolution} · {autoConfig.aspectRatio}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#111216] border border-[#22252E]">
                <div className="text-[#7A8190]">Audio Target</div>
                <div className="font-mono text-[#E6E8EC] tabular-nums mt-0.5">
                  {autoConfig.audioEnhancement ? `${selectedPreset.audioTargetLufs} LUFS` : 'Passthrough'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleOpenStep(8)}
                className="flex-1 py-1.5 rounded bg-[#1E212A] hover:bg-[#272C38] text-[#E6E8EC] border border-[#2D3240] text-[11px] font-medium"
              >
                Go to Export Panel
              </button>
              <button
                type="button"
                onClick={sendAutoPlanToTimeline}
                className="flex-1 py-1.5 rounded bg-[#1C2A42] hover:bg-[#2563EB] text-[#93C5FD] hover:text-white border border-[#3B82F6]/50 text-[11px] font-medium transition-colors"
              >
                Open in Pro Editor
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
