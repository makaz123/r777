import betModel from '../../models/betModel.js';
import SubAdmin from '../../models/subAdminModel.js';
import CasinoBetHistory from '../../models/casinoBetHistory.model.js';
import {
  calculateOutcomeScenarios,
  mapScenariosToMatchSides,
  parseMatchSides,
} from '../../utils/marketCalculationUtils.js';
import { getViewerShareOfUserClientPL } from '../../utils/partnershipCommissionUtils.js';

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

const SPORT_TAB_MAP = {
  'Cricket Game': 'Cricket',
  'Tennis Game': 'Tennis',
  'Soccer Game': 'Soccer',
  'Horse Racing Game': 'Horse Racing',
  'Horse Racing': 'Horse Racing',
};

const normalizeSportTab = (gameName) => SPORT_TAB_MAP[gameName] || null;

const splitEventName = (eventName) => {
  const name = String(eventName || '').trim();
  const sep = ' - ';
  const idx = name.indexOf(sep);
  if (idx > 0) {
    return {
      title: name.slice(0, idx).trim(),
      match: name.slice(idx + sep.length).trim() || name,
    };
  }
  return { title: name, match: name };
};

const buildMarketRow = (marketName, bets, eventSides = null) => {
  const scenarios = calculateOutcomeScenarios(bets);
  const mapped = mapScenariosToMatchSides(scenarios, eventSides);
  const outcomeVals = Object.values(scenarios);
  const exposureVal = outcomeVals.length ? round2(Math.min(...outcomeVals)) : 0;
  const maxProfit = outcomeVals.length ? round2(Math.max(...outcomeVals)) : 0;

  return {
    name: marketName,
    bets: bets.length,
    exposure: exposureVal,
    maxProfit,
    team1: mapped.team1,
    team2: mapped.team2,
    team1Value: round2(mapped.team1Value),
    team2Value: round2(mapped.team2Value),
  };
};

/** Build per-sport event rows for Sports Analysis UI (exposure, markets, teams). */
export const buildSportAnalysisFromBets = (bets) => {
  const buckets = {
    Cricket: [],
    Tennis: [],
    Soccer: [],
    'Horse Racing': [],
  };

  const eventMap = new Map();

  for (const bet of bets) {
    const sport = normalizeSportTab(bet.gameName);
    if (!sport) continue;
    const key = `${sport}|${bet.gameId}|${bet.eventName}`;
    if (!eventMap.has(key)) {
      const { title, match } = splitEventName(bet.eventName);
      eventMap.set(key, {
        sport,
        gameId: bet.gameId,
        gameName: bet.gameName,
        eventName: bet.eventName,
        title,
        match,
        bets: [],
      });
    }
    eventMap.get(key).bets.push(bet);
  }

  for (const event of eventMap.values()) {
    const eventSides =
      parseMatchSides(event.eventName, event.title) ||
      parseMatchSides(event.eventName, event.match);

    const marketsMap = new Map();
    for (const bet of event.bets) {
      const mKey = bet.gameType || bet.marketName || 'Market';
      if (!marketsMap.has(mKey)) marketsMap.set(mKey, []);
      marketsMap.get(mKey).push(bet);
    }

    const markets = [];
    let totalBets = 0;
    let totalAmount = 0;

    for (const [name, mBets] of marketsMap) {
      const row = buildMarketRow(name, mBets, eventSides);
      markets.push(row);
      totalBets += row.bets;
      totalAmount += mBets.reduce((s, b) => s + (Number(b.betAmount) || 0), 0);
    }

    const primary =
      markets.find((m) => m.name === 'Match Odds') || markets[0] || null;

    buckets[event.sport].push({
      title: event.title,
      match: event.match,
      eventName: event.eventName,
      gameId: event.gameId,
      gameName: event.gameName,
      totalBets,
      exposure: primary?.exposure ?? 0,
      totalAmount: round2(totalAmount),
      maxProfit: primary?.maxProfit ?? 0,
      team1: eventSides?.team1 ?? primary?.team1 ?? 'Team 1',
      team2: eventSides?.team2 ?? primary?.team2 ?? 'Team 2',
      market: primary,
      markets,
    });
  }

  const sportAnalysis = {};
  for (const [sport, events] of Object.entries(buckets)) {
    sportAnalysis[sport] = { count: events.length, events };
  }
  return sportAnalysis;
};

async function getDownlineUsersFull(adminId) {
  const downlines = await SubAdmin.aggregate([
    { $match: { _id: adminId } },
    {
      $graphLookup: {
        from: 'subadmins',
        startWith: '$code',
        connectFromField: 'code',
        connectToField: 'invite',
        as: 'downline',
        depthField: 'level',
        restrictSearchWithMatch: { status: { $ne: 'delete' } },
      },
    },
    {
      $project: {
        users: '$downline',
      },
    },
  ]);
  return downlines[0]?.users || [];
}

