import { TimelineClip, TimelineMarker, TimelineSnapSettings } from '../types/studio';

export type SnapTargetKind =
  | 'clip-start'
  | 'clip-end'
  | 'marker'
  | 'transition-end'
  | 'playhead'
  | 'grid';

export interface SnapPoint {
  timeSec: number;
  kind: SnapTargetKind;
  label: string;
  sourceId?: string;
}

export interface SnapCandidateResult {
  snappedDeltaSec: number;
  snapLineSec: number;
  matchedTarget: SnapPoint;
}

interface CollectTargetsInput {
  clips: TimelineClip[];
  markers: TimelineMarker[];
  playheadSec: number;
  snapSettings: TimelineSnapSettings;
  excludeClipId?: string;
  excludeMarkerId?: string;
  excludePlayhead?: boolean;
  excludeTransitionClipId?: string;
}

export function collectSnapTargets({
  clips,
  markers,
  playheadSec,
  snapSettings,
  excludeClipId,
  excludeMarkerId,
  excludePlayhead,
  excludeTransitionClipId,
}: CollectTargetsInput): SnapPoint[] {
  const points: SnapPoint[] = [
    { timeSec: 0, kind: 'grid', label: 'Timeline Start (00:00)' },
  ];

  if (snapSettings.snapToClips) {
    for (const clip of clips) {
      if (clip.id === excludeClipId) continue;
      points.push({
        timeSec: Number(clip.startSec.toFixed(3)),
        kind: 'clip-start',
        label: `${clip.trackId} Clip In (${clip.label})`,
        sourceId: clip.id,
      });
      points.push({
        timeSec: Number((clip.startSec + clip.durationSec).toFixed(3)),
        kind: 'clip-end',
        label: `${clip.trackId} Clip Out (${clip.label})`,
        sourceId: clip.id,
      });
    }
  }

  if (snapSettings.snapToTransitions) {
    for (const clip of clips) {
      if (clip.id === excludeClipId || clip.id === excludeTransitionClipId) continue;
      if (clip.transitionIn && clip.transitionIn !== 'None') {
        const dur = clip.transitionDurationSec ?? 1.0;
        if (dur > 0) {
          points.push({
            timeSec: Number((clip.startSec + dur).toFixed(3)),
            kind: 'transition-end',
            label: `${clip.transitionIn} End (${clip.trackId})`,
            sourceId: clip.id,
          });
        }
      }
    }
  }

  if (snapSettings.snapToMarkers) {
    for (const marker of markers) {
      if (marker.id === excludeMarkerId) continue;
      points.push({
        timeSec: Number(marker.timeSec.toFixed(3)),
        kind: 'marker',
        label: `Marker: ${marker.label}`,
        sourceId: marker.id,
      });
    }
  }

  if (snapSettings.snapToPlayhead && !excludePlayhead) {
    points.push({
      timeSec: Number(playheadSec.toFixed(3)),
      kind: 'playhead',
      label: 'Playhead',
    });
  }

  return points;
}

/**
 * Given one or more candidate anchor times on a dragged element (e.g. a clip's
 * [proposedStart, proposedEnd]), finds the closest snap target within tolerance.
 */
export function findBestSnap(params: {
  anchorTimesSec: number[];
  targets: SnapPoint[];
  timelineZoom: number;
  snapSettings: TimelineSnapSettings;
  bypassSnap?: boolean;
}): SnapCandidateResult | null {
  const { anchorTimesSec, targets, timelineZoom, snapSettings, bypassSnap } = params;
  if (!snapSettings.enabled || bypassSnap || anchorTimesSec.length === 0) {
    return null;
  }

  const thresholdSec = snapSettings.tolerancePx / Math.max(1, timelineZoom);

  let bestDistance = thresholdSec;
  let bestResult: SnapCandidateResult | null = null;

  for (const anchor of anchorTimesSec) {
    for (const target of targets) {
      const dist = Math.abs(target.timeSec - anchor);
      if (dist <= bestDistance) {
        bestDistance = dist;
        bestResult = {
          snappedDeltaSec: target.timeSec - anchor,
          snapLineSec: target.timeSec,
          matchedTarget: target,
        };
      }
    }

    if (snapSettings.snapToGrid) {
      const nearestWholeSec = Math.round(anchor);
      const gridDist = Math.abs(nearestWholeSec - anchor);
      if (gridDist <= bestDistance) {
        bestDistance = gridDist;
        bestResult = {
          snappedDeltaSec: nearestWholeSec - anchor,
          snapLineSec: nearestWholeSec,
          matchedTarget: {
            timeSec: nearestWholeSec,
            kind: 'grid',
            label: `1s Grid (${nearestWholeSec}s)`,
          },
        };
      }
    }
  }

  return bestResult;
}
