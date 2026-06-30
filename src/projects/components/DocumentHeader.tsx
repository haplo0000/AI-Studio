import type { Artifact } from '../types';

interface Props {
  artifact: Artifact;
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className="text-xs text-text-secondary">{value}</span>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  final: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  draft: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  superseded: 'text-text-muted bg-surface-overlay border-border-subtle',
};

export function DocumentHeader({ artifact }: Props) {
  const statusStyle =
    STATUS_STYLES[artifact.status] ??
    'text-text-secondary bg-surface-overlay border-border-subtle';

  const formattedDate = new Date(artifact.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="border-b border-border-subtle pb-5 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold text-text-primary">{artifact.title}</h1>
        <span
          className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${statusStyle}`}
        >
          {artifact.status}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-6">
        <MetaField label="Produced By" value={artifact.departmentLabel} />
        <MetaField label="Created" value={formattedDate} />
        <MetaField label="Version" value={artifact.version} />
        <MetaField label="Status" value={artifact.status.charAt(0).toUpperCase() + artifact.status.slice(1)} />
      </div>
    </div>
  );
}
