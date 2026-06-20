const STYLES = {
  requested: 'bg-gold/15 text-gold-dark',
  assigned: 'bg-sage/15 text-sage',
  in_progress: 'bg-ink/10 text-ink',
  completed: 'bg-sage/20 text-sage',
  cancelled: 'bg-clay/15 text-clay',
};

const LABELS = {
  requested: 'Finding a driver',
  assigned: 'Driver assigned',
  in_progress: 'On the way',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STYLES[status] || 'bg-ink/10 text-ink'}`}
    >
      {LABELS[status] || status}
    </span>
  );
}
