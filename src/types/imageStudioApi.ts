import type {
  EditImageParams,
  EditImageResult,
  GenerateImageParams,
  GenerateImageResult,
  GenerationJobState,
  GenerationProgressEvent,
  ImageRecord,
  ImageStudioStats,
} from '../types/imageStudio';

export type ImageStudioChangeEvent = {
  type: 'add' | 'change' | 'unlink';
  path: string;
};

export interface AiStudioImageApi {
  imageStudioStart: () => Promise<{ ok: boolean; outputRoot: string }>;
  imageStudioStop: () => Promise<{ ok: boolean }>;
  imageStudioStats: () => Promise<ImageStudioStats>;
  imageStudioList: (opts?: {
    offset?: number;
    limit?: number;
    search?: string;
  }) => Promise<ImageRecord[]>;
  imageStudioSearch: (query: string, opts?: { offset?: number; limit?: number }) => Promise<ImageRecord[]>;
  imageStudioThumbnail: (filePath: string) => Promise<{ dataUrl: string | null }>;
  imageStudioDelete: (filePath: string) => Promise<{ ok: boolean }>;
  imageStudioReveal: (filePath: string) => Promise<{ ok: boolean }>;
  imageStudioOpenFolder: (folderPath?: string) => Promise<{ ok: boolean }>;
  imageStudioOpenViewer: (filePath: string) => Promise<{ ok: boolean }>;
  imageStudioCopyImage: (filePath: string) => Promise<{ ok: boolean }>;
  imageStudioCopyPrompt: (filePath: string) => Promise<{ ok: boolean; prompt: string }>;
  imageStudioGenerate: (params: GenerateImageParams) => Promise<GenerateImageResult>;
  imageStudioEditImage: (params: EditImageParams) => Promise<EditImageResult>;
  imageStudioGenerationJobs: () => Promise<{ jobs: GenerationJobState[] }>;
  imageStudioVariations: (filePath: string) => Promise<{ ok: boolean; message: string }>;
  imageStudioUpscale: (filePath: string) => Promise<{ ok: boolean; message: string }>;
  imageStudioGetImage: (filePath: string) => Promise<ImageRecord | null>;
  getMediaUrl: (filePath: string) => string;
  onImageStudioChanged: (callback: (event: ImageStudioChangeEvent) => void) => () => void;
  onGenerationProgress: (callback: (event: GenerationProgressEvent) => void) => () => void;
  videoStudioSetup: () => Promise<import('./videoStudio').VideoSetupStatus>;
  videoStudioVramRisk: (
    params: Pick<import('./videoStudio').CreateVideoParams, 'sourcePath' | 'duration' | 'motionStrength'>,
  ) => Promise<import('./videoStudio').VramRiskEstimate>;
  videoStudioStart: () => Promise<{ ok: boolean; outputRoot: string }>;
  videoStudioStop: () => Promise<{ ok: boolean }>;
  videoStudioStats: () => Promise<import('./videoStudio').VideoStudioStats>;
  videoStudioList: (opts?: { offset?: number; limit?: number }) => Promise<import('./videoStudio').VideoRecord[]>;
  videoStudioGenerate: (params: import('./videoStudio').CreateVideoParams) => Promise<import('./videoStudio').CreateVideoResult>;
  /** Alias for videoStudioGenerate */
  imageStudioCreateVideo: (params: import('./videoStudio').CreateVideoParams) => Promise<import('./videoStudio').CreateVideoResult>;
  videoStudioReveal: (filePath: string) => Promise<{ ok: boolean }>;
  videoStudioOpenFolder: (folderPath?: string) => Promise<{ ok: boolean }>;
  videoStudioOpenViewer: (filePath: string) => Promise<{ ok: boolean }>;
  videoStudioOpenSetup: () => Promise<{ ok: boolean; path: string }>;
  onVideoStudioChanged: (callback: (event: import('./videoStudio').VideoStudioChangeEvent) => void) => () => void;
}
