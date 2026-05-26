/**
 * Account summary bar: week P/L (Mon–Sun, resets Sunday 11:59 PM), exposure share, dena fields.
 */

import {
  getAccountMyKeepPercent,
  getViewerShareOfUserClientPL,
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
export async function isAccountInAdminDownline(
  SubAdmin,
  adminCode,
  targetUser
) {
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

/** Per-user settled P/L (client-side). Optional dateRange = { start, end }. */
export async function aggregateSettledPLByUser(
  betHistoryModel,
  CasinoBetHistory,
  userIds,
  dateRange = null
) {
  if (!userIds.length) return new Map();

  const dateFilter = dateRange
    ? {
        $gte: dateRange.start,
        $lte: dateRange.end,
      }
    : null;

  const sportsMatch = {
    userId: { $in: userIds },
    status: { $in: [1, 2] },
  };
  if (dateFilter) {
    sportsMatch.$or = [{ settledAt: dateFilter }, { createdAt: dateFilter }];
  }

  const sportsAgg = await betHistoryModel.aggregate([
    { $match: sportsMatch },
    { $group: { _id: '$userId', total: { $sum: '$profitLossChange' } } },
  ]);

  const byUser = new Map(userIds.map((id) => [id.toString(), 0]));
  for (const row of sportsAgg) {
    byUser.set(String(row._id), roundMoney(row.total || 0));
  }

  if (CasinoBetHistory) {
    const casinoMatch = {
      userId: { $in: userIds },
      $or: [{ bet_amount: { $gt: 0 } }, { win_amount: { $gt: 0 } }],
    };
    if (dateFilter) {
      casinoMatch.createdAt = dateFilter;
    }
    const casinoAgg = await CasinoBetHistory.aggregate([
      { $match: casinoMatch },
      {
        $group: {
          _id: '$userId',
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
    for (const row of casinoAgg) {
      const id = String(row._id);
      byUser.set(id, roundMoney((byUser.get(id) || 0) + (row.total || 0)));
    }
  }

  return byUser;
}

export async function getAccountByCodeMap(SubAdmin, viewer) {
  const result = await SubAdmin.aggregate([
    { $match: { code: viewer.code } },
    {
      $graphLookup: {
        from: 'subadmins',
        startWith: '$code',
        connectFromField: 'code',
        connectToField: 'invite',
        as: 'downline',
      },
    },
  ]);
  const accountByCode = new Map(
    (result[0]?.downline || []).map((row) => [row.code, row])
  );
  accountByCode.set(viewer.code, viewer);
  return accountByCode;
}

/** Align aggregated P/L keys (userId string / userName) to SubAdmin _id strings. */
export function normalizePLByUserIds(users, plByUser) {
  const out = new Map();
  for (const user of users) {
    const id = user._id.toString();
    let pl = plByUser.get(id) ?? 0;
    if (!pl) {
      for (const [key, value] of plByUser) {
        if (
          key === id ||
          key === user.userName ||
          key === String(user.userName || '').toLowerCase()
        ) {
          pl = value;
          break;
        }
      }
    }
    out.set(id, roundMoney(pl));
  }
  return out;
}

/** Viewer's share of outstanding downline P/L (after settlements; uses stored bettingProfitLoss). */
export async function aggregateViewerOutstandingPL(SubAdmin, viewer) {
  const downlineUserIds = await getDownlineUserIds(SubAdmin, viewer.code);
  if (!downlineUserIds.length) return 0;

  const [users, accountByCode] = await Promise.all([
    SubAdmin.find({ _id: { $in: downlineUserIds } })
      .select('_id userName role invite bettingProfitLoss')
      .lean(),
    getAccountByCodeMap(SubAdmin, viewer),
  ]);

  const clientPLByUserId = new Map();
  for (const user of users) {
    clientPLByUserId.set(
      user._id.toString(),
      roundMoney(user.bettingProfitLoss || 0)
    );
  }
  return computeViewerPeriodPL(viewer, users, clientPLByUserId, accountByCode);
}

/** Gross parent-view outstanding P/L from end-users (respects settlement). */
export async function aggregateDownlineOutstandingGross(SubAdmin, viewerCode) {
  const downlineUserIds = await getDownlineUserIds(SubAdmin, viewerCode);
  if (!downlineUserIds.length) return 0;

  const users = await SubAdmin.find({ _id: { $in: downlineUserIds } })
    .select('bettingProfitLoss')
    .lean();

  let total = 0;
  for (const user of users) {
    total += roundMoney(-(user.bettingProfitLoss || 0));
  }
  return roundMoney(total);
}

/** Viewer's share of settled downline P/L (parent view: + = house profit). */
export async function aggregateViewerProfitLoss(
  SubAdmin,
  betHistoryModel,
  CasinoBetHistory,
  viewer,
  dateRange = null
) {
  const downlineUserIds = await getDownlineUserIds(SubAdmin, viewer.code);
  if (!downlineUserIds.length) return 0;

  const [users, plByUser, accountByCode] = await Promise.all([
    SubAdmin.find({ _id: { $in: downlineUserIds } }).lean(),
    aggregateSettledPLByUser(
      betHistoryModel,
      CasinoBetHistory,
      downlineUserIds,
      dateRange
    ),
    getAccountByCodeMap(SubAdmin, viewer),
  ]);

  const normalizedPL = normalizePLByUserIds(users, plByUser);
  return computeViewerPeriodPL(viewer, users, normalizedPL, accountByCode);
}

/** Gross downline settled P/L in parent view (full branch, before your keep %). */
export async function aggregateDownlineParentViewPL(
  SubAdmin,
  betHistoryModel,
  CasinoBetHistory,
  viewerCode,
  dateRange = null
) {
  const downlineUserIds = await getDownlineUserIds(SubAdmin, viewerCode);
  if (!downlineUserIds.length) return 0;

  const plByUser = await aggregateSettledPLByUser(
    betHistoryModel,
    CasinoBetHistory,
    downlineUserIds,
    dateRange
  );

  let total = 0;
  for (const userId of downlineUserIds) {
    const clientPL = plByUser.get(userId.toString()) || 0;
    total += roundMoney(-clientPL);
  }
  return roundMoney(total);
}

/** Sum viewer's share from per-user client P/L (e.g. dashboard bets already loaded). */
export function computeViewerPeriodPL(
  viewer,
  endUsers,
  clientPLByUserId,
  accountByCode
) {
  let total = 0;
  for (const user of endUsers) {
    if (user.role !== 'user') continue;
    const userId = user._id.toString();
    const clientPL =
      clientPLByUserId.get(userId) ??
      clientPLByUserId.get(String(user._id)) ??
      clientPLByUserId.get(user.userName) ??
      clientPLByUserId.get(String(user.userName || '').toLowerCase()) ??
      0;
    if (!clientPL) continue;
    total += getViewerShareOfUserClientPL(
      viewer.code,
      user,
      accountByCode,
      clientPL
    );
  }
  return roundMoney(total);
}

export function buildAccountSummary(admin, plTotals = {}) {
  const myKeepPct = getAccountMyKeepPercent(admin);
  const isEndUserRole = admin.role === 'user';
  const totalExposure = isEndUserRole
    ? roundMoney(Number(admin.totalExposure ?? admin.exposure) || 0)
    : 0;
  const myShareExposureRaw = roundMoney(totalExposure * (myKeepPct / 100));
  const myShareExposure =
    myShareExposureRaw > 0 ? -myShareExposureRaw : myShareExposureRaw;

  const weekViewerPL = roundMoney(plTotals.weekViewerPL ?? 0);
  const tillViewerPL = roundMoney(plTotals.tillViewerPL ?? 0);
  const weekDownlinePL = roundMoney(plTotals.weekDownlinePL ?? 0);
  const tillDownlinePL = roundMoney(plTotals.tillDownlinePL ?? 0);

  const roleLabel =
    admin.role === 'supperadmin'
      ? 'Super Admin'
      : admin.role?.charAt(0).toUpperCase() + admin.role?.slice(1);

  return {
    userId: admin.userName,
    userType: roleLabel,
    givenBal: isEndUserRole
      ? roundMoney(admin.creditReference ?? admin.baseBalance ?? 0)
      : roundMoney(
          (admin.totalBalance || 0) - (admin.uplineBettingProfitLoss || 0)
        ),
    available: roundMoney(admin.avbalance ?? 0),
    totalExposure,
    myShareExposure: isEndUserRole ? myShareExposure : 0,
    mySharePercent: myKeepPct,
    exposureDisplay: isEndUserRole ? myShareExposure : 0,
    myShareExposureRaw: isEndUserRole ? myShareExposureRaw : 0,
    currentWeekPLTotal: weekDownlinePL,
    clientWeekPLTotal: roundMoney(-weekDownlinePL),
    currentWeekPL: weekViewerPL,
    currentWeekUplinePL: roundMoney(weekDownlinePL - weekViewerPL),
    myPLTillDate: tillViewerPL,
    myPLTillDateTotal: tillDownlinePL,
    /** Amount passed to upline from downline P/L (your keep vs gross). */
    uplineDena: roundMoney(tillDownlinePL - tillViewerPL),
    /** Your share with downline — not gross client/downline total. */
    downlineDena: tillViewerPL,
    downlineDenaGross: tillDownlinePL,
    uplineTooltip: 'Upper Level Ke Saath Hisab Ka Len-Den.',
    downlineTooltip: 'Down Line Ke Saath Hisab Ka Len-Den.',
    downlineLenDena:
      tillViewerPL > 0.005 ? 'lena' : tillViewerPL < -0.005 ? 'dena' : 'clear',
    uplineLenDena:
      roundMoney(tillDownlinePL - tillViewerPL) > 0.005
        ? 'dena'
        : roundMoney(tillDownlinePL - tillViewerPL) < -0.005
          ? 'lena'
          : 'clear',
    weekRange: getCurrentWeekRange(),
  };
}

/** Positive downline share = collect from downline (lena); negative = pay downline (dena). */
export function getDownlineLenDenaLabel(amount) {
  const n = Number(amount) || 0;
  if (Math.abs(n) < 0.01) return 'clear';
  return n > 0 ? 'lena' : 'dena';
}

/** Positive upline share = pay upline (dena); negative = collect from upline (lena). */
export function getUplineLenDenaLabel(amount) {
  const n = Number(amount) || 0;
  if (Math.abs(n) < 0.01) return 'clear';
  return n > 0 ? 'dena' : 'lena';
}
