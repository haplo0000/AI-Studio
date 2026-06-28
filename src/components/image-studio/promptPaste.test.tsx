import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeneratePanel } from './GeneratePanel';
import { CreateVideoModal } from './CreateVideoModal';
import type { ImageRecord } from '../../types/imageStudio';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const testImage: ImageRecord = {
  id: 1,
  path: 'C:\\test\\image.png',
  filename: 'image.png',
  folder: 'C:\\test',
  mtime: Date.now(),
  size: 1000,
  width: 1024,
  height: 1024,
  timestamp: new Date().toISOString(),
  workflow: null,
  checkpoint: null,
  seed: null,
  cfg: null,
  steps: null,
  resolution: null,
  prompt: null,
  negative_prompt: null,
  generation_time_ms: null,
  tags: null,
  parent_image_path: null,
  edit_prompt: null,
  denoise: null,
};

describe('prompt paste', () => {
  it('image generation prompt accepts keyboard paste', async () => {
    const user = userEvent.setup();
    render(
      <GeneratePanel
        comfyuiHealthy
        onGenerate={async () => true}
        onOpenAdvanced={() => {}}
      />,
    );

    const prompt = screen.getByPlaceholderText(/Prompt —/);
    await user.click(prompt);
    await user.paste('mountain lake at dawn');

    expect(prompt).toHaveValue('mountain lake at dawn');
  });

  it('video motion prompt accepts keyboard paste', async () => {
    vi.stubGlobal('aiStudio', {
      getMediaUrl: () => 'media://local/?path=test',
      videoStudioSetup: async () => ({ ready: true, message: 'ready' }),
      videoStudioPresetEstimates: async () => ({
        defaultPreset: 'balanced',
        presets: [
          {
            id: 'fast_test',
            label: 'Fast Test',
            tagline: 'test',
            defaultDuration: 2,
            defaultMotionStrength: 0.4,
            steps: 16,
            estimatedTimeLabel: '~40–55s',
            estimatedSecondsMin: 40,
            estimatedSecondsMax: 55,
            vramRisk: 'low',
            vramRiskLabel: 'Low VRAM risk',
            level: 'ok',
            dims: { width: 384, height: 256 },
          },
          {
            id: 'balanced',
            label: 'Balanced',
            tagline: 'test',
            defaultDuration: 4,
            defaultMotionStrength: 0.5,
            steps: 20,
            estimatedTimeLabel: '~75–105s',
            estimatedSecondsMin: 75,
            estimatedSecondsMax: 105,
            vramRisk: 'medium',
            vramRiskLabel: 'Medium VRAM risk',
            level: 'ok',
            dims: { width: 512, height: 320 },
          },
          {
            id: 'quality',
            label: 'Quality',
            tagline: 'test',
            defaultDuration: 4,
            defaultMotionStrength: 0.55,
            steps: 24,
            estimatedTimeLabel: '~110–170s',
            estimatedSecondsMin: 110,
            estimatedSecondsMax: 170,
            vramRisk: 'high',
            vramRiskLabel: 'High VRAM risk — may be slow',
            level: 'warn',
            dims: { width: 512, height: 384 },
          },
        ],
      }),
      videoStudioVramRisk: async () => ({ level: 'ok', message: null }),
      videoStudioGenerate: vi.fn(),
    });

    const user = userEvent.setup();
    render(
      <CreateVideoModal
        image={testImage}
        comfyuiHealthy
        onClose={() => {}}
        onQueued={() => {}}
        onNotify={() => {}}
        onOpenAdvanced={() => {}}
        onOpenVideoSetup={() => {}}
      />,
    );

    const motion = screen.getByPlaceholderText(/slow camera push-in/);
    await user.click(motion);
    await user.paste('slow cinematic camera push-in');

    expect(motion).toHaveValue('slow cinematic camera push-in');
  });
});
