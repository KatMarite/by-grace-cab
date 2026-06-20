import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [params] = useSearchParams();
  const initialRole = params.get('role') === 'driver' ? 'driver' : 'rider';
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    vehicleMake: '', vehicleModel: '', plate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signup({ ...form, role });
      navigate(role === 'driver' ? '/driver' : '/rider');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>

        <div className="bg-white rounded-xl border border-ink/10 p-8">
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Create your account</h1>
          <p className="text-ink/60 text-sm mb-6">Join By Grace Cab as a rider or a driver.</p>

          <div className="flex gap-2 mb-6 bg-ivory rounded-lg p-1">
            {['rider', 'driver'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-colors ${
                  role === r ? 'bg-ink text-ivory' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full name" value={form.name} onChange={(v) => update('name', v)} required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} required />
            <Field label="Phone number" value={form.phone} onChange={(v) => update('phone', v)} required />
            <Field label="Password" type="password" value={form.password} onChange={(v) => update('password', v)} required />

            {role === 'driver' && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ink/10">
                <Field label="Vehicle make" value={form.vehicleMake} onChange={(v) => update('vehicleMake', v)} />
                <Field label="Vehicle model" value={form.vehicleModel} onChange={(v) => update('vehicleModel', v)} />
                <div className="col-span-2">
                  <Field label="Number plate" value={form.plate} onChange={(v) => update('plate', v)} />
                </div>
              </div>
            )}

            {error && <p className="text-clay text-sm">{error}</p>}

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-ink/60 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-gold-dark font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, required }) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-wide text-ink/50">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 rounded-lg border border-ink/15 focus:border-gold outline-none bg-ivory"
      />
    </label>
  );
}
