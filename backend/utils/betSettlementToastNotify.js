/**
 * Push WebSocket payloads so client + dashboard can toast on bet settlement.
 * Upline amounts use partnership split (splitProfitLossByMyShare) cascaded up the chain.
 */

import SubAdmin from '../models/subAdminModel.js';
import {
  getDownlineKeepPercentOnRow,
  roundMoney,
  splitProfitLossByMyShare,
} from './partnershipCommissionUtils.js';
import { sendBetSettlementNotification } from '../socket/bettingSocket.js';

const MAX_UPLINE_DEPTH = 16;

function buildBasePayload(bet) {
  return {
    betId: String(bet._id),
    eventName: bet.eventName || '',
    marketName: bet.marketName || bet.gameType || 'Market',
    gameType: bet.gameType || '',
    teamName: bet.teamName || '',
    gameName: bet.gameName || '',
  };
}

/**
 * @param {object} params
 * @param {object} params.bet - bet doc with status, event fields
 * @param {object} params.bettorUser - SubAdmin (lean or doc) with _id, invite, userName, partnership, role
 * @param {number} params.bplChange - bettingProfitLoss delta applied to bettor (after commission / history sum)
 */
export async function notifyBetSettlementAfterSave({
  bet,
  bettorUser,
  bplChange = 0,
}) {
  try {
    if (!bettorUser?._id || !bet) return;

    const status = Number(bet.status);
    const isVoid = status === 3;
    const pl = isVoid ? 0 : roundMoney(Number(bplChange) || 0);
    const base = buildBasePayload(bet);

    sendBetSettlementNotification(String(bettorUser._id), {
      type: 'bet_settlement',
      role: 'bettor',
      ...base,
      status,
      profitLossChange: pl,
      isVoid,
      downlineUserName: bettorUser.userName || '',
    });

    if (isVoid || pl === 0) return;

    let child =
      typeof bettorUser.toObject === 'function'
        ? bettorUser.toObject()
        : { ...bettorUser };
    let flow = pl;
    let depth = 0;

    while (child?.invite && depth < MAX_UPLINE_DEPTH) {
      const parent = await SubAdmin.findOne({
        code: child.invite,
        status: { $ne: 'delete' },
      })
        .select('_id invite code userName partnership role')
        .lean();

      if (!parent) break;

      const downKeep = getDownlineKeepPercentOnRow(child, parent);
      const { uplinePL } = splitProfitLossByMyShare(flow, downKeep);
      const viewerImpact = roundMoney(-uplinePL);

      sendBetSettlementNotification(String(parent._id), {
        type: 'bet_settlement',
        role: 'upline',
        ...base,
        status,
        profitLossChange: viewerImpact,
        partnershipPercent: downKeep,
        downlineUserName: child.userName || '',
        isVoid: false,
      });

      flow = uplinePL;
      child = parent;
      depth += 1;
    }
  } catch (err) {
    console.error('[betSettlementToastNotify]', err.message);
  }
}
