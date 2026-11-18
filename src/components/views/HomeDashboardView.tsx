import React, { useState } from 'react';
import {
  ArrowUpRight,
  Cpu,
  Download,
  Film,
  FolderOpen,
  HardDrive,
  Plus,
  Search,
  Upload,
  Wand2,
} from 'lucide-react';
import { computeStorageSummary } from '../../services/projectService';
import { useStudioStore } from '../../store/useStudioStore';
import { HostPlatform } from '../../types/studio';
import { formatDurationCompact } from '../../utils/formatters';

export const HomeDashboardView: React.FC = () => {
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const mediaPool = useStudioStore((s) => s.mediaPool);
  const renderHistory = useStudioStore((s) => s.renderHistory);
  const hardware = useStudioStore((s) => s.hardware);

  const openNewProjectModal = useStudioStore((s) => s.openNewProjectModal);
  const openImportMediaModal = useStudioStore((s) => s.openImportMediaModal);
  const openProjectPickerModal = useStudioStore((s) => s.openProjectPickerModal);
  const selectProject = useStudioStore((s) => s.selectProject);
  const setActiveSection = useStudioStore((s) => s.setActiveSection);
  const switchSimulatedPlatform = useStudioStore((s) => s.switchSimulatedPlatform);

  const [projectSearch, setProjectSearch] = useState('');

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.filePath.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const { usedGb: storageUsedGb, usedPct: storageUsedPct } = computeStorageSummary(hardware);
  const activeEncoder = hardware.availableEncoders.find((e) => e.id === hardware.activeEncoderId);

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-6">
      {/* Studio Launchpad Strip */}
      <section aria-label="Studio Quick Launch">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#23262E]">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-[#F3F4F6]">
              Studio Workspace
            </h1>
            <p className="text-[13px] text-[#8E95A5] mt-0.5">
              Offline-first editing suite · {projects.length} local projects · {mediaPool.length} indexed clips
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openNewProjectModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded text-[12px] font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
            <button
              type="button"
              onClick={() => openProjectPickerModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded text-[12px] font-medium bg-[#1B1E25] hover:bg-[#232730] text-[#E6E8EC] border border-[#2C303A] transition-colors whitespace-nowrap shrink-0"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#9BA2B0]" />
              <span>Open Project</span>
            </button>
            <button
              type="button"
              onClick={() => openImportMediaModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded text-[12px] font-medium bg-[#1B1E25] hover:bg-[#232730] text-[#E6E8EC] border border-[#2C303A] transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-[#9BA2B0]" />
              <span>Import Media</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('export')}
              className="flex items-center gap-2 px-3.5 py-2 rounded text-[12px] font-medium bg-[#1B1E25] hover:bg-[#232730] text-[#E6E8EC] border border-[#2C303A] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-[#9BA2B0]" />
              <span>Quick Export</span>
            </button>
          </div>
        </div>

        {/* Two Primary Creation Entries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
          <button
            type="button"
            onClick={() => setActiveSection('auto-studio')}
            className="group text-left p-5 rounded-md bg-[#17191E] hover:bg-[#1C1F26] border border-[#272B35] hover:border-[#3B82F6]/60 transition-colors flex items-start justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#F3F4F6]">
                <Wand2 className="w-4 h-4 text-[#5B9BFF]" />
                <span>Auto Create Video</span>
              </div>
              <p className="text-[13px] text-[#9BA2B0] leading-relaxed">
                Import clips, pick from 12 cinematic or creator presets, configure resolution and enhancement passes, and preview an automated assembly plan.
              </p>
              <div className="pt-1 text-[12px] text-[#7A8190] font-mono">
                12 Presets · Aspect Reframe · Stabilization · Audio Normalization
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#6D7484] group-hover:text-[#5B9BFF] shrink-0 mt-0.5 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('pro-editor')}
            className="group text-left p-5 rounded-md bg-[#17191E] hover:bg-[#1C1F26] border border-[#272B35] hover:border-[#4B5568] transition-colors flex items-start justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#F3F4F6]">
                <Film className="w-4 h-4 text-[#C2C8D4]" />
                <span>Pro Timeline Editor</span>
              </div>
              <p className="text-[13px] text-[#9BA2B0] leading-relaxed">
                Open multi-track video and audio timeline with precision playhead scrubbing, clip splitting, speed controls, keyframes, and overlays.
              </p>
              <div className="pt-1 text-[12px] text-[#7A8190] font-mono">
                Multi-Track V1/V2/A1/A2 · Frame Stepping · Non-Destructive Edits
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#6D7484] group-hover:text-[#E6E8EC] shrink-0 mt-0.5 transition-colors" />
          </button>
        </div>
      </section>

      {/* Main Split: Recent Projects (8 cols) + Hardware & Storage Panel (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Recent Projects */}
        <section className="xl:col-span-8 space-y-3" aria-label="Recent Projects">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-[#F3F4F6]">Recent Projects</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#7A8190] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Filter projects..."
                  className="pl-8 pr-3 py-1.5 w-52 rounded bg-[#15171B] border border-[#282B34] text-[12px] text-[#E6E8EC] placeholder:text-[#6D7484] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('projects')}
                className="text-[12px] font-medium text-[#8E95A5] hover:text-[#F3F4F6] px-2 py-1.5 transition-colors whitespace-nowrap"
              >
                Manage All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredProjects.map((project) => {
              const isCurrent = project.id === activeProjectId;
              return (
                <div
                  key={project.id}
                  className={`rounded-md bg-[#17191E] border transition-colors overflow-hidden flex flex-col ${
                    isCurrent ? 'border-[#3B82F6]/60' : 'border-[#252932] hover:border-[#363B48]'
                  }`}
                >
                  <div className="relative aspect-video bg-[#0F1013] overflow-hidden">
                    <img
                      src={project.thumbnailUrl}
                      alt={project.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
                      <span className="text-[13px] font-semibold text-white truncate">
                        {project.name}
                      </span>
                      <span className="text-[11px] font-mono text-[#E2E8F0] shrink-0">
                        {formatDurationCompact(project.durationSeconds)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="text-[12px] font-mono text-[#9BA2B0] tabular-nums">
                        {project.resolutionWidth}x{project.resolutionHeight} · {project.fps} fps · {project.colorSpace}
                      </div>
                      <div className="text-[11px] text-[#737A89] truncate font-mono">
                        {project.filePath}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#22252D] text-[12px]">
                      <span className="text-[#7A8190]">{project.lastModified}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            selectProject(project.id, false);
                            setActiveSection('auto-studio');
                          }}
                          className="text-[#9BA2B0] hover:text-white transition-colors font-medium"
                        >
                          Auto
                        </button>
                        <span className="text-[#363B47]" aria-hidden="true">/</span>
                        <button
                          type="button"
                          onClick={() => {
                            selectProject(project.id, false);
                            setActiveSection('pro-editor');
                          }}
                          className="text-[#5B9BFF] hover:text-[#93C5FD] transition-colors font-medium"
                        >
                          Open Timeline
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Hardware & Storage Panel */}
        <aside className="xl:col-span-4 space-y-4" aria-label="Hardware and Storage Information">
          <div className="rounded-md bg-[#17191E] border border-[#252932] p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#8E95A5]" />
                <h2 className="text-[14px] font-semibold text-[#F3F4F6]">Local Workstation</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('hardware')}
                className="text-[12px] text-[#5B9BFF] hover:text-[#93C5FD] font-medium"
              >
                Configure
              </button>
            </div>

            <div className="text-[11px] text-[#8E95A5] bg-[#121418] border border-[#23262E] rounded px-2.5 py-2 flex items-center justify-between gap-2">
              <span>Simulated Host Profile</span>
              <select
                aria-label="Preview simulated host platform"
                value={hardware.platform}
                onChange={(e) => switchSimulatedPlatform(e.target.value as HostPlatform)}
                className="bg-[#1B1E25] border border-[#2E333E] rounded px-1.5 py-0.5 text-[11px] text-[#E6E8EC] focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="macos-apple-silicon">macOS · Apple Silicon</option>
                <option value="windows-nvidia">Windows · NVIDIA RTX</option>
                <option value="windows-intel-amd">Windows · QuickSync / AMF</option>
              </select>
            </div>

            <dl className="space-y-2.5 text-[12px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[#7A8190]">Operating System</dt>
                <dd className="text-[#E6E8EC] font-medium text-right">{hardware.osLabel}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[#7A8190]">Processor</dt>
                <dd className="text-[#E6E8EC] text-right">{hardware.cpuModel}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[#7A8190]">Graphics / Compute</dt>
                <dd className="text-[#E6E8EC] text-right">{hardware.gpuModel}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[#7A8190]">System Memory</dt>
                <dd className="text-[#E6E8EC] font-mono tabular-nums text-right">
                  {hardware.ramAvailableGb} GB free / {hardware.ramTotalGb} GB
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 pt-1 border-t border-[#22252E]">
                <dt className="text-[#7A8190]">Active Encoder</dt>
                <dd className="text-[#5B9BFF] font-medium text-right">
                  {activeEncoder?.label ?? 'CPU Fallback'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Available Storage */}
          <div className="rounded-md bg-[#17191E] border border-[#252932] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#8E95A5]" />
                <h2 className="text-[14px] font-semibold text-[#F3F4F6]">Available Storage</h2>
              </div>
              <span className="text-[12px] font-mono text-[#E6E8EC] tabular-nums">
                {hardware.storageAvailableGb} GB free
              </span>
            </div>

            <div className="w-full h-2 rounded bg-[#111216] overflow-hidden border border-[#242730]">
              <div
                className="h-full bg-[#3B82F6] transition-all duration-200"
                style={{ width: `${storageUsedPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#7A8190] font-mono tabular-nums">
              <span>{hardware.storageVolumeName}</span>
              <span>
                {storageUsedGb} GB used of {hardware.storageTotalGb} GB
              </span>
            </div>
            <div className="text-[11px] text-[#7A8190] font-mono truncate">
              Scratch: {hardware.scratchDiskPath}
            </div>
          </div>
        </aside>
      </div>

      {/* Recent Render History */}
      <section className="space-y-3" aria-label="Recent Render History">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#F3F4F6]">
            Recent Render History <span className="text-[12px] font-normal text-[#7A8190]">(Sample Local Log)</span>
          </h2>
          <button
            type="button"
            onClick={() => setActiveSection('export')}
            className="text-[12px] font-medium text-[#5B9BFF] hover:text-[#93C5FD]"
          >
            Open Export Center
          </button>
        </div>

        <div className="rounded-md bg-[#17191E] border border-[#252932] overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#252932] text-[#7A8190] font-medium">
                <th className="py-2.5 px-4">Output File</th>
                <th className="py-2.5 px-4">Project</th>
                <th className="py-2.5 px-4">Format</th>
                <th className="py-2.5 px-4">Encoder</th>
                <th className="py-2.5 px-4 text-right">Duration</th>
                <th className="py-2.5 px-4 text-right">Size</th>
                <th className="py-2.5 px-4 text-right">Render Time</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21242D]">
              {renderHistory.map((item) => (
                <tr key={item.id} className="hover:bg-[#1C1F26] transition-colors">
                  <td className="py-2.5 px-4 font-medium text-[#E6E8EC] font-mono">
                    {item.outputFileName}
                  </td>
                  <td className="py-2.5 px-4 text-[#9BA2B0]">{item.projectName}</td>
                  <td className="py-2.5 px-4 text-[#9BA2B0] font-mono">
                    {item.container} · {item.codec} · {item.resolutionLabel}
                  </td>
                  <td className="py-2.5 px-4 text-[#9BA2B0] font-mono">{item.encoder}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#C8CDD8]">
                    {formatDurationCompact(item.durationSeconds)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#C8CDD8]">
                    {item.fileSizeMb} MB
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#C8CDD8]">
                    {item.renderTimeSeconds}s
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-[#4ADE80]">
                    Completed
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
