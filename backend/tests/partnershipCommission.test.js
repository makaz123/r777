import { describe, expect, test } from 'vitest';

import {
  calculateWinCommission,
  clampDownlineSharingPercent,
  getDownlineUplineBettingContribution,
  getParentShareStoredOnDownline,
  getPartnershipUplineShare,
  getRemainingMySharePercent,
  getViewerMySharePercent,
  isMatchOddsGameType,
  parseCommissionPercent,
  splitProfitLossByMyShare,
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

  test('end user contributes my-share portion only to parent admin', () => {
    expect(
      getDownlineUplineBettingContribution({
        totalPL: 1000,
        partnershipPercent: 60,
        isEndUser: true,
      })
    ).toBe(600);
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

  test('split P/L: user wins 100, my share 20% → my 20 upline 80', () => {
    const { myPL, uplinePL, totalPL } = splitProfitLossByMyShare(100, 20);
    expect(totalPL).toBe(100);
    expect(myPL).toBe(20);
    expect(uplinePL).toBe(80);
  });

  test('end-user downline contributes only my share to admin totals', () => {
    expect(
      getDownlineUplineBettingContribution({
        totalPL: 100,
        partnershipPercent: 20,
        isEndUser: true,
      })
    ).toBe(20);
  });

  test('downline sharing clamps and reduces my share live', () => {
    expect(getViewerMySharePercent('65%')).toBe(65);
    expect(clampDownlineSharingPercent('80', 65)).toBe(65);
    expect(getRemainingMySharePercent(65, 20)).toBe(45);
    expect(getParentShareStoredOnDownline(65, 20)).toBe(45);
  });

  test('commission on winning is match-odds profit only', () => {
    expect(parseCommissionPercent('2')).toBe(2);
    const { netProfit, commission } = calculateWinCommission(100, 2);
    expect(commission).toBe(2);
    expect(netProfit).toBe(98);
    expect(calculateWinCommission(-50, 2).commission).toBe(0);
  });
});
