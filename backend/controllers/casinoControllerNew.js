import axios from 'axios';

import SubAdmin from '../models/subAdminModel.js';
import { updateAllUplines } from './admin/subAdminController.js';
import { sendToUser, sendUserRefresh } from '../socket/bettingSocket.js';
import { decrypt, encrypt } from '../utils/casinoCrypto.js';
// 🔧 Casino API Configuration
const API_TOKEN = process.env.CASINO_API_TOKEN;
const API_SECRET = process.env.CASINO_API_SECRET;
const SERVER_URL = process.env.CASINO_API_URL;

// . Start Casino Game
export const startCasinoGame = async (req, res) => {
  try {
    const { userName, game_uid, credit_amount } = req.body;

    // Validate required fields
    if (!userName || !game_uid || !credit_amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userName, game_uid, credit_amount',
      });
    }

    //  Find the subadmin/user before launching game
    const subAdmin = await SubAdmin.findOne({ userName });
    if (!subAdmin) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    const roundedBalance = Math.round(subAdmin.avbalance * 100) / 100;
    const roundedCreditAmount =
      Math.round(parseFloat(credit_amount) * 100) / 100;

    if (roundedBalance < roundedCreditAmount) {
      console.log('subadmin balance', subAdmin.avbalance);
      console.log('credit amount', credit_amount);
      console.log('rounded balance', roundedBalance);
      console.log('rounded credit amount', roundedCreditAmount);
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    const timestamp = Math.round(Date.now());

    // 🔧 Create payload exactly like PHP code
    const requestData = {
      user_id: userName, // Using userName as user_id
      wallet_amount: parseFloat(credit_amount),
      game_uid: game_uid,
      token: API_TOKEN,
      timestamp: timestamp,
    };

    console.log('🔹 Request data:', requestData);

    // 🔧 Encrypt the payload using the secret key
    const message = JSON.stringify(requestData);
    const encryptedPayload = encrypt(message); // This uses your existing encrypt function

    // 🔧 Build URL with parameters (like PHP code)
    const gameUrl =
      `${SERVER_URL}/launch_game?` +
      `user_id=${encodeURIComponent(userName)}` +
      `&wallet_amount=${encodeURIComponent(credit_amount)}` +
      `&game_uid=${encodeURIComponent(game_uid)}` +
      `&token=${encodeURIComponent(API_TOKEN)}` +
      `&timestamp=${encodeURIComponent(timestamp)}` +
      `&payload=${encodeURIComponent(encryptedPayload)}`;

    console.log('🔹 Generated game URL:', gameUrl);

    // 🔧 Return the game URL for frontend to redirect
    return res.json({
      success: true,
      gameUrl: gameUrl,
      message: 'Game URL generated successfully',
    });
  } catch (error) {
    console.error('❌ Casino launch error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message,
    });
  }
};

import CasinoBetHistory from '../models/casinoBetHistory.model.js';
import { getDateRangeUTC } from '../utils/dateUtils.js';
import { hasCasinoRoundActivity } from '../utils/casinoPlUtils.js';

/** Map live-casino round to client bet-history table row shape. */
export const mapCasinoBetToClientHistoryRow = (cb) => ({
  _id: cb._id,
  userId: cb.userId,
  userName: cb.userName,
  gameName: 'Casino',
  eventName: cb.game_name || cb.game_uid || 'Casino Game',
  marketName: `Round ${cb.game_round}`,
  teamName: cb.game_name || '-',
  xValue: '-',
  otype: 'back',
  price: cb.bet_amount ?? 0,
  betAmount: cb.bet_amount ?? 0,
  createdAt: cb.createdAt,
  betType: 'live_casino',
  resultAmount: Math.abs(cb.change || 0),
  profitLossChange: cb.change || 0,
  status: (cb.change || 0) >= 0 ? 1 : 2,
});

/**
 * Live casino rounds for user bet-history page (separate from sports betHistory).
 */
export const fetchUserLiveCasinoBetsForHistory = async ({
  userId,
  startDate,
  endDate,
  selectedVoid = 'unsettel',
}) => {
  const query = {
    userId: String(userId),
    $or: [{ bet_amount: { $gt: 0 } }, { win_amount: { $gt: 0 } }],
  };

  if (startDate && endDate) {
    query.createdAt = getDateRangeUTC(startDate, endDate);
  }

  if (selectedVoid === 'unsettel') {
    query.bet_amount = { $gt: 0 };
    query.win_amount = 0;
  } else if (selectedVoid === 'settel') {
    query.win_amount = { $gt: 0 };
  } else if (selectedVoid === 'void') {
    return [];
  }

  const rows = await CasinoBetHistory.find(query)
    .sort({ createdAt: -1 })
    .lean();

  return rows
    .filter(hasCasinoRoundActivity)
    .map(mapCasinoBetToClientHistoryRow);
};

