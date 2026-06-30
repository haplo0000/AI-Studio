import type { ProjectStage } from '../types';
import { PIPELINE_STAGES } from '../types';

interface Props {
  currentStage: ProjectStage;
  completedStages: ProjectStage[];
}

type StageHealth = 'complete' | 'active' | 'pending' | 'future';

function getStageHealth(
  stageId: ProjectStage,
  currentStage: ProjectStage,
  completedStages: ProjectStage[],
  available: boolean,
): StageHealth {
  if (!available) return 'future';
  if (completedStages.includes(stageId)) return 'complete';
  if (stageId === currentStage) return 'active';
  return 'pending';
}

const HEALTH_STYLES: Record<StageHealth, { dot: string; label: string; badge: string }> = {
  complete: {
    dot: 'bg-emerald-400',
    label: 'text-text-primary',
    badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  active: {
    dot: 'bg-accent animate-pulse',
    label: 'text-text-primary font-medium',
    badge: 'text-accent bg-accent/10 border-accent/20',
  },
  pending: {
    dot: 'bg-border',
    label: 'text-text-secondary',
    badge: 'text-text-muted bg-surface-overlay border-border-subtle',
  },
  future: {
    dot: 'bg-border-subtle',
    label: 'text-text-muted',
    badge: 'text-text-muted/60 bg-surface-overlay/50 border-border-subtle/50',
  },
};

const HEALTH_LABELS: Record<StageHealth, string> = {
  complete: 'Complete',
  active: 'Active',
  pending: 'Pending',
  future: 'Future',
};

export function CompanyHealth({ currentStage, completedStages }: Props) {
  return (
    <div className="space-y-2">
      {PIPELINE_STAGES.map((stage) => {
        const health = getStageHealth(
          stage.id,
          currentStage,
          completedStages,
          stage.available,
        );
        const styles = HEALTH_STYLES[health];

        return (
          <div
            key={stage.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
              health === 'future'
                ? 'opacity-40'
                : 'bg-surface-overlay'
            }`}
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
            <span className="text-sm">{stage.icon}</span>
            <span className={`flex-1 text-xs ${styles.label}`}>{stage.label}</span>
            {health !== 'future' && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${styles.badge}`}
              >
                {HEALTH_LABELS[health]}
              </span>
            )}
            {health === 'future' && (
              <span className="text-[10px] text-text-muted/40">Milestone {stage.milestone}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Derive completed stages from artifact list ────────────────────────────

import type { Artifact } from '../types';

export function deriveCompletedStages(artifacts: Artifact[]): ProjectStage[] {
  const stages: ProjectStage[] = [];
  const types = new Set(artifacts.map((a) => a.artifactType));

  if (types.has('idea-brief')) stages.push('intake');
  if (types.has('decision-package')) stages.push('executive-review');
  if (types.has('blueprint')) stages.push('architecture');

  return stages;
}
