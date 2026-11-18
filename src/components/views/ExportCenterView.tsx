import React, { useState } from 'react';
import { Plus, RotateCw, Trash2, XCircle } from 'lucide-react';
import { buildExportJobInput } from '../../services/projectService';
import { useStudioStore } from '../../store/useStudioStore';
import {
  ContainerFormat,
  FrameRateOption,
  HardwareEncoderId,
  OrientationPreset,
  ResolutionPreset,
  VideoCodec,
} from '../../types/studio';

const RES_OPTIONS: ResolutionPreset[] = ['720p', '1080p', '2K', '4K', '8K', 'custom'];
const ORIENTATIONS: OrientationPreset[] = ['landscape', 'portrait', 'square', 'custom'];
const CODECS: VideoCodec[] = ['H.264', 'H.265', 'AV1'];
const CONTAINERS: ContainerFormat[] = ['MP4', 'MOV', 'MKV', 'WebM'];
const FPS_OPTIONS: FrameRateOption[] = [23.976, 24, 25, 29.97, 30, 50, 60, 120];

export const ExportCenterView: React.FC = () => {
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const hardware = useStudioStore((s) => s.hardware);
  const exportQueue = useStudioStore((s) => s.exportQueue);
  const addExportJob = useStudioStore((s) => s.addExportJob);
  const cancelExportJob = useStudioStore((s) => s.cancelExportJob);
  const retryExportJob = useStudioStore((s) => s.retryExportJob);
  const removeExportJob = useStudioStore((s) => s.removeExportJob);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  const [outputName, setOutputName] = useState(
    `${(activeProject?.name ?? 'FrameForge_Export').replace(/\s+/g, '_')}_Master`
  );
  const [resolution, setResolution] = useState<ResolutionPreset>('4K');
  const [customWidth, setCustomWidth] = useState(3840);
  const [customHeight, setCustomHeight] = useState(2160);
  const [orientation, setOrientation] = useState<OrientationPreset>('landscape');
  const [codec, setCodec] = useState<VideoCodec>('H.265');
  const [container, setContainer] = useState<ContainerFormat>('MP4');
  const [fps, setFps] = useState<FrameRateOption>(activeProject?.fps ?? 24);
  const [qualityPreset, setQualityPreset] = useState<'Draft' | 'Balanced' | 'High' | 'Master'>('High');
  const [bitrateMbps, setBitrateMbps] = useState(45);
  const [encoder, setEncoder] = useState<HardwareEncoderId>(hardware.activeEncoderId);
  const [computePreference, setComputePreference] = useState<'gpu-preferred' | 'cpu-only'>('gpu-preferred');

  const handleQueueExport = (e: React.FormEvent) => {
    e.preventDefault();
    addExportJob(
      buildExportJobInput({
        projectName: activeProject?.name ?? 'Untitled Project',
        outputBaseName: outputName,
        resolution,
        customWidth,
        customHeight,
        orientation,
        codec,
        container,
        fps,
        bitrateMbps,
        qualityPreset,
        encoder,
        computePreference,
        durationSeconds: activeProject?.durationSeconds || 60,
      })
    );
  };

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-6">
      <div className="pb-4 border-b border-[#23262E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-[#F3F4F6]">Export Center</h1>
          <p className="text-[13px] text-[#8E95A5]">
            Configure local FFmpeg encoding presets and render queue. Native encoding activates when linked to the Rust backend.
          </p>
        </div>
        <div className="text-[12px] font-mono text-[#9BA2B0]">
          Active Project: {activeProject?.name ?? 'None'}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Export Configurator */}
        <form
          onSubmit={handleQueueExport}
          className="xl:col-span-5 rounded-md bg-[#16181D] border border-[#252832] p-5 space-y-4 text-[12px]"
        >
          <h2 className="text-[14px] font-semibold text-[#F3F4F6]">Delivery Settings</h2>

          <div>
            <label className="block text-[#9BA2B0] mb-1">Output Filename</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="flex-1 px-3 py-2 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC] focus:outline-none focus:border-[#3B82F6]"
              />
              <span className="px-2.5 py-2 rounded bg-[#121418] border border-[#252832] font-mono text-[#9BA2B0]">
                .{container.toLowerCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9BA2B0] mb-1">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as ResolutionPreset)}
                className="w-full px-2.5 py-2 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC]"
              >
                {RES_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#9BA2B0] mb-1">Orientation / Aspect</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as OrientationPreset)}
                className="w-full px-2.5 py-2 rounded bg-[#111216] border border-[#282B34] text-[#E6E8EC]"
              >
                {ORIENTATIONS.map((o) => (
                  <option key={o} value={o}>
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(resolution === 'custom' || orientation === 'custom') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#9BA2B0] mb-1">Custom Width (px)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC]"
                />
              </div>
              <div>
                <label className="block text-[#9BA2B0] mb-1">Custom Height (px)</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC]"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[#9BA2B0] mb-1">Codec</label>
              <select
                value={codec}
                onChange={(e) => setCodec(e.target.value as VideoCodec)}
                className="w-full px-2.5 py-2 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC]"
              >
                {CODECS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#9BA2B0] mb-1">Container</label>
              <select
                value={container}
                onChange={(e) => setContainer(e.target.value as ContainerFormat)}
                className="w-full px-2.5 py-2 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC]"
              >
                {CONTAINERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#9BA2B0] mb-1">Frame Rate</label>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value) as FrameRateOption)}
                className="w-full px-2.5 py-2 rounded bg-[#111216] border border-[#282B34] font-mono text-[#E6E8EC]"
              >
                {FPS_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9BA2B0] mb-1">Quality Tier</label>
              <select
                value={qualityPreset}
                onChange={(e) =>
                  setQualityPreset(e.target.value as 'Draft' | 'Balanced' | 'High' | 'Master')
                }
                className="w-full px-2.5 py-2 rounded bg-[#111216] border border-[#282B34] text-[#E6E8EC]"
              >
                <option value="Draft">Draft (Fast Review)</option>
                <option value="Balanced">Balanced</option>
                <option value="High">High (Recommended)</option>
                <option value="Master">Master (Archival)</option>
              </select>
            </div>
            <div>
              <label className="block text-[#9BA2B0] mb-1">Compute Preference</label>
              <select
                value={computePreference}
                onChange={(e) =>
                  setComputePreference(e.target.value as 'gpu-preferred' | 'cpu-only')
                }
                className="w-full px-2.5 py-2 rounded bg-[#111216] border border-[#282B34] text-[#E6E8EC]"
              >
                <option value="gpu-preferred">GPU Acceleration Preferred</option>
                <option value="cpu-only">CPU Software Fallback</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#9BA2B0] mb-1">Hardware / Software Encoder</label>
            <select
              value={computePreference === 'cpu-only' ? 'cpu-fallback' : encoder}
              disabled={computePreference === 'cpu-only'}
              onChange={(e) => setEncoder(e.target.value as HardwareEncoderId)}
              className="w-full px-2.5 py-2 rounded bg-[#111216] border border-[#282B34] text-[#E6E8EC] disabled:opacity-50"
            >
              {hardware.availableEncoders.map((enc) => (
                <option key={enc.id} value={enc.id} disabled={!enc.available}>
                  {enc.label} {enc.available ? '' : '(Unavailable on profile)'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[#9BA2B0]">Target Video Bitrate</span>
              <span className="font-mono text-[#E6E8EC] tabular-nums">{bitrateMbps} Mbps</span>
            </div>
            <input
              type="range"
              min={4}
              max={180}
              step={2}
              value={bitrateMbps}
              onChange={(e) => setBitrateMbps(Number(e.target.value))}
              className="studio-slider w-full"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded text-[12px] font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Job to Render Queue</span>
          </button>
        </form>

        {/* Render Queue */}
        <section className="xl:col-span-7 rounded-md bg-[#16181D] border border-[#252832] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[#F3F4F6]">
              Render Queue ({exportQueue.length})
            </h2>
            <span className="text-[11px] text-[#7A8190]">
              Jobs remain queued until native FFmpeg worker connects
            </span>
          </div>

          <div className="space-y-2.5">
            {exportQueue.map((job) => (
              <div
                key={job.id}
                className="p-3.5 rounded bg-[#121418] border border-[#242730] space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-mono font-medium text-[#F3F4F6]">
                      {job.outputName}
                    </div>
                    <div className="text-[11px] text-[#8E95A5]">
                      {job.projectName} · {job.resolution} ({job.orientation}) · {job.codec}/{job.container} · {job.fps}fps · {job.bitrateMbps} Mbps
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-medium ${
                        job.status === 'cancelled'
                          ? 'text-[#F59E0B]'
                          : job.status === 'failed'
                          ? 'text-[#EF4444]'
                          : 'text-[#5B9BFF]'
                      }`}
                    >
                      {job.status === 'simulated-ready'
                        ? 'Queued (Awaiting Native Engine)'
                        : job.status === 'cancelled'
                        ? 'Cancelled'
                        : job.status}
                    </span>

                    {job.status !== 'cancelled' ? (
                      <button
                        type="button"
                        onClick={() => cancelExportJob(job.id)}
                        className="p-1 rounded text-[#8E95A5] hover:text-[#F59E0B]"
                        title="Cancel job"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => retryExportJob(job.id)}
                        className="p-1 rounded text-[#8E95A5] hover:text-[#5B9BFF]"
                        title="Retry job"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeExportJob(job.id)}
                      className="p-1 rounded text-[#8E95A5] hover:text-[#EF4444]"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded bg-[#1C1F26] overflow-hidden">
                  <div
                    className="h-full bg-[#3B82F6]"
                    style={{ width: `${job.progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-[#7A8190] tabular-nums">
                  <span>Encoder: {job.encoder}</span>
                  <span>Est. Output: ~{job.estimatedSizeMb} MB</span>
                </div>
              </div>
            ))}
            {exportQueue.length === 0 && (
              <div className="py-10 text-center text-[13px] text-[#7A8190]">
                No queued render jobs. Configure a target on the left to add one.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
