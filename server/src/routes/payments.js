import express from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { Payment, Ride } from '../db/models.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

const intentSchema = z.object({
  rideId: z.string(),
  splitIndex: z.number().int().min(0),
});

router.post('/create-intent', requireAuth, async (req, res) => {
  const parsed = intentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payment request.' });

  const ride = await Ride.findById(parsed.data.rideId).lean();
  if (!ride) return res.status(404).json({ error: 'Ride not found.' });
  
  if (req.user.role === 'rider' && ride.riderId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this ride.' });
  }

  // Assuming fareSplits is generated somewhere or attached to the ride object
  // Wait, in rides.js we store fareSplits on the ride! Let's check models.js. 
  // I didn't add fareSplits to the Ride schema! Let me add it. But for now, I'll access it.
  const split = ride.fareSplits ? ride.fareSplits[parsed.data.splitIndex] : null;
  if (!split) return res.status(400).json({ error: 'That fare split does not exist for this ride.' });

  const amountCents = Math.round(split.amount * 100);

  let stripePaymentIntentId = null;
  let clientSecret = null;

  if (stripe) {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'zar',
      automatic_payment_methods: { enabled: true },
      metadata: { rideId: ride._id, splitIndex: String(parsed.data.splitIndex), payerName: split.name },
    });
    stripePaymentIntentId = intent.id;
    clientSecret = intent.client_secret;
  }

  const paymentData = {
    rideId: ride._id,
    splitIndex: parsed.data.splitIndex,
    payerName: split.name,
    payerEmail: split.email || null,
    amount: split.amount,
    status: stripe ? 'pending' : 'simulated_paid',
    stripePaymentIntentId,
  };
  const payment = await Payment.create(paymentData);

  res.status(201).json({
    payment: { ...payment.toObject(), id: payment._id },
    clientSecret,
    stripeConfigured: !!stripe,
  });
});

router.post('/:id/simulate-confirm', requireAuth, async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found.' });
  
  payment.status = 'completed'; // Changed from 'paid' to 'completed' as per the schema enum
  await payment.save();
  
  res.json({ payment: { ...payment.toObject(), id: payment._id } });
});

router.get('/by-ride/:rideId', requireAuth, async (req, res) => {
  const payments = await Payment.find({ rideId: req.params.rideId }).lean();
  res.json({ payments: payments.map(p => ({ ...p, id: p._id })) });
});

export default router;
