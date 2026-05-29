import { toast } from 'react-toastify';

const fmt = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0.00';
  return Math.abs(x).toFixed(2);
};

const title = (eventName, marketName) => {
  const ev = eventName?.trim() || 'Event';
  const mkt = marketName?.trim() || 'Market';
  return `${mkt} — ${ev}`;
};

/**
 * @param {object} data - WebSocket payload type bet_settlement
 */
export function handleBetSettlementWebSocketPayload(data) {
  if (!data || data.type !== 'bet_settlement') return;

  const {
    role,
    isVoid,
    profitLossChange,
    eventName,
    marketName,
    teamName,
    downlineUserName,
    partnershipPercent,
  } = data;

  const head = title(eventName, marketName);
  const runner = teamName ? ` (${teamName})` : '';

  if (role === 'bettor') {
    if (isVoid) {
      toast.info(`Bet voided — ${head}${runner}`);
      return;
    }
    const pl = Number(profitLossChange) || 0;
    if (pl > 0) {
      toast.success(
        `🎉 Congratulations! You won ${fmt(pl)} on ${head}${runner}`
      );
    } else if (pl < 0) {
      toast.error(`😔 Result: You lost ${fmt(pl)} on ${head}${runner}`);
    } else {
      toast.info(`Settled — ${head}${runner} (no P/L change)`);
    }
    return;
  }

  if (role === 'upline') {
    const impact = Number(profitLossChange) || 0;
    const pct =
      partnershipPercent != null
        ? ` (downline keep ${partnershipPercent}%)`
        : '';
    const who = downlineUserName ? `${downlineUserName}: ` : '';
    if (impact > 0) {
      toast.success(
        `Settlement — ${who}${head}${runner}${pct}. Your book: +${fmt(impact)}`
      );
    } else if (impact < 0) {
      toast.warning(
        `Settlement — ${who}${head}${runner}${pct}. Your book: −${fmt(impact)}`
      );
    } else {
      toast.info(`Settlement — ${who}${head}${runner}${pct} (no book impact)`);
    }
  }
}