// export const casinoCallback = async (req, res) => {
//   try {
//     console.log('callback headers:', req.headers);
//     console.log('callback raw body:', req.body);

//     // If provider sends encrypted payload JSON
//     // if (req.body && req.body.payload) {
//     //   const data = decrypt(req.body.payload);
//     //   console.log('decrypted payload:', data);

//     //   const { member_account, bet_amount, win_amount, game_uid, game_round, timestamp, currency_code, wallet_before, wallet_after, change } = data || {};
//     //   if (!member_account) return res.json({ code: 1, msg: 'Member account not found in payload' });

//     //   const subAdmin = await SubAdmin.findOne({ userName: member_account });
//     //   if (!subAdmin) return res.json({ code: 1, msg: 'User not found' });

//     //   const oldBalance = subAdmin.avbalance || 0;
//     //   const bet = Number(bet_amount || 0);
//     //   const win = Number(win_amount || 0);
//     //   const newBalance = oldBalance - bet + win;

//     //   subAdmin.avbalance = newBalance;
//     //   await subAdmin.save();

//     //   // Check if record already exists
//     //   const existingBet = await CasinoBetHistory.findOne({
//     //     userName: member_account,
//     //     game_round: game_round || 'n/a'
//     //   });

//     //   // Only save/update if:
//     //   // 1. Record doesn't exist AND (bet > 0 OR win > 0)
//     //   // 2. Record exists AND win > 0 (win settlement update)
//     //   // Skip zero-value status callbacks that overwrite real bets
//     //   const shouldSave = !existingBet
//     //     ? (bet > 0 || win > 0)
//     //     : (win > 0 || (existingBet.bet_amount === 0 && bet > 0));

//     //   if (shouldSave) {
//     //     await CasinoBetHistory.findOneAndUpdate(
//     //       { userName: member_account, game_round: game_round || 'n/a' },
//     //       {
//     //         $setOnInsert: {
//     //           userId: subAdmin._id.toString(),
//     //           userName: member_account,
//     //           game_uid: game_uid || 'n/a',
//     //           game_round: game_round || 'n/a',
//     //         },
//     //         $set: {
//     //           bet_amount: bet,
//     //           win_amount: win,
//     //           change: Number(change || (wallet_after ? Number(wallet_after) - Number(wallet_before || oldBalance) : (win - bet))),
//     //           wallet_before: Number(wallet_before || oldBalance),
//     //           wallet_after: Number(wallet_after || newBalance),
//     //           currency_code: currency_code || 'BDT',
//     //           token: data.token,
//     //           provider_timestamp: timestamp ? new Date(timestamp) : new Date(),
//     //           providerRaw: data,
//     //           processedAt: new Date(),
//     //         }
//     //       },
//     //       { upsert: true, new: true }
//     //     );
//     //   } else {
//     //     console.log(`⏭️ Skipping zero-value callback for game_round: ${game_round}`);
//     //   }

//     //   return res.json({ code: 0, msg: 'success' });
//     // }

//     // Handle plain form-encoded fields (your current callback format)
//     const {
//       mobile,
//       bet_amount,
//       win_amount,
//       game_uid,
//       game_name,
//       game_round,
//       token,
//       wallet_before,
//       wallet_after,
//       change,
//       timestamp,
//       currency_code,
//     } = req.body || {};

//     if (!mobile) return res.json({ code: 1, msg: 'No mobile provided' });

//     // ✅ Find SubAdmin by userName (mobile maps to userName)
//     const subAdmin = await SubAdmin.findOne({ userName: mobile });
//     if (!subAdmin) return res.json({ code: 1, msg: 'User not found' });

//     const bet = Number(bet_amount || 0);
//     const win = Number(win_amount || 0);
//     const oldBalance = subAdmin.avbalance || 0;
//     console.log("oldBalance", oldBalance);
//     console.log("bet", bet);
//     console.log("win", win);
//     const newBalance = oldBalance - bet + win;
//     console.log("newBalance", newBalance);
//     subAdmin.avbalance = newBalance;
//     await subAdmin.save();

