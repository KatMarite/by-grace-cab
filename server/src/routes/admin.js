import express from 'express';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/overview', requireAuth, requireRole('admin'), async (req, res) => {
  await db.read();
  const { users, drivers, rides, payments } = db.data;

  const totalRiders = users.filter((u) => u.role === 'rider').length;
  const totalDrivers = users.filter((u) => u.role === 'driver').length;
  const onlineDrivers = drivers.filter((d) => d.status === 'online').length;
  const onTripDrivers = drivers.filter((d) => d.status === 'on_trip').length;

  const completedRides = rides.filter((r) => r.status === 'completed');
  const activeRides = rides.filter((r) => r.status === 'assigned' || r.status === 'in_progress');
  const pendingRides = rides.filter((r) => r.status === 'requested');

  const totalRevenue = payments
    .filter((p) => p.status === 'paid' || p.status === 'simulated_paid')
    .reduce((sum, p) => sum + p.amount, 0);

  res.json({
    totalRiders,
    totalDrivers,
    onlineDrivers,
    onTripDrivers,
    completedRidesCount: completedRides.length,
    activeRidesCount: activeRides.length,
    pendingRidesCount: pendingRides.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    recentRides: [...rides]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10),
  });
});

router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  await db.read();
  const users = db.data.users.map(({ passwordHash, ...rest }) => rest);
  res.json({ users });
});

export default router;
