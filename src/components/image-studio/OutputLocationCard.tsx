import type { ImageStudioStats } from '../../types/imageStudio';

function formatBytes(bytes: number | null) {
  if (bytes == null) return '—';
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(1)} GB`;
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

interface OutputLocationCardProps {
  stats: ImageStudioStats | null;
  onOpenFolder: () => void;
}

export function OutputLocationCard({ stats, onOpenFolder }: OutputLocationCardProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-surface-overlay/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-2">
        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Output folder</p>
        <p className="text-xs font-mono text-text-secondary break-all">
          {stats?.outputFolder || '—'}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Free disk space</p>
        <p className="text-sm text-text-primary">{formatBytes(stats?.freeDiskBytes ?? null)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Today</p>
        <p className="text-sm text-text-primary">
          {stats?.imagesToday ?? 0} image{stats?.imagesToday === 1 ? '' : 's'}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Last image</p>
        <p className="text-xs text-text-secondary">{formatTime(stats?.lastImageTime ?? null)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Indexed</p>
        <p className="text-sm text-text-primary">{stats?.totalImages ?? 0} total</p>
      </div>
      <div className="flex items-end gap-2 lg:col-span-3">
        <button
          type="button"
          onClick={onOpenFolder}
          className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium"
        >
          Open Folder
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="px-4 py-2 rounded-xl border border-border text-text-muted text-xs opacity-50 cursor-not-allowed"
        >
          Change Folder
        </button>
      </div>
    </div>
  );
}