//     // Send balance update via WebSocket
//     // sendToUser(subAdmin.userName, {
//     //   type: "balance_update",
//     //   userName: subAdmin.userName,
//     //   newBalance: subAdmin.avbalance
//     // });

//     // ✅ Check if record already exists
//     const existingBet = await CasinoBetHistory.findOne({
//       userName: mobile,
//       game_round: game_round || 'n/a'
//     });

//     // ✅ Only save/update if:
//     // 1. Record doesn't exist AND (bet > 0 OR win > 0) - create new bet record
//     // 2. Record exists AND win > 0 - update with win settlement
//     // 3. Record exists but has bet_amount = 0 AND bet > 0 - update with actual bet
//     // Skip zero-value status callbacks that would overwrite real bets
//     const shouldSave = !existingBet
//       ? (bet > 0 || win > 0)
//       : (win > 0 || (existingBet.bet_amount === 0 && bet > 0));

//     if (shouldSave) {
//        // Send user refresh request to trigger full user data refresh in frontend
//       sendUserRefresh(subAdmin._id.toString());
//       // ✅ Save/Update casino bet history with userId
//       await CasinoBetHistory.findOneAndUpdate(
//         { userName: mobile, game_round: game_round || 'n/a' },
//         {
//           $setOnInsert: {
//             userId: subAdmin._id.toString(), // Store SubAdmin._id as userId
//             userName: mobile, // mobile = userName in SubAdmin
//             game_uid: game_uid || 'n/a',
//             game_round: game_round || 'n/a',
//             game_name: game_name || 'n/a',
//           },
//           $set: {
//             bet_amount: bet,
//             win_amount: win,
//             change: Number(change || (wallet_after ? Number(wallet_after) - Number(wallet_before || oldBalance) : (win - bet))),
//             wallet_before: Number(wallet_before || oldBalance),
//             wallet_after: Number(wallet_after || newBalance),
//             currency_code: currency_code || 'BDT',
//             token: token,
//             provider_timestamp: timestamp ? new Date(timestamp) : new Date(),
//             providerRaw: req.body, // Store full raw payload
//             processedAt: new Date(),
//           }
//         },
//         { upsert: true, new: true } // Prevent duplicates on retry
//       );

//       console.log(`🎰 Casino bet saved: ${mobile} - Bet: ${bet}, Win: ${win}, New Balance: ${newBalance}`);
//     } else {
//       console.log(`⏭️ Skipping zero-value callback for ${mobile} - game_round: ${game_round} (existing bet_amount: ${existingBet?.bet_amount})`);
//     }

//     return res.json({ code: 0, msg: 'success' });
//   } catch (error) {
//     console.error('Casino callback error:', error);
//     return res.json({ code: 1, msg: `callback error: ${error.message}` });
//   }
// };

// export const casinoCallback = async (req, res) => {
//   try {
//     console.log("🎰 Casino callback:", req.body);

//     const {
//       mobile,
//       bet_amount,
//       win_amount,
//       game_uid,
//       game_name,
//       game_round,
//       wallet_before,
//       wallet_after,
//       change,
//       token,
//       timestamp,
//       currency_code
//     } = req.body || {};

//     if (!mobile || !game_round) {
//       return res.json({ code: 1, msg: "Invalid payload" });
//     }

//     const bet = Number(bet_amount || 0);
//     const win = Number(win_amount || 0);

//     const subAdmin = await SubAdmin.findOne({ userName: mobile });
//     if (!subAdmin) {
//       return res.json({ code: 1, msg: "User not found" });
//     }

//     // 🔒 Find existing bet record
//     let betRecord = await CasinoBetHistory.findOne({
//       userName: mobile,
//       game_round
//     });

//     /* -------------------------------------------------
//        1️⃣ BET CALLBACK (bet placed)
//     --------------------------------------------------*/
//     if (bet > 0 && !betRecord) {
//       // ✅ Deduct balance ONCE
//       subAdmin.avbalance = Number(wallet_after);
//       await subAdmin.save();

