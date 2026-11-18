import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { PreviewAspect, PreviewQuality, TimelineClip } from '../../types/studio';
import { getClipDuckingAtTime } from '../../utils/audioDucking';
import { formatTimecode } from '../../utils/formatters';
import { evaluateClipPropertyAtOffset } from '../../utils/keyframeInterpolation';

interface PreviewMonitorProps {
  totalTimelineSec: number;
}

const ASPECT_MAP: Record<PreviewAspect, string> = {
  '16:9': '16 / 9',
  '9:16': '9 / 16',
  '1:1': '1 / 1',
  '4:5': '4 / 5',
  '21:9': '21 / 9',
};

const PLAYBACK_SPEEDS: (0.5 | 1 | 1.5 | 2)[] = [0.5, 1, 1.5, 2];
const QUALITY_OPTIONS: PreviewQuality[] = ['Full', '1/2', '1/4'];
const ASPECT_OPTIONS: PreviewAspect[] = ['16:9', '9:16', '1:1', '4:5', '21:9'];
const FRAME_STEP_SEC = 1 / 24;

function buildClipFilterCss(clip: TimelineClip, quality: PreviewQuality): string {
  const exposure = clip.exposure ?? 0;
  const contrast = clip.contrast ?? 0;
  const saturation = clip.saturation ?? 0;
  const temperature = clip.temperature ?? 0;

  const brightnessVal = Math.max(0.2, 1 + exposure / 100);
  const contrastVal = Math.max(0.2, 1 + contrast / 100);
  const saturateVal = Math.max(0, 1 + saturation / 100);
  const sepiaVal = temperature > 0 ? Math.min(0.45, temperature / 120) : 0;
  const hueRotateVal = temperature < 0 ? `${Math.max(-25, temperature * 0.45)}deg` : '0deg';
  const qualityBlur = quality === '1/4' ? 'blur(0.6px)' : quality === '1/2' ? 'blur(0.2px)' : '';

  return [
    `brightness(${brightnessVal.toFixed(2)})`,
    `contrast(${contrastVal.toFixed(2)})`,
    `saturate(${saturateVal.toFixed(2)})`,
    sepiaVal > 0 ? `sepia(${sepiaVal.toFixed(2)})` : '',
    temperature < 0 ? `hue-rotate(${hueRotateVal})` : '',
    qualityBlur,
  ]
    .filter(Boolean)
    .join(' ');
}

function computeClipOpacity(clip: TimelineClip, playheadSec: number): number {
  const relOffset = Math.max(0, playheadSec - clip.startSec);
  const hasOpacityKfs = (clip.keyframes ?? []).some((k) => k.property === 'opacity');
  const animatedOpacityPct = hasOpacityKfs
    ? evaluateClipPropertyAtOffset(clip, 'opacity', relOffset)
    : clip.opacityPct ?? 100;
  const baseOpacity = Math.max(0, Math.min(1, animatedOpacityPct / 100));
  const transDur = clip.transitionDurationSec ?? 0;
  if (!clip.transitionIn || clip.transitionIn === 'None' || transDur <= 0) {
    return baseOpacity;
  }
  if (relOffset >= 0 && relOffset < transDur) {
    return baseOpacity * Math.max(0.05, Math.min(1, relOffset / transDur));
  }
  return baseOpacity;
}

