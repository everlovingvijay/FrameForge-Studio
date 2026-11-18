import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Film, HardDriveDownload } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { ContainerFormat, VideoCodec, HardwareEncoderId } from '../../types/studio';
import { formatDurationCompact, resolutionToDimensions } from '../../utils/formatters';

const CODECS: VideoCodec[] = ['H.264', 'H.265', 'AV1'];
const CONTAINERS: ContainerFormat[] = ['MP4', 'MOV', 'MKV', 'WebM'];

export const AutoExportPanel: React.FC = () => {
  const autoConfig = useStudioStore((s) => s.autoConfig);
  const autoPlanPreview = useStudioStore((s) => s.autoPlanPreview);
  const mediaPool = useStudioStore((s) => s.mediaPool);
  const hardware = useStudioStore((s) => s.hardware);

  const updateAutoConfig = useStudioStore((s) => s.updateAutoConfig);
  const queueAutoPlanExport = useStudioStore((s) => s.queueAutoPlanExport);
  const sendAutoPlanToTimeline = useStudioStore((s) => s.sendAutoPlanToTimeline);
  const setActiveSection = useStudioStore((s) => s.setActiveSection);

  const [queuedNotice, setQueuedNotice] = useState(false);

  const selected = mediaPool.filter((m) => autoConfig.selectedMediaIds.includes(m.id));
  const primaryVisual = selected.find((m) => m.kind !== 'audio') ?? selected[0];
  const dims = resolutionToDimensions(
    autoConfig.resolution,
    autoConfig.aspectRatio,
    autoConfig.customWidth,
    autoConfig.customHeight,
    primaryVisual?.width ?? 1920,
    primaryVisual?.height ?? 1080
  );

  const estDuration =
    autoPlanPreview?.estimatedOutputDurationSec ?? autoConfig.targetDurationSeconds;
  const exp = autoConfig.exportConfig;
  const estSizeMb = Math.max(8, Math.round((exp.bitrateMbps * estDuration) / 8));

  const updateExportField = (partial: Partial<typeof exp>) => {
    setQueuedNotice(false);
    updateAutoConfig({
      exportConfig: { ...exp, ...partial },
    });
  };

  const handleQueueExport = (e: React.FormEvent) => {
    e.preventDefault();
    queueAutoPlanExport();
    setQueuedNotice(true);
  };

  return (
    <form onSubmit={handleQueueExport} className="space-y-4 text-[12px]">
      <div className="p-3.5 rounded bg-[#121418] border border-[#242730] grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-[10px] text-[#7A8190]">Delivery Canvas</div>
          <div className="font-mono font-medium text-[#F3F4F6] tabular-nums mt-0.5">
            {dims.width}×{dims.height} ({autoConfig.resolution})
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#7A8190]">Aspect & Rate</div>
          <div className="font-mono font-medium text-[#F3F4F6] tabular-nums mt-0.5">
            {autoConfig.aspectRatio} · {autoConfig.frameRate} fps
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#7A8190]">Est. Duration</div>
          <div className="font-mono font-medium text-[#F3F4F6] tabular-nums mt-0.5">
            {formatDurationCompact(estDuration)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#7A8190]">Est. File Size</div>
          <div className="font-mono font-medium text-[#F3F4F6] tabular-nums mt-0.5">
            ~{estSizeMb} MB
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] text-[#9BA2B0] mb-1">Output Filename</label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              required
              value={exp.outputFileName}
              onChange={(e) => updateExportField({ outputFileName: e.target.value })}
              className="flex-1 px-2.5 py-1.5 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC] focus:outline-none focus:border-[#3B82F6]"
            />
            <span className="px-2 py-1.5 rounded bg-[#121418] border border-[#252832] font-mono text-[#9BA2B0]">
              .{exp.container.toLowerCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-[#9BA2B0] mb-1">Codec</label>
            <select
              value={exp.codec}
              onChange={(e) => updateExportField({ codec: e.target.value as VideoCodec })}
              className="w-full px-2.5 py-1.5 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC]"
            >
              {CODECS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[#9BA2B0] mb-1">Container</label>
            <select
              value={exp.container}
              onChange={(e) => updateExportField({ container: e.target.value as ContainerFormat })}
              className="w-full px-2.5 py-1.5 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC]"
            >
              {CONTAINERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] text-[#9BA2B0] mb-1">Encoding Tier</label>
          <select
            value={exp.qualityPreset}
            onChange={(e) =>
              updateExportField({
                qualityPreset: e.target.value as 'Draft' | 'Balanced' | 'High' | 'Master',
              })
            }
            className="w-full px-2.5 py-1.5 rounded bg-[#111216] border border-[#282B34] text-[#E6E8EC]"
          >
            <option value="Draft">Draft (Fast Review)</option>
            <option value="Balanced">Balanced</option>
            <option value="High">High (Recommended)</option>
            <option value="Master">Master (Archival)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-[#9BA2B0] mb-1">Compute Path</label>
          <select
            value={exp.computePreference}
            onChange={(e) =>
              updateExportField({
                computePreference: e.target.value as 'gpu-preferred' | 'cpu-only',
              })
            }
            className="w-full px-2.5 py-1.5 rounded bg-[#111216] border border-[#282B34] text-[#E6E8EC]"
          >
            <option value="gpu-preferred">Hardware GPU Preferred</option>
            <option value="cpu-only">CPU Software Fallback</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-[#9BA2B0] mb-1">Local Encoder</label>
          <select
            value={exp.computePreference === 'cpu-only' ? 'cpu-fallback' : exp.encoder}
            disabled={exp.computePreference === 'cpu-only'}
            onChange={(e) => updateExportField({ encoder: e.target.value as HardwareEncoderId })}
            className="w-full px-2.5 py-1.5 rounded bg-[#111216] border border-[#282B34] text-[#E6E8EC] disabled:opacity-50"
          >
            {hardware.availableEncoders.map((enc) => (
              <option key={enc.id} value={enc.id} disabled={!enc.available}>
                {enc.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-[#9BA2B0]">Target Video Bitrate</span>
          <span className="font-mono text-[#E6E8EC] tabular-nums">{exp.bitrateMbps} Mbps</span>
        </div>
        <input
          type="range"
          min={6}
          max={180}
          step={2}
          value={exp.bitrateMbps}
          onChange={(e) => updateExportField({ bitrateMbps: Number(e.target.value) })}
          className="studio-slider w-full"
        />
      </div>

      {queuedNotice && (
        <div className="p-3 rounded bg-[#12221D] border border-[#285E4B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#6EE7B7]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Export job queued in Render Queue ({exp.outputFileName}.{exp.container.toLowerCase()}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSection('export')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1B352D] hover:bg-[#23473C] text-[#A7F3D0] text-[11px] font-medium shrink-0"
          >
            <span>Open Export Center</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="pt-2 border-t border-[#23262E] flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={sendAutoPlanToTimeline}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#20232B] hover:bg-[#2A2E3A] text-[#E6E8EC] border border-[#2F3440] font-medium transition-colors"
        >
          <Film className="w-3.5 h-3.5" />
          <span>Open Edit in Pro Editor</span>
        </button>

        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white font-medium transition-colors"
        >
          <HardDriveDownload className="w-3.5 h-3.5" />
          <span>Queue Local Export Job</span>
        </button>
      </div>

      <p className="text-[11px] text-[#7A8190]">
        Exports are queued for local FFmpeg hardware execution via the Rust backend — no cloud rendering or fake file output.
      </p>
    </form>
  );
};
