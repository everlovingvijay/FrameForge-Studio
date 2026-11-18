import {
  CameraSimulationId,
  EnhancementCategoryId,
  EnhancementLutId,
  VideoEnhancementState,
} from '../types/studio';

export interface EnhancementCategoryMeta {
  id: EnhancementCategoryId;
  indexLabel: string;
  label: string;
  pipelineRole: 'restoration' | 'stylistic';
  roleLabel: string;
  localBackendNote: string;
}

export const ENHANCEMENT_CATEGORIES: EnhancementCategoryMeta[] = [
  {
    id: 'basic',
    indexLabel: '01',
    label: 'Basic',
    pipelineRole: 'restoration',
    roleLabel: 'Genuine Restoration',
    localBackendNote: 'FFmpeg eq / curves & 32-bit float GPU exposure shaders',
  },
  {
    id: 'color',
    indexLabel: '02',
    label: 'Color',
    pipelineRole: 'restoration',
    roleLabel: 'Genuine Restoration',
    localBackendNote: 'FFmpeg colorbalance, lut3d (.cube), & GPU color matrix',
  },
  {
    id: 'detail',
    indexLabel: '03',
    label: 'Detail',
    pipelineRole: 'restoration',
    roleLabel: 'Genuine Restoration',
    localBackendNote: 'OpenCV deblock / unsharp mask & local texture recovery',
  },
  {
    id: 'noise',
    indexLabel: '04',
    label: 'Noise',
    pipelineRole: 'restoration',
    roleLabel: 'Genuine Restoration',
    localBackendNote: 'FFmpeg hqdn3d / nlmeans & OpenCV temporal denoising',
  },
  {
    id: 'portrait',
    indexLabel: '05',
    label: 'Portrait',
    pipelineRole: 'restoration',
    roleLabel: 'Genuine Restoration',
    localBackendNote: 'Optional local ONNX face mask + bilateral skin smoothing',
  },
  {
    id: 'motion',
    indexLabel: '06',
    label: 'Motion',
    pipelineRole: 'restoration',
    roleLabel: 'Genuine Restoration',
    localBackendNote: 'FFmpeg vidstabtransform & OpenCV DIS optical flow',
  },
  {
    id: 'camera-sim',
    indexLabel: '07',
    label: 'Camera Sim',
    pipelineRole: 'stylistic',
    roleLabel: 'Stylistic Camera Simulation',
    localBackendNote: 'Stylistic sensor/compression profile shader (non-restorative)',
  },
  {
    id: 'advanced',
    indexLabel: '08',
    label: 'Advanced',
    pipelineRole: 'stylistic',
    roleLabel: 'Stylistic Optical FX',
    localBackendNote: 'GPU lens distortion, RGB dispersion, halation & film grain',
  },
];

export interface CameraSimulationProfile {
  id: CameraSimulationId;
  name: string;
  pipelineRole: 'stylistic-simulation' | 'bypass';
  sensorClass: string;
  summary: string;
  characteristics: string[];
  /** Relative visual offsets applied proportionally to cameraSimulationIntensity */
  modifiers: {
    contrast: number;
    saturation: number;
    brightness: number;
    warmth: number;
    tintDeg: number;
    sharpnessHint: number;
    softnessBlurPx: number;
    grainBoost: number;
    vignetteBoost: number;
    chromaticBoost: number;
  };
  nativeShaderTarget: string;
}

