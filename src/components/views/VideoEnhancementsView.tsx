import React, { useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  FolderHeart,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { NEUTRAL_VIDEO_ENHANCEMENTS } from '../../config/defaults';
import {
  CAMERA_SIMULATION_PROFILES,
  CATEGORY_STATE_KEYS,
  classifyEnhancementState,
  computeEnhancementPreviewStyles,
  ENHANCEMENT_CATEGORIES,
  ENHANCEMENT_LUTS,
} from '../../config/enhancementProfiles';
import { useStudioStore } from '../../store/useStudioStore';
import {
  EnhancementCategoryId,
  EnhancementLutId,
  VideoEnhancementState,
} from '../../types/studio';
import { EnhancementComparisonMonitor } from '../enhancements/EnhancementComparisonMonitor';
import { StudioSliderControl } from '../ui/StudioSliderControl';

interface ToneCurvePreviewProps {
  lift: number;
  gamma: number;
  gain: number;
}

const ToneCurvePreview: React.FC<ToneCurvePreviewProps> = ({ lift, gamma, gain }) => {
  // Build smooth quadratic/cubic SVG curve from lift (-50..50), gamma (-50..50), gain (-50..50)
  const w = 220;
  const h = 84;
  const startY = Math.max(4, Math.min(h - 4, h - 6 - (lift / 50) * 18));
  const endY = Math.max(4, Math.min(h - 4, 6 - (gain / 50) * 18));
  const midY = Math.max(4, Math.min(h - 4, h / 2 - (gamma / 50) * 24));
  const pathD = `M 4 ${startY.toFixed(1)} Q ${(w / 2).toFixed(1)} ${midY.toFixed(1)} ${w - 4} ${endY.toFixed(1)}`;

  return (
    <div className="rounded bg-[#0F1014] border border-[#23262F] p-2">
      <div className="flex items-center justify-between text-[10px] text-[#8E95A5] mb-1">
        <span>Master Tone Curve</span>
        <span className="font-mono tabular-nums">
          L:{lift} / G:{gamma} / H:{gain}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[84px] block">
        {/* Grid lines */}
        <line x1={w * 0.25} y1={0} x2={w * 0.25} y2={h} stroke="#1F222B" strokeWidth={1} />
        <line x1={w * 0.5} y1={0} x2={w * 0.5} y2={h} stroke="#1F222B" strokeWidth={1} />
        <line x1={w * 0.75} y1={0} x2={w * 0.75} y2={h} stroke="#1F222B" strokeWidth={1} />
        <line x1={0} y1={h * 0.5} x2={w} y2={h * 0.5} stroke="#1F222B" strokeWidth={1} />
        {/* Neutral diagonal reference */}
        <line x1={4} y1={h - 6} x2={w - 4} y2={6} stroke="#2E3340" strokeDasharray="3 3" strokeWidth={1} />
        {/* Active Curve */}
        <path d={pathD} fill="none" stroke="#60A5FA" strokeWidth={2} strokeLinecap="round" />
      </svg>
    </div>
  );
};

export const VideoEnhancementsView: React.FC = () => {
  const enhancements = useStudioStore((s) => s.enhancements);
  const enhancementPresets = useStudioStore((s) => s.enhancementPresets);
  const mediaPool = useStudioStore((s) => s.mediaPool);
  const updateEnhancement = useStudioStore((s) => s.updateEnhancement);
  const resetEnhancements = useStudioStore((s) => s.resetEnhancements);
  const resetEnhancementCategory = useStudioStore((s) => s.resetEnhancementCategory);
  const saveCustomEnhancementPreset = useStudioStore((s) => s.saveCustomEnhancementPreset);
  const applyCustomEnhancementPreset = useStudioStore((s) => s.applyCustomEnhancementPreset);
  const deleteCustomEnhancementPreset = useStudioStore((s) => s.deleteCustomEnhancementPreset);
  const importFilesFromBrowser = useStudioStore((s) => s.importFilesFromBrowser);

  const [activeCategory, setActiveCategory] = useState<EnhancementCategoryId>('basic');
  const [selectedSampleId, setSelectedSampleId] = useState(
    () => mediaPool.find((m) => m.kind === 'video')?.id ?? mediaPool[0]?.id ?? ''
  );
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [isSaveFormOpen, setIsSaveFormOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetNotesInput, setPresetNotesInput] = useState('');

  const previewClip =
    mediaPool.find((m) => m.id === selectedSampleId) ??
    mediaPool.find((m) => m.kind === 'video' || m.kind === 'image');

  const computedPreview = useMemo(
    () => computeEnhancementPreviewStyles(enhancements),
    [enhancements]
  );

  const activeCategoryMeta =
    ENHANCEMENT_CATEGORIES.find((c) => c.id === activeCategory) ?? ENHANCEMENT_CATEGORIES[0];

  const restorationCategories = ENHANCEMENT_CATEGORIES.filter(
    (c) => c.pipelineRole === 'restoration'
  );
  const stylisticCategories = ENHANCEMENT_CATEGORIES.filter(
    (c) => c.pipelineRole === 'stylistic'
  );

  const handleImportFiles = async (files: FileList) => {
    const imported = await importFilesFromBrowser(files);
    const firstVisual = imported.find((m) => m.kind === 'video' || m.kind === 'image');
    if (firstVisual) setSelectedSampleId(firstVisual.id);
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetNameInput.trim()) return;
    saveCustomEnhancementPreset({
      name: presetNameInput,
      notes: presetNotesInput,
    });
    setPresetNameInput('');
    setPresetNotesInput('');
    setIsSaveFormOpen(false);
    setPresetsOpen(true);
  };

  const categoryHasChanges = (catId: EnhancementCategoryId) =>
    CATEGORY_STATE_KEYS[catId].some(
      (k) => enhancements[k] !== NEUTRAL_VIDEO_ENHANCEMENTS[k]
    );

  const renderSlider = (
    key: keyof VideoEnhancementState,
    label: string,
    min: number,
    max: number,
    options?: { step?: number; unit?: string; signed?: boolean; disabled?: boolean; helperText?: string }
  ) => (
    <StudioSliderControl
      key={key}
      label={label}
      value={Number(enhancements[key])}
      defaultValue={Number(NEUTRAL_VIDEO_ENHANCEMENTS[key])}
      min={min}
      max={max}
      step={options?.step}
      unit={options?.unit}
      signed={options?.signed}
      disabled={options?.disabled}
      helperText={options?.helperText}
      onChange={(val) => updateEnhancement(key, val as VideoEnhancementState[typeof key])}
      onReset={() =>
        updateEnhancement(
          key,
          NEUTRAL_VIDEO_ENHANCEMENTS[key] as VideoEnhancementState[typeof key]
        )
      }
    />
  );

  const currentClassification = classifyEnhancementState(enhancements);

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col lg:flex-row overflow-hidden">
      {/* Left: Synchronized Before & After Video Preview */}
      <EnhancementComparisonMonitor
        clip={previewClip}
        mediaPool={mediaPool}
        selectedClipId={selectedSampleId}
        onSelectClip={setSelectedSampleId}
        onImportFiles={handleImportFiles}
        enhancements={enhancements}
        preview={computedPreview}
      />

      {/* Right: 8-Category Enhancement & Simulation Inspector */}
      <aside className="w-full lg:w-[440px] shrink-0 bg-[#15171B] border-t lg:border-t-0 lg:border-l border-[#24272F] flex flex-col min-h-0">
        {/* Top Action Bar */}
        <div className="px-4 py-3 border-b border-[#23262E] flex items-center justify-between gap-2">
          <div>
            <div className="text-[13px] font-semibold text-[#F3F4F6]">
              Enhancement Controls
            </div>
            <div className="text-[11px] text-[#8E95A5]">
              FFmpeg · OpenCV · GPU Shaders · Local ONNX
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPresetsOpen((v) => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                presetsOpen
                  ? 'bg-[#232732] border-[#3B82F6] text-white'
                  : 'bg-[#1B1E25] border-[#2C313D] text-[#C8CDD8] hover:text-white'
              }`}
            >
              <FolderHeart className="w-3 h-3" />
              <span>Presets ({enhancementPresets.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSaveFormOpen((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <BookmarkPlus className="w-3 h-3" />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={resetEnhancements}
              title="Reset all 8 enhancement categories to neutral"
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#1B1E25] hover:bg-[#242832] border border-[#2C313D] text-[11px] text-[#9BA2B0] hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>
        </div>

        {/* Save Custom Preset Drawer */}
        {isSaveFormOpen && (
          <form
            onSubmit={handleSavePreset}
            className="px-4 py-3 bg-[#111318] border-b border-[#23262E] space-y-2"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-[#E6E8EC]">Save Custom Enhancement Preset</span>
              <span className="text-[#8E95A5]">
                Auto-tagged:{' '}
                <strong className="font-medium text-[#E6E8EC]">
                  {currentClassification === 'restoration'
                    ? 'Genuine Restoration'
                    : currentClassification === 'stylistic'
                    ? 'Stylistic Simulation'
                    : 'Hybrid'}
                </strong>
              </span>
            </div>
            <input
              type="text"
              value={presetNameInput}
              onChange={(e) => setPresetNameInput(e.target.value)}
              placeholder="Preset name (e.g., Indoor Low-Light Clean)"
              className="w-full px-2.5 py-1.5 rounded bg-[#181A20] border border-[#2D323E] text-[12px] text-[#E6E8EC] placeholder-[#6B7280] focus:outline-none focus:border-[#3B82F6]"
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={presetNotesInput}
                onChange={(e) => setPresetNotesInput(e.target.value)}
                placeholder="Optional pipeline note"
                className="flex-1 px-2.5 py-1.5 rounded bg-[#181A20] border border-[#2D323E] text-[12px] text-[#E6E8EC] placeholder-[#6B7280] focus:outline-none focus:border-[#3B82F6]"
              />
              <button
                type="submit"
                disabled={!presetNameInput.trim()}
                className="px-3 py-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-45 text-white text-[11px] font-medium whitespace-nowrap shrink-0"
              >
                Save Preset
              </button>
              <button
                type="button"
                onClick={() => setIsSaveFormOpen(false)}
                className="px-2.5 py-1.5 rounded bg-[#1B1E25] text-[#9BA2B0] hover:text-white text-[11px] whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Saved Presets Drawer */}
        {presetsOpen && (
          <div className="px-4 py-3 bg-[#111318] border-b border-[#23262E] max-h-[210px] overflow-y-auto space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[#8E95A5]">
              <span>Saved & Built-In Presets</span>
              <span>Click to apply</span>
            </div>
            <div className="space-y-1.5">
              {enhancementPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 rounded bg-[#17191E] border border-[#252932] hover:border-[#3A4152] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => applyCustomEnhancementPreset(preset.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-[#E6E8EC] truncate">
                        {preset.name}
                      </span>
                      <span
                        className={`text-[10px] whitespace-nowrap shrink-0 ${
                          preset.classification === 'restoration'
                            ? 'text-[#34D399]'
                            : preset.classification === 'stylistic'
                            ? 'text-[#F59E0B]'
                            : 'text-[#60A5FA]'
                        }`}
                      >
                        {preset.classification === 'restoration'
                          ? 'Restoration'
                          : preset.classification === 'stylistic'
                          ? 'Stylistic'
                          : 'Hybrid'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8E95A5] truncate">{preset.notes}</p>
                  </button>
                  {!preset.isBuiltIn && (
                    <button
                      type="button"
                      onClick={() => deleteCustomEnhancementPreset(preset.id)}
                      title="Delete custom preset"
                      className="p-1 rounded text-[#7A8190] hover:text-[#F87171] hover:bg-[#232732]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8-Category Navigation Grouped Clearly: Restoration vs Stylistic Simulation */}
        <div className="px-3 py-2.5 border-b border-[#23262E] bg-[#121418] space-y-2">
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#34D399] mb-1 px-0.5">
              <span className="font-medium">Genuine Restoration Pipeline</span>
              <span className="text-[#7A8190]">Signal Repair & Color Accuracy</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {restorationCategories.map((cat) => {
                const active = activeCategory === cat.id;
                const modified = categoryHasChanges(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-[11px] border transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#2563EB] border-[#3B82F6] text-white font-medium'
                        : 'bg-[#181A20] border-[#252932] text-[#B3BAC8] hover:text-white hover:border-[#353B48]'
                    }`}
                  >
                    <span className="truncate">
                      {cat.indexLabel}. {cat.label}
                    </span>
                    {modified && (
                      <span
                        className={`text-[10px] font-mono ${
                          active ? 'text-white/90' : 'text-[#60A5FA]'
                        }`}
                      >
                        *
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] text-[#F59E0B] mb-1 px-0.5">
              <span className="font-medium">Stylistic Camera Simulation & FX</span>
              <span className="text-[#7A8190]">Emulation & Optical Character</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {stylisticCategories.map((cat) => {
                const active = activeCategory === cat.id;
                const modified = categoryHasChanges(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-[11px] border transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#D97706] border-[#F59E0B] text-white font-medium'
                        : 'bg-[#181A20] border-[#252932] text-[#B3BAC8] hover:text-white hover:border-[#353B48]'
                    }`}
                  >
                    <span className="truncate">
                      {cat.indexLabel}. {cat.label}
                    </span>
                    {modified && (
                      <span
                        className={`text-[10px] font-mono ${
                          active ? 'text-white/90' : 'text-[#F59E0B]'
                        }`}
                      >
                        *
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Category Controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Category Context Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#23262E]">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#F3F4F6]">
                <span>
                  {activeCategoryMeta.indexLabel}. {activeCategoryMeta.label}
                </span>
                <span aria-hidden="true" className="text-[#4B5263]">
                  ·
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    activeCategoryMeta.pipelineRole === 'restoration'
                      ? 'text-[#34D399]'
                      : 'text-[#F59E0B]'
                  }`}
                >
                  {activeCategoryMeta.roleLabel}
                </span>
              </div>
              <p className="text-[11px] text-[#8E95A5] mt-0.5">
                {activeCategoryMeta.localBackendNote}
              </p>
            </div>
            <button
              type="button"
              onClick={() => resetEnhancementCategory(CATEGORY_STATE_KEYS[activeCategory])}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#1B1E25] hover:bg-[#232732] border border-[#2C313D] text-[11px] text-[#9BA2B0] hover:text-white shrink-0 whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Section</span>
            </button>
          </div>

          {/* 1. Basic Adjustments */}
          {activeCategory === 'basic' && (
            <div className="space-y-3">
              {renderSlider('exposure', 'Exposure', -50, 50, { signed: true })}
              {renderSlider('brightness', 'Brightness', -50, 50, { signed: true })}
              {renderSlider('contrast', 'Contrast', -50, 50, { signed: true })}
              {renderSlider('highlights', 'Highlights', -50, 50, { signed: true })}
              {renderSlider('shadows', 'Shadows', -50, 50, { signed: true })}
              {renderSlider('whites', 'Whites', -50, 50, { signed: true })}
              {renderSlider('blacks', 'Blacks', -50, 50, { signed: true })}
            </div>
          )}

          {/* 2. Color */}
          {activeCategory === 'color' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="text-[11px] font-medium text-[#8E95A5]">
                  White Balance & Chroma
                </div>
                {renderSlider('temperature', 'Temperature', -50, 50, { signed: true })}
                {renderSlider('tint', 'Tint', -50, 50, { signed: true })}
                {renderSlider('saturation', 'Saturation', -50, 50, { signed: true })}
                {renderSlider('vibrance', 'Vibrance', -50, 50, { signed: true })}
              </div>

              <div className="space-y-3 pt-3 border-t border-[#23262E]">
                <div className="text-[11px] font-medium text-[#8E95A5]">RGB Channels</div>
                {renderSlider('redChannel', 'Red Channel', -50, 50, { signed: true })}
                {renderSlider('greenChannel', 'Green Channel', -50, 50, { signed: true })}
                {renderSlider('blueChannel', 'Blue Channel', -50, 50, { signed: true })}
              </div>

              <div className="space-y-3 pt-3 border-t border-[#23262E]">
                <div className="text-[11px] font-medium text-[#8E95A5]">Tone Curves</div>
                <ToneCurvePreview
                  lift={enhancements.curveLift}
                  gamma={enhancements.curveGamma}
                  gain={enhancements.curveGain}
                />
                {renderSlider('curveLift', 'Curve Lift (Shadows)', -50, 50, { signed: true })}
                {renderSlider('curveGamma', 'Curve Gamma (Midtones)', -50, 50, { signed: true })}
                {renderSlider('curveGain', 'Curve Gain (Highlights)', -50, 50, { signed: true })}
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[#23262E]">
                <div className="text-[11px] font-medium text-[#8E95A5]">
                  Local 3D LUT (.cube)
                </div>
                <select
                  value={enhancements.lutId}
                  onChange={(e) =>
                    updateEnhancement('lutId', e.target.value as EnhancementLutId)
                  }
                  aria-label="Select 3D LUT"
                  className="w-full px-2.5 py-1.5 rounded bg-[#181A20] border border-[#2C313D] text-[12px] text-[#E6E8EC]"
                >
                  {ENHANCEMENT_LUTS.map((lut) => (
                    <option key={lut.id} value={lut.id}>
                      {lut.name} ({lut.cubeFileRef})
                    </option>
                  ))}
                </select>
                {renderSlider('lutIntensity', 'LUT Blend Intensity', 0, 100, {
                  unit: '%',
                  disabled: enhancements.lutId === 'none',
                })}
              </div>
            </div>
          )}

          {/* 3. Detail */}
          {activeCategory === 'detail' && (
            <div className="space-y-3">
              {renderSlider('sharpness', 'Sharpness', 0, 100)}
              {renderSlider('clarity', 'Clarity (Midtone Contrast)', -50, 50, { signed: true })}
              {renderSlider('texture', 'Texture', -50, 50, { signed: true })}
              {renderSlider('deblocking', 'Compression Deblocking', 0, 100, {
                helperText: 'H.264/HEVC block repair',
              })}
              {renderSlider('detailRecovery', 'Detail Recovery', 0, 100)}
            </div>
          )}

          {/* 4. Noise */}
          {activeCategory === 'noise' && (
            <div className="space-y-3">
              {renderSlider('lumaNoiseReduction', 'Luma Noise Reduction', 0, 100)}
              {renderSlider('chromaNoiseReduction', 'Chroma Noise Reduction', 0, 100)}
              {renderSlider('temporalDenoising', 'Temporal Denoising', 0, 100, {
                helperText: 'Multi-frame motion-compensated',
              })}
              {renderSlider('noiseReduction', 'Master Denoise Blend', 0, 100)}
              <div className="pt-2 border-t border-[#23262E]">
                {renderSlider('grain', 'De-banding / Fine Grain', 0, 100, {
                  helperText: 'Masks 8-bit sky banding',
                })}
              </div>
            </div>
          )}

          {/* 5. Portrait */}
          {activeCategory === 'portrait' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-3 p-3 rounded bg-[#181A20] border border-[#262A34]">
                <div>
                  <div className="text-[12px] font-medium text-[#E6E8EC]">
                    Optional Skin Smoothing
                  </div>
                  <div className="text-[11px] text-[#8E95A5]">
                    Preserves pores & eyes via local face mask when enabled
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enhancements.portraitSmoothingEnabled}
                  onClick={() =>
                    updateEnhancement(
                      'portraitSmoothingEnabled',
                      !enhancements.portraitSmoothingEnabled
                    )
                  }
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    enhancements.portraitSmoothingEnabled
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-[#232732] text-[#9BA2B0] hover:text-white'
                  }`}
                >
                  {enhancements.portraitSmoothingEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {renderSlider('smoothing', 'Skin Smoothing Strength', 0, 100, {
                disabled: !enhancements.portraitSmoothingEnabled,
              })}
              {renderSlider('faceAwareAdjustments', 'Face-Aware Exposure & Fill', 0, 100)}
              {renderSlider('skinTonePreservation', 'Natural Skin Tone Preservation', 0, 100, {
                unit: '%',
              })}
            </div>
          )}

          {/* 6. Motion */}
          {activeCategory === 'motion' && (
            <div className="space-y-3.5">
              {renderSlider('stabilization', 'Video Stabilization (vidstab)', 0, 100, {
                unit: '%',
              })}
              {renderSlider('motionBlur', 'Motion Blur Synthesis', 0, 100, { unit: '%' })}
              {renderSlider('opticalFlow', 'Optical Flow Frame Interpolation', 0, 100, {
                unit: '%',
                helperText: 'OpenCV DIS flow',
              })}

              <div className="pt-2 border-t border-[#23262E] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#8E95A5]">
                  <span>Slow Motion Rate (Live Preview)</span>
                  <div className="flex items-center gap-1">
                    {[0.25, 0.5, 0.75, 1].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => updateEnhancement('slowMotionRate', rate)}
                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] tabular-nums ${
                          Math.abs(enhancements.slowMotionRate - rate) < 0.01
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#1D2028] text-[#9BA2B0] hover:text-white'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
                {renderSlider('slowMotionRate', 'Playback Speed', 0.25, 1, {
                  step: 0.05,
                  unit: 'x',
                })}
              </div>

              {renderSlider('speedRampIntensity', 'Dynamic Speed Ramps', 0, 100, {
                unit: '%',
              })}
            </div>
          )}

          {/* 7. Camera Simulation */}
          {activeCategory === 'camera-sim' && (
            <div className="space-y-3.5">
              <div className="p-2.5 rounded bg-[#1B1712] border border-[#453218] text-[11px] text-[#E5C07B] leading-relaxed">
                Stylistic Camera Simulation intentionally models sensor limits, tone curves,
                and compression artifacts. Keep set to{' '}
                <strong className="font-semibold text-[#FDE68A]">Native Source</strong> for
                pure footage restoration.
              </div>

              {renderSlider(
                'cameraSimulationIntensity',
                'Simulation Blend Intensity',
                0,
                100,
                {
                  unit: '%',
                  disabled: enhancements.cameraSimulation === 'none',
                }
              )}

              <div className="space-y-1.5">
                {CAMERA_SIMULATION_PROFILES.map((profile) => {
                  const selected = enhancements.cameraSimulation === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => updateEnhancement('cameraSimulation', profile.id)}
                      className={`w-full text-left p-2.5 rounded border transition-colors ${
                        selected
                          ? 'bg-[#241E14] border-[#D97706]'
                          : 'bg-[#181A20] border-[#252932] hover:border-[#3A4152]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-[#F3F4F6]">
                          {profile.name}
                        </span>
                        {selected && <Check className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />}
                      </div>
                      <div className="text-[10px] text-[#9BA2B0] mt-0.5">
                        {profile.sensorClass}
                      </div>
                      <p className="text-[11px] text-[#8E95A5] mt-1 leading-snug">
                        {profile.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 8. Advanced Stylistic & Optical FX */}
          {activeCategory === 'advanced' && (
            <div className="space-y-3">
              {renderSlider('vignette', 'Optical Vignette', 0, 100)}
              {renderSlider('lensDistortion', 'Lens Distortion (Barrel / Pincushion)', -50, 50, {
                signed: true,
              })}
              {renderSlider('chromaticAberration', 'Chromatic Aberration', 0, 100)}
              {renderSlider('filmGrain', 'Organic Film Grain', 0, 100)}
              {renderSlider('cinematicEffects', 'Cinematic Halation & Bloom', 0, 100)}

              <div className="pt-3 border-t border-[#23262E] space-y-3">
                <div className="text-[11px] font-medium text-[#8E95A5]">
                  Optical Framing & Horizon Correction
                </div>
                {renderSlider('zoom', 'Zoom', 100, 200, { unit: '%' })}
                {renderSlider('cropPercent', 'Crop Inset', 0, 35, { unit: '%' })}
                {renderSlider('rotationDeg', 'Horizon Rotation', -15, 15, {
                  unit: '°',
                  signed: true,
                })}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
