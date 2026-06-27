import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BLACKSMITH_MODES,
  type BlacksmithMode,
  type BlacksmithSession,
} from '../types/blacksmith';
import { BlacksmithArtifactSidebar } from './BlacksmithArtifactSidebar';

interface BlacksmithWorkspaceProps {
  currentWorkshopId: string | null;
  ollamaHealthy: boolean;
  onNotify: (message: string | null, error?: string | null) => void;
}

export function BlacksmithWorkspace({
  currentWorkshopId,
  ollamaHealthy,
  onNotify,
}: BlacksmithWorkspaceProps) {
  const [session, setSession] = useState<BlacksmithSession | null>(null);
  const [mode, setMode] = useState<BlacksmithMode>('forge');
  const [goal, setGoal] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages.length, scrollToBottom]);

  useEffect(() => {
    if (!session || session.councilStatus !== 'sent') return;
    const id = window.setInterval(async () => {
      try {
        const fresh = await window.aiStudio.blacksmithGetSession(session.id);
        if (fresh.councilStatus !== session.councilStatus) {
          setSession(fresh);
        }
      } catch {
        // ignore poll errors
      }
    }, 10000);
    return () => window.clearInterval(id);
  }, [session?.id, session?.councilStatus]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessions = await window.aiStudio.blacksmithListSessions();
        const needsWork = sessions.find((s) => s.councilStatus === 'needs-work');
        if (!cancelled && needsWork) {
          const fresh = await window.aiStudio.blacksmithGetSession(needsWork.id);
          setSession(fresh);
          setStarted(true);
          setMode(fresh.mode);
          setGoal(fresh.goal);
        }
      } catch {
        // no sessions yet
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = async () => {
    if (!goal.trim()) return;
    setBusy(true);
    onNotify(null, null);
    try {
      const created = await window.aiStudio.blacksmithCreateSession(
        currentWorkshopId,
        mode,
        goal.trim(),
      );
      const withReply = await window.aiStudio.blacksmithSendMessage(
        created.id,
        goal.trim(),
      );
      setSession(withReply);
      setStarted(true);
    } catch (err) {
      onNotify(null, err instanceof Error ? err.message : 'Could not start session');
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async () => {
    if (!session || !draft.trim() || busy) return;
    setBusy(true);
    onNotify(null, null);
    try {
      const updated = await window.aiStudio.blacksmithSendMessage(session.id, draft.trim());
      setSession(updated);
      setDraft('');
    } catch (err) {
      onNotify(null, err instanceof Error ? err.message : 'Message failed');
    } finally {
      setBusy(false);
    }
  };

  const sendToCouncil = async () => {
    if (!session || busy) return;
    setBusy(true);
    onNotify(null, null);
    try {
      const result = await window.aiStudio.blacksmithSendToCouncil(session.id);
      const fresh = await window.aiStudio.blacksmithGetSession(session.id);
      setSession(fresh);
      onNotify(result.message);
    } catch (err) {
      onNotify(null, err instanceof Error ? err.message : 'Council handoff failed');
    } finally {
      setBusy(false);
    }
  };

  const continueAfterNeedsWork = async () => {
    if (!session) return;
    onNotify('Back at the forge — continue shaping your idea.');
  };

  if (!started) {
    return (
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
          <div className="max-w-2xl w-full text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-accent mb-4">The Blacksmith</p>
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
              What are we making today?
            </h1>
            <p className="text-sm text-text-secondary mb-8">
              Forge ideas here — Council judges later. I&apos;m your creative partner, not a validator.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {BLACKSMITH_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  title={m.description}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    mode === m.id
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border text-text-muted hover:border-accent/30 hover:text-text-primary'
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe a goal, idea, problem, or desired outcome…"
              rows={4}
              className="w-full rounded-xl border border-border bg-surface-overlay/60 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none mb-4"
            />

            {!ollamaHealthy && (
              <p className="text-xs text-warning mb-4">
                Ollama is offline — you can start, but responses will be limited until it&apos;s running.
              </p>
            )}

            <button
              type="button"
              disabled={busy || !goal.trim()}
              onClick={startSession}
              className="px-8 py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-medium shadow-lg shadow-accent/25 transition-all"
            >
              {busy ? 'Heating the forge…' : 'Begin Forging'}
            </button>
          </div>
        </div>
        <BlacksmithArtifactSidebar sidebar={{ keyInsights: [], constraints: [], assumptions: [], risks: [], opportunities: [], nextQuestions: [] }} />
      </div>
    );
  }

  if (!session) return null;

  const modeInfo = BLACKSMITH_MODES.find((m) => m.id === session.mode);

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {session.councilStatus === 'needs-work' && (
          <div className="shrink-0 px-4 py-3 border-b border-warning/30 bg-warning/10 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-warning">Council returned Needs Work</p>
              {session.councilNotes && (
                <p className="text-xs text-text-muted mt-1">{session.councilNotes}</p>
              )}
            </div>
            <button
              type="button"
              onClick={continueAfterNeedsWork}
              className="px-4 py-2 rounded-xl bg-warning/20 border border-warning/40 text-warning text-xs font-medium hover:bg-warning/30"
            >
              Continue Forging ↩
            </button>
          </div>
        )}

        <div className="shrink-0 px-6 py-4 border-b border-border-subtle flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs text-text-muted">
              {modeInfo?.icon} {modeInfo?.label} · {session.title}
            </p>
          </div>
          <button
            type="button"
            disabled={busy || session.messages.length === 0}
            onClick={sendToCouncil}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-accent to-purple-600 hover:opacity-90 disabled:opacity-40 text-white text-sm font-semibold shadow-lg shadow-accent/20 transition-all"
          >
            Send to Council
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {session.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent/20 border border-accent/30 text-text-primary'
                    : 'bg-surface-overlay/60 border border-border text-text-secondary'
                }`}
              >
                {msg.role === 'assistant' && (
                  <p className="text-[10px] uppercase tracking-wide text-accent mb-1">Blacksmith</p>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="shrink-0 p-4 border-t border-border-subtle bg-surface-raised/40">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Keep forging — add thoughts, answers, or new angles…"
              rows={2}
              disabled={busy}
              className="flex-1 rounded-xl border border-border bg-surface-overlay/60 px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none disabled:opacity-50"
            />
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={sendMessage}
              className="self-end px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-medium"
            >
              {busy ? '…' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      <BlacksmithArtifactSidebar sidebar={session.sidebar} />
    </div>
  );
}
