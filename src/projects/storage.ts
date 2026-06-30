import type { Blueprint, DecisionPackage, IdeaBrief, IdeaLoopSession } from '../departments/shared/types';
import { loadAllSessions } from '../departments/shared/storage';
import type {
  Artifact,
  ArtifactType,
  Project,
  ProjectStage,
  ProjectStatus,
  TimelineEntry,
} from './types';

// ─── Storage keys ─────────────────────────────────────────────────────────────

const PROJECTS_INDEX_KEY = 'studio:projects';
const projectKey = (id: string) => `studio:project:${id}`;
const artifactsKey = (projectId: string) => `studio:artifacts:${projectId}`;
const timelineKey = (projectId: string) => `studio:timeline:${projectId}`;

// ─── Project CRUD ─────────────────────────────────────────────────────────────

export function saveProject(project: Project): void {
  localStorage.setItem(projectKey(project.id), JSON.stringify(project));
  const ids = loadProjectIds();
  if (!ids.includes(project.id)) {
    ids.push(project.id);
    localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(ids));
  }
}

export function loadProject(id: string): Project | null {
  const raw = localStorage.getItem(projectKey(id));
  if (!raw) return null;
  try { return JSON.parse(raw) as Project; } catch { return null; }
}

export function loadProjectIds(): string[] {
  const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

export function loadAllProjects(): Project[] {
  return loadProjectIds()
    .map(loadProject)
    .filter((p): p is Project => p !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ─── Artifact CRUD ────────────────────────────────────────────────────────────

export function saveArtifacts(projectId: string, artifacts: Artifact[]): void {
  localStorage.setItem(artifactsKey(projectId), JSON.stringify(artifacts));
}

export function loadArtifacts(projectId: string): Artifact[] {
  const raw = localStorage.getItem(artifactsKey(projectId));
  if (!raw) return [];
  try { return JSON.parse(raw) as Artifact[]; } catch { return []; }
}

// ─── Timeline CRUD ────────────────────────────────────────────────────────────

export function saveTimeline(projectId: string, entries: TimelineEntry[]): void {
  localStorage.setItem(timelineKey(projectId), JSON.stringify(entries));
}

export function loadTimeline(projectId: string): TimelineEntry[] {
  const raw = localStorage.getItem(timelineKey(projectId));
  if (!raw) return [];
  try { return JSON.parse(raw) as TimelineEntry[]; } catch { return []; }
}

// ─── Session → Project derivation ────────────────────────────────────────────

function phaseToStage(session: IdeaLoopSession): ProjectStage {
  const phase = session.phase;
  const decision = session.decisionPackage?.decision;

  if (phase === 'complete' || (phase === 'decision-ready' && (decision === 'Build Now' || decision === 'Prototype'))) {
    return 'architecture';
  }
  if (phase === 'executive-review' || phase === 'decision-ready' || phase === 'brief-ready') {
    return 'executive-review';
  }
  return 'intake';
}

function phaseToStatus(session: IdeaLoopSession): ProjectStatus {
  const { phase, decisionPackage } = session;
  if (phase === 'complete') return 'complete';
  if (phase === 'stopped') {
    const d = decisionPackage?.decision;
    if (d === 'Reject' || d === 'Delay') return 'stopped';
    return 'stopped';
  }
  return 'active';
}

function deriveProjectName(session: IdeaLoopSession): string {
  if (session.ideaBrief?.projectName) return session.ideaBrief.projectName;
  const firstMsg = session.intakeMessages.find((m) => m.role === 'user');
  if (firstMsg) {
    const text = firstMsg.content.slice(0, 50).trim();
    return text.length < firstMsg.content.length ? `${text}…` : text;
  }
  return `Project — ${new Date(session.createdAt).toLocaleDateString()}`;
}

function deriveArtifacts(session: IdeaLoopSession): Artifact[] {
  const artifacts: Artifact[] = [];

  if (session.ideaBrief) {
    const brief = session.ideaBrief;
    artifacts.push({
      id: `${session.id}:idea-brief`,
      projectId: session.id,
      artifactType: 'idea-brief' as ArtifactType,
      title: 'Idea Brief',
      createdAt: brief.createdAt,
      updatedAt: brief.createdAt,
      version: '1.0',
      status: 'final',
      department: 'intake',
      departmentLabel: 'Intake',
      summary: brief.summary || brief.problemStatement,
      content: brief as IdeaBrief,
    });
  }

  if (session.decisionPackage) {
    const dp = session.decisionPackage;
    artifacts.push({
      id: `${session.id}:decision-package`,
      projectId: session.id,
      artifactType: 'decision-package' as ArtifactType,
      title: 'Decision Package',
      createdAt: dp.createdAt,
      updatedAt: dp.createdAt,
      version: '1.0',
      status: 'final',
      department: 'executive-board',
      departmentLabel: 'Executive Board',
      summary: dp.recommendation
        ? dp.recommendation.slice(0, 120) + (dp.recommendation.length > 120 ? '…' : '')
        : `Decision: ${dp.decision}`,
      content: dp as DecisionPackage,
    });
  }

  if (session.blueprint) {
    const bp = session.blueprint;
    artifacts.push({
      id: `${session.id}:blueprint`,
      projectId: session.id,
      artifactType: 'blueprint' as ArtifactType,
      title: 'Blueprint',
      createdAt: bp.createdAt,
      updatedAt: bp.createdAt,
      version: '1.0',
      status: 'final',
      department: 'architect',
      departmentLabel: 'Architect',
      summary: bp.problem
        ? bp.problem.slice(0, 120) + (bp.problem.length > 120 ? '…' : '')
        : 'Technical Blueprint',
      content: bp as Blueprint,
    });
  }

  return artifacts;
}

function deriveTimeline(session: IdeaLoopSession): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  entries.push({
    id: `${session.id}:started`,
    projectId: session.id,
    event: 'project-started',
    title: 'Project started',
    description: 'Intake interview began.',
    ts: session.createdAt,
  });

  if (session.ideaBrief) {
    entries.push({
      id: `${session.id}:brief`,
      projectId: session.id,
      event: 'artifact-produced',
      title: 'Idea Brief produced',
      description: `Intake completed with ${session.ideaBrief.confidence}% confidence.`,
      ts: session.ideaBrief.createdAt,
    });
  }

  if (session.decisionPackage) {
    entries.push({
      id: `${session.id}:decision`,
      projectId: session.id,
      event: 'decision-made',
      title: `Decision: ${session.decisionPackage.decision}`,
      description: `Executive Board reached ${session.decisionPackage.confidence}% confidence.`,
      ts: session.decisionPackage.createdAt,
    });
  }

  if (session.blueprint) {
    entries.push({
      id: `${session.id}:blueprint`,
      projectId: session.id,
      event: 'artifact-produced',
      title: 'Blueprint produced',
      description: 'Architect completed the technical design.',
      ts: session.blueprint.createdAt,
    });
  }

  if (session.phase === 'complete') {
    entries.push({
      id: `${session.id}:complete`,
      projectId: session.id,
      event: 'pipeline-complete',
      title: 'Pipeline complete',
      description: 'All three documents have been produced.',
      ts: session.updatedAt,
    });
  }

  if (session.phase === 'stopped') {
    entries.push({
      id: `${session.id}:stopped`,
      projectId: session.id,
      event: 'pipeline-stopped',
      title: 'Pipeline stopped',
      description: `Project halted at Executive Review. Decision: ${session.decisionPackage?.decision ?? 'unknown'}.`,
      ts: session.updatedAt,
    });
  }

  return entries.sort((a, b) => a.ts.localeCompare(b.ts));
}

function deriveProject(session: IdeaLoopSession, artifacts: Artifact[]): Project {
  return {
    id: session.id,
    sessionId: session.id,
    name: deriveProjectName(session),
    purpose: session.ideaBrief?.problemStatement ?? session.intakeMessages.find((m) => m.role === 'user')?.content ?? '',
    summary: session.ideaBrief?.summary ?? session.decisionPackage?.recommendation ?? '',
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    status: phaseToStatus(session),
    currentStage: phaseToStage(session),
    artifactIds: artifacts.map((a) => a.id),
  };
}

// ─── Sync: sessions → projects (idempotent) ───────────────────────────────────

export function syncSessionsToProjects(): void {
  const sessions = loadAllSessions();
  for (const session of sessions) {
    const artifacts = deriveArtifacts(session);
    const project = deriveProject(session, artifacts);
    const timeline = deriveTimeline(session);
    saveProject(project);
    saveArtifacts(session.id, artifacts);
    saveTimeline(session.id, timeline);
  }
}
