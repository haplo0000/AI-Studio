import type { AiStudioApi } from '../types/studio';

export function isElectronRenderer(): boolean {
  return typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent);
}

export async function waitForAiStudio(timeoutMs = 5000, intervalMs = 50): Promise<AiStudioApi> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (window.aiStudio) {
      return window.aiStudio;
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  if (isElectronRenderer()) {
    throw new Error(
      'AI Studio preload bridge unavailable. The Electron preload script may have failed to load.',
    );
  }

  throw new Error('AI Studio API unavailable. Run with Electron (npm run dev).');
}
