interface VideoErrorDialogProps {
  title: string;
  message: string;
  detail?: string;
  onClose: () => void;
}

export function VideoErrorDialog({ title, message, detail, onClose }: VideoErrorDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
      <div
        className="w-full max-w-md rounded-2xl border border-danger/40 bg-surface-base shadow-xl p-5 space-y-4"
        role="alertdialog"
        aria-labelledby="video-error-title"
      >
        <div>
          <h3 id="video-error-title" className="text-sm font-semibold text-danger">
            {title}
          </h3>
          <p className="text-sm text-text-primary mt-2">{message}</p>
          {detail && (
            <p className="text-xs text-text-secondary mt-2 whitespace-pre-wrap break-words">{detail}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2 rounded-xl bg-danger/15 border border-danger/30 text-danger text-sm font-medium hover:bg-danger/25"
        >
          OK
        </button>
      </div>
    </div>
  );
}
