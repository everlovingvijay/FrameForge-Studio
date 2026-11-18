import React, { useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Diamond,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { KeyframeProperty, TimelineClip } from '../../types/studio';
import {
  getClipDuckingAtTime,
  getClipDuckingIntervals,
  isVoiceOverClip,
} from '../../utils/audioDucking';
import { formatTimecode } from '../../utils/formatters';
import { KeyframeGraphOverlay } from './KeyframeGraphOverlay';

export const ClipInspectorPanel: React.FC = () => {
  const timelineClips = useStudioStore((s) => s.timelineClips);
  const timelineTracks = useStudioStore((s) => s.timelineTracks);
  const selectedClipId = useStudioStore((s) => s.selectedClipId);
  const playheadSec = useStudioStore((s) => s.playheadSec);

  const updateClipProperties = useStudioStore((s) => s.updateClipProperties);
  const recordTimelineSnapshot = useStudioStore((s) => s.recordTimelineSnapshot);
  const toggleClipKeyframe = useStudioStore((s) => s.toggleClipKeyframe);
  const removeClipKeyframe = useStudioStore((s) => s.removeClipKeyframe);
  const jumpToClipKeyframe = useStudioStore((s) => s.jumpToClipKeyframe);

  const [graphOverlayProp, setGraphOverlayProp] = useState<KeyframeProperty | null>(null);

  const clip = timelineClips.find((c) => c.id === selectedClipId) ?? null;

  if (!clip) {
    return (
      <div className="p-4 text-[12px] text-[#7A8190]">
        Select a clip on the timeline to inspect transform, crop, color, audio, and keyframes.
      </div>
    );
  }

  const isVisual = clip.trackId.startsWith('V');
  const keyframes = [...(clip.keyframes ?? [])].sort((a, b) => a.timeOffsetSec - b.timeOffsetSec);
  const relPlayhead = Math.max(0, Math.min(clip.durationSec, playheadSec - clip.startSec));

  const hasKeyframeAtPlayhead = (prop: KeyframeProperty) =>
    keyframes.some((k) => k.property === prop && Math.abs(k.timeOffsetSec - relPlayhead) < 0.15);

  const KeyframeButton: React.FC<{ property: KeyframeProperty; title: string }> = ({
    property,
    title,
  }) => {
    const active = hasKeyframeAtPlayhead(property);
    return (
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => {
            recordTimelineSnapshot();
            toggleClipKeyframe(clip.id, property);
          }}
          title={title}
          className={`p-0.5 rounded transition-colors ${
            active ? 'text-[#F59E0B]' : 'text-[#6D7484] hover:text-[#E6E8EC]'
          }`}
        >
          <Diamond className={`w-3 h-3 ${active ? 'fill-[#F59E0B]' : ''}`} />
        </button>
        {property !== 'position' && (
          <button
            type="button"
            onClick={() => setGraphOverlayProp(property)}
            title={`Open ${property} keyframe & easing curve graph`}
            className="p-0.5 rounded text-[#6D7484] hover:text-[#38BDF8] transition-colors"
          >
            <Activity className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const resetTransformAndCrop = () => {
    recordTimelineSnapshot();
    updateClipProperties(clip.id, {
      positionX: 0,
      positionY: 0,
      scalePct: 100,
      rotationDeg: 0,
      cropTopPct: 0,
      cropRightPct: 0,
      cropBottomPct: 0,
      cropLeftPct: 0,
      opacityPct: 100,
    });
  };

  const resetColor = () => {
    recordTimelineSnapshot();
    updateClipProperties(clip.id, {
      exposure: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[11px]">
      {/* Selected Clip Summary */}
      <div className="pb-2.5 border-b border-[#24272F]">
        <div className="font-semibold text-[12px] text-[#F3F4F6] truncate">{clip.label}</div>
        <div className="text-[10px] font-mono text-[#7A8190] mt-0.5 tabular-nums">
          {clip.trackId} · {formatTimecode(clip.startSec, 24)} →{' '}
          {formatTimecode(clip.startSec + clip.durationSec, 24)}
        </div>
      </div>

      {isVisual && (
        <>
          {/* Transform */}
          <section className="space-y-2.5 pb-3 border-b border-[#20232B]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9BA2B0]">
                Transform
              </span>
              <button
                type="button"
                onClick={resetTransformAndCrop}
                title="Reset transform, crop, and opacity"
                className="inline-flex items-center gap-1 text-[10px] text-[#7A8190] hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Position X / Y */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[#AEB5C2]">
                <span>Position (X / Y)</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-[#7A8190] tabular-nums">
                    {clip.positionX ?? 0}px, {clip.positionY ?? 0}px
                  </span>
                  <KeyframeButton property="position" title="Toggle Position keyframe at playhead" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <label className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#101115] border border-[#262932]">
                  <span className="text-[10px] font-mono text-[#6D7484]">X</span>
                  <input
                    type="number"
                    min={-400}
                    max={400}
                    value={clip.positionX ?? 0}
                    onFocus={recordTimelineSnapshot}
                    onChange={(e) =>
                      updateClipProperties(clip.id, { positionX: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-transparent font-mono text-[11px] text-[#E6E8EC] focus:outline-none tabular-nums"
                  />
                </label>
                <label className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#101115] border border-[#262932]">
                  <span className="text-[10px] font-mono text-[#6D7484]">Y</span>
                  <input
                    type="number"
                    min={-400}
                    max={400}
                    value={clip.positionY ?? 0}
                    onFocus={recordTimelineSnapshot}
                    onChange={(e) =>
                      updateClipProperties(clip.id, { positionY: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-transparent font-mono text-[11px] text-[#E6E8EC] focus:outline-none tabular-nums"
                  />
                </label>
              </div>
            </div>

            {/* Scale */}
            <div>
              <div className="flex items-center justify-between text-[#AEB5C2] mb-1">
                <span>Scale</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono tabular-nums">{clip.scalePct ?? 100}%</span>
                  <KeyframeButton property="scale" title="Toggle Scale keyframe at playhead" />
                </div>
              </div>
              <input
                type="range"
                min={25}
                max={250}
                step={1}
                value={clip.scalePct ?? 100}
                onMouseDown={recordTimelineSnapshot}
                onChange={(e) =>
                  updateClipProperties(clip.id, { scalePct: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex items-center justify-between text-[#AEB5C2] mb-1">
                <span>Rotation</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono tabular-nums">{clip.rotationDeg ?? 0}°</span>
                  <KeyframeButton property="rotation" title="Toggle Rotation keyframe at playhead" />
                </div>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={clip.rotationDeg ?? 0}
                onMouseDown={recordTimelineSnapshot}
                onChange={(e) =>
                  updateClipProperties(clip.id, { rotationDeg: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex items-center justify-between text-[#AEB5C2] mb-1">
                <span>Opacity</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono tabular-nums">{clip.opacityPct ?? 100}%</span>
                  <KeyframeButton property="opacity" title="Toggle Opacity keyframe at playhead" />
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={clip.opacityPct ?? 100}
                onMouseDown={recordTimelineSnapshot}
                onChange={(e) =>
                  updateClipProperties(clip.id, { opacityPct: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>
          </section>

          {/* Crop */}
          <section className="space-y-2 pb-3 border-b border-[#20232B]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9BA2B0]">
              Crop (%)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: 'cropTopPct', label: 'Top' },
                  { key: 'cropBottomPct', label: 'Bottom' },
                  { key: 'cropLeftPct', label: 'Left' },
                  { key: 'cropRightPct', label: 'Right' },
                ] as const
              ).map((edge) => {
                const val = clip[edge.key] ?? 0;
                return (
                  <div key={edge.key}>
                    <div className="flex justify-between text-[10px] text-[#8E95A5] mb-0.5">
                      <span>{edge.label}</span>
                      <span className="font-mono tabular-nums">{val}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={45}
                      step={1}
                      value={val}
                      onMouseDown={recordTimelineSnapshot}
                      onChange={(e) =>
                        updateClipProperties(clip.id, { [edge.key]: Number(e.target.value) })
                      }
                      className="studio-slider w-full"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Color Adjustments */}
          <section className="space-y-2 pb-3 border-b border-[#20232B]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9BA2B0]">
                Color
              </span>
              <button
                type="button"
                onClick={resetColor}
                className="inline-flex items-center gap-1 text-[10px] text-[#7A8190] hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            {(
              [
                { key: 'exposure', label: 'Exposure' },
                { key: 'contrast', label: 'Contrast' },
                { key: 'saturation', label: 'Saturation' },
                { key: 'temperature', label: 'Temperature' },
              ] as const
            ).map((param) => {
              const val = clip[param.key] ?? 0;
              return (
                <div key={param.key}>
                  <div className="flex justify-between text-[10px] text-[#AEB5C2] mb-0.5">
                    <span>{param.label}</span>
                    <span className="font-mono tabular-nums">
                      {val > 0 ? `+${val}` : val}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    step={1}
                    value={val}
                    onMouseDown={recordTimelineSnapshot}
                    onChange={(e) =>
                      updateClipProperties(clip.id, { [param.key]: Number(e.target.value) })
                    }
                    className="studio-slider w-full"
                  />
                </div>
              );
            })}
          </section>
        </>
      )}

      {/* Audio Volume & Speed */}
      <section className="space-y-2.5 pb-3 border-b border-[#20232B]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9BA2B0]">
          Audio & Timing
        </div>

        <div>
          <div className="flex items-center justify-between text-[#AEB5C2] mb-1">
            <span>Audio Volume</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  recordTimelineSnapshot();
                  updateClipProperties(clip.id, { audioMuted: !clip.audioMuted });
                }}
                title={clip.audioMuted ? 'Unmute clip audio' : 'Mute clip audio'}
                className={`p-0.5 rounded ${
                  clip.audioMuted ? 'text-[#EF4444]' : 'text-[#8E95A5] hover:text-white'
                }`}
              >
                {clip.audioMuted ? (
                  <VolumeX className="w-3 h-3" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
              </button>
              <span className="font-mono tabular-nums">
                {clip.audioMuted
                  ? 'Muted'
                  : `${(clip.volumeDb ?? 0) > 0 ? '+' : ''}${clip.volumeDb ?? 0} dB`}
              </span>
              <KeyframeButton property="volume" title="Toggle Volume keyframe at playhead" />
            </div>
          </div>
          <input
            type="range"
            min={-48}
            max={12}
            step={1}
            value={clip.volumeDb ?? 0}
            onMouseDown={recordTimelineSnapshot}
            onChange={(e) =>
              updateClipProperties(clip.id, {
                volumeDb: Number(e.target.value),
                audioMuted: false,
              })
            }
            className="studio-slider w-full"
          />
        </div>

        <div>
          <div className="flex justify-between text-[#AEB5C2] mb-1">
            <span>Clip Speed</span>
            <span className="font-mono tabular-nums">{clip.speed}x</span>
          </div>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={clip.speed}
            onMouseDown={recordTimelineSnapshot}
            onChange={(e) => updateClipProperties(clip.id, { speed: Number(e.target.value) })}
            className="studio-slider w-full"
          />
        </div>

        {/* Audio Ducking Toggle & Controls for Audio Clips */}
        {clip.trackId.startsWith('A') && (() => {
          const isVO = isVoiceOverClip(clip);
          const duckEnabled = Boolean(clip.audioDuckingEnabled);
          const duckDb = clip.audioDuckingDb ?? -12;
          const duckStatus = getClipDuckingAtTime(clip, playheadSec, timelineClips, timelineTracks);
          const duckIntervals = getClipDuckingIntervals(clip, timelineClips, timelineTracks);
          const voOverlapMusicCount = isVO
            ? timelineClips.filter(
                (other) =>
                  other.trackId === 'A2' &&
                  !other.audioMuted &&
                  other.startSec < clip.startSec + clip.durationSec &&
                  other.startSec + other.durationSec > clip.startSec
              ).length
            : 0;

          return (
            <div className="pt-2 border-t border-[#20232B] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#E6E8EC]">Audio Ducking</div>
                  <div className="text-[10px] text-[#7A8190] leading-snug">
                    {isVO
                      ? 'Lower overlapping A2 music while this voice-over is active'
                      : 'Auto-lower volume when A1 voice-over track is active'}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={duckEnabled}
                  aria-label="Toggle Audio Ducking"
                  onClick={() => {
                    recordTimelineSnapshot();
                    updateClipProperties(clip.id, {
                      audioDuckingEnabled: !duckEnabled,
                      audioDuckingDb: clip.audioDuckingDb ?? -12,
                    });
                  }}
                  className={`relative w-9 h-5 rounded-full border transition-colors shrink-0 ${
                    duckEnabled
                      ? 'bg-[#2563EB] border-[#3B82F6]'
                      : 'bg-[#101115] border-[#2C303B]'
                  }`}
                >
                  <span
                    className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      duckEnabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {(duckEnabled || duckStatus.isDucked) && (
                <div className="p-2 rounded bg-[#101217] border border-[#242834] space-y-2">
                  {duckEnabled && (
                    <div>
                      <div className="flex justify-between text-[10px] text-[#AEB5C2] mb-0.5">
                        <span>Ducking Attenuation</span>
                        <span className="font-mono tabular-nums">{duckDb} dB</span>
                      </div>
                      <input
                        type="range"
                        min={-24}
                        max={-3}
                        step={1}
                        value={duckDb}
                        onMouseDown={recordTimelineSnapshot}
                        onChange={(e) =>
                          updateClipProperties(clip.id, {
                            audioDuckingDb: Number(e.target.value),
                          })
                        }
                        className="studio-slider w-full"
                      />
                    </div>
                  )}

                  <div className="text-[10px] font-mono tabular-nums">
                    {isVO ? (
                      <span className="text-[#93C5FD]">
                        {voOverlapMusicCount > 0
                          ? `Ducking ${voOverlapMusicCount} overlapping A2 music ${
                              voOverlapMusicCount === 1 ? 'clip' : 'clips'
                            } by ${Math.abs(duckDb)} dB`
                          : 'No overlapping A2 music clips in range'}
                      </span>
                    ) : duckStatus.isDucked ? (
                      <span className="text-[#F59E0B]">
                        Ducked now: {duckStatus.effectiveVolumeDb} dB ({duckStatus.reductionDb} dB
                        via {duckStatus.sourceClipLabel})
                      </span>
                    ) : duckIntervals.length > 0 ? (
                      <span className="text-[#8E95A5]">
                        Standby · {duckIntervals.length} voice-over{' '}
                        {duckIntervals.length === 1 ? 'dip' : 'dips'} mapped
                      </span>
                    ) : (
                      <span className="text-[#6D7484]">
                        Armed · No overlapping A1 voice-over clips
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </section>

      {/* Transitions & Title Overlay */}
      {isVisual && (
        <section className="space-y-2 pb-3 border-b border-[#20232B]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9BA2B0]">
            Transition & Overlay
          </div>
          <div>
            <label className="block text-[10px] text-[#8E95A5] mb-1">Transition In</label>
            <select
              value={clip.transitionIn ?? 'None'}
              onChange={(e) => {
                recordTimelineSnapshot();
                updateClipProperties(clip.id, {
                  transitionIn: e.target.value as TimelineClip['transitionIn'],
                });
              }}
              className="w-full px-2 py-1 rounded bg-[#101115] border border-[#282B34] text-[11px] text-[#E6E8EC]"
            >
              <option value="None">None</option>
              <option value="Cross Dissolve">Cross Dissolve</option>
              <option value="Dip to Black">Dip to Black</option>
              <option value="Whip Pan">Whip Pan</option>
            </select>
          </div>

          {clip.transitionIn && clip.transitionIn !== 'None' && (
            <div>
              <div className="flex justify-between text-[10px] text-[#AEB5C2] mb-0.5">
                <span>Transition Duration</span>
                <span className="font-mono tabular-nums">
                  {(clip.transitionDurationSec ?? 1.0).toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={Math.max(0.5, Number((clip.durationSec * 0.6).toFixed(1)))}
                step={0.1}
                value={clip.transitionDurationSec ?? 1.0}
                onMouseDown={recordTimelineSnapshot}
                onChange={(e) =>
                  updateClipProperties(clip.id, {
                    transitionDurationSec: Number(e.target.value),
                  })
                }
                className="studio-slider w-full"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] text-[#8E95A5] mb-1">Text Overlay</label>
            <input
              type="text"
              value={clip.textOverlay ?? ''}
              placeholder="Optional title overlay..."
              onFocus={recordTimelineSnapshot}
              onChange={(e) =>
                updateClipProperties(clip.id, { textOverlay: e.target.value })
              }
              className="w-full px-2 py-1 rounded bg-[#101115] border border-[#282B34] text-[11px] text-[#E6E8EC]"
            />
          </div>
        </section>
      )}

      {/* Keyframes Navigator & List */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9BA2B0]">
            Keyframes ({keyframes.length})
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setGraphOverlayProp(isVisual ? 'opacity' : 'volume')}
              title="Open visual keyframe & easing curve graph overlay"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1C2A42] hover:bg-[#2563EB] text-[#93C5FD] hover:text-white border border-[#3B82F6]/50 text-[10px] font-medium transition-colors"
            >
              <Activity className="w-3 h-3" />
              <span>Curve Graph</span>
            </button>
            <button
              type="button"
              disabled={keyframes.length === 0}
              onClick={() => jumpToClipKeyframe(clip.id, 'prev')}
              title="Jump to previous keyframe"
              className="p-1 rounded bg-[#1D2028] hover:bg-[#272B36] text-[#C8CDD8] border border-[#2C303B] disabled:opacity-35"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={keyframes.length === 0}
              onClick={() => jumpToClipKeyframe(clip.id, 'next')}
              title="Jump to next keyframe"
              className="p-1 rounded bg-[#1D2028] hover:bg-[#272B36] text-[#C8CDD8] border border-[#2C303B] disabled:opacity-35"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {keyframes.length === 0 ? (
          <div className="text-[10px] text-[#6D7484] py-1">
            Click a diamond icon above or open Curve Graph to draw keyframe easing curves.
          </div>
        ) : (
          <div className="space-y-1">
            {keyframes.map((kf) => (
              <div
                key={kf.id}
                className="flex items-center justify-between px-2 py-1 rounded bg-[#111216] border border-[#24272F]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setGraphOverlayProp(kf.property === 'position' ? 'opacity' : kf.property)
                  }
                  className="flex items-center gap-2 min-w-0 text-left hover:text-white"
                  title="Edit in Curve Graph"
                >
                  <Diamond className="w-2.5 h-2.5 text-[#F59E0B] fill-[#F59E0B] shrink-0" />
                  <span className="capitalize text-[#E6E8EC]">{kf.property}</span>
                  <span className="font-mono text-[10px] text-[#8E95A5] tabular-nums">
                    +{kf.timeOffsetSec.toFixed(1)}s · {kf.valueLabel}
                    {kf.easing ? ` · ${kf.easing}` : ''}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    recordTimelineSnapshot();
                    removeClipKeyframe(clip.id, kf.id);
                  }}
                  title="Remove keyframe"
                  className="p-0.5 text-[#7A8190] hover:text-[#EF4444]"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {graphOverlayProp && (
        <KeyframeGraphOverlay
          clip={clip}
          initialProperty={graphOverlayProp}
          onClose={() => setGraphOverlayProp(null)}
        />
      )}
    </div>
  );
};
