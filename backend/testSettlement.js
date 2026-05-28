import mongoose from 'mongoose';
import 'dotenv/config';
import SubAdmin from './models/subAdminModel.js';
import betHistoryModel from './models/betHistoryModel.js';
import CasinoBetHistory from './models/casinoBetHistory.model.js';
import TransactionHistory from './models/transtionHistoryModel.js';
import { loadAccountSummaryForAdmin } from './controllers/admin/subAdminController.js';

async function run() {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/r777'
  );

  const admins = await SubAdmin.find({
    role: { $nin: ['supperadmin', 'superadmin', 'user'] },
  });
  if (!admins.length) {
    console.log('No intermediate admin found');
    process.exit(0);
  }

  const admin = admins[0];
  const summary = await loadAccountSummaryForAdmin(admin._id);
  console.log(
    'Admin Summary for',
    admin.userName,
    ':',
    JSON.stringify(summary.accountSummary, null, 2)
  );

  process.exit(0);
}

run();