export const CAMERA_SIMULATION_PROFILES: CameraSimulationProfile[] = [
  {
    id: 'none',
    name: 'Native Source (No Simulation)',
    pipelineRole: 'bypass',
    sensorClass: 'Unaltered Pipeline',
    summary: 'Preserves genuine restoration adjustments without synthetic camera degradation or sensor emulation.',
    characteristics: ['Zero synthetic degradation', 'True restoration output'],
    modifiers: {
      contrast: 0,
      saturation: 0,
      brightness: 0,
      warmth: 0,
      tintDeg: 0,
      sharpnessHint: 0,
      softnessBlurPx: 0,
      grainBoost: 0,
      vignetteBoost: 0,
      chromaticBoost: 0,
    },
    nativeShaderTarget: 'Pass-through 32-bit float buffer',
  },
  {
    id: 'budget-android',
    name: 'Budget Android Camera Footage',
    pipelineRole: 'stylistic-simulation',
    sensorClass: '1/3.2" Entry CMOS · Heavy H.264',
    summary: 'Emulates clipped highlights, cool cyan-green auto-white-balance drift, macroblock compression, and harsh edge halos.',
    characteristics: ['Cool cast', 'Harsh edge contrast', 'Shadow crush', 'Blocky grain'],
    modifiers: {
      contrast: 16,
      saturation: -10,
      brightness: -4,
      warmth: -8,
      tintDeg: 10,
      sharpnessHint: 30,
      softnessBlurPx: 0.3,
      grainBoost: 24,
      vignetteBoost: 14,
      chromaticBoost: 22,
    },
    nativeShaderTarget: 'GPU quantization + 8-bit 4:2:0 DCT compression pass',
  },
  {
    id: 'older-smartphone',
    name: 'Older Smartphone Footage',
    pipelineRole: 'stylistic-simulation',
    sensorClass: 'Legacy Mobile Sensor (2014–2017)',
    summary: 'Soft optics, narrow dynamic range, warm amber indoor cast, and fine chroma noise in mid-shadows.',
    characteristics: ['Soft optical resolve', 'Warm shadow lift', 'Reduced latitude'],
    modifiers: {
      contrast: -10,
      saturation: -14,
      brightness: 4,
      warmth: 18,
      tintDeg: -5,
      sharpnessHint: 0,
      softnessBlurPx: 0.75,
      grainBoost: 30,
      vignetteBoost: 24,
      chromaticBoost: 18,
    },
    nativeShaderTarget: 'Gaussian lens MTF roll-off + chroma noise LUT',
  },
  {
    id: 'standard-hd-mobile',
    name: 'Standard HD Mobile Footage',
    pipelineRole: 'stylistic-simulation',
    sensorClass: '1080p Consumer Mobile ISP',
    summary: 'Punchy Rec.709 auto-tone curve with elevated midtone saturation and crisp electronic sharpening.',
    characteristics: ['Punchy Rec.709 curve', 'Crisp sharpening', 'Auto-exposure pop'],
    modifiers: {
      contrast: 12,
      saturation: 12,
      brightness: 3,
      warmth: 3,
      tintDeg: 0,
      sharpnessHint: 18,
      softnessBlurPx: 0,
      grainBoost: 8,
      vignetteBoost: 6,
      chromaticBoost: 6,
    },
    nativeShaderTarget: 'ISP S-curve + unsharp mask GPU pass',
  },
  {
    id: 'premium-smartphone',
    name: 'Premium Smartphone Footage',
    pipelineRole: 'stylistic-simulation',
    sensorClass: 'Flagship Computational HDR Pipeline',
    summary: 'High micro-contrast local tone mapping, protected highlight roll-off, and clean vivid color separation.',
    characteristics: ['Balanced HDR lift', 'Clean highlights', 'Rich color separation'],
    modifiers: {
      contrast: 10,
      saturation: 14,
      brightness: 6,
      warmth: 4,
      tintDeg: -2,
      sharpnessHint: 12,
      softnessBlurPx: 0,
      grainBoost: 0,
      vignetteBoost: 4,
      chromaticBoost: 0,
    },
    nativeShaderTarget: 'Local Laplacian tone-map + ACES highlight compression',
  },
  {
    id: 'professional-camera',
    name: 'Professional Camera Footage',
    pipelineRole: 'stylistic-simulation',
    sensorClass: 'Super35 / Full-Frame Cinema Log',
    summary: 'Filmic highlight shoulder, controlled organic midtone contrast, accurate skin rendition, and subtle optical depth.',
    characteristics: ['Filmic highlight roll-off', 'Deep shadow poise', 'Organic texture'],
    modifiers: {
      contrast: 8,
      saturation: 4,
      brightness: 0,
      warmth: 6,
      tintDeg: -3,
      sharpnessHint: 4,
      softnessBlurPx: 0,
      grainBoost: 10,
      vignetteBoost: 16,
      chromaticBoost: 4,
    },
    nativeShaderTarget: '33-point tetrahedral 3D LUT + cinema shoulder curve',
  },
  {
    id: 'low-light-phone',
    name: 'Low-Light Phone Recordings',
    pipelineRole: 'stylistic-simulation',
    sensorClass: 'High-ISO Night Mode Simulation',
    summary: 'Aggressive shadow gain, elevated luminance/chroma noise, sodium-vapor warmth, and temporal motion smear.',
    characteristics: ['High-ISO grain', 'Warm night cast', 'Lifted noisy blacks'],
    modifiers: {
      contrast: -12,
      saturation: -18,
      brightness: 10,
      warmth: 22,
      tintDeg: 6,
      sharpnessHint: 0,
      softnessBlurPx: 0.9,
      grainBoost: 54,
      vignetteBoost: 30,
      chromaticBoost: 24,
    },
    nativeShaderTarget: 'Shadow gain lift + temporal smear + sensor noise synthesis',
  },
];

