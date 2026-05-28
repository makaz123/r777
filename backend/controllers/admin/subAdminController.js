import axios from 'axios';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import createToken from '../../config/tokenCreate.js';
import betHistoryModel from '../../models/betHistoryModel.js';
import betModel from '../../models/betModel.js';
import creditRefHistory from '../../models/creditRefHistory.js';
import DepositHistory from '../../models/depositeHistoryModel.js';
import LoginHistory from '../../models/loginHistory.js';
import passwordHistory from '../../models/passwordHistory.js';
import SubAdmin from '../../models/subAdminModel.js';
import TransactionHistory from '../../models/transtionHistoryModel.js';
import WithdrawalHistory from '../../models/withdrawalHistoryModel.js';
import { calculateAllExposure } from '../../utils/exposureUtils.js';
import CasinoBetHistory from '../../models/casinoBetHistory.model.js';
import {
  aggregateDownlineOutstandingGross,
  aggregateDownlineClientPLSum,
  aggregateDownlineParentViewPL,
  aggregateSettledPLByUser,
  aggregateViewerWeekPL,
  aggregateViewerOutstandingPL,
  aggregateViewerProfitLoss,
  aggregateViewerExposure,
  applySettlementCashToUplineShare,
  buildAccountSummary,
  expectedBettingPLFromHistory,
  getAccountByCodeMap,
  getCurrentWeekRange,
  getDownlineOutstandingPLMaps,
  getSettlementCashTotalsByUserInRange,
  getUplineLenDenaLabel,
  resolveAccountSummaryWeekPL,
  isAccountLinesFullyCleared,
  normalizePLByUserIds,
  getWeekPLRangeForAdmin,
  setWeekPLResetNow,
  getSelfWeekSettlementCashNet,
  getDownlineUserIds,
  getSettlementCashTotals,
  isAccountInAdminDownline,
} from '../../utils/accountSummaryUtils.js';
import {
  notifyUplineChainRefresh,
  refreshUserAndDownlines,
} from '../../utils/userRefreshNotify.js';
import { sendUserRefresh } from '../../socket/bettingSocket.js';
import {
  adjustUserUpdatesForCommission,
  BET_STATUS_WIN,
  calculateWinCommission,
  isSettledClientWinPL,
  getDownlineUplineBettingContribution,
  isMatchOddsBetRecord,
  isMatchOddsGameType,
  parseCommissionPercent,
  getAccountMyKeepPercent,
  getDownlineKeepPercentOnRow,
  getParentShareOnDownlineRow,
  getPartnershipUplineShare,
  getViewerMySharePercent,
  roundMoney,
  splitProfitLossByMyShare,
  toStoredDownlineKeepPercent,
  toStoredDownlineKeepFromCreateInput,
} from '../../utils/partnershipCommissionUtils.js';

const countUplines = async (user) => {
  let count = 0;
  let currentUser = user;

  while (currentUser && currentUser.invite) {
    const upline = await SubAdmin.findOne({ code: currentUser.invite });
    if (!upline) break;

    count++;
    currentUser = upline;
  }

  return count;
};

const generateSixDigitMasterPassword = () =>
  crypto.randomInt(100000, 1000000).toString();

/** Confirms sensitive actions — uses login password (transaction password disabled). */
const verifyMasterPassword = async (user, enteredPassword) => {
  if (!user || !enteredPassword) return false;
  return bcrypt.compare(enteredPassword, user.password);
};

