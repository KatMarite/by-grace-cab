import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { db, initDb } from './index.js';

async function seed() {
  await initDb();

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
    const existing = db.data.users.find((u) => u.email === acc.email);
    if (existing) {
      console.log(`Skipping ${acc.email}, already exists.`);
      continue;
    }
    const passwordHash = await bcrypt.hash(acc.password, 10);
    const user = {
      id: nanoid(),
      name: acc.name,
      email: acc.email,
      phone: acc.phone,
      passwordHash,
      role: acc.role,
      createdAt: new Date().toISOString(),
    };
    db.data.users.push(user);

    if (acc.role === 'driver') {
      db.data.drivers.push({
        id: nanoid(),
        userId: user.id,
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

  await db.write();
  console.log('Seed complete.');
}

seed();
