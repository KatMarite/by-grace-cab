# By Grace Cab

A private shuttle booking platform built around the one thing big ride-hailing apps don't do well:
**multi-stop routes with fair, automatic fare splitting** — plus fixed, transparent pricing with no surge.

## What's inside

- **`/server`** — Node.js + Express API, JSON file database (lowdb), JWT auth, Stripe (test mode) payments
- **`/client`** — React + Vite + Tailwind frontend for riders, drivers, and admin

## Quick start (local)

You'll need Node.js 18+ installed.

### 1. Start the API

```bash
cd server
npm install
cp .env.example .env
npm run seed     # creates demo admin, driver, and rider accounts
npm start        # runs on http://localhost:4000
```

Demo accounts (also shown on the sign-in page):

| Role   | Email                     | Password   |
|--------|---------------------------|------------|
| Admin  | admin@bygracecab.com      | admin123   |
| Driver | driver@bygracecab.com     | driver123  |
| Rider  | rider@bygracecab.com      | rider123   |

### 2. Start the frontend

In a second terminal:

```bash
cd client
npm install
npm run dev       # runs on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

## How fares work

Pricing is calculated server-side in `server/src/lib/fare.js` and is fully transparent — riders see the
breakdown before they pay anything:

- **Base fare**: flat boarding fee
- **Distance**: per-km rate, calculated leg-by-leg across every stop in the route
- **Extra stops**: a small flat fee per stop beyond pickup + final destination
- **Pre-booking discount**: a discount for scheduling ahead instead of requesting on-demand
- **Service fee**: a transparent percentage, shown as its own line — never hidden in the total
- **No surge** — the price never changes based on demand, time of day, or weather

When a ride has group members, the total is split by the percentage each person is assigned.
Rounding drift is corrected on the final split so the splits always add up to the exact total.

Adjust the constants at the top of `fare.js` (`BASE_FARE`, `PER_KM_RATE`, etc.) to match your
actual rates.

## Payments

Payments run through Stripe in **test mode**. Without a Stripe key configured, the app runs in a
simulated-payment mode so the full booking → pay → confirmation flow still works end-to-end for
demos and development.

To turn on real Stripe test payments:

1. Get test API keys from the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys)
2. Add `STRIPE_SECRET_KEY=sk_test_...` to `server/.env`
3. Restart the server

**Going live with real payments** requires a verified Stripe (or other processor) business account
on your end, plus a plan for paying out drivers — this app builds the payment *flow*, but real money
movement, KYC, and driver payouts are a business/compliance setup outside what this codebase can do
on its own.

## On-demand matching

The current on-demand flow auto-assigns new requests to the first driver who is online. There's no
live GPS dispatch — drivers have a location field in the data model (`drivers.currentLat/currentLng`)
ready for it, but wiring up real-time location tracking and proximity-based matching needs a mobile
app (for background location) and a live transport layer (e.g. WebSockets), which is a natural next
phase once the core product is validated.

## Deploying

This is a standard two-service app:

- **Server**: deploy `/server` to any Node host (Render, Railway, Fly.io, a VPS). Set `JWT_SECRET`,
  `STRIPE_SECRET_KEY`, and `PORT` as environment variables. The JSON file database
  (`server/src/db/data.json`) works for a single instance — for real production traffic, swap the
  `lowdb` calls in `server/src/db/index.js` for a real database (Postgres is a natural choice; the
  rest of the codebase doesn't care how `db.data.*` is persisted).
- **Client**: run `npm run build` in `/client`, then deploy the `dist/` folder to any static host
  (Vercel, Netlify, Cloudflare Pages). Set `VITE_API_URL` to your deployed server's URL before building.

## Project structure

```
server/
  src/
    db/           # data file + seed script
    lib/          # fare calculation, JWT helpers
    middleware/   # auth middleware
    routes/       # auth, rides, drivers, payments, admin
client/
  src/
    pages/        # Landing, Login, Signup, Rider/Driver/Admin dashboards
    components/   # Logo, Button, RouteTicket, FareBreakdown, StatusBadge
    context/      # AuthContext
    lib/          # API client
```
