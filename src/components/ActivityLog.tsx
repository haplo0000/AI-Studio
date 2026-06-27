import type { LogEntry } from '../types/studio';

interface ActivityLogProps {
  logs: LogEntry[];
  error?: string | null;
  onRefresh: () => void;
}

function formatTime(ts: string) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}

const LEVEL_COLOR: Record<string, string> = {
  error: 'text-danger',
  warn: 'text-warning',
  info: 'text-text-secondary',
};

export function ActivityLog({ logs, error, onRefresh }: ActivityLogProps) {
  return (
    <aside className="flex flex-col h-full border-l border-border-subtle bg-surface-raised/50">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Activity Log</h2>
          <p className="text-xs text-text-muted">C:\AI\AIStudio\logs\studio.log</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs px-2 py-1 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-overlay"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="m-3 p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-text-muted text-center py-8">No activity yet.</p>
        ) : (
          logs.map((entry, i) => (
            <div key={`${entry.ts}-${i}`} className="rounded-lg border border-border-subtle bg-surface-overlay/40 p-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-text-muted">{formatTime(entry.ts)}</span>
                <span className={LEVEL_COLOR[entry.level] || 'text-text-secondary'}>{entry.level}</span>
                <span className="text-text-muted">{entry.source}</span>
              </div>
              <p className="text-text-secondary break-words">{entry.message}</p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
