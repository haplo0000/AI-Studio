import { useState } from 'react';
import type { EditImageParams, ImageRecord } from '../../types/imageStudio';

interface EditImageModalProps {
  image: ImageRecord;
  comfyuiHealthy: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (params: EditImageParams) => Promise<void>;
  onOpenAdvanced: () => void;
}

export function EditImageModal({
  image,
  comfyuiHealthy,
  busy,
  onClose,
  onSubmit,
  onOpenAdvanced,
}: EditImageModalProps) {
  const [editPrompt, setEditPrompt] = useState('');
  const [denoise, setDenoise] = useState(0.55);
  const [preserveComposition, setPreserveComposition] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const previewSrc = window.aiStudio.getMediaUrl(image.path);
  const disabled = busy || submitting || !comfyuiHealthy || !editPrompt.trim();

  const handleSubmit = async () => {
    if (disabled) return;
    setSubmitting(true);
    try {
      await onSubmit({
        sourcePath: image.path,
        editPrompt: editPrompt.trim(),
        denoise,
        preserveComposition,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface-base shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Edit Image</h2>
            <p className="text-xs text-text-muted truncate max-w-md" title={image.filename}>
              {image.filename}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary px-2 py-1 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!comfyuiHealthy && (
            <p className="text-xs text-warning">ComfyUI is offline — start it before editing.</p>
          )}

          <div className="rounded-xl border border-border overflow-hidden bg-surface-overlay/40 aspect-video flex items-center justify-center">
            <img
              src={previewSrc}
              alt={image.filename}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {image.edit_prompt && (
            <p className="text-xs text-text-muted">
              Previous edit: <span className="text-text-secondary">{image.edit_prompt}</span>
            </p>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted mb-2 block">
              Describe the edit…
            </label>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="e.g. make the teeth bigger, add fog, make the lighting warmer"
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary resize-none focus:ring-2 focus:ring-accent/40 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-wide text-text-muted">
                Edit strength
              </label>
              <span className="text-xs text-text-secondary">{denoise.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={0.95}
              step={0.05}
              value={denoise}
              onChange={(e) => setDenoise(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <p className="text-[10px] text-text-muted mt-1">
              Low = subtle · Medium = visible · High = major change
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={preserveComposition}
              onChange={(e) => setPreserveComposition(e.target.checked)}
              className="rounded border-border accent-accent"
            />
            Preserve composition
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleSubmit()}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-medium"
            >
              {submitting ? 'Queuing…' : 'Generate Edit'}
            </button>
            <button
              type="button"
              onClick={onOpenAdvanced}
              className="px-5 py-2 rounded-xl border border-border text-text-secondary text-sm hover:bg-surface-overlay"
            >
              Open Advanced in ComfyUI
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-border text-text-muted text-sm hover:bg-surface-overlay"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
