import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    try {
      const [overviewData, driversData] = await Promise.all([
        api.adminOverview(token),
        api.listDrivers(token),
      ]);
      setOverview(overviewData);
      setDrivers(driversData.drivers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !overview) {
    return <div className="min-h-screen bg-ivory flex items-center justify-center"><p className="text-ink/50">Loading…</p></div>;
  }

  return (
    <div className="min-h-screen bg-ivory">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink/60">Admin · {user.name.split(' ')[0]}</span>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }}>Sign out</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label="Total revenue" value={`R${overview.totalRevenue.toFixed(2)}`} accent />
          <Stat label="Riders" value={overview.totalRiders} />
          <Stat label="Drivers online" value={`${overview.onlineDrivers} / ${overview.totalDrivers}`} />
          <Stat label="Active rides" value={overview.activeRidesCount} />
          <Stat label="Pending requests" value={overview.pendingRidesCount} />
          <Stat label="Completed rides" value={overview.completedRidesCount} />
          <Stat label="Drivers on trip" value={overview.onTripDrivers} />
          <Stat label="Total drivers" value={overview.totalDrivers} />
        </div>

        <section className="mb-10">
          <h2 className="font-display text-xl font-semibold text-ink mb-3">Drivers</h2>
          <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ivory text-ink/50 font-mono text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Vehicle</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Phone</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="border-t border-ink/5">
                    <td className="px-4 py-2.5 font-semibold text-ink">{d.name}</td>
                    <td className="px-4 py-2.5 text-ink/60">{d.vehicleMake} {d.vehicleModel} · {d.plate}</td>
                    <td className="px-4 py-2.5">
                      <span className="capitalize">{d.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-2.5 text-ink/60 font-mono">{d.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink mb-3">Recent rides</h2>
          <div className="space-y-3">
            {overview.recentRides.map((ride) => (
              <div key={ride.id} className="bg-white rounded-xl border border-ink/10 p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ink text-sm">
                    {ride.stops[0]?.label} → {ride.stops[ride.stops.length - 1]?.label}
                  </p>
                  <p className="text-xs text-ink/40 font-mono mt-0.5">
                    {new Date(ride.createdAt).toLocaleString()} · R{ride.fareTotal.toFixed(2)}
                  </p>
                </div>
                <StatusBadge status={ride.status} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-4">
      <p className="text-xs font-mono uppercase tracking-wide text-ink/40 mb-1">{label}</p>
      <p className={`font-display text-2xl font-semibold ${accent ? 'text-gold-dark' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
