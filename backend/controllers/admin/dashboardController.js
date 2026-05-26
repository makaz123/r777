import SubAdmin from '../../models/subAdminModel.js';
import betHistoryModel from '../../models/betHistoryModel.js';
import DepositHistory from '../../models/depositeHistoryModel.js';
import TransactionHistory from '../../models/transtionHistoryModel.js';
import WithdrawalHistory from '../../models/withdrawalHistoryModel.js';
import CasinoBetHistory from '../../models/casinoBetHistory.model.js';
import { getCurrentDashboardWeekRange } from '../../utils/dashboardWeekRange.js';
import { getDateRangeUTC } from '../../utils/dateUtils.js';
import {
  getCasinoNetPL,
  hasCasinoRoundActivity,
} from '../../utils/casinoPlUtils.js';
import {
  getMatchOddsCommissionAmount,
  isMatchOddsBetRecord,
  parseCommissionPercent,
  roundMoney,
} from '../../utils/partnershipCommissionUtils.js';
import {
  mergeDownlineIntoAccountByCode,
  resolveBetEndUser,
  scaleClientPLForViewer,
  getAccountByCodeMap,
} from '../../utils/accountSummaryUtils.js';

// Helper to round float values to exactly two decimal places
const round2 = (val) => {
  if (typeof val !== 'number') return 0;
  return parseFloat(val.toFixed(2));
};

/**
 * Get recursive downline report stats for the Dashboard widgets.
 */
