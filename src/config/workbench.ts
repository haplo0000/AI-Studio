export type WorkbenchToolKind = 'launch-module' | 'launch-action' | 'open-url' | 'navigate' | 'placeholder';

export interface WorkbenchTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  kind: WorkbenchToolKind;
  target?: string;
  placeholder?: boolean;
  serviceId?: string;
}

export interface WorkbenchSection {
  id: string;
  title: string;
  tools: WorkbenchTool[];
}

export const WORKBENCH_SECTIONS: WorkbenchSection[] = [
  {
    id: 'think',
    title: 'THINK',
    tools: [
      {
        id: 'spark',
        name: 'Spark',
        description: 'Quick ideation and brainstorming',
        icon: '✨',
        kind: 'placeholder',
        placeholder: true,
      },
      {
        id: 'blacksmith',
        name: 'Blacksmith',
        description: 'Creative workshop before the Council',
        icon: '🔨',
        kind: 'navigate',
        target: 'blacksmith',
      },
      {
        id: 'solo',
        name: 'Solo',
        description: 'Single-model Council OS workspace',
        icon: '🧠',
        kind: 'launch-module',
        target: 'council-os',
        serviceId: 'council_os',
      },
      {
        id: 'council',
        name: 'Council',
        description: 'Multi-model deliberation',
        icon: '🏛️',
        kind: 'launch-module',
        target: 'council-os',
        serviceId: 'council_os',
      },
    ],
  },
  {
    id: 'build',
    title: 'BUILD',
    tools: [
      {
        id: 'cursor',
        name: 'Cursor',
        description: 'Open Cursor IDE',
        icon: '⌨️',
        kind: 'launch-action',
        target: 'cursor',
      },
      {
        id: 'github',
        name: 'GitHub',
        description: 'Repository and collaboration',
        icon: '🐙',
        kind: 'placeholder',
        placeholder: true,
      },
      {
        id: 'terminal',
        name: 'Terminal',
        description: 'System shell access',
        icon: '💻',
        kind: 'placeholder',
        placeholder: true,
      },
      {
        id: 'coding',
        name: 'Coding',
        description: 'Solo coding via Council OS and Cursor',
        icon: '🛠️',
        kind: 'launch-module',
        target: 'coding',
        serviceId: 'ollama',
      },
    ],
  },
  {
    id: 'create',
    title: 'CREATE',
    tools: [
      {
        id: 'image-studio',
        name: 'Image Studio',
        description: 'Generate and browse images — ComfyUI executes',
        icon: '🎨',
        kind: 'navigate',
        target: 'image-studio',
        serviceId: 'comfyui',
      },
      {
        id: 'video',
        name: 'Video',
        description: 'Video generation workspace',
        icon: '🎬',
        kind: 'placeholder',
        placeholder: true,
      },
      {
        id: 'voice',
        name: 'Voice',
        description: 'Speech synthesis and transcription',
        icon: '🎙️',
        kind: 'placeholder',
        placeholder: true,
      },
      {
        id: 'audio',
        name: 'Audio',
        description: 'Audio processing and effects',
        icon: '🔊',
        kind: 'placeholder',
        placeholder: true,
      },
    ],
  },
  {
    id: 'knowledge',
    title: 'KNOWLEDGE',
    tools: [
      {
        id: 'library',
        name: 'Library',
        description: 'Reference and knowledge base',
        icon: '📚',
        kind: 'placeholder',
        placeholder: true,
      },
      {
        id: 'models',
        name: 'Models',
        description: 'Workstation model inventory',
        icon: '🦙',
        kind: 'launch-module',
        target: 'ollama',
        serviceId: 'ollama',
      },
      {
        id: 'documents',
        name: 'Documents',
        description: 'Document workspace',
        icon: '📄',
        kind: 'placeholder',
        placeholder: true,
      },
    ],
  },
  {
    id: 'utilities',
    title: 'UTILITIES',
    tools: [
      {
        id: 'settings',
        name: 'Settings',
        description: 'Hub paths and services',
        icon: '⚙️',
        kind: 'navigate',
        target: 'settings',
      },
      {
        id: 'logs',
        name: 'Logs',
        description: 'Studio activity log',
        icon: '📋',
        kind: 'navigate',
        target: 'logs',
      },
      {
        id: 'health',
        name: 'Health',
        description: 'Service health overview',
        icon: '💚',
        kind: 'navigate',
        target: 'health',
      },
      {
        id: 'launchers',
        name: 'Launchers',
        description: 'All launch actions',
        icon: '🚀',
        kind: 'navigate',
        target: 'launchers',
      },
      {
        id: 'stability-matrix',
        name: 'Stability Matrix',
        description: 'Open model and package manager',
        icon: '🧩',
        kind: 'launch-action',
        target: 'stability-matrix',
      },
    ],
  },
];
