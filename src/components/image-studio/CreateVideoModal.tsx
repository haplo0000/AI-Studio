import { useEffect, useState } from 'react';
import type { GenerationJobState } from '../../types/imageStudio';
import type { ImageRecord } from '../../types/imageStudio';
import type { VideoDuration, VideoSetupStatus } from '../../types/videoStudio';
import { VideoErrorDialog } from './VideoErrorDialog';

interface CreateVideoModalProps {
  image: ImageRecord;
  comfyuiHealthy: boolean;
  onClose: () => void;
  onQueued: (jobs: GenerationJobState[]) => void;
  onNotify: (message: string | null, error?: string | null) => void;
  onOpenAdvanced: () => void;
  onOpenVideoSetup: () => void;
}

const DURATIONS: VideoDuration[] = [2, 4, 6];

function logVideo(step: string, meta?: Record<string, unknown>) {
  console.info(`[video-pipeline:renderer] ${step}`, meta ?? {});
}

export function CreateVideoModal({
  image,
  comfyuiHealthy,
  onClose,
  onQueued,
  onNotify,
  onOpenAdvanced,
  onOpenVideoSetup,
}: CreateVideoModalProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<VideoDuration>(2);
  const [motionStrength, setMotionStrength] = useState(0.4);
  const [submitting, setSubmitting] = useState(false);
  const [setup, setSetup] = useState<VideoSetupStatus | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [vramWarning, setVramWarning] = useState<string | null>(null);
  const [errorDialog, setErrorDialog] = useState<{
    title: string;
    message: string;
    detail?: string;
  } | null>(null);

  useEffect(() => {
    setSetupLoading(true);
    logVideo('checking video setup');
    void window.aiStudio
      .videoStudioSetup()
      .then((status) => {
        logVideo('setup result', { ready: status.ready, message: status.message });
        setSetup(status);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Setup check failed';
        logVideo('setup error', { message });
        setSetup({ ready: false, message: 'Video setup check failed', detail: message });
      })
      .finally(() => setSetupLoading(false));
  }, []);

  useEffect(() => {
    void window.aiStudio
      .videoStudioVramRisk({
        sourcePath: image.path,
        duration,
        motionStrength,
      })
      .then((risk) => setVramWarning(risk.level !== 'ok' ? risk.message : null))
      .catch((err) => {
        logVideo('vram-risk error', { message: err instanceof Error ? err.message : String(err) });
      });
  }, [image.path, duration, motionStrength]);

  const previewSrc = window.aiStudio.getMediaUrl(image.path);
  const setupBlocked = !setupLoading && setup != null && !setup.ready;

  const getBlockReason = (): string | null => {
    if (submitting) return 'Video generation is already being queued…';
    if (setupLoading) return 'Checking video setup — please wait a moment.';
    if (!prompt.trim()) return 'Enter a motion prompt describing how the image should move.';
    if (!comfyuiHealthy) return 'ComfyUI is offline. Start ComfyUI before generating video.';
    if (setupBlocked) return setup?.detail || setup?.message || 'Video model/workflow not installed yet.';
    return null;
  };

  const blockReason = getBlockReason();

  const handleGenerateClick = async () => {
    const block = getBlockReason();
    if (block) {
      logVideo('generate blocked', { reason: block });
      setErrorDialog({ title: 'Cannot generate video', message: block });
      onNotify(null, block);
      return;
    }

    if (!window.aiStudio?.videoStudioGenerate) {
      const message =
        'videoStudioGenerate is not available. Reload AI Studio — the preload bridge may not have loaded.';
      logVideo('missing API', { hasAiStudio: !!window.aiStudio });
      setErrorDialog({ title: 'Video generation unavailable', message });
      onNotify(null, message);
      return;
    }

    const params = {
      sourcePath: image.path,
      prompt: prompt.trim(),
      duration,
      motionStrength,
    };

    setSubmitting(true);
    setErrorDialog(null);
    onNotify(null, null);
    logVideo('calling videoStudioGenerate', params);

    try {
      const result = await window.aiStudio.videoStudioGenerate(params);
      logVideo('videoStudioGenerate result', {
        ok: result?.ok,
        message: result?.message,
        jobCount: result?.jobs?.length ?? 0,
      });

      if (!result?.ok) {
        const message = result?.message || 'Video generation could not start';
        const detail = result?.detail;
        setErrorDialog({ title: 'Video generation failed', message, detail });
        onNotify(null, detail || message);
        if (result?.jobs?.length) onQueued(result.jobs);
        return;
      }

      if (result.jobs) onQueued(result.jobs);
      onNotify(result.message);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Video generation failed';
      logVideo('videoStudioGenerate threw', { message });
      setErrorDialog({
        title: 'Video generation failed',
        message,
        detail: 'The IPC call to the main process failed. Check C:\\AI\\AIStudio\\logs\\studio.log for details.',
      });
      onNotify(null, message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
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
            {setupLoading && (
              <p className="text-xs text-text-muted">Checking Wan2.2 5B video setup…</p>
            )}

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

            {vramWarning && !setupBlocked && (
              <p className="text-xs text-warning rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
                {vramWarning}
              </p>
            )}

            {blockReason && !submitting && (
              <p className="text-xs text-text-muted rounded-lg border border-border/50 bg-surface-overlay/40 px-3 py-2">
                {blockReason}
              </p>
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
                disabled={submitting}
                onClick={() => void handleGenerateClick()}
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

      {errorDialog && (
        <VideoErrorDialog
          title={errorDialog.title}
          message={errorDialog.message}
          detail={errorDialog.detail}
          onClose={() => setErrorDialog(null)}
        />
      )}
    </>
  );
}
