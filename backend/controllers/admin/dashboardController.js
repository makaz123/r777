import SubAdmin from '../../models/subAdminModel.js';
import betHistoryModel from '../../models/betHistoryModel.js';
import DepositHistory from '../../models/depositeHistoryModel.js';
import TransactionHistory from '../../models/transtionHistoryModel.js';
import WithdrawalHistory from '../../models/withdrawalHistoryModel.js';
import CasinoBetHistory from '../../models/casinoBetHistory.model.js';
import { getDateRangeUTC } from '../../utils/dateUtils.js';

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
  const { startDate, endDate } = req.query;

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
            withdrawal: 0,
            totalBets: 0,
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
    const [sportsBets, casinoBets, deposits, openingBalanceDeposits, withdrawals] =
      await Promise.all([
      // Sports Bets
      betHistoryModel
        .find({
          userId: { $in: downlineIds },
          status: { $in: [0, 1, 2] }, // Placed (0) and settled (1, 2) bets
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

    // 5. Calculate Header Card Totals
    let totalSportsPL = 0;
    let totalSportsBetAmount = 0;
    const totalSportsBets = sportsBets.length;

    sportsBets.forEach((bet) => {
      totalSportsPL += bet.profitLossChange || 0;
      totalSportsBetAmount += bet.betAmount || 0;
    });

    let totalCasinoPL = 0;
    let totalCasinoBetAmount = 0;
    const totalCasinoBets = casinoBets.length;

    casinoBets.forEach((bet) => {
      totalCasinoPL += bet.change || 0;
      totalCasinoBetAmount += bet.bet_amount || 0;
    });

    const netPL = totalSportsPL + totalCasinoPL;
    const totalBetsCount = totalSportsBets + totalCasinoBets;

    const totalDeposit =
      deposits.reduce((sum, d) => sum + (d.amount || 0), 0) +
      openingBalanceDeposits.reduce((sum, t) => sum + (t.deposite || 0), 0);
    const totalWithdrawal = withdrawals.reduce(
      (sum, w) => sum + (w.amount || 0),
      0
    );

    const totalCommission = downlineUsers.reduce(
      (sum, u) => sum + (u.commissionEarned || 0),
      0
    );

    // 6. Calculate Top 5 Winning & Losing Players
    const playerPLMap = {};
    downlineUserNames.forEach((uName) => {
      playerPLMap[uName] = 0;
    });

    sportsBets.forEach((bet) => {
      const uName = bet.userName;
      if (uName) {
        playerPLMap[uName] =
          (playerPLMap[uName] || 0) + (bet.profitLossChange || 0);
      }
    });

    casinoBets.forEach((bet) => {
      const uName = bet.userName;
      if (uName) {
        playerPLMap[uName] = (playerPLMap[uName] || 0) + (bet.change || 0);
      }
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
      const sport = bet.gameName || 'Sports';
      const market = bet.eventName || bet.marketName || 'Unknown';
      const key = `${sport}||${market}`;
      marketPLMap[key] = (marketPLMap[key] || 0) + (bet.profitLossChange || 0);
    });

    casinoBets.forEach((bet) => {
      const sport = 'Casino';
      const market = bet.game_name || 'Casino Game';
      const key = `${sport}||${market}`;
      marketPLMap[key] = (marketPLMap[key] || 0) + (bet.change || 0);
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

      // Track Cricket, Tennis, Soccer in standard sports details using case-insensitive substring checks
      if (sportLower.includes('cricket')) {
        sportsBreakdown['Cricket'].totalBets += 1;
        sportsBreakdown['Cricket'].totalBetAmount += bet.betAmount || 0;
        sportsBreakdown['Cricket'].totalPL += bet.profitLossChange || 0;
      } else if (sportLower.includes('tennis')) {
        sportsBreakdown['Tennis'].totalBets += 1;
        sportsBreakdown['Tennis'].totalBetAmount += bet.betAmount || 0;
        sportsBreakdown['Tennis'].totalPL += bet.profitLossChange || 0;
      } else if (
        sportLower.includes('soccer') ||
        sportLower.includes('football')
      ) {
        sportsBreakdown['Soccer'].totalBets += 1;
        sportsBreakdown['Soccer'].totalBetAmount += bet.betAmount || 0;
        sportsBreakdown['Soccer'].totalPL += bet.profitLossChange || 0;
      } else {
        // Any other minor sports/horse/greyhound go under Others
        otherBetsCount += 1;
        otherBetAmount += bet.betAmount || 0;
        otherPL += bet.profitLossChange || 0;
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
    casinoBets.forEach((bet) => {
      const cat = getCasinoCategory(bet.game_name, bet.game_uid);
      casinoGameplayBreakdown[cat] =
        (casinoGameplayBreakdown[cat] || 0) + (bet.change || 0);
      casinoTotalPL += bet.change || 0;
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
          pl: round2(netPL),
          commission: round2(totalCommission),
          deposit: round2(totalDeposit),
          withdrawal: round2(totalWithdrawal),
          totalBets: totalBetsCount,
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
