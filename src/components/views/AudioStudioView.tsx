import React from 'react';
import { useStudioStore } from '../../store/useStudioStore';

const WAVEFORM_BARS = [
  18, 32, 46, 28, 62, 74, 58, 35, 22, 16, 12, 44, 68, 82, 71, 48, 39, 54, 66, 42, 24, 15, 11, 14,
  49, 77, 88, 64, 52, 38, 61, 73, 45, 29, 19, 36, 55, 69, 43, 27, 18, 12, 41, 63, 79, 58, 34, 21,
];

export const AudioStudioView: React.FC = () => {
  const audio = useStudioStore((s) => s.audio);
  const updateAudioState = useStudioStore((s) => s.updateAudioState);
  const toggleAudioTrackFlag = useStudioStore((s) => s.toggleAudioTrackFlag);
  const updateAudioTrackVolume = useStudioStore((s) => s.updateAudioTrackVolume);

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#23262E]">
        <div>
          <h1 className="text-[20px] font-semibold text-[#F3F4F6]">Audio Studio</h1>
          <p className="text-[13px] text-[#8E95A5]">
            Multi-track mixing, voice restoration, dynamics, loudness normalization, and automated ducking (DSP preview state).
          </p>
        </div>
        <div className="text-[12px] font-mono text-[#9BA2B0] tabular-nums">
          Master Target: {audio.targetLufs} LUFS · Limiter {audio.limiterCeilingDb.toFixed(1)} dBTP
        </div>
      </div>

      {/* Waveform Preview */}
      <section className="rounded-md bg-[#16181D] border border-[#252832] p-4 space-y-3">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-semibold text-[#E6E8EC]">Master Dialogue & Score Waveform (Sample Envelope)</span>
          <span className="font-mono text-[#7A8190]">48.0 kHz · 24-bit PCM</span>
        </div>
        <div className="h-28 bg-[#0E1014] border border-[#21242D] rounded px-3 flex items-center gap-1 overflow-hidden">
          {WAVEFORM_BARS.map((height, idx) => {
            const isSilenceRegion = height < 20 && audio.silenceDetectionEnabled;
            return (
              <div
                key={idx}
                className="flex-1 flex items-center justify-center h-full"
              >
                <div
                  className={`w-full rounded-xs transition-all ${
                    isSilenceRegion ? 'bg-[#D97706]/70' : 'bg-[#3B82F6]/80'
                  }`}
                  style={{ height: `${Math.min(95, Math.max(8, height + audio.voiceEnhancement * 0.2))}%` }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Processing Modules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Restoration & Dynamics */}
        <div className="rounded-md bg-[#16181D] border border-[#252832] p-4 space-y-4">
          <h2 className="text-[14px] font-semibold text-[#F3F4F6]">Restoration & Dynamics</h2>

          {[
            { label: 'Noise Reduction', val: audio.noiseReduction, min: 0, max: 100, unit: '%', key: 'noiseReduction' as const },
            { label: 'Voice Enhancement', val: audio.voiceEnhancement, min: 0, max: 100, unit: '%', key: 'voiceEnhancement' as const },
            { label: 'Compressor Threshold', val: audio.compressorThresholdDb, min: -40, max: 0, unit: ' dB', key: 'compressorThresholdDb' as const },
            { label: 'Limiter Ceiling', val: audio.limiterCeilingDb, min: -6, max: 0, unit: ' dB', key: 'limiterCeilingDb' as const },
          ].map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex justify-between text-[12px]">
                <span className="text-[#C8CDD8]">{item.label}</span>
                <span className="font-mono text-[#9BA2B0] tabular-nums">
                  {item.val}
                  {item.unit}
                </span>
              </div>
              <input
                type="range"
                min={item.min}
                max={item.max}
                step={item.key === 'limiterCeilingDb' ? 0.5 : 1}
                value={item.val}
                onChange={(e) => updateAudioState({ [item.key]: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </div>
          ))}
        </div>

        {/* Column 2: 5-Band Parametric Equalizer */}
        <div className="rounded-md bg-[#16181D] border border-[#252832] p-4 space-y-4">
          <h2 className="text-[14px] font-semibold text-[#F3F4F6]">5-Band Equalizer</h2>
          <div className="grid grid-cols-5 gap-3 pt-2">
            {[
              { label: '80Hz', key: 'eqLowDb' as const, val: audio.eqLowDb },
              { label: '250Hz', key: 'eqLowMidDb' as const, val: audio.eqLowMidDb },
              { label: '1kHz', key: 'eqMidDb' as const, val: audio.eqMidDb },
              { label: '4kHz', key: 'eqHighMidDb' as const, val: audio.eqHighMidDb },
              { label: '12kHz', key: 'eqHighDb' as const, val: audio.eqHighDb },
            ].map((band) => (
              <div key={band.key} className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-mono text-[#9BA2B0] tabular-nums">
                  {band.val > 0 ? `+${band.val}` : band.val}dB
                </span>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={band.val}
                  onChange={(e) => updateAudioState({ [band.key]: Number(e.target.value) })}
                  className="studio-slider w-full"
                />
                <span className="text-[11px] font-mono text-[#7A8190]">{band.label}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#23262E] space-y-2.5 text-[12px]">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[#D1D5DB]">Volume Normalization ({audio.targetLufs} LUFS)</span>
              <input
                type="checkbox"
                checked={audio.normalizationEnabled}
                onChange={(e) => updateAudioState({ normalizationEnabled: e.target.checked })}
                className="accent-[#3B82F6]"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[#D1D5DB]">Silence Detection ({audio.silenceThresholdDb} dB)</span>
              <input
                type="checkbox"
                checked={audio.silenceDetectionEnabled}
                onChange={(e) => updateAudioState({ silenceDetectionEnabled: e.target.checked })}
                className="accent-[#3B82F6]"
              />
            </label>
          </div>
        </div>

        {/* Column 3: Fades, Ducking & Multi-Track Mixer */}
        <div className="rounded-md bg-[#16181D] border border-[#252832] p-4 space-y-4">
          <h2 className="text-[14px] font-semibold text-[#F3F4F6]">Fades, Ducking & Mixer</h2>

          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <label className="block text-[11px] text-[#8E95A5] mb-1">Fade In (sec)</label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={10}
                value={audio.fadeInSec}
                onChange={(e) => updateAudioState({ fadeInSec: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#8E95A5] mb-1">Fade Out (sec)</label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={10}
                value={audio.fadeOutSec}
                onChange={(e) => updateAudioState({ fadeOutSec: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[12px]">
              <span className="text-[#C8CDD8]">Music Ducking Under Dialogue</span>
              <span className="font-mono text-[#9BA2B0] tabular-nums">{audio.musicDuckingDb} dB</span>
            </div>
            <input
              type="range"
              min={-24}
              max={0}
              step={1}
              value={audio.musicDuckingDb}
              onChange={(e) => updateAudioState({ musicDuckingDb: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-[#23262E]">
            {audio.tracks.map((track) => (
              <div
                key={track.id}
                className="p-2.5 rounded bg-[#121418] border border-[#22252E] space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="font-medium text-[#E6E8EC] truncate">{track.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleAudioTrackFlag(track.id, 'muted')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        track.muted
                          ? 'bg-[#7F1D1D] border-[#EF4444] text-white'
                          : 'bg-[#1B1E25] border-[#2C303A] text-[#9BA2B0]'
                      }`}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAudioTrackFlag(track.id, 'solo')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        track.solo
                          ? 'bg-[#92400E] border-[#F59E0B] text-white'
                          : 'bg-[#1B1E25] border-[#2C303A] text-[#9BA2B0]'
                      }`}
                    >
                      S
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-48}
                    max={6}
                    step={1}
                    value={track.volumeDb}
                    onChange={(e) => updateAudioTrackVolume(track.id, Number(e.target.value))}
                    className="studio-slider flex-1"
                  />
                  <span className="text-[11px] font-mono text-[#9BA2B0] w-12 text-right tabular-nums">
                    {track.volumeDb} dB
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
