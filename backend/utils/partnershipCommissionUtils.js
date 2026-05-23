/**
 * Partnership: upline share applies to ALL settled P/L (sports, casino, etc.).
 * Commission on winning: match odds only (user commition % → agent commissionEarned).
 */

const MATCH_ODDS_REGEX = /^match\s*odds$/i;

export const roundMoney = (value) =>
  Math.round((Number(value) || 0) * 100) / 100;

export const isMatchOddsGameType = (gameType) =>
  MATCH_ODDS_REGEX.test(String(gameType || '').trim());

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

/** Viewer's "my share" cap when assigning partnership to a new downline agent. */
export const getViewerMySharePercent = (partnership) =>
  roundMoney(Math.max(0, parsePartnershipPercent(partnership)));

export const isPartnershipRootAccount = (admin) =>
  !admin?.invite ||
  admin?.role === 'supperadmin' ||
  admin?.role === 'superadmin';

/**
 * What this account keeps from its downline P/L.
 * On agent rows, `partnership` stores the parent's take (e.g. 85 when 15% was given to agent).
 */
export const getAccountMyKeepPercent = (admin) => {
  if (isPartnershipRootAccount(admin)) {
    const p = parsePartnershipPercent(admin?.partnership);
    return roundMoney(p > 0 ? p : 100);
  }
  return roundMoney(
    Math.max(0, 100 - parsePartnershipPercent(admin?.partnership))
  );
};

/** Parent's take stored on a downline row (used when rolling up to that parent). */
export const getParentShareOnDownlineRow = (downline) =>
  parsePartnershipPercent(downline?.partnership);

const applyParentTakeFromChild = (parentViewPL, child) => {
  if (!child || child.role === 'user') return roundMoney(parentViewPL);
  const parentTake = getParentShareOnDownlineRow(child);
  if (parentTake <= 0) return roundMoney(parentViewPL);
  return splitProfitLossByMyShare(parentViewPL, parentTake).myPL;
};

/**
 * Viewer's share of one end-user's client-side P/L (positive = user profit).
 * Walks the invite chain; partnership on each agent row = direct parent's take.
 */
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
  while (node?.invite && node.invite !== viewerCode) {
    parentViewPL = applyParentTakeFromChild(parentViewPL, node);
    const parent = accountByCode.get(node.invite);
    if (!parent) return 0;
    node = parent;
  }

  if (!node) return 0;

  if (node.role === 'user' && node.invite === viewerCode) {
    const viewer = accountByCode.get(viewerCode);
    const myKeep = viewer ? getAccountMyKeepPercent(viewer) : 100;
    return splitProfitLossByMyShare(parentViewPL, myKeep).myPL;
  }

  if (node.invite === viewerCode) {
    return applyParentTakeFromChild(parentViewPL, node);
  }

  if (node.code === viewerCode) {
    return parentViewPL;
  }

  return 0;
};

/**
 * What the viewer RECEIVES from their direct downlines (before viewer applies their own myKeep).
 */
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
  while (node?.invite && node.invite !== viewerCode) {
    parentViewPL = applyParentTakeFromChild(parentViewPL, node);
    const parent = accountByCode.get(node.invite);
    if (!parent) return 0;
    node = parent;
  }

  // If the node is directly under the viewer, the parentViewPL at this point
  // is exactly what this branch passes up to the viewer.
  if (node && node.invite === viewerCode) {
    return parentViewPL;
  }

  return 0;
};

/** Downline % taken from the viewer's my-share pool (capped at maxMyShare). */
export const clampDownlineSharingPercent = (raw, maxMyShare) => {
  const max = Number(maxMyShare) || 0;
  return roundMoney(Math.min(parsePartnershipPercent(raw), max));
};

/** Remaining my share after allocating downlineSharing from the viewer pool. */
export const getRemainingMySharePercent = (parentMyShare, downlineSharing) => {
  const parent = Number(parentMyShare) || 0;
  const down = clampDownlineSharingPercent(downlineSharing, parent);
  return roundMoney(Math.max(0, parent - down));
};

/**
 * Value stored on a new agent row: parent's share from that downline's P/L.
 * UI "downline sharing" = % given from the parent's my-share pool.
 */
export const getParentShareStoredOnDownline = (
  parentMyShare,
  downlineSharing
) => getRemainingMySharePercent(parentMyShare, downlineSharing);

/** Commission is taken from net win profit (match odds only). */
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

/** Parent's share of downline P/L when partnership is stored on the agent row. */
export const getPartnershipUplineShare = (totalPL, partnershipPercent) => {
  const pl = Number(totalPL) || 0;
  const pct = Number(partnershipPercent) || 0;
  if (pl === 0 || pct <= 0) return 0;
  if (pct >= 100) return roundMoney(pl);
  return roundMoney((pl * pct) / 100);
};

/**
 * Split downline P/L by your partnership (my share %).
 * Example: user P/L +100, my share 20% → myPL +20, uplinePL +80
 */
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

/** How much of a downline's P/L counts toward this admin's bettingProfitLoss. */
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

/** Sum settled P/L from bet history for end-users (sports). */
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
