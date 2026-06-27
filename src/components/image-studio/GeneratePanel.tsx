import { useState } from 'react';
import {
  ASPECT_DIMENSIONS,
  RESOLUTION_OPTIONS,
  type GenerateImageParams,
  type ImageAspectPreset,
  type ImageStylePreset,
} from '../../types/imageStudio';

interface GeneratePanelProps {
  comfyuiHealthy: boolean;
  busy: boolean;
  onGenerate: (params: GenerateImageParams) => void;
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

export function GeneratePanel({ comfyuiHealthy, busy, onGenerate, onOpenAdvanced }: GeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState(
    'blurry, low quality, watermark, text, deformed, bad anatomy',
  );
  const [style, setStyle] = useState<ImageStylePreset>('default');
  const [aspect, setAspect] = useState<ImageAspectPreset>('square');
  const [resolution, setResolution] = useState<number>(1024);
  const [expanded, setExpanded] = useState(true);

  const baseParams = (): GenerateImageParams => ({
    prompt,
    negativePrompt,
    style,
    aspect,
    resolution,
  });

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

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Prompt"
        rows={2}
        className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary resize-none focus:ring-2 focus:ring-accent/40 focus:outline-none"
      />
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
          disabled={busy || !prompt.trim() || !comfyuiHealthy}
          onClick={() => onGenerate({ ...baseParams(), count: 1 })}
          className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-medium"
        >
          Generate
        </button>
        <button
          type="button"
          disabled={busy || !prompt.trim() || !comfyuiHealthy}
          onClick={() => onGenerate({ ...baseParams(), count: 4 })}
          className="px-5 py-2 rounded-xl border border-accent/40 text-accent text-sm font-medium disabled:opacity-40"
        >
          Generate ×4
        </button>
        <button
          type="button"
          disabled={busy || !prompt.trim() || !comfyuiHealthy}
          onClick={() => onGenerate({ ...baseParams(), count: 1 })}
          className="px-5 py-2 rounded-xl border border-border text-text-secondary text-sm disabled:opacity-40"
        >
          Variations
        </button>
      </div>
    </div>
  );
}
