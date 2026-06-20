import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Button from '../components/Button';
import RouteTicket from '../components/RouteTicket';
import { useAuth } from '../context/AuthContext';

const SAMPLE_STOPS = [
  { label: 'Home · Linden' },
  { label: "Kids' school · Parkview" },
  { label: 'Office · Rosebank' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-ivory">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-3">
          {user ? (
            <Link to={dashboardPathFor(user.role)}>
              <Button variant="outline" size="sm">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/signup">
                <Button variant="gold" size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        <section className="grid md:grid-cols-2 gap-12 items-center py-12 md:py-20">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold-dark mb-4">
              Private rides, done properly
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-ink leading-[1.1] mb-6">
              One ride.<br />
              Every stop.<br />
              <span className="italic text-gold-dark">Split fairly.</span>
            </h1>
            <p className="text-ink/70 text-lg leading-relaxed mb-8 max-w-md">
              By Grace Cab books your whole route in one go — school run, errands, the lot —
              and splits the fare between everyone riding. Fixed pricing, always. No surge, ever.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/signup">
                <Button variant="primary" size="lg">Book your first ride</Button>
              </Link>
              <Link to="/signup?role=driver">
                <Button variant="outline" size="lg">Drive with us</Button>
              </Link>
            </div>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink/40 mb-3 ml-1">
              A real morning, one booking
            </p>
            <RouteTicket stops={SAMPLE_STOPS} />
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-8 py-16 border-t border-ink/10">
          <Feature
            title="Multi-stop by design"
            body="Add as many stops as your morning needs. Drop the kids, swing by the pharmacy, get to work — one fare, one driver, one booking."
          />
          <Feature
            title="Split the fare, fairly"
            body="Add the people riding with you and divide the cost by however much of the trip is theirs. Everyone pays their share, automatically."
          />
          <Feature
            title="Fixed pricing"
            body="The price you're quoted is the price you pay. No surge multipliers when it rains, when it's late, or when everyone else is also trying to get home."
          />
        </section>
      </main>

      <footer className="border-t border-ink/10 py-8 text-center text-ink/40 text-sm">
        © {new Date().getFullYear()} By Grace Cab. Private shuttle service.
      </footer>
    </div>
  );
}

function Feature({ title, body }) {
  return (
    <div>
      <h3 className="font-display font-semibold text-xl text-ink mb-2">{title}</h3>
      <p className="text-ink/65 leading-relaxed">{body}</p>
    </div>
  );
}

function dashboardPathFor(role) {
  if (role === 'admin') return '/admin';
  if (role === 'driver') return '/driver';
  return '/rider';
}
