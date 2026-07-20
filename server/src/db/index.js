import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.set('bufferCommands', false);

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export async function initDb() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('MONGODB_URI is not set. Please set it in .env');
      return;
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
  }
}
