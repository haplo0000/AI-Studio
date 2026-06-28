export type VideoDuration = 2 | 4 | 6;
export type VideoQualityPreset = 'fast_test' | 'balanced' | 'quality';

export interface VideoPresetSummary {
  id: VideoQualityPreset;
  label: string;
  tagline: string;
  defaultDuration: VideoDuration;
  defaultMotionStrength: number;
  steps: number;
  estimatedTimeLabel: string;
  estimatedSecondsMin: number;
  estimatedSecondsMax: number;
  vramRisk: 'low' | 'medium' | 'high';
  vramRiskLabel: string;
  level: 'ok' | 'warn' | 'block';
  dims?: { width: number; height: number };
}

export interface VideoPresetEstimates {
  defaultPreset: VideoQualityPreset;
  presets: VideoPresetSummary[];
}

export interface VideoRecord {
  id: number;
  path: string;
  filename: string;
  folder: string;
  mtime: number;
  size: number;
  source_image_path: string | null;
  prompt: string | null;
  duration: number | null;
  motion_strength: number | null;
  timestamp: string | null;
  workflow: string | null;
  model: string | null;
  status: string;
  indexed_at: string;
}

export interface VideoStudioStats {
  count: number;
  bytes: number;
  outputRoot: string;
}

export interface VideoSetupStatus {
  ready: boolean;
  message: string;
  detail?: string;
  missingModels?: string[];
  workflow?: string;
  model?: string;
  vramProfile?: string;
}
export interface CreateVideoParams {
  sourcePath: string;
  prompt: string;
  duration: VideoDuration;
  motionStrength: number;
  qualityPreset: VideoQualityPreset;
}

export interface VramRiskEstimate {
  level: 'ok' | 'warn' | 'block';
  message: string | null;
  dims?: { width: number; height: number };
  frameLength?: number;
  preset?: VideoQualityPreset;
  estimatedTimeLabel?: string;
  estimatedSecondsMin?: number;
  estimatedSecondsMax?: number;
  vramRisk?: 'low' | 'medium' | 'high';
  vramRiskLabel?: string;
  steps?: number;
}

export interface CreateVideoResult {
  ok: boolean;
  message: string;
  detail?: string;
  setupRequired?: boolean;
  vramBlocked?: boolean;
  jobs?: import('./imageStudio').GenerationJobState[];
}

export type VideoStudioChangeEvent = {
  type: 'add' | 'change' | 'unlink';
  path: string;
};
