import type { NextAction } from '../types';

interface Props {
  action: NextAction;
  onContinue?: () => void;
}

const ACTION_STYLES: Record<NextAction['kind'], { bg: string; border: string; button: string }> = {
  'continue-intake': {
    bg: 'bg-accent/5',
    border: 'border-accent/20',
    button: 'bg-accent text-white hover:bg-accent/90',
  },
  'new-idea': {
    bg: 'bg-accent/5',
    border: 'border-accent/20',
    button: 'bg-accent text-white hover:bg-accent/90',
  },
  review: {
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    button: 'bg-blue-500 text-white hover:bg-blue-500/90',
  },
  waiting: {
    bg: 'bg-surface-overlay',
    border: 'border-border-subtle',
    button: '',
  },
  stopped: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    button: '',
  },
};

export function NextActionBanner({ action, onContinue }: Props) {
  const styles = ACTION_STYLES[action.kind];
  const isActionable = action.kind === 'continue-intake' || action.kind === 'new-idea';

  return (
    <div
      className={`rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${styles.bg} ${styles.border}`}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-text-primary">{action.label}</p>
        <p className="text-xs text-text-secondary">{action.description}</p>
      </div>
      {isActionable && onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className={`shrink-0 text-xs px-4 py-2 rounded-lg font-medium transition-colors ${styles.button}`}
        >
          {action.kind === 'continue-intake' ? 'Continue →' : 'Start →'}
        </button>
      )}
    </div>
  );
}
