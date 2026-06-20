import express from 'express';
import { z } from 'zod';
import { Driver, User } from '../db/models.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', requireAuth, requireRole('driver'), async (req, res) => {
  const driver = await Driver.findOne({ userId: req.user.id }).lean();
  if (!driver) return res.status(404).json({ error: 'Driver profile not found.' });
  res.json({ driver: { ...driver, id: driver._id } });
});

const statusSchema = z.object({
  status: z.enum(['online', 'offline']),
});

router.patch('/me/status', requireAuth, requireRole('driver'), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Status must be online or offline.' });

  const driver = await Driver.findOne({ userId: req.user.id });
  if (!driver) return res.status(404).json({ error: 'Driver profile not found.' });
  
  if (driver.status === 'on_trip' && parsed.data.status === 'offline') {
    return res.status(409).json({ error: 'Finish your current trip before going offline.' });
  }
  
  driver.status = parsed.data.status;
  await driver.save();
  
  res.json({ driver: { ...driver.toObject(), id: driver._id } });
});

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

router.patch('/me/location', requireAuth, requireRole('driver'), async (req, res) => {
  const parsed = locationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid coordinates.' });

  const driver = await Driver.findOne({ userId: req.user.id });
  if (!driver) return res.status(404).json({ error: 'Driver profile not found.' });
  
  driver.currentLat = parsed.data.lat;
  driver.currentLng = parsed.data.lng;
  await driver.save();
  
  res.json({ driver: { ...driver.toObject(), id: driver._id } });
});

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const driversRaw = await Driver.find().populate('userId', 'name email phone').lean();
  
  const drivers = driversRaw.map(d => {
    const user = d.userId || {};
    return { 
      ...d, 
      id: d._id,
      userId: user._id || d.userId, 
      name: user.name, 
      email: user.email, 
      phone: user.phone 
    };
  });
  
  res.json({ drivers });
});

export default router;
