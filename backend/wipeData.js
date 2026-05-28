import mongoose from 'mongoose';

import dotenv from 'dotenv';
import dns from 'dns';

// Force IPv4 (Node.js v17+ issue fix)
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);
dotenv.config();

// Define minimal schemas to access collections
const TransactionHistory = mongoose.model(
  'TransactionHistory',
  new mongoose.Schema({}, { strict: false }),
  'transactionhistories'
);
const CasinoBetHistory = mongoose.model(
  'CasinoBetHistory',
  new mongoose.Schema({}, { strict: false }),
  'casinobethistories'
);
const betHistoryModel = mongoose.model(
  'betHistoryModel',
  new mongoose.Schema({}, { strict: false }),
  'bethistories'
);
const SubAdmin = mongoose.model(
  'SubAdmin',
  new mongoose.Schema({}, { strict: false }),
  'subadmins'
);

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    console.log('Deleting TransactionHistory...');
    await TransactionHistory.deleteMany({});
    console.log('Deleting CasinoBetHistory...');
    await CasinoBetHistory.deleteMany({});
    console.log('Deleting betHistoryModel...');
    await betHistoryModel.deleteMany({});

    console.log('Resetting SubAdmin P/L and balances...');
    const subAdmins = await SubAdmin.find({});
    for (const subAdmin of subAdmins) {
      subAdmin.set('bettingProfitLoss', 0);
      subAdmin.set('uplineBettingProfitLoss', 0);
      subAdmin.set('exposure', 0);
      subAdmin.set('totalExposure', 0);
      subAdmin.set('commissionEarned', 0);
      subAdmin.set('rollingCommission', 0);
      subAdmin.set('weekPLResetAt', undefined);

      if (subAdmin.get('role') === 'user') {
        const bal = subAdmin.get('balance') || 0;
        const cred = subAdmin.get('creditReference') || 0;
        subAdmin.set('avbalance', bal);
        subAdmin.set('creditReferenceProfitLoss', bal - cred);
      }

      await subAdmin.save();
    }

    const admins = await SubAdmin.find({ role: { $ne: 'user' } });
    for (const admin of admins) {
      const downlines = await SubAdmin.find({
        invite: admin.get('code'),
        status: { $ne: 'delete' },
      });
      const DownlineTotalBaseBalance = downlines.reduce(
        (sum, u) => sum + (u.get('baseBalance') || 0),
        0
      );

      admin.set('totalBalance', DownlineTotalBaseBalance);
      admin.set('agentAvbalance', DownlineTotalBaseBalance);
      admin.set(
        'totalAvbalance',
        (admin.get('avbalance') || 0) + DownlineTotalBaseBalance
      );

      await admin.save();
    }
    console.log('SubAdmin reset complete.');

    console.log('All done. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
