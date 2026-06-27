import type { ServiceHealth } from '../types/studio';

interface ToolTileProps {
  name: string;
  description: string;
  icon: string;
  placeholder?: boolean;
  service?: ServiceHealth;
  disabled?: boolean;
  onClick: () => void;
}

export function ToolTile({
  name,
  description,
  icon,
  placeholder,
  service,
  disabled,
  onClick,
}: ToolTileProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group text-left p-4 rounded-xl border transition-all ${
        placeholder
          ? 'border-dashed border-border bg-surface-overlay/20 opacity-60 cursor-default'
          : 'border-border bg-surface-overlay/40 hover:bg-surface-overlay hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5'
      } ${disabled && !placeholder ? 'opacity-50 cursor-wait' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-text-primary truncate">{name}</h3>
            {placeholder && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-raised text-text-muted">
                Soon
              </span>
            )}
            {service && !placeholder && (
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  service.status === 'green'
                    ? 'bg-success'
                    : service.status === 'yellow'
                      ? 'bg-warning'
                      : 'bg-danger'
                }`}
                title={`${service.label}: ${service.message}`}
              />
            )}
          </div>
          <p className="text-xs text-text-muted line-clamp-2">{description}</p>
        </div>
      </div>
    </button>
  );
}
