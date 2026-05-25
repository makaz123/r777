import { describe, expect, test } from 'vitest';

import {
  BET_STATUS_LOSS,
  BET_STATUS_WIN,
  calculateWinCommission,
  clampDownlineSharingPercent,
  getAccountMyKeepPercent,
  getDownlineKeepPercentOnRow,
  getDownlineUplineBettingContribution,
  getMatchOddsCommissionAmount,
  getMatchOddsCommissionFromNetWin,
  getParentShareOnDownlineRow,
  getParentShareStoredOnDownline,
  getPartnershipUplineShare,
  getRemainingMySharePercent,
  getViewerMySharePercent,
  isMatchOddsBetRecord,
  isMatchOddsGameType,
  isSettledClientWinPL,
  parseCommissionPercent,
  resolveMatchOddsWinCommission,
  splitProfitLossByMyShare,
  toStoredDownlineKeepPercent,
} from '../utils/partnershipCommissionUtils.js';

describe('partnershipCommissionUtils', () => {
  test('isMatchOddsGameType matches match odds only', () => {
    expect(isMatchOddsGameType('Match Odds')).toBe(true);
    expect(isMatchOddsGameType('match odds')).toBe(true);
    expect(isMatchOddsGameType('MATCH_ODDS')).toBe(true);
    expect(isMatchOddsGameType('Bookmaker')).toBe(false);
    expect(isMatchOddsGameType('Casino')).toBe(false);
  });

  test('isMatchOddsBetRecord checks gameType and marketName', () => {
    expect(
      isMatchOddsBetRecord({ gameType: 'Soccer Game', marketName: 'MATCH_ODDS' })
    ).toBe(true);
    expect(
      isMatchOddsBetRecord({ gameType: 'fancy1', marketName: '1.3 over run SRH' })
    ).toBe(false);
  });

  test('commission from net win matches account statement gross-up', () => {
    expect(getMatchOddsCommissionFromNetWin(98, 2)).toBe(2);
    expect(getMatchOddsCommissionFromNetWin(90, 2)).toBe(1.84);
  });

  test('getMatchOddsCommissionAmount handles gross stored wins', () => {
    expect(getMatchOddsCommissionAmount(100, 2)).toBe(2.04);
  });

  test('match-odds commission is zero on losses even if P/L sign is wrong in status', () => {
    expect(isSettledClientWinPL(-100, BET_STATUS_WIN)).toBe(false);
    expect(isSettledClientWinPL(100, BET_STATUS_LOSS)).toBe(false);
    expect(getMatchOddsCommissionAmount(100, 2, BET_STATUS_LOSS)).toBe(0);
    expect(getMatchOddsCommissionAmount(-50, 2, BET_STATUS_WIN)).toBe(0);
    expect(
      resolveMatchOddsWinCommission(100, 2, BET_STATUS_LOSS).commission
    ).toBe(0);
  });

  test('calculateWinCommission deducts from gross win at settlement', () => {
    const { netProfit, commission } = calculateWinCommission(100, 2);
    expect(commission).toBe(2);
    expect(netProfit).toBe(98);
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

  test('stored partnership 15 = agent keeps 15%, master keeps 85%', () => {
    const master = { role: 'master', partnership: 100, invite: 'ROOT' };
    const agent = { role: 'agent', partnership: 15, invite: master.code };

    expect(getDownlineKeepPercentOnRow(agent, master)).toBe(15);
    expect(getParentShareOnDownlineRow(agent, master)).toBe(85);
    expect(getAccountMyKeepPercent(agent)).toBe(15);

    const gross = 627.1;
    const { myPL } = splitProfitLossByMyShare(gross, 15);
    expect(myPL).toBe(94.07);
  });

  test('legacy parent-take 85 on row converts to 15% downline keep', () => {
    const master = { role: 'master', partnership: 100 };
    const agent = { role: 'agent', partnership: 85 };

    expect(getDownlineKeepPercentOnRow(agent, master)).toBe(15);
    expect(getParentShareOnDownlineRow(agent, master)).toBe(85);
    expect(toStoredDownlineKeepPercent(85, master)).toBe(15);
  });

  test('InsertAgent parent-share payload stores as downline keep', () => {
    const master = { role: 'master', partnership: 100 };
    expect(toStoredDownlineKeepPercent(85, master)).toBe(15);
    expect(toStoredDownlineKeepPercent(15, master)).toBe(15);
  });
});