export function applyAdminViceVersaTransformation(
  bets,
  admin,
  userMap,
  accountByCode
) {
  return bets.map((bet) => {
    const clientUser = userMap[bet.userId?.toString()];
    if (!clientUser) return bet;

    const shareAmountFor100 = getViewerShareOfUserClientPL(
      admin.code,
      clientUser,
      accountByCode,
      100
    );
    const shareRatio = shareAmountFor100 / -100;

    let adminOtype = bet.otype;
    let adminTotalPrice = bet.price * shareRatio;
    let adminTotalBetAmount = bet.betAmount * shareRatio;

    if (
      bet.gameType !== 'Normal' &&
      !bet.gameType?.toLowerCase().includes('fancy')
    ) {
      adminOtype = bet.otype === 'back' ? 'lay' : 'back';
      adminTotalPrice = bet.betAmount * shareRatio;
      adminTotalBetAmount = bet.price * shareRatio;
    }

    return {
      ...bet,
      otype: adminOtype,
      price: adminTotalPrice,
      betAmount: adminTotalBetAmount,
    };
  });
}

export const getDownlinePendingBetsByGame = async (req, res) => {
  const { id } = req;
  const { gameName } = req.query; // optional: to drill into specific game

  try {
    //This will give the array of objects of all the downlines
    const admin = await SubAdmin.findById(id);
    if (!admin)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });

    const downlineUsers = await getDownlineUsersFull(admin._id);
    const ids = downlineUsers.map((u) => u._id.toString());

    if (ids.length === 0) {
      return res.json({
        success: true,
        data: [],
        sportAnalysis: buildSportAnalysisFromBets([]),
      });
    }

    const userMap = {};
    const accountByCode = new Map();
    accountByCode.set(admin.code, admin);

    for (const u of downlineUsers) {
      userMap[u._id.toString()] = u;
      accountByCode.set(u.code, u);
    }

    const pipeline = [{ $match: { userId: { $in: ids }, status: 0 } }];

    if (gameName) pipeline.push({ $match: { gameName } });

    pipeline.push(
      {
        $group: {
          _id: {
            gameName: '$gameName',
            eventName: '$eventName',
            gameId: '$gameId',
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$price' },
        },
      },
      {
        $group: {
          _id: '$_id.gameName',
          events: {
            $push: {
              eventName: '$_id.eventName',
              pendingBetCount: '$count',
              pendingBetAmount: '$totalAmount',
              gameId: '$_id.gameId',
            },
          },
        },
      },
      { $sort: { _id: 1 } }
    );

    const agg = await betModel.aggregate(pipeline);

    const result = agg.map((g) => ({
      gameName: g._id,
      events: g.events,
    }));

    const pendingBets = await betModel
      .find({ userId: { $in: ids }, status: 0 })
      .lean();

    const transformedBets = applyAdminViceVersaTransformation(
      pendingBets,
      admin,
      userMap,
      accountByCode
    );
    const sportAnalysis = buildSportAnalysisFromBets(transformedBets);

    return res.status(200).json({ success: true, data: result, sportAnalysis });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error', error: err.message });
  }
};

