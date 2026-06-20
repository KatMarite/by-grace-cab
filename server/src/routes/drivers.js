import express from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', requireAuth, requireRole('driver'), async (req, res) => {
  await db.read();
  const driver = db.data.drivers.find((d) => d.userId === req.user.id);
  if (!driver) return res.status(404).json({ error: 'Driver profile not found.' });
  res.json({ driver });
});

const statusSchema = z.object({
  status: z.enum(['online', 'offline']),
});

router.patch('/me/status', requireAuth, requireRole('driver'), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Status must be online or offline.' });

  await db.read();
  const driver = db.data.drivers.find((d) => d.userId === req.user.id);
  if (!driver) return res.status(404).json({ error: 'Driver profile not found.' });
  if (driver.status === 'on_trip' && parsed.data.status === 'offline') {
    return res.status(409).json({ error: 'Finish your current trip before going offline.' });
  }
  driver.status = parsed.data.status;
  await db.write();
  res.json({ driver });
});

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

router.patch('/me/location', requireAuth, requireRole('driver'), async (req, res) => {
  const parsed = locationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid coordinates.' });

  await db.read();
  const driver = db.data.drivers.find((d) => d.userId === req.user.id);
  if (!driver) return res.status(404).json({ error: 'Driver profile not found.' });
  driver.currentLat = parsed.data.lat;
  driver.currentLng = parsed.data.lng;
  await db.write();
  res.json({ driver });
});

// Admin: list all drivers with status
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  await db.read();
  const drivers = db.data.drivers.map((d) => {
    const user = db.data.users.find((u) => u.id === d.userId);
    return { ...d, name: user?.name, email: user?.email, phone: user?.phone };
  });
  res.json({ drivers });
});

export default router;
