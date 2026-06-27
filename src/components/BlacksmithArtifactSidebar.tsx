import type { BlacksmithSidebar } from '../types/blacksmith';
import { SIDEBAR_SECTIONS } from '../types/blacksmith';

interface BlacksmithArtifactSidebarProps {
  sidebar: BlacksmithSidebar;
}

export function BlacksmithArtifactSidebar({ sidebar }: BlacksmithArtifactSidebarProps) {
  return (
    <aside className="w-80 shrink-0 border-l border-border-subtle bg-surface-raised/50 flex flex-col min-h-0 overflow-y-auto">
      <div className="p-4 border-b border-border-subtle">
        <h2 className="text-sm font-semibold text-text-primary">Forge Artifacts</h2>
        <p className="text-xs text-text-muted mt-1">Auto-populated as you converse</p>
      </div>
      <div className="p-3 space-y-4">
        {SIDEBAR_SECTIONS.map(({ key, label }) => {
          const items = sidebar[key];
          return (
            <section key={key}>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                {label}
              </h3>
              {items.length === 0 ? (
                <p className="text-xs text-text-muted italic">—</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((item, i) => (
                    <li
                      key={`${key}-${i}`}
                      className="text-xs text-text-secondary leading-relaxed px-2 py-1.5 rounded-lg bg-surface-overlay/40 border border-border-subtle"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
