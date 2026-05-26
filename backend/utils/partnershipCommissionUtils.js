/**
 * Partnership: upline share applies to ALL settled P/L (sports, casino, etc.).
 * Commission on winning: match odds only (user commition % → agent commissionEarned).
 *
 * Stored on each agent row: `partnership` = % that account KEEPS from its downline
 * (e.g. 15 means agent keeps 15%, parent keeps 85%). Legacy rows may still store
 * parent take (e.g. 85); use normalizeStoredDownlineKeepPercent() to read either.
 */

const MATCH_ODDS_REGEX = /^match\s*odds$/i;

export const roundMoney = (value) =>
  Math.round((Number(value) || 0) * 100) / 100;

const normalizeMatchOddsLabel = (value) =>
  String(value || '')
    .trim()
    .replace(/_/g, ' ');

export const isMatchOddsGameType = (gameType) =>
  MATCH_ODDS_REGEX.test(normalizeMatchOddsLabel(gameType));

const MATCH_ODDS_LOOSE_REGEX = /match\s*odds/i;

const fieldIsMatchOdds = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return (
    isMatchOddsGameType(raw) ||
    MATCH_ODDS_LOOSE_REGEX.test(raw.replace(/_/g, ' '))
  );
};

/** Match odds win on a settled bet/ history row (gameType or marketName). */
export const isMatchOddsBetRecord = (bet) => {
  if (!bet) return false;
  return [bet.gameType, bet.marketName, bet.market_type, bet.fancyType].some(
    fieldIsMatchOdds
  );
};

export const getMatchOddsCommissionFromNetWin = (
  netProfit,
  commissionPercent
) => {
  const net = Number(netProfit) || 0;
  const rate = Number(commissionPercent) || 0;
  if (net <= 0 || rate <= 0 || rate >= 100) return 0;
  const gross = roundMoney(net / (1 - rate / 100));
  return roundMoney(gross - net);
};

export const parseCommissionPercent = (commition) => {
  const raw = String(commition ?? '')
    .trim()
    .replace('%', '');
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 100);
};

export const parsePartnershipPercent = (partnership) => {
  const raw = String(partnership ?? '')
    .trim()
    .replace('%', '');
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 100);
};

export const getViewerMySharePercent = (partnership) =>
  roundMoney(Math.max(0, parsePartnershipPercent(partnership)));

export const isPartnershipRootAccount = (admin) =>
  !admin?.invite ||
  admin?.role === 'supperadmin' ||
  admin?.role === 'superadmin';

/**
 * Downline keep % stored on row (15 = downline keeps 15%).
 * Legacy: value may be parent take (85) — detected when stored > half of parent's keep.
 */
export const normalizeStoredDownlineKeepPercent = (downline, parent) => {
  const stored = parsePartnershipPercent(downline?.partnership);
  if (!parent) {
    if (stored >= 100) return 100;
    if (stored > 50 && stored < 100) {
      return roundMoney(100 - stored);
    }
    return roundMoney(stored);
  }
  const parentKeep = getAccountMyKeepPercent(parent);
  if (stored > parentKeep / 2) {
    return roundMoney(Math.max(0, parentKeep - stored));
  }
  return roundMoney(Math.min(stored, parentKeep));
};

/** What this account keeps from its downline P/L. */
export const getAccountMyKeepPercent = (admin) => {
  if (isPartnershipRootAccount(admin)) {
    const p = parsePartnershipPercent(admin?.partnership);
    return roundMoney(p > 0 ? p : 100);
  }
  const stored = parsePartnershipPercent(admin?.partnership);
  if (stored >= 100) return 100;
  // Legacy rows stored parent take (e.g. 85) instead of downline keep (15).
  if (stored > 50 && stored < 100) {
    return roundMoney(100 - stored);
  }
  return roundMoney(stored);
};

export const getDownlineKeepPercentOnRow = (downline, parent) =>
  normalizeStoredDownlineKeepPercent(downline, parent);

