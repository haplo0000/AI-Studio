export type ServiceStatus = 'green' | 'yellow' | 'red';

export type WorkshopStatus = 'active' | 'placeholder' | 'unconfigured';

import type { BlacksmithSession } from './blacksmith';
import type { AiStudioImageApi } from './imageStudioApi';

export type WorkbenchView =
  | 'blacksmith'
  | 'image-studio'
  | 'workbench'
  | 'settings'
  | 'logs'
  | 'health'
  | 'launchers';

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

export interface WorkshopEntry {
  id: string;
  name: string;
  description: string;
  status: WorkshopStatus;
  repository_path: string | null;
  path_key?: string | null;
  council_project_id?: string | null;
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
  image_studio?: {
    output_folder?: string;
  };
  blacksmith?: {
    model?: string;
  };
  workshops?: {
    current: string | null;
    entries: WorkshopEntry[];
  };
  /** @deprecated use workshops */
  projects?: {
    current: string | null;
    entries: WorkshopEntry[];
  };
}

export interface BootstrapData {
  settings: StudioSettings;
  services: ServiceHealth[];
  modules: ModuleManifest[];
  workshops: WorkshopEntry[];
  currentWorkshopId: string | null;
  logs: LogEntry[];
  tauriBlocked: boolean;
  runtimeNote: string;
}

export interface WorkstationServiceSnapshot {
  id: string;
  label: string;
  status: ServiceStatus;
  message: string;
}

export interface WorkstationStatus {
  phase: 'idle' | 'starting' | 'ready';
  message: string;
  activeService?: string;
  workbenchReady: boolean;
  services: Record<string, WorkstationServiceSnapshot>;
}

export interface AiStudioApi extends AiStudioImageApi {
  getBootstrap: () => Promise<BootstrapData>;
  refreshHealth: () => Promise<ServiceHealth[]>;
  getLogs: () => Promise<LogEntry[]>;
  launchModule: (moduleId: string) => Promise<{ ok: boolean; message: string }>;
  launchAction: (action: string) => Promise<{ ok: boolean; message: string }>;
  openUrl: (url: string) => Promise<{ ok: boolean }>;
  setCurrentWorkshop: (workshopId: string) => Promise<{ ok: boolean; currentWorkshopId: string }>;
  openWorkshopFolder: (workshopId: string) => Promise<{ ok: boolean; message: string }>;
  openWorkshopInCursor: (workshopId: string) => Promise<{ ok: boolean; message: string }>;
  prepareWorkstation: () => Promise<WorkstationStatus>;
  startService: (serviceId: string) => Promise<{ ok: boolean; message: string }>;
  restartComfyui: () => Promise<{ ok: boolean; message: string }>;
  openCouncil: () => Promise<{ ok: boolean; message: string }>;
  onWorkstationStatus: (callback: (status: WorkstationStatus) => void) => () => void;
  blacksmithCreateSession: (
    workshopId: string | null,
    mode: string,
    goal: string,
  ) => Promise<BlacksmithSession>;
  blacksmithGetSession: (sessionId: string) => Promise<BlacksmithSession>;
  blacksmithListSessions: () => Promise<BlacksmithSession[]>;
  blacksmithSendMessage: (sessionId: string, content: string) => Promise<BlacksmithSession>;
  blacksmithSendToCouncil: (
    sessionId: string,
  ) => Promise<{ ok: boolean; message: string; briefId: string; briefPath: string }>;
}

declare global {
  interface Window {
    aiStudio: AiStudioApi;
  }
}

export {};
