import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export async function initDb() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('MONGODB_URI is not set. Please set it in .env');
      return;
    }
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}
