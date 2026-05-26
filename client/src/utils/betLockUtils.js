const SPORT_ALIASES = {
  cricket: ['cricket'],
  soccer: ['soccer', 'football'],
  tennis: ['tennis'],
  kabaddi: ['kabaddi'],
  election: ['election'],
  horse: ['horse'],
  greyhound: ['greyhound', 'grey hound'],
};

const safeIncludes = (arr, val) => arr && arr.map(String).includes(String(val));

export const mapGameNameToSport = (gameName, sid) => {
  const sidMap = { 4: 'cricket', 1: 'soccer', 2: 'tennis', 52: 'kabaddi' };
  if (sid != null && sidMap[Number(sid)]) return sidMap[Number(sid)];

  if (!gameName) return null;
  const n = String(gameName).toLowerCase().trim();
  if (n.includes('cricket')) return 'cricket';
  if (n.includes('soccer') || n.includes('football')) return 'soccer';
  if (n.includes('tennis')) return 'tennis';
  if (n.includes('kabaddi')) return 'kabaddi';
  if (n.includes('election')) return 'election';
  if (n.includes('horse')) return 'horse';
  if (n.includes('greyhound')) return 'greyhound';
  return n;
};

export const isSportGameBettingLocked = (gamelock, sportKey) => {
  if (!gamelock?.length || !sportKey) return false;
  const aliases = SPORT_ALIASES[sportKey] || [sportKey];
  const entry = gamelock.find((g) => {
    const gn = String(g.game || '').toLowerCase();
    return aliases.some((a) => gn === a || gn.includes(a));
  });
  return Boolean(entry && entry.lock === false);
};

const FANCY_SESSION_TYPES = new Set([
  'Normal',
  'meter',
  'line',
  'ball',
  'khado',
]);

export const buildMarketLockKeys = ({
  gameId,
  market_id,
  marketName,
  gameType,
}) => {
  const gid = String(gameId ?? '');
  const keys = new Set();
  if (!gid) return keys;

  const mn = String(marketName || '');
  const gt = String(gameType || '');

  const isMatchOdds =
    mn === 'Match Odds' ||
    mn === 'Winner' ||
    mn === 'Tied Match' ||
    mn === 'MATCH_ODDS' ||
    mn === 'TOURNAMENT_WINNER' ||
    gt === 'Match Odds' ||
    gt === 'Winner';

  const isBookmaker =
    mn === 'Bookmaker' || mn.includes('Bookmaker') || gt === 'Bookmaker';

  const isFancySession =
    FANCY_SESSION_TYPES.has(gt) ||
    mn === 'Normal' ||
    mn === 'fancy' ||
    mn === 'Fancy';

  const isFancy1 = gt === 'fancy1' || mn === 'fancy1';

  if (isMatchOdds) keys.add(`mo_${gid}`);
  if (isBookmaker) keys.add(`bm_${gid}`);
  if (isFancySession || isFancy1) {
    keys.add(`f_${gid}`);
    if (market_id != null && market_id !== '') {
      keys.add(`f_${gid}_${market_id}`);
    }
  }

  return keys;
};

export const isMarketLockedByKeys = (lockedMarkets, keys) => {
  if (!lockedMarkets?.length || !keys?.size) return false;
  const keyList = [...keys];

  for (const locked of lockedMarkets) {
    const L = String(locked);
    if (keyList.includes(L)) return true;

    const wholeFancy = L.match(/^f_(\d+)$/);
    if (wholeFancy) {
      const base = wholeFancy[1];
      if (
        keyList.some((k) => k === `f_${base}` || k.startsWith(`f_${base}_`))
      ) {
        return true;
      }
    }
  }

  return false;
};

export const getBetLockMessage = ({
  userInfo,
  gameName,
  gameType,
  marketName,
  gameId,
  market_id,
  sid,
}) => {
  if (!userInfo) return null;
  if (userInfo.uLock || userInfo.betLock || userInfo.bLock) {
    return 'Your account is locked.';
  }

  const sportStr = mapGameNameToSport(gameName, sid);
  if (isSportGameBettingLocked(userInfo.gamelock, sportStr)) {
    return `${gameName || sportStr} betting is locked for your account`;
  }

  const advancedBetLocks =
    userInfo.effectiveAdvancedBetLocks || userInfo.advancedBetLocks || {};
  const sportLocks = sportStr ? advancedBetLocks[sportStr] : null;
  if (!sportLocks) return null;

  if (
    gameType &&
    safeIncludes(sportLocks.types, gameType) &&
    String(gameType).toLowerCase() === sportStr
  ) {
    return `Type ${gameType} is locked`;
  }
  if (safeIncludes(sportLocks.marketTypes, marketName)) {
    return `Market type ${marketName} is locked`;
  }
  if (safeIncludes(sportLocks.marketTypes, gameType)) {
    return `Market type ${gameType} is locked`;
  }
  if (safeIncludes(sportLocks.matches, gameId)) {
    return 'This match is locked';
  }

  const marketKeys = buildMarketLockKeys({
    gameId,
    market_id,
    marketName,
    gameType,
  });

  if (isMarketLockedByKeys(sportLocks.markets, marketKeys)) {
    return 'This market is locked';
  }

  return null;
};

export const createBetLockGuard = (userInfo, defaults = {}) => {
  return (betPayload = {}) => {
    const message = getBetLockMessage({
      userInfo,
      gameName: betPayload.gameName ?? defaults.gameName,
      gameType: betPayload.gameType ?? defaults.gameType,
      marketName: betPayload.marketName ?? defaults.marketName,
      gameId: betPayload.gameId ?? defaults.gameId,
      market_id: betPayload.market_id ?? defaults.market_id,
      sid: betPayload.sid ?? defaults.sid,
    });
    return message;
  };
};
