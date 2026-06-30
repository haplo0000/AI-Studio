// ─── Intake ───────────────────────────────────────────────────────────────────

export interface IntakeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

// ─── Idea Brief ───────────────────────────────────────────────────────────────

export interface IdeaBrief {
  id: string;
  sessionId: string;
  projectName: string;
  problemStatement: string;
  targetUser: string;
  desiredOutcome: string;
  successCriteria: string[];
  constraints: string[];
  assumptions: string[];
  unknowns: string[];
  risks: string[];
  questionsAnswered: string[];
  questionsRemaining: string[];
  founderNotes: string;
  summary: string;
  confidence: number;
  status: 'draft' | 'ready-for-review';
  createdAt: string;
}

// ─── Decision Package ─────────────────────────────────────────────────────────

export type DecisionOutcome =
  | 'Build Now'
  | 'Prototype'
  | 'Research Further'
  | 'Delay'
  | 'Reject';

export interface DecisionPackage {
  id: string;
  sessionId: string;
  ideaBriefId: string;
  decision: DecisionOutcome;
  reasoning: string;
  confidence: number;
  opportunityCost: string;
  risks: string[];
  opportunities: string[];
  openQuestions: string[];
  recommendation: string;
  createdAt: string;
  schemaVersion: '1.0';
}

// ─── Blueprint ────────────────────────────────────────────────────────────────

export interface BlueprintComponent {
  name: string;
  responsibility: string;
  interfaces: string[];
}

export interface Blueprint {
  id: string;
  sessionId: string;
  ideaBriefId: string;
  decisionPackageId: string;
  problem: string;
  goals: string[];
  nonGoals: string[];
  userStories: string[];
  architecture: string;
  majorComponents: BlueprintComponent[];
  dataModel: string;
  dependencies: string[];
  risks: string[];
  successCriteria: string[];
  futureExpansion: string[];
  createdAt: string;
}

// ─── Pipeline Session ─────────────────────────────────────────────────────────

export type IdeaLoopPhase =
  | 'idle'
  | 'intake'
  | 'brief-ready'
  | 'executive-review'
  | 'decision-ready'
  | 'architecture'
  | 'complete'
  | 'stopped'
  | 'error';

export interface IdeaLoopSession {
  id: string;
  workshopId: string | null;
  phase: IdeaLoopPhase;
  intakeMessages: IntakeMessage[];
  ideaBrief: IdeaBrief | null;
  decisionPackage: DecisionPackage | null;
  blueprint: Blueprint | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Department config ────────────────────────────────────────────────────────

export interface DepartmentConfig {
  ollamaBaseUrl: string;
  model: string;
}

export const DEFAULT_CONFIG: DepartmentConfig = {
  ollamaBaseUrl: 'http://localhost:11434',
  model: 'llama3.2',
};
