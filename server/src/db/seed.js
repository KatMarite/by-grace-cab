import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Driver } from './models.js';
import { initDb } from './index.js';

async function seed() {
  await initDb();

  if (mongoose.connection.readyState !== 1) {
    console.error('Cannot seed, database not connected.');
    process.exit(1);
  }

  const accounts = [
    { name: 'Grace Admin', email: 'admin@bygracecab.com', phone: '0110000000', password: 'admin123', role: 'admin' },
    {
      name: 'Thabo Mokoena',
      email: 'driver@bygracecab.com',
      phone: '0820000001',
      password: 'driver123',
      role: 'driver',
      vehicleMake: 'Toyota',
      vehicleModel: 'Corolla Quest',
      plate: 'CA 123-456',
    },
    { name: 'Naledi Dube', email: 'rider@bygracecab.com', phone: '0830000002', password: 'rider123', role: 'rider' },
  ];

  for (const acc of accounts) {
    const existing = await User.findOne({ email: acc.email });
    if (existing) {
      console.log(`Skipping ${acc.email}, already exists.`);
      continue;
    }
    const passwordHash = await bcrypt.hash(acc.password, 10);
    
    const user = await User.create({
      name: acc.name,
      email: acc.email,
      phone: acc.phone,
      passwordHash,
      role: acc.role,
    });

    if (acc.role === 'driver') {
      await Driver.create({
        userId: user._id,
        vehicleMake: acc.vehicleMake,
        vehicleModel: acc.vehicleModel,
        plate: acc.plate,
        status: 'online',
        currentLat: -26.2041,
        currentLng: 28.0473,
      });
    }
    console.log(`Created ${acc.role}: ${acc.email} / ${acc.password}`);
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed();
