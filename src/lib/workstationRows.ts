import type { WorkstationStatus } from '../types/studio';

export type WorkstationRowState = 'pending' | 'starting' | 'ready' | 'offline';

export function rowState(id: string, status: WorkstationStatus | null): WorkstationRowState {
  if (!status) return 'pending';
  const svc = status.services[id];
  if (svc?.status === 'green') return 'ready';
  if (status.activeService === id && status.phase === 'starting') return 'starting';
  if (svc?.status === 'red') return 'offline';
  return 'pending';
}

export function rowIcon(state: WorkstationRowState, isCouncilOptional = false): string {
  if (isCouncilOptional) return '○';
  switch (state) {
    case 'ready':
      return '✓';
    case 'starting':
      return '◌';
    case 'offline':
      return '✕';
    default:
      return '○';
  }
}

export function splashRowLabel(
  id: string,
  label: string,
  status: WorkstationStatus | null,
): string {
  const state = rowState(id, status);

  if (id === 'council_os') {
    if (state === 'ready') return 'Council';
    if (state === 'starting') return 'Council';
    return 'Council (on demand)';
  }

  return label;
}

export function splashRowClass(id: string, status: WorkstationStatus | null): string {
  const state = rowState(id, status);
  const workbenchReady = status?.workbenchReady === true;
  const isCouncilOptional = id === 'council_os' && workbenchReady && state !== 'ready';

  if (isCouncilOptional) return 'text-text-muted';
  switch (state) {
    case 'ready':
      return 'text-success';
    case 'starting':
      return 'text-warning animate-pulse';
    case 'offline':
      return 'text-danger';
    default:
      return 'text-text-muted';
  }
}

export function isCouncilOptionalRow(id: string, status: WorkstationStatus | null): boolean {
  return id === 'council_os' && status?.workbenchReady === true && rowState(id, status) !== 'ready';
}
