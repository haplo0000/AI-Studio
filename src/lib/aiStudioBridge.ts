import type { AiStudioApi } from '../types/studio';

export function isElectronRenderer(): boolean {
  return typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent);
}

export function hasAiStudioBridge(): boolean {
  return typeof window !== 'undefined' && typeof window.aiStudio === 'object' && window.aiStudio != null;
}

export async function waitForAiStudio(timeoutMs = 10000, intervalMs = 50): Promise<AiStudioApi> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (hasAiStudioBridge()) {
      return window.aiStudio;
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  if (isElectronRenderer()) {
    throw new Error(
      'AI Studio preload bridge unavailable. The Electron preload script may have failed to load. Use npm.cmd run dev and the AI Studio desktop window — not a browser preview tab.',
    );
  }

  throw new Error('AI Studio API unavailable. Run with Electron (npm.cmd run dev).');
}
