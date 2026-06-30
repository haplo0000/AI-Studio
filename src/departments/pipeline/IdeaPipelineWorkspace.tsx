import { useState } from 'react';
import type { DepartmentConfig } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';
import { useIdeaPipeline } from './hooks/useIdeaPipeline';
import { IntakeChat } from './components/IntakeChat';
import { PipelineProgress } from './components/PipelineProgress';
import { ArtifactPanel } from './components/ArtifactPanel';

interface Props {
  currentWorkshopId: string | null;
  ollamaHealthy: boolean;
  model?: string;
  ollamaBaseUrl?: string;
  /** Load an existing session rather than starting fresh (used from project 'Continue' action) */
  initialSessionId?: string;
}

const PHASE_STATUS_TEXT: Record<string, string> = {
  'executive-review': 'Reviewing with the team…',
  architecture: 'Designing the architecture…',
};

export function IdeaPipelineWorkspace({
  currentWorkshopId,
  ollamaHealthy,
  model,
  ollamaBaseUrl,
  initialSessionId,
}: Props) {
  const config: DepartmentConfig = {
    ollamaBaseUrl: ollamaBaseUrl ?? DEFAULT_CONFIG.ollamaBaseUrl,
    model: model ?? DEFAULT_CONFIG.model,
  };

  const {
    session,
    busy,
    error,
    questionCount,
    startIntake,
    sendIntakeMessage,
    forceCompleteBrief,
    resetPipeline,
    clearError,
  } = useIdeaPipeline(currentWorkshopId, config, initialSessionId);

  const [landingIdea, setLandingIdea] = useState('');

  const phase = session.phase;
  const isConversing = phase === 'intake';
  const isProcessing = phase === 'executive-review' || phase === 'architecture';
  const hasArtifacts =
    session.ideaBrief !== null ||
    session.decisionPackage !== null ||
    session.blueprint !== null;

  const handleLandingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = landingIdea.trim();
    if (!text || busy) return;
    setLandingIdea('');
    void startIntake(text);
  };

  // ─── Ollama offline guard ───────────────────────────────────────────────

  if (!ollamaHealthy && phase === 'idle') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-sm text-center space-y-3">
          <div className="text-3xl">🔌</div>
          <p className="text-text-secondary text-sm">
            Ollama is not running. Start Ollama to use the Idea Pipeline.
          </p>
        </div>
      </div>
    );
  }

  // ─── Landing ────────────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
        <div className="text-center space-y-2">
          <div className="text-4xl mb-4">💡</div>
          <h2 className="text-xl font-semibold text-text-primary">What&apos;s your idea?</h2>
          <p className="text-sm text-text-muted max-w-md">
            Describe it in any way you like. We&apos;ll ask the right questions to understand it.
          </p>
        </div>
        <form onSubmit={handleLandingSubmit} className="w-full max-w-lg flex gap-3">
          <input
            type="text"
            value={landingIdea}
            onChange={(e) => setLandingIdea(e.target.value)}
            placeholder="I have an idea for…"
            autoFocus
            className="flex-1 bg-surface-overlay border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60"
          />
          <button
            type="submit"
            disabled={!landingIdea.trim()}
            className="px-5 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Start
          </button>
        </form>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <div className="max-w-lg w-full rounded-xl bg-danger/10 border border-danger/30 p-5 space-y-3">
          <p className="text-sm font-semibold text-danger">Something went wrong</p>
          <p className="text-sm text-text-secondary">{error}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearError}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={resetPipeline}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/90"
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active pipeline ────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Progress indicator */}
      <div className="shrink-0 border-b border-border-subtle bg-surface-raised/60 px-6">
        <PipelineProgress phase={phase} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">

        {/* Processing status overlay */}
        {isProcessing && (
          <div className="px-6 py-4 flex items-center gap-3 text-sm text-text-secondary border-b border-border-subtle bg-surface-raised/40">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
            {PHASE_STATUS_TEXT[phase] ?? 'Working…'}
          </div>
        )}

        {/* Artifacts (shown as they appear) */}
        {hasArtifacts && (
          <ArtifactPanel
            ideaBrief={session.ideaBrief}
            decisionPackage={session.decisionPackage}
            blueprint={session.blueprint}
          />
        )}

        {/* Inline error banner */}
        {error && phase !== 'error' && (
          <div className="mx-6 my-2 rounded-lg bg-danger/10 border border-danger/30 px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-danger">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="text-xs text-text-muted hover:text-text-primary shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Complete / stopped state */}
        {(phase === 'complete' || phase === 'stopped') && (
          <div className="px-6 pb-4 pt-2">
            <div className="rounded-xl border border-border-subtle bg-surface-raised/60 px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-text-muted">
                {phase === 'complete'
                  ? 'All three artifacts produced. Milestone 1 complete.'
                  : `Pipeline stopped at Decision Package. Decision: ${session.decisionPackage?.decision ?? '—'}`}
              </p>
              <button
                type="button"
                onClick={resetPipeline}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay"
              >
                New idea
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Intake conversation — mounted below artifacts when active */}
      {isConversing && (
        <div className="shrink-0 border-t border-border-subtle flex flex-col" style={{ maxHeight: '40%', minHeight: 220 }}>
          <IntakeChat
            messages={session.intakeMessages}
            busy={busy}
            questionCount={questionCount}
            onSend={(text) => void sendIntakeMessage(text)}
            onForceComplete={() => void forceCompleteBrief()}
          />
        </div>
      )}

      {/* Intake before any artifacts — full height */}
      {phase === 'intake' && !hasArtifacts && (
        <div className="flex-1 flex flex-col min-h-0">
          <IntakeChat
            messages={session.intakeMessages}
            busy={busy}
            questionCount={questionCount}
            onSend={(text) => void sendIntakeMessage(text)}
            onForceComplete={() => void forceCompleteBrief()}
          />
        </div>
      )}
    </div>
  );
}