//TODO:I have to study this code and understand it
export const getPendingMarketAmounts = async (req, res) => {
  const { id } = req;
  const { gameId } = req.query;

  try {
    const betTypes = [
      { gameType: 'Toss', marketName: 'Toss' },
      { gameType: '1st 6 over', marketName: '1st 6 over' },
      { gameType: 'Match Odds', marketName: 'Match Odds' },
      { gameType: 'Tied Match', marketName: 'Tied Match' },
      { gameType: 'Bookmaker', marketName: 'Bookmaker' },
      { gameType: 'Normal', marketName: 'Toss' },
      { gameType: 'meter', marketName: 'Match Odds' },
      { gameType: 'line', marketName: 'Tied Match' },
      { gameType: 'ball', marketName: 'Bookmaker' },
      { gameType: 'khado', marketName: 'Bookmaker' },
      { gameType: 'Winner', marketName: 'Winner' },
      { gameType: 'OVER_UNDER_05', marketName: 'OVER_UNDER_05' },
      { gameType: 'OVER_UNDER_15', marketName: 'OVER_UNDER_15' },
      { gameType: 'OVER_UNDER_25', marketName: 'OVER_UNDER_25' },
      { gameType: 'Casino', marketName: 'WINNER' },
    ];

    const admin = await SubAdmin.findById(id);

    const downlines = await SubAdmin.aggregate([
      { $match: { _id: admin._id } },
      {
        $graphLookup: {
          from: 'subadmins',
          startWith: '$code',
          connectFromField: 'code',
          connectToField: 'invite',
          as: 'downline',
          depthField: 'level',
          restrictSearchWithMatch: { status: { $ne: 'delete' } },
        },
      },
      {
        $project: {
          users: '$downline',
        },
      },
    ]);

    const downlineUsers = downlines[0]?.users || [];
    const ids = downlineUsers.map((x) => x._id.toString());
    if (ids.length === 0)
      return res.json({ success: true, data: [], comboBookData: [] });

    const userMap = {};
    const accountByCode = new Map();
    accountByCode.set(admin.code, admin);

    for (const u of downlineUsers) {
      userMap[u._id.toString()] = u;
      accountByCode.set(u.code, u);
    }

    const validGameTypes = betTypes.map((bt) => bt.gameType);

    const bets = await betModel
      .find({
        userId: { $in: ids },
        status: 0,
        gameId, // from req.query
        gameType: { $in: validGameTypes },
      })
      .lean();

    const transformedBets = applyAdminViceVersaTransformation(
      bets,
      admin,
      userMap,
      accountByCode
    );

    const grouped = {};

    let ob = 0;
    let op = 0;

    for (const bet of transformedBets) {
      const gameKey = `${bet.gameType}`;

      if (!grouped[gameKey]) {
        // First bet for this gameType
        grouped[gameKey] = {
          gameType: bet.gameType,
          teamName: bet.teamName,
          otype: bet.otype,
          totalBetAmount: bet.betAmount,
          totalPrice: bet.price,
        };
      } else {
        const existing = grouped[gameKey];

        ob = existing.totalBetAmount;
        op = existing.totalPrice;

        // Case 1: Same team & same type
        if (
          existing.teamName === bet.teamName &&
          existing.otype === bet.otype
        ) {
          existing.totalBetAmount += bet.betAmount;
          existing.totalPrice += bet.price;
        }

        // Case 2: Same team but different type (back/lay)
        else if (
          existing.teamName === bet.teamName &&
          existing.otype !== bet.otype
        ) {
          if (bet.price >= existing.totalBetAmount) {
            existing.totalPrice = bet.price - ob;
            existing.totalBetAmount = bet.betAmount - op;
            existing.otype = bet.otype;
          } else {
            existing.totalPrice = op - bet.betAmount;
            existing.totalBetAmount = ob - bet.price;
          }
        }

        // Case 3: Different team, same type
        else if (
          existing.teamName !== bet.teamName &&
          existing.otype === bet.otype
        ) {
          if (bet.price >= existing.totalBetAmount) {
            existing.totalPrice = bet.price - ob;
            existing.totalBetAmount = bet.betAmount - op;
            existing.teamName = bet.teamName;
          } else {
            existing.totalPrice = op - bet.betAmount;
            existing.totalBetAmount = ob - bet.price;
          }
        }

        // Case 4: Different team and different type
        else {
          existing.totalBetAmount += bet.betAmount;
          existing.totalPrice += bet.price;
        }
      }
    }

    const result = Object.values(grouped).map((g) => ({
      ...g,
      totalBetAmount: Math.round(g.totalBetAmount * 100) / 100,
      totalPrice: Math.round(g.totalPrice * 100) / 100,
    }));
    console.log('GetPendingMarketAmounts', result);

    const comboBookDataMap = {}; // { [teamName]: adminNetOutcome }
    const comboBookBets = bets.filter(
      (b) =>
        b.gameType !== 'Normal' && !b.gameType?.toLowerCase().includes('fancy')
    );

    // Find all unique teams involved in these bets
    const comboBookTeams = new Set();
    for (const bet of comboBookBets) {
      if (bet.teamName) comboBookTeams.add(bet.teamName);
    }
    const allTeams = Array.from(comboBookTeams);

    // Initialize map
    for (const team of allTeams) {
      comboBookDataMap[team] = 0;
    }

    // Now calculate Admin net outcome per team
    for (const bet of comboBookBets) {
      const clientUser = userMap[bet.userId.toString()];
      if (!clientUser) continue;

      const shareAmountFor100 = getViewerShareOfUserClientPL(
        admin.code,
        clientUser,
        accountByCode,
        100
      );
      const shareRatio = shareAmountFor100 / -100;

      const betTeam = bet.teamName;
      const profit = Number(bet.betAmount) || 0;
      const stake = Number(bet.price) || 0;

      for (const team of allTeams) {
        let userNetOutcome = 0;
        const isBetOnThisTeam = betTeam === team;

        if (bet.otype === 'back') {
          if (isBetOnThisTeam) {
            userNetOutcome = profit;
          } else {
            userNetOutcome = -stake;
          }
        } else {
          // lay
          if (isBetOnThisTeam) {
            userNetOutcome = -stake;
          } else {
            userNetOutcome = profit;
          }
        }

        // Admin liability is vice-versa (-1) * shareRatio
        const adminOutcome = -1 * userNetOutcome * shareRatio;
        comboBookDataMap[team] += adminOutcome;
      }
    }

    const comboBookData = Object.keys(comboBookDataMap).map((team) => ({
      teamName: team,
      netOutcome: Math.round(comboBookDataMap[team] * 100) / 100,
    }));

    return res
      .status(200)
      .json({ success: true, data: result, betsData: bets, comboBookData });
  } catch (error) {
    console.error('Error fetching bets:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getMasterBook = async (req, res) => {
  const { id } = req; // current user's ID
  const { gameId, gameType } = req.query;

  try {
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    const downlines = await SubAdmin.find({
      invite: admin.code,
      status: { $ne: 'delete' },
    });
    console.log('downlines', downlines);

    const ids = downlines.map((d) => String(d._id));

    if (ids.length === 0) {
      return res.json({ success: true, data: [], betsData: [] });
    }

    const userGrouped = {};
    for (const uId of ids) {
      const user = await SubAdmin.findById(uId);

      const userKey = `${user.userName}`;
      if (user.role === 'user') {
        const userBet = await betModel.find({
          userId: uId,
          gameType: gameType,
          gameId: gameId,
          status: 0,
        });

        if (userBet.length > 0) {
          if (!userGrouped[userKey]) {
            userGrouped[userKey] = {
              id: user._id,
              userName: user.userName,
              userRole: user.role,
              teamName: userBet[0].teamName,
              otype: userBet[0].otype,
              totalPrice: userBet[0].price,
              totalBetAmount: userBet[0].betAmount,
            };
          }
        } else {
          console.log(`No bets found for user: ${user.userName} (${uId})`);
        }
      } else {
        const userDownlines = await SubAdmin.aggregate([
          { $match: { _id: user._id } },
          {
            $graphLookup: {
              from: 'subadmins',
              startWith: '$code',
              connectFromField: 'code',
              connectToField: 'invite',
              as: 'downline',
              depthField: 'level',
            },
          },
          {
            $project: {
              ids: { $map: { input: '$downline', as: 'u', in: '$$u._id' } },
            },
          },
        ]);

        const userIds = (userDownlines[0]?.ids || []).map((x) => x.toString());
        if (userIds.length === 0) continue;

        const bets = await betModel.find({
          userId: { $in: userIds },
          status: 0,
          gameId, // from req.query
          gameType: gameType,
        });

        let ob = 0;
        let op = 0;

        for (const bet of bets) {
          if (!userGrouped[userKey]) {
            // First bet for this
            userGrouped[userKey] = {
              id: user._id,
              userName: user.userName,
              userRole: user.role,
              partnership: Number(user.partnership),
              teamName: bet.teamName,
              otype: bet.otype,
              totalPrice: bet.price,
              totalBetAmount: bet.betAmount,
            };
          } else {
            const existing = userGrouped[userKey];

            ob = existing.totalBetAmount;
            op = existing.totalPrice;

            // Case 1: Same team & same type
            if (
              existing.teamName === bet.teamName &&
              existing.otype === bet.otype
            ) {
              existing.totalBetAmount += bet.betAmount;
              existing.totalPrice += bet.price;
            }

            // Case 2: Same team but different type (back/lay)
            else if (
              existing.teamName === bet.teamName &&
              existing.otype !== bet.otype
            ) {
              if (bet.price >= existing.totalBetAmount) {
                existing.totalPrice = bet.price - ob;
                existing.totalBetAmount = bet.betAmount - op;
                existing.otype = bet.otype;
              } else {
                existing.totalPrice = op - bet.betAmount;
                existing.totalBetAmount = ob - bet.price;
              }
            }

            // Case 3: Different team, same type
            else if (
              existing.teamName !== bet.teamName &&
              existing.otype === bet.otype
            ) {
              if (bet.price >= existing.totalBetAmount) {
                existing.totalPrice = bet.price - ob;
                existing.totalBetAmount = bet.betAmount - op;
                existing.teamName = bet.teamName;
                // console.log("444444444444")
              } else {
                existing.totalPrice = op - bet.betAmount;
                existing.totalBetAmount = ob - bet.price;
                // console.log("55555555555555")
              }
            }

            // Case 4: Different team and different type
            else {
              existing.totalBetAmount += bet.betAmount;
              existing.totalPrice += bet.price;
              // console.log("666666666666666")
            }
          }
        }
      }
      // const result = Object.values(userGrouped);
    }

    const result = Object.values(userGrouped);
    // console.log("result", result)

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching bets:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getCasinoMasterBook = async (req, res) => {
  const { id } = req;
  const { gameId, gameType } = req.query;

  try {
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      console.log(' [CASINO MASTER BOOK] Admin not found:', id);
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    console.log(' [CASINO MASTER BOOK] Admin found:', admin.userName);

    // Get direct downlines
    const downlines = await SubAdmin.find({
      invite: admin.code,
      status: { $ne: 'delete' },
    });
    const ids = downlines.map((d) => String(d._id));

    console.log(' [CASINO MASTER BOOK] Downlines found:', ids.length);

    if (ids.length === 0) {
      console.log(' [CASINO MASTER BOOK] No downlines found');
      return res.json({ success: true, data: [], betsData: [] });
    }

    const userGrouped = {};

    for (const uId of ids) {
      const user = await SubAdmin.findById(uId);
      const userKey = `${user.userName}`;

      if (user.role === 'user') {
        // Get casino bets for this user
        const userBets = await betModel.find({
          userId: uId,
          gameType: 'Casino',
          gameId: gameId,
          status: 0,
        });

        console.log(
          `🎲 [CASINO MASTER BOOK] User ${user.userName} has ${userBets.length} casino bets`
        );

        if (userBets.length > 0) {
          // Group casino bets by game (eventName) and player
          const casinoGrouped = {};

          for (const bet of userBets) {
            const gameKey = `${bet.eventName}_${bet.teamName}`;

            if (!casinoGrouped[gameKey]) {
              casinoGrouped[gameKey] = {
                gameName: bet.eventName,
                playerName: bet.teamName,
                totalPrice: 0,
                totalBetAmount: 0,
                betCount: 0,
                otype: bet.otype,
              };
            }

            casinoGrouped[gameKey].totalPrice += bet.price;
            casinoGrouped[gameKey].totalBetAmount += bet.betAmount;
            casinoGrouped[gameKey].betCount += 1;
          }

          // Use the largest bet group for this user
          const casinoGroups = Object.values(casinoGrouped);
          if (casinoGroups.length > 0) {
            const largestGroup = casinoGroups.reduce((max, current) =>
              current.totalBetAmount > max.totalBetAmount ? current : max
            );

            if (!userGrouped[userKey]) {
              userGrouped[userKey] = {
                id: user._id,
                userName: user.userName,
                userRole: user.role,
                gameName: largestGroup.gameName,
                playerName: largestGroup.playerName,
                totalPrice: largestGroup.totalPrice,
                totalBetAmount: largestGroup.totalBetAmount,
                betCount: largestGroup.betCount,
                otype: largestGroup.otype,
              };
            }
          }
        }
      } else {
        // Handle non-user roles (agents, etc.) with their downlines
        const userDownlines = await SubAdmin.aggregate([
          { $match: { _id: user._id } },
          {
            $graphLookup: {
              from: 'subadmins',
              startWith: '$code',
              connectFromField: 'code',
              connectToField: 'invite',
              as: 'downline',
              depthField: 'level',
            },
          },
          {
            $project: {
              ids: { $map: { input: '$downline', as: 'u', in: '$$u._id' } },
            },
          },
        ]);

        const userIds = (userDownlines[0]?.ids || []).map((x) => x.toString());
        if (userIds.length === 0) continue;

        const bets = await betModel.find({
          userId: { $in: userIds },
          status: 0,
          gameId,
          gameType: 'Casino',
        });

        console.log(
          `🎲 [CASINO MASTER BOOK] Agent ${user.userName} has ${bets.length} casino bets from downlines`
        );

        // Group casino bets by game and player
        const casinoGrouped = {};

        for (const bet of bets) {
          const gameKey = `${bet.eventName}_${bet.teamName}`;

          if (!casinoGrouped[gameKey]) {
            casinoGrouped[gameKey] = {
              gameName: bet.eventName,
              playerName: bet.teamName,
              totalPrice: 0,
              totalBetAmount: 0,
              betCount: 0,
              otype: bet.otype,
            };
          }

          casinoGrouped[gameKey].totalPrice += bet.price;
          casinoGrouped[gameKey].totalBetAmount += bet.betAmount;
          casinoGrouped[gameKey].betCount += 1;
        }

        // Use the largest bet group for this user
        const casinoGroups = Object.values(casinoGrouped);
        if (casinoGroups.length > 0) {
          const largestGroup = casinoGroups.reduce((max, current) =>
            current.totalBetAmount > max.totalBetAmount ? current : max
          );

          if (!userGrouped[userKey]) {
            userGrouped[userKey] = {
              id: user._id,
              userName: user.userName,
              userRole: user.role,
              partnership: Number(user.partnership),
              gameName: largestGroup.gameName,
              playerName: largestGroup.playerName,
              totalPrice: largestGroup.totalPrice,
              totalBetAmount: largestGroup.totalBetAmount,
              betCount: largestGroup.betCount,
              otype: largestGroup.otype,
            };
          }
        }
      }
    }

    const result = Object.values(userGrouped);

    console.log(
      '🎯 [CASINO MASTER BOOK] Final result:',
      result.length,
      'users'
    );
    console.log('📋 [CASINO MASTER BOOK] Sample result:', result[0]);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ [CASINO MASTER BOOK] Error fetching casino bets:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getCasinoMasterBookDownline = async (req, res) => {
  const { gameId, gameType, userId } = req.query;

  console.log('🎰 [CASINO MASTER BOOK DOWNLINE] Starting with:', {
    gameId,
    gameType,
    userId,
  });

  try {
    const admin = await SubAdmin.findById(userId);
    if (!admin) {
      console.log('[CASINO MASTER BOOK DOWNLINE] Admin not found:', userId);
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    console.log('[CASINO MASTER BOOK DOWNLINE] Admin found:', admin.userName);

    // Get direct downlines
    const downlines = await SubAdmin.find({
      invite: admin.code,
      status: { $ne: 'delete' },
    });
    const ids = downlines.map((d) => String(d._id));

    console.log(' [CASINO MASTER BOOK DOWNLINE] Downlines found:', ids.length);

    if (ids.length === 0) {
      console.log('[CASINO MASTER BOOK DOWNLINE] No downlines found');
      return res.json({ success: true, data: [], betsData: [] });
    }

    const userGrouped = {};

    for (const uId of ids) {
      const user = await SubAdmin.findById(uId);
      const userKey = `${user.userName}`;

      if (user.role === 'user') {
        // Get casino bets for this user
        const userBets = await betModel.find({
          userId: uId,
          gameType: 'Casino',
          gameId: gameId,
          status: 0,
        });

        console.log(
          ` [CASINO MASTER BOOK DOWNLINE] User ${user.userName} has ${userBets.length} casino bets`
        );

        if (userBets.length > 0) {
          // Group casino bets by game (eventName) and player
          const casinoGrouped = {};

          for (const bet of userBets) {
            const gameKey = `${bet.eventName}_${bet.teamName}`;

            if (!casinoGrouped[gameKey]) {
              casinoGrouped[gameKey] = {
                gameName: bet.eventName,
                playerName: bet.teamName,
                totalPrice: 0,
                totalBetAmount: 0,
                betCount: 0,
                otype: bet.otype,
              };
            }

            casinoGrouped[gameKey].totalPrice += bet.price;
            casinoGrouped[gameKey].totalBetAmount += bet.betAmount;
            casinoGrouped[gameKey].betCount += 1;
          }

          // Use the largest bet group for this user
          const casinoGroups = Object.values(casinoGrouped);
          if (casinoGroups.length > 0) {
            const largestGroup = casinoGroups.reduce((max, current) =>
              current.totalBetAmount > max.totalBetAmount ? current : max
            );

            if (!userGrouped[userKey]) {
              userGrouped[userKey] = {
                id: user._id,
                userName: user.userName,
                userRole: user.role,
                gameName: largestGroup.gameName,
                playerName: largestGroup.playerName,
                totalPrice: largestGroup.totalPrice,
                totalBetAmount: largestGroup.totalBetAmount,
                betCount: largestGroup.betCount,
                otype: largestGroup.otype,
              };
            }
          }
        }
      } else {
        // Handle non-user roles (agents, etc.) with their downlines
        const userDownlines = await SubAdmin.aggregate([
          { $match: { _id: user._id } },
          {
            $graphLookup: {
              from: 'subadmins',
              startWith: '$code',
              connectFromField: 'code',
              connectToField: 'invite',
              as: 'downline',
              depthField: 'level',
            },
          },
          {
            $project: {
              ids: { $map: { input: '$downline', as: 'u', in: '$$u._id' } },
            },
          },
        ]);

        const userIds = (userDownlines[0]?.ids || []).map((x) => x.toString());
        if (userIds.length === 0) continue;

        const bets = await betModel.find({
          userId: { $in: userIds },
          status: 0,
          gameId,
          gameType: 'Casino',
        });

        console.log(
          `🎲 [CASINO MASTER BOOK DOWNLINE] Agent ${user.userName} has ${bets.length} casino bets from downlines`
        );

        // Group casino bets by game and player
        const casinoGrouped = {};

        for (const bet of bets) {
          const gameKey = `${bet.eventName}_${bet.teamName}`;

          if (!casinoGrouped[gameKey]) {
            casinoGrouped[gameKey] = {
              gameName: bet.eventName,
              playerName: bet.teamName,
              totalPrice: 0,
              totalBetAmount: 0,
              betCount: 0,
              otype: bet.otype,
            };
          }

          casinoGrouped[gameKey].totalPrice += bet.price;
          casinoGrouped[gameKey].totalBetAmount += bet.betAmount;
          casinoGrouped[gameKey].betCount += 1;
        }

        // Use the largest bet group for this user
        const casinoGroups = Object.values(casinoGrouped);
        if (casinoGroups.length > 0) {
          const largestGroup = casinoGroups.reduce((max, current) =>
            current.totalBetAmount > max.totalBetAmount ? current : max
          );

          if (!userGrouped[userKey]) {
            userGrouped[userKey] = {
              id: user._id,
              userName: user.userName,
              userRole: user.role,
              partnership: Number(user.partnership),
              gameName: largestGroup.gameName,
              playerName: largestGroup.playerName,
              totalPrice: largestGroup.totalPrice,
              totalBetAmount: largestGroup.totalBetAmount,
              betCount: largestGroup.betCount,
              otype: largestGroup.otype,
            };
          }
        }
      }
    }

    const result = Object.values(userGrouped);

    console.log(
      ' [CASINO MASTER BOOK DOWNLINE] Final result:',
      result.length,
      'users'
    );
    console.log('[CASINO MASTER BOOK DOWNLINE] Sample result:', result[0]);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      '[CASINO MASTER BOOK DOWNLINE] Error fetching casino bets:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getMasterBookDownline = async (req, res) => {
  const { gameId, gameType, userId } = req.query;

  // console.log("userId", req.query)

  try {
    const admin = await SubAdmin.findById(userId);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    const downlines = await SubAdmin.find({
      invite: admin.code,
      status: { $ne: 'delete' },
    });
    // console.log("downlines", downlines)

    const ids = downlines.map((d) => String(d._id));
    // console.log("ids", ids)

    if (ids.length === 0) {
      return res.json({ success: true, data: [], betsData: [] });
    }

    // console.log("ids out of loop", ids)

    const userGrouped = {};
    for (const uId of ids) {
      const user = await SubAdmin.findById(uId);

      // console.log("ids in of loop", uId)

      // console.log("useeeeeee", user)

      const userKey = `${user.userName}`;
      if (user.role === 'user') {
        const userBet = await betModel.find({
          userId: uId,
          gameType: gameType,
          gameId: gameId,
          status: 0,
        });

        if (userBet.length > 0) {
          // const userKey = `${user.userName}|${bet.teamName}`;

          if (!userGrouped[userKey]) {
            userGrouped[userKey] = {
              id: user._id,
              userName: user.userName,
              userRole: user.role,
              teamName: userBet[0].teamName,
              otype: userBet[0].otype,
              totalPrice: userBet[0].price,
              totalBetAmount: userBet[0].betAmount,
            };
          }
        } else {
          console.log(`No bets found for user: ${user.userName} (${uId})`);
        }
      } else {
        const userDownlines = await SubAdmin.aggregate([
          { $match: { _id: user._id } },
          {
            $graphLookup: {
              from: 'subadmins',
              startWith: '$code',
              connectFromField: 'code',
              connectToField: 'invite',
              as: 'downline',
              depthField: 'level',
            },
          },
          {
            $project: {
              ids: { $map: { input: '$downline', as: 'u', in: '$$u._id' } },
            },
          },
        ]);

        const userIds = (userDownlines[0]?.ids || []).map((x) => x.toString());
        // if (userIds.length === 0) return res.json({ success: true, data: [] });
        if (userIds.length === 0) continue;

        const bets = await betModel.find({
          userId: { $in: userIds },
          status: 0,
          gameId, // from req.query
          gameType: gameType,
        });

        // const grouped = {};

        let ob = 0;
        let op = 0;

        for (const bet of bets) {
          // const userKey = `${user.userName}`;

          if (!userGrouped[userKey]) {
            // First bet for this
            userGrouped[userKey] = {
              id: user._id,
              userName: user.userName,
              userRole: user.role,
              partnership: Number(user.partnership),
              teamName: bet.teamName,
              otype: bet.otype,
              totalPrice: bet.price,
              totalBetAmount: bet.betAmount,
            };
          } else {
            const existing = userGrouped[userKey];

            ob = existing.totalBetAmount;
            op = existing.totalPrice;

            // Case 1: Same team & same type
            if (
              existing.teamName === bet.teamName &&
              existing.otype === bet.otype
            ) {
              existing.totalBetAmount += bet.betAmount;
              existing.totalPrice += bet.price;
            }

            // Case 2: Same team but different type (back/lay)
            else if (
              existing.teamName === bet.teamName &&
              existing.otype !== bet.otype
            ) {
              if (bet.price >= existing.totalBetAmount) {
                existing.totalPrice = bet.price - ob;
                existing.totalBetAmount = bet.betAmount - op;
                existing.otype = bet.otype;
              } else {
                existing.totalPrice = op - bet.betAmount;
                existing.totalBetAmount = ob - bet.price;
                // console.log("33333333333333")
                // optional: update type?
              }
            }

            // Case 3: Different team, same type
            else if (
              existing.teamName !== bet.teamName &&
              existing.otype === bet.otype
            ) {
              if (bet.price >= existing.totalBetAmount) {
                existing.totalPrice = bet.price - ob;
                existing.totalBetAmount = bet.betAmount - op;
                existing.teamName = bet.teamName;
                // console.log("444444444444")
              } else {
                existing.totalPrice = op - bet.betAmount;
                existing.totalBetAmount = ob - bet.price;
                // console.log("55555555555555")
              }
            }

            // Case 4: Different team and different type
            else {
              existing.totalBetAmount += bet.betAmount;
              existing.totalPrice += bet.price;
              // console.log("666666666666666")
            }
          }
        }
      }
      // const result = Object.values(userGrouped);
    }

    const result = Object.values(userGrouped);
    // console.log("result", result)

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching bets:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const parentsDetails = async (req, res) => {
  const adminId = req.id;
  //This id
  const { id } = req.params;

  try {
    const admin = await SubAdmin.findById(adminId);
    const user = await SubAdmin.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const dataArray = [user]; // Level 1 = self
    let current = user;

    const visited = new Set();
    visited.add(current._id.toString());

    let level = 1; // Start from self

    while (
      current?.invite &&
      level < 7 &&
      dataArray.userName !== admin.userName
    ) {
      const parent = await SubAdmin.findOne({ code: current.invite });
      if (!parent) break;

      if (visited.has(parent._id.toString())) {
        console.warn('Circular invite loop detected at:', parent._id);
        break;
      }

      dataArray.push(parent);
      visited.add(parent._id.toString());
      current = parent;
      level++; // Increase level
    }

    // Enforce minimum of 2 levels (self + at least one parent)
    if (dataArray.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Minimum 2 levels (including self) required, but only 1 found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Parent hierarchy fetched successfully',
      data: dataArray,
    });
  } catch (error) {
    console.error('Error fetching parent details:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getCasinoAnalysisList = async (req, res) => {
  const { id } = req;

  try {
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    const downlines = await SubAdmin.aggregate([
      { $match: { _id: admin._id } },
      {
        $graphLookup: {
          from: 'subadmins',
          startWith: '$code',
          connectFromField: 'code',
          connectToField: 'invite',
          as: 'downline',
          depthField: 'level',
          restrictSearchWithMatch: { status: { $ne: 'delete' } },
        },
      },
      {
        $project: {
          ids: { $map: { input: '$downline', as: 'u', in: '$$u._id' } },
        },
      },
    ]);

    const ids = (downlines[0]?.ids || []).map((x) => x.toString());

    const defaultGames = [
      'Indian Poker/ Live Casino',
      'Indian Poker II',
      'Evolution',
      'Vivo',
      'Betgames',
      'Casino III',
      'Spribe',
      'Mac88',
      'Chicken Road',
      'Rvgames',
      'Ezugi',
    ];

    const getCasinoCategory = (gameName, gameUid) => {
      const name = (gameName || '').toLowerCase();
      const uid = (gameUid || '').toLowerCase();

      if (name.includes('evolution') || uid.includes('evolution'))
        return 'Evolution';
      if (name.includes('vivo') || uid.includes('vivo')) return 'Vivo';
      if (name.includes('betgames') || uid.includes('betgames'))
        return 'Betgames';
      if (
        name.includes('spribe') ||
        name.includes('aviator') ||
        uid.includes('spribe') ||
        uid.includes('aviator')
      )
        return 'Spribe';
      if (
        name.includes('chicken') ||
        name.includes('inout') ||
        uid.includes('chicken') ||
        uid.includes('inout')
      )
        return 'Chicken Road';
      if (name.includes('poker2') || uid.includes('poker2'))
        return 'Indian Poker II';
      if (name.includes('poker') || uid.includes('poker'))
        return 'Indian Poker/ Live Casino';
      if (name.includes('mac88') || uid.includes('mac88')) return 'Mac88';
      if (name.includes('casino3') || uid.includes('casino3'))
        return 'Casino III';
      if (name.includes('rvgames') || uid.includes('rvgames')) return 'Rvgames';
      if (name.includes('ezugi') || uid.includes('ezugi')) return 'Ezugi';

      return 'Indian Poker/ Live Casino'; // Default fallback
    };

    const gameStatsMap = {};
    defaultGames.forEach((game) => {
      gameStatsMap[game] = {
        eventName: game,
        totalOrder: 0,
        exposure: 0,
        totalAmount: 0,
        maxProfit: null,
      };
    });

    if (ids.length > 0) {
      const bets = await CasinoBetHistory.find({
        userId: { $in: ids },
      }).lean();

      const userProfitPerGame = {};

      bets.forEach((bet) => {
        const key = getCasinoCategory(bet.game_name, bet.game_uid);

        const betAmount = Number(bet.bet_amount || 0);
        const winAmount = Number(bet.win_amount || 0);
        const userIdStr = bet.userId ? bet.userId.toString() : 'unknown';

        if (!gameStatsMap[key]) {
          gameStatsMap[key] = {
            eventName: key,
            totalOrder: 0,
            exposure: 0,
            totalAmount: 0,
            maxProfit: null,
          };
        }

        if (!userProfitPerGame[key]) {
          userProfitPerGame[key] = {};
        }
        if (!userProfitPerGame[key][userIdStr]) {
          userProfitPerGame[key][userIdStr] = 0;
        }

        userProfitPerGame[key][userIdStr] += winAmount - betAmount;

        gameStatsMap[key].totalOrder += 1;
        gameStatsMap[key].totalAmount += betAmount;
        gameStatsMap[key].exposure += 0;
      });

      Object.keys(userProfitPerGame).forEach((gameKey) => {
        let maxVal = -Infinity;
        let hasUsers = false;

        Object.values(userProfitPerGame[gameKey]).forEach((profit) => {
          hasUsers = true;
          if (profit > maxVal) {
            maxVal = profit;
          }
        });

        if (hasUsers) {
          gameStatsMap[gameKey].maxProfit = maxVal;
        }
      });
    }

    // Default any game with no play records to a max profit of 0
    Object.keys(gameStatsMap).forEach((key) => {
      if (gameStatsMap[key].maxProfit === null) {
        gameStatsMap[key].maxProfit = 0;
      }
    });

    const finalData = [];
    defaultGames.forEach((game) => {
      if (gameStatsMap[game] && gameStatsMap[game].totalOrder > 0) {
        finalData.push(gameStatsMap[game]);
      }
    });

    Object.keys(gameStatsMap).forEach((game) => {
      if (!defaultGames.includes(game) && gameStatsMap[game].totalOrder > 0) {
        finalData.push(gameStatsMap[game]);
      }
    });

    return res.status(200).json({
      success: true,
      data: finalData,
    });
  } catch (error) {
    console.error('Error fetching casino GGR list:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
