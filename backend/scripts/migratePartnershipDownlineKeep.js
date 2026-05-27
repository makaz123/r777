/**
 * One-time fix for partnership % stored by the old InsertAgent bug.
 *
 * Old create flow saved the creator's "my share" (e.g. 15) instead of downline keep (e.g. 85).
 * Legacy rows may also have parent-take encoding (e.g. 85 meaning 15% downline keep).
 *
 * Usage (from backend/):
 *   node scripts/migratePartnershipDownlineKeep.js              # dry-run (default)
 *   node scripts/migratePartnershipDownlineKeep.js --apply      # write to DB
 *   node scripts/migratePartnershipDownlineKeep.js --apply --users testing2,testing3
 *
 * Review the printed table before using --apply.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import SubAdmin from '../models/subAdminModel.js';
import {
  getAccountMyKeepPercent,
  roundMoney,
} from '../utils/partnershipCommissionUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const usersArg = args.find((a) => a.startsWith('--users='));
const userFilter = usersArg
  ? usersArg
      .slice('--users='.length)
      .split(',')
      .map((u) => u.trim().toLowerCase())
      .filter(Boolean)
  : null;

/**
 * @returns {{ reason: string, next: number } | null}
 */
function proposeFix(stored, parentKeep) {
  if (!stored || !parentKeep || stored === parentKeep) return null;

  // Legacy: DB held parent-take (e.g. 85 under 100% parent → keep 15%)
  if (stored > parentKeep / 2) {
    const next = roundMoney(parentKeep - stored);
    if (next > 0 && next < stored) {
      return { reason: 'legacy parent-take encoding', next };
    }
    return null;
  }

  // Buggy create: DB held creator my-share (e.g. 15) instead of downline keep (85)
  const next = roundMoney(parentKeep - stored);
  if (next > stored && next > parentKeep / 2 && next <= parentKeep) {
    return { reason: 'old create form (parent share saved)', next };
  }

  return null;
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI missing in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected: ${mongoose.connection.name}`);
  console.log(
    apply ? 'MODE: APPLY (will update DB)\n' : 'MODE: DRY-RUN (no writes)\n'
  );

  const query = {
    role: { $ne: 'user' },
    status: { $ne: 'delete' },
    partnership: { $gt: 0 },
  };
  if (userFilter?.length) {
    query.userName = { $in: userFilter };
  }

  const rows = await SubAdmin.find(query)
    .select('userName role partnership invite code')
    .lean();
  const parentByCode = new Map();

  const changes = [];

  for (const row of rows) {
    if (!row.invite) continue;

    let parent = parentByCode.get(row.invite);
    if (!parent) {
      parent = await SubAdmin.findOne({ code: row.invite })
        .select('userName role partnership invite code')
        .lean();
      if (parent) parentByCode.set(row.invite, parent);
    }
    if (!parent) continue;

    const stored = roundMoney(Number(row.partnership) || 0);
    const parentKeep = getAccountMyKeepPercent(parent);
    const proposal = proposeFix(stored, parentKeep);
    if (!proposal || proposal.next === stored) continue;

    changes.push({
      _id: row._id,
      userName: row.userName,
      role: row.role,
      parentUser: parent.userName,
      parentKeep,
      stored,
      next: proposal.next,
      reason: proposal.reason,
    });
  }

  if (!changes.length) {
    console.log('No rows need migration for the current rules.');
    await mongoose.disconnect();
    return;
  }

  console.log(
    'userName'.padEnd(16) +
      'role'.padEnd(10) +
      'parent'.padEnd(16) +
      'stored'.padEnd(8) +
      '→ new'.padEnd(8) +
      'reason'
  );
  console.log('-'.repeat(90));

  for (const c of changes) {
    console.log(
      c.userName.padEnd(16) +
        String(c.role).padEnd(10) +
        String(c.parentUser).padEnd(16) +
        String(c.stored).padEnd(8) +
        String(c.next).padEnd(8) +
        c.reason
    );
  }

  console.log(`\n${changes.length} account(s) to update.`);

  if (!apply) {
    console.log('\nRun with --apply to save. Example:');
    console.log(
      '  node scripts/migratePartnershipDownlineKeep.js --apply --users=testing3'
    );
    await mongoose.disconnect();
    return;
  }

  for (const c of changes) {
    await SubAdmin.updateOne({ _id: c._id }, { $set: { partnership: c.next } });
  }

  console.log(`\nUpdated ${changes.length} account(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
