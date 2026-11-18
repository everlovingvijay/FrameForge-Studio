import {
  AutoStudioConfig,
  FrameForgeNativeBridge,
  FrameRateOption,
  HardwareProfile,
  HostPlatform,
  MediaAsset,
  StudioProject,
} from '../types/studio';
import { engineClient } from './engineClient';

/**
 * Compatibility facade preserving the `nativeBridge` surface while routing
 * through `engineClient` (`tauriEngineAdapter` in desktop or `mockEngineAdapter` in browser).
 */
export const nativeBridge: FrameForgeNativeBridge = {
  mode: engineClient.mode === 'tauri-rust' ? 'tauri-rust' : 'browser-preview',

  detectHardwareProfile(platformOverride?: HostPlatform): Promise<HardwareProfile> {
    return engineClient.detectHardwareProfile(platformOverride);
  },

  probeLocalMediaFile(file: File): Promise<MediaAsset> {
    return engineClient.probeBrowserFile(file);
  },

  createProject(input: {
    name: string;
    directory: string;
    width: number;
    height: number;
    fps: FrameRateOption;
    colorSpace: StudioProject['colorSpace'];
    initialWorkspace: 'auto-studio' | 'pro-editor';
  }): Promise<StudioProject> {
    return engineClient.createProject(input);
  },

  prepareAutoEditPlan(config: AutoStudioConfig, media: MediaAsset[]) {
    return engineClient.prepareAutoEditSummary(config, media);
  },
};
