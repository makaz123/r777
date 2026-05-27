
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import('./models/subAdminModel.js').then(async (m) => {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const admins = await m.default.find({}).lean();
  const withLocks = admins.filter(a => a.advancedBetLocks && Object.keys(a.advancedBetLocks).length > 0);
  console.log('Admins with locks:', JSON.stringify(withLocks.map(a => ({ role: a.role, name: a.userName, locks: a.advancedBetLocks })), null, 2));
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });

