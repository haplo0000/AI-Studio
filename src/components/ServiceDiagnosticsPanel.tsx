import type { ServiceDiagnostic } from '../types/studio';
import { ServiceChip } from './ServiceChip';

interface ServiceDiagnosticsPanelProps {
  diagnostics: ServiceDiagnostic[];
  busy: boolean;
  onRefresh: () => void;
  onRestart: (serviceId: string) => void;
  onOpenUrl: (url: string) => void;
}

function healthLabel(health: ServiceDiagnostic['health']) {
  if (health === 'healthy') return 'Healthy';
  if (health === 'unhealthy') return 'Unhealthy';
  return 'Unknown';
}

export function ServiceDiagnosticsPanel({
  diagnostics,
  busy,
  onRefresh,
  onRestart,
  onOpenUrl,
}: ServiceDiagnosticsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8 animate-fade-in">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">Service Diagnostics</h1>
            <p className="text-sm text-text-secondary">
              Workstation Service Manager — PID, port, health, and restart controls
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay disabled:opacity-40"
          >
            Refresh
          </button>
        </div>

        <div className="space-y-4">
          {diagnostics.map((svc) => (
            <div
              key={svc.id}
              className="p-4 rounded-xl border border-border bg-surface-overlay/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-sm font-semibold text-text-primary">{svc.label}</p>
                    <ServiceChip
                      label={healthLabel(svc.health)}
                      status={svc.status}
                      message={svc.message}
                      onClick={() => svc.url && onOpenUrl(svc.url)}
                    />
                    {svc.autoStart === false && (
                      <span className="text-[10px] uppercase tracking-wide text-text-muted border border-border rounded px-1.5 py-0.5">
                        On demand
                      </span>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="text-text-muted">Port</dt>
                      <dd className="font-mono text-text-primary">{svc.port ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">PID</dt>
                      <dd className="font-mono text-text-primary">{svc.pid ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Status</dt>
                      <dd className="text-text-primary capitalize">{svc.status}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Health</dt>
                      <dd className="text-text-primary capitalize">{svc.health}</dd>
                    </div>
                  </dl>

                  <p className="text-xs text-text-muted mt-2">{svc.message}</p>
                  {svc.url && (
                    <p className="text-xs font-mono text-text-secondary mt-1">{svc.url}</p>
                  )}
                  {svc.lastError && (
                    <p className="text-xs text-danger mt-2 font-mono break-all">
                      Last error: {svc.lastError}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRestart(svc.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay disabled:opacity-40 shrink-0"
                >
                  Restart
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-text-muted">
          Auto-start on boot: Ollama, ComfyUI. Council OS starts on demand. Browser opens only after
          HTTP health check passes.
        </p>
      </div>
    </div>
  );
}
