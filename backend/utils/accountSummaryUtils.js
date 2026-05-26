/**
 * Account summary bar: week P/L clears only on cash settlement (not calendar week).
 */

import {
  getAccountMyKeepPercent,
  getParentShareOnDownlineRow,
  getViewerShareOfUserClientPL,
  roundMoney,
  splitProfitLossByMyShare,
} from './partnershipCommissionUtils.js';

/** Calendar week (Mon–Sun) — used by dashboard date picker only, not account summary Week P/L. */
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

  return { start, end, weekEndsAt: end, isCalendarWeek: true };
}

/**
 * Week P/L window: from last full clear (weekPLResetAt) or account creation — not reset on partial settlement.
 */
export async function getWeekPLRangeForAdmin(admin) {
  const end = new Date();
  let start = admin?.weekPLResetAt
    ? new Date(admin.weekPLResetAt)
    : admin?.createdAt
      ? new Date(admin.createdAt)
      : new Date(0);

  if (start > end) start = new Date(end);

  return {
    start,
    end,
    weekEndsAt: end,
    isSettlementPeriod: true,
    resetAt: start,
  };
}

/** Mark week P/L period start (after Up Line and Down Line are both cash-cleared). */
export async function setWeekPLResetNow(SubAdmin, adminId, at = new Date()) {
  await SubAdmin.findByIdAndUpdate(adminId, { weekPLResetAt: at });
}

/** Settlement cash per user within a date range. */
export async function getSettlementCashTotalsByUserInRange(
  TransactionHistory,
  userIds,
  dateRange
) {
  const ids = (userIds || []).map((id) => String(id));
  const empty = new Map(ids.map((id) => [id, { withdrawl: 0, deposite: 0 }]));
  if (!ids.length || !dateRange?.start) return empty;

  const agg = await TransactionHistory.aggregate([
    {
      $match: {
        userId: { $in: ids },
        remark: { $regex: /^Settlement:(?! branch)/ },
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      },
    },
    {
      $group: {
        _id: '$userId',
        withdrawl: { $sum: { $ifNull: ['$withdrawl', 0] } },
        deposite: { $sum: { $ifNull: ['$deposite', 0] } },
      },
    },
  ]);

  for (const row of agg) {
    const id = String(row._id);
    empty.set(id, {
      withdrawl: roundMoney(row.withdrawl || 0),
      deposite: roundMoney(row.deposite || 0),
    });
  }
  return empty;
}

/** Week P/L maps: settled bets in range minus cash settlements in the same range. */
export async function getDownlineWeekPLMaps(
  SubAdmin,
  betHistoryModel,
  CasinoBetHistory,
  TransactionHistory,
  viewerCode,
  weekRange
) {
  const downlineUserIds = await getDownlineUserIds(SubAdmin, viewerCode);
  if (!downlineUserIds.length) {
    return {
      users: [],
      historyPLByUserId: new Map(),
      expectedPLByUserId: new Map(),
    };
  }

  const [users, plByUser, settlementByUser] = await Promise.all([
    SubAdmin.find({ _id: { $in: downlineUserIds } })
      .select('_id userName role invite bettingProfitLoss')
      .lean(),
    aggregateSettledPLByUser(
      betHistoryModel,
      CasinoBetHistory,
      downlineUserIds,
      weekRange
    ),
    getSettlementCashTotalsByUserInRange(
      TransactionHistory,
      downlineUserIds,
      weekRange
    ),
  ]);

  const historyPLByUserId = normalizePLByUserIds(users, plByUser);
  const expectedPLByUserId = new Map();

  for (const user of users) {
    const id = user._id.toString();
    const historyPL = historyPLByUserId.get(id) ?? 0;
    const settlementCash = settlementByUser.get(id) ?? {
      withdrawl: 0,
      deposite: 0,
    };
    expectedPLByUserId.set(
      id,
      expectedBettingPLFromHistory(historyPL, settlementCash)
    );
  }

  return { users, historyPLByUserId, expectedPLByUserId, settlementByUser };
}

