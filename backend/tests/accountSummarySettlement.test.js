import { describe, expect, it } from 'vitest';
import {
  applyDebtorSettlementNetAddback,
  buildAccountSummary,
  buildViewerShareRatioByUserId,
  expectedBettingPLFromHistory,
  getViewerPLSharePercentOnUser,
  getViewerShareRatioForUser,
  getWeekPLRangeForAdmin,
  scaleClientPLForViewer,
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
    const parent = { code: 'SUPER', role: 'supperadmin', partnership: 100 };
    const summary = buildAccountSummary(admin, {
      myPLTillDate: 150,
      tillDownlinePLHistory: 1000,
      tillDownlinePL: 600,
      tillViewerOutstandingPL: 90,
      downlineClientPL: -400,
      uplineSharePercent: 85,
      uplineParent: parent,
    });

    expect(summary.uplineSharePL).toBe(850);
    expect(summary.downlineClientPL).toBe(-400);
  });

  it('upline share percent is parent take on this row, not parent global keep', () => {
    const parent = { code: 'SUPER', role: 'supperadmin', partnership: 100 };
    const summary = buildAccountSummary(admin, {
      myPLTillDate: 150,
      tillDownlinePLHistory: 1000,
      uplineParent: parent,
    });
    expect(summary.uplineSharePL).toBe(850);
    expect(summary.otherAdminSharePL).toBe(0);
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

describe('getViewerShareRatioForUser (dashboard scaling)', () => {
  it('direct user under viewer keeps 100% when viewer is partnership root', () => {
    const root = { code: 'ROOT', role: 'supperadmin', partnership: 100 };
    const map = new Map([['ROOT', root]]);
    const user = {
      _id: 'u1',
      userName: 'u1',
      role: 'user',
      invite: 'ROOT',
    };
    expect(getViewerShareRatioForUser(root, user, map)).toBe(1);
  });

  it('end user under an agent (10% keep): root viewer gets 90% share', () => {
    const root = { code: 'ROOT', role: 'supperadmin', partnership: 100 };
    const agent = {
      code: 'AGENT',
      role: 'agent',
      partnership: 10,
      invite: 'ROOT',
    };
    const map = new Map([
      ['ROOT', root],
      ['AGENT', agent],
    ]);
    const user = {
      _id: 'u1',
      userName: 'u1',
      role: 'user',
      invite: 'AGENT',
    };
    expect(getViewerShareRatioForUser(root, user, map)).toBeCloseTo(0.9, 4);
  });

  it('skips non-user accounts', () => {
    const root = { code: 'ROOT', role: 'supperadmin', partnership: 100 };
    const map = new Map([['ROOT', root]]);
    expect(
      getViewerShareRatioForUser(root, { role: 'agent', code: 'A' }, map)
    ).toBe(0);
  });

  it('buildViewerShareRatioByUserId builds map keyed by _id strings', () => {
    const root = { code: 'ROOT', role: 'supperadmin', partnership: 100 };
    const agent = {
      code: 'AGENT',
      role: 'agent',
      partnership: 10,
      invite: 'ROOT',
    };
    const map = new Map([
      ['ROOT', root],
      ['AGENT', agent],
    ]);
    const users = [
      { _id: 'u1', userName: 'u1', role: 'user', invite: 'ROOT' },
      { _id: 'u2', userName: 'u2', role: 'user', invite: 'AGENT' },
      { _id: 'a1', userName: 'a1', role: 'agent', invite: 'ROOT' },
    ];
    const ratios = buildViewerShareRatioByUserId(root, users, map);

    expect(ratios.get('u1')).toBeCloseTo(1, 4);
    expect(ratios.get('u2')).toBeCloseTo(0.9, 4);
    expect(ratios.has('a1')).toBe(false);
  });
});

describe('getViewerPLSharePercentOnUser (dashboard root Client List My %)', () => {
  it('superadmin viewer: all end-users use viewer keep (100%)', () => {
    const root = { code: 'ROOT', role: 'supperadmin', partnership: 100 };
    const map = new Map([['ROOT', root]]);
    const user = {
      _id: 'u1',
      role: 'user',
      invite: 'ROOT',
    };
    expect(getViewerPLSharePercentOnUser(root, user, map)).toBe(100);
  });

  it('user under agent still uses viewer keep at root dashboard (100% for superadmin)', () => {
    const root = { code: 'ROOT', role: 'supperadmin', partnership: 100 };
    const agent = {
      code: 'AGENT',
      role: 'agent',
      partnership: 10,
      invite: 'ROOT',
    };
    const map = new Map([
      ['ROOT', root],
      ['AGENT', agent],
    ]);
    const user = { _id: 'u1', role: 'user', invite: 'AGENT' };
    expect(getViewerPLSharePercentOnUser(root, user, map)).toBe(100);
  });

  it('agent viewer uses their own keep (10%) on all users', () => {
    const root = { code: 'ROOT', role: 'supperadmin', partnership: 100 };
    const agent = {
      code: 'AGENT',
      role: 'agent',
      partnership: 10,
      invite: 'ROOT',
    };
    const map = new Map([
      ['ROOT', root],
      ['AGENT', agent],
    ]);
    const user = { _id: 'u1', role: 'user', invite: 'AGENT' };
    expect(getViewerPLSharePercentOnUser(agent, user, map)).toBeCloseTo(10, 4);
  });

  it('scaleClientPLForViewer uses viewer keep for superadmin on agent downline user', () => {
    const root = { code: 'ROOT', role: 'supperadmin', partnership: 100 };
    const agent = {
      code: 'AGENT',
      role: 'agent',
      partnership: 10,
      invite: 'ROOT',
    };
    const map = new Map([
      ['ROOT', root],
      ['AGENT', agent],
    ]);
    const user = { _id: 'u1', role: 'user', invite: 'AGENT' };
    const scaled = scaleClientPLForViewer(root, user, 1001.8, map);
    expect(scaled.sharePct).toBe(100);
    expect(scaled.clientScaled).toBeCloseTo(1001.8, 2);
    expect(scaled.parentPL).toBeCloseTo(-1001.8, 2);
  });
});

describe('getWeekPLRangeForAdmin (settlement period, not calendar week)', () => {
  it('uses weekPLResetAt as period start when set', async () => {
    const resetAt = new Date('2026-05-10T12:00:00Z');
    const admin = {
      userName: 'agent1',
      weekPLResetAt: resetAt,
      createdAt: new Date('2020-01-01'),
    };
    const range = await getWeekPLRangeForAdmin(admin);
    expect(range.isSettlementPeriod).toBe(true);
    expect(range.start.getTime()).toBe(resetAt.getTime());
    expect(range.end.getTime()).toBeGreaterThanOrEqual(resetAt.getTime());
  });

  it('partial settlement in period reduces expected week client P/L', () => {
    expect(
      expectedBettingPLFromHistory(100, { withdrawl: 100, deposite: 0 })
    ).toBe(0);
    expect(
      expectedBettingPLFromHistory(200, { withdrawl: 100, deposite: 0 })
    ).toBe(100);
    expect(
      expectedBettingPLFromHistory(-200, { withdrawl: 0, deposite: 100 })
    ).toBe(-100);
  });

  it('buildAccountSummary exposes settlement weekRange from plTotals', () => {
    const resetAt = new Date('2026-05-15T00:00:00Z');
    const summary = buildAccountSummary(
      { userName: 'a1', role: 'agent', partnership: 100, avbalance: 0 },
      {
        weekViewerPL: 0,
        weekRange: {
          start: resetAt,
          end: new Date('2026-05-20T00:00:00Z'),
          isSettlementPeriod: true,
        },
      }
    );
    expect(summary.weekRange.start).toEqual(resetAt);
    expect(summary.weekRange.isSettlementPeriod).toBe(true);
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