export interface EnhancementLutOption {
  id: EnhancementLutId;
  name: string;
  description: string;
  cssHint: {
    contrast: number;
    saturate: number;
    sepia: number;
    hueRotateDeg: number;
    brightness: number;
  };
  cubeFileRef: string;
}

export const ENHANCEMENT_LUTS: EnhancementLutOption[] = [
  {
    id: 'none',
    name: 'Bypass (Linear / Rec.709)',
    description: 'No creative LUT transform applied.',
    cssHint: { contrast: 0, saturate: 0, sepia: 0, hueRotateDeg: 0, brightness: 0 },
    cubeFileRef: 'Bypass',
  },
  {
    id: 'rec709-natural',
    name: 'Rec.709 Natural Contrast',
    description: 'Neutral broadcast transform with clean black anchor.',
    cssHint: { contrast: 0.08, saturate: 0.05, sepia: 0, hueRotateDeg: 0, brightness: 0 },
    cubeFileRef: 'rec709_natural_33.cube',
  },
  {
    id: 'kodak-2383',
    name: 'Kodak 2383 Warm Print',
    description: 'Rich print shadows with warm highlight roll-off.',
    cssHint: { contrast: 0.14, saturate: 0.1, sepia: 0.18, hueRotateDeg: -4, brightness: -0.02 },
    cubeFileRef: 'kodak_2383_d65.cube',
  },
  {
    id: 'teal-orange',
    name: 'Teal & Orange Blockbuster',
    description: 'Cool shadow separation paired with warm skin highlights.',
    cssHint: { contrast: 0.12, saturate: 0.18, sepia: 0.08, hueRotateDeg: -9, brightness: 0 },
    cubeFileRef: 'cinema_teal_orange.cube',
  },
  {
    id: 'fuji-eterna',
    name: 'Fujifilm Eterna Soft',
    description: 'Low-contrast documentary film stock with gentle greens.',
    cssHint: { contrast: -0.06, saturate: -0.1, sepia: 0.06, hueRotateDeg: 5, brightness: 0.03 },
    cubeFileRef: 'fujifilm_eterna_logc.cube',
  },
  {
    id: 'monochrome-hi',
    name: 'Monochrome Silver Halide',
    description: 'Crisp black-and-white luminance separation.',
    cssHint: { contrast: 0.22, saturate: -1.0, sepia: 0.04, hueRotateDeg: 0, brightness: 0.01 },
    cubeFileRef: 'silver_halide_bw.cube',
  },
];

export const CATEGORY_STATE_KEYS: Record<EnhancementCategoryId, (keyof VideoEnhancementState)[]> = {
  basic: ['exposure', 'brightness', 'contrast', 'highlights', 'shadows', 'whites', 'blacks'],
  color: [
    'temperature',
    'tint',
    'saturation',
    'vibrance',
    'redChannel',
    'greenChannel',
    'blueChannel',
    'curveLift',
    'curveGamma',
    'curveGain',
    'lutId',
    'lutIntensity',
  ],
  detail: ['sharpness', 'clarity', 'texture', 'deblocking', 'detailRecovery'],
  noise: ['lumaNoiseReduction', 'chromaNoiseReduction', 'temporalDenoising', 'noiseReduction', 'grain'],
  portrait: [
    'portraitSmoothingEnabled',
    'smoothing',
    'faceAwareAdjustments',
    'skinTonePreservation',
  ],
  motion: ['stabilization', 'motionBlur', 'opticalFlow', 'slowMotionRate', 'speedRampIntensity'],
  'camera-sim': ['cameraSimulation', 'cameraSimulationIntensity'],
  advanced: [
    'vignette',
    'lensDistortion',
    'chromaticAberration',
    'filmGrain',
    'cinematicEffects',
    'zoom',
    'cropPercent',
    'rotationDeg',
  ],
};

