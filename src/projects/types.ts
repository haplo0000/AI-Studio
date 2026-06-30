import type { Blueprint, DecisionPackage, IdeaBrief } from '../departments/shared/types';

// ─── Artifact ─────────────────────────────────────────────────────────────────

export type ArtifactType = 'idea-brief' | 'decision-package' | 'blueprint';

export type ArtifactStatus = 'draft' | 'final' | 'superseded';

export interface Artifact {
  id: string;
  projectId: string;
  artifactType: ArtifactType;
  title: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  status: ArtifactStatus;
  department: string;
  departmentLabel: string;
  summary: string;
  content: IdeaBrief | DecisionPackage | Blueprint;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export type TimelineEvent =
  | 'project-started'
  | 'artifact-produced'
  | 'decision-made'
  | 'pipeline-stopped'
  | 'pipeline-complete';

export interface TimelineEntry {
  id: string;
  projectId: string;
  event: TimelineEvent;
  title: string;
  description: string;
  ts: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'complete' | 'stopped' | 'archived';

export type ProjectStage =
  | 'intake'
  | 'executive-review'
  | 'architecture'
  | 'planning'
  | 'engineering'
  | 'creative'
  | 'qa'
  | 'release'
  | 'memory';

export interface Project {
  id: string;
  sessionId: string;
  name: string;
  purpose: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  currentStage: ProjectStage;
  artifactIds: string[];
}

// ─── Stage metadata (for display) ────────────────────────────────────────────

export interface StageInfo {
  id: ProjectStage;
  label: string;
  department: string;
  icon: string;
  milestone: 1 | 2 | 3 | 4 | 5 | 6;
  available: boolean;
}

export const PIPELINE_STAGES: StageInfo[] = [
  { id: 'intake',           label: 'Intake',               department: 'Intake',               icon: '📋', milestone: 1, available: true  },
  { id: 'executive-review', label: 'Executive Review',     department: 'Executive Board',       icon: '⚖️', milestone: 1, available: true  },
  { id: 'architecture',     label: 'Architecture',         department: 'Architect',             icon: '🏗️', milestone: 1, available: true  },
  { id: 'planning',         label: 'Planning',             department: 'Product',               icon: '📅', milestone: 2, available: false },
  { id: 'engineering',      label: 'Engineering',          department: 'Engineering',           icon: '⚙️', milestone: 4, available: false },
  { id: 'creative',         label: 'Creative',             department: 'Creative',              icon: '🎨', milestone: 5, available: false },
  { id: 'qa',               label: 'Quality Assurance',    department: 'QA',                    icon: '✅', milestone: 5, available: false },
  { id: 'release',          label: 'Release',              department: 'Operations',            icon: '🚀', milestone: 5, available: false },
  { id: 'memory',           label: 'Institutional Memory', department: 'Institutional Memory',  icon: '🧠', milestone: 6, available: false },
];

// ─── Next action derivation ───────────────────────────────────────────────────

import type { IdeaLoopPhase } from '../departments/shared/types';
import type { DecisionOutcome } from '../departments/shared/types';

export interface NextAction {
  label: string;
  description: string;
  kind: 'continue-intake' | 'new-idea' | 'review' | 'waiting' | 'stopped';
}

export function deriveNextAction(
  phase: IdeaLoopPhase,
  decision?: DecisionOutcome | null,
): NextAction {
  switch (phase) {
    case 'idle':
      return { label: 'Start Intake', description: 'Begin the intake interview to define this project.', kind: 'continue-intake' };
    case 'intake':
      return { label: 'Continue Intake', description: 'The intake interview is in progress. Continue the conversation.', kind: 'continue-intake' };
    case 'brief-ready':
    case 'executive-review':
      return { label: 'Awaiting Review', description: 'The Executive Board is reviewing the Idea Brief.', kind: 'waiting' };
    case 'decision-ready':
      if (decision === 'Build Now' || decision === 'Prototype') {
        return { label: 'Awaiting Blueprint', description: 'Architecture is designing the Blueprint.', kind: 'waiting' };
      }
      if (decision === 'Research Further') {
        return { label: 'Research Required', description: 'Review the open questions in the Decision Package before proceeding.', kind: 'review' };
      }
      if (decision === 'Delay') {
        return { label: 'On Hold', description: 'Review the Decision Package for the recommended timing.', kind: 'stopped' };
      }
      return { label: 'Not Proceeding', description: 'Review the Decision Package for the reasoning.', kind: 'stopped' };
    case 'architecture':
      return { label: 'Blueprint In Progress', description: 'The Architect is producing the Blueprint.', kind: 'waiting' };
    case 'complete':
      return { label: 'Review Blueprint', description: 'All three documents have been produced. Review the Blueprint.', kind: 'review' };
    case 'stopped':
      if (decision === 'Research Further') {
        return { label: 'Research Required', description: 'Resolve the open questions, then restart the intake interview.', kind: 'stopped' };
      }
      if (decision === 'Delay') {
        return { label: 'Project On Hold', description: 'Review the Decision Package for recommended timing.', kind: 'stopped' };
      }
      return { label: 'Not Proceeding', description: 'The project has been stopped. Review the Decision Package.', kind: 'stopped' };
    case 'error':
      return { label: 'Retry Required', description: 'The pipeline encountered an error. Continue the intake interview to retry.', kind: 'continue-intake' };
    default:
      return { label: 'Open Project', description: 'Continue working on this project.', kind: 'continue-intake' };
  }
}
