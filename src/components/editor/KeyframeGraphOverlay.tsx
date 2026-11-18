import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  MousePointer,
  PenTool,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { ClipKeyframe, EasingPresetId, KeyframeProperty, TimelineClip } from '../../types/studio';
import {
  EASING_PRESET_HANDLES,
  evaluateClipPropertyAtOffset,
  fitStrokeToKeyframes,
  formatKeyframeValueLabel,
  getClipPropertyBaseValue,
  getKeyframeNumericValue,
  PROPERTY_SPECS,
} from '../../utils/keyframeInterpolation';

interface KeyframeGraphOverlayProps {
  clip: TimelineClip;
  initialProperty?: KeyframeProperty;
  onClose: () => void;
}

const SVG_W = 320;
const SVG_H = 200;
const PAD = { left: 36, right: 12, top: 14, bottom: 22 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;

type GraphDragState =
  | {
      kind: 'node';
      keyframeId: string;
      snapshotRecorded: boolean;
    }
  | {
      kind: 'handle-p1' | 'handle-p2';
      segLeftId: string;
      segRightTime: number;
      segLeftTime: number;
      segLeftVal: number;
      segRightVal: number;
      snapshotRecorded: boolean;
    }
  | {
      kind: 'draw-stroke';
      points: { timeSec: number; value: number }[];
    };

const EASING_OPTIONS: { id: Exclude<EasingPresetId, 'custom'>; label: string }[] = [
  { id: 'linear', label: 'Linear' },
  { id: 'ease-in', label: 'Ease In' },
  { id: 'ease-out', label: 'Ease Out' },
  { id: 'ease-in-out', label: 'Ease I/O' },
  { id: 'hold', label: 'Hold' },
];

export const KeyframeGraphOverlay: React.FC<KeyframeGraphOverlayProps> = ({
  clip,
  initialProperty,
  onClose,
}) => {
  const playheadSec = useStudioStore((s) => s.playheadSec);
  const setPlayheadSec = useStudioStore((s) => s.setPlayheadSec);
  const recordTimelineSnapshot = useStudioStore((s) => s.recordTimelineSnapshot);
  const upsertClipKeyframe = useStudioStore((s) => s.upsertClipKeyframe);
  const replacePropertyKeyframes = useStudioStore((s) => s.replacePropertyKeyframes);
  const removeClipKeyframe = useStudioStore((s) => s.removeClipKeyframe);

  const isVisual = clip.trackId.startsWith('V');
  const availableProps: KeyframeProperty[] = isVisual
    ? ['opacity', 'volume', 'scale', 'rotation']
    : ['volume'];

  const [activeProp, setActiveProp] = useState<KeyframeProperty>(
    initialProperty && availableProps.includes(initialProperty)
      ? initialProperty
      : isVisual
      ? 'opacity'
      : 'volume'
  );
  const [toolMode, setToolMode] = useState<'handles' | 'draw'>('handles');
  const [expanded, setExpanded] = useState(false);
  const [selectedKfId, setSelectedKfId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<GraphDragState | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Reset activeProp if switching from visual clip to audio clip
  useEffect(() => {
    if (!availableProps.includes(activeProp)) {
      setActiveProp(availableProps[0]);
    }
  }, [clip.id, activeProp, availableProps]);

  const spec = PROPERTY_SPECS[activeProp];
  const duration = Math.max(0.5, clip.durationSec);
  const relPlayhead = Math.max(0, Math.min(duration, playheadSec - clip.startSec));

  const propKeyframes = useMemo(
    () =>
      (clip.keyframes ?? [])
        .filter((k) => k.property === activeProp)
        .sort((a, b) => a.timeOffsetSec - b.timeOffsetSec),
    [clip.keyframes, activeProp]
  );

  // Auto-select a keyframe or segment anchor
  const selectedKeyframe =
    propKeyframes.find((k) => k.id === selectedKfId) ?? propKeyframes[0] ?? null;

  const selectedSegmentIndex = useMemo(() => {
    if (propKeyframes.length < 2) return -1;
    if (selectedKeyframe) {
      const idx = propKeyframes.findIndex((k) => k.id === selectedKeyframe.id);
      if (idx >= 0 && idx < propKeyframes.length - 1) return idx;
      if (idx === propKeyframes.length - 1) return idx - 1;
    }
    return 0;
  }, [propKeyframes, selectedKeyframe]);

  const segLeft = selectedSegmentIndex >= 0 ? propKeyframes[selectedSegmentIndex] : null;
  const segRight = selectedSegmentIndex >= 0 ? propKeyframes[selectedSegmentIndex + 1] : null;

  const timeToX = (tSec: number) => PAD.left + (Math.max(0, Math.min(duration, tSec)) / duration) * PLOT_W;
  const valToY = (val: number) => {
    const norm = (val - spec.min) / Math.max(1, spec.max - spec.min);
    return PAD.top + (1 - Math.max(0, Math.min(1, norm))) * PLOT_H;
  };

  const clientToGraphCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { timeSec: 0, value: spec.defaultValue, px: PAD.left, py: PAD.top };
    const rect = svg.getBoundingClientRect();
    const sx = ((clientX - rect.left) / Math.max(1, rect.width)) * SVG_W;
    const sy = ((clientY - rect.top) / Math.max(1, rect.height)) * SVG_H;
    const normX = Math.max(0, Math.min(1, (sx - PAD.left) / PLOT_W));
    const normY = Math.max(0, Math.min(1, 1 - (sy - PAD.top) / PLOT_H));
    return {
      timeSec: Number((normX * duration).toFixed(2)),
      value: Math.round(spec.min + normY * (spec.max - spec.min)),
      px: sx,
      py: sy,
    };
  };

  // Sample curve path & shaded area
  const { curvePath, areaPath, currentEvalVal } = useMemo(() => {
    const steps = 84;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * duration;
      const v = evaluateClipPropertyAtOffset(clip, activeProp, t);
      pts.push({ x: timeToX(t), y: valToY(v) });
    }
    const lineD = pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    const baseBottomY = PAD.top + PLOT_H;
    const areaD = `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${baseBottomY} L ${pts[0].x.toFixed(1)} ${baseBottomY} Z`;
    const curVal = evaluateClipPropertyAtOffset(clip, activeProp, relPlayhead);
    return { curvePath: lineD, areaPath: areaD, currentEvalVal: curVal };
  }, [clip, activeProp, duration, relPlayhead, spec.max, spec.min]);

  // Unified pointer move/up for node dragging, bezier handle sculpting, and freehand stroke drawing
  useEffect(() => {
    if (!dragState) return;

    const onMove = (e: MouseEvent) => {
      const coords = clientToGraphCoords(e.clientX, e.clientY);

      if (dragState.kind === 'draw-stroke') {
        setDragState((prev) =>
          prev && prev.kind === 'draw-stroke'
            ? { ...prev, points: [...prev.points, { timeSec: coords.timeSec, value: coords.value }] }
            : prev
        );
        return;
      }

      if (dragState.kind === 'node') {
        const target = propKeyframes.find((k) => k.id === dragState.keyframeId);
        if (!target) return;
        if (!dragState.snapshotRecorded) {
          recordTimelineSnapshot();
          dragState.snapshotRecorded = true;
        }
        upsertClipKeyframe(clip.id, {
          ...target,
          timeOffsetSec: coords.timeSec,
          numericValue: coords.value,
          valueLabel: formatKeyframeValueLabel(activeProp, coords.value, clip),
        });
        setPlayheadSec(Number((clip.startSec + coords.timeSec).toFixed(2)));
        return;
      }

      if (dragState.kind === 'handle-p1' || dragState.kind === 'handle-p2') {
        const segLeftKf = propKeyframes.find((k) => k.id === dragState.segLeftId);
        if (!segLeftKf) return;
        if (!dragState.snapshotRecorded) {
          recordTimelineSnapshot();
          dragState.snapshotRecorded = true;
        }

        const x0 = timeToX(dragState.segLeftTime);
        const y0 = valToY(dragState.segLeftVal);
        const x1 = timeToX(dragState.segRightTime);
        const y1 = valToY(dragState.segRightVal);
        const dx = Math.max(1, x1 - x0);
        const dy = y1 - y0;

        const existingHandles =
          segLeftKf.bezierHandles ??
          EASING_PRESET_HANDLES[
            segLeftKf.easing && segLeftKf.easing !== 'custom' ? segLeftKf.easing : 'ease-in-out'
          ];
        const nextHandles: [number, number, number, number] = [...existingHandles];

        if (dragState.kind === 'handle-p1') {
          const hx = Math.max(0.02, Math.min(0.98, (coords.px - x0) / dx));
          const hy =
            Math.abs(dy) < 4
              ? 0
              : Math.max(-0.35, Math.min(1.35, (coords.py - y0) / dy));
          nextHandles[0] = Number(hx.toFixed(2));
          nextHandles[1] = Number(hy.toFixed(2));
        } else {
          const hx = Math.max(0.02, Math.min(0.98, (coords.px - x0) / dx));
          const hy =
            Math.abs(dy) < 4
              ? 1
              : Math.max(-0.35, Math.min(1.35, (coords.py - y0) / dy));
          nextHandles[2] = Number(hx.toFixed(2));
          nextHandles[3] = Number(hy.toFixed(2));
        }

        upsertClipKeyframe(clip.id, {
          ...segLeftKf,
          easing: 'custom',
          bezierHandles: nextHandles,
        });
      }
    };

    const onUp = () => {
      if (dragState.kind === 'draw-stroke' && dragState.points.length > 0) {
        recordTimelineSnapshot();
        const fitted = fitStrokeToKeyframes(dragState.points, activeProp, duration);
        replacePropertyKeyframes(clip.id, activeProp, fitted);
        if (fitted[0]) {
          setSelectedKfId(fitted[0].id);
        }
      }
      setDragState(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [
    activeProp,
    clip,
    dragState,
    duration,
    propKeyframes,
    recordTimelineSnapshot,
    replacePropertyKeyframes,
    setPlayheadSec,
    upsertClipKeyframe,
  ]);

  const addKeyframeAtTime = (timeOffsetSec: number, val: number) => {
    recordTimelineSnapshot();
    const newKf: ClipKeyframe = {
      id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timeOffsetSec: Number(Math.max(0, Math.min(duration, timeOffsetSec)).toFixed(2)),
      property: activeProp,
      numericValue: Math.round(val),
      valueLabel: formatKeyframeValueLabel(activeProp, val, clip),
      easing: 'ease-in-out',
      bezierHandles: [...EASING_PRESET_HANDLES['ease-in-out']],
    };
    upsertClipKeyframe(clip.id, newKf);
    setSelectedKfId(newKf.id);
  };

  const applySegmentEasing = (preset: Exclude<EasingPresetId, 'custom'>) => {
    if (!segLeft) return;
    recordTimelineSnapshot();
    upsertClipKeyframe(clip.id, {
      ...segLeft,
      easing: preset,
      bezierHandles: [...EASING_PRESET_HANDLES[preset]],
    });
  };

  // Compute handle coordinates for selected segment
  const segmentHandles = useMemo(() => {
    if (!segLeft || !segRight || toolMode !== 'handles') return null;
    const v0 = getKeyframeNumericValue(segLeft);
    const v1 = getKeyframeNumericValue(segRight);
    const x0 = timeToX(segLeft.timeOffsetSec);
    const y0 = valToY(v0);
    const x1 = timeToX(segRight.timeOffsetSec);
    const y1 = valToY(v1);
    const handles =
      segLeft.bezierHandles ??
      EASING_PRESET_HANDLES[
        segLeft.easing && segLeft.easing !== 'custom' ? segLeft.easing : 'ease-in-out'
      ];
    const p1x = x0 + (x1 - x0) * handles[0];
    const p1y = Math.abs(y1 - y0) < 4 ? y0 - 18 : y0 + (y1 - y0) * handles[1];
    const p2x = x0 + (x1 - x0) * handles[2];
    const p2y = Math.abs(y1 - y0) < 4 ? y1 + 18 : y0 + (y1 - y0) * handles[3];
    return { x0, y0, x1, y1, p1x, p1y, p2x, p2y, handles, v0, v1 };
  }, [segLeft, segRight, toolMode, duration, spec.max, spec.min]);

  const drawPreviewPolyline = useMemo(() => {
    if (dragState?.kind !== 'draw-stroke' || dragState.points.length === 0) return '';
    return dragState.points
      .map((p) => `${timeToX(p.timeSec).toFixed(1)},${valToY(p.value).toFixed(1)}`)
      .join(' ');
  }, [dragState, duration, spec.max, spec.min]);

  return (
    <div
      className={
        expanded
          ? 'fixed right-4 top-16 bottom-[360px] w-[480px] max-w-[calc(100vw-2rem)] z-50 rounded-md bg-[#13151A] border border-[#2E3442] shadow-2xl flex flex-col overflow-hidden'
          : 'absolute inset-0 z-30 bg-[#13151A] flex flex-col overflow-hidden'
      }
    >
      {/* Overlay Header */}
      <div className="px-3 py-2 border-b border-[#24272F] bg-[#16181E] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-[#F3F4F6] truncate">
            Keyframe Curve Graph
          </div>
          <div className="text-[10px] font-mono text-[#7A8190] truncate tabular-nums">
            {clip.label} · {duration.toFixed(1)}s
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Dock inside Inspector' : 'Expand graph overlay'}
            className="p-1 rounded bg-[#1E2129] hover:bg-[#2A2E3A] text-[#AEB5C2] hover:text-white border border-[#2C313D]"
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close keyframe graph (Esc)"
            className="p-1 rounded bg-[#1E2129] hover:bg-[#2A2E3A] text-[#AEB5C2] hover:text-white border border-[#2C313D]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Property Selector Tabs */}
      <div className="px-2.5 py-1.5 border-b border-[#20232B] bg-[#14161B] flex items-center gap-1 overflow-x-auto">
        {availableProps.map((prop) => {
          const pSpec = PROPERTY_SPECS[prop];
          const count = (clip.keyframes ?? []).filter((k) => k.property === prop).length;
          const active = activeProp === prop;
          return (
            <button
              key={prop}
              type="button"
              onClick={() => {
                setActiveProp(prop);
                setSelectedKfId(null);
              }}
              className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                active
                  ? 'bg-[#202532] text-white border border-[#3B82F6]/60'
                  : 'bg-[#191B22] text-[#8E95A5] border border-transparent hover:text-[#E6E8EC]'
              }`}
            >
              <span
                style={{ backgroundColor: pSpec.color }}
                className="w-1.5 h-1.5 rounded-full shrink-0"
              />
              <span>{pSpec.label}</span>
              {count > 0 && (
                <span className="font-mono text-[9px] text-[#9BA2B0] tabular-nums">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mode Toolbar */}
      <div className="px-2.5 py-1.5 border-b border-[#20232B] bg-[#14161A] flex items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setToolMode('handles')}
            title="Edit nodes & drag Bezier easing handles"
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
              toolMode === 'handles'
                ? 'bg-[#1C2A42] border-[#3B82F6] text-[#93C5FD]'
                : 'bg-[#1A1C23] border-[#282C36] text-[#8E95A5] hover:text-white'
            }`}
          >
            <MousePointer className="w-3 h-3" />
            <span>Handles</span>
          </button>
          <button
            type="button"
            onClick={() => setToolMode('draw')}
            title="Freehand draw curve directly across the graph"
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
              toolMode === 'draw'
                ? 'bg-[#1C2A42] border-[#3B82F6] text-[#93C5FD]'
                : 'bg-[#1A1C23] border-[#282C36] text-[#8E95A5] hover:text-white'
            }`}
          >
            <PenTool className="w-3 h-3" />
            <span>Draw Curve</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              addKeyframeAtTime(
                relPlayhead,
                propKeyframes.length > 0
                  ? currentEvalVal
                  : getClipPropertyBaseValue(clip, activeProp)
              )
            }
            title="Add keyframe at playhead"
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white font-medium"
          >
            <Plus className="w-3 h-3" />
            <span>Add KF</span>
          </button>
          <button
            type="button"
            disabled={propKeyframes.length === 0}
            onClick={() => {
              recordTimelineSnapshot();
              replacePropertyKeyframes(clip.id, activeProp, []);
              setSelectedKfId(null);
            }}
            title={`Clear all ${spec.label} keyframes`}
            className="p-1 rounded bg-[#1A1C23] hover:bg-[#272B35] text-[#8E95A5] hover:text-white border border-[#282C36] disabled:opacity-35"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Interactive SVG Curve Graph */}
      <div className="p-2.5 pb-1.5 bg-[#0F1116] border-b border-[#20232B]">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#8E95A5] mb-1 tabular-nums">
          <span>
            {toolMode === 'draw'
              ? 'Drag across canvas to draw curve'
              : 'Click canvas to add node · Drag handles to sculpt easing'}
          </span>
          <span style={{ color: spec.color }}>
            {Math.round(currentEvalVal)}
            {spec.unit} @ +{relPlayhead.toFixed(1)}s
          </span>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          onMouseDown={(e) => {
            const coords = clientToGraphCoords(e.clientX, e.clientY);
            if (toolMode === 'draw') {
              setDragState({
                kind: 'draw-stroke',
                points: [{ timeSec: coords.timeSec, value: coords.value }],
              });
              return;
            }
            addKeyframeAtTime(coords.timeSec, coords.value);
          }}
          className={`w-full h-44 rounded bg-[#0B0C10] border border-[#232732] select-none ${
            toolMode === 'draw' ? 'cursor-crosshair' : 'cursor-pointer'
          }`}
        >
          {/* Horizontal Value Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const val = Math.round(spec.min + frac * (spec.max - spec.min));
            const y = valToY(val);
            return (
              <g key={`h-${frac}`}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={SVG_W - PAD.right}
                  y2={y}
                  stroke="#1D202A"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 4}
                  y={y + 3}
                  textAnchor="end"
                  fill="#6D7484"
                  fontSize="8.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Vertical Time Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const t = frac * duration;
            const x = timeToX(t);
            return (
              <g key={`v-${frac}`}>
                <line
                  x1={x}
                  y1={PAD.top}
                  x2={x}
                  y2={PAD.top + PLOT_H}
                  stroke="#1A1D26"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={SVG_H - 6}
                  textAnchor="middle"
                  fill="#6D7484"
                  fontSize="8"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {t.toFixed(1)}s
                </text>
              </g>
            );
          })}

          {/* Area Fill Under Curve */}
          <path d={areaPath} fill={spec.color} fillOpacity={0.12} pointerEvents="none" />

          {/* Main Easing Curve Path */}
          <path
            d={curvePath}
            fill="none"
            stroke={spec.color}
            strokeWidth={2}
            pointerEvents="none"
          />

          {/* Freehand Draw Preview Stroke */}
          {drawPreviewPolyline && (
            <polyline
              points={drawPreviewPolyline}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="3 2"
              pointerEvents="none"
            />
          )}

          {/* Playhead Vertical Line */}
          <line
            x1={timeToX(relPlayhead)}
            y1={PAD.top}
            x2={timeToX(relPlayhead)}
            y2={PAD.top + PLOT_H}
            stroke="#EF4444"
            strokeWidth={1}
            pointerEvents="none"
          />

          {/* Interactive Bezier Tangent Handles for Selected Segment */}
          {segmentHandles && segLeft && (
            <g>
              <line
                x1={segmentHandles.x0}
                y1={segmentHandles.y0}
                x2={segmentHandles.p1x}
                y2={segmentHandles.p1y}
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="2 2"
                pointerEvents="none"
              />
              <line
                x1={segmentHandles.x1}
                y1={segmentHandles.y1}
                x2={segmentHandles.p2x}
                y2={segmentHandles.p2y}
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="2 2"
                pointerEvents="none"
              />
              <circle
                cx={segmentHandles.p1x}
                cy={segmentHandles.p1y}
                r={4.5}
                fill="#111318"
                stroke="#F59E0B"
                strokeWidth={1.75}
                className="cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDragState({
                    kind: 'handle-p1',
                    segLeftId: segLeft.id,
                    segLeftTime: segLeft.timeOffsetSec,
                    segRightTime: segRight!.timeOffsetSec,
                    segLeftVal: segmentHandles.v0,
                    segRightVal: segmentHandles.v1,
                    snapshotRecorded: false,
                  });
                }}
              />
              <circle
                cx={segmentHandles.p2x}
                cy={segmentHandles.p2y}
                r={4.5}
                fill="#111318"
                stroke="#38BDF8"
                strokeWidth={1.75}
                className="cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDragState({
                    kind: 'handle-p2',
                    segLeftId: segLeft.id,
                    segLeftTime: segLeft.timeOffsetSec,
                    segRightTime: segRight!.timeOffsetSec,
                    segLeftVal: segmentHandles.v0,
                    segRightVal: segmentHandles.v1,
                    snapshotRecorded: false,
                  });
                }}
              />
            </g>
          )}

          {/* Keyframe Diamond Nodes */}
          {propKeyframes.map((kf) => {
            const x = timeToX(kf.timeOffsetSec);
            const y = valToY(getKeyframeNumericValue(kf));
            const isSelected = selectedKeyframe?.id === kf.id;
            return (
              <g
                key={kf.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectedKfId(kf.id);
                  setPlayheadSec(Number((clip.startSec + kf.timeOffsetSec).toFixed(2)));
                  setDragState({
                    kind: 'node',
                    keyframeId: kf.id,
                    snapshotRecorded: false,
                  });
                }}
              >
                <rect
                  x={-4.5}
                  y={-4.5}
                  width={9}
                  height={9}
                  transform="rotate(45)"
                  fill={isSelected ? '#F59E0B' : spec.color}
                  stroke={isSelected ? '#FFFFFF' : '#0B0C10'}
                  strokeWidth={1.5}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Easing Curve Presets & Selected Node Editor */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3 text-[11px]">
        {/* Segment Easing Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9BA2B0]">
              Segment Easing
            </span>
            {segmentHandles && (
              <span className="text-[10px] font-mono text-[#7A8190] tabular-nums">
                ({segmentHandles.handles.map((n) => n.toFixed(2)).join(', ')})
              </span>
            )}
          </div>

          {segLeft && segRight ? (
            <div className="grid grid-cols-5 gap-1">
              {EASING_OPTIONS.map((opt) => {
                const active = (segLeft.easing ?? 'ease-in-out') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => applySegmentEasing(opt.id)}
                    className={`py-1 rounded text-[10px] font-medium border transition-colors ${
                      active
                        ? 'bg-[#2563EB] border-[#3B82F6] text-white'
                        : 'bg-[#191C23] border-[#262A34] text-[#AEB5C2] hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-[10px] text-[#6D7484]">
              Add at least 2 keyframes (or draw a curve) to shape easing curves between points.
            </div>
          )}
        </div>

        {/* Selected Keyframe Fine-Tune */}
        {selectedKeyframe && (
          <div className="p-2 rounded bg-[#181A21] border border-[#252834] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9BA2B0]">
                Selected Node
              </span>
              <button
                type="button"
                onClick={() => {
                  recordTimelineSnapshot();
                  removeClipKeyframe(clip.id, selectedKeyframe.id);
                  setSelectedKfId(null);
                }}
                className="inline-flex items-center gap-1 text-[10px] text-[#9BA2B0] hover:text-[#EF4444]"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-0.5">
                <span className="text-[10px] text-[#7A8190]">Offset (sec)</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={Number(duration.toFixed(2))}
                  value={selectedKeyframe.timeOffsetSec}
                  onFocus={recordTimelineSnapshot}
                  onChange={(e) => {
                    const nextT = Math.max(
                      0,
                      Math.min(duration, Number(e.target.value) || 0)
                    );
                    upsertClipKeyframe(clip.id, {
                      ...selectedKeyframe,
                      timeOffsetSec: Number(nextT.toFixed(2)),
                    });
                  }}
                  className="w-full px-2 py-1 rounded bg-[#101115] border border-[#282C36] font-mono text-[11px] text-[#E6E8EC] tabular-nums"
                />
              </label>

              <label className="space-y-0.5">
                <span className="text-[10px] text-[#7A8190]">Value ({spec.unit})</span>
                <input
                  type="number"
                  step={spec.step}
                  min={spec.min}
                  max={spec.max}
                  value={getKeyframeNumericValue(selectedKeyframe)}
                  onFocus={recordTimelineSnapshot}
                  onChange={(e) => {
                    const val = Math.max(
                      spec.min,
                      Math.min(spec.max, Number(e.target.value) || 0)
                    );
                    upsertClipKeyframe(clip.id, {
                      ...selectedKeyframe,
                      numericValue: val,
                      valueLabel: formatKeyframeValueLabel(activeProp, val, clip),
                    });
                  }}
                  className="w-full px-2 py-1 rounded bg-[#101115] border border-[#282C36] font-mono text-[11px] text-[#E6E8EC] tabular-nums"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
