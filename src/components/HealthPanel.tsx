import type { ServiceHealth } from '../types/studio';
import { ServiceChip } from './ServiceChip';

interface HealthPanelProps {
  services: ServiceHealth[];
  onRefresh: () => void;
  onOpenUrl: (url: string) => void;
}

export function HealthPanel({ services, onRefresh, onOpenUrl }: HealthPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8 animate-fade-in">
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">Health</h1>
            <p className="text-sm text-text-secondary">Service probe results (read-only)</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay"
          >
            Refresh all
          </button>
        </div>

        <div className="space-y-3">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="p-4 rounded-xl border border-border bg-surface-overlay/40 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">{svc.label}</p>
                <p className="text-xs text-text-muted mt-1">{svc.message}</p>
                {svc.url && (
                  <p className="text-xs font-mono text-text-secondary mt-1">{svc.url}</p>
                )}
              </div>
              <ServiceChip
                label={svc.status === 'green' ? 'Healthy' : 'Down'}
                status={svc.status}
                message={svc.message}
                onClick={() => svc.url && onOpenUrl(svc.url)}
              />
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-text-muted">
          Probes: Ollama /api/tags, ComfyUI /system_stats, Council OS HTTP. Auto-refresh every 30s.
        </p>
      </div>
    </div>
  );
}
