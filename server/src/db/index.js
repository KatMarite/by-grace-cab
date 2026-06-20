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
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, family: 4, servername: 'cluster0.x3g7mst.mongodb.net' });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}
