import express from 'express';
import { z } from 'zod';
import { Ride, Driver, User } from '../db/models.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { calculateFare } from '../lib/fare.js';

const router = express.Router();

const stopSchema = z.object({
  label: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
});

const groupMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  share: z.number().min(0).max(1),
});

const quoteSchema = z.object({
  stops: z.array(stopSchema).min(2),
  isScheduled: z.boolean().optional(),
  groupMembers: z.array(groupMemberSchema).optional(),
});

router.post('/quote', (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Add at least a pickup and destination stop.', details: parsed.error.flatten() });
  }
  try {
    const result = calculateFare({
      stops: parsed.data.stops,
      isScheduled: !!parsed.data.isScheduled,
      groupMembers: parsed.data.groupMembers,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const bookSchema = z.object({
  type: z.enum(['on_demand', 'scheduled']),
  scheduledFor: z.string().optional(),
  stops: z.array(stopSchema).min(2),
  groupMembers: z.array(groupMemberSchema).optional(),
  notes: z.string().optional(),
});

router.post('/', requireAuth, requireRole('rider'), async (req, res) => {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Check your booking details.', details: parsed.error.flatten() });
  }
  const { type, scheduledFor, stops, groupMembers, notes } = parsed.data;

  if (type === 'scheduled' && !scheduledFor) {
    return res.status(400).json({ error: 'Choose a date and time for a scheduled ride.' });
  }

  let fareResult;
  try {
    fareResult = calculateFare({
      stops,
      isScheduled: type === 'scheduled',
      groupMembers,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const rideData = {
    riderId: req.user.id,
    type,
    scheduledFor: scheduledFor || null,
    status: 'requested',
    driverId: null,
    stops: stops.map((s, i) => ({ order: i, ...s })),
    groupMembers: groupMembers || [],
    fareBreakdown: fareResult.breakdown,
    fareSplits: fareResult.splits,
    fareTotal: fareResult.total,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  if (type === 'on_demand') {
    const availableDriver = await Driver.findOne({ status: 'online' });
    if (availableDriver) {
      rideData.driverId = availableDriver.userId;
      rideData.status = 'assigned';
      rideData.assignedAt = new Date().toISOString();
      await Driver.findByIdAndUpdate(availableDriver._id, { status: 'on_trip' });
    }
  }

  const ride = await Ride.create(rideData);
  res.status(201).json({ ride: await attachNames(ride.toObject()) });
});

router.get('/', requireAuth, async (req, res) => {
  let query = {};
  if (req.user.role === 'driver') {
    query = { driverId: req.user.id };
  } else if (req.user.role === 'rider') {
    query = { riderId: req.user.id };
  }

  const rides = await Ride.find(query).sort({ createdAt: -1 }).lean();
  res.json({ rides: await Promise.all(rides.map(attachNames)) });
});

router.get('/queue', requireAuth, requireRole('driver'), async (req, res) => {
  const queued = await Ride.find({ status: 'requested', type: 'on_demand' }).lean();
  res.json({ rides: await Promise.all(queued.map(attachNames)) });
});

router.get('/:id', requireAuth, async (req, res) => {
  const ride = await Ride.findById(req.params.id).lean();
  if (!ride) return res.status(404).json({ error: 'Ride not found.' });

  if (req.user.role === 'rider' && ride.riderId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this ride.' });
  }
  if (req.user.role === 'driver' && ride.driverId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this ride.' });
  }
  res.json({ ride: await attachNames(ride) });
});

router.post('/:id/accept', requireAuth, requireRole('driver'), async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found.' });

  if (ride.status !== 'requested') {
    return res.status(409).json({ error: 'This ride has already been picked up by another driver.' });
  }
  const driver = await Driver.findOne({ userId: req.user.id });
  if (!driver || driver.status !== 'online') {
    return res.status(400).json({ error: 'Go online before accepting rides.' });
  }
  
  ride.driverId = req.user.id;
  ride.status = 'assigned';
  ride.assignedAt = new Date().toISOString();
  await ride.save();

  driver.status = 'on_trip';
  await driver.save();

  res.json({ ride: await attachNames(ride.toObject()) });
});

const statusSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'cancelled']),
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status.' });

  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found.' });

  const isOwnerRider = req.user.role === 'rider' && ride.riderId === req.user.id;
  const isOwnerDriver = req.user.role === 'driver' && ride.driverId === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwnerRider && !isOwnerDriver && !isAdmin) {
    return res.status(403).json({ error: 'You do not have access to this ride.' });
  }

  if (isOwnerRider && parsed.data.status !== 'cancelled') {
    return res.status(403).json({ error: 'Riders can only cancel a ride.' });
  }

  ride.status = parsed.data.status;
  if (parsed.data.status === 'completed') {
    ride.completedAt = new Date().toISOString();
    await freeUpDriver(ride.driverId);
  }
  if (parsed.data.status === 'cancelled') {
    ride.cancelledAt = new Date().toISOString();
    await freeUpDriver(ride.driverId);
  }

  await ride.save();
  res.json({ ride: await attachNames(ride.toObject()) });
});

async function freeUpDriver(driverUserId) {
  if (!driverUserId) return;
  await Driver.findOneAndUpdate({ userId: driverUserId }, { status: 'online' });
}

async function attachNames(ride) {
  const rider = await User.findById(ride.riderId).lean();
  const driverUser = ride.driverId ? await User.findById(ride.driverId).lean() : null;
  const driverRecord = ride.driverId ? await Driver.findOne({ userId: ride.driverId }).lean() : null;
  
  const { _id, __v, ...rest } = ride;
  return {
    ...rest,
    id: _id,
    riderName: rider ? rider.name : 'Unknown',
    driverName: driverUser ? driverUser.name : null,
    driverVehicle: driverRecord ? `${driverRecord.vehicleMake} ${driverRecord.vehicleModel} · ${driverRecord.plate}` : null,
  };
}

export default router;
