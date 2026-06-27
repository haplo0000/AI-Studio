import type { WorkshopEntry } from '../types/studio';

const STATUS_LABELS: Record<WorkshopEntry['status'], string> = {
  active: 'Active',
  placeholder: 'Placeholder',
  unconfigured: 'Not configured',
};

const STATUS_STYLES: Record<WorkshopEntry['status'], string> = {
  active: 'text-success bg-success/10 border-success/30',
  placeholder: 'text-text-muted bg-surface-overlay border-border',
  unconfigured: 'text-warning bg-warning/10 border-warning/30',
};

interface WorkshopCardProps {
  workshop: WorkshopEntry;
  isCurrent: boolean;
  busy?: boolean;
  onSelect: () => void;
  onOpenFolder: () => void;
  onOpenInCursor: () => void;
}

export function WorkshopCard({
  workshop,
  isCurrent,
  busy,
  onSelect,
  onOpenFolder,
  onOpenInCursor,
}: WorkshopCardProps) {
  const hasPath = Boolean(workshop.repository_path);

  return (
    <article
      className={`p-5 rounded-xl border transition-all ${
        isCurrent
          ? 'border-accent/40 bg-accent/5 ring-1 ring-accent/20'
          : 'border-border bg-surface-overlay/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onSelect}
            className="text-left group"
            title="Set as current workshop context"
          >
            <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors">
              {workshop.name}
              {isCurrent && (
                <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-accent">
                  Current
                </span>
              )}
            </h3>
          </button>
          <p className="text-sm text-text-secondary mt-1">{workshop.description}</p>
        </div>
        <span
          className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border ${STATUS_STYLES[workshop.status]}`}
        >
          {STATUS_LABELS[workshop.status]}
        </span>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-surface-raised/80 border border-border-subtle">
        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Repository path</p>
        <p className="text-xs font-mono text-text-secondary break-all">
          {workshop.repository_path || '(not configured)'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton
          label="Open Folder"
          disabled={busy || !hasPath}
          onClick={onOpenFolder}
          title={hasPath ? undefined : 'Configure repository path in settings.yaml'}
        />
        <ActionButton
          label="Open in Cursor"
          disabled={busy || !hasPath}
          onClick={onOpenInCursor}
          title={hasPath ? undefined : 'Configure repository path in settings.yaml'}
        />
      </div>
    </article>
  );
}

export function AddWorkshopCard() {
  return (
    <article className="p-5 rounded-xl border border-dashed border-border bg-surface-overlay/20 flex flex-col items-center justify-center text-center min-h-[200px]">
      <span className="text-3xl mb-2 opacity-50">＋</span>
      <h3 className="text-sm font-semibold text-text-secondary mb-1">Add Workshop</h3>
      <p className="text-xs text-text-muted max-w-xs">
        Add an entry under <code className="text-text-secondary">workshops.entries</code> in{' '}
        <code className="text-text-secondary">settings.yaml</code>. Workshops are independent
        creations — AI Studio stores metadata only.
      </p>
    </article>
  );
}

function ActionButton({
  label,
  disabled,
  title,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 bg-accent hover:bg-accent-hover text-white shadow-accent/20"
    >
      {label}
    </button>
  );
}
