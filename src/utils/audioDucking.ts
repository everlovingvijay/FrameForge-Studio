import { TimelineClip, TimelineTrackState } from '../types/studio';

export interface DuckingInterval {
  startSec: number;
  endSec: number;
  reductionDb: number;
  sourceLabel: string;
}

export interface ClipDuckingStatus {
  isDucked: boolean;
  reductionDb: number;
  effectiveVolumeDb: number;
  sourceClipLabel: string | null;
}

function isTrackAudible(
  trackId: TimelineClip['trackId'],
  tracks: TimelineTrackState[],
  anySolo: boolean
): boolean {
  const track = tracks.find((t) => t.id === trackId);
  if (!track || track.muted) return false;
  if (anySolo && !track.solo) return false;
  return true;
}

/**
 * Returns true if a clip belongs to a voice-over track (A1).
 */
export function isVoiceOverClip(clip: TimelineClip): boolean {
  return clip.trackId === 'A1';
}

/**
 * Returns true if a clip is a background music track (A2).
 */
export function isBackgroundMusicClip(clip: TimelineClip): boolean {
  return clip.trackId === 'A2';
}

/**
 * Computes all timestamp intervals within `targetClip` where its volume is automatically
 * lowered because an unmuted A1 voice-over clip overlaps it and ducking is enabled
 * either on the target clip itself or on the overlapping voice-over clip.
 */
export function getClipDuckingIntervals(
  targetClip: TimelineClip,
  allClips: TimelineClip[],
  tracks: TimelineTrackState[]
): DuckingInterval[] {
  if (!targetClip.trackId.startsWith('A') || isVoiceOverClip(targetClip)) {
    return [];
  }

  const anySolo = tracks.some((t) => t.kind === 'audio' && t.solo);
  if (!isTrackAudible('A1', tracks, anySolo)) {
    return [];
  }

  const targetStart = targetClip.startSec;
  const targetEnd = targetClip.startSec + targetClip.durationSec;

  const voiceClips = allClips.filter(
    (c) => isVoiceOverClip(c) && !c.audioMuted && c.id !== targetClip.id
  );

  const intervals: DuckingInterval[] = [];

  for (const vo of voiceClips) {
    const voStart = vo.startSec;
    const voEnd = vo.startSec + vo.durationSec;
    const overlapStart = Math.max(targetStart, voStart);
    const overlapEnd = Math.min(targetEnd, voEnd);
    if (overlapEnd <= overlapStart) continue;

    // A2 background music ducks if ducking is enabled on this music clip OR on the active A1 voice-over clip.
    // A3 ambience ducks when explicitly enabled on the A3 clip itself.
    const enabledForPair =
      Boolean(targetClip.audioDuckingEnabled) ||
      (isBackgroundMusicClip(targetClip) && Boolean(vo.audioDuckingEnabled));

    if (!enabledForPair) continue;

    const rawReduction =
      targetClip.audioDuckingEnabled
        ? targetClip.audioDuckingDb ?? -12
        : vo.audioDuckingDb ?? -12;

    intervals.push({
      startSec: overlapStart,
      endSec: overlapEnd,
      reductionDb: -Math.abs(rawReduction),
      sourceLabel: vo.label,
    });
  }

  return intervals.sort((a, b) => a.startSec - b.startSec);
}

/**
 * Evaluates the live ducking status and effective dB volume of an audio clip at `timeSec`.
 */
export function getClipDuckingAtTime(
  targetClip: TimelineClip,
  timeSec: number,
  allClips: TimelineClip[],
  tracks: TimelineTrackState[]
): ClipDuckingStatus {
  const baseDb = targetClip.volumeDb ?? 0;
  if (targetClip.audioMuted) {
    return {
      isDucked: false,
      reductionDb: 0,
      effectiveVolumeDb: -60,
      sourceClipLabel: null,
    };
  }

  const intervals = getClipDuckingIntervals(targetClip, allClips, tracks);
  const active = intervals.find((iv) => timeSec >= iv.startSec && timeSec <= iv.endSec);

  if (!active) {
    return {
      isDucked: false,
      reductionDb: 0,
      effectiveVolumeDb: baseDb,
      sourceClipLabel: null,
    };
  }

  return {
    isDucked: true,
    reductionDb: active.reductionDb,
    effectiveVolumeDb: Math.max(-60, baseDb + active.reductionDb),
    sourceClipLabel: active.sourceLabel,
  };
}
