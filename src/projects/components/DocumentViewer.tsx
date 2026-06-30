import type { Artifact } from '../types';
import { DocumentHeader } from './DocumentHeader';
import { renderDocumentContent } from '../contentRenderers';

interface Props {
  artifact: Artifact;
  onBack: () => void;
}

/**
 * Generic document reader.
 *
 * The viewer shell is artifact-type agnostic.
 * Content rendering is delegated to the renderer registry (contentRenderers/index.ts).
 * Adding a new document type requires registering a renderer — not modifying this component.
 */
export function DocumentViewer({ artifact, onBack }: Props) {
  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Navigation bar */}
      <div className="shrink-0 border-b border-border-subtle px-6 py-3 flex items-center gap-3 bg-surface-raised/60">
        <button
          type="button"
          onClick={onBack}
          className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
        >
          ← Back to Project
        </button>
        <span className="text-text-muted text-xs">·</span>
        <span className="text-xs text-text-secondary">{artifact.title}</span>
      </div>

      {/* Document body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <DocumentHeader artifact={artifact} />
          {renderDocumentContent(artifact)}
        </div>
      </div>
    </div>
  );
}
