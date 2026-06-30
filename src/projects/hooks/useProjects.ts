import { useCallback, useEffect, useState } from 'react';
import type { Project } from '../types';
import { loadAllProjects, syncSessionsToProjects } from '../storage';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    syncSessionsToProjects();
    setProjects(loadAllProjects());
  }, []);

  useEffect(() => {
    refresh();
    setLoading(false);
  }, [refresh]);

  return { projects, loading, refresh };
}
