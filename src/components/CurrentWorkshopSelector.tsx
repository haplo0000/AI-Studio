import type { WorkshopEntry } from '../types/studio';

interface CurrentWorkshopSelectorProps {
  workshops: WorkshopEntry[];
  currentWorkshopId: string | null;
  onChange: (workshopId: string) => void;
}

export function CurrentWorkshopSelector({
  workshops,
  currentWorkshopId,
  onChange,
}: CurrentWorkshopSelectorProps) {
  const current = workshops.find((w) => w.id === currentWorkshopId);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="current-workshop" className="text-xs text-text-muted whitespace-nowrap">
        Current workshop
      </label>
      <select
        id="current-workshop"
        value={currentWorkshopId || ''}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm bg-surface-overlay border border-border rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 min-w-[180px] max-w-[280px]"
      >
        {workshops.map((workshop) => (
          <option key={workshop.id} value={workshop.id}>
            {workshop.name}
          </option>
        ))}
      </select>
      {current && (
        <span className="hidden md:inline text-xs text-text-muted truncate max-w-[240px]">
          {current.description}
        </span>
      )}
    </div>
  );
}
