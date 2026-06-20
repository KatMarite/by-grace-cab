// The signature visual element for By Grace Cab's core differentiator: multi-stop routes.
// Renders stops as a vertical ticket-stub list with a dashed gold connector line,
// so the route itself reads like a real, ordered journey rather than a generic form.

export default function RouteTicket({ stops, editable = false, onRemoveStop, onLabelChange }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-5">
      {stops.map((stop, i) => {
        const isFirst = i === 0;
        const isLast = i === stops.length - 1;
        return (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center pt-1">
              <div
                className={`w-3 h-3 rounded-full shrink-0 ${
                  isFirst ? 'bg-sage' : isLast ? 'bg-clay' : 'bg-gold'
                }`}
              />
              {!isLast && <div className="route-line flex-1 mt-1" style={{ minHeight: 28 }} />}
            </div>
            <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-mono uppercase tracking-wide text-ink/50">
                  {isFirst ? 'Pickup' : isLast ? 'Destination' : `Stop ${i}`}
                </p>
                {editable && !isFirst && !isLast && (
                  <button
                    type="button"
                    onClick={() => onRemoveStop(i)}
                    className="text-xs text-clay hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              {editable ? (
                <input
                  type="text"
                  value={stop.label}
                  onChange={(e) => onLabelChange(i, e.target.value)}
                  placeholder="Enter an address"
                  className="w-full mt-0.5 bg-transparent border-b border-ink/15 focus:border-gold outline-none py-1 font-body text-ink placeholder:text-ink/30"
                />
              ) : (
                <p className="font-semibold text-ink">{stop.label || 'Not set'}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
