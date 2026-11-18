import React, { useState } from 'react';
import { Check, Cpu, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { AUTO_PRESETS } from '../../config/autoPresets';
import { useStudioStore } from '../../store/useStudioStore';
import { HostPlatform } from '../../types/studio';
import { formatDurationCompact } from '../../utils/formatters';

export const PresetLibraryView: React.FC = () => {
  const applyAutoPreset = useStudioStore((s) => s.applyAutoPreset);
  const setActiveSection = useStudioStore((s) => s.setActiveSection);
  const activePresetId = useStudioStore((s) => s.autoConfig.presetId);
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Narrative' | 'Creator' | 'Commercial' | 'Restoration'>('All');

  const filtered = AUTO_PRESETS.filter(
    (p) => categoryFilter === 'All' || p.category === categoryFilter
  );

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#23262E]">
        <div>
          <h1 className="text-[20px] font-semibold text-[#F3F4F6]">Preset Library</h1>
          <p className="text-[13px] text-[#8E95A5]">
            Offline editing, color-curve, pacing, and loudness blueprints for Auto Studio.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded bg-[#16181D] border border-[#252832]">
          {(['All', 'Narrative', 'Creator', 'Commercial', 'Restoration'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#9BA2B0] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((preset) => {
          const isActive = preset.id === activePresetId;
          return (
            <div
              key={preset.id}
              className={`rounded-md bg-[#16181D] border p-4 flex flex-col justify-between space-y-4 ${
                isActive ? 'border-[#3B82F6]/70' : 'border-[#252832]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-[#F3F4F6]">{preset.name}</h2>
                  <span className="text-[11px] text-[#7A8190]">{preset.category}</span>
                </div>
                <p className="text-[12px] text-[#9BA2B0] leading-relaxed">{preset.summary}</p>
                <dl className="pt-2 space-y-1 text-[11px] font-mono text-[#8E95A5]">
                  <div className="flex justify-between">
                    <dt>Cadence</dt>
                    <dd className="text-[#C8CDD8]">{preset.cutCadence}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Color</dt>
                    <dd className="text-[#C8CDD8]">{preset.colorProfile}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Default Canvas</dt>
                    <dd className="text-[#C8CDD8]">
                      {preset.defaultAspectRatio} · {preset.defaultFps}fps · {preset.audioTargetLufs} LUFS
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                type="button"
                onClick={() => {
                  applyAutoPreset(preset.id);
                  setActiveSection('auto-studio');
                }}
                className="w-full py-2 rounded text-[12px] font-medium bg-[#1F232C] hover:bg-[#2563EB] text-[#E6E8EC] hover:text-white border border-[#2F3442] transition-colors"
              >
                Use in Auto Studio
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ProjectManagerView: React.FC = () => {
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const selectProject = useStudioStore((s) => s.selectProject);
  const deleteProject = useStudioStore((s) => s.deleteProject);
  const openNewProjectModal = useStudioStore((s) => s.openNewProjectModal);

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-[#23262E]">
        <div>
          <h1 className="text-[20px] font-semibold text-[#F3F4F6]">Project Manager</h1>
          <p className="text-[13px] text-[#8E95A5]">
            Portable `.ffproj` project index backed by local SQLite catalog (simulated in browser preview).
          </p>
        </div>
        <button
          type="button"
          onClick={() => openNewProjectModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded text-[12px] font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      <div className="rounded-md bg-[#16181D] border border-[#252832] overflow-x-auto">
        <table className="w-full text-left border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-[#252832] text-[#7A8190]">
              <th className="py-2.5 px-4">Project</th>
              <th className="py-2.5 px-4">Portable File Path</th>
              <th className="py-2.5 px-4">Format</th>
              <th className="py-2.5 px-4 text-right">Duration</th>
              <th className="py-2.5 px-4 text-right">Disk Size</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#22252E]">
            {projects.map((p) => {
              const isCurrent = p.id === activeProjectId;
              return (
                <tr key={p.id} className="hover:bg-[#1B1E25]">
                  <td className="py-3 px-4 font-semibold text-[#F3F4F6]">
                    {p.name}
                    {isCurrent && <span className="ml-2 text-[11px] font-normal text-[#5B9BFF]">Active</span>}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#8E95A5]">{p.filePath}</td>
                  <td className="py-3 px-4 font-mono text-[#9BA2B0]">
                    {p.resolutionWidth}x{p.resolutionHeight} · {p.fps}fps · {p.colorSpace}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#C8CDD8]">
                    {formatDurationCompact(p.durationSeconds)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#C8CDD8]">
                    {p.diskSizeMb} MB
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectProject(p.id, true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#20232B] hover:bg-[#2A2F3A] text-[#E6E8EC]"
                      >
                        <FolderOpen className="w-3 h-3" />
                        <span>Open</span>
                      </button>
                      <button
                        type="button"
                        disabled={projects.length <= 1}
                        onClick={() => deleteProject(p.id)}
                        className="p-1.5 rounded text-[#7A8190] hover:text-[#EF4444] disabled:opacity-30"
                        title="Remove project from list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const HardwareSettingsView: React.FC = () => {
  const hardware = useStudioStore((s) => s.hardware);
  const switchSimulatedPlatform = useStudioStore((s) => s.switchSimulatedPlatform);
  const setActiveHardwareEncoder = useStudioStore((s) => s.setActiveHardwareEncoder);

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#23262E]">
        <div>
          <h1 className="text-[20px] font-semibold text-[#F3F4F6]">Hardware Acceleration Settings</h1>
          <p className="text-[13px] text-[#8E95A5]">
            Cross-platform GPU decode/encode preferences with deterministic CPU fallback. Currently displaying a simulated host profile.
          </p>
        </div>

        <select
          value={hardware.platform}
          onChange={(e) => switchSimulatedPlatform(e.target.value as HostPlatform)}
          className="px-3 py-2 rounded bg-[#16181D] border border-[#2C303A] text-[12px] text-[#E6E8EC]"
        >
          <option value="macos-apple-silicon">Simulated Host: macOS Apple Silicon</option>
          <option value="windows-nvidia">Simulated Host: Windows + NVIDIA RTX</option>
          <option value="windows-intel-amd">Simulated Host: Windows + QuickSync / AMF</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
        <div className="p-4 rounded-md bg-[#16181D] border border-[#252832] space-y-1">
          <div className="text-[#7A8190]">Compute Platform</div>
          <div className="text-[14px] font-semibold text-[#F3F4F6]">{hardware.osLabel}</div>
          <div className="text-[#9BA2B0]">{hardware.cpuModel}</div>
        </div>
        <div className="p-4 rounded-md bg-[#16181D] border border-[#252832] space-y-1">
          <div className="text-[#7A8190]">GPU & Shared/VRAM</div>
          <div className="text-[14px] font-semibold text-[#F3F4F6]">{hardware.gpuModel}</div>
          <div className="text-[#9BA2B0] font-mono tabular-nums">{hardware.vramGb} GB graphics memory</div>
        </div>
        <div className="p-4 rounded-md bg-[#16181D] border border-[#252832] space-y-1">
          <div className="text-[#7A8190]">Scratch Volume</div>
          <div className="text-[14px] font-semibold text-[#F3F4F6]">{hardware.storageVolumeName}</div>
          <div className="text-[#9BA2B0] font-mono truncate">{hardware.scratchDiskPath}</div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-[#F3F4F6]">Available Encode / Decode Backends</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {hardware.availableEncoders.map((enc) => {
            const isSelected = enc.id === hardware.activeEncoderId;
            return (
              <button
                key={enc.id}
                type="button"
                disabled={!enc.available}
                onClick={() => setActiveHardwareEncoder(enc.id)}
                className={`p-4 rounded-md border text-left transition-colors ${
                  isSelected
                    ? 'bg-[#1D2433] border-[#3B82F6]'
                    : enc.available
                    ? 'bg-[#16181D] border-[#252832] hover:border-[#3A3F4E]'
                    : 'bg-[#131519] border-[#1E2128] opacity-55 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#8E95A5]" />
                    <span className="text-[13px] font-semibold text-[#F3F4F6]">{enc.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#5B9BFF]" />}
                </div>
                <p className="text-[12px] text-[#9BA2B0] mt-1.5">{enc.notes}</p>
                <div className="mt-2.5 text-[11px] font-mono text-[#7A8190]">
                  Codecs: {enc.codecs.join(', ')} · Decode: {enc.decodeSupport ? 'Yes' : 'No'} · Encode:{' '}
                  {enc.encodeSupport ? 'Yes' : 'No'}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export const AppSettingsView: React.FC = () => {
  const appSettings = useStudioStore((s) => s.appSettings);
  const updateAppSettings = useStudioStore((s) => s.updateAppSettings);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-[#23262E]">
        <h1 className="text-[20px] font-semibold text-[#F3F4F6]">Application Settings</h1>
        <p className="text-[13px] text-[#8E95A5]">
          Local storage paths, SQLite project catalog, proxy policy, and strict offline guarantees.
        </p>
      </div>

      <div className="rounded-md bg-[#16181D] border border-[#252832] p-5 space-y-4 text-[13px]">
        <div>
          <label className="block text-[12px] text-[#9BA2B0] mb-1">Default Project Directory</label>
          <input
            type="text"
            value={appSettings.projectDirectory}
            onChange={(e) => updateAppSettings({ projectDirectory: e.target.value })}
            className="w-full px-3 py-2 rounded bg-[#111216] border border-[#282B34] font-mono text-[12px] text-[#E6E8EC]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-[#9BA2B0] mb-1">Media Cache & Scratch Disk</label>
          <input
            type="text"
            value={appSettings.scratchDirectory}
            onChange={(e) => updateAppSettings({ scratchDirectory: e.target.value })}
            className="w-full px-3 py-2 rounded bg-[#111216] border border-[#282B34] font-mono text-[12px] text-[#E6E8EC]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-[#9BA2B0] mb-1">Local SQLite Catalog Path</label>
          <input
            type="text"
            value={appSettings.sqliteCatalogPath}
            onChange={(e) => updateAppSettings({ sqliteCatalogPath: e.target.value })}
            className="w-full px-3 py-2 rounded bg-[#111216] border border-[#282B34] font-mono text-[12px] text-[#E6E8EC]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[12px] text-[#9BA2B0] mb-1">Proxy Generation Policy</label>
            <select
              value={appSettings.proxyGenerationMode}
              onChange={(e) =>
                updateAppSettings({
                  proxyGenerationMode: e.target.value as 'off' | 'above-4k' | 'always',
                })
              }
              className="w-full px-3 py-2 rounded bg-[#111216] border border-[#282B34] text-[12px] text-[#E6E8EC]"
            >
              <option value="off">Off (Original Media Only)</option>
              <option value="above-4k">Auto-Generate Above 4K</option>
              <option value="always">Always Generate ProRes Proxy</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-[#9BA2B0] mb-1">Autosave Interval (minutes)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={appSettings.autosaveIntervalMin}
              onChange={(e) => updateAppSettings({ autosaveIntervalMin: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded bg-[#111216] border border-[#282B34] font-mono text-[12px] text-[#E6E8EC]"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-[#23262E] space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-[#E6E8EC]">Zero-Cloud Offline Mode</div>
              <div className="text-[11px] text-[#7A8190]">
                Enforces local-only processing with no external APIs, cloud rendering, or subscriptions.
              </div>
            </div>
            <input
              type="checkbox"
              checked={appSettings.offlineVerificationMode}
              onChange={(e) => updateAppSettings({ offlineVerificationMode: e.target.checked })}
              className="accent-[#3B82F6] w-4 h-4"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
