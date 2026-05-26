import mongoose from 'mongoose';
import 'dotenv/config';
import SubAdmin from './models/subAdminModel.js';
import betHistoryModel from './models/betHistoryModel.js';
import CasinoBetHistory from './models/casinoBetHistory.model.js';
import TransactionHistory from './models/transtionHistoryModel.js';

// We need the ACTUAL functions from the controllers/utils to test them
import { loadAccountSummaryForAdmin } from './controllers/admin/subAdminController.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/r777');
  
  // Wipe all
  await SubAdmin.deleteMany({ userName: { $regex: /^test_/ } });
  await betHistoryModel.deleteMany({ userName: { $regex: /^test_/ } });
  await TransactionHistory.deleteMany({ userName: { $regex: /^test_/ } });
  
  const superadmin = await SubAdmin.create({
    userName: 'test_sa', role: 'supperadmin', code: 'SA01', invite: 'NONE', partnership: 100
  });
  
  const admin = await SubAdmin.create({
    userName: 'test_ad', role: 'admin', code: 'AD01', invite: 'SA01', partnership: 70
  });
  
  const user = await SubAdmin.create({
    userName: 'test_us', role: 'user', code: 'US01', invite: 'AD01', partnership: 0
  });
  
  // User loses 100
  await betHistoryModel.create({
    userId: user._id.toString(), userName: user.userName, gameName: 'Test', marketName: 'Test',
    gameType: 'Match Odds', betAmount: 100, profitLossChange: -100, status: 1, settledAt: new Date()
  });
  
  console.log("--- BEFORE SETTLEMENT ---");
  const adminSummary1 = await loadAccountSummaryForAdmin(admin._id);
  console.log("Admin Upline Dena:", adminSummary1.accountSummary.uplineDena);
  console.log("Admin Downline Dena:", adminSummary1.accountSummary.downlineDena);
  
  // Admin settles with User (User pays Admin 100)
  await TransactionHistory.create({
    userId: user._id.toString(), userName: user.userName, withdrawl: 0, deposite: 100,
    amount: 100, from: user.userName, to: admin.userName, remark: 'Settlement:', invite: admin.code
  });
  
  console.log("--- AFTER USER PAYS ADMIN ---");
  const adminSummary2 = await loadAccountSummaryForAdmin(admin._id);
  console.log("Admin Upline Dena:", adminSummary2.accountSummary.uplineDena);
  console.log("Admin Downline Dena:", adminSummary2.accountSummary.downlineDena);
  
  process.exit(0);
}
run();