const updateAdmin = async (id) => {
  try {
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Include ALL downlines (including deleted) for financial calculations.
    // Deleted users should still count in hierarchy calculations to prevent
    // sub-admins from hiding losses by deleting users.
    const directDownlines = await SubAdmin.find({
      invite: admin.code,
    });

    //  CLEAN SEPARATION: Calculate each type separately
    let DownlineTotalExposure = 0;
    let DownlineTotalBettingProfitLoss = 0;
    const DownlineTotalBaseBalance = directDownlines.reduce(
      (sum, user) => sum + (user.baseBalance || 0),
      0
    );

    // Calculate correct exposure and bettingProfitLoss for each downline
    for (const user of directDownlines) {
      try {
        // FIX: If downline is NOT a 'user' role (i.e., it's an agent/admin),
        // use their stored totalExposure which was already calculated recursively.
        // Only calculate from bets for actual end-users who place bets.
        if (user.role !== 'user') {
          DownlineTotalExposure += user.totalExposure || user.exposure || 0;
          continue;
        }

        // For actual users, recalculate bettingProfitLoss from betHistoryModel
        // (single source of truth - stores each individual bet with original values)
        const plResult = await betHistoryModel.aggregate([
          {
            $match: {
              userId: user._id.toString(),
              status: { $in: [1, 2] },
            },
          },
          {
            $group: {
              _id: null,
              totalPL: { $sum: '$profitLossChange' },
            },
          },
        ]);
        const sportsBettingPL =
          plResult.length > 0 ? roundMoney(plResult[0].totalPL) : 0;

        // Also aggregate Casino PL
        const casinoPlResult = await CasinoBetHistory.aggregate([
          {
            $match: {
              userId: user._id.toString(),
              $or: [{ bet_amount: { $gt: 0 } }, { win_amount: { $gt: 0 } }],
            },
          },
          {
            $group: {
              _id: null,
              totalPL: {
                $sum: {
                  $subtract: [
                    { $ifNull: ['$win_amount', 0] },
                    { $ifNull: ['$bet_amount', 0] },
                  ],
                },
              },
            },
          },
        ]);
        const casinoBettingPL =
          casinoPlResult.length > 0 ? roundMoney(casinoPlResult[0].totalPL) : 0;

        const trueTotalPL = roundMoney(sportsBettingPL + casinoBettingPL);
        const storedPL = roundMoney(user.bettingProfitLoss || 0);
        const settlementCash = await getSettlementCashTotals(
          TransactionHistory,
          user._id
        );
        const expectedPL = expectedBettingPLFromHistory(
          trueTotalPL,
          settlementCash
        );

        // Sync to bet history + settlement cash; partial settlements keep stored below raw history.
        let userBettingPL = storedPL;
        if (Math.abs(expectedPL - storedPL) > 0.01) {
          userBettingPL = expectedPL;
          if (Math.abs(user.bettingProfitLoss - expectedPL) > 0.01) {
            console.log(
              `[UPDATE ADMIN] User ${user.userName}: syncing bettingProfitLoss from ${user.bettingProfitLoss} to ${expectedPL} (history=${trueTotalPL}, settlements w/d=${settlementCash.withdrawl}/${settlementCash.deposite})`
            );
            user.bettingProfitLoss = expectedPL;
            await user.save();
          }
        }
        // Store full client P/L on this admin; parent share is applied when rolling up via agent rows.
        DownlineTotalBettingProfitLoss += userBettingPL;

        // For actual users, get all pending bets
        const updatedPendingBets = await betModel.find({
          userId: user._id,
          status: 0,
        });

        // Market-based exposure calculation (handles fancy + non-fancy + offsetting)
        const userExposure = calculateAllExposure(updatedPendingBets);
        DownlineTotalExposure += userExposure;
        console.log(
          `[UPDATE ADMIN] User ${user.userName}: exposure=${userExposure} bettingPL=${userBettingPL}`
        );
      } catch (error) {
        console.error(
          `[UPDATE ADMIN] Error calculating exposure for user ${user.userName}:`,
          error.message
        );
        // Fallback to user's stored values
        DownlineTotalExposure += user.exposure || 0;
        DownlineTotalBettingProfitLoss += user.bettingProfitLoss || 0;
      }
    }

    // Use exact outstanding PL calculation without compounding bugs
    DownlineTotalBettingProfitLoss = await aggregateViewerOutstandingPL(
      SubAdmin,
      betHistoryModel,
      CasinoBetHistory,
      TransactionHistory,
      admin
    );

    // CLEAN SEPARATION: Update admin with separate fields
    admin.bettingProfitLoss = DownlineTotalBettingProfitLoss; // Sum of downlines' betting P/L
    admin.uplineBettingProfitLoss = DownlineTotalBettingProfitLoss; // Same for upline calculation

    // Calculate totalBalance using clean separation
    admin.totalBalance =
      DownlineTotalBaseBalance + admin.uplineBettingProfitLoss;
    admin.exposure = DownlineTotalExposure;
    admin.totalExposure = DownlineTotalExposure;
    admin.agentAvbalance = admin.totalBalance - admin.totalExposure; // Available Balance in dashboard
    admin.totalAvbalance = admin.totalBalance + admin.avbalance; // Total Balance in dashboard

    await admin.save();

    return {
      success: true,
      message: 'Admin updated with downline data',
      admin,
    };
  } catch (error) {
    console.error('updateAdmin error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Credit commission up the chain based on partnership percentages.
 * The direct agent keeps their partnership share of the commission, passing the rest up.
 * Master takes their share from the passed up amount, passing the rest up, etc.
 */
export const distributeCommissionUpChain = async (
  user,
  initialCommissionAmount
) => {
  if (!user?.invite || !initialCommissionAmount || initialCommissionAmount <= 0)
    return null;

  let currentAmount = Number(initialCommissionAmount) || 0;
  let childNode = user;
  let currentParentCode = user.invite;

  const directAgent = await SubAdmin.findOne({ code: currentParentCode });
  if (!directAgent) return null;

  const firstAgent = directAgent;

  while (currentParentCode && currentAmount > 0) {
    const parent = await SubAdmin.findOne({ code: currentParentCode });
    if (!parent) break;

    let parentKeepAmount = 0;

    if (childNode.role === 'user') {
      // The direct agent keeps their partnership share of the commission.
      const parentKeepPercent = getAccountMyKeepPercent(parent);
      const split = splitProfitLossByMyShare(currentAmount, parentKeepPercent);
      parentKeepAmount = split.myPL;
      currentAmount = split.uplinePL;
    } else {
      // This is an admin taking from a child admin.
      const parentTakePercent = getParentShareOnDownlineRow(childNode, parent);
      const split = splitProfitLossByMyShare(currentAmount, parentTakePercent);
      parentKeepAmount = split.myPL;
      currentAmount = split.uplinePL;
    }

    if (parentKeepAmount > 0) {
      await SubAdmin.findByIdAndUpdate(parent._id, {
        $inc: { commissionEarned: parentKeepAmount },
      });
    }

    childNode = parent;
    currentParentCode = parent.invite;
  }

  return firstAgent;
};

/** Credits match-odds win commission up the agent chain (partnership split per level). */
export const creditAgentCommissionEarned = distributeCommissionUpChain;

/**
 * Match odds only: deduct commission from user win, credit agent commissionEarned.
 * Partnership is not applied here (handled in updateAdmin for all markets).
 */
export const applyMatchOddsWinCommissionOnSettlement = async (
  bet,
  user,
  settlementResult
) => {
  if (!settlementResult?.userUpdates || !user || !bet) {
    return { settlementResult, commission: 0 };
  }
  if (!isMatchOddsBetRecord(bet)) {
    return { settlementResult, commission: 0 };
  }

  const profit = Number(settlementResult.userUpdates.profitLossChange) || 0;
  const betStatus = bet?.status ?? BET_STATUS_WIN;
  if (!isSettledClientWinPL(profit, betStatus)) {
    return { settlementResult, commission: 0 };
  }

  const rate = parseCommissionPercent(user.commition);
  const { netProfit, commission } = calculateWinCommission(profit, rate);
  if (commission <= 0) {
    return { settlementResult, commission: 0 };
  }

  const agent = await distributeCommissionUpChain(user, commission);

  if (agent) {
    console.log(
      `[COMMISSION] Match Odds | user=${user.userName} agent=${agent.userName} earned=${commission} rate=${rate}%`
    );
  }

  return {
    settlementResult: {
      ...settlementResult,
      userUpdates: adjustUserUpdatesForCommission(
        settlementResult.userUpdates,
        commission
      ),
    },
    commission,
    netProfit,
  };
};

export const updateAllUplines = async (userIdOrArray) => {
  try {
    const userIds = Array.isArray(userIdOrArray)
      ? userIdOrArray
      : [userIdOrArray];

    for (const userId of userIds) {
      let currentUser = await SubAdmin.findById(userId);
      if (!currentUser) {
        console.log(` [UPDATE UPLINES] User not found: ${userId}`);
        continue;
      }

      console.log(
        ` [UPDATE UPLINES] Starting from user: ${currentUser.userName} (${currentUser.code})`
      );

      while (currentUser && currentUser.invite) {
        const uplineAdmin = await SubAdmin.findOne({
          code: currentUser.invite,
        });
        if (uplineAdmin) {
          console.log(
            ` [UPDATE UPLINES] Updating upline: ${uplineAdmin.userName} (${uplineAdmin.code})`
          );
          await updateAdmin(uplineAdmin._id);
          currentUser = uplineAdmin;
        } else {
          console.log(
            ` [UPDATE UPLINES] No higher upline found for ${currentUser.userName}`
          );
          break;
        }
      }
    }

    for (const userId of userIds) {
      await notifyUplineChainRefresh(userId);
    }

    console.log(` [UPDATE UPLINES] Completed all upline updates\n`);
  } catch (error) {
    console.error(` [UPDATE UPLINES] Error:`, error);
  }
};

export const getAllUsersWithCompleteInfo = async (req, res) => {
  try {
    const { id, role } = req;
    const { page = 1, limit = 10, searchQuery } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    let filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, status: { $ne: 'delete' } }
        : { invite: admin.code, status: { $ne: 'delete' } };

    if (searchQuery) {
      filter = {
        ...filter,
        userName: { $regex: searchQuery, $options: 'i' },
      };
    }

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    // Add both upline totalBalance and direct user info
    const usersWithCompleteInfo = await Promise.all(
      allUsers.map(async (user) => {
        // Get upline's totalBalance
        const upline = await SubAdmin.findOne({ code: user.invite });

        // Count uplines to determine if direct user
        const uplineCount = await countUplines(user);

        return {
          ...user.toObject(),
          uplineTotalBalance: upline ? upline.totalBalance : 0,
          uplineCount: uplineCount,
          isDirectUser: uplineCount === 1,
        };
      })
    );

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      message: 'Users with complete info retrieved successfully',
      data: usersWithCompleteInfo,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching users with complete info:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

// export const createSubAdmin = async (req, res) => {
//   try {
//     const { id, role } = req;

//     const {
//       name,
//       userName,
//       accountType,
//       commition,
//       balance,
//       exposureLimit,
//       creditReference,
//       rollingCommission,
//       phone,
//       password,
//       masterPassword,
//       partnership,
//     } = req.body;

//     // Generate a Unique Code for Referral
//     const uniqueCode = crypto.randomBytes(4).toString('hex').toUpperCase();

//     // Find the admin who is creating the sub-admin
//     const admin = await SubAdmin.findById(id);
//     if (!admin) {
//       return res.status(400).json({ message: 'Admin not found' });
//     }

//     if (admin.secret === 0) {
//       return res.status(403).json({
//         message: 'Admin account is not authorized to create users',
//       });
//     }

//     // Role-based validation
//     const roleHierarchy = {
//       supperadmin: ['admin', 'white', 'super', 'master', 'agent', 'user'],
//       admin: ['white', 'super', 'master', 'agent', 'user'],
//       white: ['super', 'master', 'agent', 'user'],
//       super: ['master', 'agent', 'user'],
//       master: ['agent', 'user'],
//       agent: ['user'],
//     };

//     // Compare password
//     const isMatch = await bcrypt.compare(masterPassword, admin.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid login password.' });
//     }

//     if (!roleHierarchy[role] || !roleHierarchy[role].includes(accountType)) {
//       return res.status(403).json({
//         message: `${role} can only create ${roleHierarchy[role].join(', ')} accounts.`,
//       });
//     }

//     // Balance validation
//     if (['admin', 'white', 'super', 'master', 'agent'].includes(role)) {
//       if (isNaN(balance) || balance === undefined || balance < 0) {
//         return res.status(400).json({ message: 'Invalid balance amount' });
//       }

//       if (balance > admin.balance || admin.balance < 1) {
//         return res.status(400).json({ message: 'Insufficient balance' });
//       }
//     }

//     // Password Regex: must contain letters AND numbers, NO special characters
//     const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{8,}$/;
//     if (!passwordRegex.test(password)) {
//       return res.status(400).json({
//         message:
//           'Password must be at least 8 characters with both letters and numbers. Special characters are not allowed.',
//       });
//     }

//     // Check if userName already exists
//     const existingSubAdmin = await SubAdmin.findOne({
//       userName: userName.toLowerCase(),
//     });
//     if (existingSubAdmin) {
//       return res.status(400).json({ message: `${userName} already exists` });
//     }

//     const creditReferenceProfitLoss = balance - creditReference;

//     // Partnership validation (required for non-user accounts, 1-100)
//     let parsedPartnership = 0;
//     if (accountType !== 'user') {
//       parsedPartnership = Number(partnership);
//       if (
//         !partnership ||
//         isNaN(parsedPartnership) ||
//         parsedPartnership <= 0 ||
//         parsedPartnership > 100
//       ) {
//         return res.status(400).json({
//           message: 'Partnership is required and must be between 1 and 100.',
//         });
//       }
//     }
//     if (admin.avbalance - balance < 0) {
//       return res.status(400).json({ message: 'Insufficient balance' });
//     }

//     const subAdmin = new SubAdmin({
//       name,
//       userName: userName.toLowerCase(),
//       account: accountType,
//       commition,
//       balance,
//       baseBalance: balance, // Set baseBalance to initial balance given
//       exposureLimit,
//       creditReference,
//       profitLoss: 0,
//       bettingProfitLoss: 0,
//       creditReferenceProfitLoss: creditReferenceProfitLoss,
//       avbalance: balance,
//       totalAvbalance: balance,
//       rollingCommission,
//       code: uniqueCode,
//       invite: admin.code,
//       phone,
//       password,
//       role: accountType,
//       masterPassword,
//       partnership: parsedPartnership,
//       totalBalance: 0,
//     });
//     await subAdmin.save();

//     await TransactionHistory.create({
//       userId: subAdmin._id,
//       userName: subAdmin.userName,
//       withdrawl: 0,
//       deposite: balance,
//       amount: balance,
//       remark: 'Opening Balance',
//       from: admin.userName,
//       to: subAdmin.userName,
//       invite: admin.code,
//     });

//     // Downline calculations (exclude deleted users)
//     const downlineUser = await SubAdmin.find({
//       invite: admin.code,
//       status: { $ne: 'delete' },
//     });
//     const DownlineTotalExposure = downlineUser.reduce(
//       (sum, user) => sum + (user.exposure || 0),
//       0
//     );
//     const DownlineTotalBettingProfitLoss = downlineUser.reduce(
//       (sum, user) => sum + (user.bettingProfitLoss || 0),
//       0
//     );
//     const DownlineTotalBaseBalance = downlineUser.reduce(
//       (sum, user) => sum + (user.baseBalance || 0),
//       0
//     );

//     //  CLEAN SEPARATION: Update admin with separate fields (same as updateAdmin)
//     admin.avbalance -= balance;
//     admin.bettingProfitLoss = DownlineTotalBettingProfitLoss; // Sum of downlines' betting P/L
//     admin.uplineBettingProfitLoss = DownlineTotalBettingProfitLoss; // Same for upline calculation

//     // Calculate totalBalance using clean separation
//     admin.totalBalance =
//       DownlineTotalBaseBalance + admin.uplineBettingProfitLoss;
//     admin.totalAvbalance = admin.avbalance + admin.totalBalance;
//     admin.exposure = DownlineTotalExposure;
//     admin.totalExposure = DownlineTotalExposure;
//     admin.agentAvbalance = admin.totalBalance - admin.totalExposure;

//     await admin.save();
//     console.log('The admin is updated', admin);

//     // Generate token
//     const token = await createToken({
//       id: subAdmin._id,
//       role: subAdmin.role,
//       user: subAdmin,
//     });

//     return res.status(201).json({
//       success: true,
//       message: `${accountType} created successfully`,
//       token,
//       user: subAdmin,
//     });
//   } catch (error) {
//     console.error('Create SubAdmin Error:', error);
//     return res
//       .status(500)
//       .json({ message: 'Server error', error: error.message });
//   }
// };

export const createSubAdmin = async (req, res) => {
  try {
    const { id, role } = req;

    const {
      name,
      userName,
      accountType,
      commition,
      balance: balanceRaw,
      exposureLimit,
      creditReference: creditReferenceRaw,
      rollingCommission,
      phone,
      password,
      masterPassword,
      partnership: partnershipRaw,
    } = req.body;

    const balance =
      balanceRaw == null || balanceRaw === '' ? 0 : Number(balanceRaw);
    const creditReference =
      creditReferenceRaw == null || creditReferenceRaw === ''
        ? 0
        : Number(creditReferenceRaw);
    const partnership =
      accountType === 'user'
        ? 0
        : partnershipRaw == null || partnershipRaw === ''
          ? null
          : Number(partnershipRaw);

    // Generate a Unique Code for Referral
    const uniqueCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Find the admin who is creating the sub-admin
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(400).json({ message: 'Admin not found' });
    }

    if (admin.secret === 0) {
      return res.status(403).json({
        message: 'Admin account is not authorized to create users',
      });
    }

    // Role-based validation
    const roleHierarchy = {
      supperadmin: ['admin', 'white', 'super', 'master', 'agent', 'user'],
      admin: ['white', 'super', 'master', 'agent', 'user'],
      white: ['super', 'master', 'agent', 'user'],
      super: ['master', 'agent', 'user'],
      master: ['agent', 'user'],
      agent: ['user'],
    };

    // Compare password
    const isMatch = await verifyMasterPassword(admin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid login password.' });
    }

    if (!roleHierarchy[role] || !roleHierarchy[role].includes(accountType)) {
      return res.status(403).json({
        message: `${role} can only create ${roleHierarchy[role].join(', ')} accounts.`,
      });
    }

    // Balance validation
    if (['admin', 'white', 'super', 'master', 'agent'].includes(role)) {
      if (isNaN(balance) || balance === undefined || balance < 0) {
        return res.status(400).json({ message: 'Invalid balance amount' });
      }

      if (balance > admin.balance || admin.balance < 1) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
    }

    // Password Regex: must contain letters AND numbers, NO special characters
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters with both letters and numbers. Special characters are not allowed.',
      });
    }

    // Check if userName already exists
    const existingSubAdmin = await SubAdmin.findOne({
      userName: userName.toLowerCase(),
    });
    if (existingSubAdmin) {
      return res.status(400).json({ message: `${userName} already exists` });
    }

    const creditReferenceProfitLoss = balance - creditReference;

    // Partnership validation (agent accounts only)
    if (accountType !== 'user') {
      if (
        partnership == null ||
        Number.isNaN(partnership) ||
        partnership < 0 ||
        partnership > 100
      ) {
        return res
          .status(400)
          .json({ message: 'Partnership should be between 0 and 100' });
      }

      const parentMyShareCap = getAccountMyKeepPercent(admin);
      const downlineKeep = toStoredDownlineKeepFromCreateInput(
        partnership,
        admin
      );
      if (downlineKeep > parentMyShareCap) {
        return res.status(400).json({
          message: `Downline share cannot exceed your keep (${parentMyShareCap}%)`,
        });
      }
    }
    // Skip balance check for superadmin
    if (role !== 'superadmin' && role !== 'supperadmin') {
      if (admin.avbalance - balance < 0) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
    }

    const subAdmin = new SubAdmin({
      name,
      userName: userName.toLowerCase(),
      account: accountType,
      commition,
      balance,
      baseBalance: balance, // Set baseBalance to initial balance given
      exposureLimit,
      creditReference,
      profitLoss: 0,
      bettingProfitLoss: 0,
      creditReferenceProfitLoss: creditReferenceProfitLoss,
      avbalance: balance,
      totalAvbalance: balance,
      rollingCommission,
      code: uniqueCode,
      invite: admin.code,
      phone,
      password,
      role: accountType,
      partnership:
        accountType !== 'user'
          ? toStoredDownlineKeepFromCreateInput(partnership, admin)
          : undefined,
      totalBalance: 0,
    });
    await subAdmin.save();

    await TransactionHistory.create({
      userId: subAdmin._id,
      userName: subAdmin.userName,
      withdrawl: 0,
      deposite: balance,
      amount: balance,
      remark: 'Opening Balance',
      from: admin.userName,
      to: subAdmin.userName,
      invite: admin.code,
    });

    // Downline calculations (exclude deleted users)
    const downlineUser = await SubAdmin.find({
      invite: admin.code,
      status: { $ne: 'delete' },
    });
    const DownlineTotalExposure = downlineUser.reduce(
      (sum, user) => sum + (user.exposure || 0),
      0
    );
    const DownlineTotalBettingProfitLoss = downlineUser.reduce(
      (sum, user) => sum + (user.bettingProfitLoss || 0),
      0
    );
    const DownlineTotalBaseBalance = downlineUser.reduce(
      (sum, user) => sum + (user.baseBalance || 0),
      0
    );

    //  CLEAN SEPARATION: Update admin with separate fields (same as updateAdmin)
    // Skip balance subtraction for superadmin
    if (role !== 'superadmin' && role !== 'supperadmin') {
      admin.avbalance -= balance;
    }
    admin.bettingProfitLoss = DownlineTotalBettingProfitLoss; // Sum of downlines' betting P/L
    admin.uplineBettingProfitLoss = DownlineTotalBettingProfitLoss; // Same for upline calculation

    // Calculate totalBalance using clean separation
    admin.totalBalance =
      DownlineTotalBaseBalance + admin.uplineBettingProfitLoss;
    admin.totalAvbalance = admin.avbalance + admin.totalBalance;
    admin.exposure = DownlineTotalExposure;
    admin.totalExposure = DownlineTotalExposure;
    admin.agentAvbalance = admin.totalBalance - admin.totalExposure;

    await admin.save();
    console.log('The admin is updated', admin);

    // Generate token
    const token = await createToken({
      id: subAdmin._id,
      role: subAdmin.role,
      user: subAdmin,
    });

    return res.status(201).json({
      success: true,
      message: `${accountType} created successfully`,
      token,
      user: subAdmin,
    });
  } catch (error) {
    console.error('Create SubAdmin Error:', error);

    if (error.name === 'ValidationError' && error.errors) {
      const fieldLabels = {
        name: 'Client name',
        userName: 'User name',
        password: 'Password',
      };
      const firstKey = Object.keys(error.errors)[0];
      const firstErr = error.errors[firstKey];
      const label = fieldLabels[firstKey] || firstKey;
      const detail = firstErr?.message || error.message;
      const message = /required/i.test(detail)
        ? `${label} is required.`
        : detail;

      return res.status(400).json({ message });
    }

    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};
export const deleteSubAdmin = async (req, res) => {
  const { id, role } = req;
  const { page = 1, limit = 10 } = req.query;
  try {
    const { userId } = req.params; // Sub-admin ID to delete

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const subAdmin = await SubAdmin.findById(userId);
    if (!subAdmin) {
      return res.status(404).json({ message: 'user not found' });
    }

    //  Find the user being updated
    let editUser = await SubAdmin.findById(userId);
    if (editUser.avbalance > 0) {
      return res
        .status(400)
        .json({ message: 'User has pending withdrawl balance' });
    }
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    editUser.status = 'delete';

    await editUser.save();

    const filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
        : {
            invite: editUser.code,
            role: { $ne: 'user' },
            status: { $ne: 'delete' },
          };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Sub-admin deleted successfully',
      data: allUsers,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Delete SubAdmin Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

const saveLoginHistory = async (userName, id, status, req) => {
  try {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.socket?.remoteAddress ||
      'IP not found';

    //  Get geo details
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    const { city, region, country_name: country, org: isp } = response.data;

    const now = new Date();
    const formattedDateTime = now
      .toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .replace(',', '');

    await LoginHistory.create({
      userName,
      userId: id,
      status: status === 'Success' ? 'Login Successful' : 'Login Failed',
      dateTime: formattedDateTime,
      ip,
      isp,
      city,
      region,
      country,
    });
  } catch (error) {
    console.error(' Login history error:', error.message);
  }
};

export const loginSubAdmin = async (req, res) => {
  try {
    const { userName, password } = req.body;

    //  Check if userName and password are provided
    if (!userName || !password) {
      await saveLoginHistory(
        'null',
        'null',
        'Please provide both username and password',
        req
      );
      return res
        .status(400)
        .json({ message: 'Please provide both username and password.' });
    }

    //  Find sub-admin by userName (case-insensitive)
    const subAdmin = await SubAdmin.findOne({
      userName: userName.toLowerCase(),
    });

    if (!subAdmin) {
      await saveLoginHistory(userName, userName, 'UserName Wrong', req);
      return res.status(400).json({ message: 'Sub-admin not found.' });
    }

    //  Compare password
    const isMatch = await bcrypt.compare(password, subAdmin.password);

    if (!isMatch) {
      await saveLoginHistory(userName, subAdmin._id, 'Password Wrong', req);
      return res.status(400).json({ message: 'Password Wrong !' });
    }

    if (subAdmin.status !== 'active') {
      await saveLoginHistory(userName, subAdmin._id, 'Account Inactive', req);
      return res
        .status(400)
        .json({ message: `Your Account has been ${subAdmin.status} !` });
    }

    if (subAdmin.uLock) {
      await saveLoginHistory(userName, subAdmin._id, 'User Locked', req);
      return res.status(403).json({ message: 'Your account is locked.' });
    }

    // Reuse existing session token to allow multiple devices, or generate new if none
    const sessionToken =
      subAdmin.sessionToken || crypto.randomBytes(32).toString('hex');
    const deviceId = req.headers['user-agent'] || 'unknown-device';
    const ipAddress =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    //  Update user session information
    subAdmin.sessionToken = sessionToken;
    subAdmin.lastLogin = new Date();
    subAdmin.lastDevice = deviceId;
    subAdmin.lastIP = ipAddress;
    await subAdmin.save();

    //  Generate JWT Token with session token
    const token = jwt.sign(
      {
        id: subAdmin._id,
        role: subAdmin.role,
        sessionToken: sessionToken,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    await saveLoginHistory(userName, subAdmin._id, 'Success', req);

    //  Set token in HTTP-only cookie
    res.cookie('auth', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    //  Return success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: subAdmin,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: error.message, error: error.message });
  }
};

export const changePasswordBySubAdmin = async (req, res) => {
  const { id } = req; // Sub-admin ID (admin making the change)
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    const subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: 'New Password and Password Confirmation should be same',
      });
    }

    // Validate new password: must contain letters AND numbers, NO special characters
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters with both letters and numbers. Special characters are not allowed.',
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, subAdmin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old Password Has Not Matched!' });
    }
    subAdmin.password = newPassword;
    if (!subAdmin.isPasswordChanged) {
      subAdmin.isPasswordChanged = true;
    }

    await subAdmin.save();

    await passwordHistory.create({
      userName: subAdmin.userName,
      remark: 'Password Changed By SubAdmin.',
      userId: id,
    });
    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      isPasswordChanged: subAdmin.isPasswordChanged,
      data: subAdmin,
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // Get user ID from authenticated request
    const userId = req.id;

    // Clear session token in database
    await SubAdmin.findByIdAndUpdate(userId, {
      $set: { sessionToken: null },
    });

    // Clear cookie
    res.clearCookie('auth', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    res.status(200).json({
      success: true,
      message: 'Logout success',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
};

export const forceLogoutUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify admin permissions
    if (req.role !== 'admin' && req.role !== 'supperadmin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Clear session token
    await SubAdmin.findByIdAndUpdate(userId, {
      $set: { sessionToken: null },
    });

    res.status(200).json({
      success: true,
      message: 'User logged out from all devices',
    });
  } catch (error) {
    console.error('Force logout error:', error);
    res.status(500).json({ message: 'Operation failed', error: error.message });
  }
};

export const getLoginHistory = async (req, res) => {
  try {
    const { userId } = req.params; // passed in route as /get/login-history/:userId
    const { startDate, endDate } = req.query;

    const query = { userId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const data = await LoginHistory.find(query).sort({ createdAt: -1 }); // latest first
    res.status(200).json({
      message: 'Login history fetched successfully',
      data,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching login history:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const loadAccountSummaryForAdmin = async (adminId) => {
  await updateAdmin(adminId);
  const updatedAdmin = await SubAdmin.findById(adminId).lean();
  if (!updatedAdmin) return null;

  let uplineSharePercent = 0;
  let uplineParent = null;
  if (updatedAdmin.invite) {
    uplineParent = await SubAdmin.findOne({ code: updatedAdmin.invite }).lean();
    if (uplineParent) {
      const { getParentShareOnDownlineRow } =
        await import('../../utils/partnershipCommissionUtils.js');
      uplineSharePercent = getParentShareOnDownlineRow(
        updatedAdmin,
        uplineParent
      );
    }
  }

  const weekRange = await getWeekPLRangeForAdmin(updatedAdmin);
  const [
    {
      weekViewerBettingPL,
      weekDownlineSettlementNet,
      weekViewerPL: rawWeekViewerPL,
      weekDownlinePL,
    },
    myPLTillDate,
    tillDownlinePL,
    downlineClientResult,
    tillDownlinePLHistory,
    viewerExposure,
  ] = await Promise.all([
    aggregateViewerWeekPL(
      SubAdmin,
      betHistoryModel,
      CasinoBetHistory,
      TransactionHistory,
      updatedAdmin,
      weekRange
    ),
    // Lifetime betting P/L (bet history) — not reduced by cash settlement.
    aggregateViewerProfitLoss(
      SubAdmin,
      betHistoryModel,
      CasinoBetHistory,
      updatedAdmin,
      null
    ),
    aggregateDownlineOutstandingGross(
      SubAdmin,
      betHistoryModel,
      CasinoBetHistory,
      TransactionHistory,
      updatedAdmin.code
    ),
    aggregateDownlineClientPLSum(
      SubAdmin,
      betHistoryModel,
      CasinoBetHistory,
      TransactionHistory,
      updatedAdmin.code
    ),
    aggregateDownlineParentViewPL(
      SubAdmin,
      betHistoryModel,
      CasinoBetHistory,
      updatedAdmin.code,
      null
    ),
    aggregateViewerExposure(SubAdmin, updatedAdmin),
  ]);
  const directDownlines = await SubAdmin.find({
    invite: updatedAdmin.code,
    status: { $ne: 'delete' },
  }).lean();

  let tillViewerOutstandingPL = 0;
  for (const downline of directDownlines) {
    const { clientPL } = await getDirectSettlementPL(updatedAdmin, downline);
    tillViewerOutstandingPL += roundMoney(-clientPL);
  }
  tillViewerOutstandingPL = roundMoney(tillViewerOutstandingPL);

  const downlineClientPL = downlineClientResult.total;
  const hasDownlineOutstanding = downlineClientResult.hasOutstanding;

  const weekSelfCashByUser = await getSettlementCashTotalsByUserInRange(
    TransactionHistory,
    [String(updatedAdmin._id)],
    weekRange
  );
  const weekSelfCash = weekSelfCashByUser.get(String(updatedAdmin._id)) ?? {
    withdrawl: 0,
    deposite: 0,
  };

  let accountSummary = buildAccountSummary(updatedAdmin, {
    weekViewerPL: rawWeekViewerPL,
    weekViewerBettingPL,
    weekDownlineSettlementNet,
    weekDownlinePL,
    myPLTillDate,
    tillViewerOutstandingPL,
    tillDownlinePL,
    downlineClientPL,
    tillDownlinePLHistory,
    uplineSharePercent,
    uplineKeepPercent: uplineSharePercent,
    uplineParent,
    weekRange,
    viewerExposure,
  });

  const selfSettlementCash = await getSettlementCashTotals(
    TransactionHistory,
    updatedAdmin._id
  );

  // Same P/L as User Settlement row with direct upline (includes settlement cash).
  let uplineOutstanding = 0;
  let otherAdminSharePL = accountSummary.otherAdminSharePL;
  if (uplineParent) {
    const { clientPL } = await getDirectSettlementPL(
      uplineParent,
      updatedAdmin
    );
    // clientPL < 0 means updatedAdmin owes uplineParent. uplineOutstanding should be positive (dena).
    uplineOutstanding = roundMoney(-clientPL);
    otherAdminSharePL = 0;
  } else {
    uplineOutstanding = applySettlementCashToUplineShare(
      accountSummary.uplineSharePL,
      selfSettlementCash
    );
  }

  // Update account summary with post-settlement upline values so frontend shows correct outstanding
  accountSummary.uplineSharePL = uplineOutstanding;
  accountSummary.uplineDena = uplineOutstanding;
  accountSummary.otherAdminSharePL = otherAdminSharePL;
  accountSummary.uplineLenDena =
    uplineOutstanding > 0.005
      ? 'dena'
      : uplineOutstanding < -0.005
        ? 'lena'
        : 'clear';

  const linesFullyCleared = isAccountLinesFullyCleared(
    hasDownlineOutstanding,
    uplineOutstanding
  );
  if (linesFullyCleared) {
    const rawWeekTotal = roundMoney(
      weekViewerBettingPL +
        weekDownlineSettlementNet -
        getSelfWeekSettlementCashNet(weekSelfCash)
    );
    if (!updatedAdmin.weekPLResetAt || Math.abs(rawWeekTotal) > 0.01) {
      await setWeekPLResetNow(SubAdmin, adminId, new Date());
    }
  }

  // The net outstanding P/L is the cash inflow from downlines minus the cash outflow to upline.
  // downlineClientPL < 0 means downline lost, so agent collects (cash inflow).
  // uplineOutstanding > 0 means agent owes upline (cash outflow).
  // Net cash profit = (-downlineClientPL) - uplineOutstanding = -(uplineOutstanding + downlineClientPL)
  const weekViewerPL = roundMoney(-(uplineOutstanding + downlineClientPL));

  accountSummary = {
    ...accountSummary,
    weekViewerPL,
    currentWeekPL: weekViewerPL,
    clientWeekPLTotal: roundMoney(-weekDownlinePL),
    currentWeekUplinePL: roundMoney(weekDownlinePL - weekViewerPL),
    uplineSharePL: uplineOutstanding,
    uplineDena: uplineOutstanding,
    otherAdminSharePL,
    mySharePercent: getAccountMyKeepPercent(updatedAdmin),
    uplineLenDena: getUplineLenDenaLabel(uplineOutstanding),
    uplineTooltip:
      Math.abs(uplineOutstanding) < 0.01
        ? 'Up line settled — koi outstanding upline partnership due nahi.'
        : 'Up Line: wahi amount jo User Settlement mein aapke upline ke saath dikhegi.',
  };

  return { admin: updatedAdmin, accountSummary };
};

const refreshSettlementHierarchy = async (settlerId, settledUserId) => {
  await updateAdmin(settledUserId);
  await updateAdmin(settlerId);

  let node = await SubAdmin.findById(settlerId).select('invite').lean();
  while (node?.invite) {
    const parent = await SubAdmin.findOne({ code: node.invite })
      .select('_id invite')
      .lean();
    if (!parent) break;
    await updateAdmin(parent._id);
    node = parent;
  }

  await notifyUplineChainRefresh(settledUserId);
  await notifyUplineChainRefresh(settlerId);
};

export const getSubAdmin = async (req, res) => {
  try {
    const { id } = req; // Get ID from request

    if (!id) {
      return res.status(400).json({ message: 'Admin ID is required' });
    }

    const admin = await SubAdmin.findById(id).lean();
    if (!admin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    // Run background account summary if needed, but don't block response
    loadAccountSummaryForAdmin(id).catch(err => 
      console.error('Background summary error:', err)
    );

    res.status(200).json({
      message: 'Sub-admin details retrieved successfully',
      data: { ...admin, accountSummary: null },
    });
  } catch (error) {
    console.error('Error fetching sub-admin:', error);
    res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params; // passed in route as /credit-ref-history/:userId
    // console.log("userId", userId);
    const data = await SubAdmin.findById(userId); // optional: latest first
    // console.log("data", data);
    res.status(200).json({
      message: 'User Profile fetched successfully',
      data,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching User Profile:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getDeleteUser = async (req, res) => {
  try {
    const { id, role } = req;
    const { page = 1, limit = 10 } = req.query;

    // console.log("Admin ID:", id);
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const admin = await SubAdmin.findById(id);
    console.log('The Delete User Admin', admin);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const filter =
      role === 'supperadmin'
        ? {
            _id: { $ne: id },
            // role: { $ne: "user" },
            status: 'delete',
          }
        : {
            invite: admin.code,
            // role: { $ne: "user" },
            status: 'delete',
          };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      message: 'All sub-admin details retrieved successfully',
      data: allUsers,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

export const restoreDeleteUser = async (req, res) => {
  try {
    const { id, role } = req;
    const { page = 1, limit = 10 } = req.query;
    const { userId, masterPassword } = req.params;

    // console.log("Admin ID:", id);
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    // ✅ Verify Master Password
    const isMatch = await verifyMasterPassword(admin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid login password.' });
    }

    let editUser = await SubAdmin.findById(userId);

    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    editUser.status = 'active';

    await editUser.save();

    const filter =
      role === 'supperadmin'
        ? {
            _id: { $ne: id },
            role: { $ne: 'user' },
            status: 'delete',
          }
        : {
            invite: admin.code,
            role: { $ne: 'user' },
            status: 'delete',
          };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'User restored successfully',
      data: allUsers,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};
export const getAllUser = async (req, res) => {
  try {
    const { id, role } = req;
    const { page = 1, limit = 10, searchQuery } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    let filter =
      role === 'supperadmin'
        ? {
            _id: { $ne: id },
            role: { $ne: 'user' },
            status: { $ne: 'delete' },
            invite: admin.code,
          }
        : {
            invite: admin.code,
            role: { $ne: 'user' },
            status: { $ne: 'delete' },
          };

    if (searchQuery) {
      filter = {
        ...filter,
        userName: { $regex: searchQuery, $options: 'i' },
      };
    }
    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      message: 'All sub-admin details retrieved successfully',
      data: allUsers,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};
export const getAllOnlyUser = async (req, res) => {
  try {
    const { id, role } = req;
    const { page = 1, limit = 10, searchQuery } = req.query;

    // console.log("searchQuery", searchQuery)

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isSuperAdmin = role === 'supperadmin' || role === 'superadmin';

    let filter;
    if (isSuperAdmin) {
      filter = { role: 'user', status: { $ne: 'delete' } };
    } else {
      const downlineIds = await getDownlineUserIds(SubAdmin, admin.code);
      if (!downlineIds.length) {
        return res.status(200).json({
          message: 'All sub-admin details retrieved successfully',
          data: [],
          totalUsers: 0,
          totalPages: 0,
          currentPage: pageNum,
        });
      }
      filter = { _id: { $in: downlineIds }, status: { $ne: 'delete' } };
    }

    // 🔍 Add search by userName if searchQuery exists
    if (searchQuery && searchQuery !== undefined) {
      // console.log("dfghjkkkkkkkkkkkkkk")
      filter = {
        ...filter,
        userName: { $regex: searchQuery, $options: 'i' }, // case-insensitive search
      };
    }

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    // Apply the same exposure calculation logic as getUserById
    const usersWithCorrectExposure = await Promise.all(
      allUsers.map(async (user) => {
        try {
          // Get all pending bets for this user
          const updatedPendingBets = await betModel.find({
            userId: user._id,
            status: 0,
          });

          // Market-based exposure calculation (handles fancy + non-fancy + offsetting)
          const currentExposure = calculateAllExposure(updatedPendingBets);

          // Return user with corrected exposure (same as getUserById)
          return {
            ...user.toObject(),
            exposure: currentExposure,
          };
        } catch (error) {
          console.error(
            `[FANCY EXPOSURE] Error calculating exposure for user ${user.userName}:`,
            error.message
          );
          // Return user with original exposure if calculation fails
          return user;
        }
      })
    );

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      message: 'All sub-admin details retrieved successfully',
      data: usersWithCorrectExposure,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

const buildDownlineViewerPayload = async (admin) => {
  const viewerMySharePercent = getAccountMyKeepPercent(admin);
  const viewerUplineSharePercent = roundMoney(
    Math.max(0, 100 - viewerMySharePercent)
  );

  const rawGross = await aggregateDownlineOutstandingGross(
    SubAdmin,
    betHistoryModel,
    CasinoBetHistory,
    TransactionHistory,
    admin.code
  );

  const totalPL = roundMoney(-rawGross);
  const { myPL, uplinePL } = splitProfitLossByMyShare(
    totalPL,
    viewerMySharePercent
  );

  return {
    partnership: Number(admin.partnership) || 0,
    mySharePercent: viewerMySharePercent,
    uplineSharePercent: viewerUplineSharePercent,
    myPercentLabel: `${viewerMySharePercent}%`,
    uplinePercentLabel: `${viewerUplineSharePercent}%`,
    role: admin.role,
    userName: admin.userName,
    code: admin.code,
    totalPL,
    myPL,
    uplinePL,
  };
};

/**
 * @param rootViewer - logged-in admin (whose "My %" column is shown)
 * @param listParent - immediate parent whose downline is listed (same as rootViewer on top-level list)
 */
const enrichDownlineRow = async (user, rootViewer, listParent = rootViewer) => {
  let exposure = user.exposure || 0;
  if (user.role === 'user') {
    try {
      const pendingBets = await betModel.find({
        userId: user._id,
        status: 0,
      });
      exposure = calculateAllExposure(pendingBets);
    } catch (err) {
      console.error(
        `[DOWNLINE LIST] exposure for ${user.userName}:`,
        err.message
      );
    }
  } else {
    exposure = user.totalExposure || user.exposure || 0;
  }

  const row =
    typeof user.toObject === 'function' ? user.toObject() : { ...user };
  const rootMySharePercent = getAccountMyKeepPercent(rootViewer);
  const rootUplineSharePercent = roundMoney(
    Math.max(0, 100 - rootMySharePercent)
  );
  const isEndUser = row.role === 'user';
  const isNestedList = listParent.code !== rootViewer.code;
  const shareParent = isNestedList ? listParent : rootViewer;

  const parentShareOnRow = getParentShareOnDownlineRow(row, shareParent);
  const downlineKeepOnRow = getDownlineKeepPercentOnRow(row, shareParent);
  const commissionPct = parseCommissionPercent(row.commition);

  // End-users on a nested drill-down: show root viewer's share on the branch (e.g. 90%), not agent keep (10%).
  const parentSharePercent = isEndUser
    ? isNestedList
      ? getParentShareOnDownlineRow(listParent, rootViewer)
      : rootMySharePercent
    : parentShareOnRow;
  const downlineKeepPercent = isEndUser
    ? commissionPct || rootUplineSharePercent
    : downlineKeepOnRow;

  const myPercent = isEndUser
    ? `${parentSharePercent}%`
    : `${parentSharePercent}% / ${downlineKeepPercent}%`;

  const rawBettingPL = roundMoney(row.bettingProfitLoss || 0);
  const parentViewPL = roundMoney(-rawBettingPL);
  const plSplit = splitProfitLossByMyShare(
    parentViewPL,
    isEndUser ? parentSharePercent : parentShareOnRow
  );

  const baseBalance = isEndUser
    ? roundMoney(row.baseBalance ?? row.balance ?? 0)
    : roundMoney((row.baseBalance || 0) + (row.uplineBettingProfitLoss || 0));
  const balance = baseBalance;
  const avbalance = roundMoney(row.avbalance || 0);
  const pendingBal = roundMoney(-balance);
  const totalExposure = isEndUser ? roundMoney(exposure) : 0;
  // Scale agent exposure exactly like client exposure so the outside row matches the sum of nested rows inside
  const shareExposure = isEndUser
    ? roundMoney(totalExposure * (parentSharePercent / 100))
    : roundMoney(exposure * (parentSharePercent / 100));
  const hasOpenExposure = Math.abs(totalExposure) > 0.001;
  let currentPL = 0;
  if (isEndUser) {
    if (!hasOpenExposure) {
      currentPL = roundMoney(avbalance - baseBalance);
    }
  } else {
    // For agents, the "Current PL" column should accurately reflect the actual outstanding
    // settlement balance (what the agent owes the rootViewer), factoring in cash settlements.
    const { clientPL } = await getDirectSettlementPL(rootViewer, row);
    // clientPL > 0 means agent owes the parent (rootViewer), which implies agent lost (debtor).
    // The "Current PL" conventionally shows negative numbers for losses.
    // Wait, clientPL > 0 in Settlement means creditor (downline WON).
    // Let's look at getSettlementUsers:
    // pl > 0: downline won their share (creditor / dena hai)
    // pl < 0: downline lost their share (debtor / lena hai)
    // For "Current P/L", if downline won, it should be positive. If downline lost, negative.
    // So currentPL = clientPL!
    currentPL = roundMoney(clientPL);
  }

  return {
    ...row,
    dbBalance: row.balance,
    exposure: totalExposure,
    totalExposure,
    shareExposure,
    fullExposure: totalExposure,
    pendingBal,
    currentPL,
    balance,
    downlinePartnership: parentShareOnRow,
    parentSharePercent,
    downlineKeepPercent,
    downlineSharePercent: downlineKeepPercent,
    viewerShareOnRow: parentSharePercent,
    myPartnershipPercent: rootMySharePercent,
    mySharePercent: parentSharePercent,
    myPercent,
    partnership:
      rootViewer.role === 'supperadmin' || rootViewer.role === 'superadmin'
        ? parentSharePercent
        : row.partnership,
    rawBettingPL,
    myPLShare: plSplit.myPL,
    uplinePLShare: plSplit.uplinePL,
    uplinePartnershipPercent: isEndUser
      ? rootUplineSharePercent
      : downlineKeepPercent,
    commition: row.commition || '0',
    commissionEarned: row.commissionEarned || 0,
  };
};

/**
 * Unified downline list for Agent List (agents) and Client List (users).
 * Includes viewer partnership % and per-row share labels.
 */
export const getDownlineList = async (req, res) => {
  try {
    const { id, role } = req;
    const {
      page = 1,
      limit = 25,
      searchQuery,
      listType = 'clients',
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const requestedLimit = Math.max(parseInt(limit, 10) || 25, 1);
    // Protect API/DB from very large payload requests.
    const MAX_LIMIT = 200;
    const limitNum = Math.min(requestedLimit, MAX_LIMIT);
    const typeRaw = String(listType).toLowerCase();
    const type =
      typeRaw === 'agents'
        ? 'agents'
        : typeRaw === 'all'
          ? 'all'
          : typeRaw === 'admin' || typeRaw === 'admins'
            ? 'admin'
            : 'clients';

    const admin = await SubAdmin.findById(id).lean();
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const baseInviteFilter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, invite: admin.code, status: { $ne: 'delete' } }
        : { invite: admin.code, status: { $ne: 'delete' } };

    let filter;
    if (type === 'clients') {
      filter = { ...baseInviteFilter, role: 'user' };
    } else if (type === 'admin') {
      filter = { ...baseInviteFilter, role: 'admin' };
    } else if (type === 'all') {
      filter = { ...baseInviteFilter };
    } else {
      filter = { ...baseInviteFilter, role: { $ne: 'user' } };
    }

    if (searchQuery) {
      const escapedSearch = String(searchQuery).replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
      filter = {
        ...filter,
        userName: { $regex: escapedSearch, $options: 'i' },
      };
    }

    const [allUsers, totalUsers, viewer] = await Promise.all([
      SubAdmin.find(filter)
        .lean()
        .sort({ _id: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum),
      SubAdmin.countDocuments(filter),
      buildDownlineViewerPayload(admin),
    ]);

    const data = await Promise.all(
      allUsers.map((user) => enrichDownlineRow(user, admin, admin))
    );

    return res.status(200).json({
      success: true,
      message: 'Downline list retrieved successfully',
      listType: type,
      viewer,
      data,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum) || 1,
      currentPage: pageNum,
      pageSize: limitNum,
    });
  } catch (error) {
    console.error('Error in getDownlineList:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getUsersByInvite = async (req, res) => {
  const { refCode } = req.body;
  try {
    const { id } = req; // Extracting admin ID from request

    //  Find the logged-in admin
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(400).json({ message: 'Admin not found' });
    }

    //  Fetch users where `invite` matches the admin's `code`
    const usersData = await SubAdmin.find({
      invite: refCode,
      status: { $ne: 'delete' },
    });

    if (!usersData.length) {
      return res
        .status(404)
        .json({ message: 'No users found for this invite code.' });
    }

    res.status(200).json({
      message: 'Users retrieved successfully',
      data: usersData,
    });
  } catch (error) {
    console.error('Error fetching users by invite code:', error);
    res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

export const getSubAdminuser = async (req, res) => {
  try {
    const { id } = req;
    const { code } = req.body;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (!code) {
      return res.status(400).json({ message: 'Admin invite code is required' });
    }

    const rootViewer = await SubAdmin.findById(id);
    if (!rootViewer) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const listParent = await SubAdmin.findOne({
      code,
      status: { $ne: 'delete' },
    });
    if (!listParent) {
      return res.status(404).json({ message: 'Parent account not found' });
    }

    const filter = { invite: code, status: { $ne: 'delete' } };

    const subAdmins = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const data = await Promise.all(
      subAdmins.map((user) => enrichDownlineRow(user, rootViewer, listParent))
    );
    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      message: 'Sub-admin details for level retrieved successfully',
      data,
      viewer: buildDownlineViewerPayload(rootViewer),
      listParent: {
        userName: listParent.userName,
        code: listParent.code,
        role: listParent.role,
      },
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum) || 1,
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching sub-admin:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

export const updateCreditReference = async (req, res) => {
  try {
    const { id, role } = req; // Sub-admin ID (admin making the change)
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { userId, formData } = req.body;
    const { creditReference, masterPassword } = formData;

    const numericCreditReference = parseFloat(creditReference);
    if (isNaN(numericCreditReference)) {
      return res
        .status(400)
        .json({ message: 'Invalid credit reference amount.' });
    }

    //  Find the admin making the change
    let subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    //  Verify Master Password
    const isMatch = await verifyMasterPassword(subAdmin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid login password.' });
    }

    //  Find the user being updated
    let editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const test = await creditRefHistory.create({
      formName: 'uplire',
      userName: editUser.userName,
      oldamount: editUser.creditReference,
      newamount: creditReference,
      remark: 'Credit Reference',
      invite: subAdmin.code,
      userId: userId,
    });

    if (creditReference !== undefined)
      editUser.creditReference = creditReference;

    //Only Recalculate creditReference profit/loss
    editUser.creditReferenceProfitLoss =
      editUser.baseBalance - editUser.creditReference;

    //  Save updated user

    await editUser.save();
    const filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
        : { invite: subAdmin.code, role: 'user', status: { $ne: 'delete' } };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: `Credit ${creditReference} updated successfully`,
      data: allUsers,
    });
  } catch (error) {
    console.error('Update SubAdmin Error:', error);
    return res
      .status(500)
      .json({ message: error.message, error: error.message });
  }
};
export const updateExploserLimit = async (req, res) => {
  try {
    const { id, role } = req; // Sub-admin ID (admin making the change)
    console.log('The role in updateExposureLimit', role);
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { userId, formData } = req.body;
    const { exposureLimit, masterPassword } = formData;

    //  Find the admin making the change
    let subAdmin = await SubAdmin.findById(id);
    console.log('The subAdmin in updateExposureLimit', subAdmin);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    //  Verify Master Password
    const isMatch = await verifyMasterPassword(subAdmin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid login password.' });
    }

    //  Find the user being updated
    const editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (exposureLimit !== undefined) {
      await SubAdmin.updateOne(
        { _id: userId },
        { $set: { exposureLimit } },
        { runValidators: true }
      );
    }
    const filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
        : { invite: subAdmin.code, role: 'user', status: { $ne: 'delete' } };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: allUsers,
    });
  } catch (error) {
    console.error('Update User Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

export const updatePartnership = async (req, res) => {
  try {
    const { id, role } = req;
    const { userId, formData } = req.body;
    const { partnership, masterPassword } = formData;

    // Find admin making the change
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Verify master password
    const isMatch = await verifyMasterPassword(admin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid login password.' });
    }

    // Find the user being updated
    const editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Users excluded from partnership
    if (editUser.role === 'user') {
      return res
        .status(400)
        .json({ message: 'Partnership cannot be set for end users.' });
    }

    // Verify the admin is the direct upline
    if (editUser.invite !== admin.code) {
      return res.status(403).json({
        message: 'You can only update partnership for your direct downline.',
      });
    }

    // Validate range (1-100 required)
    const parsedPartnership = Number(partnership);
    if (
      !partnership ||
      isNaN(parsedPartnership) ||
      parsedPartnership <= 0 ||
      parsedPartnership > 100
    ) {
      return res.status(400).json({
        message: 'Partnership is required and must be between 1 and 100.',
      });
    }

    const parentMyShareCap = getAccountMyKeepPercent(admin);
    const downlineKeep = toStoredDownlineKeepFromCreateInput(
      parsedPartnership,
      admin
    );
    if (downlineKeep > parentMyShareCap) {
      return res.status(400).json({
        message: `Downline share cannot exceed your keep (${parentMyShareCap}%)`,
      });
    }

    editUser.partnership = downlineKeep;
    await editUser.save();

    return res.status(200).json({
      success: true,
      message: `Partnership updated to ${downlineKeep}% (downline keep) successfully`,
      data: editUser,
    });
  } catch (error) {
    console.error('Update Partnership Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

export const updateAdminDetails = async (req, res) => {
  try {
    const { id } = req;
    const { userId, formData } = req.body;
    const { name, commition, partnership, masterPassword } = formData;

    // Find admin making the change
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Verify master password
    const isMatch = await verifyMasterPassword(admin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid login password.' });
    }

    // Find the user being updated
    const editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify the admin is the direct upline
    if (editUser.invite !== admin.code && req.role !== 'supperadmin') {
      return res.status(403).json({
        message: 'You can only update details for your direct downline.',
      });
    }

    // Update name
    if (name !== undefined && name.trim() !== '') {
      editUser.name = name;
    }

    // Update commission
    if (commition !== undefined) {
      editUser.commition = commition;
    }

    // Update partnership if not an end user
    if (
      editUser.role !== 'user' &&
      partnership !== undefined &&
      partnership !== null &&
      partnership !== ''
    ) {
      const parsedPartnership = Number(partnership);
      if (
        !isNaN(parsedPartnership) &&
        parsedPartnership >= 0 &&
        parsedPartnership <= 100
      ) {
        const parentMyShareCap = getAccountMyKeepPercent(admin);
        const downlineKeep = toStoredDownlineKeepFromCreateInput(
          parsedPartnership,
          admin
        );
        if (downlineKeep > parentMyShareCap) {
          return res.status(400).json({
            message: `Downline share cannot exceed your keep (${parentMyShareCap}%)`,
          });
        }
        editUser.partnership = downlineKeep;
      }
    }

    await editUser.save();

    return res.status(200).json({
      success: true,
      message: 'Account details updated successfully',
      data: editUser,
    });
  } catch (error) {
    console.error('Update Admin Details Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

export const getCreditRefHistoryByUserId = async (req, res) => {
  try {
    const { userId } = req.params; // passed in route as /credit-ref-history/:userId
    const { page = 1, limit = 10, searchQuery = '' } = req.query;
    // console.log("userId", userId);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const filter = {
      userId: userId,
      // userName: { $regex: searchQuery },
    };

    const data = await creditRefHistory
      .find(filter)
      .sort({ createdAt: -1 }) // optional: latest first
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await creditRefHistory.countDocuments(filter);

    // console.log("total", total);
    // console.log("data", data);

    return res.status(200).json({
      message: 'Credit Reference History fetched successfully',
      data,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching creditRefHistory:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      success: false,
    });
  }
};

// export const withdrowalAndDeposite = async (req, res) => {
//   try {
//     const { id, role } = req;

//     const { page = 1, limit = 10 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);

//     const { userId, formData, type } = req.body;
//     let { balance, masterPassword, remark } = formData;

//     //  Convert balance to a number
//     balance = parseFloat(balance);

//     if (isNaN(balance) || balance <= 0) {
//       return res.status(400).json({ message: 'Invalid balance amount.' });
//     }

//     // Find the admin making the change
//     let subAdmin = await SubAdmin.findById(id);
//     if (!subAdmin) {
//       return res.status(404).json({ message: 'Sub-admin not found' });
//     }

//     //  Verify Master Password
//     const isMatch = await bcrypt.compare(masterPassword, subAdmin.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid login password.' });
//     }

//     //  Find the user being updated
//     let editUser = await SubAdmin.findById(userId);
//     if (!editUser) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Handle Withdrawal
//     if (type === 'withdrawal') {
//       if (balance > editUser.avbalance || balance > editUser.balance) {
//         return res.status(400).json({ message: 'Insufficient balance' });
//       }

//       editUser.avbalance = Math.max(0, editUser.avbalance - balance);
//       editUser.balance -= balance;
//       editUser.baseBalance -= balance; // Update the baseBalance of the user
//       // editUser.totalAvbalance -= balance;
//       editUser.remark = remark || editUser.remark;

//       //  CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
//       // Always use the formula: baseBalance - creditReference
//       editUser.creditReferenceProfitLoss =
//         editUser.baseBalance - editUser.creditReference;

//       // Don't recalculate profit/loss - it should only come from betting results
//       // Only return the amount to avbalance (allocated funds coming back). Do NOT
//       // add to balance/baseBalance — that would double-count and create phantom funds.
//       subAdmin.avbalance += balance;
//       await subAdmin.save();

//       await editUser.save();
//       await WithdrawalHistory.create({
//         userName: editUser.userName,
//         amount: balance,
//         remark: remark || 'Withdrawal',
//         invite: subAdmin.code,
//       });

//       await TransactionHistory.create({
//         userId: userId,
//         userName: editUser.userName,
//         withdrawl: balance,
//         deposite: 0,
//         amount: editUser.avbalance,
//         from: subAdmin.userName,
//         to: editUser.userName,
//         remark: remark || 'Transaction',
//         invite: subAdmin.code,
//       });
//     }

//     //  Handle Deposit
//     if (type === 'deposite') {
//       if (role === 'supperadmin') {
//         // Super Admin can deposit without balance restriction
//         editUser.balance += balance;
//         editUser.avbalance += balance;
//         editUser.baseBalance += balance;
//         // editUser.totalAvbalance += balance;
//         editUser.remark = remark || editUser.remark;

//         //  CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
//         // Always use the formula: baseBalance - creditReference
//         editUser.creditReferenceProfitLoss =
//           editUser.baseBalance - editUser.creditReference;

//         //Parent update
//         subAdmin.balance -= balance;
//         // subAdmin.baseBalance -= balance;
//         subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
//       } else if (balance > subAdmin.avbalance) {
//         return res.status(400).json({ message: 'Insufficient balance' });
//       } else {
//         // Normal admin deposits from their own balance
//         editUser.balance += balance;
//         editUser.avbalance += balance;
//         editUser.baseBalance += balance;
//         // editUser.totalAvbalance += balance;
//         editUser.remark = remark || editUser.remark;

//         //  CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
//         // Always use the formula: baseBalance - creditReference
//         editUser.creditReferenceProfitLoss =
//           editUser.baseBalance - editUser.creditReference;
//         // editUser.profitLoss should NOT be updated here - only from betting results!

//         // Don't recalculate profit/loss - it should only come from betting results
//         subAdmin.balance -= balance;
//         // subAdmin.baseBalance -= balance;
//         subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
//       }
//       await subAdmin.save();
//       await editUser.save();

//       await DepositHistory.create({
//         userName: editUser.userName,
//         amount: balance,
//         remark: remark || 'Deposit',
//         invite: subAdmin.code,
//       });

//       await TransactionHistory.create({
//         userId: userId,
//         userName: editUser.userName,
//         withdrawl: 0,
//         deposite: balance,
//         amount: editUser.avbalance,
//         remark: remark || 'Transaction',
//         from: subAdmin.userName,
//         to: editUser.userName,
//         invite: subAdmin.code,
//       });
//     }

//     await updateAdmin(id);
//     await updateAllUplines(userId);

//     //  Fetch updated user list
//     const filter =
//       role === 'supperadmin'
//         ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
//         : { invite: subAdmin.code, role: 'user', status: { $ne: 'delete' } };

//     const allUsers = await SubAdmin.find(filter)
//       .limit(limitNum)
//       .skip((pageNum - 1) * limitNum);

//     const totalUsers = await SubAdmin.countDocuments(filter);

//     return res.status(200).json({
//       success: true,
//       message: 'Transaction completed successfully',
//       totalUsers,
//       data: allUsers,
//     });
//   } catch (error) {
//     console.error('Update SubAdmin Error:', error);
//     return res
//       .status(500)
//       .json({ message: 'Server error', error: error.message });
//   }
// };
export const withdrowalAndDeposite = async (req, res) => {
  try {
    const { id, role } = req;

    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { userId, formData, type } = req.body;
    let { balance, masterPassword, remark } = formData;

    //  Convert balance to a number
    balance = parseFloat(balance);

    if (isNaN(balance) || balance <= 0) {
      return res.status(400).json({ message: 'Invalid balance amount.' });
    }

    // Find the admin making the change
    let subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    //  Verify Master Password
    const isMatch = await verifyMasterPassword(subAdmin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid login password.' });
    }

    //  Find the user being updated
    let editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle Withdrawal
    if (type === 'withdrawal') {
      if (balance > editUser.avbalance || balance > editUser.balance) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      editUser.avbalance = Math.max(0, editUser.avbalance - balance);
      editUser.balance -= balance;
      editUser.baseBalance -= balance; // Update the baseBalance of the user
      // editUser.totalAvbalance -= balance;
      editUser.remark = remark || editUser.remark;

      // ✅ CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
      // Always use the formula: baseBalance - creditReference
      editUser.creditReferenceProfitLoss =
        editUser.baseBalance - editUser.creditReference;
      console.log(
        '✅ [WITHDRAWAL] creditReferenceProfitLoss recalculated:',
        editUser.creditReferenceProfitLoss
      );

      // Don't recalculate profit/loss - it should only come from betting results
      subAdmin.balance += balance; // Admin receives the withdrawn amount
      // Update the baseBalance of the admin as well
      subAdmin.baseBalance += balance;
      // Update the avbalance of the admin as well
      subAdmin.avbalance += balance;
      await subAdmin.save();

      await editUser.save();
      await WithdrawalHistory.create({
        userName: editUser.userName,
        amount: balance,
        remark: remark || 'Withdrawal',
        invite: subAdmin.code,
      });

      await TransactionHistory.create({
        userId: userId,
        userName: editUser.userName,
        withdrawl: balance,
        deposite: 0,
        amount: editUser.avbalance,
        from: subAdmin.userName,
        to: editUser.userName,
        remark: remark || 'Transaction',
        invite: subAdmin.code,
      });
    }

    // ✅ Handle Deposit
    // if (type === "deposite") {
    //   if (role === "supperadmin") {
    //     // Super Admin can deposit without balance restriction
    //     editUser.balance += balance;
    //     editUser.avbalance += balance;
    //     editUser.baseBalance+=balance;//update the baseBalance of the user
    //     editUser.totalAvbalance += balance; // Update total available balance
    //     editUser.remark = remark || editUser.remark;

    //     //Update the creditReference profit/Loss
    //     editUser.creditReferenceProfitLoss+=balance;
    //     console.log("The creditReferenceProfitLoss in updateCreditReference",editUser.creditReferenceProfitLoss)
    //     editUser.profitLoss+=balance;//Update the profit/Loss
    //     console.log("The profitLoss in updateCreditReference",editUser.profitLoss)
    //     // Don't recalculate profit/loss - it should only come from betting results
    //     subAdmin.balance -= balance;
    //     subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
    //   } else if (balance > subAdmin.avbalance) {
    //     return res.status(400).json({ message: "Insufficient balance" });
    //   } else {
    //     // Normal admin deposits from their own balance
    //     editUser.balance += balance;
    //     editUser.avbalance += balance;
    //     editUser.baseBalance+=balance;//update the baseBalance of the user
    //     editUser.totalAvbalance += balance;
    //     editUser.remark = remark || editUser.remark;
    //     // Don't recalculate profit/loss - it should only come from betting results
    //     // admin.totalAvbalance = admin.balance - (balance || 0) + totalAvBalance;
    //     subAdmin.balance -= balance;
    //     subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
    //   }

    //   await subAdmin.save();
    //   await editUser.save();
    //   await DepositHistory.create({
    //     userName: editUser.userName,
    //     amount: balance,
    //     remark: remark || "Deposit",
    //     invite: subAdmin.code,
    //   });

    //   await TransactionHistory.create({
    //     userId: userId,
    //     userName: editUser.userName,
    //     withdrawl: 0,
    //     deposite: balance,
    //     amount: editUser.avbalance,
    //     remark: remark || "Transaction",
    //     from: subAdmin.userName,
    //     to: editUser.userName,
    //     invite: subAdmin.code,
    //   });
    // }
    // ✅ Handle Deposit
    if (type === 'deposite') {
      console.log('🚨 [DEPOSIT] Function called with type:', type);
      console.log('🚨 [DEPOSIT] Balance:', balance);
      console.log('�� [DEPOSIT] Role:', role);

      if (role === 'supperadmin' || role === 'superadmin') {
        console.log('🧾 [DEPOSIT] Super admin deposit path');
        // Super Admin can deposit without balance restriction
        editUser.balance += balance;
        editUser.avbalance += balance;
        editUser.baseBalance += balance;
        // editUser.totalAvbalance += balance;
        editUser.remark = remark || editUser.remark;

        // ✅ CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
        // Always use the formula: baseBalance - creditReference
        editUser.creditReferenceProfitLoss =
          editUser.baseBalance - editUser.creditReference;
        console.log(
          '✅ [DEPOSIT] creditReferenceProfitLoss recalculated:',
          editUser.creditReferenceProfitLoss
        );
        // editUser.profitLoss should NOT be updated here - only from betting results!

        // Superadmin's balance and avbalance remain unchanged when depositing
        // subAdmin.balance -= balance;
        // subAdmin.baseBalance -= balance;
        // subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
      } else if (balance > subAdmin.avbalance) {
        console.log('🚨 [DEPOSIT] Insufficient balance error');
        return res.status(400).json({ message: 'Insufficient balance' });
      } else {
        console.log('🚨 [DEPOSIT] Normal admin deposit path');
        // Normal admin deposits from their own balance
        editUser.balance += balance;
        editUser.avbalance += balance;
        editUser.baseBalance += balance;
        // editUser.totalAvbalance += balance;
        editUser.remark = remark || editUser.remark;

        // ✅ CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
        // Always use the formula: baseBalance - creditReference
        editUser.creditReferenceProfitLoss =
          editUser.baseBalance - editUser.creditReference;
        console.log(
          '✅ [DEPOSIT] creditReferenceProfitLoss recalculated:',
          editUser.creditReferenceProfitLoss
        );
        // editUser.profitLoss should NOT be updated here - only from betting results!

        // Don't recalculate profit/loss - it should only come from betting results
        subAdmin.balance -= balance;
        subAdmin.baseBalance -= balance;
        subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
      }

      console.log('🚨 [DEPOSIT] About to save user and admin');
      await subAdmin.save();
      await editUser.save();
      console.log('🚨 [DEPOSIT] User and admin saved successfully');

      await DepositHistory.create({
        userName: editUser.userName,
        amount: balance,
        remark: remark || 'Deposit',
        invite: subAdmin.code,
      });

      await TransactionHistory.create({
        userId: userId,
        userName: editUser.userName,
        withdrawl: 0,
        deposite: balance,
        amount: editUser.avbalance,
        remark: remark || 'Transaction',
        from: subAdmin.userName,
        to: editUser.userName,
        invite: subAdmin.code,
      });
    }

    // ✅ Run heavy aggregations in background for performance with 30k+ users
    updateAdmin(id).catch(err => console.error('Background updateAdmin error:', err));
    updateAllUplines(userId).catch(err => console.error('Background updateAllUplines error:', err));

    // ✅ Fetch updated user list
    const filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
        : { invite: subAdmin.code, role: 'user', status: { $ne: 'delete' } };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Transaction completed successfully',
      totalUsers,
      data: allUsers,
    });
  } catch (error) {
    console.error('Update SubAdmin Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

export const userSetting = async (req, res) => {
  try {
    const { id, role } = req; // Sub-admin ID (admin making the change)

    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { masterPassword, status, userId } = req.body;

    //  Find the admin making the change
    let subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    // console.log("masterPassword", masterPassword)

    //  Verify Master Password
    const isMatch = await verifyMasterPassword(subAdmin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid login password.' });
    }

    //  Find the user being updated
    let editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    editUser.status = status; // Admin receives the withdrawn amount
    await editUser.save();

    //  Fetch updated user list
    const filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
        : { invite: subAdmin.code, role: 'user', status: { $ne: 'delete' } };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: `User ${status} successfully`,
      totalUsers,
      data: allUsers,
    });
  } catch (error) {
    console.error('Update SubAdmin Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

export const updateUserLock = async (req, res) => {
  try {
    const { id } = req;
    const { userId, lockType, lock, masterPassword, remark } = req.body;

    const normalizedLockType = lockType === 'bLock' ? 'betLock' : lockType;

    if (!['uLock', 'betLock'].includes(normalizedLockType)) {
      return res.status(400).json({ message: 'Invalid lock type.' });
    }

    if (typeof lock !== 'boolean') {
      return res.status(400).json({ message: 'Invalid lock value.' });
    }

    const subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    const isMatch = await verifyMasterPassword(subAdmin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid login password.' });
    }

    const editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    editUser[normalizedLockType] = lock;
    if (normalizedLockType === 'betLock') {
      editUser.bLock = undefined;
    }
    if (normalizedLockType === 'uLock' && lock) {
      editUser.sessionToken = null;
    }
    if (remark) {
      editUser.remark = remark;
    }
    await editUser.save();

    const lockLabel = normalizedLockType === 'uLock' ? 'User lock' : 'Bet lock';
    return res.status(200).json({
      success: true,
      message: lock
        ? `${lockLabel} enabled successfully`
        : `${lockLabel} disabled successfully`,
    });
  } catch (error) {
    console.error('Update User Lock Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

export const changePasswordBySelf = async (req, res) => {
  const { id } = req; // Sub-admin ID (admin making the change)
  try {
    const { oldPassword, newPassword } = req.body;
    const subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    // Validate new password: must contain letters AND numbers, NO special characters
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters with both letters and numbers. Special characters are not allowed.',
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, subAdmin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old Password Wrong !' });
    }
    subAdmin.password = newPassword;
    subAdmin.isPasswordChanged = false;
    subAdmin.masterPassword = undefined;
    await subAdmin.save();
    await passwordHistory.create({
      userName: subAdmin.userName,
      remark: 'Password Changed By Self.',
      userId: id,
    });
    return res
      .status(200)
      .json({ message: 'Password changed successfully', data: subAdmin });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};
export const changePasswordByDownline = async (req, res) => {
  const adminId = req.id; // Sub-admin ID (admin making the change)
  try {
    // const { oldPassword, newPassword, id } = req.body;
    const { newPassword, id, masterPassword } = req.body;
    const Admin = await SubAdmin.findById(adminId);
    const subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }
    if (!Admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (subAdmin.invite !== Admin.code) {
      return res.status(403).json({
        message: 'You can change password only for your direct downline.',
      });
    }

    // Validate new password: must contain letters AND numbers, NO special characters
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters with both letters and numbers. Special characters are not allowed.',
      });
    }

    // const isMatch = await bcrypt.compare(oldPassword, Admin.password);
    const isMatch = await verifyMasterPassword(Admin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'master Password Wrong !' });
    }
    subAdmin.password = newPassword;
    // Force first-login flow again for downline after parent reset.
    subAdmin.isPasswordChanged = false;
    subAdmin.masterPassword = undefined;
    await subAdmin.save();
    await passwordHistory.create({
      userName: subAdmin.userName,
      remark: `Password Changed By ${Admin.userName}`,
      userId: id,
    });
    return res
      .status(200)
      .json({ message: 'Password changed successfully', data: subAdmin });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res
      .status(500)
      .json({ message: error.message, error: error.message });
  }
};

export const getPasswordHistoryByUserId = async (req, res) => {
  const { id } = req; // Sub-admin ID (admin making the change)
  try {
    // passed in route as /credit-ref-history/:userId
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const filter = {
      userId: id,
    };

    const data = await passwordHistory
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await passwordHistory.countDocuments(filter);

    return res.status(200).json({
      message: 'Password History fetched successfully',
      data,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching creditRefHistory:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      success: false,
    });
  }
};

export const getAgentTransactionHistory = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const { id } = req;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: 'User ID is required' });
    }

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    // Collect all downline invite codes recursively (all levels)
    const allDownlineCodes = new Set([admin.code]);
    const codesToProcess = [admin.code];

    while (codesToProcess.length > 0) {
      const currentCode = codesToProcess.pop();
      const downlines = await SubAdmin.find(
        { invite: currentCode, status: { $ne: 'delete' } },
        { code: 1, role: 1 }
      ).lean();

      for (const dl of downlines) {
        if (dl.code && dl.role !== 'user') {
          allDownlineCodes.add(dl.code);
          codesToProcess.push(dl.code);
        }
      }
    }

    // Match transactions at ALL levels + own transactions from upline
    const filter = {
      $or: [{ invite: { $in: [...allDownlineCodes] } }, { userId: id }],
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.date = { $gte: start, $lte: end };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 10), 100);

    const totalCount = await TransactionHistory.countDocuments(filter);

    const transactions = await TransactionHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Privacy: replace from/to with relative labels and strip upline identifiers
    const adminUserName = admin.userName;
    const maskedTransactions = transactions.map((txn) => {
      const masked = { ...txn };

      // Always remove invite code — it reveals upline identity
      delete masked.invite;

      if (masked.from === adminUserName) {
        // Current admin performed this transaction on a downline
        masked.from = 'You';
      } else if (masked.to === adminUserName) {
        // Upline performed this transaction on current admin
        masked.from = 'Upline';
        masked.to = 'You';
      }
      // Otherwise: transaction between downlines — show actual names
      return masked;
    });

    return res.status(200).json({
      success: true,
      data: maskedTransactions,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      totalRecords: totalCount,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const getUserTransactionHistory = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const { userId } = req.params;
    const { id } = req; // Authenticated admin ID from middleware

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: 'User ID is required' });
    }

    // Verify the authenticated admin exists
    const admin = await SubAdmin.findById(id, {
      code: 1,
      userName: 1,
      role: 1,
    }).lean();
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    // Verify target user exists and is a downline of the authenticated admin
    const targetUser = await SubAdmin.findById(userId, {
      invite: 1,
      userName: 1,
      code: 1,
      role: 1,
    }).lean();
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // Supperadmin can view any user; others must prove downline ownership
    if (admin.role !== 'supperadmin') {
      // Traverse upward from target user to verify the admin is an ancestor
      let isDownline = false;
      let currentInvite = targetUser.invite;
      const maxDepth = 10; // Safety limit to prevent infinite loops
      let depth = 0;

      while (currentInvite && depth < maxDepth) {
        if (currentInvite === admin.code) {
          isDownline = true;
          break;
        }
        const parent = await SubAdmin.findOne(
          { code: currentInvite },
          { invite: 1, code: 1 }
        ).lean();
        if (!parent) break;
        currentInvite = parent.invite;
        depth++;
      }

      if (!isDownline) {
        return res
          .status(403)
          .json({ success: false, message: 'Access denied' });
      }
    }

    // Collect target user's own code + all downline invite codes recursively
    const allDownlineCodes = new Set([targetUser.code]);
    const codesToProcess = [targetUser.code];

    while (codesToProcess.length > 0) {
      const currentCode = codesToProcess.pop();
      const downlines = await SubAdmin.find(
        { invite: currentCode, status: { $ne: 'delete' } },
        { code: 1, role: 1 }
      ).lean();

      for (const dl of downlines) {
        if (dl.code && dl.role !== 'user') {
          allDownlineCodes.add(dl.code);
          codesToProcess.push(dl.code);
        }
      }
    }

    // Match: target user's own transactions + all downline transactions
    const filter = {
      $or: [{ invite: { $in: [...allDownlineCodes] } }, { userId: userId }],
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 10), 100);

    const totalCount = await TransactionHistory.countDocuments(filter);

    const transactions = await TransactionHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Privacy: mask upline references and strip invite codes
    const adminUserName = admin.userName;
    const targetUserName = targetUser.userName;
    const maskedTransactions = transactions.map((txn) => {
      const masked = { ...txn };

      // Always remove invite code — it reveals upline identity
      delete masked.invite;

      // If someone sent funds TO the target user and it wasn't the viewing admin,
      // mask the sender as 'Upline' to hide superior identity
      if (masked.to === targetUserName && masked.from !== adminUserName) {
        masked.from = 'Upline';
      }

      // If the viewing admin performed the transaction, label as 'You'
      if (masked.from === adminUserName) {
        masked.from = 'You';
      }

      return masked;
    });

    return res.status(200).json({
      success: true,
      data: maskedTransactions,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      totalRecords: totalCount,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAllDownlineBets = async (req, res) => {
  try {
    const { id } = req;
    const {
      startDate,
      endDate,
      page,
      limit,
      selectedGame,
      selectedVoid,
      selectedType,
      selectedSport,
      selectedEvent,
      selectedMarketType,
      selectedMarket,
      selectedStatus,
      userName
    } = req.query;

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    const hierarchy = await SubAdmin.aggregate([
      { $match: { _id: admin._id } },
      {
        $graphLookup: {
          from: 'subadmins',
          startWith: '$code',
          connectFromField: 'code',
          connectToField: 'invite',
          as: 'downlines',
          restrictSearchWithMatch: { status: { $ne: 'delete' } }
        },
      },
      {
        $project: {
          userIds: {
            $map: {
              input: {
                $filter: {
                  input: '$downlines',
                  as: 'd',
                  cond: { $eq: ['$$d.role', 'user'] }
                }
              },
              as: 'u',
              in: { $toString: '$$u._id' }
            }
          }
        }
      }
    ]);

    let userIds = hierarchy[0]?.userIds || [];
    
    // Add admin itself if role is user (edge case)
    if (admin.role === 'user') {
      userIds.push(admin._id.toString());
    }

    const filter = { userId: { $in: userIds } };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lte: end };
    }

    if (selectedGame) {
      filter.gameName = selectedGame;
    }
    if (selectedSport) {
      filter.gameName = { $regex: new RegExp(selectedSport, 'i') };
    }
    if (selectedEvent) {
      filter.eventName = selectedEvent;
    }
    if (selectedMarketType) {
      filter.gameType = selectedMarketType;
    }
    if (selectedMarket) {
      filter.marketName = selectedMarket;
    }
    if (selectedType) {
      filter.otype = selectedType;
    }
    // Exclude DECLARED (status 0) by default unless explicitly requested via filters.
    filter.status = { $ne: 0 };

    // Filter by selectedVoid if provided
    if (selectedVoid === 'settel') {
      filter.status = { $ne: 0 };
    } else if (selectedVoid === 'void') {
      filter.status = 3;
    } else if (selectedVoid === 'unsettel') {
      filter.status = 0;
    }

    if (selectedStatus) {
      filter.status = Number(selectedStatus);
    }

    if (userName) {
      filter.userName = { $regex: new RegExp(userName, 'i') };
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 25;

    // Fetch bets for all collected users
    const betData = await betHistoryModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalCount = await betHistoryModel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      totalUsers: userIds.length,
      totalBets: betData.length,
      data: betData,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    console.error('Error fetching bets:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getTotalProfitLossReport = async (req, res) => {
  try {
    const { id } = req;
    const { startDate, endDate, searchQuery = '', userName = '' } = req.query;

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    // Collect all end-user ids under current admin recursively.
    const queue = [admin.code];
    const userIds = [];
    while (queue.length > 0) {
      const currentCode = queue.shift();
      const downlineUsers = await SubAdmin.find({
        invite: currentCode,
        status: { $ne: 'delete' },
      });

      for (const user of downlineUsers) {
        if (user.role === 'user') userIds.push(user._id.toString());
        else queue.push(user.code);
      }
    }

    if (!userIds.length) {
      return res.status(200).json({
        success: true,
        data: {
          sportsReport: [],
          casinoReport: [],
          sportsTotal: 0,
          casinoTotal: 0,
        },
      });
    }

    const filter = {
      userId: { $in: userIds },
      status: { $in: [1, 2] }, // Settled only
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const escapeRegex = (value) =>
      String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (userName) {
      filter.userName = { $regex: `^${escapeRegex(userName)}$`, $options: 'i' };
    } else if (searchQuery) {
      filter.userName = { $regex: searchQuery, $options: 'i' };
    }

    const settledBets = await betHistoryModel.find(filter).lean();

    const SPORTS_GAMES = new Set([
      'cricket',
      'tennis',
      'soccer',
      'football',
      'basketball',
      'horse racing',
      'greyhound racing',
      'fancy',
      'sports',
      'match odds',
    ]);

    const SPORTS_MARKET_KEYWORDS = [
      'match_odds',
      'match odds',
      'bookmaker',
      'toss',
      'fancy',
      'session',
      'winner',
      'over_under',
      'over/under',
      'handicap',
      '1x2',
      'odds',
    ];

    const isSportsBet = (bet) => {
      const betType = String(bet.betType || '')
        .toLowerCase()
        .trim();
      const gameName = String(bet.gameName || '')
        .toLowerCase()
        .trim();
      const marketName = String(bet.marketName || '')
        .toLowerCase()
        .trim();
      const gameType = String(bet.gameType || '')
        .toLowerCase()
        .trim();
      const eventName = String(bet.eventName || '')
        .toLowerCase()
        .trim();

      // Primary source of truth from bet model/history.
      if (betType === 'sports') return true;
      if (betType === 'casino') return false;

      if (SPORTS_GAMES.has(gameName)) return true;
      if (
        SPORTS_MARKET_KEYWORDS.some(
          (keyword) =>
            marketName.includes(keyword) || gameType.includes(keyword)
        )
      ) {
        return true;
      }

      // Sports fixtures are commonly formatted as "Team A v Team B" / "vs".
      if (/\b(v|vs|v\.)\b/.test(eventName)) return true;

      return false;
    };

    const reportMap = new Map();

    for (const bet of settledBets) {
      const isSports = isSportsBet(bet);
      let sport = 'Casino';
      if (isSports) {
        sport = String(bet.gameName || 'Sports').charAt(0).toUpperCase() + String(bet.gameName || 'Sports').slice(1).toLowerCase();
      }

      let marketName = String(bet.marketName || bet.gameType || bet.eventName || '-').toUpperCase();
      
      const pl = Number(bet.profitLossChange || 0);
      const commission = Number(bet.commission || 0);

      const key = `${sport}__${marketName}`;
      if (!reportMap.has(key)) {
        reportMap.set(key, {
          sport,
          marketName,
          pl: 0,
          commission: 0,
          amount: 0,
        });
      }
      
      const row = reportMap.get(key);
      row.pl += pl;
      row.commission += commission;
      row.amount = row.pl + row.commission;
    }

    const data = [...reportMap.values()];
    const totalPL = data.reduce((sum, row) => sum + row.pl, 0);
    const totalCommission = data.reduce((sum, row) => sum + row.commission, 0);
    const totalAmount = data.reduce((sum, row) => sum + row.amount, 0);

    return res.status(200).json({
      success: true,
      data: {
        report: data,
        totalPL,
        totalCommission,
        totalAmount,
      },
    });
  } catch (error) {
    console.error('Error fetching total profit/loss report:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getEventProfitLossReport = async (req, res) => {
  try {
    const { id } = req;
    const { startDate, endDate, searchQuery = '', userName = '' } = req.query;

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    const queue = [admin.code];
    const userIds = [];
    while (queue.length > 0) {
      const currentCode = queue.shift();
      const downlineUsers = await SubAdmin.find({
        invite: currentCode,
        status: { $ne: 'delete' },
      });

      for (const user of downlineUsers) {
        if (user.role === 'user') userIds.push(user._id.toString());
        else queue.push(user.code);
      }
    }

    if (!userIds.length) {
      return res.status(200).json({
        success: true,
        data: { report: [], totalPL: 0, totalAmount: 0, totalOrders: 0 },
      });
    }

    const filter = {
      userId: { $in: userIds },
      status: { $in: [1, 2] },
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (userName) {
      filter.userName = { $regex: `^${escapeRegex(userName)}$`, $options: 'i' };
    } else if (searchQuery) {
      filter.userName = { $regex: searchQuery, $options: 'i' };
    }

    const settledBets = await betHistoryModel.find(filter).lean();

    const reportMap = new Map();

    for (const bet of settledBets) {
      let sport = String(bet.gameName || 'Sports');
      sport = sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
      
      const competition = String(bet.gameType || '-');
      const event = String(bet.eventName || '-');
      const pl = Number(bet.profitLossChange || 0);
      const amount = Number(bet.betAmount || 0);

      const key = `${sport}__${event}`;
      if (!reportMap.has(key)) {
        reportMap.set(key, {
          sport,
          competition,
          event,
          orderCount: 0,
          totalAmount: 0,
          pl: 0,
          marketsMap: new Map(),
        });
      }
      
      const row = reportMap.get(key);
      row.orderCount += 1;
      row.totalAmount += amount;
      row.pl += pl;

      const marketName = String(bet.marketName || bet.gameType || '-').toUpperCase();
      if (!row.marketsMap.has(marketName)) {
        row.marketsMap.set(marketName, {
          market: marketName,
          orderCount: 0,
          totalAmount: 0,
          pl: 0,
        });
      }
      const mRow = row.marketsMap.get(marketName);
      mRow.orderCount += 1;
      mRow.totalAmount += amount;
      mRow.pl += pl;
    }

    const data = [...reportMap.values()].map(row => ({
      ...row,
      markets: [...row.marketsMap.values()],
      marketsMap: undefined, // remove map from final output
    }));
    const totalPL = data.reduce((sum, row) => sum + row.pl, 0);
    const totalAmount = data.reduce((sum, row) => sum + row.totalAmount, 0);
    const totalOrders = data.reduce((sum, row) => sum + row.orderCount, 0);

    return res.status(200).json({
      success: true,
      data: {
        report: data,
        totalPL,
        totalAmount,
        totalOrders,
      },
    });
  } catch (error) {
    console.error('Error fetching event profit/loss report:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};

export const parentsDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const beta = await SubAdmin.findById(id);
    if (!beta) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const papa = (await SubAdmin.findOne({ code: beta.invite })) || null;
    const dada = papa ? await SubAdmin.findOne({ code: papa.invite }) : null;

    const dataArray = [beta];
    if (papa) dataArray.push(papa);
    if (dada) dataArray.push(dada);

    return res.status(200).json({
      success: true,
      message: 'Parent details fetched successfully',
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

export const updateGameLock = async (req, res) => {
  try {
    const { id } = req.params;
    const { game, lock } = req.body;

    // Validate input
    if (typeof lock !== 'boolean' || typeof game !== 'string') {
      return res.status(400).json({
        success: false,
        message:
          "Invalid input. 'game' must be a string and 'lock' must be boolean.",
      });
    }

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const gameIndex = admin.gamelock.findIndex((g) => g.game === game);
    if (gameIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Game not found in user's gamelock list",
      });
    }

    // Server-side parent-lock validation: cannot enable a game the parent has disabled
    if (lock === true && admin.invite) {
      const parent = await SubAdmin.findOne({ code: admin.invite });
      if (parent) {
        const parentGameEntry = parent.gamelock.find((g) => g.game === game);
        if (parentGameEntry && parentGameEntry.lock === false) {
          return res.status(403).json({
            success: false,
            message: `Cannot enable '${game}' because it is locked by a higher-level admin`,
          });
        }
      }
    }

    admin.gamelock[gameIndex].lock = lock;
    admin.markModified('gamelock');
    await admin.save();

    // User-level update
    if (admin.role === 'user') {
      sendUserRefresh(String(admin._id));
      return res.status(200).json({
        success: true,
        message: `Lock status for ${admin.gamelock[gameIndex].game} updated successfully`,
        gamelock: admin.gamelock,
      });
    }
    // Agent/Admin hierarchical update
    else {
      let queue = [admin.code];
      let skippedUsers = 0;
      while (queue.length > 0) {
        const currentCode = queue.shift();

        const downlineUsers = await SubAdmin.find({
          invite: currentCode,
          status: { $ne: 'delete' },
        });

        for (const user of downlineUsers) {
          const userGameIndex = user.gamelock.findIndex((g) => g.game === game);
          if (userGameIndex === -1) {
            // Skip users missing this game entry instead of aborting the whole traversal
            skippedUsers++;
            if (user.code) {
              queue.push(user.code);
            }
            continue;
          }

          if (lock === false) {
            // Locking: always propagate lock down
            user.gamelock[userGameIndex].lock = false;
          } else {
            // Unlocking: only unlock if user's direct parent has the game enabled
            const directParent = await SubAdmin.findOne({ code: user.invite });
            if (directParent) {
              const parentEntry = directParent.gamelock.find(
                (g) => g.game === game
              );
              if (parentEntry && parentEntry.lock === true) {
                user.gamelock[userGameIndex].lock = true;
              }
              // If parent still has it locked, don't unlock this user
            }
          }

          user.markModified('gamelock');
          console.log(
            `🚨 [USER-SAVE] subAdminController saving user ${user.userName}`
          );
          await user.save();

          if (user.code) {
            queue.push(user.code);
          }
        }
      }

      await refreshUserAndDownlines(admin._id);

      return res.status(200).json({
        success: true,
        message: `Game locked successfully`,
        gamelock: admin.gamelock,
        details: {
          game,
          lock,
          skippedUsers,
        },
      });
    }
  } catch (error) {
    console.error('Error updating game lock:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getRegisterDetailReport = async (req, res) => {
  try {
    const { id, role } = req;
    const { searchQuery = '', type = 'all' } = req.query;

    const requester = await SubAdmin.findById(id).lean();
    if (!requester) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    const filter = { status: { $ne: 'delete' } };
    if (role === 'supperadmin' || role === 'superadmin') {
      // Superadmin can see all roles except other superadmins; keep own row visible.
      filter.$or = [{ role: { $ne: 'supperadmin' } }, { _id: requester._id }];
    } else {
      filter.invite = requester.code;
    }

    if (searchQuery.trim()) {
      filter.userName = { $regex: searchQuery.trim(), $options: 'i' };
    }

    const users = await SubAdmin.find(
      filter,
      'userName invite role createdAt lastLogin'
    )
      .sort({ createdAt: -1 })
      .lean();

    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        const agent = user.invite
          ? await SubAdmin.findOne({ code: user.invite }, 'userName').lean()
          : null;

        const deposits = await DepositHistory.find(
          { userName: user.userName },
          'amount createdAt'
        )
          .sort({ createdAt: 1 })
          .lean();

        const plRows = await betHistoryModel.aggregate([
          {
            $match: {
              userId: user._id.toString(),
              status: { $in: [1, 2] },
            },
          },
          {
            $group: {
              _id: '$betType',
              totalPL: { $sum: '$profitLossChange' },
            },
          },
        ]);

        const sportsPL = plRows
          .filter((row) => row._id !== 'casino')
          .reduce((sum, row) => sum + Number(row.totalPL || 0), 0);
        const casinoPL = plRows
          .filter((row) => row._id === 'casino')
          .reduce((sum, row) => sum + Number(row.totalPL || 0), 0);

        const createdDate = user.createdAt || null;
        const lastLoginDate = user.lastLogin || null;
        const firstDepositDate = deposits[0]?.createdAt || null;
        const lastDepositDate =
          deposits[deposits.length - 1]?.createdAt || null;
        const totalDeposit = deposits.reduce(
          (sum, d) => sum + Number(d.amount || 0),
          0
        );

        return {
          userName: user.userName,
          agentName: agent?.userName || '-',
          role: user.role,
          createdDate,
          lastLoginDate,
          firstDepositDate,
          lastDepositDate,
          deposit: totalDeposit,
          sportsPL,
          casinoPL,
        };
      })
    );

    const filteredByType =
      type === 'createdDate'
        ? usersWithDetails.filter((row) => row.createdDate)
        : type === 'lastLoginDate'
          ? usersWithDetails.filter((row) => row.lastLoginDate)
          : usersWithDetails;

    return res.status(200).json({
      success: true,
      data: filteredByType,
    });
  } catch (error) {
    console.error('Error fetching register detail report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/** Sum end-user bettingProfitLoss for entire branch under an agent/admin code. */
const sumEndUserBettingPLUnderCode = async (rootCode) => {
  if (!rootCode) return 0;
  const agg = await SubAdmin.aggregate([
    { $match: { code: rootCode, status: { $ne: 'delete' } } },
    {
      $graphLookup: {
        from: 'subadmins',
        startWith: '$code',
        connectFromField: 'code',
        connectToField: 'invite',
        as: 'branch',
        restrictSearchWithMatch: { status: { $ne: 'delete' }, role: 'user' },
      },
    },
    { $unwind: '$branch' },
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ['$branch.bettingProfitLoss', 0] } },
      },
    },
  ]);
  return roundMoney(agg[0]?.total || 0);
};

/**
 * Direct settlement P/L between parent and one direct downline (single source for
 * User/Master Settlement lists and header Up Line with upline).
 * - End-user: bet history − cash settlements on that user only.
 * - Admin/agent: parent's partnership % of each user's outstanding P/L, then
 *   cash settlements on that admin/agent account only (does not auto-clear users).
 */
const getDirectSettlementPL = async (parentAdmin, downline) => {
  if (downline.role === 'user') {
    const plResult = await betHistoryModel.aggregate([
      {
        $match: {
          userId: downline._id.toString(),
          status: { $in: [1, 2] },
        },
      },
      { $group: { _id: null, totalPL: { $sum: '$profitLossChange' } } },
    ]);
    const sportsPL = plResult.length > 0 ? roundMoney(plResult[0].totalPL) : 0;

    let casinoPL = 0;
    const casinoAgg = await CasinoBetHistory.aggregate([
      {
        $match: {
          userId: downline._id.toString(),
          $or: [{ bet_amount: { $gt: 0 } }, { win_amount: { $gt: 0 } }],
        },
      },
      {
        $group: {
          _id: null,
          totalPL: {
            $sum: {
              $subtract: [
                { $ifNull: ['$win_amount', 0] },
                { $ifNull: ['$bet_amount', 0] },
              ],
            },
          },
        },
      },
    ]);
    casinoPL = casinoAgg.length > 0 ? roundMoney(casinoAgg[0].totalPL) : 0;

    const historyPL = roundMoney(sportsPL + casinoPL);
    const settlementCash = await getSettlementCashTotals(
      TransactionHistory,
      downline._id
    );
    const clientPL = expectedBettingPLFromHistory(historyPL, settlementCash);

    return {
      clientPL,
      grossClientPL: clientPL,
      sharePercent: 100,
    };
  }

  // The share passed up to the parent is EVERYTHING the downline does not keep.
  // This ensures the parent collects the full liability on behalf of the whole upstream chain.
  const parentSharePercent = roundMoney(
    Math.max(0, 100 - getAccountMyKeepPercent(downline))
  );

  const downlineUserIds = await getDownlineUserIds(SubAdmin, downline.code);
  const adminSettlementCash = await getSettlementCashTotals(
    TransactionHistory,
    downline._id
  );

  if (!downlineUserIds.length) {
    const historyGross = await aggregateDownlineParentViewPL(
      SubAdmin,
      betHistoryModel,
      CasinoBetHistory,
      downline.code,
      null
    );
    const passedUpHistory = roundMoney(
      (-historyGross * parentSharePercent) / 100
    );
    const clientPL = expectedBettingPLFromHistory(
      passedUpHistory,
      adminSettlementCash
    );
    return {
      clientPL,
      grossClientPL: roundMoney(-historyGross),
      sharePercent: parentSharePercent,
    };
  }

  const endUsers = await SubAdmin.find({
    _id: { $in: downlineUserIds },
    role: 'user',
    status: { $ne: 'delete' },
  })
    .select('_id userName role invite code')
    .lean();

  const [{ expectedPLByUserId, historyPLByUserId }, accountByCode] =
    await Promise.all([
      getDownlineOutstandingPLMaps(
        SubAdmin,
        betHistoryModel,
        CasinoBetHistory,
        TransactionHistory,
        downline.code
      ),
      getAccountByCodeMap(SubAdmin, parentAdmin),
    ]);
  accountByCode.set(downline.code, downline);

  let grossClientPL = 0;
  for (const user of endUsers) {
    grossClientPL += roundMoney(
      historyPLByUserId.get(user._id.toString()) ?? 0
    );
  }
  grossClientPL = roundMoney(grossClientPL);

  const passedUpHistory = roundMoney(
    (grossClientPL * parentSharePercent) / 100
  );
  const clientPL = expectedBettingPLFromHistory(
    passedUpHistory,
    adminSettlementCash
  );

  return {
    clientPL,
    grossClientPL,
    sharePercent: parentSharePercent,
  };
};

export const getSettlementUsers = async (req, res) => {
  try {
    const { id, role } = req;
    const { roleType } = req.query; // 'user' or 'master'

    // Find the admin making the request
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    await updateAdmin(id);

    // Only fetch direct downlines (since settlement is direct)
    let filter = { status: { $ne: 'delete' }, invite: admin.code };

    if (roleType === 'user') {
      filter.role = 'user';
    } else if (roleType === 'master') {
      // Master settles all direct non-user downlines (admin, agent, etc.)
      filter.role = { $nin: ['user', 'supperadmin'] };
    } else {
      // Default non-user settlement: any direct downline except end users.
      filter.role = { $nin: ['user', 'supperadmin', 'superadmin'] };
    }

    const downlines = await SubAdmin.find(filter).lean();

    const creditors = [];
    const debtors = [];

    for (const user of downlines) {
      const { clientPL, grossClientPL, sharePercent } =
        await getDirectSettlementPL(admin, user);
      if (Math.abs(clientPL) < 0.01) continue;

      // pl > 0: downline won their share (creditor / dena hai)
      // pl < 0: downline lost their share (debtor / lena hai)

      const userData = {
        _id: user._id,
        userName: user.userName,
        role: user.role,
        balance: user.balance,
        baseBalance: user.baseBalance,
        creditReference: user.creditReference,
        clientPL,
        grossClientPL,
        sharePercent,
      };

      if (clientPL > 0) {
        creditors.push(userData);
      } else if (clientPL < 0) {
        debtors.push(userData);
      }
    }

    return res.status(200).json({
      success: true,
      creditors,
      debtors,
    });
  } catch (error) {
    console.error('Error in getSettlementUsers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const settleUser = async (req, res) => {
  try {
    const { id } = req; // Admin making the change
    const { userId, amount, remarks, masterPassword } = req.body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res
        .status(400)
        .json({ message: 'Valid positive amount is required' });
    }

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Verify Master Password
    const isMatch = await verifyMasterPassword(admin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid login password.' });
    }

    const editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (editUser.invite !== admin.code) {
      return res.status(403).json({
        message: 'You can only settle with your direct downlines.',
      });
    }

    const { clientPL: pl, grossClientPL } = await getDirectSettlementPL(
      admin,
      editUser
    );

    if (Math.abs(pl) < 0.01) {
      return res
        .status(400)
        .json({ message: 'No settled P/L to settle for this account' });
    }

    const settleRemark = `Settlement: ${remarks || ''}`.trim();

    // Determine if user is Creditor or Debtor
    if (pl > 0) {
      // User is Creditor (admin owes user).
      if (parsedAmount > pl) {
        return res
          .status(400)
          .json({ message: 'Cannot settle more than the outstanding P/L' });
      }

      editUser.avbalance -= parsedAmount;
      editUser.balance -= parsedAmount;
      if (editUser.role === 'user') {
        editUser.bettingProfitLoss = roundMoney(
          (editUser.bettingProfitLoss || 0) - parsedAmount
        );
      } else {
        editUser.uplineBettingProfitLoss = roundMoney(
          (editUser.uplineBettingProfitLoss || 0) - parsedAmount
        );
        editUser.bettingProfitLoss = editUser.uplineBettingProfitLoss;
      }
      editUser.remark = settleRemark;
      editUser.creditReferenceProfitLoss =
        editUser.baseBalance - (editUser.creditReference || 0);

      if (admin.role !== 'supperadmin' && admin.role !== 'superadmin') {
        admin.avbalance += parsedAmount;
        admin.balance += parsedAmount;
      }

      await admin.save();
      await editUser.save();

      // Log it as a settlement transaction
      await TransactionHistory.create({
        userId: String(editUser._id),
        userName: editUser.userName,
        withdrawl: parsedAmount, // It's a withdrawal of winnings
        deposite: 0,
        amount: editUser.avbalance,
        from: admin.userName,
        to: editUser.userName,
        remark: settleRemark,
        invite: admin.code,
      });
    } else if (pl < 0) {
      // User is Debtor (user owes admin).
      const absPl = Math.abs(pl);
      if (parsedAmount > absPl) {
        return res
          .status(400)
          .json({ message: 'Cannot settle more than the outstanding P/L' });
      }

      editUser.avbalance += parsedAmount;
      editUser.balance += parsedAmount;
      if (editUser.role === 'user') {
        editUser.bettingProfitLoss = roundMoney(
          (editUser.bettingProfitLoss || 0) + parsedAmount
        );
      } else {
        editUser.uplineBettingProfitLoss = roundMoney(
          (editUser.uplineBettingProfitLoss || 0) + parsedAmount
        );
        editUser.bettingProfitLoss = editUser.uplineBettingProfitLoss;
      }
      editUser.remark = settleRemark;
      editUser.creditReferenceProfitLoss =
        editUser.baseBalance - (editUser.creditReference || 0);

      if (admin.role !== 'supperadmin' && admin.role !== 'superadmin') {
        admin.avbalance -= parsedAmount;
        admin.balance -= parsedAmount;
      }

      await admin.save();
      await editUser.save();

      await TransactionHistory.create({
        userId: String(editUser._id),
        userName: editUser.userName,
        withdrawl: 0,
        deposite: parsedAmount, // Depositing to pay off losses
        amount: editUser.avbalance,
        from: editUser.userName,
        to: admin.userName,
        remark: settleRemark,
        invite: admin.code,
      });
    }

    // Run heavy calculations in the background for 30k+ user performance
    refreshSettlementHierarchy(id, userId).catch(console.error);

    (async () => {
      try {
        let summaryPayload = await loadAccountSummaryForAdmin(id);
        const settledAt = new Date();

        if (summaryPayload?.linesFullyCleared) {
          await setWeekPLResetNow(SubAdmin, id, settledAt);
        } else {
          await SubAdmin.findByIdAndUpdate(id, {
            $unset: { weekPLResetAt: 1 },
          });
        }
      } catch (err) {
        console.error('Background settlement summary error:', err);
      }
    })();

    return res.status(200).json({
      success: true,
      message: 'Settlement completed successfully',
      accountSummary: null,
    });
  } catch (error) {
    console.error('Error in settleUser:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getUserFullDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { id, role } = req;

    const viewer = await SubAdmin.findById(id, { code: 1, role: 1 }).lean();
    if (!viewer) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    const user = await SubAdmin.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    const isSuperAdmin = role === 'supperadmin' || role === 'superadmin';
    if (!isSuperAdmin) {
      const inDownline = await isAccountInAdminDownline(
        SubAdmin,
        viewer.code,
        user
      );
      if (!inDownline) {
        return res.status(403).json({
          success: false,
          message: 'You can only view users in your downline',
        });
      }
    }

    // Get parent
    const parent = await SubAdmin.findOne({ code: user.invite });

    // Aggregate Sports Bets
    const sportsBetsAgg = await betHistoryModel.aggregate([
      { $match: { userId: user._id.toString(), status: { $in: [1, 2] } } },
      {
        $group: {
          _id: {
            sport: '$gameName',
            market: '$marketName',
            gameType: '$gameType',
          },
          totalBet: { $sum: 1 },
          betAmount: { $sum: '$betAmount' },
          profitLoss: { $sum: '$profitLossChange' },
          matchOddsNetWinPL: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: { $ifNull: ['$gameType', ''] },
                        regex: /match\s*odds/i,
                      },
                    },
                    { $gt: ['$profitLossChange', 0] },
                  ],
                },
                '$profitLossChange',
                0,
              ],
            },
          },
        },
      },
    ]);

    // Aggregate Casino Bets (net = win - stake; only real rounds)
    const casinoBetsAgg = await CasinoBetHistory.aggregate([
      {
        $match: {
          userId: user._id.toString(),
          $or: [{ bet_amount: { $gt: 0 } }, { win_amount: { $gt: 0 } }],
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$game_name', 'Unknown'] },
          profitLoss: {
            $sum: {
              $subtract: [
                { $ifNull: ['$win_amount', 0] },
                { $ifNull: ['$bet_amount', 0] },
              ],
            },
          },
          betCount: { $sum: 1 },
          totalStaked: { $sum: { $ifNull: ['$bet_amount', 0] } },
        },
      },
      { $match: { totalStaked: { $gt: 0 } } },
    ]);

    // Process Game Play Data
    const sportSummary = {};
    const marketSummary = [];
    let overallSportsPL = 0;
    let overallSportsBets = 0;
    let totalCommissionDebited = 0;

    // We parse the commission percent from the user model
    // This is the rate debited on match odds winning bets
    const commissionRate = user.commition
      ? Number(user.commition.toString().replace('%', ''))
      : 0;
    const rateFraction = commissionRate / 100;

    sportsBetsAgg.forEach((item) => {
      const sport = item._id.sport || 'Unknown';
      const market = item._id.market || 'Unknown';

      const pl = roundMoney(Number(item.profitLoss) || 0);
      const betCount = Number(item.totalBet) || 0;
      const betAmount = roundMoney(Number(item.betAmount) || 0);

      // Extract match-odds win PL for commission reverse-calculation
      const matchOddsNetWinPL = Number(item.matchOddsNetWinPL) || 0;

      // Calculate commission debited dynamically
      // Since profitLossChange in DB is netProfit (after commission), we reverse calculate:
      // netProfit = profit - profit * rateFraction => profit = netProfit / (1 - rateFraction)
      // commission = profit - netProfit
      if (matchOddsNetWinPL > 0 && rateFraction > 0 && rateFraction < 1) {
        const originalProfit = matchOddsNetWinPL / (1 - rateFraction);
        const commission = originalProfit - matchOddsNetWinPL;
        totalCommissionDebited += commission;
      }

      // Accumulate for sport
      if (!sportSummary[sport]) {
        sportSummary[sport] = {
          sport,
          betCount: 0,
          betAmount: 0,
          profitLoss: 0,
        };
      }
      sportSummary[sport].betCount += betCount;
      sportSummary[sport].betAmount += betAmount;
      sportSummary[sport].profitLoss += pl;

      overallSportsPL += pl;
      overallSportsBets += betCount;

      marketSummary.push({
        sport,
        market,
        profitLoss: pl,
      });
    });

    const casinoSummary = [];
    let overallCasinoPL = 0;
    casinoBetsAgg.forEach((item) => {
      const pl = roundMoney(Number(item.profitLoss) || 0);
      if (pl === 0 && (item.totalStaked || 0) <= 0) return;
      const casino =
        typeof item._id === 'string'
          ? item._id
          : item._id?.game_name || 'Unknown';
      casinoSummary.push({
        casino,
        profitLoss: pl,
        betCount: item.betCount || 0,
      });
      overallCasinoPL += pl;
    });

    overallSportsPL = roundMoney(overallSportsPL);
    overallCasinoPL = roundMoney(overallCasinoPL);
    const totalPL = roundMoney(overallSportsPL + overallCasinoPL);

    // Calculate Exposure
    let exposure = user.exposure || 0;
    if (user.role === 'user') {
      const pendingBets = await betModel.find({
        userId: user._id.toString(),
        status: 0,
      });
      exposure = calculateAllExposure(pendingBets);
    } else {
      exposure = user.totalExposure || user.exposure || 0;
    }

    const payload = {
      userInfo: {
        userName: user.userName,
        role: user.role,
        clientName: user.name || user.userName,
        referenceName: parent ? parent.userName : '-',
        email: user.email || '',
        mobile: user.phone || '',
        parents: parent ? parent.userName : '-',
      },
      settings: {
        userLock: user.uLock || false,
        betLock: user.betlock || false,
        checkLimit: false, // Placeholder if not in DB
      },
      accountDetails: {
        creditRef: user.creditReference || 0,
        balance: user.baseBalance || 0,
        availableBalance: user.avbalance || 0,
        profitLoss: totalPL,
        sportsPL: overallSportsPL,
        casinoPL: overallCasinoPL,
        uplineBalance: roundMoney(
          (user.avbalance || 0) - (user.baseBalance || 0)
        ),
        downlineBalance: 0, // Calculate if needed
        exposure: exposure,
        maxProfit: user.maxProfit || 0,
        maxBet: user.maxBet || 0,
        betLock: user.betlock ? 'Yes' : 'No',
        active: user.status === 'active' ? 'Yes' : 'No',
        createdOn: user.createdAt,
      },
      gamePlay: {
        overallPL: totalPL,
        sportsPL: overallSportsPL,
        casinoPL: overallCasinoPL,
        // Show calculated commission debited for user, or commissionEarned for agents
        commission: roundMoney(
          user.role === 'user'
            ? totalCommissionDebited
            : user.commissionEarned || 0
        ),
        totalBet: overallSportsBets,
        sports: Object.values(sportSummary),
        casinos: casinoSummary,
        markets: marketSummary,
      },
    };

    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    console.error('Error fetching user full details:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};
