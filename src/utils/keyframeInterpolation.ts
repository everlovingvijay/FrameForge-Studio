import { ClipKeyframe, EasingPresetId, KeyframeProperty, TimelineClip } from '../types/studio';

export interface PropertySpec {
  property: KeyframeProperty;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  color: string;
}

export const PROPERTY_SPECS: Record<KeyframeProperty, PropertySpec> = {
  opacity: {
    property: 'opacity',
    label: 'Opacity',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 100,
    color: '#38BDF8',
  },
  volume: {
    property: 'volume',
    label: 'Volume',
    unit: 'dB',
    min: -48,
    max: 12,
    step: 1,
    defaultValue: 0,
    color: '#34D399',
  },
  scale: {
    property: 'scale',
    label: 'Scale',
    unit: '%',
    min: 25,
    max: 250,
    step: 1,
    defaultValue: 100,
    color: '#A78BFA',
  },
  rotation: {
    property: 'rotation',
    label: 'Rotation',
    unit: '°',
    min: -180,
    max: 180,
    step: 1,
    defaultValue: 0,
    color: '#F59E0B',
  },
  position: {
    property: 'position',
    label: 'Position X',
    unit: 'px',
    min: -400,
    max: 400,
    step: 1,
    defaultValue: 0,
    color: '#FB7185',
  },
};

export const EASING_PRESET_HANDLES: Record<
  Exclude<EasingPresetId, 'custom'>,
  [number, number, number, number]
> = {
  linear: [0.25, 0.25, 0.75, 0.75],
  'ease-in': [0.42, 0.0, 1.0, 1.0],
  'ease-out': [0.0, 0.0, 0.58, 1.0],
  'ease-in-out': [0.42, 0.0, 0.58, 1.0],
  hold: [0.0, 0.0, 0.0, 0.0],
};

export function getClipPropertyBaseValue(clip: TimelineClip, prop: KeyframeProperty): number {
  switch (prop) {
    case 'opacity':
      return clip.opacityPct ?? 100;
    case 'volume':
      return clip.volumeDb ?? 0;
    case 'scale':
      return clip.scalePct ?? 100;
    case 'rotation':
      return clip.rotationDeg ?? 0;
    case 'position':
      return clip.positionX ?? 0;
  }
}

export function formatKeyframeValueLabel(prop: KeyframeProperty, value: number, clip?: TimelineClip): string {
  const rounded = Math.round(value);
  switch (prop) {
    case 'opacity':
      return `${rounded}%`;
    case 'volume':
      return `${rounded} dB`;
    case 'scale':
      return `${rounded}%`;
    case 'rotation':
      return `${rounded}°`;
    case 'position':
      return `${rounded},${clip?.positionY ?? 0}`;
  }
}

export function getKeyframeNumericValue(kf: ClipKeyframe): number {
  if (typeof kf.numericValue === 'number' && Number.isFinite(kf.numericValue)) {
    return kf.numericValue;
  }
  const parsed = parseFloat(kf.valueLabel);
  if (Number.isFinite(parsed)) return parsed;
  return PROPERTY_SPECS[kf.property].defaultValue;
}

/**
 * Evaluates a 1D cubic bezier Y for a given X progress t in [0..1]
 * using Newton-Raphson / binary subdivision.
 */
export function evaluateCubicBezier(
  progressX: number,
  handles: [number, number, number, number] = [0.42, 0, 0.58, 1]
): number {
  const x = Math.max(0, Math.min(1, progressX));
  if (x === 0) return 0;
  if (x === 1) return 1;

  const [x1, y1, x2, y2] = handles;

  const sampleX = (u: number) =>
    3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
  const sampleY = (u: number) =>
    3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;

  let lo = 0;
  let hi = 1;
  let u = x;
  for (let i = 0; i < 14; i++) {
    u = (lo + hi) * 0.5;
    const estX = sampleX(u);
    if (Math.abs(estX - x) < 1e-4) break;
    if (estX < x) lo = u;
    else hi = u;
  }
  return sampleY(u);
}

/**
 * Evaluates the interpolated value of `property` on `clip` at relative offset `relTimeSec`.
 */
