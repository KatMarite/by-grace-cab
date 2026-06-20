import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Button from '../components/Button';
import RouteTicket from '../components/RouteTicket';
import FareBreakdown from '../components/FareBreakdown';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

// A handful of well-known Johannesburg locations so the demo has realistic geocoding
// without needing a live maps/geocoding API key.
const KNOWN_PLACES = {
  'sandton city': { lat: -26.1076, lng: 28.0567 },
  'rosebank mall': { lat: -26.1467, lng: 28.0436 },
  'or tambo airport': { lat: -26.1392, lng: 28.246 },
  'melrose arch': { lat: -26.1339, lng: 28.0689 },
  'monte casino': { lat: -26.0226, lng: 27.9856 },
  'gold reef city': { lat: -26.2389, lng: 28.0103 },
  'constitution hill': { lat: -26.1903, lng: 28.0436 },
  'fourways mall': { lat: -25.9989, lng: 28.0094 },
  'eastgate shopping centre': { lat: -26.1789, lng: 28.1119 },
  'cresta shopping centre': { lat: -26.1444, lng: 27.9928 },
};

function guessCoords(label) {
  const key = label.trim().toLowerCase();
  if (KNOWN_PLACES[key]) return KNOWN_PLACES[key];
  // Deterministic pseudo-geocode fallback so distance math stays stable for any typed address.
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) % 100000;
  const lat = -26.2041 + ((hash % 200) - 100) / 1000;
  const lng = 28.0473 + (((hash >> 4) % 200) - 100) / 1000;
  return { lat, lng };
}

