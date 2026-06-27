import type { ModuleManifest, ServiceHealth } from '../types/studio';

interface LaunchersPanelProps {
  modules: ModuleManifest[];
  services: ServiceHealth[];
  busy: boolean;
  lastMessage: string | null;
  lastError: string | null;
  onLaunch: (moduleId: string) => void;
  onAction: (action: string) => void;
}

const LAUNCHER_MODULES = [
  'council-os',
  'image-studio',
  'coding',
  'ollama',
] as const;

export function LaunchersPanel({
  modules,
  services,
  busy,
  lastMessage,
  lastError,
  onLaunch,
  onAction,
}: LaunchersPanelProps) {
  const launchers = modules.filter((m) => LAUNCHER_MODULES.includes(m.id as typeof LAUNCHER_MODULES[number]));

  return (
    <div className="flex-1 overflow-y-auto p-8 animate-fade-in">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Launchers</h1>
        <p className="text-text-secondary mb-6 text-sm">
          Direct launch actions for external tools. AI Studio orchestrates — it does not modify them.
        </p>

        <div className="space-y-4">
          {launchers.map((mod) => {
            const serviceId = mod.health?.serviceId;
            const dep = serviceId ? services.find((s) => s.id === serviceId) : undefined;

            return (
              <div
                key={mod.id}
                className="p-4 rounded-xl border border-border bg-surface-overlay/40"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-text-primary">{mod.name}</h2>
                    <p className="text-xs text-text-muted mt-1">{mod.description}</p>
                  </div>
                  {dep && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        dep.status === 'green'
                          ? 'text-success border-success/30 bg-success/10'
                          : 'text-danger border-danger/30 bg-danger/10'
                      }`}
                    >
                      {dep.label}: {dep.message}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <LauncherButton
                    label={`Launch ${mod.name}`}
                    disabled={busy || mod.status === 'placeholder'}
                    onClick={() => onLaunch(mod.id)}
                  />
                  {mod.id === 'image-studio' && (
                    <>
                      <LauncherButton
                        label="Open ComfyUI"
                        disabled={busy}
                        onClick={() => onAction('open-comfyui')}
                      />
                      <LauncherButton
                        label="Stability Matrix"
                        disabled={busy}
                        onClick={() => onAction('stability-matrix')}
                      />
                    </>
                  )}
                  {mod.id === 'council-os' && (
                    <LauncherButton
                      label="Open in Browser"
                      disabled={busy}
                      onClick={() => onAction('open-council')}
                    />
                  )}
                  {mod.id === 'coding' && (
                    <>
                      <LauncherButton
                        label="Launch Council OS"
                        disabled={busy}
                        onClick={() => onLaunch('council-os')}
                      />
                      <LauncherButton
                        label="Open Cursor"
                        disabled={busy}
                        onClick={() => onAction('cursor')}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

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
      </div>
    </div>
  );
}

function LauncherButton({
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
      className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs font-medium transition-all"
    >
      {label}
    </button>
  );
}
