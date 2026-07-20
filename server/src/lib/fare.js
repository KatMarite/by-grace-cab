// Fare calculation for By Grace Cab
// Transparent, fixed-rate pricing (no surge) — this is a key differentiator vs Uber.

const BASE_FARE = 25;          // R25 base fare (flat boarding fee)
const PER_KM_RATE = 12.5;      // R12.50 per km
const PER_STOP_FEE = 12;       // R12 fee per extra stop (beyond pickup + final destination)
const SCHEDULED_DISCOUNT = 0.05; // 5% off for pre-booking ahead of time
const SERVICE_FEE_RATE = 0.08; // 8% service fee (transparent, shown in breakdown)

async function getRouteDistanceKm(stops) {
  // stops is array of {lat, lng}
  // OSRM format: lng,lat;lng,lat
  const coordinates = stops.map(s => `${s.lng},${s.lat}`).join(';');
  const url = `http://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to calculate route distance.');
  }
  const data = await response.json();
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found for these locations.');
  }
  // distance is in meters, return km
  return data.routes[0].distance / 1000;
}

/**
 * stops: ordered array of {label, lat, lng} starting with pickup, ending with final destination.
 * Anything in between counts as an "extra stop" for fee purposes.
 * isScheduled: boolean, whether this ride was pre-booked.
 * groupMembers: array of {name, email, share} where share is a 0-1 fraction of the total (must sum to 1).
 */
export async function calculateFare({ stops, isScheduled, groupMembers }) {
  if (!Array.isArray(stops) || stops.length < 2) {
    throw new Error('At least a pickup and destination stop are required');
  }

  const totalDistanceKm = await getRouteDistanceKm(stops);

  const extraStopsCount = Math.max(0, stops.length - 2);
  const distanceCost = totalDistanceKm * PER_KM_RATE;
  const stopsCost = extraStopsCount * PER_STOP_FEE;

  let subtotal = BASE_FARE + distanceCost + stopsCost;

  let scheduledDiscountAmount = 0;
  if (isScheduled) {
    scheduledDiscountAmount = subtotal * SCHEDULED_DISCOUNT;
    subtotal -= scheduledDiscountAmount;
  }

  const serviceFee = subtotal * SERVICE_FEE_RATE;
  const total = Math.round((subtotal + serviceFee) * 100) / 100;

  const breakdown = {
    baseFare: round2(BASE_FARE),
    distanceKm: round2(totalDistanceKm),
    distanceCost: round2(distanceCost),
    extraStopsCount,
    stopsCost: round2(stopsCost),
    scheduledDiscountAmount: round2(scheduledDiscountAmount),
    serviceFee: round2(serviceFee),
    total: round2(total),
  };

  // Split across group members proportionally to their declared share.
  // If no group members provided, the rider pays 100%.
  let splits = [];
  if (Array.isArray(groupMembers) && groupMembers.length > 0) {
    const shareSum = groupMembers.reduce((s, m) => s + (m.share || 0), 0);
    if (Math.abs(shareSum - 1) > 0.01) {
      throw new Error('Group member shares must sum to 1 (100%)');
    }
    splits = groupMembers.map((m) => ({
      name: m.name,
      email: m.email,
      amount: round2(total * m.share),
    }));
    // Fix rounding drift on the last split so totals match exactly
    const splitSum = splits.reduce((s, m) => s + m.amount, 0);
    const drift = round2(total - splitSum);
    if (drift !== 0 && splits.length > 0) {
      splits[splits.length - 1].amount = round2(splits[splits.length - 1].amount + drift);
    }
  } else {
    splits = [{ name: 'You', email: null, amount: total }];
  }

  return { breakdown, splits, total: breakdown.total };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
