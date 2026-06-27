interface ServiceChipProps {
  label: string;
  status: 'green' | 'yellow' | 'red';
  message: string;
  onClick?: () => void;
}

const STATUS_STYLES = {
  green: 'bg-success/15 text-success border-success/30',
  yellow: 'bg-warning/15 text-warning border-warning/30',
  red: 'bg-danger/15 text-danger border-danger/30',
};

const DOT_STYLES = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-danger',
};

export function ServiceChip({ label, status, message, onClick }: ServiceChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={message}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-opacity hover:opacity-90 ${STATUS_STYLES[status]}`}
    >
      <span className={`w-2 h-2 rounded-full ${DOT_STYLES[status]}`} />
      {label}
    </button>
  );
}
