import { useCallback, useEffect, useState } from 'react';
import type { VideoRecord, VideoStudioStats } from '../../types/videoStudio';
import { VideoGallery } from './VideoGallery';
import { VideoViewerModal } from './VideoViewerModal';

const PAGE_SIZE = 24;

interface VideoStudioSectionProps {
  onNotify: (message: string | null, error?: string | null) => void;
}

export function VideoStudioSection({ onNotify }: VideoStudioSectionProps) {
  const [stats, setStats] = useState<VideoStudioStats | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(true);

  const refreshStats = useCallback(async () => {
    const s = await window.aiStudio.videoStudioStats();
    setStats(s);
  }, []);

  const loadPage = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        const offset = reset ? 0 : videos.length;
        const batch = await window.aiStudio.videoStudioList({ offset, limit: PAGE_SIZE });
        setVideos((prev) => (reset ? batch : [...prev, ...batch]));
        setHasMore(batch.length >= PAGE_SIZE);
        await refreshStats();
      } finally {
        setLoading(false);
      }
    },
    [videos.length, refreshStats],
  );

  useEffect(() => {
    void window.aiStudio.videoStudioStart();
    void loadPage(true);
    const unsub = window.aiStudio.onVideoStudioChanged(() => {
      void loadPage(true);
    });
    return () => {
      unsub();
      void window.aiStudio.videoStudioStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVideoAction = async (action: string, video: VideoRecord) => {
    onNotify(null, null);
    try {
      switch (action) {
        case 'reveal':
          await window.aiStudio.videoStudioReveal(video.path);
          break;
        case 'folder':
          await window.aiStudio.videoStudioOpenFolder(video.folder);
          break;
        case 'viewer':
          await window.aiStudio.videoStudioOpenViewer(video.path);
          break;
        default:
          break;
      }
    } catch (err) {
      onNotify(null, err instanceof Error ? err.message : 'Video action failed');
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full p-3 rounded-xl border border-border bg-surface-overlay/40 text-sm text-text-secondary hover:text-text-primary text-left"
      >
        Video Studio {stats ? `(${stats.count} videos)` : ''}
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-surface-overlay/40 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Video Studio</h2>
          <p className="text-[11px] text-text-muted">
            Image-to-video · {stats?.outputRoot || 'C:\\AI\\StabilityMatrix\\Data\\Videos'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void window.aiStudio.videoStudioOpenFolder()}
            className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-surface-overlay"
          >
            Open Folder
          </button>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Collapse
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-text-muted">
        <span className="px-2 py-1 rounded border border-border/50">Text-to-video — coming soon</span>
        <span className="px-2 py-1 rounded border border-border/50">Video-to-video — coming soon</span>
        <span className="px-2 py-1 rounded border border-border/50">Upscale video — coming soon</span>
        <span className="px-2 py-1 rounded border border-border/50">Extend video — coming soon</span>
      </div>

      <VideoGallery
        videos={videos}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={() => void loadPage(false)}
        onPlay={setViewerIndex}
        onAction={handleVideoAction}
      />

      {viewerIndex != null && (
        <VideoViewerModal
          videos={videos}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onIndexChange={setViewerIndex}
          onAction={handleVideoAction}
        />
      )}
    </div>
  );
}
