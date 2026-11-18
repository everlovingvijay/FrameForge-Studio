import React, { useState } from 'react';
import { FolderOpen, Search, X } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { formatDurationCompact } from '../../utils/formatters';

export const OpenProjectModal: React.FC = () => {
  const isOpen = useStudioStore((s) => s.isOpenProjectModalOpen);
  const openProjectPickerModal = useStudioStore((s) => s.openProjectPickerModal);
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const selectProject = useStudioStore((s) => s.selectProject);
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.filePath.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-project-title"
    >
      <div className="w-full max-w-xl bg-[#181A1F] border border-[#2C303A] rounded-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#262932]">
          <h2 id="open-project-title" className="text-[15px] font-semibold text-[#F3F4F6]">
            Open Portable Project (.ffproj)
          </h2>
          <button
            type="button"
            onClick={() => openProjectPickerModal(false)}
            className="p-1 rounded text-[#8E95A5] hover:text-white hover:bg-[#242832] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-[#22252E] bg-[#14161A]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#7A8190] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search local projects by name or path..."
              className="w-full pl-9 pr-3 py-2 rounded bg-[#111216] border border-[#2C303A] text-[13px] text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>

        <div className="divide-y divide-[#22252E] max-h-80 overflow-y-auto">
          {filtered.map((project) => {
            const isActive = project.id === activeProjectId;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => selectProject(project.id, true)}
                className="w-full flex items-center justify-between gap-4 px-5 py-3 text-left hover:bg-[#1E2128] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={project.thumbnailUrl}
                    alt={project.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-10 rounded object-cover border border-[#2D313B] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#F3F4F6] truncate">
                        {project.name}
                      </span>
                      {isActive && (
                        <span className="text-[11px] font-medium text-[#5B9BFF]">Current</span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-[#7A8190] truncate">
                      {project.filePath}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 text-[11px] font-mono text-[#9BA2B0]">
                  <div>
                    {project.resolutionWidth}x{project.resolutionHeight} · {project.fps}fps
                  </div>
                  <div className="text-[#7A8190]">
                    {formatDurationCompact(project.durationSeconds)} · {project.lastModified}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[13px] text-[#7A8190]">
              <FolderOpen className="w-6 h-6 mx-auto mb-2 text-[#565C69]" />
              No matching local projects found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
