import type { WorkstationStatus } from '../types/studio';
import {
  isCouncilOptionalRow,
  rowIcon,
  rowState,
  splashRowClass,
  splashRowLabel,
} from '../lib/workstationRows';

const SPLASH_ROWS = [
  { id: 'ollama', label: 'Ollama' },
  { id: 'comfyui', label: 'ComfyUI' },
  { id: 'council_os', label: 'Council' },
] as const;

interface StartupSplashProps {
  status: WorkstationStatus | null;
  fading: boolean;
}

export function StartupSplash({ status, fading }: StartupSplashProps) {
  const workbenchReady = status?.workbenchReady === true;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f17] transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-sm px-8 text-center">
        <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-accent flex items-center justify-center text-2xl shadow-lg shadow-accent/20">
          🔨
        </div>

        <h1 className="text-2xl font-bold text-text-primary tracking-tight">AI Studio</h1>
        <p className="mt-2 text-sm text-text-muted">Preparing Workstation…</p>

        <ul className="mt-8 space-y-3 text-left">
          {SPLASH_ROWS.map(({ id, label }) => {
            const state = rowState(id, status);
            const councilOptional = isCouncilOptionalRow(id, status);
            return (
              <li
                key={id}
                className={`flex items-center gap-3 text-sm ${splashRowClass(id, status)}`}
              >
                <span className="w-5 text-center font-mono text-base">
                  {rowIcon(state, councilOptional)}
                </span>
                <span>{splashRowLabel(id, label, status)}</span>
              </li>
            );
          })}
          <li
            className={`flex items-center gap-3 text-sm pt-2 border-t border-border-subtle ${
              workbenchReady ? 'text-success' : 'text-text-muted'
            }`}
          >
            <span className="w-5 text-center font-mono text-base">{workbenchReady ? '✓' : '○'}</span>
            <span className="font-medium">Workbench Ready</span>
          </li>
        </ul>

        {!workbenchReady && (
          <div className="mt-8 flex justify-center">
            <span className="inline-block h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
