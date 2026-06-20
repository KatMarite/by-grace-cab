import express from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '../db/index.js';
import { signToken } from '../lib/auth.js';

const router = express.Router();

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  password: z.string().min(6),
  role: z.enum(['rider', 'driver']),
  // driver-only optional fields
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  plate: z.string().optional(),
});

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Check your details and try again.', details: parsed.error.flatten() });
  }
  const { name, email, phone, password, role, vehicleMake, vehicleModel, plate } = parsed.data;

  await db.read();
  const existing = db.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: nanoid(),
    name,
    email,
    phone,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  };
  db.data.users.push(user);

  if (role === 'driver') {
    db.data.drivers.push({
      id: nanoid(),
      userId: user.id,
      vehicleMake: vehicleMake || 'Not set',
      vehicleModel: vehicleModel || 'Not set',
      plate: plate || 'Not set',
      status: 'offline',
      currentLat: null,
      currentLng: null,
    });
  }

  await db.write();

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter a valid email and password.' });
  }
  const { email, password } = parsed.data;

  await db.read();
  const user = db.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export default router;
