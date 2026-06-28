export type VideoDuration = 2 | 4 | 6;

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
}

export interface VramRiskEstimate {
  level: 'ok' | 'warn' | 'block';
  message: string | null;
  dims?: { width: number; height: number };
  frameLength?: number;
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
