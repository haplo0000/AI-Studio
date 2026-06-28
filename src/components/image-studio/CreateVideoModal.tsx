import { useEffect, useState } from 'react';
import type { ImageRecord } from '../../types/imageStudio';
import type { VideoDuration, VideoSetupStatus } from '../../types/videoStudio';

interface CreateVideoModalProps {
  image: ImageRecord;
  comfyuiHealthy: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (params: {
    sourcePath: string;
    prompt: string;
    duration: VideoDuration;
    motionStrength: number;
  }) => Promise<void>;
  onOpenAdvanced: () => void;
  onOpenVideoSetup: () => void;
}

const DURATIONS: VideoDuration[] = [2, 4, 6];

export function CreateVideoModal({
  image,
  comfyuiHealthy,
  busy,
  onClose,
  onSubmit,
  onOpenAdvanced,
  onOpenVideoSetup,
}: CreateVideoModalProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<VideoDuration>(4);
  const [motionStrength, setMotionStrength] = useState(0.6);
  const [submitting, setSubmitting] = useState(false);
  const [setup, setSetup] = useState<VideoSetupStatus | null>(null);

  useEffect(() => {
    void window.aiStudio.videoStudioSetup().then(setSetup);
  }, []);

  const previewSrc = window.aiStudio.getMediaUrl(image.path);
  const setupBlocked = setup != null && !setup.ready;
  const disabled =
    busy || submitting || !comfyuiHealthy || !prompt.trim() || setupBlocked;

  const handleSubmit = async () => {
    if (disabled) return;
    setSubmitting(true);
    try {
      await onSubmit({
        sourcePath: image.path,
        prompt: prompt.trim(),
        duration,
        motionStrength,
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
            <h2 className="text-sm font-semibold text-text-primary">Create Video</h2>
            <p className="text-xs text-text-muted truncate max-w-md" title={image.filename}>
              Image-to-video · {image.filename}
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
            <p className="text-xs text-warning">ComfyUI is offline — start it before generating video.</p>
          )}

          {setupBlocked && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 space-y-2">
              <p className="text-sm font-medium text-warning">{setup?.message}</p>
              {setup?.detail && <p className="text-xs text-text-secondary">{setup.detail}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={onOpenAdvanced}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-surface-overlay"
                >
                  Open Advanced
                </button>
                <button
                  type="button"
                  onClick={onOpenVideoSetup}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-surface-overlay"
                >
                  Open Video Setup
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border overflow-hidden bg-surface-overlay/40 aspect-video flex items-center justify-center">
            <img
              src={previewSrc}
              alt={image.filename}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted mb-2 block">
              Describe the motion…
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. slow camera push-in, hair blowing in the wind, clouds drifting"
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary resize-none focus:ring-2 focus:ring-accent/40 focus:outline-none"
            />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wide text-text-muted mb-2">Duration</p>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`px-4 py-1.5 rounded-lg text-xs border ${
                    duration === d
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border text-text-muted'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-wide text-text-muted">
                Motion strength
              </label>
              <span className="text-xs text-text-secondary">{motionStrength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={motionStrength}
              onChange={(e) => setMotionStrength(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleSubmit()}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-medium"
            >
              {submitting ? 'Queuing…' : 'Generate Video'}
            </button>
            <button
              type="button"
              onClick={onOpenAdvanced}
              className="px-5 py-2 rounded-xl border border-border text-text-secondary text-sm hover:bg-surface-overlay"
            >
              Open Advanced
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
