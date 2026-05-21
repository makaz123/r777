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

/** Partnership % on downline agent = upline's share of total downline P/L. */
export const getPartnershipUplineShare = (totalPL, partnershipPercent) => {
  const pl = Number(totalPL) || 0;
  const pct = Number(partnershipPercent) || 0;
  if (pl === 0 || pct <= 0) return 0;
  if (pct >= 100) return roundMoney(pl);
  return roundMoney((pl * pct) / 100);
};

/** How much of a downline's P/L counts toward this admin's upline totals. */
export const getDownlineUplineBettingContribution = ({
  totalPL,
  partnershipPercent,
  isEndUser,
}) => {
  const total = Number(totalPL) || 0;
  if (isEndUser) return roundMoney(total);
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
