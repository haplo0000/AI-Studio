import { useEffect, useState } from 'react';
import type { Artifact, Project, TimelineEntry } from '../types';
import { loadArtifacts, loadProject, loadTimeline } from '../storage';

export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setArtifacts([]);
      setTimeline([]);
      return;
    }
    setProject(loadProject(projectId));
    setArtifacts(loadArtifacts(projectId));
    setTimeline(loadTimeline(projectId));
  }, [projectId]);

  return { project, artifacts, timeline };
}
