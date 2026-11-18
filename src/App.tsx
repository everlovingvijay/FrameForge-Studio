/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { ImportMediaModal } from './components/modals/ImportMediaModal';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { OpenProjectModal } from './components/modals/OpenProjectModal';
import { SidebarNav } from './components/shell/SidebarNav';
import { TopWorkspaceBar } from './components/shell/TopWorkspaceBar';
import { AudioStudioView } from './components/views/AudioStudioView';
import { AutoStudioView } from './components/views/AutoStudioView';
import { ExportCenterView } from './components/views/ExportCenterView';
import { HomeDashboardView } from './components/views/HomeDashboardView';
import {
  AppSettingsView,
  HardwareSettingsView,
  PresetLibraryView,
  ProjectManagerView,
} from './components/views/LibraryAndSystemViews';
import { ProEditorView } from './components/views/ProEditorView';
import { VideoEnhancementsView } from './components/views/VideoEnhancementsView';
import { useStudioStore } from './store/useStudioStore';

export default function App() {
  const activeSection = useStudioStore((s) => s.activeSection);

  const renderSection = (): React.ReactNode => {
    switch (activeSection) {
      case 'home':
        return <HomeDashboardView />;
      case 'auto-studio':
        return <AutoStudioView />;
      case 'pro-editor':
        return <ProEditorView />;
      case 'enhancements':
        return <VideoEnhancementsView />;
      case 'audio':
        return <AudioStudioView />;
      case 'presets':
        return <PresetLibraryView />;
      case 'export':
        return <ExportCenterView />;
      case 'projects':
        return <ProjectManagerView />;
      case 'hardware':
        return <HardwareSettingsView />;
      case 'settings':
        return <AppSettingsView />;
      default:
        return <HomeDashboardView />;
    }
  };

  return (
    <div className="min-h-screen h-screen w-full flex overflow-hidden bg-[#111215] text-[#E6E8EC]">
      <SidebarNav />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <TopWorkspaceBar />
        <div className="flex-1 min-h-0 overflow-y-auto">{renderSection()}</div>
      </div>

      {/* Global Studio Dialogs */}
      <NewProjectModal />
      <ImportMediaModal />
      <OpenProjectModal />
    </div>
  );
}
