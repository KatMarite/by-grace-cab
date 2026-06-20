export default function FareBreakdown({ breakdown, splits }) {
  if (!breakdown) return null;

  const rows = [
    { label: 'Base fare', value: breakdown.baseFare },
    { label: `Distance · ${breakdown.distanceKm} km`, value: breakdown.distanceCost },
  ];
  if (breakdown.extraStopsCount > 0) {
    rows.push({ label: `Extra stops · ${breakdown.extraStopsCount}`, value: breakdown.stopsCost });
  }
  if (breakdown.scheduledDiscountAmount > 0) {
    rows.push({ label: 'Pre-booking discount', value: -breakdown.scheduledDiscountAmount });
  }
  rows.push({ label: 'Service fee', value: breakdown.serviceFee });

  return (
    <div className="bg-ink rounded-xl p-5 text-ivory">
      <p className="text-xs font-mono uppercase tracking-wide text-gold-light mb-3">
        Fixed price · no surge
      </p>
      <div className="space-y-1.5 font-mono text-sm">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between text-ivory/80">
            <span>{r.label}</span>
            <span>{r.value < 0 ? '-' : ''}R{Math.abs(r.value).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-ivory/15 mt-3 pt-3 flex justify-between items-baseline">
        <span className="font-body font-semibold">Total</span>
        <span className="font-display text-2xl font-semibold text-gold-light">
          R{breakdown.total.toFixed(2)}
        </span>
      </div>

      {splits && splits.length > 1 && (
        <div className="mt-4 pt-4 border-t border-ivory/15">
          <p className="text-xs font-mono uppercase tracking-wide text-ivory/50 mb-2">
            Split {splits.length} ways
          </p>
          <div className="space-y-1">
            {splits.map((s, i) => (
              <div key={i} className="flex justify-between text-sm text-ivory/80">
                <span>{s.name}</span>
                <span className="font-mono">R{s.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
