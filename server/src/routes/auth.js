import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, Driver } from '../db/models.js';
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

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    role,
  });

  if (role === 'driver') {
    await Driver.create({
      userId: user._id,
      vehicleMake: vehicleMake || 'Not set',
      vehicleModel: vehicleModel || 'Not set',
      plate: plate || 'Not set',
    });
  }

  const userObj = publicUser(user);
  const token = signToken(userObj);
  res.status(201).json({ token, user: userObj });
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

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const userObj = publicUser(user);
  const token = signToken(userObj);
  res.json({ token, user: userObj });
});

function publicUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  const { passwordHash, _id, __v, ...rest } = obj;
  return { id: _id, ...rest };
}

export default router;