/** Parent's take from this downline row = parent keep − downline keep. */
export const getParentShareOnDownlineRow = (downline, parent) => {
  const parentKeep = parent ? getAccountMyKeepPercent(parent) : 100;
  const downKeep = getDownlineKeepPercentOnRow(downline, parent);
  return roundMoney(Math.max(0, parentKeep - downKeep));
};

/** Convert UI/body value to downline keep for storage (accepts keep or legacy parent-take). */
export const toStoredDownlineKeepPercent = (rawValue, parent) => {
  const stored = parsePartnershipPercent(rawValue);
  const parentKeep = parent ? getAccountMyKeepPercent(parent) : 100;
  if (stored > parentKeep / 2) {
    return roundMoney(Math.max(0, parentKeep - stored));
  }
  return roundMoney(Math.min(stored, parentKeep));
};

const applyParentTakeFromChild = (parentViewPL, child, accountByCode) => {
  if (!child || child.role === 'user') return roundMoney(parentViewPL);
  const parent = accountByCode?.get(child.invite);
  const parentTake = getParentShareOnDownlineRow(child, parent);
  if (parentTake <= 0) return roundMoney(parentViewPL);
  return splitProfitLossByMyShare(parentViewPL, parentTake).myPL;
};

export const getViewerShareOfUserClientPL = (
  viewerCode,
  user,
  accountByCode,
  clientPL
) => {
  if (!viewerCode || !user || user.role !== 'user') return 0;

  let parentViewPL = roundMoney(-(Number(clientPL) || 0));
  if (parentViewPL === 0) return 0;

  let node = user;
  let childOfViewer = null;

  while (node?.invite && node.invite !== viewerCode) {
    const parent = accountByCode.get(node.invite);
    if (!parent) return 0;
    node = parent;
  }

  if (node && node.invite === viewerCode) {
    childOfViewer = node;
  } else if (node && node.code === viewerCode) {
    // viewer is the user themselves (rare, but theoretically possible)
    return parentViewPL;
  } else {
    return 0; // Not in upline
  }

  const viewer = accountByCode.get(viewerCode);
  const parentTake = getParentShareOnDownlineRow(childOfViewer, viewer);
  return splitProfitLossByMyShare(parentViewPL, parentTake).myPL;
};

export const getViewerReceivedFromDownlineOfUserClientPL = (
  viewerCode,
  user,
  accountByCode,
  clientPL
) => {
  if (!viewerCode || !user || user.role !== 'user') return 0;

  let parentViewPL = roundMoney(-(Number(clientPL) || 0));
  if (parentViewPL === 0) return 0;

  let node = user;
  let childOfViewer = null;

  while (node?.invite && node.invite !== viewerCode) {
    const parent = accountByCode.get(node.invite);
    if (!parent) return 0;
    node = parent;
  }

  if (node && node.invite === viewerCode) {
    childOfViewer = node;
  } else {
    return 0;
  }

  const viewer = accountByCode.get(viewerCode);
  const downlineKeep = getDownlineKeepPercentOnRow(childOfViewer, viewer);
  
  // What the viewer receives is the total parentViewPL MINUS what the downlines took.
  // Wait, if downlineKeep is the absolute percentage that the downline keeps,
  // then the remainder (100 - downlineKeep) flows UP to the viewer.
  // So the viewer receives (100 - downlineKeep)% of parentViewPL.
  // But wait, getParentShareOnDownlineRow already handles `parentKeep - downKeep`.
  // What flows UP from the child to the viewer is everything NOT kept by the child.
  // The amount NOT kept by the child is parentViewPL * (100 - downlineKeep)/100.
  // Because downlineKeep is an absolute percentage.
  return splitProfitLossByMyShare(parentViewPL, roundMoney(100 - downlineKeep)).myPL;
};

export const clampDownlineSharingPercent = (raw, maxMyShare) => {
  const max = Number(maxMyShare) || 0;
  return roundMoney(Math.min(parsePartnershipPercent(raw), max));
};

