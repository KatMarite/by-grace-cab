import express from 'express';
import { User, Driver, Ride, Payment } from '../db/models.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/overview', requireAuth, requireRole('admin'), async (req, res) => {
  const [
    totalRiders,
    totalDrivers,
    onlineDrivers,
    onTripDrivers,
    completedRidesCount,
    activeRidesCount,
    pendingRidesCount,
    recentRides,
    payments
  ] = await Promise.all([
    User.countDocuments({ role: 'rider' }),
    User.countDocuments({ role: 'driver' }),
    Driver.countDocuments({ status: 'online' }),
    Driver.countDocuments({ status: 'on_trip' }),
    Ride.countDocuments({ status: 'completed' }),
    Ride.countDocuments({ status: { $in: ['assigned', 'in_progress'] } }),
    Ride.countDocuments({ status: 'requested' }),
    Ride.find().sort({ createdAt: -1 }).limit(10).lean(),
    Payment.find({ status: { $in: ['completed', 'simulated_paid'] } }).lean()
  ]);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  res.json({
    totalRiders,
    totalDrivers,
    onlineDrivers,
    onTripDrivers,
    completedRidesCount,
    activeRidesCount,
    pendingRidesCount,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    recentRides: recentRides.map(r => ({ ...r, id: r._id })),
  });
});

router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const usersRaw = await User.find().lean();
  const users = usersRaw.map(({ passwordHash, _id, __v, ...rest }) => ({ id: _id, ...rest }));
  res.json({ users });
});

export default router;
