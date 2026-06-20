import express from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import Stripe from 'stripe';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

// Create a payment intent for one split of a ride's fare (the rider, or a group member).
const intentSchema = z.object({
  rideId: z.string(),
  splitIndex: z.number().int().min(0),
});

router.post('/create-intent', requireAuth, async (req, res) => {
  const parsed = intentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payment request.' });

  await db.read();
  const ride = db.data.rides.find((r) => r.id === parsed.data.rideId);
  if (!ride) return res.status(404).json({ error: 'Ride not found.' });
  if (req.user.role === 'rider' && ride.riderId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this ride.' });
  }

  const split = ride.fareSplits[parsed.data.splitIndex];
  if (!split) return res.status(400).json({ error: 'That fare split does not exist for this ride.' });

  const amountCents = Math.round(split.amount * 100);

  let stripePaymentIntentId = null;
  let clientSecret = null;

  if (stripe) {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'zar',
      automatic_payment_methods: { enabled: true },
      metadata: { rideId: ride.id, splitIndex: String(parsed.data.splitIndex), payerName: split.name },
    });
    stripePaymentIntentId = intent.id;
    clientSecret = intent.client_secret;
  }

  const payment = {
    id: nanoid(),
    rideId: ride.id,
    splitIndex: parsed.data.splitIndex,
    payerName: split.name,
    payerEmail: split.email || null,
    amount: split.amount,
    status: stripe ? 'pending' : 'simulated_paid',
    stripePaymentIntentId,
    createdAt: new Date().toISOString(),
  };
  db.data.payments.push(payment);
  await db.write();

  res.status(201).json({
    payment,
    clientSecret,
    stripeConfigured: !!stripe,
  });
});

// Confirm a simulated payment (used when Stripe keys are not configured, so the
// booking flow still works end-to-end in this environment / for demos).
router.post('/:id/simulate-confirm', requireAuth, async (req, res) => {
  await db.read();
  const payment = db.data.payments.find((p) => p.id === req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found.' });
  payment.status = 'paid';
  await db.write();
  res.json({ payment });
});

router.get('/by-ride/:rideId', requireAuth, async (req, res) => {
  await db.read();
  const payments = db.data.payments.filter((p) => p.rideId === req.params.rideId);
  res.json({ payments });
});

export default router;