export const PreviewMonitor: React.FC<PreviewMonitorProps> = ({ totalTimelineSec }) => {
  const timelineClips = useStudioStore((s) => s.timelineClips);
  const timelineTracks = useStudioStore((s) => s.timelineTracks);
  const mediaPool = useStudioStore((s) => s.mediaPool);
  const playheadSec = useStudioStore((s) => s.playheadSec);
  const isPlayingPreview = useStudioStore((s) => s.isPlayingPreview);
  const previewSpeed = useStudioStore((s) => s.previewSpeed);
  const previewQuality = useStudioStore((s) => s.previewQuality);
  const previewAspect = useStudioStore((s) => s.previewAspect);

  const setPlayheadSec = useStudioStore((s) => s.setPlayheadSec);
  const togglePreviewPlayback = useStudioStore((s) => s.togglePreviewPlayback);
  const setPreviewSpeed = useStudioStore((s) => s.setPreviewSpeed);
  const setPreviewQuality = useStudioStore((s) => s.setPreviewQuality);
  const setPreviewAspect = useStudioStore((s) => s.setPreviewAspect);

  const monitorRef = useRef<HTMLElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [monitorMuted, setMonitorMuted] = useState(false);

  // Sync fullscreen state if user exits via Esc
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = monitorRef.current;
    if (!isFullscreen) {
      if (el?.requestFullscreen) {
        try {
          await el.requestFullscreen();
        } catch {
          // Fallback to fixed CSS overlay when iframe blocks native Fullscreen API
        }
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch {
          // Ignore exit errors
        }
      }
      setIsFullscreen(false);
    }
  };

  // Determine visible video layers in stack order (V1 bottom -> V2 -> V3 top)
  const visibleTrackSet = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const tr of timelineTracks) {
      map.set(tr.id, tr.visible);
    }
    return map;
  }, [timelineTracks]);

  const activeVideoLayers = useMemo(() => {
    const order: Record<string, number> = { V1: 1, V2: 2, V3: 3 };
    return timelineClips
      .filter((c) => {
        if (!c.trackId.startsWith('V')) return false;
        if (visibleTrackSet.get(c.trackId) === false) return false;
        return playheadSec >= c.startSec && playheadSec <= c.startSec + c.durationSec;
      })
      .sort((a, b) => (order[a.trackId] ?? 0) - (order[b.trackId] ?? 0));
  }, [timelineClips, visibleTrackSet, playheadSec]);

  const activeAudioStatus = useMemo(() => {
    const anySolo = timelineTracks.some((t) => t.kind === 'audio' && t.solo);
    const activeClips = timelineClips.filter((c) => {
      if (!c.trackId.startsWith('A')) return false;
      const track = timelineTracks.find((t) => t.id === c.trackId);
      if (!track || track.muted || c.audioMuted) return false;
      if (anySolo && !track.solo) return false;
      return playheadSec >= c.startSec && playheadSec <= c.startSec + c.durationSec;
    });
    const duckedClip = activeClips.find((c) =>
      getClipDuckingAtTime(c, playheadSec, timelineClips, timelineTracks).isDucked
    );
    const duckReduction = duckedClip
      ? getClipDuckingAtTime(duckedClip, playheadSec, timelineClips, timelineTracks).reductionDb
      : 0;
    return {
      count: activeClips.length,
      duckedTrackId: duckedClip?.trackId ?? null,
      duckReduction,
    };
  }, [timelineClips, timelineTracks, playheadSec]);

  // Keep local imported <video> elements synced with playhead & speed
  useEffect(() => {
    for (const clip of activeVideoLayers) {
      const videoEl = videoRefs.current[clip.id];
      if (!videoEl) continue;
      const targetTime = clip.trimInSec + Math.max(0, playheadSec - clip.startSec) * clip.speed;
      if (Math.abs(videoEl.currentTime - targetTime) > 0.25) {
        videoEl.currentTime = Math.min(videoEl.duration || targetTime, targetTime);
      }
      videoEl.playbackRate = Math.min(4, Math.max(0.25, clip.speed * previewSpeed));
      videoEl.muted = monitorMuted || Boolean(clip.audioMuted);
      if (isPlayingPreview && videoEl.paused) {
        videoEl.play().catch(() => {});
      } else if (!isPlayingPreview && !videoEl.paused) {
        videoEl.pause();
      }
    }
  }, [activeVideoLayers, isPlayingPreview, monitorMuted, playheadSec, previewSpeed]);

  const primaryLayer = activeVideoLayers[activeVideoLayers.length - 1] ?? null;

  return (
    <section
      ref={monitorRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#0B0C0F] flex flex-col'
          : 'lg:col-span-6 bg-[#0F1013] flex flex-col min-h-0'
      }
    >
      {/* Top Monitor Controls */}
      <div className="px-3 py-1.5 border-b border-[#20232B] bg-[#14161A] flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-[#C8CDD8] truncate">
            {primaryLayer ? `${primaryLayer.trackId} · ${primaryLayer.label}` : 'Program Monitor'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Preview Quality */}
          <label className="flex items-center gap-1 text-[#8E95A5]">
            <span className="hidden sm:inline text-[10px]">Quality</span>
            <select
              value={previewQuality}
              onChange={(e) => setPreviewQuality(e.target.value as PreviewQuality)}
              aria-label="Preview quality"
              className="px-1.5 py-0.5 rounded bg-[#101115] border border-[#282C36] text-[10px] font-mono text-[#E6E8EC]"
            >
              {QUALITY_OPTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </label>

          {/* Aspect Ratio */}
          <label className="flex items-center gap-1 text-[#8E95A5]">
            <span className="hidden sm:inline text-[10px]">Aspect</span>
            <select
              value={previewAspect}
              onChange={(e) => setPreviewAspect(e.target.value as PreviewAspect)}
              aria-label="Preview aspect ratio"
              className="px-1.5 py-0.5 rounded bg-[#101115] border border-[#282C36] text-[10px] font-mono text-[#E6E8EC]"
            >
              {ASPECT_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          {/* Timecode Readout */}
          <div className="px-2 py-0.5 rounded bg-[#0E1014] border border-[#24272F] font-mono text-[11px] text-[#E6E8EC] tabular-nums">
            {formatTimecode(playheadSec, 24)}
            <span className="text-[#6D7484]"> / {formatTimecode(totalTimelineSec, 24)}</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
            className="p-1 rounded bg-[#1B1E25] hover:bg-[#262B36] text-[#AEB5C2] hover:text-white border border-[#282C36]"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Video Frame Compositor Canvas */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-3 bg-[#0B0C0F] overflow-hidden">
        <div
          style={{ aspectRatio: ASPECT_MAP[previewAspect] }}
          className="relative max-w-full max-h-full h-full w-auto bg-black border border-[#262932] rounded-sm overflow-hidden flex items-center justify-center shadow-lg"
        >
          {activeVideoLayers.length === 0 ? (
            <div className="text-center space-y-1">
              <div className="text-[12px] font-mono text-[#6D7484]">Black Frame</div>
              <div className="text-[10px] text-[#525866]">
                No visible video clip at {formatTimecode(playheadSec, 24)}
              </div>
            </div>
          ) : (
            activeVideoLayers.map((layer) => {
              const asset = mediaPool.find((m) => m.id === layer.mediaId);
              const relOffset = Math.max(0, playheadSec - layer.startSec);
              const opacity = computeClipOpacity(layer, playheadSec);
              const filterCss = buildClipFilterCss(layer, previewQuality);
              const tx = layer.positionX ?? 0;
              const ty = layer.positionY ?? 0;
              const hasScaleKfs = (layer.keyframes ?? []).some((k) => k.property === 'scale');
              const hasRotKfs = (layer.keyframes ?? []).some((k) => k.property === 'rotation');
              const sc =
                (hasScaleKfs
                  ? evaluateClipPropertyAtOffset(layer, 'scale', relOffset)
                  : layer.scalePct ?? 100) / 100;
              const rot = hasRotKfs
                ? evaluateClipPropertyAtOffset(layer, 'rotation', relOffset)
                : layer.rotationDeg ?? 0;
              const cropTop = layer.cropTopPct ?? 0;
              const cropRight = layer.cropRightPct ?? 0;
              const cropBottom = layer.cropBottomPct ?? 0;
              const cropLeft = layer.cropLeftPct ?? 0;

              const layerStyle: React.CSSProperties = {
                opacity,
                filter: filterCss,
                transform: `translate(${tx}px, ${ty}px) scale(${sc}) rotate(${rot}deg)`,
                clipPath: `inset(${cropTop}% ${cropRight}% ${cropBottom}% ${cropLeft}%)`,
              };

              const isWhipPanTransition =
                layer.transitionIn === 'Whip Pan' &&
                (layer.transitionDurationSec ?? 0) > 0 &&
                playheadSec - layer.startSec < (layer.transitionDurationSec ?? 0);

              if (isWhipPanTransition) {
                const progress =
                  (playheadSec - layer.startSec) / Math.max(0.1, layer.transitionDurationSec ?? 1);
                const slidePct = (1 - progress) * 28;
                layerStyle.transform = `translate(${tx - slidePct}%, ${ty}px) scale(${sc}) rotate(${rot}deg)`;
              }

              return (
                <div
                  key={layer.id}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  {asset?.objectUrl && asset.kind === 'video' ? (
                    <video
                      ref={(el) => {
                        videoRefs.current[layer.id] = el;
                      }}
                      src={asset.objectUrl}
                      style={layerStyle}
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : layer.thumbnailUrl ? (
                    <img
                      src={layer.thumbnailUrl}
                      alt={layer.label}
                      referrerPolicy="no-referrer"
                      style={layerStyle}
                      className="w-full h-full object-cover"
                    />
                  ) : null}

                  {layer.textOverlay && (
                    <div
                      style={{ opacity }}
                      className="absolute bottom-5 left-5 right-5 flex justify-start"
                    >
                      <div className="px-3 py-1 bg-black/75 border border-white/15 text-[12px] font-semibold tracking-wider text-white">
                        {layer.textOverlay}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Transport Controls */}
      <div className="px-3 py-2 border-t border-[#20232B] bg-[#14161A] flex items-center justify-between gap-2">
        {/* Left: Audio monitor mute & active stem count */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setMonitorMuted((m) => !m)}
            title={monitorMuted ? 'Unmute monitor audio' : 'Mute monitor audio'}
            className={`p-1.5 rounded border text-[11px] transition-colors ${
              monitorMuted
                ? 'bg-[#2A1B1E] border-[#EF4444]/50 text-[#FCA5A5]'
                : 'bg-[#1B1E25] border-[#282C36] text-[#9BA2B0] hover:text-white'
            }`}
          >
            {monitorMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <span className="hidden sm:inline text-[10px] font-mono text-[#7A8190] tabular-nums">
            {activeAudioStatus.count} audio {activeAudioStatus.count === 1 ? 'stem' : 'stems'} active
            {activeAudioStatus.duckedTrackId && (
              <span className="text-[#F59E0B]">
                {' '}
                · {activeAudioStatus.duckedTrackId} ducked {activeAudioStatus.duckReduction} dB
              </span>
            )}
          </span>
        </div>

        {/* Center: Transport & Frame Stepping */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPlayheadSec(0)}
            title="Jump to timeline start"
            className="p-1.5 rounded text-[#9BA2B0] hover:text-white hover:bg-[#22252E]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPlayheadSec(Math.max(0, playheadSec - 1))}
            title="Step backward 1 second"
            className="p-1.5 rounded text-[#9BA2B0] hover:text-white hover:bg-[#22252E]"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPlayheadSec(Math.max(0, playheadSec - FRAME_STEP_SEC))}
            title="Step back 1 frame (1/24s)"
            className="px-1.5 py-1 rounded text-[10px] font-mono text-[#AEB5C2] hover:text-white hover:bg-[#22252E] flex items-center"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>1f</span>
          </button>

          <button
            type="button"
            onClick={togglePreviewPlayback}
            className="mx-1 px-3.5 py-1.5 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white flex items-center gap-1.5 text-[11px] font-medium transition-colors"
          >
            {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlayingPreview ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => setPlayheadSec(Math.min(totalTimelineSec, playheadSec + FRAME_STEP_SEC))}
            title="Step forward 1 frame (1/24s)"
            className="px-1.5 py-1 rounded text-[10px] font-mono text-[#AEB5C2] hover:text-white hover:bg-[#22252E] flex items-center"
          >
            <span>1f</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPlayheadSec(Math.min(totalTimelineSec, playheadSec + 1))}
            title="Step forward 1 second"
            className="p-1.5 rounded text-[#9BA2B0] hover:text-white hover:bg-[#22252E]"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Playback Speed */}
        <div className="flex items-center gap-1 shrink-0">
          {PLAYBACK_SPEEDS.map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => setPreviewSpeed(spd)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums transition-colors ${
                previewSpeed === spd
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-[#1B1E25] text-[#8E95A5] hover:text-white border border-[#282C36]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
