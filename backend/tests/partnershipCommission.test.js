import { describe, expect, test } from 'vitest';

import {
  calculateWinCommission,
  getDownlineUplineBettingContribution,
  getPartnershipUplineShare,
  isMatchOddsGameType,
  parseCommissionPercent,
} from '../utils/partnershipCommissionUtils.js';

describe('partnershipCommissionUtils', () => {
  test('isMatchOddsGameType matches match odds only', () => {
    expect(isMatchOddsGameType('Match Odds')).toBe(true);
    expect(isMatchOddsGameType('match odds')).toBe(true);
    expect(isMatchOddsGameType('Bookmaker')).toBe(false);
    expect(isMatchOddsGameType('Casino')).toBe(false);
  });

  test('partnership upline share applies to full P/L', () => {
    expect(getPartnershipUplineShare(1000, 60)).toBe(600);
    expect(getPartnershipUplineShare(-500, 50)).toBe(-250);
    expect(getPartnershipUplineShare(100, 0)).toBe(0);
  });

  test('end user contributes full downline P/L to parent', () => {
    expect(
      getDownlineUplineBettingContribution({
        totalPL: 800,
        partnershipPercent: 60,
        isEndUser: true,
      })
    ).toBe(800);
  });

  test('agent contributes partnership share of total P/L (all markets)', () => {
    expect(
      getDownlineUplineBettingContribution({
        totalPL: 1000,
        partnershipPercent: 60,
        isEndUser: false,
      })
    ).toBe(600);
  });

  test('commission on winning is match-odds profit only', () => {
    expect(parseCommissionPercent('2')).toBe(2);
    const { netProfit, commission } = calculateWinCommission(100, 2);
    expect(commission).toBe(2);
    expect(netProfit).toBe(98);
    expect(calculateWinCommission(-50, 2).commission).toBe(0);
  });
});
