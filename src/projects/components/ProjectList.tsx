import type { Project, ProjectStatus } from '../types';

interface Props {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewIdea: () => void;
}

const STATUS_BADGE: Record<ProjectStatus, { label: string; style: string }> = {
  active:   { label: 'Active',    style: 'text-accent bg-accent/10 border-accent/20' },
  complete: { label: 'Complete',  style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  stopped:  { label: 'Stopped',   style: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  archived: { label: 'Archived',  style: 'text-text-muted bg-surface-overlay border-border-subtle' },
};

const STAGE_LABEL: Record<string, string> = {
  'intake':           'Intake',
  'executive-review': 'Executive Review',
  'architecture':     'Architecture',
};

function formatRelative(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ProjectList({ projects, selectedId, onSelect, onNewIdea }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-4 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Projects</h2>
          <button
            type="button"
            onClick={onNewIdea}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
          >
            + New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {projects.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-text-muted">No projects yet.</p>
            <button
              type="button"
              onClick={onNewIdea}
              className="mt-3 text-xs text-accent hover:underline"
            >
              Start your first idea →
            </button>
          </div>
        )}

        {projects.map((project) => {
          const badge = STATUS_BADGE[project.status] ?? STATUS_BADGE.active;
          const stageLabel = STAGE_LABEL[project.currentStage] ?? project.currentStage;
          const isSelected = project.id === selectedId;

          return (
            <button
              key={project.id}
              type="button"
              onClick={() => onSelect(project.id)}
              className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${
                isSelected
                  ? 'bg-accent/5 border-accent'
                  : 'border-transparent hover:bg-surface-overlay hover:border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-text-primary leading-snug line-clamp-1">
                  {project.name}
                </p>
                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-medium ${badge.style}`}>
                  {badge.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">{stageLabel}</span>
                <span className="text-[11px] text-text-muted">{formatRelative(project.updatedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
