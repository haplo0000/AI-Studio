import { useCallback, useEffect, useState } from 'react';
import { useProjects } from './hooks/useProjects';
import { useProject } from './hooks/useProject';
import { ProjectList } from './components/ProjectList';
import { ProjectHome } from './components/ProjectHome';
import { DocumentViewer } from './components/DocumentViewer';

interface Props {
  onNewIdea: (sessionId?: string) => void;
}

/**
 * Primary workspace. Projects are the unit of work — not conversations.
 *
 * Layout: two-panel (project list left, project home or document viewer right).
 * Syncs sessions → projects on every mount to pick up pipeline completions.
 */
export function ArtifactBrowser({ onNewIdea }: Props) {
  const { projects, loading, refresh } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

  const { project, artifacts, timeline } = useProject(selectedProjectId);

  // Auto-select the most recent project if none is selected and projects exist
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const handleSelectProject = useCallback((id: string) => {
    setSelectedProjectId(id);
    setSelectedArtifactId(null);
  }, []);

  const handleSelectArtifact = useCallback((artifactId: string) => {
    setSelectedArtifactId(artifactId);
  }, []);

  const handleBackToProject = useCallback(() => {
    setSelectedArtifactId(null);
  }, []);

  const handleContinue = useCallback(() => {
    if (project) {
      onNewIdea(project.sessionId);
    }
  }, [project, onNewIdea]);

  const handleNewIdea = useCallback(() => {
    onNewIdea();
  }, [onNewIdea]);

  // Refresh when focus returns (catches pipeline completions in the 'idea' view)
  useEffect(() => {
    const onFocus = () => {
      refresh();
      // Re-sync selected project data
      if (selectedProjectId) {
        setSelectedArtifactId((prev) => prev); // trigger useProject re-read via key if needed
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh, selectedProjectId]);

  const selectedArtifact = selectedArtifactId
    ? artifacts.find((a) => a.id === selectedArtifactId) ?? null
    : null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
        Loading projects…
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* ── Left panel: project list ── */}
      <div className="w-60 shrink-0 border-r border-border-subtle flex flex-col min-h-0 bg-surface-raised/30">
        <ProjectList
          projects={projects}
          selectedId={selectedProjectId}
          onSelect={handleSelectProject}
          onNewIdea={handleNewIdea}
        />
      </div>

      {/* ── Right panel: project home or document viewer ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {!selectedProjectId && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <div className="text-center space-y-2">
              <div className="text-4xl">🏢</div>
              <h2 className="text-lg font-semibold text-text-primary">No project selected</h2>
              <p className="text-sm text-text-muted">
                Select a project from the list, or start a new idea.
              </p>
            </div>
            <button
              type="button"
              onClick={handleNewIdea}
              className="text-sm px-5 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              💡 New Idea
            </button>
          </div>
        )}

        {selectedProjectId && project && !selectedArtifact && (
          <ProjectHome
            project={project}
            artifacts={artifacts}
            timeline={timeline}
            onSelectArtifact={handleSelectArtifact}
            onContinue={handleContinue}
          />
        )}

        {selectedProjectId && selectedArtifact && (
          <DocumentViewer
            artifact={selectedArtifact}
            onBack={handleBackToProject}
          />
        )}
      </div>
    </div>
  );
}
