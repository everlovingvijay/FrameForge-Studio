import React from 'react';
import { FolderOpen, Plus, Upload } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { NavSection } from '../../types/studio';

const SECTION_LABELS: Record<NavSection, string> = {
  home: 'Home Dashboard',
  'auto-studio': 'Auto Studio',
  'pro-editor': 'Pro Editor',
  enhancements: 'Video Enhancements',
  audio: 'Audio Studio',
  presets: 'Preset Library',
  export: 'Export Center',
  projects: 'Project Manager',
  hardware: 'Hardware Settings',
  settings: 'Application Settings',
};

export const TopWorkspaceBar: React.FC = () => {
  const activeSection = useStudioStore((s) => s.activeSection);
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const openNewProjectModal = useStudioStore((s) => s.openNewProjectModal);
  const openImportMediaModal = useStudioStore((s) => s.openImportMediaModal);
  const openProjectPickerModal = useStudioStore((s) => s.openProjectPickerModal);
  const setActiveSection = useStudioStore((s) => s.setActiveSection);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  return (
    <header className="h-12 shrink-0 bg-[#15171B] border-b border-[#24272F] px-5 flex items-center justify-between gap-8">
      {/* Left Zone: Contextual Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0 text-[13px]">
        <span className="font-medium text-[#E6E8EC] whitespace-nowrap shrink-0">
          {SECTION_LABELS[activeSection]}
        </span>
        {activeProject && (
          <>
            <span className="text-[#4F5563]" aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => openProjectPickerModal(true)}
              className="flex items-center gap-1.5 text-[#9BA2B0] hover:text-[#F3F4F6] transition-colors truncate max-w-[260px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6] rounded px-1.5 py-0.5"
              title="Switch active project"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#7A8190] shrink-0" />
              <span className="truncate">{activeProject.name}</span>
            </button>
            <span className="hidden lg:inline text-[12px] font-mono text-[#6E7584] whitespace-nowrap shrink-0">
              {activeProject.resolutionWidth}x{activeProject.resolutionHeight} · {activeProject.fps}fps
            </span>
          </>
        )}
      </div>

      {/* Right Zone: Primary Workspace Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => openImportMediaModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium bg-[#1E2128] hover:bg-[#262A33] text-[#E2E5EB] border border-[#2D313B] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6]"
        >
          <Upload className="w-3.5 h-3.5 text-[#9BA2B0]" />
          <span>Import Media</span>
        </button>

        {activeSection === 'pro-editor' || activeSection === 'auto-studio' ? (
          <button
            type="button"
            onClick={() => setActiveSection('export')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-[12px] font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#93C5FD]"
          >
            <span>Quick Export</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openNewProjectModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-[12px] font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#93C5FD]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        )}
      </div>
    </header>
  );
};
