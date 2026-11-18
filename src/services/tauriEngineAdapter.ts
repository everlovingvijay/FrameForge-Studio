import {
  CreateProjectCommandInput,
  EngineCapabilities,
  FrameForgeEngineService,
  FrameForgeRustCommands,
  RenderEncodeRequest,
  RenderJobHandle,
} from '../types/rustEngine';
import { FrameForgeProjectDocument } from '../types/projectSchema';
import {
  AutoStudioConfig,
  HardwareProfile,
  HostPlatform,
  MediaAsset,
  StudioProject,
} from '../types/studio';
import { mockEngineAdapter } from './mockEngineAdapter';

interface TauriInternalsWindow {
  __TAURI_INTERNALS__?: {
    invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  };
}

export function isTauriDesktopRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as unknown as TauriInternalsWindow).__TAURI_INTERNALS__?.invoke);
}

async function invokeRustCommand<K extends keyof FrameForgeRustCommands>(
  command: K,
  payload: FrameForgeRustCommands[K]['request']
): Promise<FrameForgeRustCommands[K]['response']> {
  const internals = (window as unknown as TauriInternalsWindow).__TAURI_INTERNALS__;
  if (!internals?.invoke) {
    throw new Error(
      `Tauri 2 runtime not detected. Cannot invoke Rust command "${String(command)}".`
    );
  }
  return internals.invoke<FrameForgeRustCommands[K]['response']>(
    String(command),
    payload as unknown as Record<string, unknown>
  );
}

/**
 * Production Tauri 2 + Rust IPC adapter implementing `FrameForgeEngineService`.
 * Uses `window.__TAURI_INTERNALS__.invoke` so the web build stays dependency-clean
 * until `@tauri-apps/api` is added inside the desktop workspace.
 */
export const tauriEngineAdapter: FrameForgeEngineService = {
  mode: 'tauri-rust',
  isSimulated: false,

  getCapabilities(): Promise<EngineCapabilities> {
    return invokeRustCommand('get_engine_capabilities', {});
  },

  detectHardwareProfile(platformOverride?: HostPlatform): Promise<HardwareProfile> {
    return invokeRustCommand('detect_hardware_profile', { platformOverride });
  },

  probeBrowserFile(file: File): Promise<MediaAsset> {
    // Browser File objects do not expose native OS paths; use browser probe fallback
    return mockEngineAdapter.probeBrowserFile(file);
  },

  probeNativePath(filePath: string): Promise<MediaAsset> {
    return invokeRustCommand('probe_media_file', { filePath });
  },

  createProject(input: CreateProjectCommandInput): Promise<StudioProject> {
    return invokeRustCommand('create_project', input);
  },

  saveProjectDocument(document: FrameForgeProjectDocument) {
    return invokeRustCommand('save_project_document', { document });
  },

  loadProjectDocument(filePath: string): Promise<FrameForgeProjectDocument> {
    return invokeRustCommand('load_project_document', { filePath });
  },

  async prepareAutoEditSummary(config: AutoStudioConfig, media: MediaAsset[]) {
    return mockEngineAdapter.prepareAutoEditSummary(config, media);
  },

  enqueueRenderJob(request: RenderEncodeRequest): Promise<RenderJobHandle> {
    return invokeRustCommand('enqueue_ffmpeg_render', request);
  },

  cancelRenderJob(jobId: string) {
    return invokeRustCommand('cancel_ffmpeg_render', { jobId });
  },
};
