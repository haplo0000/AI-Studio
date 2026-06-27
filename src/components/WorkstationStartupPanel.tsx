import { useState } from 'react';
import type { ServiceStatus, WorkstationStatus } from '../types/studio';

interface WorkstationStartupPanelProps {
  status: WorkstationStatus | null;
  busy: boolean;
  onStartService: (serviceId: string) => void;
  onRestartComfyui: () => void;
  onOpenCouncil: () => void;
}

const SERVICE_ROWS = [
  { id: 'ollama', label: 'Ollama' },
  { id: 'comfyui', label: 'ComfyUI' },
  { id: 'council_os', label: 'Council OS' },
] as const;

function rowState(
  id: string,
  status: WorkstationStatus | null,
): 'pending' | 'starting' | 'ready' | 'offline' {
  if (!status) return 'pending';
  const svc = status.services[id];
  if (svc?.status === 'green') return 'ready';
  if (status.activeService === id && status.phase === 'starting') return 'starting';
  if (svc?.status === 'red') return 'offline';
  return 'pending';
}

const ROW_ICONS: Record<ReturnType<typeof rowState>, string> = {
  pending: '○',
  starting: '◌',
  ready: '✓',
  offline: '✕',
};

function councilRowLabel(state: ReturnType<typeof rowState>, workbenchReady: boolean): string {
  if (state === 'ready') return 'Council OS running';
  if (state === 'starting') return 'Starting Council OS…';
  if (workbenchReady) return 'Council OS — open on demand';
  return 'Council OS offline';
}

const ROW_STYLES: Record<ReturnType<typeof rowState>, string> = {
  pending: 'text-text-muted',
  starting: 'text-warning animate-pulse',
  ready: 'text-success',
  offline: 'text-danger',
};

export function WorkstationStartupPanel({
  status,
  busy,
  onStartService,
  onRestartComfyui,
  onOpenCouncil,
}: WorkstationStartupPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const preparing = status?.phase === 'starting';
  const ready = status?.workbenchReady === true;

  if (ready && collapsed) {
    return (
      <div className="shrink-0 border-b border-border-subtle px-4 py-1.5 flex items-center justify-between bg-surface-raised/40">
        <span className="text-xs text-success">Workbench ready</span>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="text-[11px] text-text-muted hover:text-text-primary"
        >
          Services
        </button>
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 border-b border-border-subtle px-4 py-3 ${
        preparing ? 'bg-accent/5' : ready ? 'bg-success/5' : 'bg-surface-raised/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {status?.message || 'Starting services…'}
          </p>
          <ul className="mt-2 space-y-1">
            {SERVICE_ROWS.map(({ id, label }) => {
              const state = rowState(id, status);
              const isCouncilOptional =
                id === 'council_os' && status?.workbenchReady && state === 'offline';
              const rowStyle = isCouncilOptional ? 'text-text-muted' : ROW_STYLES[state];
              const rowText =
                id === 'council_os'
                  ? councilRowLabel(state, status?.workbenchReady === true)
                  : state === 'ready'
                    ? `${label} ready`
                    : state === 'starting'
                      ? `Starting ${label}…`
                      : state === 'offline'
                        ? `${label} offline`
                        : label;
              return (
                <li key={id} className={`text-xs flex items-center gap-2 ${rowStyle}`}>
                  <span className="w-4 text-center font-mono">
                    {isCouncilOptional ? '○' : ROW_ICONS[state]}
                  </span>
                  <span>{rowText}</span>
                </li>
              );
            })}
            <li
              className={`text-xs flex items-center gap-2 ${
                ready ? 'text-success' : 'text-text-muted'
              }`}
            >
              <span className="w-4 text-center font-mono">{ready ? '✓' : '○'}</span>
              <span>Workbench ready</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <ServiceButton
            label="Start Ollama"
            disabled={busy || status?.services.ollama?.status === 'green'}
            onClick={() => onStartService('ollama')}
          />
          <ServiceButton
            label="Start ComfyUI"
            disabled={busy || status?.services.comfyui?.status === 'green'}
            onClick={() => onStartService('comfyui')}
          />
          <ServiceButton
            label="Restart ComfyUI"
            disabled={busy}
            onClick={onRestartComfyui}
          />
          <ServiceButton
            label="Open Council"
            disabled={busy}
            onClick={onOpenCouncil}
          />
          <ServiceButton
            label="Start Council (background)"
            disabled={busy || status?.services.council_os?.status === 'green'}
            onClick={() => onStartService('council_os')}
          />
          {ready && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay"
            >
              Hide
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceButton({
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
      className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay disabled:opacity-40 disabled:pointer-events-none"
    >
      {label}
    </button>
  );
}

export function mergeWorkstationServices(
  current: { id: string; label: string; status: ServiceStatus; message: string; url?: string }[],
  status: WorkstationStatus,
) {
  const byId = status.services;
  return current.map((svc) => {
    const snap = byId[svc.id];
    if (!snap) return svc;
    return { ...svc, status: snap.status, message: snap.message };
  });
}
