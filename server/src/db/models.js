import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => nanoid() },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['rider', 'driver', 'admin'], default: 'rider' },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const driverSchema = new mongoose.Schema({
  _id: { type: String, default: () => nanoid() },
  userId: { type: String, ref: 'User', required: true },
  vehicleMake: { type: String, required: true },
  vehicleModel: { type: String, required: true },
  plate: { type: String, required: true },
  status: { type: String, enum: ['offline', 'online', 'on_trip'], default: 'offline' },
  currentLat: { type: Number },
  currentLng: { type: Number },
});

const rideSchema = new mongoose.Schema({
  _id: { type: String, default: () => nanoid() },
  riderId: { type: String, ref: 'User', required: true },
  type: { type: String, enum: ['on_demand', 'scheduled'], default: 'on_demand' },
  scheduledFor: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  driverId: { type: String, ref: 'User' },
  stops: [{
    order: Number,
    label: String,
    lat: Number,
    lng: Number
  }],
  groupMembers: [{
    name: String,
    email: String,
    share: Number
  }],
  fareTotal: { type: Number, required: true },
  fareBreakdown: { type: mongoose.Schema.Types.Mixed },
  fareSplits: [{ type: mongoose.Schema.Types.Mixed }],
  createdAt: { type: String, default: () => new Date().toISOString() },
  completedAt: { type: String }
});

const paymentSchema = new mongoose.Schema({
  _id: { type: String, default: () => nanoid() },
  rideId: { type: String, ref: 'Ride', required: true },
  payerName: { type: String, required: true },
  payerEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  stripePaymentIntentId: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const User = mongoose.model('User', userSchema);
export const Driver = mongoose.model('Driver', driverSchema);
export const Ride = mongoose.model('Ride', rideSchema);
export const Payment = mongoose.model('Payment', paymentSchema);
