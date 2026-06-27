import type { ModuleManifest } from '../types/studio';

const ICONS: Record<string, string> = {
  council: '🏛️',
  coding: '💻',
  image: '🎨',
  ollama: '🦙',
  foundry: '⚒️',
  climatology: '📈',
  video: '🎬',
  voice: '🎙️',
  blacksmith: '🔨',
};

interface NavRailProps {
  modules: ModuleManifest[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function NavRail({ modules, activeId, onSelect }: NavRailProps) {
  return (
    <nav className="w-[72px] shrink-0 border-r border-border-subtle bg-surface-raised/80 flex flex-col items-center py-4 gap-2">
      {modules.map((mod) => {
        const active = mod.id === activeId;
        return (
          <button
            key={mod.id}
            type="button"
            onClick={() => onSelect(mod.id)}
            title={mod.name}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
              active
                ? 'bg-accent/20 ring-2 ring-accent/40'
                : 'hover:bg-surface-overlay opacity-80 hover:opacity-100'
            } ${mod.status === 'placeholder' ? 'opacity-50' : ''}`}
          >
            {ICONS[mod.icon] || '📦'}
          </button>
        );
      })}
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => onSelect('settings')}
        title="Settings"
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
          activeId === 'settings'
            ? 'bg-accent/20 ring-2 ring-accent/40'
            : 'hover:bg-surface-overlay opacity-80'
        }`}
      >
        ⚙️
      </button>
    </nav>
  );
}
