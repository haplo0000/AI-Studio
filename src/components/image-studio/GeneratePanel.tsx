import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  ASPECT_DIMENSIONS,
  RESOLUTION_OPTIONS,
  type GenerateImageParams,
  type ImageAspectPreset,
  type ImageStylePreset,
} from '../../types/imageStudio';
import { loadPromptHistory, savePromptToHistory } from '../../lib/promptHistory';

interface GeneratePanelProps {
  comfyuiHealthy: boolean;
  onGenerate: (params: GenerateImageParams) => Promise<boolean>;
  onOpenAdvanced: () => void;
}

const STYLES: { id: ImageStylePreset; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'anime', label: 'Anime' },
];

const ASPECTS = Object.entries(ASPECT_DIMENSIONS).map(([id, v]) => ({
  id: id as ImageAspectPreset,
  label: v.label,
}));

export function GeneratePanel({
  comfyuiHealthy,
  onGenerate,
  onOpenAdvanced,
}: GeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [queueing, setQueueing] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState(
    'blurry, low quality, watermark, text, deformed, bad anatomy',
  );
  const [style, setStyle] = useState<ImageStylePreset>('default');
  const [aspect, setAspect] = useState<ImageAspectPreset>('square');
  const [resolution, setResolution] = useState<number>(1024);
  const [expanded, setExpanded] = useState(true);
  const [history, setHistory] = useState(loadPromptHistory);
  const [historyRecallIndex, setHistoryRecallIndex] = useState(-1);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef('');
  const focusAfterQueueRef = useRef(false);

  const buildParams = (promptText: string, count: number): GenerateImageParams => ({
    prompt: promptText,
    negativePrompt,
    style,
    aspect,
    resolution,
    count,
  });

  const focusPrompt = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = promptRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    });
  };

  useLayoutEffect(() => {
    if (!focusAfterQueueRef.current || queueing) return;
    focusAfterQueueRef.current = false;
    const el = promptRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [queueing]);

  const submitGenerate = async (count: number) => {
    if (queueing || !prompt.trim() || !comfyuiHealthy) return;
    const submitted = prompt.trim();

    setPrompt('');
    setHistoryRecallIndex(-1);
    draftRef.current = '';
    focusAfterQueueRef.current = true;
    focusPrompt();

    setQueueing(true);
    try {
      const ok = await onGenerate(buildParams(submitted, count));
      if (ok) {
        setHistory(savePromptToHistory(submitted));
      } else {
        setPrompt(submitted);
      }
    } finally {
      setQueueing(false);
      focusPrompt();
    }
  };

  const keepPromptFocus = (e: { preventDefault: () => void }) => {
    e.preventDefault();
  };

  const handlePromptKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'ArrowUp' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      if (history.length === 0) return;
      e.preventDefault();
      if (historyRecallIndex === -1) {
        draftRef.current = prompt;
        setHistoryRecallIndex(0);
        setPrompt(history[0]);
      } else if (historyRecallIndex < history.length - 1) {
        const next = historyRecallIndex + 1;
        setHistoryRecallIndex(next);
        setPrompt(history[next]);
      }
      return;
    }

    if (e.key === 'ArrowDown' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      if (historyRecallIndex === -1) return;
      e.preventDefault();
      if (historyRecallIndex === 0) {
        setHistoryRecallIndex(-1);
        setPrompt(draftRef.current);
      } else {
        const next = historyRecallIndex - 1;
        setHistoryRecallIndex(next);
        setPrompt(history[next]);
      }
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full p-3 rounded-xl border border-border bg-surface-overlay/40 text-sm text-text-secondary hover:text-text-primary"
      >
        Show Generate Panel
      </button>
    );
  }

  const generateDisabled = !prompt.trim() || !comfyuiHealthy;

  return (
    <div className="p-4 rounded-xl border border-border bg-surface-overlay/40 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Generate</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Collapse
          </button>
          <button
            type="button"
            onClick={onOpenAdvanced}
            className="text-xs px-3 py-1 rounded-lg border border-border text-text-secondary hover:bg-surface-overlay"
          >
            Open Advanced (ComfyUI)
          </button>
        </div>
      </div>

      {!comfyuiHealthy && (
        <p className="text-xs text-warning">
          ComfyUI is offline — start it before generating. AI Studio creates; ComfyUI executes.
        </p>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wide text-text-muted">Prompt</p>
          <button
            type="button"
            disabled
            title="Prompt history browser (coming soon)"
            className="text-[10px] px-2 py-0.5 rounded border border-border text-text-muted opacity-60 cursor-not-allowed"
          >
            History
          </button>
        </div>
        <textarea
          ref={promptRef}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (historyRecallIndex !== -1) setHistoryRecallIndex(-1);
          }}
          onKeyDown={handlePromptKeyDown}
          placeholder="Prompt — ↑ recalls previous prompts"
          rows={2}
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary resize-none focus:ring-2 focus:ring-accent/40 focus:outline-none"
        />
      </div>
      <textarea
        value={negativePrompt}
        onChange={(e) => setNegativePrompt(e.target.value)}
        placeholder="Negative prompt"
        rows={2}
        className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-muted resize-none focus:ring-2 focus:ring-accent/40 focus:outline-none"
      />

      <div>
        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-2">Style</p>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              className={`px-3 py-1 rounded-lg text-xs border ${
                style === s.id
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border text-text-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-2">Aspect</p>
        <div className="flex flex-wrap gap-2">
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAspect(a.id)}
              className={`px-3 py-1 rounded-lg text-xs border ${
                aspect === a.id
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border text-text-muted'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-2">Resolution</p>
        <div className="flex flex-wrap gap-2">
          {RESOLUTION_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setResolution(r)}
              className={`px-3 py-1 rounded-lg text-xs border ${
                resolution === r
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border text-text-muted'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          disabled={generateDisabled}
          onMouseDown={keepPromptFocus}
          onClick={() => void submitGenerate(1)}
          className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-medium"
        >
          {queueing ? 'Queuing…' : 'Generate'}
        </button>
        <button
          type="button"
          disabled={generateDisabled}
          onMouseDown={keepPromptFocus}
          onClick={() => void submitGenerate(4)}
          className="px-5 py-2 rounded-xl border border-accent/40 text-accent text-sm font-medium disabled:opacity-40"
        >
          {queueing ? 'Queuing…' : 'Generate ×4'}
        </button>
        <button
          type="button"
          disabled={generateDisabled}
          onMouseDown={keepPromptFocus}
          onClick={() => void submitGenerate(1)}
          className="px-5 py-2 rounded-xl border border-border text-text-secondary text-sm disabled:opacity-40"
        >
          Variations
        </button>
      </div>
    </div>
  );
}