export function evaluateClipPropertyAtOffset(
  clip: TimelineClip,
  property: KeyframeProperty,
  relTimeSec: number
): number {
  const kfs = (clip.keyframes ?? [])
    .filter((k) => k.property === property)
    .sort((a, b) => a.timeOffsetSec - b.timeOffsetSec);

  if (kfs.length === 0) {
    return getClipPropertyBaseValue(clip, property);
  }

  if (relTimeSec <= kfs[0].timeOffsetSec) {
    return getKeyframeNumericValue(kfs[0]);
  }
  if (relTimeSec >= kfs[kfs.length - 1].timeOffsetSec) {
    return getKeyframeNumericValue(kfs[kfs.length - 1]);
  }

  for (let i = 0; i < kfs.length - 1; i++) {
    const k0 = kfs[i];
    const k1 = kfs[i + 1];
    if (relTimeSec >= k0.timeOffsetSec && relTimeSec <= k1.timeOffsetSec) {
      const span = Math.max(0.001, k1.timeOffsetSec - k0.timeOffsetSec);
      const t = (relTimeSec - k0.timeOffsetSec) / span;
      const v0 = getKeyframeNumericValue(k0);
      const v1 = getKeyframeNumericValue(k1);

      if (k0.easing === 'hold') {
        return v0;
      }

      const handles =
        k0.bezierHandles ??
        EASING_PRESET_HANDLES[
          k0.easing && k0.easing !== 'custom' ? k0.easing : 'ease-in-out'
        ];
      const easedT =
        k0.easing === 'linear' ? t : evaluateCubicBezier(t, handles);
      return v0 + (v1 - v0) * easedT;
    }
  }

  return getClipPropertyBaseValue(clip, property);
}

/**
 * Downsamples a freehand drawn stroke [(timeSec, value), ...] into clean keyframes
 * with smooth ease-in-out cubic bezier curves.
 */
export function fitStrokeToKeyframes(
  strokePoints: { timeSec: number; value: number }[],
  property: KeyframeProperty,
  durationSec: number
): ClipKeyframe[] {
  if (strokePoints.length === 0) return [];
  const spec = PROPERTY_SPECS[property];

  // Sort by time and deduplicate monotonic time samples
  const sorted = [...strokePoints]
    .map((p) => ({
      timeSec: Math.max(0, Math.min(durationSec, p.timeSec)),
      value: Math.max(spec.min, Math.min(spec.max, p.value)),
    }))
    .sort((a, b) => a.timeSec - b.timeSec);

  if (sorted.length === 1) {
    const pt = sorted[0];
    return [
      {
        id: `kf-${Date.now()}-0`,
        timeOffsetSec: Number(pt.timeSec.toFixed(2)),
        property,
        numericValue: Math.round(pt.value),
        valueLabel: formatKeyframeValueLabel(property, pt.value),
        easing: 'ease-in-out',
        bezierHandles: [...EASING_PRESET_HANDLES['ease-in-out']],
      },
    ];
  }

  // Ramer-Douglas-Peucker simplification in normalized [0..1] x [0..1] graph space
  const normPts = sorted.map((p) => ({
    nx: durationSec > 0 ? p.timeSec / durationSec : 0,
    ny: (p.value - spec.min) / Math.max(1, spec.max - spec.min),
    orig: p,
  }));

  const rdp = (pts: typeof normPts, eps: number): typeof normPts => {
    if (pts.length <= 2) return pts;
    const first = pts[0];
    const last = pts[pts.length - 1];
    let maxDist = 0;
    let index = 0;
    const dx = last.nx - first.nx;
    const dy = last.ny - first.ny;
    const lenSq = dx * dx + dy * dy;

    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      const dist =
        lenSq === 0
          ? Math.hypot(p.nx - first.nx, p.ny - first.ny)
          : Math.abs(dy * p.nx - dx * p.ny + last.nx * first.ny - last.ny * first.nx) /
            Math.sqrt(lenSq);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (maxDist > eps) {
      const left = rdp(pts.slice(0, index + 1), eps);
      const right = rdp(pts.slice(index), eps);
      return [...left.slice(0, -1), ...right];
    }
    return [first, last];
  };

  let simplified = rdp(normPts, 0.035);
  if (simplified.length > 9) {
    simplified = rdp(normPts, 0.065);
  }

  // Ensure minimum 0.2s separation between consecutive nodes
  const filtered: typeof normPts = [];
  for (const pt of simplified) {
    if (
      filtered.length === 0 ||
      pt.orig.timeSec - filtered[filtered.length - 1].orig.timeSec >= 0.2
    ) {
      filtered.push(pt);
    }
  }

  const now = Date.now();
  return filtered.map((pt, idx) => ({
    id: `kf-${now}-${idx}`,
    timeOffsetSec: Number(pt.orig.timeSec.toFixed(2)),
    property,
    numericValue: Math.round(pt.orig.value),
    valueLabel: formatKeyframeValueLabel(property, pt.orig.value),
    easing: 'ease-in-out',
    bezierHandles: [...EASING_PRESET_HANDLES['ease-in-out']],
  }));
}
