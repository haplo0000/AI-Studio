export type ServiceStatus = 'green' | 'yellow' | 'red';

export interface ServiceHealth {
  id: string;
  label: string;
  status: ServiceStatus;
  message: string;
  url?: string;
}

export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  icon: string;
  status: 'active' | 'placeholder';
  capabilities: string[];
  dependencies?: { services?: string[]; optional?: string[] };
  launch?: Record<string, unknown>;
  health?: { serviceId?: string };
  ui?: {
    surface?: string;
    urlKey?: string;
    message?: string;
  };
}

export interface LogEntry {
  ts: string;
  level: string;
  source: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface StudioSettings {
  version: number;
  theme: string;
  hub_root: string;
  paths: Record<string, string | null>;
  services: Record<string, string>;
  launchers: Record<string, string>;
}

export interface BootstrapData {
  settings: StudioSettings;
  services: ServiceHealth[];
  modules: ModuleManifest[];
  logs: LogEntry[];
  tauriBlocked: boolean;
  runtimeNote: string;
}

export interface AiStudioApi {
  getBootstrap: () => Promise<BootstrapData>;
  refreshHealth: () => Promise<ServiceHealth[]>;
  getLogs: () => Promise<LogEntry[]>;
  launchModule: (moduleId: string) => Promise<{ ok: boolean; message: string }>;
  launchAction: (action: string) => Promise<{ ok: boolean; message: string }>;
  openUrl: (url: string) => Promise<{ ok: boolean }>;
}

declare global {
  interface Window {
    aiStudio: AiStudioApi;
  }
}

export {};
