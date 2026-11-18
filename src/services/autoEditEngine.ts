import { AUTO_PRESETS } from '../config/autoPresets';
import {
  AutoEditPipelineFlags,
  AutoEditPlanResult,
  AutoEditSceneSegment,
  AutoSceneTransition,
  RustAutoEditEngineBridge,
  RustAutoEditRequest,
} from '../types/autoEditEngine';
import { AutoPresetDefinition, MediaAsset } from '../types/studio';

function deterministicHash(seed: number, text: string): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 10000) / 10000;
}

function collectAppliedEffectsList(
  flags: AutoEditPipelineFlags,
  preset: AutoPresetDefinition
): string[] {
  const effects: string[] = [];
  if (flags.bestMovementDetection) effects.push('Best Movement Detection');
  if (flags.sceneSelection) effects.push('Scene Selection');
  if (flags.motionBasedZoom) effects.push('Motion-Based Zoom');
  if (flags.subjectTracking) effects.push('Subject Tracking');
  if (flags.automaticCrop) effects.push('Automatic Crop');
  if (flags.videoStabilization) effects.push('Video Stabilization');
  if (flags.colorCorrection) effects.push(`Color Correction (${preset.colorProfile})`);
  if (flags.noiseReduction) effects.push('Noise Reduction');
  if (flags.audioEnhancement) effects.push(`Audio Enhancement (${preset.audioTargetLufs} LUFS)`);
  if (flags.silenceRemoval) effects.push('Silence Removal');
  if (flags.automaticTransitions) effects.push(`Automatic Transitions (${preset.defaultTransition})`);
  if (flags.musicSynchronization) effects.push('Music Synchronization');
  if (flags.speedRamps) effects.push('Speed Ramps');
  return effects;
}

function buildSceneEffects(
  flags: AutoEditPipelineFlags,
  assetKind: 'video' | 'image',
  hasAudio: boolean,
  speedMultiplier: number
): string[] {
  const list: string[] = [];
  if (flags.videoStabilization && assetKind === 'video') list.push('Stabilize');
  if (flags.motionBasedZoom) list.push('Motion Zoom');
  if (flags.subjectTracking) list.push('Subject Track');
  if (flags.automaticCrop) list.push('Auto Crop');
  if (flags.colorCorrection) list.push('Color Grade');
  if (flags.noiseReduction) list.push('Denoise');
  if (flags.audioEnhancement && hasAudio) list.push('Audio LUFS');
  if (flags.silenceRemoval && hasAudio) list.push('Trim Silence');
  if (flags.speedRamps && speedMultiplier !== 1) list.push(`Speed ${speedMultiplier}x`);
  return list;
}

function buildPipelineStages(
  request: RustAutoEditRequest,
  preset: AutoPresetDefinition,
  hasAudioBed: boolean
): string[] {
  const { flags, outputFormat } = request;
  const stages: string[] = [
    'FFprobe media stream, frame-rate & color matrix inspection (Planned Rust IPC)',
  ];

  if (flags.bestMovementDetection || flags.sceneSelection) {
    stages.push(
      `OpenCV optical-flow scoring & scene cut detection (${preset.cutCadence})`
    );
  } else {
    stages.push('Sequential source media timeline assembly');
  }

  if (flags.subjectTracking || flags.automaticCrop || flags.motionBasedZoom) {
    stages.push(
      `Local subject-bounding reframe & dynamic crop for ${outputFormat.aspectRatio}`
    );
  }

  if (flags.videoStabilization || flags.noiseReduction) {
    stages.push('2-pass camera stabilization & spatial-temporal denoising');
  }

  if (flags.colorCorrection) {
    stages.push(`3D LUT & tone-curve transform (${preset.colorProfile})`);
  }

  if (flags.audioEnhancement || flags.silenceRemoval || flags.musicSynchronization) {
    stages.push(
      hasAudioBed && flags.musicSynchronization
        ? `Beat-grid cut alignment + loudness normalization (${preset.audioTargetLufs} LUFS)`
        : `Dialogue/ambience loudness normalization (${preset.audioTargetLufs} LUFS) & silence trim`
    );
  }

  stages.push(
    `Target delivery assembly: ${outputFormat.width}×${outputFormat.height} (${outputFormat.resolutionTier}) @ ${outputFormat.fps}fps`
  );

  return stages;
}

function recomputeTimelineOffsets(scenes: AutoEditSceneSegment[]): AutoEditSceneSegment[] {
  let cursor = 0;
  return scenes.map((scene, idx) => {
    const cleanDuration = Math.max(0.8, Number(scene.durationSec.toFixed(1)));
    const next: AutoEditSceneSegment = {
      ...scene,
      orderIndex: idx,
      startSec: Number(cursor.toFixed(1)),
      durationSec: cleanDuration,
    };
    cursor += cleanDuration;
    return next;
  });
}

