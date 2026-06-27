import type {
  GenerateImageParams,
  GenerateImageResult,
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
  imageStudioVariations: (filePath: string) => Promise<{ ok: boolean; message: string }>;
  imageStudioUpscale: (filePath: string) => Promise<{ ok: boolean; message: string }>;
  imageStudioGetImage: (filePath: string) => Promise<ImageRecord | null>;
  getMediaUrl: (filePath: string) => string;
  onImageStudioChanged: (callback: (event: ImageStudioChangeEvent) => void) => () => void;
}
