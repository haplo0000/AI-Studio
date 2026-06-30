import { useEffect, useRef, useState } from 'react';
import type { IntakeMessage } from '../../shared/types';

interface Props {
  messages: IntakeMessage[];
  busy: boolean;
  questionCount: number;
  onSend: (text: string) => void;
  onForceComplete: () => void;
}

const MAX_QUESTIONS_BEFORE_OPTION = 3;

export function IntakeChat({ messages, busy, questionCount, onSend, onForceComplete }: Props) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    onSend(text);
  };

  const showForceOption =
    !busy && questionCount >= MAX_QUESTIONS_BEFORE_OPTION && messages.length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-text-muted text-sm">
            Tell me about your idea…
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-white rounded-br-sm'
                  : 'bg-surface-raised border border-border-subtle text-text-primary rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="bg-surface-raised border border-border-subtle rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Force complete option */}
      {showForceOption && (
        <div className="px-6 pb-2 flex justify-start">
          <button
            type="button"
            onClick={onForceComplete}
            className="text-xs text-text-muted hover:text-accent border border-border-subtle hover:border-accent/40 rounded-full px-3 py-1.5 transition-colors"
          >
            Create Brief with what you know →
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border-subtle px-6 py-4 flex gap-3"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          placeholder={busy ? 'Thinking…' : 'Type your answer…'}
          className="flex-1 bg-surface-overlay border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
