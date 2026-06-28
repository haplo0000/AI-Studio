import type { VideoRecord } from '../../types/videoStudio';

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function VideoCard({
  video,
  onPlay,
  onAction,
}: {
  video: VideoRecord;
  onPlay: () => void;
  onAction: (action: string, video: VideoRecord) => void;
}) {
  const src = window.aiStudio.getMediaUrl(video.path);

  return (
    <div className="group relative aspect-video rounded-xl overflow-hidden border border-border-subtle bg-surface-overlay/40">
      <button type="button" onClick={onPlay} className="w-full h-full relative">
        <video
          src={src}
          preload="metadata"
          muted
          className="w-full h-full object-cover"
          onLoadedData={(e) => {
            const el = e.currentTarget;
            el.currentTime = Math.min(0.5, el.duration || 0);
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg">
            ▶
          </span>
        </span>
      </button>
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-white truncate mb-1" title={video.prompt || video.filename}>
          {video.prompt || video.filename}
        </p>
        <div className="flex flex-wrap gap-1">
          <MiniBtn label="Play" onClick={() => onPlay()} />
          <MiniBtn label="Folder" onClick={() => onAction('folder', video)} />
          <MiniBtn label="Reveal" onClick={() => onAction('reveal', video)} />
        </div>
      </div>
      <div className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-white">
        {video.duration ? `${video.duration}s` : formatBytes(video.size)}
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

interface VideoGalleryProps {
  videos: VideoRecord[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onPlay: (index: number) => void;
  onAction: (action: string, video: VideoRecord) => void;
}

export function VideoGallery({
  videos,
  loading,
  hasMore,
  onLoadMore,
  onPlay,
  onAction,
}: VideoGalleryProps) {
  if (videos.length === 0 && !loading) {
    return (
      <p className="text-xs text-text-muted py-4 text-center">
        No videos yet — use Create Video on any gallery image to generate your first clip.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {videos.map((video, i) => (
          <VideoCard key={video.path} video={video} onPlay={() => onPlay(i)} onAction={onAction} />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center pt-3">
          <button
            type="button"
            disabled={loading}
            onClick={onLoadMore}
            className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-primary disabled:opacity-40"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