function createSceneFromAsset(
  asset: MediaAsset,
  slotIdx: number,
  seed: number,
  preset: AutoPresetDefinition,
  flags: AutoEditPipelineFlags,
  targetSegDuration: number
): AutoEditSceneSegment {
  const rand = deterministicHash(seed + slotIdx * 17, asset.id);
  const [minCut, maxCut] = preset.cutRangeSec;
  let dur = targetSegDuration || minCut + rand * (maxCut - minCut);
  if (flags.musicSynchronization) {
    // Snap duration to 0.5s beat grid
    dur = Math.max(1.0, Math.round(dur * 2) / 2);
  } else {
    dur = Number(dur.toFixed(1));
  }

  const maxSrcDur = Math.max(1.0, asset.durationSeconds);
  const clampedDur = asset.kind === 'image' ? dur : Math.min(dur, maxSrcDur);
  const maxOffset = Math.max(0, maxSrcDur - clampedDur);
  const silenceOffset = flags.silenceRemoval && asset.hasAudio ? Math.min(maxOffset, 0.8) : 0;
  const sourceInSec = Number(
    (silenceOffset + Math.max(0, maxOffset - silenceOffset) * rand).toFixed(1)
  );
  const sourceOutSec = Number(Math.min(maxSrcDur, sourceInSec + clampedDur).toFixed(1));

  const speedMultiplier =
    flags.speedRamps && asset.kind === 'video'
      ? asset.fps >= 60
        ? 0.5
        : rand > 0.68
        ? 1.5
        : 1.0
      : 1.0;

  const motionScore = Number(
    (
      0.55 +
      (asset.fps >= 60 ? 0.22 : 0.08) +
      (flags.bestMovementDetection ? 0.14 : 0) +
      rand * 0.09
    ).toFixed(2)
  );

  const transitionIn: AutoSceneTransition =
    slotIdx === 0 || !flags.automaticTransitions ? 'Cut' : preset.defaultTransition;

  const rationaleParts: string[] = [];
  if (flags.bestMovementDetection) rationaleParts.push(`Motion ${Math.round(motionScore * 100)}%`);
  if (flags.musicSynchronization) rationaleParts.push('Beat-aligned');
  if (flags.silenceRemoval && asset.hasAudio) rationaleParts.push('Silence trimmed');
  if (rationaleParts.length === 0) rationaleParts.push('Chronological segment');

  return {
    id: `auto-scene-${seed}-${slotIdx}-${asset.id.slice(-4)}`,
    orderIndex: slotIdx,
    mediaId: asset.id,
    mediaName: asset.name.replace(/\.[^/.]+$/, ''),
    thumbnailUrl: asset.thumbnailUrl,
    kind: asset.kind === 'image' ? 'image' : 'video',
    startSec: 0,
    durationSec: clampedDur,
    sourceInSec,
    sourceOutSec,
    locked: false,
    motionScore,
    speedMultiplier,
    transitionIn,
    appliedEffects: buildSceneEffects(
      flags,
      asset.kind === 'image' ? 'image' : 'video',
      asset.hasAudio,
      speedMultiplier
    ),
    selectionRationale: rationaleParts.join(' · '),
  };
}