//       betRecord = await CasinoBetHistory.create({
//         userId: subAdmin._id.toString(),
//         userName: mobile,
//         game_uid,
//         game_name,
//         game_round,
//         bet_amount: bet,
//         win_amount: 0,
//         change: Number(change || -bet),
//         wallet_before: Number(wallet_before),
//         wallet_after: Number(wallet_after),
//         currency_code: currency_code || "BDT",
//         token,
//         provider_timestamp: timestamp ? new Date(timestamp) : new Date(),
//         providerRaw: req.body,
//         processedAt: new Date()
//       });

//       sendUserRefresh(subAdmin._id.toString());

//       console.log(`✅ BET stored | ${mobile} | Bet: ${bet}`);
//     }

//     /* -------------------------------------------------
//        2️⃣ WIN CALLBACK (round settled)
//     --------------------------------------------------*/
//     else if (win > 0 && betRecord && betRecord.win_amount === 0) {
//       // ✅ Credit balance ONCE
//       subAdmin.avbalance = Number(wallet_after);
//       await subAdmin.save();

//       betRecord.win_amount = win;
//       betRecord.change = Number(change || win);
//       betRecord.wallet_after = Number(wallet_after);
//       betRecord.providerRaw = req.body;
//       betRecord.processedAt = new Date();

//       await betRecord.save();

//       sendUserRefresh(subAdmin._id.toString());

//       console.log(`🏆 WIN stored | ${mobile} | Win: ${win}`);
//     }

//     /* -------------------------------------------------
//        3️⃣ IGNORE DUPLICATE / STATUS CALLBACKS
//     --------------------------------------------------*/
//     else {
//       console.log(
//         `⏭️ Ignored callback | ${mobile} | bet=${bet}, win=${win}, round=${game_round}`
//       );
//     }

//     return res.json({ code: 0, msg: "success" });

//   } catch (err) {
//     console.error("❌ Casino callback error:", err);
//     return res.json({ code: 1, msg: err.message });
//   }
// };

