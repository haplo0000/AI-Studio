import type { ModuleManifest, ServiceHealth } from '../types/studio';

interface ModuleSurfaceProps {
  module: ModuleManifest | null;
  services: ServiceHealth[];
  busy: boolean;
  lastMessage: string | null;
  lastError: string | null;
  onLaunch: (moduleId: string) => void;
  onAction: (action: string) => void;
  onOpenUrl: (url: string) => void;
}

function serviceForModule(services: ServiceHealth[], module: ModuleManifest): ServiceHealth | undefined {
  const id = module.health?.serviceId;
  if (!id) return undefined;
  const map: Record<string, string> = {
    ollama: 'ollama',
    comfyui: 'comfyui',
    council_os: 'council_os',
  };
  return services.find((s) => s.id === (map[id] || id));
}

export function ModuleSurface({
  module,
  services,
  busy,
  lastMessage,
  lastError,
  onLaunch,
  onAction,
  onOpenUrl,
}: ModuleSurfaceProps) {
  if (!module) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        Select a module from the left rail.
      </div>
    );
  }

  const depHealth = serviceForModule(services, module);
  const isPlaceholder = module.status === 'placeholder';

  return (
    <div className="flex-1 overflow-y-auto p-8 animate-fade-in">
      <div className="max-w-3xl">
        <div className="mb-6 p-4 rounded-xl border border-warning/30 bg-warning/5">
          <p className="text-sm text-warning font-medium">Read-only module control</p>
          <p className="text-xs text-text-muted mt-1">
            AI Studio launches and monitors external tools. It does not modify Council OS, ComfyUI,
            Stability Matrix, or project repositories.
          </p>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">{module.name}</h1>
        <p className="text-text-secondary mb-6">{module.description}</p>

        {depHealth && (
          <div className="mb-6 p-4 rounded-xl border border-border bg-surface-overlay/40">
            <p className="text-xs text-text-muted mb-1">Service dependency</p>
            <p className="text-sm text-text-primary">
              {depHealth.label}:{' '}
              <span
                className={
                  depHealth.status === 'green'
                    ? 'text-success'
                    : depHealth.status === 'yellow'
                      ? 'text-warning'
                      : 'text-danger'
                }
              >
                {depHealth.message}
              </span>
            </p>
          </div>
        )}

        {isPlaceholder ? (
          <div className="p-6 rounded-xl border border-dashed border-border text-text-muted">
            <p className="font-medium text-text-secondary mb-2">Not implemented (Phase 2A)</p>
            <p className="text-sm">{module.ui?.message || 'This module is a placeholder.'}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <LaunchButton
              label={`Launch ${module.name}`}
              disabled={busy}
              onClick={() => onLaunch(module.id)}
            />

            {module.id === 'image-studio' && (
              <>
                <LaunchButton label="Open ComfyUI in Browser" disabled={busy} onClick={() => onAction('open-comfyui')} />
                <LaunchButton label="Open Stability Matrix" disabled={busy} onClick={() => onAction('stability-matrix')} />
              </>
            )}

            {module.id === 'council-os' && (
              <LaunchButton label="Open Council OS in Browser" disabled={busy} onClick={() => onAction('open-council')} />
            )}

            {module.id === 'coding' && (
              <>
                <LaunchButton label="Launch Council OS" disabled={busy} onClick={() => onLaunch('council-os')} />
                <LaunchButton label="Open Cursor" disabled={busy} onClick={() => onAction('cursor')} />
              </>
            )}

            {(module.id === 'project-foundry' || module.id === 'market-climatology') && (
              <>
                <LaunchButton label="Open Project Folder" disabled={busy} onClick={() => onLaunch(module.id)} />
                <LaunchButton label="Launch Council OS" disabled={busy} onClick={() => onLaunch('council-os')} />
              </>
            )}

            {module.ui?.urlKey && module.id !== 'ollama' && (
              <LaunchButton
                label="Open UI URL"
                disabled={busy}
                onClick={() => {
                  const svc = serviceForModule(services, module);
                  if (svc?.url) onOpenUrl(svc.url);
                }}
              />
            )}
          </div>
        )}

        {lastError && (
          <div className="mt-6 p-4 rounded-xl bg-danger/10 border border-danger/30 text-sm text-danger">
            {lastError}
          </div>
        )}

        {lastMessage && !lastError && (
          <div className="mt-6 p-4 rounded-xl bg-success/10 border border-success/30 text-sm text-success">
            {lastMessage}
          </div>
        )}

        <div className="mt-8 text-xs text-text-muted space-y-1">
          <p>Module ID: {module.id}</p>
          <p>Capabilities: {module.capabilities.join(', ')}</p>
          <p>Surface: {module.ui?.surface || 'n/a'}</p>
        </div>
      </div>
    </div>
  );
}

function LaunchButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-medium shadow-lg shadow-accent/20 transition-all"
    >
      {label}
    </button>
  );
}
