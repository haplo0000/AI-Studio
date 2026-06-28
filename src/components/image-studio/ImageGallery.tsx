import { useEffect, useRef, useState } from 'react';
import type { ImageRecord } from '../../types/imageStudio';

function ThumbnailCell({
  image,
  onClick,
  onAction,
}: {
  image: ImageRecord;
  onClick: () => void;
  onAction: (action: string, image: ImageRecord) => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void window.aiStudio.imageStudioThumbnail(image.path).then((r) => {
            if (r.dataUrl) setThumb(r.dataUrl);
          });
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [image.path]);

  return (
    <div className="group relative aspect-square rounded-xl overflow-hidden border border-border-subtle bg-surface-overlay/40">
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="w-full h-full flex items-center justify-center"
      >
        {thumb ? (
          <img src={thumb} alt={image.filename} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-xs text-text-muted">…</span>
        )}
      </button>
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap gap-1">
        <MiniBtn label="Folder" onClick={() => onAction('folder', image)} />
        <MiniBtn label="Reveal" onClick={() => onAction('reveal', image)} />
        <MiniBtn label="Viewer" onClick={() => onAction('viewer', image)} />
        <MiniBtn label="Edit" onClick={() => onAction('edit', image)} />
        <MiniBtn label="Video" onClick={() => onAction('create-video', image)} />
        <MiniBtn label="Upscale" onClick={() => onAction('upscale', image)} />
        <MiniBtn label="Vary" onClick={() => onAction('variations', image)} />
        <MiniBtn label="Prompt" onClick={() => onAction('copy-prompt', image)} />
        <MiniBtn label="Forge" onClick={() => onAction('blacksmith', image)} />
      </div>
    </div>
  );
}

function MiniBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="px-1.5 py-0.5 rounded text-[10px] bg-white/15 text-white hover:bg-white/25"
    >
      {label}
    </button>
  );
}

interface ImageGalleryProps {
  images: ImageRecord[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelect: (index: number) => void;
  onAction: (action: string, image: ImageRecord) => void;
}

export function ImageGallery({
  images,
  loading,
  hasMore,
  onLoadMore,
  onSelect,
  onAction,
}: ImageGalleryProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) onLoadMore();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (images.length === 0 && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm p-8">
        No images yet — generate something or wait for the gallery to index your output folder.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {images.map((image, i) => (
          <ThumbnailCell
            key={image.path}
            image={image}
            onClick={() => onSelect(i)}
            onAction={onAction}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="h-8 flex items-center justify-center text-xs text-text-muted">
        {loading ? 'Loading…' : hasMore ? '' : 'End of gallery'}
      </div>
    </div>
  );
}
