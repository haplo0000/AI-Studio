import type { TimelineEntry } from '../types';

interface Props {
  entries: TimelineEntry[];
}

const EVENT_STYLES: Record<string, { dot: string; icon: string }> = {
  'project-started':   { dot: 'bg-text-muted',    icon: '○' },
  'artifact-produced': { dot: 'bg-accent',         icon: '●' },
  'decision-made':     { dot: 'bg-purple-400',     icon: '●' },
  'pipeline-complete': { dot: 'bg-emerald-400',    icon: '●' },
  'pipeline-stopped':  { dot: 'bg-amber-400',      icon: '●' },
};

function formatRelative(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ProjectTimeline({ entries }: Props) {
  if (!entries.length) {
    return (
      <div className="text-xs text-text-muted italic">No activity yet.</div>
    );
  }

  const sorted = [...entries].sort((a, b) => b.ts.localeCompare(a.ts));

  return (
    <div className="relative">
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border-subtle" />
      <ul className="space-y-4">
        {sorted.map((entry) => {
          const style = EVENT_STYLES[entry.event] ?? { dot: 'bg-text-muted', icon: '●' };
          return (
            <li key={entry.id} className="pl-6 relative">
              <div
                className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-surface-raised ${style.dot}`}
              />
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-medium text-text-primary">{entry.title}</p>
                <span className="text-[11px] text-text-muted shrink-0">
                  {formatRelative(entry.ts)}
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">{entry.description}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
