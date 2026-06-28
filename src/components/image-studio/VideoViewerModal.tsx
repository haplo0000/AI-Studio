import { useEffect } from 'react';
import type { VideoRecord } from '../../types/videoStudio';

interface VideoViewerModalProps {
  videos: VideoRecord[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onAction: (action: string, video: VideoRecord) => void;
}

export function VideoViewerModal({
  videos,
  index,
  onClose,
  onIndexChange,
  onAction,
}: VideoViewerModalProps) {
  const video = videos[index];
  const src = video ? window.aiStudio.getMediaUrl(video.path) : '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (e.key === 'ArrowRight' && index < videos.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, videos.length, onClose, onIndexChange]);

  if (!video) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="min-w-0">
          <p className="text-sm text-white font-medium truncate">{video.filename}</p>
          {video.prompt && (
            <p className="text-xs text-white/60 truncate max-w-xl" title={video.prompt}>
              {video.prompt}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/70 hover:text-white px-3 py-1 text-sm"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 p-4">
        <video
          key={video.path}
          src={src}
          controls
          autoPlay
          className="max-w-full max-h-full rounded-lg"
        />
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-white/10 flex flex-wrap items-center gap-2">
        <ViewerBtn label="← Prev" disabled={index <= 0} onClick={() => onIndexChange(index - 1)} />
        <ViewerBtn
          label="Next →"
          disabled={index >= videos.length - 1}
          onClick={() => onIndexChange(index + 1)}
        />
        <ViewerBtn label="Reveal" onClick={() => onAction('reveal', video)} />
        <ViewerBtn label="Open Folder" onClick={() => onAction('folder', video)} />
        <span className="text-xs text-white/40 ml-auto">
          {index + 1} / {videos.length}
        </span>
      </div>
    </div>
  );
}

function ViewerBtn({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs border border-white/20 text-white/80 hover:bg-white/10 disabled:opacity-30"
    >
      {label}
    </button>
  );
}
