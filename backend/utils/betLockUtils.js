import SubAdmin from '../models/subAdminModel.js';

const SPORT_ALIASES = {
  cricket: ['cricket'],
  soccer: ['soccer', 'football'],
  tennis: ['tennis'],
  kabaddi: ['kabaddi'],
  election: ['election'],
  horse: ['horse'],
  greyhound: ['greyhound', 'grey hound'],
};

const SPORT_FIELDS = [
  'types',
  'marketTypes',
  'tournaments',
  'matches',
  'markets',
];

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
  // lock === false means betting disabled (propagated from admin dashboard)
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

  // Only keys for the market being bet — never tag every market on the match.
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

    // Whole-match fancy lock (f_gmid) blocks any fancy line on that match.
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

export const mergeAdvancedBetLocksFromChain = (chain) => {
  const merged = {};

  for (const account of chain) {
    const locks = account?.advancedBetLocks;
    if (!locks || typeof locks !== 'object') continue;

    for (const [sport, sportLocks] of Object.entries(locks)) {
      const sportKey = sport.toLowerCase();
      if (!merged[sportKey]) {
        merged[sportKey] = {
          types: [],
          marketTypes: [],
          tournaments: [],
          matches: [],
          markets: [],
        };
      }
      for (const field of SPORT_FIELDS) {
        const values = sportLocks[field];
        if (!Array.isArray(values)) continue;
        merged[sportKey][field].push(...values.map(String));
      }
    }
  }

  for (const sportKey of Object.keys(merged)) {
    for (const field of SPORT_FIELDS) {
      merged[sportKey][field] = [...new Set(merged[sportKey][field])];
    }
  }

  return merged;
};

export const buildUplineChain = async (user) => {
  const chain = [user?.toObject ? user.toObject() : user];
  let current = chain[0];

  while (current?.invite) {
    const parent = await SubAdmin.findOne({ code: current.invite }).lean();
    if (!parent) break;
    chain.push(parent);
    current = parent;
  }

  return chain;
};

export const checkBetLockedForChain = (chain, betDetails) => {
  const {
    gameName,
    gameType,
    marketName,
    gameId,
    market_id,
    sid,
    tournamentId,
  } = betDetails;

  const sportStr = mapGameNameToSport(gameName, sid);

  for (const account of chain) {
    if (isSportGameBettingLocked(account.gamelock, sportStr)) {
      return {
        locked: true,
        message: `${gameName || sportStr || 'This sport'} betting is locked for your account`,
      };
    }
  }

  const mergedLocks = mergeAdvancedBetLocksFromChain(chain);
  const sportLocks = sportStr ? mergedLocks[sportStr] : null;
  if (!sportLocks) return { locked: false };

  // Dashboard "Event Type" uses type-{SportName}; only block when name matches sport.
  if (
    gameType &&
    safeIncludes(sportLocks.types, gameType) &&
    String(gameType).toLowerCase() === sportStr
  ) {
    return { locked: true, message: `Type ${gameType} is locked by an upline` };
  }
  if (safeIncludes(sportLocks.marketTypes, marketName)) {
    return {
      locked: true,
      message: `Market Type ${marketName} is locked by an upline`,
    };
  }
  if (safeIncludes(sportLocks.marketTypes, gameType)) {
    return {
      locked: true,
      message: `Market Type ${gameType} is locked by an upline`,
    };
  }
  if (tournamentId && safeIncludes(sportLocks.tournaments, tournamentId)) {
    return { locked: true, message: 'This tournament is locked by an upline' };
  }
  if (safeIncludes(sportLocks.matches, gameId)) {
    return { locked: true, message: 'This match is locked by an upline' };
  }

  const marketKeys = buildMarketLockKeys({
    gameId,
    market_id,
    marketName,
    gameType,
  });

  if (isMarketLockedByKeys(sportLocks.markets, marketKeys)) {
    return { locked: true, message: 'This market is locked by an upline' };
  }

  return { locked: false };
};

export const checkAdvancedBetLocks = async (user, betDetails) => {
  const chain = await buildUplineChain(user);
  return checkBetLockedForChain(chain, betDetails);
};
