import type { GenerationJobState, GenerationJobStatus } from '../../types/imageStudio';

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function statusLabel(status: GenerationJobStatus) {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'running':
      return 'Running';
    case 'saving':
      return 'Saving';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Error';
    default:
      return status;
  }
}

function statusClass(status: GenerationJobStatus) {
  switch (status) {
    case 'complete':
      return 'text-success';
    case 'error':
      return 'text-danger';
    case 'running':
    case 'saving':
      return 'text-accent';
    default:
      return 'text-text-muted';
  }
}

interface GenerationProgressProps {
  jobs: GenerationJobState[];
  now: number;
}

export function GenerationProgress({ jobs, now }: GenerationProgressProps) {
  if (jobs.length === 0) return null;

  return (
    <div className="p-3 rounded-xl border border-border bg-surface-overlay/40 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Generation progress
        </h3>
        <span className="text-[10px] text-text-muted">
          {jobs.filter((j) => j.status !== 'complete' && j.status !== 'error').length} active
        </span>
      </div>

      {jobs.map((job) => {
        const elapsedMs = (job.completedAt ?? now) - job.startedAt;
        const isActive = job.status === 'queued' || job.status === 'running' || job.status === 'saving';

        return (
          <div key={job.id} className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-primary truncate" title={job.label}>
                  {job.label}
                </p>
                <p className="text-xs text-text-secondary">{job.phase}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-[10px] font-medium uppercase ${statusClass(job.status)}`}>
                  {statusLabel(job.status)}
                </p>
                <p className="text-[10px] text-text-muted">{formatElapsed(elapsedMs)}</p>
              </div>
            </div>

            {job.error && <p className="text-xs text-danger">{job.error}</p>}

            {job.progress != null ? (
              <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            ) : isActive ? (
              <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-accent/80 rounded-full animate-pulse" />
              </div>
            ) : job.status === 'complete' ? (
              <div className="h-1.5 rounded-full bg-success/30 overflow-hidden">
                <div className="h-full w-full bg-success/70" />
              </div>
            ) : null}

            {isActive && job.progress == null && (
              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                <span className="inline-block h-3 w-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Working…
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