export const casinoCallback = async (req, res) => {
  try {
    console.log('🎰 Casino callback:', req.body);

    const {
      mobile,
      bet_amount,
      win_amount,
      game_uid,
      game_name,
      game_round,
      wallet_before,
      wallet_after,
      change,
      token,
      timestamp,
      currency_code,
    } = req.body || {};

    if (!mobile || !game_round) {
      return res.json({ code: 1, msg: 'Invalid payload' });
    }

    const bet = Number(bet_amount || 0);
    const win = Number(win_amount || 0);

    // 🔒 Find existing bet record first
    let betRecord = await CasinoBetHistory.findOne({
      userName: mobile,
      game_round,
    });

    /* -------------------------------------------------
       1️⃣ BET CALLBACK (bet placed)
    --------------------------------------------------*/
    if (bet > 0 && !betRecord) {
      // ✅ Fetch fresh user to get current balance
      const currentUser = await SubAdmin.findOne({ userName: mobile });
      if (!currentUser) {
        return res.json({ code: 1, msg: 'User not found' });
      }

      // ✅ Calculate balance change: wallet_after - wallet_before, or fallback to win - bet
      let balanceChange = win - bet;
      if (wallet_after !== undefined && wallet_before !== undefined) {
        const calculatedChange = Number(wallet_after) - Number(wallet_before);
        if (!isNaN(calculatedChange)) {
          balanceChange = calculatedChange;
        }
      }

      // ✅ Update BOTH balance and avbalance to maintain consistency
      const updatedUser = await SubAdmin.findOneAndUpdate(
        { userName: mobile },
        {
          $inc: {
            balance: balanceChange, // Update balance
            avbalance: balanceChange, // Update avbalance by same amount
            bettingProfitLoss: balanceChange, // Keep P/L in sync for reporting
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedUser) {
        return res.json({ code: 1, msg: 'User not found' });
      }

      console.log(
        `💰 Balance updated | ${mobile} | Balance: ${updatedUser.balance} | AvBalance: ${updatedUser.avbalance} | Change: ${balanceChange}`
      );

      betRecord = await CasinoBetHistory.create({
        userId: updatedUser._id.toString(),
        userName: mobile,
        game_uid,
        game_name,
        game_round,
        bet_amount: bet,
        win_amount: win,
        change: Number(change || balanceChange),
        wallet_before: Number(wallet_before || currentUser.avbalance),
        wallet_after: Number(updatedUser.avbalance),
        currency_code: currency_code || 'BDT',
        token,
        provider_timestamp: timestamp ? new Date(timestamp) : new Date(),
        providerRaw: req.body,
        processedAt: new Date(),
      });

      sendUserRefresh(updatedUser._id.toString());

      // Partnership cascade for all markets; no match-odds commission on casino
      try {
        await updateAllUplines(updatedUser._id.toString());
      } catch (uplineErr) {
        console.error(
          '[CASINO] updateAllUplines after bet:',
          uplineErr.message
        );
      }

      console.log(`✅ BET stored | ${mobile} | Bet: ${bet} | Win: ${win}`);
    } else if (win > 0 && betRecord && betRecord.win_amount === 0) {
      /* -------------------------------------------------
       2️⃣ WIN CALLBACK (round settled)
    --------------------------------------------------*/
      // ✅ Fetch fresh user to get current balance
      const currentUser = await SubAdmin.findOne({ userName: mobile });
      if (!currentUser) {
        return res.json({ code: 1, msg: 'User not found' });
      }

      // ✅ Calculate balance change: wallet_after - current avbalance, or fallback to win
      let balanceChange = win;
      if (wallet_after !== undefined) {
        const calculatedChange =
          Number(wallet_after) - Number(currentUser.avbalance);
        if (!isNaN(calculatedChange)) {
          balanceChange = calculatedChange;
        }
      }

      // ✅ Update BOTH balance and avbalance to maintain consistency
      const updatedUser = await SubAdmin.findOneAndUpdate(
        { userName: mobile },
        {
          $inc: {
            balance: balanceChange, // Update balance
            avbalance: balanceChange, // Update avbalance by same amount
            bettingProfitLoss: balanceChange, // Keep P/L in sync for reporting
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedUser) {
        return res.json({ code: 1, msg: 'User not found' });
      }

      console.log(
        `💰 Balance updated | ${mobile} | Balance: ${updatedUser.balance} | AvBalance: ${updatedUser.avbalance} | Win: ${win} | Change: ${balanceChange}`
      );

      betRecord.win_amount = win;
      const stake = Number(betRecord.bet_amount || bet) || 0;
      const netRoundPL = win - stake;
      betRecord.change = Number(
        change !== undefined && change !== null && change !== ''
          ? change
          : netRoundPL
      );
      betRecord.wallet_after = Number(updatedUser.avbalance);
      betRecord.providerRaw = req.body;
      betRecord.processedAt = new Date();

      await betRecord.save();

      sendUserRefresh(updatedUser._id.toString());

      // Partnership cascade only — commission on winning is match odds only, not casino
      try {
        await updateAllUplines(updatedUser._id.toString());
      } catch (uplineErr) {
        console.error(
          '[CASINO] updateAllUplines after win:',
          uplineErr.message
        );
      }

      console.log(`🏆 WIN stored | ${mobile} | Win: ${win}`);
    } else {
      /* -------------------------------------------------
       3️⃣ IGNORE DUPLICATE / STATUS CALLBACKS
    --------------------------------------------------*/
      console.log(
        `⏭️ Ignored callback | ${mobile} | bet=${bet}, win=${win}, round=${game_round}`
      );
    }

    return res.json({ code: 0, msg: 'success' });
  } catch (err) {
    console.error('❌ Casino callback error:', err);
    console.error('❌ Error stack:', err.stack);
    return res.json({ code: 1, msg: err.message });
  }
};

// 🔍 Debug encryption/decryption
export const debugEncryption = async (req, res) => {
  try {
    console.log('🔍 Starting debug encryption test...');

    const testData = {
      user_id: 'user12',
      wallet_amount: 100,
      game_uid: '1',
      token: '31417734-0bde-4dd7-8691-0d5a5a',
      timestamp: Math.round(Date.now()),
    };

    console.log('🔍 Original data:', testData);

    // Test encryption
    const message = JSON.stringify(testData);
    console.log('🔍 JSON string:', message);

    console.log('🔍 About to encrypt...');
    const encrypted = encrypt(message);
    console.log('🔍 Encrypted:', encrypted);

    console.log('🔍 About to decrypt...');
    const decrypted = decrypt(encrypted);
    console.log('🔍 Decrypted:', decrypted);

    // Test if they match
    const isMatch = JSON.stringify(testData) === JSON.stringify(decrypted);
    console.log('🔍 Encryption/Decryption match:', isMatch);

    res.json({
      original: testData,
      jsonString: message,
      encrypted: encrypted,
      decrypted: decrypted,
      isMatch: isMatch,
    });
  } catch (error) {
    console.error('🔍 Debug encryption error:', error.message);
    console.error('🔍 Full error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 🔍 Simple test without encryption
export const debugSimple = async (req, res) => {
  try {
    console.log('🔍 Simple test - no encryption');

    const testData = {
      user_id: 'user12',
      wallet_amount: 100,
      game_uid: '1',
      token: '31417734-0bde-4dd7-8691-0d5a5a',
      timestamp: Math.round(Date.now()),
    };

    const message = JSON.stringify(testData);
    console.log('🔍 JSON string:', message);

    res.json({
      success: true,
      message: 'Simple test successful',
      data: testData,
      jsonString: message,
    });
  } catch (error) {
    console.error('🔍 Simple test error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get Casino Bet History by User ID
export const getCasinoBetHistory = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from URL params
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Build query — only real casino rounds
    const query = {
      userId: userId,
      $or: [{ bet_amount: { $gt: 0 } }, { win_amount: { $gt: 0 } }],
    };

    // Add date filtering if provided
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    // Get bets with pagination
    const bets = await CasinoBetHistory.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await CasinoBetHistory.countDocuments(query);

    // Calculate totals
    const totalBetAmount = await CasinoBetHistory.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$bet_amount' } } },
    ]);

    const totalWinAmount = await CasinoBetHistory.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$win_amount' } } },
    ]);

    res.status(200).json({
      success: true,
      data: bets,
      summary: {
        totalBetAmount: totalBetAmount[0]?.total || 0,
        totalWinAmount: totalWinAmount[0]?.total || 0,
        netResult:
          (totalWinAmount[0]?.total || 0) - (totalBetAmount[0]?.total || 0),
      },
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching casino bet history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Get All Casino Bet History with Downline Tree
// export const getAllDownlineCasinoBetHistory = async (req, res) => {
//   try {
//     // Allow id from auth middleware, request body, or query params
//     let id = req.id || req.body.id || req.query.id;

//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: "User ID is required"
//       });
//     }

//     const { startDate, endDate, page, limit } = req.query;

//     // Find the admin
//     const admin = await SubAdmin.findById(id);
//     if (!admin) {
//       return res.status(404).json({
//         success: false,
//         message: "Admin not found"
//       });
//     }

//     // Get all downline users (recursive) - same pattern as getAllDownlineBets
//     let queue = [admin.code];
//     let userIds = [];

//     while (queue.length > 0) {
//       const currentCode = queue.shift();

//       const downlineUsers = await SubAdmin.find({ invite: currentCode });

//       for (const user of downlineUsers) {
//         // Collect all users (unlike sports betting which only collects role === "user")
//         userIds.push(user._id.toString());

//         // Add agent/admin code to queue to go deeper
//         queue.push(user.code);
//       }
//     }

//     // ✅ If no downlines found, include only the user itself
//     if (userIds.length === 0) {
//       userIds = [admin._id.toString()];
//     }

//     // Build filter
//     const filter = { userId: { $in: userIds } };

//     // Add date filter if provided
//     if (startDate && endDate) {
//       const start = new Date(startDate);
//       const end = new Date(endDate);
//       end.setDate(end.getDate() + 1);
//       filter.createdAt = { $gte: start, $lte: end };
//     }

//     // Pagination
//     const pageNum = parseInt(page) || 1;
//     const limitNum = parseInt(limit) || 10;

//     // Fetch casino bet history for all collected users
//     const betData = await CasinoBetHistory.find(filter)
//       .sort({ createdAt: -1 })
//       .skip((pageNum - 1) * limitNum)
//       .limit(limitNum);

//     const totalCount = await CasinoBetHistory.countDocuments(filter);

//     return res.status(200).json({
//       success: true,
//       totalUsers: userIds.length,
//       totalBets: betData.length,
//       data: betData,
//       pagination: {
//         total: totalCount,
//         page: pageNum,
//         limit: limitNum,
//         pages: Math.ceil(totalCount / limitNum)
//       }
//     });

//   } catch (error) {
//     console.error("Error fetching casino bet history:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };

export const getAllDownlineCasinoBetHistory = async (req, res) => {
  try {
    const id = req.id || req.body.id || req.query.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    // 1️⃣ Get admin
    const admin = await SubAdmin.findById(id).select('_id code');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // 2️⃣ Get all downline userIds using graphLookup (🔥 FAST)
    const hierarchy = await SubAdmin.aggregate([
      { $match: { _id: admin._id } },
      {
        $graphLookup: {
          from: 'subadmins',
          startWith: '$code',
          connectFromField: 'code',
          connectToField: 'invite',
          as: 'downlines',
          depthField: 'level',
        },
      },
      {
        $project: {
          userIds: {
            $concatArrays: [
              [{ $toString: '$_id' }],
              {
                $map: {
                  input: '$downlines',
                  as: 'd',
                  in: { $toString: '$$d._id' },
                },
              },
            ],
          },
        },
      },
    ]);

    const userIds = hierarchy[0]?.userIds || [admin._id.toString()];

    // 3️⃣ Build filter
    const filter = { userId: { $in: userIds } };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);

      filter.createdAt = { $gte: start, $lte: end };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // 4️⃣ Fetch data + count in parallel (⚡)
    const [betData, totalCount] = await Promise.all([
      CasinoBetHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      CasinoBetHistory.countDocuments(filter),
    ]);

    // Flip change to show Admin P&L (bet - win) instead of User P&L (win - bet)
    const adminPerspectiveData = betData.map((bet) => ({
      ...bet,
      change: -(bet.change || 0),
    }));

    return res.status(200).json({
      success: true,
      totalUsers: userIds.length,
      totalBets: betData.length,
      data: adminPerspectiveData,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error('Casino bet history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Get All Casino Profit/Loss Report

export const getAllCasinoProfitLoss = async (req, res) => {
  try {
    const { userId } = req.params; // User ID from URL params
    const { startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // 1️⃣ Find the target user
    const targetUser = await SubAdmin.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 2️⃣ Get only DIRECT downline users (just below, not recursive)
    let downlineResult = [];

    if (targetUser.role === 'user') {
      // If user is a regular user, include only themselves
      downlineResult = [targetUser];
    } else {
      // Get direct downlines only
      downlineResult = await SubAdmin.find({
        invite: targetUser.code,
        status: { $ne: 'delete' },
      });
    }

    if (downlineResult.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: {
          stake: 0,
          casinoPL: 0,
          internationalCasinoPL: 0,
          uplinePL: 0,
        },
      });
    }

    // 3️⃣ For each direct downline, get ALL their descendants and aggregate casino P/L
    const userPLReport = [];

    for (const downline of downlineResult) {
      // Get all descendants of this downline (recursive)
      const descendantsAggregation = await SubAdmin.aggregate([
        { $match: { _id: downline._id } },
        {
          $graphLookup: {
            from: 'subadmins',
            startWith: '$code',
            connectFromField: 'code',
            connectToField: 'invite',
            as: 'descendants',
          },
        },
      ]);

      // Extract all descendant IDs including the downline itself
      const descendantIds =
        descendantsAggregation[0]?.descendants.map((u) => u._id.toString()) ||
        [];
      if (!descendantIds.includes(downline._id.toString())) {
        descendantIds.push(downline._id.toString());
      }

      // Build date filter
      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        };
      }

      // Aggregate casino P/L for this downline + all their descendants
      const casinoPLData = await CasinoBetHistory.aggregate([
        {
          $match: {
            userId: { $in: descendantIds },
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: null,
            totalStake: { $sum: '$bet_amount' },
            totalChange: { $sum: '$change' },
          },
        },
      ]);

      const plData = casinoPLData[0] || { totalStake: 0, totalChange: 0 };
      const casinoPL = -(plData.totalChange || 0); // Flipped to Admin P&L

      userPLReport.push({
        userId: downline._id.toString(),
        userName: downline.userName || '',
        role: downline.role || '',
        stake: plData.totalStake || 0,
        casinoPL: casinoPL,
        internationalCasinoPL: 0,
        uplinePL: -casinoPL || 0,
      });
    }

    // 4️⃣ Calculate totals
    const totals = {
      stake: 0,
      casinoPL: 0,
      internationalCasinoPL: 0,
      uplinePL: 0,
    };

    userPLReport.forEach((item) => {
      totals.stake += item.stake;
      totals.casinoPL += item.casinoPL;
      totals.internationalCasinoPL += item.internationalCasinoPL;
      totals.uplinePL += item.uplinePL;
    });

    // 5️⃣ Sort by userName
    userPLReport.sort((a, b) =>
      (a.userName || '').localeCompare(b.userName || '')
    );

    // 6️⃣ Return response
    res.status(200).json({
      success: true,
      data: userPLReport,
      total: totals,
    });
  } catch (error) {
    console.error('Error fetching casino profit/loss:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Get Casino Profit/Loss Report Grouped by Date
export const getCasinoProfitLossByDate = async (req, res) => {
  try {
    const { userId } = req.params; // User ID from URL params
    const { startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    // 1️⃣ Find the target user
    const targetUser = await SubAdmin.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 2️⃣ Get ALL downlines (direct + recursive) for the target user
    let allDownlineIds = [];

    if (targetUser.role === 'user') {
      // If user is a regular user, include only themselves
      allDownlineIds = [targetUser._id.toString()];
    } else {
      // Get direct downlines
      let downlineResult = await SubAdmin.find({
        invite: targetUser.code,
        status: { $ne: 'delete' },
      });

      // For each direct downline, get ALL their descendants (recursive)
      for (const downline of downlineResult) {
        const descendantsAggregation = await SubAdmin.aggregate([
          { $match: { _id: downline._id } },
          {
            $graphLookup: {
              from: 'subadmins',
              startWith: '$code',
              connectFromField: 'code',
              connectToField: 'invite',
              as: 'descendants',
            },
          },
        ]);

        // Extract all descendant IDs including the downline itself
        const descendantIds =
          descendantsAggregation[0]?.descendants.map((u) => u._id.toString()) ||
          [];
        if (!descendantIds.includes(downline._id.toString())) {
          descendantIds.push(downline._id.toString());
        }

        allDownlineIds = [...allDownlineIds, ...descendantIds];
      }
    }

    if (allDownlineIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: {
          stake: 0,
          downlinePL: 0,
          playerPL: 0,
          commission: 0,
          uplinePL: 0,
        },
      });
    }

    // 3️⃣ Build date filter (using local timezone, not UTC)
    const startParts = startDate.split('-');
    const endParts = endDate.split('-');

    const start = new Date(
      parseInt(startParts[0]),
      parseInt(startParts[1]) - 1,
      parseInt(startParts[2]),
      0,
      0,
      0,
      0
    );
    const end = new Date(
      parseInt(endParts[0]),
      parseInt(endParts[1]) - 1,
      parseInt(endParts[2]),
      23,
      59,
      59,
      999
    );

    // 4️⃣ Aggregate casino P/L grouped by date
    const datePLData = await CasinoBetHistory.aggregate([
      {
        $match: {
          userId: { $in: allDownlineIds },
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'Asia/Kolkata', // Use IST timezone or adjust to your server timezone
            },
          },
          bet_amount: 1,
          change: 1,
        },
      },
      {
        $group: {
          _id: '$date',
          stake: { $sum: '$bet_amount' },
          casinoPL: { $sum: '$change' },
        },
      },
      {
        $sort: { _id: 1 }, // Sort by date ascending
      },
    ]);

    // 5️⃣ Generate all dates in the range and fill missing dates with zeros
    const allDatesMap = new Map();

    // Initialize map with all dates in range (set to zero)
    const currentDate = new Date(start);
    while (currentDate <= end) {
      // Format date as YYYY-MM-DD without timezone conversion
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      allDatesMap.set(dateStr, {
        uid: dateStr,
        stake: 0,
        downlinePL: 0,
        playerPL: 0,
        commission: 0,
        uplinePL: 0,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fill in actual data from aggregation
    datePLData.forEach((item) => {
      const casinoPL = item.casinoPL || 0;
      allDatesMap.set(item._id, {
        uid: item._id,
        stake: item.stake || 0,
        downlinePL: casinoPL,
        playerPL: casinoPL,
        commission: 0,
        uplinePL: -casinoPL,
      });
    });

    // Convert map to array and sort by date
    const formattedData = Array.from(allDatesMap.values()).sort((a, b) =>
      a.uid.localeCompare(b.uid)
    );

    // 6️⃣ Calculate totals
    const totals = {
      stake: 0,
      downlinePL: 0,
      playerPL: 0,
      commission: 0,
      uplinePL: 0,
    };

    formattedData.forEach((item) => {
      totals.stake += item.stake;
      totals.downlinePL += item.downlinePL;
      totals.playerPL += item.playerPL;
      totals.commission += item.commission;
      totals.uplinePL += item.uplinePL;
    });

    // 7️⃣ Return response
    res.status(200).json({
      success: true,
      data: formattedData,
      total: totals,
    });
  } catch (error) {
    console.error('Error fetching casino profit/loss by date:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
