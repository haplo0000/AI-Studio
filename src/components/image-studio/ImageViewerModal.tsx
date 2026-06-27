import { useCallback, useEffect, useRef, useState } from 'react';
import type { WheelEvent, MouseEvent } from 'react';
import type { ImageRecord } from '../../types/imageStudio';

interface ImageViewerModalProps {
  images: ImageRecord[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onDelete: (image: ImageRecord) => void;
  onAction: (action: string, image: ImageRecord) => void;
}

export function ImageViewerModal({
  images,
  index,
  onClose,
  onIndexChange,
  onDelete,
  onAction,
}: ImageViewerModalProps) {
  const image = images[index];
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const src = image ? window.aiStudio.getMediaUrl(image.path) : '';

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setFit(true);
  }, []);

  useEffect(() => {
    resetView();
  }, [index, resetView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (e.key === 'ArrowRight' && index < images.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length, onClose, onIndexChange]);

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    setFit(false);
    setScale((s) => Math.min(8, Math.max(0.25, s - e.deltaY * 0.001)));
  };

  const onMouseDown = (e: MouseEvent) => {
    if (fit) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };

  const onMouseUp = () => {
    dragging.current = false;
  };

  const onDoubleClick = () => {
    if (fit) {
      setFit(false);
      setScale(1.5);
    } else {
      resetView();
    }
  };

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
        <p className="text-sm text-white/80 truncate max-w-md">{image.filename}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">
            {index + 1} / {images.length}
          </span>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white px-3 py-1">
            ESC ✕
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={onDoubleClick}
      >
        <img
          src={src}
          alt={image.filename}
          draggable={false}
          className="max-w-none select-none transition-transform duration-75"
          style={{
            transform: fit
              ? 'scale(1)'
              : `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            maxWidth: fit ? '100%' : undefined,
            maxHeight: fit ? '100%' : undefined,
            objectFit: fit ? 'contain' : undefined,
          }}
        />
      </div>

      <div className="shrink-0 p-4 border-t border-white/10 flex flex-wrap gap-2 justify-center">
        <ViewerBtn label="← Prev" disabled={index <= 0} onClick={() => onIndexChange(index - 1)} />
        <ViewerBtn label="Next →" disabled={index >= images.length - 1} onClick={() => onIndexChange(index + 1)} />
        <ViewerBtn label="Reveal" onClick={() => onAction('reveal', image)} />
        <ViewerBtn label="Copy Image" onClick={() => onAction('copy-image', image)} />
        <ViewerBtn label="Copy Prompt" onClick={() => onAction('copy-prompt', image)} />
        <ViewerBtn label="Upscale" onClick={() => onAction('upscale', image)} />
        <ViewerBtn label="Variations" onClick={() => onAction('variations', image)} />
        <ViewerBtn label="Blacksmith" onClick={() => onAction('blacksmith', image)} />
        <ViewerBtn
          label="Delete"
          variant="danger"
          onClick={() => {
            if (window.confirm(`Delete ${image.filename}?`)) onDelete(image);
          }}
        />
      </div>

      {image.prompt && (
        <div className="shrink-0 px-4 pb-4 max-h-24 overflow-y-auto">
          <p className="text-xs text-white/60">{image.prompt}</p>
        </div>
      )}
    </div>
  );
}

function ViewerBtn({
  label,
  disabled,
  variant = 'default',
  onClick,
}: {
  label: string;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  onClick: () => void;
}) {
  const cls =
    variant === 'danger'
      ? 'border-red-500/50 text-red-300 hover:bg-red-500/20'
      : 'border-white/20 text-white/80 hover:bg-white/10';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs border disabled:opacity-30 ${cls}`}
    >
      {label}
    </button>
  );
}
