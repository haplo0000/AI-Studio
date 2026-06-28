export type ImageAspectPreset =
  | 'portrait'
  | 'landscape'
  | 'square'
  | 'wallpaper'
  | 'phone-wallpaper'
  | 'legion-wallpaper';

export type ImageStylePreset = 'default' | 'portrait' | 'landscape' | 'cinematic' | 'anime';

export interface ImageRecord {
  id: number;
  path: string;
  filename: string;
  folder: string;
  mtime: number;
  size: number;
  width: number | null;
  height: number | null;
  timestamp: string | null;
  workflow: string | null;
  checkpoint: string | null;
  seed: number | null;
  cfg: number | null;
  steps: number | null;
  resolution: string | null;
  prompt: string | null;
  negative_prompt: string | null;
  generation_time_ms: number | null;
  tags: string | null;
  parent_image_path: string | null;
  edit_prompt: string | null;
  denoise: number | null;
}

export type GenerationJobStatus = 'queued' | 'running' | 'saving' | 'complete' | 'error';

export interface GenerationJobState {
  id: string;
  promptId: string;
  prefix: string;
  label: string;
  kind?: 'image' | 'video';
  status: GenerationJobStatus;
  phase: string;
  progress: number | null;
  startedAt: number;
  completedAt: number | null;
  elapsedMs: number;
  error: string | null;
  batchIndex: number | null;
  batchTotal: number | null;
}

export interface GenerationProgressEvent {
  jobs: GenerationJobState[];
}

export interface ImageStudioStats {
  outputFolder: string;
  freeDiskBytes: number | null;
  totalDiskBytes: number | null;
  imagesToday: number;
  lastImageTime: string | null;
  totalImages: number;
  comfyuiHealthy: boolean;
}

export interface EditImageParams {
  sourcePath: string;
  editPrompt: string;
  denoise: number;
  preserveComposition: boolean;
  negativePrompt?: string;
  sourcePrompt?: string | null;
}

export interface EditImageResult {
  ok: boolean;
  message: string;
  promptId?: string;
  jobs?: GenerationJobState[];
}

export interface GenerateImageParams {
  prompt: string;
  negativePrompt: string;
  style: ImageStylePreset;
  aspect: ImageAspectPreset;
  resolution: number;
  count?: number;
  variationOfPath?: string | null;
  upscalePath?: string | null;
}

export interface GenerateImageResult {
  ok: boolean;
  message: string;
  promptIds?: string[];
  jobs?: GenerationJobState[];
}

export const ASPECT_DIMENSIONS: Record<ImageAspectPreset, { width: number; height: number; label: string }> = {
  portrait: { width: 832, height: 1216, label: 'Portrait' },
  landscape: { width: 1216, height: 832, label: 'Landscape' },
  square: { width: 1024, height: 1024, label: 'Square' },
  wallpaper: { width: 2560, height: 1600, label: 'Wallpaper (2560×1600)' },
  'phone-wallpaper': { width: 1080, height: 1920, label: 'Phone Wallpaper' },
  'legion-wallpaper': { width: 2560, height: 1600, label: 'Legion Wallpaper (2560×1600)' },
};

export const RESOLUTION_OPTIONS = [512, 768, 1024, 1536, 2048] as const;

export const STYLE_PROMPTS: Record<ImageStylePreset, string> = {
  default: '',
  portrait: 'photorealistic portrait, detailed face, studio lighting, shallow depth of field',
  landscape: 'cinematic landscape, golden hour, atmospheric perspective, highly detailed',
  cinematic: 'cinematic still, dramatic lighting, film grain, anamorphic',
  anime: 'anime style, vibrant colors, clean line art, detailed illustration',
};