export interface ComputedEnhancementPreview {
  cssFilter: string;
  transform: string;
  vignetteOpacity: number;
  grainOpacity: number;
  halationOpacity: number;
  chromaticOffsetPx: number;
  rgbScale: [number, number, number];
  pipelineClassification: 'restoration' | 'stylistic' | 'hybrid';
  hasStylisticSimulation: boolean;
  hasRestorationEdits: boolean;
  activeCameraProfile: CameraSimulationProfile;
  activeLut: EnhancementLutOption;
}

export function classifyEnhancementState(
  state: VideoEnhancementState
): 'restoration' | 'stylistic' | 'hybrid' {
  const hasStylistic =
    state.cameraSimulation !== 'none' ||
    state.vignette > 0 ||
    state.lensDistortion !== 0 ||
    state.chromaticAberration > 0 ||
    state.filmGrain > 0 ||
    state.cinematicEffects > 0;

  const hasRestoration =
    state.exposure !== 0 ||
    state.brightness !== 0 ||
    state.contrast !== 0 ||
    state.highlights !== 0 ||
    state.shadows !== 0 ||
    state.whites !== 0 ||
    state.blacks !== 0 ||
    state.temperature !== 0 ||
    state.tint !== 0 ||
    state.saturation !== 0 ||
    state.vibrance !== 0 ||
    state.redChannel !== 0 ||
    state.greenChannel !== 0 ||
    state.blueChannel !== 0 ||
    state.curveLift !== 0 ||
    state.curveGamma !== 0 ||
    state.curveGain !== 0 ||
    state.lutId !== 'none' ||
    state.sharpness > 0 ||
    state.clarity !== 0 ||
    state.texture !== 0 ||
    state.deblocking > 0 ||
    state.detailRecovery > 0 ||
    state.lumaNoiseReduction > 0 ||
    state.chromaNoiseReduction > 0 ||
    state.temporalDenoising > 0 ||
    state.portraitSmoothingEnabled ||
    state.stabilization > 0 ||
    state.slowMotionRate < 1;

  if (hasStylistic && hasRestoration) return 'hybrid';
  if (hasStylistic) return 'stylistic';
  return 'restoration';
}

