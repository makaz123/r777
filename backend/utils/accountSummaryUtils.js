/**
 * Account summary bar: week P/L (Mon–Sun, resets Sunday 11:59 PM), exposure share, dena fields.
 */

import {
  splitProfitLossByMyShare,
  roundMoney,
} from './partnershipCommissionUtils.js';

/** Current betting week: Monday 00:00 through Sunday 23:59:59.999 */
export function getCurrentWeekRange(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end, weekEndsAt: end };
}

export async function getDownlineUserIds(SubAdmin, adminCode) {
  const result = await SubAdmin.aggregate([
    { $match: { code: adminCode } },
    {
      $graphLookup: {
        from: 'subadmins',
        startWith: '$code',
        connectFromField: 'code',
        connectToField: 'invite',
        as: 'downline',
        restrictSearchWithMatch: { status: { $ne: 'delete' } },
      },
    },
    { $unwind: '$downline' },
    { $match: { 'downline.role': 'user' } },
    { $group: { _id: null, ids: { $push: '$downline._id' } } },
  ]);
  return (result[0]?.ids || []).map((id) => id.toString());
}

/** True if target account is anywhere under adminCode in the invite tree. */
export async function isAccountInAdminDownline(SubAdmin, adminCode, targetUser) {
  if (!adminCode || !targetUser?.invite) return false;

  let currentInvite = targetUser.invite;
  const maxDepth = 20;
  let depth = 0;

  while (currentInvite && depth < maxDepth) {
    if (currentInvite === adminCode) return true;
    const parent = await SubAdmin.findOne(
      { code: currentInvite },
      { invite: 1 }
    ).lean();
    if (!parent) break;
    currentInvite = parent.invite;
    depth++;
  }

  return false;
}

export async function aggregateWeekProfitLoss(
  betHistoryModel,
  CasinoBetHistory,
  userIds,
  weekRange
) {
  if (!userIds.length) return 0;

  const dateFilter = {
    $gte: weekRange.start,
    $lte: weekRange.end,
  };

  const sportsAgg = await betHistoryModel.aggregate([
    {
      $match: {
        userId: { $in: userIds },
        status: { $in: [1, 2] },
        $or: [{ settledAt: dateFilter }, { createdAt: dateFilter }],
      },
    },
    { $group: { _id: null, total: { $sum: '$profitLossChange' } } },
  ]);

  let casinoPL = 0;
  if (CasinoBetHistory) {
    const casinoAgg = await CasinoBetHistory.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          createdAt: dateFilter,
          $or: [{ bet_amount: { $gt: 0 } }, { win_amount: { $gt: 0 } }],
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $subtract: [
                { $ifNull: ['$win_amount', 0] },
                { $ifNull: ['$bet_amount', 0] },
              ],
            },
          },
        },
      },
    ]);
    casinoPL = casinoAgg[0]?.total || 0;
  }

  const sportsPL = sportsAgg[0]?.total || 0;
  return roundMoney(sportsPL + casinoPL);
}

/** Client/downline settled P/L → parent/upline view (invert sign). */
const toParentViewPL = (clientPL) => roundMoney(-(Number(clientPL) || 0));

export function buildAccountSummary(admin, weekPLTotal) {
  const mySharePct = Number(admin.partnership) || 0;
  const totalExposure = roundMoney(
    Number(admin.totalExposure ?? admin.exposure) || 0
  );
  const myShareExposureRaw = roundMoney(totalExposure * (mySharePct / 100));
  const myShareExposure =
    myShareExposureRaw > 0 ? -myShareExposureRaw : myShareExposureRaw;

  // Stored / aggregated downline P/L is client-side; parent profit is opposite sign
  const clientTillPL = roundMoney(Number(admin.uplineBettingProfitLoss) || 0);
  const clientWeekPL = roundMoney(weekPLTotal);
  const parentTillPL = toParentViewPL(clientTillPL);
  const parentWeekPL = toParentViewPL(clientWeekPL);

  const tillSplit = splitProfitLossByMyShare(parentTillPL, mySharePct);
  const weekSplit = splitProfitLossByMyShare(parentWeekPL, mySharePct);

  const roleLabel =
    admin.role === 'supperadmin'
      ? 'Super Admin'
      : admin.role?.charAt(0).toUpperCase() + admin.role?.slice(1);

  return {
    userId: admin.userName,
    userType: roleLabel,
    givenBal: roundMoney(admin.creditReference ?? admin.baseBalance ?? 0),
    available: roundMoney(admin.avbalance ?? 0),
    totalExposure,
    myShareExposure,
    mySharePercent: mySharePct,
    exposureDisplay: myShareExposure,
    myShareExposureRaw,
    currentWeekPLTotal: parentWeekPL,
    clientWeekPLTotal: clientWeekPL,
    currentWeekPL: weekSplit.myPL,
    currentWeekUplinePL: weekSplit.uplinePL,
    myPLTillDate: tillSplit.myPL,
    myPLTillDateTotal: tillSplit.totalPL,
    uplineDena: roundMoney(tillSplit.uplinePL),
    downlineDena: roundMoney(parentTillPL),
    uplineTooltip: 'Upper Level Ke Saath Hisab Ka Len-Den.',
    downlineTooltip: 'Down Line Ke Saath Hisab Ka Len-Den.',
    weekRange: getCurrentWeekRange(),
  };
}
