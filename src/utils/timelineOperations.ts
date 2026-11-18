import { MediaAsset, TimelineClip, TimelineTrackId } from '../types/studio';

export function splitClipAtTime(
  clips: TimelineClip[],
  clipId: string,
  playheadSec: number
): { clips: TimelineClip[]; nextSelectedId: string } | null {
  const target = clips.find((c) => c.id === clipId);
  if (!target) return null;
  if (
    playheadSec <= target.startSec + 0.3 ||
    playheadSec >= target.startSec + target.durationSec - 0.3
  ) {
    return null;
  }

  const leftDuration = Number((playheadSec - target.startSec).toFixed(2));
  const rightDuration = Number((target.durationSec - leftDuration).toFixed(2));
  const leftClip: TimelineClip = { ...target, durationSec: leftDuration };
  const rightClip: TimelineClip = {
    ...target,
    id: `${target.id}-split-${Date.now()}`,
    startSec: playheadSec,
    durationSec: rightDuration,
    trimInSec: target.trimInSec + leftDuration,
    transitionIn: 'None',
    transitionDurationSec: 0,
    keyframes: [],
    keyframesCount: 0,
  };

  return {
    clips: clips.flatMap((c) => (c.id === target.id ? [leftClip, rightClip] : [c])),
    nextSelectedId: rightClip.id,
  };
}

export function trimClipEdgeAtTime(
  clips: TimelineClip[],
  clipId: string,
  edge: 'in' | 'out',
  playheadSec: number
): TimelineClip[] | null {
  const target = clips.find((c) => c.id === clipId);
  if (!target) return null;
  const endSec = target.startSec + target.durationSec;

  if (edge === 'in' && playheadSec > target.startSec && playheadSec < endSec - 0.5) {
    const shift = playheadSec - target.startSec;
    return clips.map((c) =>
      c.id === target.id
        ? {
            ...c,
            startSec: Number(playheadSec.toFixed(2)),
            durationSec: Number((endSec - playheadSec).toFixed(2)),
            trimInSec: Number((c.trimInSec + shift).toFixed(2)),
          }
        : c
    );
  }

  if (edge === 'out' && playheadSec > target.startSec + 0.5 && playheadSec < endSec) {
    return clips.map((c) =>
      c.id === target.id
        ? { ...c, durationSec: Number((playheadSec - target.startSec).toFixed(2)) }
        : c
    );
  }

  return null;
}

export function createTimelineClipFromAsset(
  asset: MediaAsset,
  existingClips: TimelineClip[],
  preferredTrackId?: TimelineTrackId
): TimelineClip {
  const targetTrack: TimelineTrackId =
    preferredTrackId ??
    (asset.kind === 'audio' ? 'A1' : asset.kind === 'image' ? 'V2' : 'V1');
  const existingOnTrack = existingClips.filter((c) => c.trackId === targetTrack);
  const endOfTrack = existingOnTrack.reduce(
    (max, c) => Math.max(max, c.startSec + c.durationSec),
    0
  );

  return {
    id: `tl-${Date.now()}`,
    mediaId: asset.id,
    trackId: targetTrack,
    kind: asset.kind,
    label: asset.name.replace(/\.[^/.]+$/, ''),
    startSec: Number(endOfTrack.toFixed(2)),
    durationSec: Math.min(12, Math.max(3, Math.round(asset.durationSeconds))),
    trimInSec: 0,
    speed: 1,
    transitionIn: targetTrack.startsWith('V') ? 'Cross Dissolve' : 'None',
    transitionDurationSec: targetTrack.startsWith('V') ? 1.0 : 0,
    positionX: 0,
    positionY: 0,
    scalePct: 100,
    rotationDeg: 0,
    opacityPct: 100,
    volumeDb: 0,
    audioDuckingEnabled: targetTrack === 'A2',
    audioDuckingDb: -12,
    keyframesCount: 0,
    keyframes: [],
    thumbnailUrl: asset.thumbnailUrl,
  };
}