export default function RiderDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('book');
  const [rides, setRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(true);

  useEffect(() => {
    loadRides();
  }, []);

  async function loadRides() {
    setLoadingRides(true);
    try {
      const data = await api.listRides(token);
      setRides(data.rides);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRides(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink/60">Hi, {user.name.split(' ')[0]}</span>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }}>Sign out</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex gap-2 mb-8 bg-white rounded-lg p-1 w-fit border border-ink/10">
          {['book', 'history'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
                tab === t ? 'bg-ink text-ivory' : 'text-ink/60 hover:text-ink'
              }`}
            >
              {t === 'book' ? 'Book a ride' : 'My rides'}
            </button>
          ))}
        </div>

        {tab === 'book' ? (
          <BookingFlow token={token} user={user} onBooked={() => { setTab('history'); loadRides(); }} />
        ) : (
          <RideHistory rides={rides} loading={loadingRides} token={token} onRefresh={loadRides} />
        )}
      </main>
    </div>
  );
}

function BookingFlow({ token, user, onBooked }) {
  const [rideType, setRideType] = useState('on_demand');
  const [scheduledFor, setScheduledFor] = useState('');
  const [stops, setStops] = useState([{ label: '' }, { label: '' }]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [bookedRide, setBookedRide] = useState(null);

  function updateStopLabel(i, label) {
    setStops((s) => s.map((stop, idx) => (idx === i ? { ...stop, label } : stop)));
    setQuote(null);
  }

  function addStop() {
    setStops((s) => [...s.slice(0, -1), { label: '' }, s[s.length - 1]]);
    setQuote(null);
  }

  function removeStop(i) {
    setStops((s) => s.filter((_, idx) => idx !== i));
    setQuote(null);
  }

  function addGroupMember() {
    setGroupMembers((g) => [...g, { name: '', email: '', sharePercent: '' }]);
  }

  function updateMember(i, field, value) {
    setGroupMembers((g) => g.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
    setQuote(null);
  }

  function removeMember(i) {
    setGroupMembers((g) => g.filter((_, idx) => idx !== i));
    setQuote(null);
  }

  function buildStopsWithCoords() {
    return stops.map((s) => ({ label: s.label, ...guessCoords(s.label) }));
  }

  function buildGroupPayload() {
    if (groupMembers.length === 0) return undefined;
    const othersTotal = groupMembers.reduce((s, m) => s + (parseFloat(m.sharePercent) || 0), 0);
    const yourShare = Math.max(0, 100 - othersTotal);
    const members = groupMembers.map((m) => ({
      name: m.name,
      email: m.email || undefined,
      share: (parseFloat(m.sharePercent) || 0) / 100,
    }));
    members.push({
      name: user?.name ? `${user.name} (You)` : 'You',
      email: user?.email || undefined,
      share: yourShare / 100,
    });
    return members;
  }

  async function getQuote() {
    setError('');
    if (stops.some((s) => !s.label.trim())) {
      setError('Fill in every stop before getting a quote.');
      return;
    }
    setQuoting(true);
    try {
      const data = await api.quote({
        stops: buildStopsWithCoords(),
        isScheduled: rideType === 'scheduled',
        groupMembers: buildGroupPayload(),
      });
      setQuote(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setQuoting(false);
    }
  }

  async function confirmBooking() {
    setError('');
    if (rideType === 'scheduled' && !scheduledFor) {
      setError('Choose a date and time for your scheduled ride.');
      return;
    }
    setBooking(true);
    try {
      const data = await api.bookRide(
        {
          type: rideType,
          scheduledFor: rideType === 'scheduled' ? new Date(scheduledFor).toISOString() : undefined,
          stops: buildStopsWithCoords(),
          groupMembers: buildGroupPayload(),
        },
        token
      );
      setBookedRide(data.ride);
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  if (bookedRide) {
    return <BookingConfirmed ride={bookedRide} token={token} onDone={onBooked} />;
  }

  const memberShareTotal = groupMembers.reduce((s, m) => s + (parseFloat(m.sharePercent) || 0), 0);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-2">Ride type</p>
          <div className="flex gap-2 bg-white rounded-lg p-1 border border-ink/10 w-fit">
            {[
              { v: 'on_demand', label: 'Now' },
              { v: 'scheduled', label: 'Schedule for later' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => { setRideType(opt.v); setQuote(null); }}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  rideType === opt.v ? 'bg-ink text-ivory' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {rideType === 'scheduled' && (
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-wide text-ink/50">Pickup date & time</span>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-ink/15 focus:border-gold outline-none bg-white"
            />
          </label>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-mono uppercase tracking-wide text-ink/50">Route</p>
            <button onClick={addStop} className="text-sm text-gold-dark font-semibold hover:underline">
              + Add a stop
            </button>
          </div>
          <RouteTicket
            stops={stops}
            editable
            onLabelChange={updateStopLabel}
            onRemoveStop={removeStop}
          />
          <p className="text-xs text-ink/40 mt-2">
            Try: Sandton City, Rosebank Mall, OR Tambo Airport, Melrose Arch, Fourways Mall…
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-mono uppercase tracking-wide text-ink/50">
              Riding with you? Split the fare
            </p>
            <button onClick={addGroupMember} className="text-sm text-gold-dark font-semibold hover:underline">
              + Add a person
            </button>
          </div>
          {groupMembers.length === 0 ? (
            <p className="text-sm text-ink/40">No one added — you'll cover the full fare.</p>
          ) : (
            <div className="space-y-3">
              {groupMembers.map((m, i) => (
                <div key={i} className="flex gap-2 items-start bg-white rounded-lg border border-ink/10 p-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={m.name}
                    onChange={(e) => updateMember(i, 'name', e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded border border-ink/15 focus:border-gold outline-none text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={m.email}
                    onChange={(e) => updateMember(i, 'email', e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded border border-ink/15 focus:border-gold outline-none text-sm"
                  />
                  <div className="flex items-center gap-1 w-24">
                    <input
                      type="number"
                      placeholder="50"
                      min="0"
                      max="100"
                      value={m.sharePercent}
                      onChange={(e) => updateMember(i, 'sharePercent', e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-ink/15 focus:border-gold outline-none text-sm"
                    />
                    <span className="text-sm text-ink/50">%</span>
                  </div>
                  <button onClick={() => removeMember(i)} className="text-clay text-sm px-1">✕</button>
                </div>
              ))}
              <p className={`text-xs ${memberShareTotal > 100 ? 'text-clay' : 'text-ink/40'}`}>
                {memberShareTotal}% allocated to others · {Math.max(0, 100 - memberShareTotal)}% is yours
              </p>
            </div>
          )}
        </div>

        {error && <p className="text-clay text-sm">{error}</p>}
      </div>

      <div className="space-y-4">
        <div className="sticky top-6">
          {quote ? (
            <FareBreakdown breakdown={quote.breakdown} splits={quote.splits} />
          ) : (
            <div className="bg-white rounded-xl border border-ink/10 p-8 text-center">
              <p className="text-ink/50 text-sm">
                Fill in your route and get a quote — pricing is fixed and shown upfront, no surprises.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={getQuote} disabled={quoting}>
              {quoting ? 'Calculating…' : quote ? 'Recalculate' : 'Get quote'}
            </Button>
            <Button
              variant="gold"
              className="flex-1"
              onClick={confirmBooking}
              disabled={!quote || booking}
            >
              {booking ? 'Booking…' : 'Confirm booking'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingConfirmed({ ride, token, onDone }) {
  return (
    <div className="max-w-lg mx-auto text-center py-8">
      <div className="grace-seal mx-auto mb-6"><span>G</span></div>
      <h2 className="font-display text-2xl font-semibold text-ink mb-2">Booking confirmed</h2>
      <p className="text-ink/60 mb-8">
        {ride.status === 'assigned'
          ? 'A driver has been assigned and is on the way to you.'
          : "We're finding you a driver now — you'll see the update in My Rides."}
      </p>

      <div className="text-left">
        <RouteTicket stops={ride.stops} />
        <div className="mt-4">
          <FareBreakdown breakdown={ride.fareBreakdown} splits={ride.fareSplits} />
        </div>
      </div>

      <div className="mt-6">
        <PaySplit ride={ride} token={token} />
      </div>

      <Button variant="primary" className="mt-8" onClick={onDone}>View my rides</Button>
    </div>
  );
}

function PaySplit({ ride, token }) {
  const [paidIndices, setPaidIndices] = useState([]);
  const [payingIndex, setPayingIndex] = useState(null);

  async function pay(splitIndex) {
    setPayingIndex(splitIndex);
    try {
      const { payment, stripeConfigured } = await api.createPaymentIntent(ride.id, splitIndex, token);
      if (!stripeConfigured) {
        await api.simulateConfirmPayment(payment.id, token);
      }
      setPaidIndices((p) => [...p, splitIndex]);
    } catch (err) {
      console.error(err);
    } finally {
      setPayingIndex(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-5 text-left">
      <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-3">Payment</p>
      <div className="space-y-2">
        {ride.fareSplits.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink text-sm">{s.name}</p>
              <p className="text-ink/50 text-xs font-mono">R{s.amount.toFixed(2)}</p>
            </div>
            {paidIndices.includes(i) ? (
              <span className="text-sage text-sm font-semibold">Paid ✓</span>
            ) : (
              <Button size="sm" variant="gold" onClick={() => pay(i)} disabled={payingIndex === i}>
                {payingIndex === i ? 'Processing…' : 'Pay now'}
              </Button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-ink/40 mt-3">
        Test mode — payments are simulated until Stripe live keys are added.
      </p>
    </div>
  );
}

function RideHistory({ rides, loading, token, onRefresh }) {
  const [cancellingId, setCancellingId] = useState(null);

  async function cancel(id) {
    setCancellingId(id);
    try {
      await api.updateRideStatus(id, 'cancelled', token);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) return <p className="text-ink/50">Loading your rides…</p>;
  if (rides.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-ink/50">You haven't booked a ride yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rides.map((ride) => (
        <div key={ride.id} className="bg-white rounded-xl border border-ink/10 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-ink">
                {ride.stops[0]?.label} → {ride.stops[ride.stops.length - 1]?.label}
              </p>
              <p className="text-xs text-ink/40 font-mono mt-0.5">
                {new Date(ride.createdAt).toLocaleString()} · {ride.type === 'scheduled' ? 'Scheduled' : 'On-demand'}
              </p>
            </div>
            <StatusBadge status={ride.status} />
          </div>
          {ride.driverName && (
            <p className="text-sm text-ink/60 mb-2">
              Driver: {ride.driverName} · {ride.driverVehicle}
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm text-ink/70">R{ride.fareTotal.toFixed(2)}</p>
            {(ride.status === 'requested' || ride.status === 'assigned') && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => cancel(ride.id)}
                disabled={cancellingId === ride.id}
              >
                {cancellingId === ride.id ? 'Cancelling…' : 'Cancel ride'}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
