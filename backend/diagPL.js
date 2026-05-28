// Quick diagnostic script to check P/L calculation for an admin
import dotenv from 'dotenv';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
dotenv.config();
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import SubAdmin from './models/subAdminModel.js';
import betHistoryModel from './models/betHistoryModel.js';
import CasinoBetHistory from './models/casinoBetHistory.model.js';
import {
  getDownlineUserIds,
  aggregateSettledPLByUser,
  normalizePLByUserIds,
  getAccountByCodeMap,
} from './utils/accountSummaryUtils.js';
import {
  getViewerShareOfUserClientPL,
  getParentShareOnDownlineRow,
  getAccountMyKeepPercent,
  getDownlineKeepPercentOnRow,
} from './utils/partnershipCommissionUtils.js';

await connectDB();

// Find satyamadmin1
const admin = await SubAdmin.findOne({ userName: 'satyamadmin1' }).lean();
if (!admin) {
  console.log('Admin satyamadmin1 not found!');
  process.exit(1);
}
console.log(`\n=== Admin: ${admin.userName}, code: ${admin.code}, role: ${admin.role}, partnership: ${admin.partnership}, invite: ${admin.invite} ===\n`);

// 1. Get downline user IDs
const downlineUserIds = await getDownlineUserIds(SubAdmin, admin.code);
console.log(`Downline user IDs count: ${downlineUserIds.length}`);
if (downlineUserIds.length === 0) {
  console.log('No downline users found! Checking direct children...');
  const directChildren = await SubAdmin.find({ invite: admin.code, status: { $ne: 'delete' } }).select('userName code role partnership invite').lean();
  console.log('Direct children:', directChildren);
  process.exit(1);
}

// 2. Get users
const users = await SubAdmin.find({ _id: { $in: downlineUserIds } }).lean();
console.log(`Users found: ${users.length}`);

// 3. Get P/L by user
const plByUser = await aggregateSettledPLByUser(betHistoryModel, CasinoBetHistory, downlineUserIds, null);
console.log(`\nP/L by user:`);
for (const [id, pl] of plByUser) {
  if (pl !== 0) {
    const user = users.find(u => u._id.toString() === id);
    console.log(`  ${user?.userName || id}: ${pl}`);
  }
}

// 4. Get accountByCode
const accountByCode = await getAccountByCodeMap(SubAdmin, admin);
console.log(`\nAccountByCode size: ${accountByCode.size}`);

// 5. Normalized P/L
const normalizedPL = normalizePLByUserIds(users, plByUser);

// 6. Trace per-user viewer share
console.log(`\nPer-user viewer share computation:`);
let total = 0;
for (const user of users) {
  if (user.role !== 'user') continue;
  const userId = user._id.toString();
  const clientPL = normalizedPL.get(userId) ?? 0;
  if (Math.abs(clientPL) < 0.01) continue;

  // Trace the invite chain walk
  let node = user;
  let chainPath = [user.userName + `(invite=${user.invite})`];
  while (node?.invite && node.invite !== admin.code) {
    const parent = accountByCode.get(node.invite);
    if (!parent) {
      chainPath.push(`MISSING(code=${node.invite})`);
      break;
    }
    chainPath.push(parent.userName + `(code=${parent.code},invite=${parent.invite},partnership=${parent.partnership})`);
    node = parent;
  }

  let childOfViewer = null;
  if (node?.invite === admin.code) {
    childOfViewer = node;
  }
  
  const viewer = accountByCode.get(admin.code);
  const parentKeep = viewer ? getAccountMyKeepPercent(viewer) : 'N/A';
  const downKeep = childOfViewer ? getDownlineKeepPercentOnRow(childOfViewer, viewer) : 'N/A';
  const parentTake = childOfViewer ? getParentShareOnDownlineRow(childOfViewer, viewer) : 'N/A';

  const share = getViewerShareOfUserClientPL(admin.code, user, accountByCode, clientPL);
  total += share;

  console.log(`  User: ${user.userName}, clientPL: ${clientPL}, viewerShare: ${share}`);
  console.log(`    Chain: ${chainPath.join(' → ')}`);
  console.log(`    childOfViewer: ${childOfViewer?.userName || 'null'}, partnership: ${childOfViewer?.partnership}`);
  console.log(`    parentKeep: ${parentKeep}, downKeep: ${downKeep}, parentTake: ${parentTake}`);
}

console.log(`\nTotal viewer P/L (myPLTillDate): ${total.toFixed(2)}`);

// Also check varahi (supperadmin)
const varahi = await SubAdmin.findOne({ role: 'supperadmin' }).lean();
if (varahi) {
  console.log(`\n=== SuperAdmin: ${varahi.userName}, code: ${varahi.code}, partnership: ${varahi.partnership} ===`);
  const varahiDownlineUserIds = await getDownlineUserIds(SubAdmin, varahi.code);
  console.log(`Downline user IDs count: ${varahiDownlineUserIds.length}`);
  const varahiPlByUser = await aggregateSettledPLByUser(betHistoryModel, CasinoBetHistory, varahiDownlineUserIds, null);
  const varahiUsers = await SubAdmin.find({ _id: { $in: varahiDownlineUserIds } }).lean();
  const varahiAccountByCode = await getAccountByCodeMap(SubAdmin, varahi);
  const varahiNormalizedPL = normalizePLByUserIds(varahiUsers, varahiPlByUser);
  
  let varahiTotal = 0;
  for (const user of varahiUsers) {
    if (user.role !== 'user') continue;
    const clientPL = varahiNormalizedPL.get(user._id.toString()) ?? 0;
    if (Math.abs(clientPL) < 0.01) continue;
    const share = getViewerShareOfUserClientPL(varahi.code, user, varahiAccountByCode, clientPL);
    varahiTotal += share;
  }
  console.log(`Total viewer P/L for varahi: ${varahiTotal.toFixed(2)}`);
}

process.exit(0);
