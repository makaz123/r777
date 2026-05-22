/**
 * Net player P&L for one casino round (stake vs return).
 * Do not use `change` alone — win callbacks may store payout only, not net.
 */
export function getCasinoNetPL(bet) {
  return (Number(bet?.win_amount) || 0) - (Number(bet?.bet_amount) || 0);
}

/** Round had a real bet or settlement (exclude empty/provider noise rows). */
export function hasCasinoRoundActivity(bet) {
  return (
    (Number(bet?.bet_amount) || 0) > 0 || (Number(bet?.win_amount) || 0) > 0
  );
}
