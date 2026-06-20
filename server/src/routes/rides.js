import express from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '../db/index.js';
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

// Get a fare quote before booking - no auth required so riders can preview pricing
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
  scheduledFor: z.string().optional(), // ISO date string, required if type === 'scheduled'
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

  await db.read();

  const ride = {
    id: nanoid(),
    riderId: req.user.id,
    type,
    scheduledFor: scheduledFor || null,
    status: 'requested', // requested -> assigned -> in_progress -> completed | cancelled
    driverId: null,
    stops: stops.map((s, i) => ({ order: i, ...s })),
    groupMembers: groupMembers || [],
    fareBreakdown: fareResult.breakdown,
    fareSplits: fareResult.splits,
    fareTotal: fareResult.total,
    notes: notes || '',
    createdAt: new Date().toISOString(),
    assignedAt: null,
    completedAt: null,
    cancelledAt: null,
  };

  db.data.rides.push(ride);

  // Auto-assign for on-demand rides: pick first available online driver
  if (type === 'on_demand') {
    const availableDriver = db.data.drivers.find((d) => d.status === 'online');
    if (availableDriver) {
      ride.driverId = availableDriver.userId;
      ride.status = 'assigned';
      ride.assignedAt = new Date().toISOString();
      availableDriver.status = 'on_trip';
    }
  }

  await db.write();
  res.status(201).json({ ride });
});

// List rides for the logged-in rider, driver, or admin
router.get('/', requireAuth, async (req, res) => {
  await db.read();
  let rides;
  if (req.user.role === 'admin') {
    rides = db.data.rides;
  } else if (req.user.role === 'driver') {
    rides = db.data.rides.filter((r) => r.driverId === req.user.id);
  } else {
    rides = db.data.rides.filter((r) => r.riderId === req.user.id);
  }
  rides = [...rides].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ rides: rides.map((r) => attachNames(r)) });
});

// Driver: see open on-demand requests waiting for assignment
router.get('/queue', requireAuth, requireRole('driver'), async (req, res) => {
  await db.read();
  const queued = db.data.rides.filter((r) => r.status === 'requested' && r.type === 'on_demand');
  res.json({ rides: queued.map((r) => attachNames(r)) });
});

router.get('/:id', requireAuth, async (req, res) => {
  await db.read();
  const ride = db.data.rides.find((r) => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found.' });
  if (req.user.role === 'rider' && ride.riderId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this ride.' });
  }
  if (req.user.role === 'driver' && ride.driverId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this ride.' });
  }
  res.json({ ride: attachNames(ride) });
});

// Driver accepts a queued ride manually (in case auto-assign found no one online yet)
router.post('/:id/accept', requireAuth, requireRole('driver'), async (req, res) => {
  await db.read();
  const ride = db.data.rides.find((r) => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found.' });
  if (ride.status !== 'requested') {
    return res.status(409).json({ error: 'This ride has already been picked up by another driver.' });
  }
  const driver = db.data.drivers.find((d) => d.userId === req.user.id);
  if (!driver || driver.status !== 'online') {
    return res.status(400).json({ error: 'Go online before accepting rides.' });
  }
  ride.driverId = req.user.id;
  ride.status = 'assigned';
  ride.assignedAt = new Date().toISOString();
  driver.status = 'on_trip';
  await db.write();
  res.json({ ride: attachNames(ride) });
});

const statusSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'cancelled']),
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status.' });

  await db.read();
  const ride = db.data.rides.find((r) => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found.' });

  const isOwnerRider = req.user.role === 'rider' && ride.riderId === req.user.id;
  const isOwnerDriver = req.user.role === 'driver' && ride.driverId === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwnerRider && !isOwnerDriver && !isAdmin) {
    return res.status(403).json({ error: 'You do not have access to this ride.' });
  }
  // Riders may only cancel; drivers/admin can progress or cancel
  if (isOwnerRider && parsed.data.status !== 'cancelled') {
    return res.status(403).json({ error: 'Riders can only cancel a ride.' });
  }

  ride.status = parsed.data.status;
  if (parsed.data.status === 'completed') {
    ride.completedAt = new Date().toISOString();
    freeUpDriver(ride.driverId);
  }
  if (parsed.data.status === 'cancelled') {
    ride.cancelledAt = new Date().toISOString();
    freeUpDriver(ride.driverId);
  }

  await db.write();
  res.json({ ride: attachNames(ride) });
});

function freeUpDriver(driverUserId) {
  if (!driverUserId) return;
  const driver = db.data.drivers.find((d) => d.userId === driverUserId);
  if (driver) driver.status = 'online';
}

function attachNames(ride) {
  const rider = db.data.users.find((u) => u.id === ride.riderId);
  const driverUser = ride.driverId ? db.data.users.find((u) => u.id === ride.driverId) : null;
  const driverRecord = ride.driverId ? db.data.drivers.find((d) => d.userId === ride.driverId) : null;
  return {
    ...ride,
    riderName: rider ? rider.name : 'Unknown',
    driverName: driverUser ? driverUser.name : null,
    driverVehicle: driverRecord ? `${driverRecord.vehicleMake} ${driverRecord.vehicleModel} · ${driverRecord.plate}` : null,
  };
}

export default router;
