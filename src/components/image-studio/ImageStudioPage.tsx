import { useCallback, useEffect, useState } from 'react';
import type { GenerateImageParams, ImageRecord, ImageStudioStats } from '../../types/imageStudio';
import { GeneratePanel } from './GeneratePanel';
import { ImageGallery } from './ImageGallery';
import { ImageViewerModal } from './ImageViewerModal';
import { OutputLocationCard } from './OutputLocationCard';

const PAGE_SIZE = 60;

interface ImageStudioPageProps {
  comfyuiHealthy: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onNotify: (message: string | null, error?: string | null) => void;
  onSendToBlacksmith: (prompt: string) => void;
  onOpenAdvanced: () => void;
}

export function ImageStudioPage({
  comfyuiHealthy,
  busy,
  setBusy,
  onNotify,
  onSendToBlacksmith,
  onOpenAdvanced,
}: ImageStudioPageProps) {
  const [stats, setStats] = useState<ImageStudioStats | null>(null);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const refreshStats = useCallback(async () => {
    const s = await window.aiStudio.imageStudioStats();
    setStats({ ...s, comfyuiHealthy });
  }, [comfyuiHealthy]);

  const loadPage = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        const offset = reset ? 0 : images.length;
        const batch = search.trim()
          ? await window.aiStudio.imageStudioSearch(search.trim(), {
              offset,
              limit: PAGE_SIZE,
            })
          : await window.aiStudio.imageStudioList({ offset, limit: PAGE_SIZE });

        setImages((prev) => (reset ? batch : [...prev, ...batch]));
        setHasMore(batch.length >= PAGE_SIZE);
        await refreshStats();
      } finally {
        setLoading(false);
      }
    },
    [images.length, search, refreshStats],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await window.aiStudio.imageStudioStart();
      if (!cancelled) await loadPage(true);
    })();
    const unsub = window.aiStudio.onImageStudioChanged(() => {
      void loadPage(true);
    });
    return () => {
      cancelled = true;
      unsub();
      void window.aiStudio.imageStudioStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadPage(true);
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async (params: GenerateImageParams) => {
    setBusy(true);
    onNotify(null, null);
    try {
      const result = await window.aiStudio.imageStudioGenerate(params);
      onNotify(result.message);
    } catch (err) {
      onNotify(null, err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  };

  const handleImageAction = async (action: string, image: ImageRecord) => {
    onNotify(null, null);
    try {
      switch (action) {
        case 'reveal':
          await window.aiStudio.imageStudioReveal(image.path);
          break;
        case 'folder':
          await window.aiStudio.imageStudioOpenFolder(image.folder);
          break;
        case 'viewer':
          await window.aiStudio.imageStudioOpenViewer(image.path);
          break;
        case 'copy-image':
          await window.aiStudio.imageStudioCopyImage(image.path);
          onNotify('Image copied to clipboard');
          break;
        case 'copy-prompt': {
          const r = await window.aiStudio.imageStudioCopyPrompt(image.path);
          onNotify(r.prompt ? 'Prompt copied' : 'No prompt metadata');
          break;
        }
        case 'upscale': {
          setBusy(true);
          const r = await window.aiStudio.imageStudioUpscale(image.path);
          onNotify(r.message);
          setBusy(false);
          break;
        }
        case 'variations': {
          setBusy(true);
          const r = await window.aiStudio.imageStudioVariations(image.path);
          onNotify(r.message);
          setBusy(false);
          break;
        }
        case 'blacksmith':
          onSendToBlacksmith(
            image.prompt ||
              `Develop this visual concept further: ${image.filename} (${image.resolution || 'unknown resolution'})`,
          );
          break;
        default:
          break;
      }
    } catch (err) {
      onNotify(null, err instanceof Error ? err.message : 'Action failed');
      setBusy(false);
    }
  };

  const handleDelete = async (image: ImageRecord) => {
    try {
      await window.aiStudio.imageStudioDelete(image.path);
      setImages((prev) => prev.filter((i) => i.path !== image.path));
      setViewerIndex(null);
      await refreshStats();
      onNotify('Image moved to trash');
    } catch (err) {
      onNotify(null, err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
      <div className="shrink-0 p-4 space-y-4 border-b border-border-subtle overflow-y-auto max-h-[50vh]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Image Studio</h1>
            <p className="text-xs text-text-muted">AI Studio creates · ComfyUI executes</p>
          </div>
          <div
            className={`text-xs px-3 py-1 rounded-full border ${
              comfyuiHealthy
                ? 'border-success/30 text-success bg-success/10'
                : 'border-danger/30 text-danger bg-danger/10'
            }`}
          >
            ComfyUI {comfyuiHealthy ? 'ready' : 'offline'}
          </div>
        </div>

        <OutputLocationCard
          stats={stats}
          onOpenFolder={() => void window.aiStudio.imageStudioOpenFolder()}
        />

        <GeneratePanel
          comfyuiHealthy={comfyuiHealthy}
          busy={busy}
          onGenerate={handleGenerate}
          onOpenAdvanced={onOpenAdvanced}
        />

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search history — "wolf", "castle", "portrait"…'
          className="w-full rounded-xl border border-border bg-surface-overlay/60 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      <ImageGallery
        images={images}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={() => void loadPage(false)}
        onSelect={setViewerIndex}
        onAction={handleImageAction}
      />

      {viewerIndex != null && (
        <ImageViewerModal
          images={images}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onIndexChange={setViewerIndex}
          onDelete={handleDelete}
          onAction={handleImageAction}
        />
      )}
    </div>
  );
}