/**
 * Gross settlement cash with downline end-users in the week (admin view).
 * Deposite (debtor paid) → +; withdrawl (creditor paid) → −.
 */
export function sumDownlineWeekSettlementCashNet(users, settlementByUser) {
  let net = 0;
  for (const user of users) {
    if (user.role !== 'user') continue;
    const id = user._id.toString();
    const cash = settlementByUser?.get(id) ?? { withdrawl: 0, deposite: 0 };
    net += roundMoney((cash.deposite || 0) - (cash.withdrawl || 0));
  }
  return roundMoney(net);
}

/** Cash settled on this account in the week (upline settling you): withdrawl − deposite. */
export function getSelfWeekSettlementCashNet(weekSelfSettlementCash) {
  const cash = weekSelfSettlementCash || { withdrawl: 0, deposite: 0 };
  return roundMoney((cash.withdrawl || 0) - (cash.deposite || 0));
}

/**
 * Week P/L: partnership share of bets in period (no settlement baked in),
 * plus downline settlement cash in week, minus upline settlement on self in week.
 */
export async function aggregateViewerWeekPL(
  SubAdmin,
  betHistoryModel,
  CasinoBetHistory,
  TransactionHistory,
  viewer,
  weekRange
) {
  const { users, historyPLByUserId, expectedPLByUserId, settlementByUser } =
    await getDownlineWeekPLMaps(
      SubAdmin,
      betHistoryModel,
      CasinoBetHistory,
      TransactionHistory,
      viewer.code,
      weekRange
    );

  if (!users.length) {
    return {
      weekViewerBettingPL: 0,
      weekDownlineSettlementNet: 0,
      weekDownlinePL: 0,
      weekViewerPL: 0,
    };
  }

  const accountByCode = await getAccountByCodeMap(SubAdmin, viewer);
  const weekViewerBettingPL = computeViewerPeriodPL(
    viewer,
    users,
    historyPLByUserId,
    accountByCode
  );
  const weekDownlineSettlementNet = sumDownlineWeekSettlementCashNet(
    users,
    settlementByUser
  );

  let weekDownlineClient = 0;
  for (const user of users) {
    if (user.role !== 'user') continue;
    const id = user._id.toString();
    weekDownlineClient += roundMoney(expectedPLByUserId.get(id) ?? 0);
  }

  return {
    weekViewerBettingPL,
    weekDownlineSettlementNet,
    weekViewerPL: weekViewerBettingPL,
    weekDownlinePL: roundMoney(-weekDownlineClient),
  };
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

/**
 * Per-user lifetime bet-history P/L and cash-settlement-adjusted outstanding P/L.
 * Outstanding = history − withdrawals + deposits (same as updateAdmin sync).
 */
export async function getDownlineOutstandingPLMaps(
  SubAdmin,
  betHistoryModel,
  CasinoBetHistory,
  TransactionHistory,
  viewerCode
) {
  const downlineUserIds = await getDownlineUserIds(SubAdmin, viewerCode);
  if (!downlineUserIds.length) {
    return { users: [], historyPLByUserId: new Map(), expectedPLByUserId: new Map() };
  }

  const [users, plByUser] = await Promise.all([
    SubAdmin.find({ _id: { $in: downlineUserIds } })
      .select('_id userName role invite bettingProfitLoss')
      .lean(),
    aggregateSettledPLByUser(
      betHistoryModel,
      CasinoBetHistory,
      downlineUserIds,
      null
    ),
  ]);

  const historyPLByUserId = normalizePLByUserIds(users, plByUser);
  const expectedPLByUserId = new Map();

  await Promise.all(
    users.map(async (user) => {
      const id = user._id.toString();
      const historyPL = historyPLByUserId.get(id) ?? 0;
      const settlementCash = await getSettlementCashTotals(
        TransactionHistory,
        user._id
      );
      expectedPLByUserId.set(
        id,
        expectedBettingPLFromHistory(historyPL, settlementCash)
      );
    })
  );

  return { users, historyPLByUserId, expectedPLByUserId };
}

/**
 * When a debtor is cash-settled but other downline users still have open P/L,
 * zeroing their expected P/L removes their offset from the net and wrongly
 * increases dena (or lena). Add back that cleared parent-view share.
 */
export function applyDebtorSettlementNetAddback(
  viewer,
  users,
  historyPLByUserId,
  expectedPLByUserId,
  accountByCode,
  baseOutstandingPL
) {
  const hasAnyOutstanding = users.some((user) => {
    const id = user._id.toString();
    return Math.abs(expectedPLByUserId.get(id) ?? 0) > 0.01;
  });
  if (!hasAnyOutstanding) return roundMoney(baseOutstandingPL);

  let addback = 0;
  for (const user of users) {
    if (user.role !== 'user') continue;
    const id = user._id.toString();
    const historyPL = historyPLByUserId.get(id) ?? 0;
    const expectedPL = expectedPLByUserId.get(id) ?? 0;
    if (Math.abs(expectedPL) > 0.01) continue;
    if (Math.abs(historyPL) < 0.01) continue;

    const clearedShare =
      getViewerShareOfUserClientPL(
        viewer.code,
        user,
        accountByCode,
        historyPL
      ) -
      getViewerShareOfUserClientPL(
        viewer.code,
        user,
        accountByCode,
        expectedPL
      );
    addback += clearedShare;
  }

  return roundMoney(baseOutstandingPL + addback);
}

/** Viewer's share of outstanding downline len-den (after cash settlements). */
export async function aggregateViewerOutstandingPL(
  SubAdmin,
  betHistoryModel,
  CasinoBetHistory,
  TransactionHistory,
  viewer
) {
  const { users, historyPLByUserId, expectedPLByUserId } =
    await getDownlineOutstandingPLMaps(
      SubAdmin,
      betHistoryModel,
      CasinoBetHistory,
      TransactionHistory,
      viewer.code
    );
  if (!users.length) return 0;

  const accountByCode = await getAccountByCodeMap(SubAdmin, viewer);
  const base = computeViewerPeriodPL(
    viewer,
    users,
    expectedPLByUserId,
    accountByCode
  );

  return applyDebtorSettlementNetAddback(
    viewer,
    users,
    historyPLByUserId,
    expectedPLByUserId,
    accountByCode,
    base
  );
}

/** Gross parent-view outstanding P/L from end-users (respects cash settlement). */
export async function aggregateDownlineOutstandingGross(
  SubAdmin,
  betHistoryModel,
  CasinoBetHistory,
  TransactionHistory,
  viewerCode
) {
  const { users, historyPLByUserId, expectedPLByUserId } =
    await getDownlineOutstandingPLMaps(
      SubAdmin,
      betHistoryModel,
      CasinoBetHistory,
      TransactionHistory,
      viewerCode
    );
  if (!users.length) return 0;

  let total = 0;
  for (const user of users) {
    const id = user._id.toString();
    total += roundMoney(-(expectedPLByUserId.get(id) ?? 0));
  }

  const hasAnyOutstanding = users.some((user) => {
    const id = user._id.toString();
    return Math.abs(expectedPLByUserId.get(id) ?? 0) > 0.01;
  });
  if (!hasAnyOutstanding) return roundMoney(total);

  for (const user of users) {
    const id = user._id.toString();
    const historyPL = historyPLByUserId.get(id) ?? 0;
    const expectedPL = expectedPLByUserId.get(id) ?? 0;
    if (Math.abs(expectedPL) > 0.01) continue;
    if (Math.abs(historyPL) < 0.01) continue;
    total += roundMoney(-historyPL + expectedPL);
  }

  return roundMoney(total);
}

/** Sum of end-users' outstanding client P/L (100% user view, after cash settlements). */
export async function aggregateDownlineClientPLSum(
  SubAdmin,
  betHistoryModel,
  CasinoBetHistory,
  TransactionHistory,
  viewerCode
) {
  const { users, expectedPLByUserId } = await getDownlineOutstandingPLMaps(
    SubAdmin,
    betHistoryModel,
    CasinoBetHistory,
    TransactionHistory,
    viewerCode
  );
  if (!users.length) return { total: 0, hasOutstanding: false };

  let total = 0;
  let hasOutstanding = false;
  for (const user of users) {
    const id = user._id.toString();
    const expectedPL = expectedPLByUserId.get(id) ?? 0;
    if (Math.abs(expectedPL) > 0.01) {
      hasOutstanding = true;
    }
    total += roundMoney(expectedPL);
  }
  return { total: roundMoney(total), hasOutstanding };
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

/**
 * Fraction (0–1) of a downline end-user's client P/L that flows to this viewer
 * after all partnership splits in between. Multiply by clientPL to get the
 * viewer's user-perspective share of that user's P/L (sign preserved: + = user won).
 */
export function getViewerShareRatioForUser(viewer, user, accountByCode) {
  if (!viewer || !user || user.role !== 'user') return 0;
  const parentViewForUnitClient = getViewerShareOfUserClientPL(
    viewer.code,
    user,
    accountByCode,
    1
  );
  return -parentViewForUnitClient;
}

/** Viewer partnership % on an end-user row — matches root Client List My % (viewer keep, not agent row). */
export function getViewerPLSharePercentOnUser(viewer, endUser, accountByCode) {
  if (!viewer || !endUser || endUser.role !== 'user') return 0;
  return getAccountMyKeepPercent(viewer);
}

/** Scale one bet's client P/L to the viewer's partnership share (matches Userlist My %). */
export function scaleClientPLForViewer(
  viewer,
  endUser,
  clientPL,
  accountByCode
) {
  const parentPL = getViewerShareOfUserClientPL(
    viewer.code,
    endUser,
    accountByCode,
    clientPL
  );

  const ratio = getViewerShareRatioForUser(viewer, endUser, accountByCode);
  const sharePct = roundMoney(ratio * 100);

  return {
    sharePct,
    clientScaled: roundMoney(-parentPL),
    parentPL,
  };
}

/** Map: userId → viewer share ratio (0–1). Pre-computed for fast per-bet scaling. */
export function buildViewerShareRatioByUserId(viewer, endUsers, accountByCode) {
  const map = new Map();
  for (const user of endUsers) {
    if (user.role !== 'user') continue;
    map.set(
      user._id.toString(),
      getViewerShareRatioForUser(viewer, user, accountByCode)
    );
  }
  return map;
}

/** Ensure every downline row is in the invite-tree map (partnership chain lookups). */
export function mergeDownlineIntoAccountByCode(accountByCode, downlineRows) {
  for (const row of downlineRows || []) {
    if (row?.code) accountByCode.set(row.code, row);
  }
  return accountByCode;
}

/** Resolve end-user row for a settled bet (by userId then userName). */
export function resolveBetEndUser(bet, endUsers) {
  if (!bet) return null;
  const id = bet.userId ? String(bet.userId) : '';
  if (id) {
    const byId = endUsers.find(
      (u) => u.role === 'user' && u._id.toString() === id
    );
    if (byId) return byId;
  }
  const name = String(bet.userName || '').toLowerCase();
  if (!name) return null;
  return (
    endUsers.find(
      (u) => u.role === 'user' && String(u.userName || '').toLowerCase() === name
    ) || null
  );
}

/** Viewer's parent-view P/L share from one bet's client-side delta. */
export function getViewerParentPLFromClientDelta(
  viewer,
  endUser,
  clientPL,
  accountByCode
) {
  if (!viewer || !endUser || endUser.role !== 'user') return 0;
  return getViewerShareOfUserClientPL(
    viewer.code,
    endUser,
    accountByCode,
    clientPL
  );
}

/** Client-side P/L scaled to viewer's partnership share (sign matches client P/L). */
export function getViewerClientScaledPL(
  viewer,
  endUser,
  clientPL,
  accountByCode
) {
  return roundMoney(
    -getViewerParentPLFromClientDelta(
      viewer,
      endUser,
      clientPL,
      accountByCode
    )
  );
}

/**
 * Immediate upline's partnership % on this account's downline gross P/L
 * (parent keep − this account's downline keep), not the parent's global keep %.
 */
export function resolveUplineSharePercent(admin, plTotals = {}) {
  const explicit = Number(
    plTotals.uplineSharePercent ?? plTotals.uplineKeepPercent
  );
  if (Number.isFinite(explicit) && explicit > 0) {
    return roundMoney(explicit);
  }
  const parent = plTotals.uplineParent;
  if (admin && parent) {
    return getParentShareOnDownlineRow(admin, parent);
  }
  return 0;
}

/**
 * Upline partnership due from branch outstanding (after downline cash settlements).
 * Uses tillDownlinePL when provided; lifetime history alone must not keep Up Line open.
 */
export function computeUplineSharePL(admin, plTotals = {}) {
  const branchGross = roundMoney(plTotals.tillDownlinePLHistory ?? 0);
  const uplinePct = resolveUplineSharePercent(admin, plTotals);
  if (uplinePct <= 0 || Math.abs(branchGross) < 0.01) return 0;
  return roundMoney((branchGross * uplinePct) / 100);
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
  const weekDownlinePL = roundMoney(plTotals.weekDownlinePL ?? 0);
  const myPLTillDate = roundMoney(
    plTotals.myPLTillDate ?? plTotals.tillViewerPL ?? 0
  );
  const tillViewerOutstandingPL = roundMoney(
    plTotals.tillViewerOutstandingPL ?? plTotals.tillViewerPL ?? 0
  );
  const tillDownlinePL = roundMoney(plTotals.tillDownlinePL ?? 0);
  const tillDownlinePLHistory = roundMoney(
    plTotals.tillDownlinePLHistory ?? tillDownlinePL
  );
  const downlineClientPL = roundMoney(
    plTotals.downlineClientPL ?? -tillDownlinePL
  );

  const uplineSharePL = computeUplineSharePL(admin, {
    ...plTotals,
    tillDownlinePLHistory,
  });
  const otherAdminSharePL = roundMoney(
    tillDownlinePLHistory - myPLTillDate - uplineSharePL
  );

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
    currentWeekPL: roundMoney(uplineSharePL + downlineClientPL),
    currentWeekUplinePL: roundMoney(weekDownlinePL - roundMoney(uplineSharePL + downlineClientPL)),
    /** Lifetime betting P/L (bet history); cash settlement does not change this. */
    myPLTillDate,
    myPLTillDateTotal: tillDownlinePLHistory,
    /** Upline partnership share (bet history); downline cash settlement does not change this. */
    uplineDena: uplineSharePL,
    uplineSharePL,
    otherAdminSharePL,
    /** Viewer share of outstanding downline P/L (internal / legacy). */
    downlineDena: tillViewerOutstandingPL,
    downlineDenaGross: tillDownlinePL,
    /** Gross client P/L across all downline users (100% user view). */
    downlineClientPL,
    uplineTooltip:
      'Upline ka partnership share (bet history se) — downline cash settlement se yeh change nahi hota.',
    downlineTooltip:
      'Down Line: Direct downline accounts ka outstanding settlement balance (partnership share applied).',
    /** Client-view len-den: + client jeeta = dena, − client haara = lena. */
    downlineClientLenDena:
      downlineClientPL > 0.005
        ? 'dena'
        : downlineClientPL < -0.005
          ? 'lena'
          : 'clear',
    downlineLenDena:
      tillViewerOutstandingPL > 0.005
        ? 'lena'
        : tillViewerOutstandingPL < -0.005
          ? 'dena'
          : 'clear',
    uplineLenDena:
      uplineSharePL > 0.005
        ? 'dena'
        : uplineSharePL < -0.005
          ? 'lena'
          : 'clear',
    weekRange: plTotals.weekRange ?? getCurrentWeekRange(),
  };
}

/** Cash settlements logged on a user (Settlement: remarks). */
export async function getSettlementCashTotals(TransactionHistory, userId) {
  const id = String(userId);
  const agg = await TransactionHistory.aggregate([
    {
      $match: {
        userId: { $in: [id, userId] },
        remark: { $regex: /^Settlement:(?! branch)/ },
      },
    },
    {
      $group: {
        _id: null,
        withdrawl: { $sum: { $ifNull: ['$withdrawl', 0] } },
        deposite: { $sum: { $ifNull: ['$deposite', 0] } },
      },
    },
  ]);
  const row = agg[0] || {};
  return {
    withdrawl: roundMoney(row.withdrawl || 0),
    deposite: roundMoney(row.deposite || 0),
  };
}

/** Outstanding P/L after cash settlements: bet-history total minus withdrawals plus deposits. */
export function expectedBettingPLFromHistory(trueTotalPL, settlementCash) {
  const truePL = roundMoney(trueTotalPL);
  const cash = settlementCash || { withdrawl: 0, deposite: 0 };
  return roundMoney(truePL - (cash.withdrawl || 0) + (cash.deposite || 0));
}

/**
 * Upline bar (dena/lena): cash settlement on this account clears partnership due
 * (same idea as end-user outstanding: move balance toward zero).
 */
export function applySettlementCashToUplineShare(uplineSharePL, settlementCash) {
  const pl = roundMoney(uplineSharePL);
  const withdrawl = roundMoney(settlementCash?.withdrawl || 0);
  const deposite = roundMoney(settlementCash?.deposite || 0);

  if (pl > 0.005) {
    // Dena — owe upline: cash paid/settled reduces positive due
    return roundMoney(pl - deposite + withdrawl);
  }
  if (pl < -0.005) {
    // Lena — collect from upline: same rule as user P/L (deposite pulls negative toward 0)
    return expectedBettingPLFromHistory(pl, settlementCash);
  }
  return roundMoney(pl - withdrawl + deposite);
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

export function isDownlineClientPLCleared(downlineClientPL) {
  return Math.abs(roundMoney(downlineClientPL)) < 0.01;
}

export function isUplineSharePLCleared(uplineOutstanding) {
  return Math.abs(roundMoney(uplineOutstanding)) < 0.01;
}

export function isAccountLinesFullyCleared(hasDownlineOutstanding, uplineOutstanding) {
  return (
    !hasDownlineOutstanding &&
    isUplineSharePLCleared(uplineOutstanding)
  );
}

/**
 * Week / Current P&L on header:
 *   partnership share of bets in period
 *   + downline settlement cash in week
 *   − upline settlement cash on this account in week
 * When Up Line and Down Line are both clear → always 0 (matches header tooltips).
 */
export function resolveAccountSummaryWeekPL({
  weekViewerBettingPL = 0,
  rawWeekViewerPL,
  weekDownlineSettlementNet = 0,
  weekSelfSettlementCash = { withdrawl: 0, deposite: 0 },
  hasDownlineOutstanding,
  uplineOutstanding,
}) {
  if (
    hasDownlineOutstanding !== undefined &&
    uplineOutstanding !== undefined &&
    isAccountLinesFullyCleared(hasDownlineOutstanding, uplineOutstanding)
  ) {
    return 0;
  }

  const bettingPL = roundMoney(
    weekViewerBettingPL ?? rawWeekViewerPL ?? 0
  );
  const selfSettlementNet = getSelfWeekSettlementCashNet(weekSelfSettlementCash);
  return roundMoney(
    bettingPL + roundMoney(weekDownlineSettlementNet) - selfSettlementNet
  );
}
