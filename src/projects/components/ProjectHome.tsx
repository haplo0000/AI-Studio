import type { Artifact, Project, ProjectStatus, ProjectStage, TimelineEntry } from '../types';
import { deriveNextAction, PIPELINE_STAGES } from '../types';
import { ArtifactListItem } from './ArtifactListItem';
import { CompanyHealth, deriveCompletedStages } from './CompanyHealth';
import { NextActionBanner } from './NextActionBanner';
import { ProjectTimeline } from './ProjectTimeline';
import type { IdeaLoopSession } from '../../departments/shared/types';
import { loadSession } from '../../departments/shared/storage';

interface Props {
  project: Project;
  artifacts: Artifact[];
  timeline: TimelineEntry[];
  onSelectArtifact: (artifactId: string) => void;
  onContinue: () => void;
}

const STATUS_CHIP: Record<ProjectStatus, { label: string; style: string }> = {
  active:   { label: 'Active',   style: 'text-accent border-accent/30 bg-accent/5' },
  complete: { label: 'Complete', style: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
  stopped:  { label: 'Stopped',  style: 'text-amber-400 border-amber-500/30 bg-amber-500/5' },
  archived: { label: 'Archived', style: 'text-text-muted border-border bg-surface-overlay' },
};

const STAGE_LABEL: Record<ProjectStage, string> = {
  'intake':           'Intake',
  'executive-review': 'Executive Review',
  'architecture':     'Architecture',
  'planning':         'Planning',
  'engineering':      'Engineering',
  'creative':         'Creative',
  'qa':               'Quality Assurance',
  'release':          'Release',
  'memory':           'Institutional Memory',
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-overlay px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
      {sub && <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
      {title}
    </h3>
  );
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProjectHome({ project, artifacts, timeline, onSelectArtifact, onContinue }: Props) {
  // Load session to get exact phase + decision for next action derivation
  const session: IdeaLoopSession | null = loadSession(project.sessionId);
  const phase = session?.phase ?? 'idle';
  const decision = session?.decisionPackage?.decision ?? null;

  const nextAction = deriveNextAction(phase, decision);
  const completedStages = deriveCompletedStages(artifacts);
  const statusChip = STATUS_CHIP[project.status] ?? STATUS_CHIP.active;
  const latestArtifact = [...artifacts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">

        {/* ── Project Header ── */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-text-primary leading-tight">{project.name}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusChip.style}`}>
                {statusChip.label}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full border border-border-subtle text-text-muted bg-surface-overlay">
                {STAGE_LABEL[project.currentStage]}
              </span>
            </div>
          </div>
          <p className="text-xs text-text-muted">Created {formatDate(project.createdAt)}</p>
        </div>

        {/* ── Next Action ── */}
        <div className="space-y-2">
          <SectionHeader title="Next Action" />
          <NextActionBanner action={nextAction} onContinue={onContinue} />
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Current Stage"
            value={STAGE_LABEL[project.currentStage]}
          />
          <StatCard
            label="Documents"
            value={`${artifacts.length} of 3`}
            sub={artifacts.length === 3 ? 'Pipeline complete' : 'In progress'}
          />
          <StatCard
            label="Latest Activity"
            value={latestArtifact?.title ?? 'No documents yet'}
            sub={latestArtifact ? formatDate(latestArtifact.createdAt) : undefined}
          />
        </div>

        {/* ── Purpose + Summary ── */}
        {(project.purpose || project.summary) && (
          <div className="grid grid-cols-2 gap-6">
            {project.purpose && (
              <div className="space-y-2">
                <SectionHeader title="Purpose" />
                <p className="text-sm text-text-secondary leading-relaxed">{project.purpose}</p>
              </div>
            )}
            {project.summary && (
              <div className="space-y-2">
                <SectionHeader title="Executive Summary" />
                <p className="text-sm text-text-secondary leading-relaxed">{project.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Main grid: Documents + Timeline ── */}
        <div className="grid grid-cols-5 gap-6">

          {/* Documents */}
          <div className="col-span-3 space-y-3">
            <SectionHeader title="Documents" />
            {artifacts.length === 0 ? (
              <div className="rounded-xl border border-border-subtle bg-surface-overlay px-4 py-6 text-center">
                <p className="text-sm text-text-muted">No documents produced yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {artifacts.map((artifact) => (
                  <ArtifactListItem
                    key={artifact.id}
                    artifact={artifact}
                    onClick={() => onSelectArtifact(artifact.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="col-span-2 space-y-3">
            <SectionHeader title="Timeline" />
            <ProjectTimeline entries={timeline} />
          </div>
        </div>

        {/* ── Company Health ── */}
        <div className="space-y-3">
          <SectionHeader title="Company Health" />
          <CompanyHealth
            currentStage={project.currentStage}
            completedStages={completedStages}
          />
        </div>

      </div>
    </div>
  );
}
