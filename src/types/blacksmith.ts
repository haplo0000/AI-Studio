export type BlacksmithMode =
  | 'forge'
  | 'discovery'
  | 'constraint-forge'
  | 'infinite-improvement'
  | 'framework-forge';

export interface BlacksmithModeInfo {
  id: BlacksmithMode;
  label: string;
  description: string;
  icon: string;
}

export const BLACKSMITH_MODES: BlacksmithModeInfo[] = [
  {
    id: 'forge',
    label: 'Forge',
    description: 'Shape raw ideas into workable concepts',
    icon: '🔥',
  },
  {
    id: 'discovery',
    label: 'Discovery',
    description: 'Explore the problem space before committing',
    icon: '🔭',
  },
  {
    id: 'constraint-forge',
    label: 'Constraint Forge',
    description: 'Create within limits — turn constraints into fuel',
    icon: '⛓️',
  },
  {
    id: 'infinite-improvement',
    label: 'Infinite Improvement',
    description: 'Iterate relentlessly — each pass makes it sharper',
    icon: '♾️',
  },
  {
    id: 'framework-forge',
    label: 'Framework Forge',
    description: 'Build scaffolds, models, and mental frameworks',
    icon: '🏗️',
  },
];

export interface BlacksmithSidebar {
  keyInsights: string[];
  constraints: string[];
  assumptions: string[];
  risks: string[];
  opportunities: string[];
  nextQuestions: string[];
}

export interface BlacksmithMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

export type CouncilStatus = 'none' | 'sent' | 'needs-work' | 'approved';

export interface BlacksmithSession {
  id: string;
  workshopId: string | null;
  mode: BlacksmithMode;
  goal: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: BlacksmithMessage[];
  sidebar: BlacksmithSidebar;
  councilBriefId: string | null;
  councilStatus: CouncilStatus;
  councilNotes: string | null;
}

export interface CouncilBrief {
  id: string;
  sessionId: string;
  workshopId: string | null;
  createdAt: string;
  mode: BlacksmithMode;
  goal: string;
  title: string;
  summary: string;
  sidebar: BlacksmithSidebar;
  conversationDigest: string;
  messages: BlacksmithMessage[];
  status: 'pending' | 'needs-work' | 'approved';
  councilNotes: string | null;
}

export function emptySidebar(): BlacksmithSidebar {
  return {
    keyInsights: [],
    constraints: [],
    assumptions: [],
    risks: [],
    opportunities: [],
    nextQuestions: [],
  };
}

export function mergeSidebar(current: BlacksmithSidebar, incoming: Partial<BlacksmithSidebar>): BlacksmithSidebar {
  const mergeList = (a: string[], b: string[] | undefined) => {
    if (!b?.length) return a;
    const seen = new Set(a.map((s) => s.toLowerCase()));
    const next = [...a];
    for (const item of b) {
      const trimmed = item.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        next.push(trimmed);
      }
    }
    return next.slice(-12);
  };

  return {
    keyInsights: mergeList(current.keyInsights, incoming.keyInsights),
    constraints: mergeList(current.constraints, incoming.constraints),
    assumptions: mergeList(current.assumptions, incoming.assumptions),
    risks: mergeList(current.risks, incoming.risks),
    opportunities: mergeList(current.opportunities, incoming.opportunities),
    nextQuestions: mergeList(current.nextQuestions, incoming.nextQuestions),
  };
}

export const SIDEBAR_SECTIONS: { key: keyof BlacksmithSidebar; label: string }[] = [
  { key: 'keyInsights', label: 'Key Insights' },
  { key: 'constraints', label: 'Constraints' },
  { key: 'assumptions', label: 'Assumptions' },
  { key: 'risks', label: 'Risks' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'nextQuestions', label: 'Next Questions' },
];
