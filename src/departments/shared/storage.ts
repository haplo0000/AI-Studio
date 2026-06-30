import type { IdeaLoopSession } from './types';

const SESSIONS_INDEX_KEY = 'idea-loop:sessions';
const sessionKey = (id: string) => `idea-loop:session:${id}`;

export function saveSession(session: IdeaLoopSession): void {
  const updated: IdeaLoopSession = { ...session, updatedAt: new Date().toISOString() };
  localStorage.setItem(sessionKey(updated.id), JSON.stringify(updated));

  const ids = loadSessionIds();
  if (!ids.includes(updated.id)) {
    ids.push(updated.id);
    localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(ids));
  }
}

export function loadSession(id: string): IdeaLoopSession | null {
  const raw = localStorage.getItem(sessionKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IdeaLoopSession;
  } catch {
    return null;
  }
}

export function loadSessionIds(): string[] {
  const raw = localStorage.getItem(SESSIONS_INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function loadAllSessions(): IdeaLoopSession[] {
  return loadSessionIds()
    .map(loadSession)
    .filter((s): s is IdeaLoopSession => s !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createEmptySession(workshopId: string | null): IdeaLoopSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    workshopId,
    phase: 'idle',
    intakeMessages: [],
    ideaBrief: null,
    decisionPackage: null,
    blueprint: null,
    createdAt: now,
    updatedAt: now,
  };
}
