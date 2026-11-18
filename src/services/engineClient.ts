import { FrameForgeEngineService } from '../types/rustEngine';
import { mockEngineAdapter } from './mockEngineAdapter';
import { isTauriDesktopRuntime, tauriEngineAdapter } from './tauriEngineAdapter';

/**
 * Selects the native Tauri 2 + Rust engine adapter when running inside the desktop host,
 * or falls back cleanly to the explicitly simulated browser preview adapter.
 */
export function getEngineClient(): FrameForgeEngineService {
  return isTauriDesktopRuntime() ? tauriEngineAdapter : mockEngineAdapter;
}

export const engineClient: FrameForgeEngineService = getEngineClient();
