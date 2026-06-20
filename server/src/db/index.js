import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, 'data.json');

const defaultData = {
  users: [],       // {id, name, email, phone, passwordHash, role: 'rider'|'driver'|'admin', createdAt}
  drivers: [],      // {id, userId, vehicleMake, vehicleModel, plate, status: 'offline'|'online'|'on_trip', currentLat, currentLng}
  rides: [],        // {id, riderId, type:'on_demand'|'scheduled', scheduledFor, status, driverId, stops:[{order,label,lat,lng}], groupMembers:[{name,email,share}], fareTotal, fareBreakdown, createdAt, completedAt}
  payments: [],      // {id, rideId, payerName, payerEmail, amount, status, stripePaymentIntentId, createdAt}
};

const adapter = new JSONFile(file);
export const db = new Low(adapter, defaultData);

export async function initDb() {
  await db.read();
  db.data ||= structuredClone(defaultData);
  // Ensure all collections exist even if file was partially written before
  for (const key of Object.keys(defaultData)) {
    if (!db.data[key]) db.data[key] = [];
  }
  await db.write();
}
