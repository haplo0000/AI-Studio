import type { Artifact, ArtifactType } from '../types';

interface Props {
  artifact: Artifact;
  onClick: () => void;
}

const TYPE_CONFIG: Record<ArtifactType, { icon: string; color: string }> = {
  'idea-brief':        { icon: '📋', color: 'text-blue-400' },
  'decision-package':  { icon: '⚖️', color: 'text-purple-400' },
  'blueprint':         { icon: '🏗️', color: 'text-orange-400' },
};

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ArtifactListItem({ artifact, onClick }: Props) {
  const config = TYPE_CONFIG[artifact.artifactType] ?? { icon: '📄', color: 'text-text-muted' };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-xl border border-border-subtle bg-surface-overlay hover:bg-surface-raised hover:border-accent/30 transition-all group"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg shrink-0 mt-0.5">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${config.color} group-hover:text-text-primary transition-colors`}>
              {artifact.title}
            </p>
            <span className="text-[11px] text-text-muted shrink-0">{formatDate(artifact.createdAt)}</span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">{artifact.departmentLabel}</p>
          {artifact.summary && (
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">{artifact.summary}</p>
          )}
        </div>
        <span className="text-text-muted/40 group-hover:text-text-muted text-xs mt-1 shrink-0">→</span>
      </div>
    </button>
  );
}