function assembleDeterministicPlan(
  request: RustAutoEditRequest,
  sourcePool: MediaAsset[],
  variantIndex: number,
  lockedScenesMap: Map<number, AutoEditSceneSegment>
): AutoEditPlanResult {
  const preset = AUTO_PRESETS.find((p) => p.id === request.presetId) ?? AUTO_PRESETS[0];
  const selectedIds = new Set(request.mediaAssets.map((a) => a.id));
  const selectedClips = sourcePool.filter((m) => selectedIds.has(m.id));
  const visualClips = selectedClips.filter((m) => m.kind === 'video' || m.kind === 'image');
  const audioBedClip = selectedClips.find((m) => m.kind === 'audio') ?? null;

  const fallbackPool = visualClips.length > 0 ? visualClips : selectedClips;

  // Score and deterministically rotate visual order per variantSeed
  const rankedVisuals = [...fallbackPool].sort((a, b) => {
    const scoreA =
      (request.flags.bestMovementDetection ? a.fps / 120 : 0) +
      deterministicHash(request.variantSeed, a.id);
    const scoreB =
      (request.flags.bestMovementDetection ? b.fps / 120 : 0) +
      deterministicHash(request.variantSeed, b.id);
    return scoreB - scoreA;
  });

  const [minCut, maxCut] = preset.cutRangeSec;
  const avgCut = (minCut + maxCut) / 2;

  const totalRawVisualSec = rankedVisuals.reduce((acc, m) => acc + m.durationSeconds, 0);
  const targetTotalSec =
    request.targetDurationMode === 'custom'
      ? Math.max(6, request.targetDurationSeconds)
      : Math.max(12, Math.min(90, Math.round(totalRawVisualSec * 0.36)));

  const desiredSceneCount =
    rankedVisuals.length === 0
      ? 0
      : Math.max(
          rankedVisuals.length,
          Math.min(14, Math.round(targetTotalSec / Math.max(1.2, avgCut)))
        );

  const builtScenes: AutoEditSceneSegment[] = [];
  for (let idx = 0; idx < desiredSceneCount; idx++) {
    const lockedSlot = lockedScenesMap.get(idx);
    if (lockedSlot) {
      builtScenes.push({ ...lockedSlot });
      continue;
    }
    const asset = rankedVisuals[idx % rankedVisuals.length];
    const remainingLockedDur = Array.from(lockedScenesMap.values()).reduce(
      (s, sc) => s + sc.durationSec,
      0
    );
    const unlockedCount = Math.max(1, desiredSceneCount - lockedScenesMap.size);
    const perSlotTarget =
      request.targetDurationMode === 'custom'
        ? Math.max(minCut * 0.85, Math.min(maxCut * 1.15, (targetTotalSec - remainingLockedDur) / unlockedCount))
        : 0;

    builtScenes.push(
      createSceneFromAsset(
        asset,
        idx,
        request.variantSeed,
        preset,
        request.flags,
        perSlotTarget
      )
    );
  }

  const timelineScenes = recomputeTimelineOffsets(builtScenes);
  const estimatedOutputDurationSec = Number(
    timelineScenes.reduce((acc, s) => acc + s.durationSec, 0).toFixed(1)
  );

  return {
    planId: `plan-${request.variantSeed}-${variantIndex}`,
    variantIndex,
    seed: request.variantSeed,
    presetId: preset.id,
    presetName: preset.name,
    selectedClips,
    audioBedClip,
    timelineScenes,
    appliedEffects: collectAppliedEffectsList(request.flags, preset),
    estimatedOutputDurationSec,
    estimatedCutCount: timelineScenes.length,
    outputFormat: request.outputFormat,
    pipelineStages: buildPipelineStages(request, preset, Boolean(audioBedClip)),
    engineMode: 'deterministic-local-preview',
    requiresNativeEngine: true,
    createdAt: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}

export const autoEditEngine: RustAutoEditEngineBridge = {
  mode: 'deterministic-local-preview',

  async generateEditPlan(
    request: RustAutoEditRequest,
    sourcePool: MediaAsset[]
  ): Promise<AutoEditPlanResult> {
    const lockedMap = new Map<number, AutoEditSceneSegment>();
    for (const sc of request.lockedScenes) {
      lockedMap.set(sc.orderIndex, sc);
    }
    return assembleDeterministicPlan(request, sourcePool, 1, lockedMap);
  },

  async regenerateAlternativePlan(
    request: RustAutoEditRequest,
    sourcePool: MediaAsset[],
    currentPlan: AutoEditPlanResult
  ): Promise<AutoEditPlanResult> {
    const lockedMap = new Map<number, AutoEditSceneSegment>();
    for (const sc of currentPlan.timelineScenes) {
      if (sc.locked) {
        lockedMap.set(sc.orderIndex, sc);
      }
    }
    const nextRequest: RustAutoEditRequest = {
      ...request,
      variantSeed: request.variantSeed + 101,
    };
    return assembleDeterministicPlan(
      nextRequest,
      sourcePool,
      currentPlan.variantIndex + 1,
      lockedMap
    );
  },

  replaceSceneMedia(
    plan: AutoEditPlanResult,
    sceneId: string,
    replacementAsset: MediaAsset
  ): AutoEditPlanResult {
    const nextScenes = plan.timelineScenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      const maxDur = Math.max(1.0, replacementAsset.durationSeconds);
      const nextDur =
        replacementAsset.kind === 'image' ? scene.durationSec : Math.min(scene.durationSec, maxDur);
      return {
        ...scene,
        mediaId: replacementAsset.id,
        mediaName: replacementAsset.name.replace(/\.[^/.]+$/, ''),
        thumbnailUrl: replacementAsset.thumbnailUrl,
        kind: replacementAsset.kind === 'image' ? ('image' as const) : ('video' as const),
        durationSec: Number(nextDur.toFixed(1)),
        sourceInSec: 0,
        sourceOutSec: Number(nextDur.toFixed(1)),
        selectionRationale: 'User replaced clip',
      };
    });
    const recomputed = recomputeTimelineOffsets(nextScenes);
    return {
      ...plan,
      timelineScenes: recomputed,
      estimatedOutputDurationSec: Number(
        recomputed.reduce((s, c) => s + c.durationSec, 0).toFixed(1)
      ),
    };
  },

  toggleSceneLock(plan: AutoEditPlanResult, sceneId: string): AutoEditPlanResult {
    return {
      ...plan,
      timelineScenes: plan.timelineScenes.map((scene) =>
        scene.id === sceneId ? { ...scene, locked: !scene.locked } : scene
      ),
    };
  },

  updateSceneConfiguration(
    plan: AutoEditPlanResult,
    sceneId: string,
    partial: Partial<
      Pick<AutoEditSceneSegment, 'appliedEffects' | 'transitionIn' | 'speedMultiplier' | 'durationSec'>
    >
  ): AutoEditPlanResult {
    const nextScenes = plan.timelineScenes.map((scene) =>
      scene.id === sceneId ? { ...scene, ...partial } : scene
    );
    const recomputed = recomputeTimelineOffsets(nextScenes);
    return {
      ...plan,
      timelineScenes: recomputed,
      estimatedOutputDurationSec: Number(
        recomputed.reduce((s, c) => s + c.durationSec, 0).toFixed(1)
      ),
    };
  },
};
