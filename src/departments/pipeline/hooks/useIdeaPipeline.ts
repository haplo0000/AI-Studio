import { useCallback, useState } from 'react';
import { conductIntakeTurn, buildBrief } from '../../intake';
import { reviewIdeaBrief } from '../../executive-board';
import { createBlueprint } from '../../architect';
import {
  createEmptySession,
  loadSession,
  saveSession,
} from '../../shared/storage';
import type {
  Blueprint,
  DecisionPackage,
  DepartmentConfig,
  IdeaBrief,
  IdeaLoopPhase,
  IdeaLoopSession,
  IntakeMessage,
} from '../../shared/types';
import type { IntakeResponse } from '../../intake';

// ─── Max questions guard ──────────────────────────────────────────────────────

const MAX_INTAKE_QUESTIONS = 10;

// ─── Hook state ───────────────────────────────────────────────────────────────

export interface IdeaPipelineState {
  session: IdeaLoopSession;
  busy: boolean;
  error: string | null;
  questionCount: number;
}

export interface IdeaPipelineActions {
  startIntake: (initialIdea: string) => Promise<void>;
  sendIntakeMessage: (text: string) => Promise<void>;
  forceCompleteBrief: () => Promise<void>;
  resetPipeline: () => void;
  clearError: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIdeaPipeline(
  workshopId: string | null,
  config: DepartmentConfig,
  initialSessionId?: string,
): IdeaPipelineState & IdeaPipelineActions {
  const [session, setSession] = useState<IdeaLoopSession>(() => {
    if (initialSessionId) {
      const existing = loadSession(initialSessionId);
      if (existing) return existing;
    }
    return createEmptySession(workshopId);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  // ─── Internal helpers ────────────────────────────────────────────────────

  const updateSession = useCallback((updated: IdeaLoopSession) => {
    setSession(updated);
    saveSession(updated);
  }, []);

  const addIntakeMessage = useCallback(
    (session: IdeaLoopSession, role: 'user' | 'assistant', content: string): IdeaLoopSession => {
      const msg: IntakeMessage = {
        id: crypto.randomUUID(),
        role,
        content,
        ts: new Date().toISOString(),
      };
      return { ...session, intakeMessages: [...session.intakeMessages, msg] };
    },
    [],
  );

  // ─── After brief is ready: run board then architect ──────────────────────

  const runPipelineAfterBrief = useCallback(
    async (sessionWithBrief: IdeaLoopSession, brief: IdeaBrief) => {
      try {
        // Executive Board review
        const inReview: IdeaLoopSession = { ...sessionWithBrief, phase: 'executive-review' };
        updateSession(inReview);

        const decisionPackage = await reviewIdeaBrief(brief, config);

        const withDecision: IdeaLoopSession = {
          ...inReview,
          phase: 'decision-ready',
          decisionPackage,
        };
        updateSession(withDecision);

        // Route based on decision
        const proceedDecisions: DecisionPackage['decision'][] = ['Build Now', 'Prototype'];
        if (!proceedDecisions.includes(decisionPackage.decision)) {
          updateSession({ ...withDecision, phase: 'stopped' });
          return;
        }

        // Short pause so the founder sees the Decision Package before architect starts
        await new Promise<void>((resolve) => setTimeout(resolve, 700));

        // Architect
        const inArchitecture: IdeaLoopSession = { ...withDecision, phase: 'architecture' };
        updateSession(inArchitecture);

        const blueprint = await createBlueprint(brief, decisionPackage, config);

        const complete: IdeaLoopSession = {
          ...inArchitecture,
          phase: 'complete',
          blueprint,
        };
        updateSession(complete);
      } catch (err) {
        const errSession: IdeaLoopSession = {
          ...sessionWithBrief,
          phase: 'error',
        };
        updateSession(errSession);
        setError(err instanceof Error ? err.message : 'Pipeline error');
      } finally {
        setBusy(false);
      }
    },
    [config, updateSession],
  );

  // ─── Process an intake turn result ──────────────────────────────────────

  const handleIntakeResponse = useCallback(
    async (currentSession: IdeaLoopSession, response: IntakeResponse) => {
      if (response.type === 'question') {
        const withQuestion = addIntakeMessage(currentSession, 'assistant', response.text);
        updateSession({ ...withQuestion, phase: 'intake' });
        setQuestionCount((n) => n + 1);
        setBusy(false);
      } else {
        // Complete — build and store the brief
        const brief = buildBrief(response.brief, currentSession.id, response.confidence);
        const withBrief: IdeaLoopSession = {
          ...currentSession,
          phase: 'brief-ready',
          ideaBrief: brief,
        };
        // Show brief to founder briefly before moving on
        updateSession(withBrief);
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
        // Pipeline continues — busy stays true
        await runPipelineAfterBrief(withBrief, brief);
      }
    },
    [addIntakeMessage, updateSession, runPipelineAfterBrief],
  );

  // ─── Public actions ──────────────────────────────────────────────────────

  const startIntake = useCallback(
    async (initialIdea: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      setQuestionCount(0);

      const fresh = createEmptySession(workshopId);
      const withUserMsg = addIntakeMessage(fresh, 'user', initialIdea);
      const inIntake: IdeaLoopSession = { ...withUserMsg, phase: 'intake' };
      updateSession(inIntake);

      try {
        const response = await conductIntakeTurn(inIntake.intakeMessages, config);
        await handleIntakeResponse(inIntake, response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not connect to Ollama');
        updateSession({ ...inIntake, phase: 'error' });
        setBusy(false);
      }
    },
    [busy, workshopId, addIntakeMessage, updateSession, conductIntakeTurn, config, handleIntakeResponse],
  );

  const sendIntakeMessage = useCallback(
    async (text: string) => {
      if (busy || session.phase !== 'intake') return;
      setBusy(true);
      setError(null);

      const withUserMsg = addIntakeMessage(session, 'user', text);
      updateSession(withUserMsg);

      const shouldForce = questionCount >= MAX_INTAKE_QUESTIONS;

      try {
        let response: IntakeResponse;
        if (shouldForce) {
          const { completeIntakeNow } = await import('../../intake');
          const brief = await completeIntakeNow(
            withUserMsg.intakeMessages,
            withUserMsg.id,
            config,
          );
          response = { type: 'complete', confidence: brief.confidence, brief };
        } else {
          response = await conductIntakeTurn(withUserMsg.intakeMessages, config);
        }
        await handleIntakeResponse(withUserMsg, response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not connect to Ollama');
        updateSession({ ...withUserMsg, phase: 'error' });
        setBusy(false);
      }
    },
    [busy, session, addIntakeMessage, updateSession, questionCount, config, conductIntakeTurn, handleIntakeResponse],
  );

  const forceCompleteBrief = useCallback(async () => {
    if (busy || session.phase !== 'intake') return;
    setBusy(true);
    setError(null);

    try {
      const { completeIntakeNow } = await import('../../intake');
      const brief = await completeIntakeNow(session.intakeMessages, session.id, config);
      const withBrief: IdeaLoopSession = {
        ...session,
        phase: 'brief-ready',
        ideaBrief: brief,
      };
      updateSession(withBrief);
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      await runPipelineAfterBrief(withBrief, brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate brief');
      setBusy(false);
    }
  }, [busy, session, config, updateSession, runPipelineAfterBrief]);

  const resetPipeline = useCallback(() => {
    const fresh = createEmptySession(workshopId);
    setSession(fresh);
    setBusy(false);
    setError(null);
    setQuestionCount(0);
  }, [workshopId]);

  const clearError = useCallback(() => setError(null), []);

  return {
    session,
    busy,
    error,
    questionCount,
    startIntake,
    sendIntakeMessage,
    forceCompleteBrief,
    resetPipeline,
    clearError,
  };
}
