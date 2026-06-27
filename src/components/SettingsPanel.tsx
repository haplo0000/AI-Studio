import type { StudioSettings, WorkshopEntry } from '../types/studio';

interface SettingsPanelProps {
  settings: StudioSettings;
  runtimeNote: string;
  workshops?: WorkshopEntry[];
  currentWorkshopId?: string | null;
  onAction: (action: string) => void;
}

export function SettingsPanel({
  settings,
  runtimeNote,
  workshops = [],
  currentWorkshopId,
  onAction,
}: SettingsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8 animate-fade-in">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Settings</h1>
        <p className="text-text-secondary mb-6">
          Hub configuration at C:\AI\AIStudio\config\settings.yaml. Workshops remain external — AI
          Studio stores metadata and launch paths only.
        </p>

        <div className="mb-6 p-4 rounded-xl border border-border bg-surface-overlay/40">
          <p className="text-xs text-text-muted mb-2">Runtime</p>
          <p className="text-sm text-text-secondary">{runtimeNote}</p>
        </div>

        {settings.blacksmith?.model && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Blacksmith</h2>
            <p className="text-sm text-text-secondary">
              Ollama model: <code className="font-mono">{settings.blacksmith.model}</code>
            </p>
          </section>
        )}

        {workshops.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Workshops</h2>
            <p className="text-xs text-text-muted mb-3">
              Current context: {currentWorkshopId || '(none)'}
            </p>
            <dl className="space-y-3 text-sm">
              {workshops.map((workshop) => (
                <div
                  key={workshop.id}
                  className="p-3 rounded-xl border border-border bg-surface-overlay/30"
                >
                  <dt className="font-medium text-text-primary">{workshop.name}</dt>
                  <dd className="text-text-muted text-xs mt-1">{workshop.description}</dd>
                  <dd className="text-text-secondary font-mono text-xs mt-2 break-all">
                    {workshop.repository_path || '(not configured)'}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Paths</h2>
          <dl className="space-y-2 text-sm">
            {Object.entries(settings.paths || {}).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[180px_1fr] gap-2">
                <dt className="text-text-muted">{key}</dt>
                <dd className="text-text-secondary font-mono break-all">{value || '(not set)'}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Services</h2>
          <dl className="space-y-2 text-sm">
            {Object.entries(settings.services || {}).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[180px_1fr] gap-2">
                <dt className="text-text-muted">{key}</dt>
                <dd className="text-text-secondary font-mono">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onAction('open-hub-config')}
            className="px-4 py-2 rounded-xl border border-border text-sm text-text-secondary hover:bg-surface-overlay"
          >
            Open Config Folder
          </button>
          <button
            type="button"
            onClick={() => onAction('open-hub-logs')}
            className="px-4 py-2 rounded-xl border border-border text-sm text-text-secondary hover:bg-surface-overlay"
          >
            Open Logs Folder
          </button>
        </div>
      </div>
    </div>
  );
}
