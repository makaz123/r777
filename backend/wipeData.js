import mongoose from 'mongoose';

import dotenv from "dotenv";
import dns from "dns";

// Force IPv4 (Node.js v17+ issue fix)
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

// Define minimal schemas to access collections
const TransactionHistory = mongoose.model('TransactionHistory', new mongoose.Schema({}, { strict: false }), 'transactionhistories');
const CasinoBetHistory = mongoose.model('CasinoBetHistory', new mongoose.Schema({}, { strict: false }), 'casinobethistories');
const betHistoryModel = mongoose.model('betHistoryModel', new mongoose.Schema({}, { strict: false }), 'bethistories');
const SubAdmin = mongoose.model('SubAdmin', new mongoose.Schema({}, { strict: false }), 'subadmins');

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

    console.log('Resetting SubAdmin P/L fields...');
    const result = await SubAdmin.updateMany({}, {
      $set: {
        bettingProfitLoss: 0,
        uplineBettingProfitLoss: 0,
      },
      $unset: {
        weekPLResetAt: 1
      }
    });
    console.log('SubAdmin reset complete:', result);

    console.log('All done. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