export const getDashboardStats = async (req, res) => {
  const { id } = req; // Logged-in admin user ID
  let { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    const week = getCurrentDashboardWeekRange();
    startDate = week.startDate;
    endDate = week.endDate;
  }

  try {
    // 1. Retrieve the admin
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // 2. Retrieve all recursive downline users
    const downlineAggregation = await SubAdmin.aggregate([
      { $match: { _id: admin._id } },
      {
        $graphLookup: {
          from: 'subadmins',
          startWith: '$code',
          connectFromField: 'code',
          connectToField: 'invite',
          as: 'downline',
          restrictSearchWithMatch: { status: { $ne: 'delete' } },
        },
      },
    ]);

    const downlineUsers = downlineAggregation[0]?.downline || [];
    const downlineIds = downlineUsers.map((u) => u._id.toString());
    const downlineUserNames = downlineUsers.map((u) => u.userName);

    // 3. Date filter setup
    let dateFilterBet = {};
    let dateFilterTx = {};

    if (startDate && endDate) {
      const range = getDateRangeUTC(startDate, endDate);
      dateFilterBet.date = range;
      dateFilterTx.createdAt = range;
    }

    // If there are no downline users, return empty stats immediately
    if (downlineIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          header: {
            pl: 0,
            commission: 0,
            deposit: 0,
            depositCount: 0,
            withdrawal: 0,
            withdrawalCount: 0,
            totalBets: 0,
            sportbookPL: 0,
          },
          topWinningPlayers: [],
          topLosingPlayers: [],
          topWinningMarkets: [],
          topLosingMarkets: [],
          userCount: [],
          sportsGameplay: {},
          othersGameplay: {
            totalBets: 0,
            totalBetAmount: 0,
            totalPL: 0,
          },
          casinoGameplay: {
            'Indian Poker/Live Casino': 0,
            'Indian Poker II P&L': 0,
            'Evolution P&L': 0,
            'Vivo P&L': 0,
            'Betgames P&L': 0,
            'Casino III P&L': 0,
            'Spribe P&L': 0,
            'Mac88 P&L': 0,
            'Chicken Road P&L': 0,
          },
        },
      });
    }

    // 4. Fetch all relevant downline data
    const [
      sportsBets,
      casinoBets,
      deposits,
      openingBalanceDeposits,
      withdrawals,
    ] = await Promise.all([
      // Sports Bets
      betHistoryModel
        .find({
          userId: { $in: downlineIds },
          status: { $in: [1, 2] }, // Settled only for P&L / top players
          ...dateFilterBet,
        })
        .lean(),

      // Casino Bets
      CasinoBetHistory.find({
        userId: { $in: downlineIds },
        ...dateFilterTx,
      }).lean(),

      // Deposits (manual deposit / settlement flows)
      DepositHistory.find({
        userName: { $in: downlineUserNames },
        ...dateFilterTx,
      }).lean(),

      // Opening balance on new account — stored in TransactionHistory only
      TransactionHistory.find({
        userName: { $in: downlineUserNames },
        deposite: { $gt: 0 },
        remark: 'Opening Balance',
        ...dateFilterTx,
      }).lean(),

      // Withdrawals
      WithdrawalHistory.find({
        userName: { $in: downlineUserNames },
        ...dateFilterTx,
      }).lean(),
    ]);

    const totalSportsBets = sportsBets.length;
    let totalCommission = 0;
    let totalSportsBetAmount = 0;
    let totalCasinoBetAmount = 0;

    const activeCasinoBets = casinoBets.filter(hasCasinoRoundActivity);
    const totalCasinoBets = activeCasinoBets.length;

    const userCommitionMap = new Map(
      downlineUsers
        .filter((u) => u.role === 'user')
        .map((u) => [u._id.toString(), parseCommissionPercent(u.commition)])
    );
    const userCommitionByName = new Map(
      downlineUsers
        .filter((u) => u.role === 'user')
        .map((u) => [
          String(u.userName || '').toLowerCase(),
          parseCommissionPercent(u.commition),
        ])
    );

    const resolveCommissionRate = (bet) => {
      const byName = userCommitionByName.get(
        String(bet.userName || '').toLowerCase()
      );
      if (byName) return byName;
      const id = bet.userId ? String(bet.userId) : '';
      return userCommitionMap.get(id) || 0;
    };

    // Viewer partnership share on each bet (same My % rules as Userlist).
    // This perfectly matches the "Dashboard P&L (My Share Only) = P x My % / 100" logic.
    const accountByCode = await getAccountByCodeMap(SubAdmin, admin);
    mergeDownlineIntoAccountByCode(accountByCode, downlineUsers);

    const scaleBetClientPL = (bet, clientPL) => {
      const endUser = resolveBetEndUser(bet, downlineUsers);
      if (!endUser) return { clientScaled: 0, parentPL: 0, sharePct: 0 };
      return scaleClientPLForViewer(admin, endUser, clientPL, accountByCode);
    };

    let headerPL = 0;
    sportsBets.forEach((bet) => {
      const clientPL = bet.profitLossChange || 0;
      const { parentPL, sharePct } = scaleBetClientPL(bet, clientPL);
      headerPL += parentPL;
      totalSportsBetAmount += bet.betAmount || 0;

      if (isMatchOddsBetRecord(bet) && bet.profitLossChange > 0) {
        const rate = resolveCommissionRate(bet);
        if (rate > 0 && sharePct > 0) {
          totalCommission +=
            getMatchOddsCommissionAmount(bet.profitLossChange, rate) *
            (sharePct / 100);
        }
      }
    });

    activeCasinoBets.forEach((bet) => {
      const clientPL = getCasinoNetPL(bet);
      const { parentPL } = scaleBetClientPL(bet, clientPL);
      headerPL += parentPL;
      totalCasinoBetAmount += bet.bet_amount || 0;
    });

    const totalBetsCount = totalSportsBets + totalCasinoBets;

    const totalDeposit =
      deposits.reduce((sum, d) => sum + (d.amount || 0), 0) +
      openingBalanceDeposits.reduce((sum, t) => sum + (t.deposite || 0), 0);
    const totalWithdrawal = withdrawals.reduce(
      (sum, w) => sum + (w.amount || 0),
      0
    );

    // 6. Calculate Top 5 Winning & Losing Players (user net P&L in period)
    const userIdToName = Object.fromEntries(
      downlineUsers.map((u) => [u._id.toString(), u.userName])
    );
    const playerPLMap = {};

    const addPlayerPL = (userName, delta) => {
      if (!userName) return;
      playerPLMap[userName] = (playerPLMap[userName] || 0) + (delta || 0);
    };

    sportsBets.forEach((bet) => {
      const { clientScaled } = scaleBetClientPL(
        bet,
        bet.profitLossChange || 0
      );
      addPlayerPL(bet.userName, clientScaled);
    });

    activeCasinoBets.forEach((bet) => {
      const { clientScaled } = scaleBetClientPL(bet, getCasinoNetPL(bet));
      const uName = bet.userName || userIdToName[bet.userId];
      addPlayerPL(uName, clientScaled);
    });

    const playerList = Object.entries(playerPLMap).map(
      ([userName, amount]) => ({
        userName,
        amount,
      })
    );

    const topWinningPlayers = playerList
      .filter((p) => p.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((p) => ({
        userName: p.userName,
        amount: round2(p.amount),
      }));

    const topLosingPlayers = playerList
      .filter((p) => p.amount < 0)
      .sort((a, b) => a.amount - b.amount) // Most negative first
      .slice(0, 5)
      .map((p) => ({
        userName: p.userName,
        amount: round2(Math.abs(p.amount)), // Display as absolute positive value representing loss
      }));

    // 7. Calculate Top 5 Winning & Losing Markets
    const marketPLMap = {};

    sportsBets.forEach((bet) => {
      const { parentPL, clientScaled } = scaleBetClientPL(
        bet,
        bet.profitLossChange || 0
      );
      const sport = bet.gameName || 'Sports';
      const market = bet.marketName || bet.eventName || 'Unknown';
      const key = `${sport}||${market}`;
      marketPLMap[key] = (marketPLMap[key] || 0) + parentPL;
    });

    activeCasinoBets.forEach((bet) => {
      const { parentPL, clientScaled } = scaleBetClientPL(bet, getCasinoNetPL(bet));
      const sport = 'Casino';
      const market = bet.game_name || 'Casino Game';
      const key = `${sport}||${market}`;
      marketPLMap[key] = (marketPLMap[key] || 0) + parentPL;
    });

    const marketList = Object.entries(marketPLMap).map(([key, amount]) => {
      const [sport, market] = key.split('||');
      return { sport, market, amount };
    });

    const topWinningMarkets = marketList
      .filter((m) => m.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((m) => ({
        sport: m.sport,
        market: m.market,
        amount: round2(m.amount),
      }));

    const topLosingMarkets = marketList
      .filter((m) => m.amount < 0)
      .sort((a, b) => a.amount - b.amount)
      .slice(0, 5)
      .map((m) => ({
        sport: m.sport,
        market: m.market,
        amount: round2(Math.abs(m.amount)),
      }));

    // 8. Calculate User Count by Role
    const roleCounts = {};
    ['admin', 'white', 'super', 'master', 'agent', 'user'].forEach((role) => {
      roleCounts[role] = 0;
    });

    downlineUsers.forEach((user) => {
      const r = user.role || 'user';
      roleCounts[r] = (roleCounts[r] || 0) + 1;
    });

    const userCountDetails = Object.entries(roleCounts)
      .filter(([_, count]) => count > 0)
      .map(([role, count]) => ({
        role: role.charAt(0).toUpperCase() + role.slice(1),
        count,
      }));

    // 9. Calculate Sports Gameplay Details
    const sportsBreakdown = {
      Cricket: {
        sport: 'Cricket',
        totalBets: 0,
        totalBetAmount: 0,
        totalPL: 0,
      },
      Tennis: {
        sport: 'Tennis',
        totalBets: 0,
        totalBetAmount: 0,
        totalPL: 0,
      },
      Soccer: {
        sport: 'Soccer',
        totalBets: 0,
        totalBetAmount: 0,
        totalPL: 0,
      },
    };

    let otherBetsCount = 0;
    let otherBetAmount = 0;
    let otherPL = 0;

    sportsBets.forEach((bet) => {
      const sport = bet.gameName || 'Unknown';
      const sportLower = sport.toLowerCase();
      const { parentPL } = scaleBetClientPL(
        bet,
        bet.profitLossChange || 0
      );

      // Track Cricket, Tennis, Soccer in standard sports details using case-insensitive substring checks
      if (sportLower.includes('cricket')) {
        sportsBreakdown['Cricket'].totalBets += 1;
        sportsBreakdown['Cricket'].totalBetAmount += bet.betAmount || 0;
        sportsBreakdown['Cricket'].totalPL += parentPL;
      } else if (sportLower.includes('tennis')) {
        sportsBreakdown['Tennis'].totalBets += 1;
        sportsBreakdown['Tennis'].totalBetAmount += bet.betAmount || 0;
        sportsBreakdown['Tennis'].totalPL += parentPL;
      } else if (
        sportLower.includes('soccer') ||
        sportLower.includes('football')
      ) {
        sportsBreakdown['Soccer'].totalBets += 1;
        sportsBreakdown['Soccer'].totalBetAmount += bet.betAmount || 0;
        sportsBreakdown['Soccer'].totalPL += parentPL;
      } else {
        // Any other minor sports/horse/greyhound go under Others
        otherBetsCount += 1;
        otherBetAmount += bet.betAmount || 0;
        otherPL += parentPL;
      }
    });

    // Apply decimal rounding to sports gameplay details
    Object.keys(sportsBreakdown).forEach((key) => {
      sportsBreakdown[key].totalBetAmount = round2(
        sportsBreakdown[key].totalBetAmount
      );
      sportsBreakdown[key].totalPL = round2(sportsBreakdown[key].totalPL);
    });

    const othersGameplayDetails = {
      totalBets: otherBetsCount,
      totalBetAmount: round2(otherBetAmount),
      totalPL: round2(otherPL),
    };

    // 11. Calculate Casino Gameplay Details
    const casinoGameplayBreakdown = {
      'Indian Poker/ Live Casino P&L': 0,
      'Indian Poker II P&L': 0,
      'Evolution P&L': 0,
      'Vivo P&L': 0,
      'Betgames P&L': 0,
      'Casino III P&L': 0,
      'Spribe P&L': 0,
      'Mac88 P&L': 0,
      'Chicken Road P&L': 0,
      'Rvgames P&L': 0,
      'Ezugi P&L': 0,
      'Total P&L': 0,
    };

    const getCasinoCategory = (gameName, gameUid) => {
      const name = (gameName || '').toLowerCase();
      const uid = (gameUid || '').toLowerCase();

      if (name.includes('evolution') || uid.includes('evolution'))
        return 'Evolution P&L';
      if (name.includes('vivo') || uid.includes('vivo')) return 'Vivo P&L';
      if (name.includes('betgames') || uid.includes('betgames'))
        return 'Betgames P&L';
      if (
        name.includes('spribe') ||
        name.includes('aviator') ||
        uid.includes('spribe') ||
        uid.includes('aviator')
      )
        return 'Spribe P&L';
      if (
        name.includes('chicken') ||
        name.includes('inout') ||
        uid.includes('chicken') ||
        uid.includes('inout')
      )
        return 'Chicken Road P&L';
      if (name.includes('poker2') || uid.includes('poker2'))
        return 'Indian Poker II P&L';
      if (name.includes('poker') || uid.includes('poker'))
        return 'Indian Poker/ Live Casino P&L';
      if (name.includes('mac88') || uid.includes('mac88')) return 'Mac88 P&L';
      if (name.includes('casino3') || uid.includes('casino3'))
        return 'Casino III P&L';
      if (name.includes('rvgames') || uid.includes('rvgames'))
        return 'Rvgames P&L';
      if (name.includes('ezugi') || uid.includes('ezugi')) return 'Ezugi P&L';

      return 'Indian Poker/ Live Casino P&L'; // Default fallback
    };

    let casinoTotalPL = 0;
    activeCasinoBets.forEach((bet) => {
      const { parentPL } = scaleBetClientPL(bet, getCasinoNetPL(bet));
      const cat = getCasinoCategory(bet.game_name, bet.game_uid);
      casinoGameplayBreakdown[cat] =
        (casinoGameplayBreakdown[cat] || 0) + parentPL;
      casinoTotalPL += parentPL;
    });

    // Apply decimal rounding to casino gameplay details
    Object.keys(casinoGameplayBreakdown).forEach((key) => {
      casinoGameplayBreakdown[key] = round2(casinoGameplayBreakdown[key]);
    });
    casinoGameplayBreakdown['Total P&L'] = round2(casinoTotalPL);

    // 12. Send perfect response
    return res.status(200).json({
      success: true,
      data: {
        header: {
          pl: round2(roundMoney(headerPL)),
          commission: round2(totalCommission),
          deposit: round2(totalDeposit),
          depositCount: deposits.length + openingBalanceDeposits.length,
          withdrawal: round2(totalWithdrawal),
          withdrawalCount: withdrawals.length,
          totalBets: totalBetsCount,
          sportbookPL: 0, // No sportbook API — reserved for future integration
        },
        topWinningPlayers,
        topLosingPlayers,
        topWinningMarkets,
        topLosingMarkets,
        userCount: userCountDetails,
        sportsGameplay: sportsBreakdown,
        othersGameplay: othersGameplayDetails,
        casinoGameplay: casinoGameplayBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};
