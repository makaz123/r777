import { describe, expect, it } from 'vitest';
import {
  applyDebtorSettlementNetAddback,
  buildAccountSummary,
  expectedBettingPLFromHistory,
} from '../utils/accountSummaryUtils.js';
import { getViewerShareOfUserClientPL } from '../utils/partnershipCommissionUtils.js';

const viewer = { code: 'AGENT1', role: 'agent', partnership: 100 };
const accountByCode = new Map([
  [
    'AGENT1',
  viewer,
  ],
]);

const makeUser = (id, clientPL) => ({
  _id: id,
  userName: id,
  role: 'user',
  invite: 'AGENT1',
  bettingProfitLoss: clientPL,
});

describe('expectedBettingPLFromHistory', () => {
  it('reduces creditor outstanding when winnings are paid (withdrawl)', () => {
    expect(expectedBettingPLFromHistory(100, { withdrawl: 40, deposite: 0 })).toBe(
      60
    );
  });

  it('reduces debtor outstanding when loss is collected (deposite)', () => {
    expect(
      expectedBettingPLFromHistory(-100, { withdrawl: 0, deposite: 40 })
    ).toBe(-60);
  });
});

describe('applyDebtorSettlementNetAddback', () => {
  it('single debtor fully settled → no addback, outstanding clears to 0', () => {
    const users = [makeUser('u1', 0)];
    const history = new Map([['u1', -100]]);
    const expected = new Map([['u1', 0]]);

    const base = computeShare(users, expected);
    expect(base).toBe(0);
    expect(
      applyDebtorSettlementNetAddback(
        viewer,
        users,
        history,
        expected,
        accountByCode,
        base
      )
    ).toBe(0);
  });

  it('debtor settled while creditor still open → addback keeps net dena unchanged', () => {
    const users = [makeUser('winner', 400), makeUser('loser', 0)];
    const history = new Map([
      ['winner', 400],
      ['loser', -100],
    ]);
    const expected = new Map([
      ['winner', 400],
      ['loser', 0],
    ]);

    const base = computeShare(users, expected);
    expect(base).toBe(-400);

    const fixed = applyDebtorSettlementNetAddback(
      viewer,
      users,
      history,
      expected,
      accountByCode,
      base
    );
    expect(fixed).toBe(-300);
  });

  it('partial creditor settlement needs no debtor addback', () => {
    const users = [makeUser('winner', 300), makeUser('loser', -100)];
    const history = new Map([
      ['winner', 400],
      ['loser', -100],
    ]);
    const expected = new Map([
      ['winner', 300],
      ['loser', -100],
    ]);

    const base = computeShare(users, expected);
    expect(base).toBe(-200);
    expect(
      applyDebtorSettlementNetAddback(
        viewer,
        users,
        history,
        expected,
        accountByCode,
        base
      )
    ).toBe(-200);
  });
});

describe('buildAccountSummary upline vs downline settlement', () => {
  const admin = { role: 'agent', userName: 'agent1', partnership: 15 };

  it('upline share uses bet history; downline client PL uses settlement-adjusted values', () => {
    const summary = buildAccountSummary(admin, {
      myPLTillDate: 150,
      tillDownlinePLHistory: 1000,
      tillDownlinePL: 600,
      tillViewerOutstandingPL: 90,
      downlineClientPL: -400,
    });

    expect(summary.uplineSharePL).toBe(850);
    expect(summary.downlineClientPL).toBe(-400);
  });

  it('downline cash settlement does not change upline share', () => {
    const before = buildAccountSummary(admin, {
      myPLTillDate: 150,
      tillDownlinePLHistory: 1000,
      tillDownlinePL: 1000,
      tillViewerOutstandingPL: 150,
      downlineClientPL: -1000,
    });
    const after = buildAccountSummary(admin, {
      myPLTillDate: 150,
      tillDownlinePLHistory: 1000,
      tillDownlinePL: 500,
      tillViewerOutstandingPL: 75,
      downlineClientPL: -500,
    });

    expect(after.uplineSharePL).toBe(before.uplineSharePL);
    expect(after.downlineClientPL).not.toBe(before.downlineClientPL);
  });
});

function computeShare(users, plByUserId) {
  let total = 0;
  for (const user of users) {
    total += getViewerShareOfUserClientPL(
      viewer.code,
      user,
      accountByCode,
      plByUserId.get(user._id.toString()) ?? 0
    );
  }
  return total;
}