export function computeEnhancementPreviewStyles(
  e: VideoEnhancementState
): ComputedEnhancementPreview {
  const activeCameraProfile =
    CAMERA_SIMULATION_PROFILES.find((p) => p.id === e.cameraSimulation) ??
    CAMERA_SIMULATION_PROFILES[0];
  const simBlend = e.cameraSimulation === 'none' ? 0 : e.cameraSimulationIntensity / 100;

  const activeLut = ENHANCEMENT_LUTS.find((l) => l.id === e.lutId) ?? ENHANCEMENT_LUTS[0];
  const lutBlend = e.lutId === 'none' ? 0 : e.lutIntensity / 100;

  // Genuine tonal + curve calculations
  const toneBrightness =
    1 +
    (e.exposure * 1.15 +
      e.brightness +
      e.whites * 0.35 +
      e.shadows * 0.25 +
      e.curveLift * 0.3 +
      e.curveGamma * 0.4 +
      e.curveGain * 0.35 +
      activeCameraProfile.modifiers.brightness * simBlend) /
      145 +
    activeLut.cssHint.brightness * lutBlend;

  const toneContrast =
    1 +
    (e.contrast +
      e.clarity * 0.35 +
      (e.whites - e.blacks) * 0.28 +
      (e.curveGain - e.curveLift) * 0.25 +
      activeCameraProfile.modifiers.contrast * simBlend) /
      105 +
    activeLut.cssHint.contrast * lutBlend;

  // Portrait skin preservation keeps saturation gentle when enabled
  const skinSaturationDamp = e.portraitSmoothingEnabled
    ? Math.max(0.75, 1 - (e.skinTonePreservation / 100) * 0.15)
    : 1;

  const rawSaturate =
    1 +
    ((e.saturation + e.vibrance * 0.55 + activeCameraProfile.modifiers.saturation * simBlend) /
      100) *
      skinSaturationDamp +
    activeLut.cssHint.saturate * lutBlend;

  const sepiaAmount = Math.max(
    0,
    Math.min(
      0.85,
      Math.max(0, e.temperature + activeCameraProfile.modifiers.warmth * simBlend) / 160 +
        activeLut.cssHint.sepia * lutBlend
    )
  );

  const coolShiftDeg =
    e.temperature < 0
      ? e.temperature * 0.22
      : activeCameraProfile.modifiers.warmth * simBlend < 0
      ? activeCameraProfile.modifiers.warmth * simBlend * 0.35
      : 0;

  const hueRotateDeg =
    e.tint * 0.45 +
    coolShiftDeg +
    activeCameraProfile.modifiers.tintDeg * simBlend +
    activeLut.cssHint.hueRotateDeg * lutBlend;

  // Portrait smoothing or low-light softness blur hint; denoise subtle softening
  const portraitBlur = e.portraitSmoothingEnabled ? (e.smoothing / 100) * 0.8 : 0;
  const denoiseBlur =
    (e.lumaNoiseReduction * 0.35 + e.temporalDenoising * 0.35) / 100 * 0.35;
  const simBlur = activeCameraProfile.modifiers.softnessBlurPx * simBlend;
  const netBlur = Math.max(0, portraitBlur + denoiseBlur + simBlur - (e.sharpness / 100) * 0.4);

  const filters = [
    `brightness(${Math.max(0.25, toneBrightness).toFixed(3)})`,
    `contrast(${Math.max(0.35, toneContrast).toFixed(3)})`,
    `saturate(${Math.max(0, rawSaturate).toFixed(3)})`,
    `sepia(${sepiaAmount.toFixed(3)})`,
    `hue-rotate(${hueRotateDeg.toFixed(1)}deg)`,
  ];
  if (netBlur > 0.08) {
    filters.push(`blur(${netBlur.toFixed(2)}px)`);
  }

  // Transform covers framing + barrel/pincushion lens distortion simulation
  const distortionScale = e.lensDistortion !== 0 ? 1 + Math.abs(e.lensDistortion) / 260 : 1;
  const scaleFactor = (e.zoom / 100) * (1 + e.cropPercent / 100) * distortionScale;
  const skewFactor = e.lensDistortion < 0 ? Math.abs(e.lensDistortion) * 0.03 : 0;
  const transform = `scale(${scaleFactor.toFixed(3)}) rotate(${e.rotationDeg}deg) perspective(900px) rotateX(${skewFactor.toFixed(2)}deg)`;

  const totalVignette = Math.min(
    100,
    e.vignette + activeCameraProfile.modifiers.vignetteBoost * simBlend
  );
  const totalGrain = Math.min(
    100,
    e.grain * 0.55 + e.filmGrain * 0.85 + activeCameraProfile.modifiers.grainBoost * simBlend
  );
  const totalChromatic = Math.min(
    100,
    e.chromaticAberration + activeCameraProfile.modifiers.chromaticBoost * simBlend
  );

  const classification = classifyEnhancementState(e);

  return {
    cssFilter: filters.join(' '),
    transform,
    vignetteOpacity: totalVignette / 115,
    grainOpacity: totalGrain / 220,
    halationOpacity: e.cinematicEffects / 180,
    chromaticOffsetPx: Number(((totalChromatic / 100) * 3.5).toFixed(2)),
    rgbScale: [
      1 + e.redChannel / 140,
      1 + e.greenChannel / 140,
      1 + e.blueChannel / 140,
    ],
    pipelineClassification: classification,
    hasStylisticSimulation: classification !== 'restoration',
    hasRestorationEdits: classification !== 'stylistic',
    activeCameraProfile,
    activeLut,
  };
}