export const getRemainingMySharePercent = (parentMyShare, downlineSharing) => {
  const parent = Number(parentMyShare) || 0;
  const down = clampDownlineSharingPercent(downlineSharing, parent);
  return roundMoney(Math.max(0, parent - down));
};

/** Value for API from InsertAgent: still parent-share; convert with toStoredDownlineKeepPercent on save. */
export const getParentShareStoredOnDownline = (
  parentMyShare,
  downlineSharing
) => getRemainingMySharePercent(parentMyShare, downlineSharing);

export const calculateWinCommission = (winProfit, commissionPercent) => {
  const profit = Number(winProfit) || 0;
  const rate = Number(commissionPercent) || 0;
  if (profit <= 0 || rate <= 0) {
    return { netProfit: roundMoney(profit), commission: 0 };
  }
  const commission = roundMoney((profit * rate) / 100);
  const netProfit = roundMoney(profit - commission);
  return { netProfit, commission };
};

export const getMatchOddsCommissionAmount = (
  profitLossChange,
  commissionPercent
) => {
  const pl = Number(profitLossChange) || 0;
  const rate = Number(commissionPercent) || 0;
  if (pl <= 0 || rate <= 0) return 0;
  const fromNet = getMatchOddsCommissionFromNetWin(pl, rate);
  const fromGross = calculateWinCommission(pl, rate).commission;
  return roundMoney(Math.max(fromNet, fromGross));
};

export const getPartnershipUplineShare = (totalPL, partnershipPercent) => {
  const pl = Number(totalPL) || 0;
  const pct = Number(partnershipPercent) || 0;
  if (pl === 0 || pct <= 0) return 0;
  if (pct >= 100) return roundMoney(pl);
  return roundMoney((pl * pct) / 100);
};

export const splitProfitLossByMyShare = (totalPL, mySharePercent) => {
  const pl = Number(totalPL) || 0;
  const myPct = Number(mySharePercent) || 0;
  if (pl === 0 || myPct <= 0) {
    return { myPL: 0, uplinePL: roundMoney(pl), totalPL: roundMoney(pl) };
  }
  if (myPct >= 100) {
    return { myPL: roundMoney(pl), uplinePL: 0, totalPL: roundMoney(pl) };
  }
  const myPL = roundMoney((pl * myPct) / 100);
  const uplinePL = roundMoney(pl - myPL);
  return { myPL, uplinePL, totalPL: roundMoney(pl) };
};

export const getDownlineUplineBettingContribution = ({
  totalPL,
  partnershipPercent,
  isEndUser,
}) => {
  const total = Number(totalPL) || 0;
  if (isEndUser) {
    return splitProfitLossByMyShare(total, partnershipPercent).myPL;
  }
  return getPartnershipUplineShare(total, partnershipPercent);
};

export const adjustUserUpdatesForCommission = (userUpdates, commission) => {
  if (!userUpdates || commission <= 0) return userUpdates;
  return {
    balanceChange: roundMoney(userUpdates.balanceChange - commission),
    avBalanceChange: roundMoney(userUpdates.avBalanceChange - commission),
    profitLossChange: roundMoney(userUpdates.profitLossChange - commission),
  };
};

export const adjustHistoryProfitLossForCommission = (
  profitLossChange,
  commission
) => {
  if (commission <= 0) return profitLossChange;
  return roundMoney(profitLossChange - commission);
};

export const aggregateSportsBetPLForUserIds = async (
  betHistoryModel,
  userIds
) => {
  if (!userIds?.length) return 0;
  const ids = userIds.map((id) => id.toString());
  const plResult = await betHistoryModel.aggregate([
    {
      $match: {
        userId: { $in: ids },
        status: { $in: [1, 2] },
      },
    },
    {
      $group: {
        _id: null,
        totalPL: { $sum: '$profitLossChange' },
      },
    },
  ]);
  return plResult.length > 0 ? roundMoney(plResult[0].totalPL) : 0;
};
