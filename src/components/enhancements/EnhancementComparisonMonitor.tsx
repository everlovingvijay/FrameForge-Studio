import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  Eye,
  Film,
  Pause,
  Play,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { ComputedEnhancementPreview } from '../../config/enhancementProfiles';
import { MediaAsset, VideoEnhancementState } from '../../types/studio';
import { formatTimecode } from '../../utils/formatters';

export type ComparisonMode = 'split' | 'side-by-side' | 'after-only';

interface EnhancementComparisonMonitorProps {
  clip: MediaAsset | undefined;
  mediaPool: MediaAsset[];
  selectedClipId: string;
  onSelectClip: (id: string) => void;
  onImportFiles: (files: FileList) => void;
  enhancements: VideoEnhancementState;
  preview: ComputedEnhancementPreview;
}

export const EnhancementComparisonMonitor: React.FC<EnhancementComparisonMonitorProps> = ({
  clip,
  mediaPool,
  selectedClipId,
  onSelectClip,
  onImportFiles,
  enhancements,
  preview,
}) => {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('split');
  const [splitPct, setSplitPct] = useState(52);
  const [isDraggingWipe, setIsDraggingWipe] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const beforeVideoRef = useRef<HTMLVideoElement | null>(null);
  const afterVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visualAssets = useMemo(
    () => mediaPool.filter((m) => m.kind === 'video' || m.kind === 'image'),
    [mediaPool]
  );

  const isRealVideo = Boolean(clip?.kind === 'video' && clip.objectUrl);
  const durationSec = Math.max(1, clip?.durationSeconds ?? 10);
  const fps = clip?.fps && clip.fps > 0 ? clip.fps : 24;

  // Reset playhead when switching clip
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTimeSec(0);
    if (beforeVideoRef.current) beforeVideoRef.current.currentTime = 0;
    if (afterVideoRef.current) afterVideoRef.current.currentTime = 0;
  }, [clip?.id]);

  // Keep slow motion rate synced on real videos
  useEffect(() => {
    const rate = Math.max(0.25, Math.min(1, enhancements.slowMotionRate));
    if (beforeVideoRef.current) beforeVideoRef.current.playbackRate = rate;
    if (afterVideoRef.current) afterVideoRef.current.playbackRate = rate;
  }, [enhancements.slowMotionRate, isRealVideo, comparisonMode]);

  // Synchronize playback across real <video> elements or sample preview clock
  useEffect(() => {
    if (!isPlaying) {
      beforeVideoRef.current?.pause();
      afterVideoRef.current?.pause();
      return;
    }

    if (isRealVideo) {
      const rate = Math.max(0.25, Math.min(1, enhancements.slowMotionRate));
      if (beforeVideoRef.current) {
        beforeVideoRef.current.playbackRate = rate;
        void beforeVideoRef.current.play().catch(() => {});
      }
      if (afterVideoRef.current) {
        afterVideoRef.current.playbackRate = rate;
        void afterVideoRef.current.play().catch(() => {});
      }

      const syncInterval = window.setInterval(() => {
        const master = afterVideoRef.current ?? beforeVideoRef.current;
        if (!master) return;
        setCurrentTimeSec(master.currentTime);
        if (
          beforeVideoRef.current &&
          afterVideoRef.current &&
          Math.abs(beforeVideoRef.current.currentTime - afterVideoRef.current.currentTime) > 0.04
        ) {
          beforeVideoRef.current.currentTime = afterVideoRef.current.currentTime;
        }
      }, 60);

      return () => window.clearInterval(syncInterval);
    }

    // Sample preview clock synchronized at slowMotionRate
    let lastTs = performance.now();
    let rafId = 0;
    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      setCurrentTimeSec((prev) => {
        const next = prev + dt * enhancements.slowMotionRate;
        return next >= durationSec ? 0 : next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isRealVideo, durationSec, enhancements.slowMotionRate, comparisonMode]);

  const seekTo = useCallback(
    (nextSec: number) => {
      const clamped = Math.max(0, Math.min(durationSec, nextSec));
      setCurrentTimeSec(clamped);
      if (beforeVideoRef.current) beforeVideoRef.current.currentTime = clamped;
      if (afterVideoRef.current) afterVideoRef.current.currentTime = clamped;
    },
    [durationSec]
  );

  const stepFrame = useCallback(
    (dir: -1 | 1) => {
      setIsPlaying(false);
      seekTo(currentTimeSec + dir * (1 / fps));
    },
    [currentTimeSec, fps, seekTo]
  );

  // Interactive pointer drag on split canvas
  const updateWipeFromPointer = useCallback((clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
    setSplitPct(Math.round(Math.max(5, Math.min(95, pct))));
  }, []);

  useEffect(() => {
    if (!isDraggingWipe) return;
    const onMove = (e: PointerEvent) => updateWipeFromPointer(e.clientX);
    const onUp = () => setIsDraggingWipe(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDraggingWipe, updateWipeFromPointer]);

  // SVG RGB matrix filter string derived from R/G/B channel controls
  const [rScale, gScale, bScale] = preview.rgbScale;
  const hasRgbShift =
    Math.abs(rScale - 1) > 0.005 ||
    Math.abs(gScale - 1) > 0.005 ||
    Math.abs(bScale - 1) > 0.005;
  const svgMatrixValues = `${rScale.toFixed(3)} 0 0 0 0  0 ${gScale.toFixed(3)} 0 0 0  0 0 ${bScale.toFixed(3)} 0 0  0 0 0 1 0`;

  const combinedAfterFilter = hasRgbShift
    ? `${preview.cssFilter} url(#ff-enhance-rgb-matrix)`
    : preview.cssFilter;

  const renderMediaFrame = (variant: 'before' | 'after') => {
    if (!clip) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0C0F] text-[#8E95A5] gap-2">
          <Film className="w-7 h-7 text-[#5A6275]" />
          <p className="text-[12px]">Import or select a video clip to begin enhancement.</p>
        </div>
      );
    }

    const isAfter = variant === 'after';
    const mediaStyle: React.CSSProperties = isAfter
      ? {
          filter: combinedAfterFilter,
          transform: preview.transform,
        }
      : {};

    return (
      <div className="relative w-full h-full overflow-hidden bg-black">
        {isRealVideo && clip.objectUrl ? (
          <video
            ref={isAfter ? afterVideoRef : beforeVideoRef}
            src={clip.objectUrl}
            muted
            loop
            playsInline
            className="w-full h-full object-contain transition-[filter] duration-75"
            style={mediaStyle}
          />
        ) : (
          <img
            src={clip.thumbnailUrl}
            alt={isAfter ? `${clip.name} enhanced` : `${clip.name} original`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-[filter,transform] duration-100"
            style={mediaStyle}
          />
        )}

        {/* Chromatic aberration fringe simulation (After only) */}
        {isAfter && preview.chromaticOffsetPx > 0.2 && (
          <div
            className="pointer-events-none absolute inset-0 mix-blend-screen opacity-25"
            style={{
              boxShadow: `inset ${preview.chromaticOffsetPx}px 0 0 rgba(239,68,68,0.65), inset -${preview.chromaticOffsetPx}px 0 0 rgba(56,189,248,0.65)`,
            }}
          />
        )}

        {/* Halation / Cinematic bloom overlay (After only) */}
        {isAfter && preview.halationOpacity > 0.01 && (
          <div
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            style={{
              opacity: preview.halationOpacity,
              background:
                'radial-gradient(circle at 50% 42%, rgba(251, 146, 60, 0.28), rgba(244, 63, 94, 0.12) 48%, transparent 78%)',
            }}
          />
        )}

        {/* Film & Sensor Grain overlay (After only) */}
        {isAfter && preview.grainOpacity > 0.01 && (
          <div
            className="pointer-events-none absolute inset-0 mix-blend-overlay"
            style={{
              opacity: preview.grainOpacity,
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.45) 0.6px, transparent 0.6px), radial-gradient(rgba(0,0,0,0.45) 0.6px, transparent 0.6px)',
              backgroundSize: '3px 3px',
              backgroundPosition: `${Math.round((currentTimeSec * 24) % 3)}px ${Math.round(
                (currentTimeSec * 17) % 3
              )}px`,
            }}
          />
        )}

        {/* Optical Vignette overlay (After only) */}
        {isAfter && preview.vignetteOpacity > 0.01 && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle, transparent 44%, rgba(0,0,0,${preview.vignetteOpacity.toFixed(
                3
              )}) 100%)`,
            }}
          />
        )}

        {/* Sample-clip synchronized motion indicator line (when no real video URL) */}
        {!isRealVideo && isPlaying && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-[#3B82F6]/70"
            style={{ width: `${(currentTimeSec / durationSec) * 100}%` }}
          />
        )}
      </div>
    );
  };

  const classificationCopy =
    preview.pipelineClassification === 'restoration'
      ? 'Genuine Restoration Only'
      : preview.pipelineClassification === 'stylistic'
      ? 'Stylistic Camera Simulation'
      : 'Hybrid · Restoration + Stylistic Simulation';

  const classificationAccent =
    preview.pipelineClassification === 'restoration'
      ? 'text-[#34D399]'
      : preview.pipelineClassification === 'stylistic'
      ? 'text-[#F59E0B]'
      : 'text-[#60A5FA]';

  return (
    <main className="flex-1 bg-[#0F1013] p-4 lg:p-5 flex flex-col min-h-0 overflow-hidden">
      {/* Hidden SVG filter bank for real-time RGB channel matrix */}
      <svg className="sr-only" aria-hidden="true">
        <defs>
          <filter id="ff-enhance-rgb-matrix">
            <feColorMatrix type="matrix" values={svgMatrixValues} />
          </filter>
        </defs>
      </svg>

      {/* Top Monitor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-[16px] font-semibold text-[#F3F4F6] tracking-tight">
            Video Enhancement Studio
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8E95A5] mt-0.5">
            <span className={classificationAccent}>{classificationCopy}</span>
            <span aria-hidden="true">·</span>
            <span>
              {isRealVideo
                ? 'Synchronized Native HTML5 Video Decode'
                : 'Preview Proxy Mode (Import local video for frame-synced playback)'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Comparison Mode Segmented Control */}
          <div className="flex items-center p-0.5 rounded bg-[#181A20] border border-[#272B35]">
            <button
              type="button"
              onClick={() => setComparisonMode('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                comparisonMode === 'split'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#9BA2B0] hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Split Wipe</span>
            </button>
            <button
              type="button"
              onClick={() => setComparisonMode('side-by-side')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                comparisonMode === 'side-by-side'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#9BA2B0] hover:text-white'
              }`}
            >
              <Columns2 className="w-3 h-3" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setComparisonMode('after-only')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                comparisonMode === 'after-only'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#9BA2B0] hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>After Only</span>
            </button>
          </div>

          {/* Clip Selector */}
          <select
            value={selectedClipId}
            onChange={(e) => onSelectClip(e.target.value)}
            aria-label="Select footage to preview"
            className="max-w-[230px] px-2.5 py-1.5 rounded bg-[#181A20] border border-[#2B2F3A] text-[12px] text-[#E6E8EC]"
          >
            {visualAssets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onImportFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1B1E25] hover:bg-[#242832] border border-[#2E3340] text-[11px] font-medium text-[#E6E8EC] transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>Load Clip</span>
          </button>
        </div>
      </div>

      {/* Synchronized Before / After Viewport */}
      {comparisonMode === 'side-by-side' ? (
        <div className="flex-1 min-h-[280px] grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative rounded-md bg-black border border-[#252832] overflow-hidden">
            {renderMediaFrame('before')}
            <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-sm bg-black/75 text-[11px] font-mono text-[#E6E8EC] border border-white/10">
              BEFORE · ORIGINAL
            </div>
          </div>
          <div className="relative rounded-md bg-black border border-[#252832] overflow-hidden">
            {renderMediaFrame('after')}
            <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-sm bg-black/75 text-[11px] font-mono text-[#60A5FA] border border-[#3B82F6]/30">
              AFTER · {preview.activeCameraProfile.id !== 'none' ? preview.activeCameraProfile.name.toUpperCase() : 'ENHANCED'}
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={stageRef}
          onPointerDown={(e) => {
            if (comparisonMode !== 'split') return;
            setIsDraggingWipe(true);
            updateWipeFromPointer(e.clientX);
          }}
          className={`relative flex-1 min-h-[280px] rounded-md bg-black border border-[#252832] overflow-hidden select-none ${
            comparisonMode === 'split' ? 'cursor-ew-resize' : ''
          }`}
        >
          {/* Base AFTER layer */}
          {renderMediaFrame('after')}

          {/* Clipped BEFORE layer (geometric clipPath keeps before & after 1:1 aligned) */}
          {comparisonMode === 'split' && (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
              >
                {renderMediaFrame('before')}
              </div>

              {/* Interactive Wipe Line & Handle */}
              <div
                className="absolute top-0 bottom-0 w-px bg-white/90 pointer-events-none"
                style={{ left: `${splitPct}%` }}
              >
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-10 rounded bg-[#15171B]/95 border border-white/60 flex items-center justify-center shadow">
                  <div className="flex gap-0.5">
                    <span className="w-px h-4 bg-white/75" />
                    <span className="w-px h-4 bg-white/75" />
                  </div>
                </div>
              </div>

              <div className="absolute top-3 left-3 px-2 py-1 rounded-sm bg-black/75 text-[11px] font-mono text-[#E6E8EC]">
                BEFORE · ORIGINAL
              </div>
            </>
          )}

          <div className="absolute top-3 right-3 px-2 py-1 rounded-sm bg-black/75 text-[11px] font-mono text-[#60A5FA]">
            AFTER · {preview.activeCameraProfile.id !== 'none' ? preview.activeCameraProfile.name : 'ENHANCED'}
          </div>
        </div>
      )}

      {/* Synchronized Transport + Wipe Controls */}
      <div className="mt-3 pt-3 border-t border-[#20232B] space-y-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => stepFrame(-1)}
              title="Previous Frame"
              className="p-1.5 rounded bg-[#181A20] hover:bg-[#232732] border border-[#272B35] text-[#C8CDD8]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-medium transition-colors whitespace-nowrap shrink-0"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play Sync'}</span>
            </button>
            <button
              type="button"
              onClick={() => stepFrame(1)}
              title="Next Frame"
              className="p-1.5 rounded bg-[#181A20] hover:bg-[#232732] border border-[#272B35] text-[#C8CDD8]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="font-mono text-[12px] text-[#E6E8EC] tabular-nums whitespace-nowrap">
            {formatTimecode(currentTimeSec, fps)} / {formatTimecode(durationSec, fps)}
          </span>

          <input
            type="range"
            min={0}
            max={durationSec}
            step={0.05}
            value={currentTimeSec}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Synchronized video scrub timeline"
            className="studio-slider flex-1 min-w-[140px]"
          />

          <div className="flex items-center gap-2 text-[11px] text-[#8E95A5] font-mono tabular-nums whitespace-nowrap">
            <span>Rate {enhancements.slowMotionRate.toFixed(2)}x</span>
            {clip && clip.width > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {clip.width}x{clip.height}
                </span>
              </>
            )}
          </div>
        </div>

        {comparisonMode === 'split' && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#9BA2B0] whitespace-nowrap">Comparison Wipe</span>
            <input
              type="range"
              min={5}
              max={95}
              value={splitPct}
              onChange={(e) => setSplitPct(Number(e.target.value))}
              aria-label="Before and after split wipe position"
              className="studio-slider flex-1"
            />
            <span className="text-[11px] font-mono text-[#E6E8EC] w-10 text-right tabular-nums">
              {splitPct}%
            </span>
          </div>
        )}
      </div>
    </main>
  );
};
