import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Button from '../components/Button';
import RouteTicket from '../components/RouteTicket';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function DriverDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [driver, setDriver] = useState(null);
  const [rides, setRides] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadAll() {
    try {
      const [driverData, ridesData, queueData] = await Promise.all([
        api.driverMe(token),
        api.listRides(token),
        api.queue(token),
      ]);
      setDriver(driverData.driver);
      setRides(ridesData.rides);
      setQueue(queueData.rides);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus() {
    if (!driver) return;
    setError('');
    setTogglingStatus(true);
    const next = driver.status === 'online' ? 'offline' : 'online';
    try {
      const data = await api.setDriverStatus(next, token);
      setDriver(data.driver);
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingStatus(false);
    }
  }

  async function acceptRide(id) {
    try {
      await api.acceptRide(id, token);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function advanceRide(id, status) {
    try {
      await api.updateRideStatus(id, status, token);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="min-h-screen bg-ivory flex items-center justify-center"><p className="text-ink/50">Loading…</p></div>;

  const activeRide = rides.find((r) => r.status === 'assigned' || r.status === 'in_progress');
  const pastRides = rides.filter((r) => r.status === 'completed' || r.status === 'cancelled');

  return (
    <div className="min-h-screen bg-ivory">
      <header className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink/60">Hi, {user.name.split(' ')[0]}</span>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }}>Sign out</Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-white rounded-xl border border-ink/10 p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">
              {driver.vehicleMake} {driver.vehicleModel} · {driver.plate}
            </p>
            <p className="text-sm text-ink/50 mt-0.5">
              Status: <span className="font-semibold capitalize">{driver.status.replace('_', ' ')}</span>
            </p>
          </div>
          <Button
            variant={driver.status === 'online' ? 'danger' : 'gold'}
            onClick={toggleStatus}
            disabled={togglingStatus || driver.status === 'on_trip'}
          >
            {driver.status === 'online' ? 'Go offline' : 'Go online'}
          </Button>
        </div>

        {error && <p className="text-clay text-sm mb-4">{error}</p>}

        {activeRide && (
          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-ink mb-3">Current ride</h2>
            <div className="bg-white rounded-xl border border-ink/10 p-5">
              <div className="flex items-start justify-between mb-3">
                <StatusBadge status={activeRide.status} />
                <p className="font-mono text-sm text-ink/70">R{activeRide.fareTotal.toFixed(2)}</p>
              </div>
              <RouteTicket stops={activeRide.stops} />
              <p className="text-sm text-ink/60 mt-3">Rider: {activeRide.riderName}</p>
              {activeRide.notes && <p className="text-sm text-ink/50 mt-1">Notes: {activeRide.notes}</p>}
              <div className="flex gap-3 mt-4">
                {activeRide.status === 'assigned' && (
                  <Button variant="primary" onClick={() => advanceRide(activeRide.id, 'in_progress')}>
                    Start trip
                  </Button>
                )}
                {activeRide.status === 'in_progress' && (
                  <Button variant="gold" onClick={() => advanceRide(activeRide.id, 'completed')}>
                    Mark completed
                  </Button>
                )}
                <Button variant="outline" onClick={() => advanceRide(activeRide.id, 'cancelled')}>
                  Cancel ride
                </Button>
              </div>
            </div>
          </section>
        )}

        {!activeRide && driver.status === 'online' && (
          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-ink mb-3">Available requests</h2>
            {queue.length === 0 ? (
              <p className="text-ink/50 text-sm">No on-demand requests waiting right now.</p>
            ) : (
              <div className="space-y-3">
                {queue.map((ride) => (
                  <div key={ride.id} className="bg-white rounded-xl border border-ink/10 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-ink text-sm">
                        {ride.stops[0]?.label} → {ride.stops[ride.stops.length - 1]?.label}
                      </p>
                      <p className="text-xs text-ink/40 font-mono mt-0.5">
                        {ride.stops.length} stops · R{ride.fareTotal.toFixed(2)}
                      </p>
                    </div>
                    <Button size="sm" variant="gold" onClick={() => acceptRide(ride.id)}>Accept</Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {!activeRide && driver.status === 'offline' && (
          <p className="text-ink/50 text-sm mb-8">Go online to see and accept ride requests.</p>
        )}

        <section>
          <h2 className="font-display text-xl font-semibold text-ink mb-3">Past rides</h2>
          {pastRides.length === 0 ? (
            <p className="text-ink/50 text-sm">No completed rides yet.</p>
          ) : (
            <div className="space-y-3">
              {pastRides.map((ride) => (
                <div key={ride.id} className="bg-white rounded-xl border border-ink/10 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink text-sm">
                      {ride.stops[0]?.label} → {ride.stops[ride.stops.length - 1]?.label}
                    </p>
                    <p className="text-xs text-ink/40 font-mono mt-0.5">
                      {new Date(ride.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={ride.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
