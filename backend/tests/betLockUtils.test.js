import { describe, expect, test } from 'vitest';

import {
  buildMarketLockKeys,
  checkBetLockedForChain,
  isMarketLockedByKeys,
  isSportGameBettingLocked,
  mergeAdvancedBetLocksFromChain,
} from '../utils/betLockUtils.js';

describe('betLockUtils', () => {
  test('sport gamelock matches cricket game name', () => {
    const gamelock = [{ game: 'cricket', lock: false }];
    expect(isSportGameBettingLocked(gamelock, 'cricket')).toBe(true);
    expect(
      isSportGameBettingLocked(gamelock, 'cricket') &&
        !isSportGameBettingLocked([{ game: 'cricket', lock: true }], 'cricket')
    ).toBe(true);
  });

  test('fancy market lock f_gmid blocks Normal session bets only', () => {
    const fancyKeys = buildMarketLockKeys({
      gameId: '901470276',
      gameType: 'Normal',
      marketName: 'Normal',
    });
    expect(isMarketLockedByKeys(['f_901470276'], fancyKeys)).toBe(true);

    const matchOddsKeys = buildMarketLockKeys({
      gameId: '901470276',
      gameType: 'Match Odds',
      marketName: 'Match Odds',
    });
    expect(isMarketLockedByKeys(['f_901470276'], matchOddsKeys)).toBe(false);
    expect(isMarketLockedByKeys(['mo_901470276'], matchOddsKeys)).toBe(true);
  });

  test('upline advanced locks merge and block', () => {
    const chain = [
      { gamelock: [{ game: 'cricket', lock: true }], advancedBetLocks: {} },
      {
        gamelock: [{ game: 'cricket', lock: true }],
        advancedBetLocks: {
          cricket: {
            types: [],
            marketTypes: [],
            tournaments: [],
            matches: [],
            markets: ['f_901470276'],
          },
        },
      },
    ];
    const merged = mergeAdvancedBetLocksFromChain(chain);
    expect(merged.cricket.markets).toContain('f_901470276');

    const result = checkBetLockedForChain(chain, {
      gameName: 'Cricket Game',
      gameType: 'Normal',
      marketName: 'Normal',
      gameId: '901470276',
      sid: 4,
    });
    expect(result.locked).toBe(true);
  });
});
