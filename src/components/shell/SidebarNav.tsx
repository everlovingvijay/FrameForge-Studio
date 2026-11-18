import React from 'react';
import {
  AudioLines,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  Film,
  FolderKanban,
  Home,
  Layers,
  Settings,
  SlidersHorizontal,
  Wand2,
} from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { NavSection } from '../../types/studio';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'workspace' | 'tools' | 'system';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home Dashboard', icon: Home, group: 'workspace' },
  { id: 'auto-studio', label: 'Auto Studio', icon: Wand2, group: 'workspace' },
  { id: 'pro-editor', label: 'Pro Editor', icon: Film, group: 'workspace' },
  { id: 'enhancements', label: 'Video Enhancements', icon: SlidersHorizontal, group: 'tools' },
  { id: 'audio', label: 'Audio Studio', icon: AudioLines, group: 'tools' },
  { id: 'presets', label: 'Preset Library', icon: Layers, group: 'tools' },
  { id: 'export', label: 'Export Center', icon: Download, group: 'tools' },
  { id: 'projects', label: 'Project Manager', icon: FolderKanban, group: 'system' },
  { id: 'hardware', label: 'Hardware Settings', icon: Cpu, group: 'system' },
  { id: 'settings', label: 'Application Settings', icon: Settings, group: 'system' },
];

export const SidebarNav: React.FC = () => {
  const activeSection = useStudioStore((s) => s.activeSection);
  const sidebarCollapsed = useStudioStore((s) => s.sidebarCollapsed);
  const setActiveSection = useStudioStore((s) => s.setActiveSection);
  const toggleSidebar = useStudioStore((s) => s.toggleSidebar);

  const groups: { key: NavItem['group']; heading: string }[] = [
    { key: 'workspace', heading: 'Studio' },
    { key: 'tools', heading: 'Post & Delivery' },
    { key: 'system', heading: 'System' },
  ];

  return (
    <aside
      className={`flex flex-col shrink-0 bg-[#15171B] border-r border-[#24272F] transition-[width] duration-150 select-none ${
        sidebarCollapsed ? 'w-[60px]' : 'w-[228px]'
      }`}
      aria-label="Primary Workstation Navigation"
    >
      {/* Brand Row */}
      <div className="h-12 flex items-center justify-between px-3.5 border-b border-[#24272F]">
        {!sidebarCollapsed && (
          <button
            type="button"
            onClick={() => setActiveSection('home')}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6] rounded px-1 py-0.5"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect x="2" y="3" width="20" height="18" rx="3" stroke="#3B82F6" strokeWidth="1.75" />
              <path d="M7 3V21M17 3V21M2 9H7M17 9H22M2 15H7M17 15H22" stroke="#5A6170" strokeWidth="1.4" />
              <polygon points="10.5,9 15,12 10.5,15" fill="#E6E8EC" />
            </svg>
            <span className="text-[14px] font-semibold tracking-tight text-[#F3F4F6] whitespace-nowrap">
              FrameForge Studio
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand navigation rail' : 'Collapse navigation rail'}
          aria-label={sidebarCollapsed ? 'Expand navigation rail' : 'Collapse navigation rail'}
          className="p-1.5 rounded text-[#8E95A5] hover:text-[#F3F4F6] hover:bg-[#1F2229] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6] mx-auto"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {groups.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group.key);
          return (
            <div key={group.key}>
              {!sidebarCollapsed && (
                <div className="px-2.5 pb-1.5 text-[11px] font-medium text-[#6C7382]">
                  {group.heading}
                </div>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-[13px] font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6] ${
                        isActive
                          ? 'bg-[#212632] text-[#F8FAFC] border border-[#323B4E]'
                          : 'text-[#9BA2B0] hover:text-[#E6E8EC] hover:bg-[#1B1D23] border border-transparent'
                      } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#5B9BFF]' : 'text-[#7C8393]'
                        }`}
                      />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Quiet Offline Engine Notice */}
      {!sidebarCollapsed && (
        <div className="p-3 border-t border-[#24272F] text-[11px] text-[#7A8190] leading-relaxed">
          <div className="font-medium text-[#AEB5C2]">Frontend Shell Preview</div>
          <div>Offline Rust / FFmpeg IPC ready</div>
        </div>
      )}
    </aside>
  );
};
