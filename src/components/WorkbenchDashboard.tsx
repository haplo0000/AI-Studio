import { WORKBENCH_SECTIONS } from '../config/workbench';
import type { ServiceHealth, WorkshopEntry } from '../types/studio';
import { AddWorkshopCard, WorkshopCard } from './WorkshopCard';
import { ToolTile } from './ToolTile';

interface WorkbenchDashboardProps {
  workshops: WorkshopEntry[];
  currentWorkshopId: string | null;
  services: ServiceHealth[];
  busy: boolean;
  onToolClick: (toolId: string, kind: string, target?: string, placeholder?: boolean) => void;
  onSelectWorkshop: (workshopId: string) => void;
  onOpenWorkshopFolder: (workshopId: string) => void;
  onOpenWorkshopInCursor: (workshopId: string) => void;
}

export function WorkbenchDashboard({
  workshops,
  currentWorkshopId,
  services,
  busy,
  onToolClick,
  onSelectWorkshop,
  onOpenWorkshopFolder,
  onOpenWorkshopInCursor,
}: WorkbenchDashboardProps) {
  const currentWorkshop = workshops.find((w) => w.id === currentWorkshopId);

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Tools & Workshops</h1>
          <p className="text-sm text-text-secondary">
            Permanent tools and independent workshop creations — forge ideas in Blacksmith first.
          </p>
        </div>

        {currentWorkshop && (
          <div className="p-4 rounded-xl border border-accent/30 bg-accent/5">
            <p className="text-xs uppercase tracking-wide text-accent mb-1">Workshop context</p>
            <p className="text-sm font-medium text-text-primary">{currentWorkshop.name}</p>
            <p className="text-xs text-text-muted mt-1">
              Context only — workshops own their code, assets, and repositories.
            </p>
          </div>
        )}

        {WORKBENCH_SECTIONS.map((section) => (
          <section key={section.id}>
            <h2 className="text-xs font-bold tracking-widest text-text-muted mb-3">{section.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {section.tools.map((tool) => (
                <ToolTile
                  key={tool.id}
                  name={tool.name}
                  description={tool.description}
                  icon={tool.icon}
                  placeholder={tool.placeholder}
                  disabled={busy && !tool.placeholder}
                  service={
                    tool.serviceId ? services.find((s) => s.id === tool.serviceId) : undefined
                  }
                  onClick={() =>
                    onToolClick(tool.id, tool.kind, tool.target, tool.placeholder)
                  }
                />
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="text-xs font-bold tracking-widest text-text-muted mb-3">WORKSHOPS</h2>
          <p className="text-xs text-text-muted mb-4">
            Independent creations — Foundry, AI Academy, Fern &amp; Friend, and more. Not components
            of AI Studio; the workbench provides capabilities to them.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {workshops.map((workshop) => (
              <WorkshopCard
                key={workshop.id}
                workshop={workshop}
                isCurrent={workshop.id === currentWorkshopId}
                busy={busy}
                onSelect={() => onSelectWorkshop(workshop.id)}
                onOpenFolder={() => onOpenWorkshopFolder(workshop.id)}
                onOpenInCursor={() => onOpenWorkshopInCursor(workshop.id)}
              />
            ))}
            <AddWorkshopCard />
          </div>
        </section>
      </div>
    </div>
  );
}
