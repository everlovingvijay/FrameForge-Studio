import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { FrameRateOption, StudioProject } from '../../types/studio';

const RESOLUTION_TEMPLATES = [
  { label: '4K UHD (3840x2160)', width: 3840, height: 2160 },
  { label: '1080p HD (1920x1080)', width: 1920, height: 1080 },
  { label: 'Vertical Reel (1080x1920)', width: 1080, height: 1920 },
  { label: 'Square 1:1 (2160x2160)', width: 2160, height: 2160 },
  { label: 'Cinema 2.39:1 (3840x1606)', width: 3840, height: 1606 },
];

const FPS_OPTIONS: FrameRateOption[] = [23.976, 24, 25, 29.97, 30, 50, 60, 120];
const COLOR_SPACES: StudioProject['colorSpace'][] = ['Rec.709', 'Rec.2020 HLG', 'sRGB', 'Apple Log'];

export const NewProjectModal: React.FC = () => {
  const isOpen = useStudioStore((s) => s.isNewProjectModalOpen);
  const openNewProjectModal = useStudioStore((s) => s.openNewProjectModal);
  const createAndActivateProject = useStudioStore((s) => s.createAndActivateProject);
  const appSettings = useStudioStore((s) => s.appSettings);

  const [name, setName] = useState('Autumn_Reel_Cut');
  const [directory, setDirectory] = useState(appSettings.projectDirectory);
  const [resIndex, setResIndex] = useState(0);
  const [fps, setFps] = useState<FrameRateOption>(appSettings.defaultFrameRate);
  const [colorSpace, setColorSpace] = useState<StudioProject['colorSpace']>(appSettings.defaultColorSpace);
  const [initialWorkspace, setInitialWorkspace] = useState<'auto-studio' | 'pro-editor'>('auto-studio');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedRes = RESOLUTION_TEMPLATES[resIndex];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAndActivateProject({
        name,
        directory,
        width: selectedRes.width,
        height: selectedRes.height,
        fps,
        colorSpace,
        initialWorkspace,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
    >
      <div className="w-full max-w-lg bg-[#181A1F] border border-[#2C303A] rounded-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#262932]">
          <h2 id="new-project-title" className="text-[15px] font-semibold text-[#F3F4F6]">
            Create New Project
          </h2>
          <button
            type="button"
            onClick={() => openNewProjectModal(false)}
            className="p-1 rounded text-[#8E95A5] hover:text-white hover:bg-[#242832] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-[13px]">
          <div>
            <label htmlFor="proj-name" className="block text-[12px] font-medium text-[#B0B6C3] mb-1.5">
              Project Name
            </label>
            <input
              id="proj-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kyoto Documentary Cut"
              className="w-full px-3 py-2 rounded bg-[#111216] border border-[#2C303A] text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label htmlFor="proj-dir" className="block text-[12px] font-medium text-[#B0B6C3] mb-1.5">
              Portable Project Location (.ffproj)
            </label>
            <input
              id="proj-dir"
              type="text"
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#111216] border border-[#2C303A] text-[#C8CDD8] font-mono text-[12px] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="proj-res" className="block text-[12px] font-medium text-[#B0B6C3] mb-1.5">
                Sequence Resolution
              </label>
              <select
                id="proj-res"
                value={resIndex}
                onChange={(e) => setResIndex(Number(e.target.value))}
                className="w-full px-3 py-2 rounded bg-[#111216] border border-[#2C303A] text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6]"
              >
                {RESOLUTION_TEMPLATES.map((item, idx) => (
                  <option key={item.label} value={idx}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="proj-fps" className="block text-[12px] font-medium text-[#B0B6C3] mb-1.5">
                Frame Rate
              </label>
              <select
                id="proj-fps"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value) as FrameRateOption)}
                className="w-full px-3 py-2 rounded bg-[#111216] border border-[#2C303A] text-[#F3F4F6] font-mono focus:outline-none focus:border-[#3B82F6]"
              >
                {FPS_OPTIONS.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate} fps
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="proj-color" className="block text-[12px] font-medium text-[#B0B6C3] mb-1.5">
                Working Color Space
              </label>
              <select
                id="proj-color"
                value={colorSpace}
                onChange={(e) => setColorSpace(e.target.value as StudioProject['colorSpace'])}
                className="w-full px-3 py-2 rounded bg-[#111216] border border-[#2C303A] text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6]"
              >
                {COLOR_SPACES.map((cs) => (
                  <option key={cs} value={cs}>
                    {cs}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-[12px] font-medium text-[#B0B6C3] mb-1.5">
                Open In Workspace
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded bg-[#111216] border border-[#2C303A]">
                <button
                  type="button"
                  onClick={() => setInitialWorkspace('auto-studio')}
                  className={`py-1.5 px-2 rounded text-[12px] font-medium transition-colors ${
                    initialWorkspace === 'auto-studio'
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#9BA2B0] hover:text-white'
                  }`}
                >
                  Auto Studio
                </button>
                <button
                  type="button"
                  onClick={() => setInitialWorkspace('pro-editor')}
                  className={`py-1.5 px-2 rounded text-[12px] font-medium transition-colors ${
                    initialWorkspace === 'pro-editor'
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#9BA2B0] hover:text-white'
                  }`}
                >
                  Pro Editor
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#262932]">
            <span className="text-[11px] text-[#7A8190]">
              Creates local project metadata in browser preview state
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openNewProjectModal(false)}
                className="px-3.5 py-2 rounded text-[12px] font-medium text-[#B0B6C3] hover:text-white hover:bg-[#23262F] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded text-[12px] font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors disabled:opacity-60"
              >
                {submitting ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
