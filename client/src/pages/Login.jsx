import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'driver') navigate('/driver');
      else navigate('/rider');
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
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Welcome back</h1>
          <p className="text-ink/60 text-sm mb-6">Sign in to book or manage your rides.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-mono uppercase tracking-wide text-ink/50">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full mt-1 px-3 py-2 rounded-lg border border-ink/15 focus:border-gold outline-none bg-ivory"
              />
            </label>
            <label className="block">
              <span className="text-xs font-mono uppercase tracking-wide text-ink/50">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full mt-1 px-3 py-2 rounded-lg border border-ink/15 focus:border-gold outline-none bg-ivory"
              />
            </label>

            {error && <p className="text-clay text-sm">{error}</p>}

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-ink/60 mt-6">
            New to By Grace Cab?{' '}
            <Link to="/signup" className="text-gold-dark font-semibold hover:underline">Create an account</Link>
          </p>

          <div className="mt-6 pt-6 border-t border-ink/10 text-xs text-ink/40 font-mono space-y-1">
            <p>Demo accounts:</p>
            <p>rider@bygracecab.com / rider123</p>
            <p>driver@bygracecab.com / driver123</p>
            <p>admin@bygracecab.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
