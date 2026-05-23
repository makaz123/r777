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
  aggregateDownlineParentViewPL,
  aggregateViewerProfitLoss,
  buildAccountSummary,
  getCurrentWeekRange,
  getDownlineUserIds,
  isAccountInAdminDownline,
} from '../../utils/accountSummaryUtils.js';
import { refreshUserAndDownlines } from '../../utils/userRefreshNotify.js';
import { sendUserRefresh } from '../../socket/bettingSocket.js';
import {
  adjustUserUpdatesForCommission,
  calculateWinCommission,
  getDownlineUplineBettingContribution,
  isMatchOddsBetRecord,
  isMatchOddsGameType,
  parseCommissionPercent,
  getAccountMyKeepPercent,
  getParentShareOnDownlineRow,
  getViewerMySharePercent,
  roundMoney,
  splitProfitLossByMyShare,
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

const verifyMasterPassword = async (user, enteredPassword) => {
  if (!user || !enteredPassword) return false;

  const loginPasswordMatches = await bcrypt.compare(
    enteredPassword,
    user.password
  );
  const isSuperAdmin = user.role === 'supperadmin';

  if (user.masterPassword) {
    try {
      const transactionPasswordMatches = await bcrypt.compare(
        enteredPassword,
        user.masterPassword
      );
      // For all non-superadmin users, only transaction password is valid.
      return isSuperAdmin
        ? transactionPasswordMatches || loginPasswordMatches
        : transactionPasswordMatches;
    } catch (error) {
      // Legacy plain-text fallback for old records.
      const legacyMasterMatches = user.masterPassword === enteredPassword;
      return isSuperAdmin
        ? legacyMasterMatches || loginPasswordMatches
        : legacyMasterMatches;
    }
  }

  // If no transaction password exists yet, allow fallback only for superadmin.
  return isSuperAdmin ? loginPasswordMatches : false;
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
          const agentDownlinePL = Number(user.bettingProfitLoss) || 0;
          const uplinePLShare = getDownlineUplineBettingContribution({
            totalPL: agentDownlinePL,
            partnershipPercent: user.partnership,
            isEndUser: false,
          });
          DownlineTotalBettingProfitLoss += uplinePLShare;
          console.log(
            `[UPDATE ADMIN] Agent/Admin ${user.userName}: exposure=${user.totalExposure || user.exposure || 0} downlinePL=${agentDownlinePL} uplineShare=${uplinePLShare} (partnership=${user.partnership || 0}%)`
          );
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

        const userBettingPL =
          storedPL > trueTotalPL + 0.01 ? storedPL : trueTotalPL;

        if (
          storedPL <= trueTotalPL + 0.01 &&
          user.bettingProfitLoss !== trueTotalPL
        ) {
          console.log(
            `[UPDATE ADMIN] User ${user.userName}: correcting bettingProfitLoss from ${user.bettingProfitLoss} to ${trueTotalPL}`
          );
          user.bettingProfitLoss = trueTotalPL;
          await user.save();
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

/** Credit agent when user wins on match odds (uses Commission % only, not Rolling Commission). */
export const creditAgentCommissionEarned = async (user, commission) => {
  if (!user?.invite || !commission || commission <= 0) return null;
  const agent = await SubAdmin.findOne({ code: user.invite });
  if (!agent) return null;
  await SubAdmin.findByIdAndUpdate(agent._id, {
    $inc: { commissionEarned: commission },
  });
  return agent;
};

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
  if (profit <= 0) {
    return { settlementResult, commission: 0 };
  }

  const rate = parseCommissionPercent(user.commition);
  const { netProfit, commission } = calculateWinCommission(profit, rate);
  if (commission <= 0) {
    return { settlementResult, commission: 0 };
  }

  const agent = await creditAgentCommissionEarned(user, commission);
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
//       return res.status(400).json({ message: 'Invalid Master password.' });
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
      return res.status(400).json({ message: 'Invalid Master password.' });
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
      const parsedPartnership = partnership;
      if (parsedPartnership > parentMyShareCap) {
        return res.status(400).json({
          message: `Partnership cannot exceed your my share (${parentMyShareCap}%)`,
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
      masterPassword: masterPassword
        ? await bcrypt.hash(masterPassword, 10)
        : undefined,
      partnership,
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

    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
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
    let generatedMasterPassword = null;

    if (!subAdmin.isPasswordChanged) {
      subAdmin.isPasswordChanged = true;
      generatedMasterPassword = generateSixDigitMasterPassword();
      subAdmin.masterPassword = await bcrypt.hash(generatedMasterPassword, 10);
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
      generatedMasterPassword,
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

export const getSubAdmin = async (req, res) => {
  try {
    const { id } = req; // Get ID from request

    if (!id) {
      return res.status(400).json({ message: 'Admin ID is required' });
    }

    // Find sub-admin & exclude sensitive fields
    const admin = await SubAdmin.findById(id);

    if (!admin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }
    await updateAdmin(id);

    const updatedAdmin = await SubAdmin.findById(id).lean();
    const weekRange = getCurrentWeekRange();
    const [weekViewerPL, weekDownlinePL, tillViewerPL, tillDownlinePL] =
      await Promise.all([
        aggregateViewerProfitLoss(
          SubAdmin,
          betHistoryModel,
          CasinoBetHistory,
          updatedAdmin,
          weekRange
        ),
        aggregateDownlineParentViewPL(
          SubAdmin,
          betHistoryModel,
          CasinoBetHistory,
          updatedAdmin.code,
          weekRange
        ),
        aggregateViewerProfitLoss(
          SubAdmin,
          betHistoryModel,
          CasinoBetHistory,
          updatedAdmin,
          null
        ),
        aggregateDownlineParentViewPL(
          SubAdmin,
          betHistoryModel,
          CasinoBetHistory,
          updatedAdmin.code,
          null
        ),
      ]);
    const accountSummary = buildAccountSummary(updatedAdmin, {
      weekViewerPL,
      weekDownlinePL,
      tillViewerPL,
      tillDownlinePL,
    });

    res.status(200).json({
      message: 'Sub-admin details retrieved successfully',
      data: { ...updatedAdmin, accountSummary },
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
      return res.status(400).json({ message: 'Invalid Master password.' });
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

/**
 * Unified downline list for Agent List (agents) and Client List (users).
 * Includes viewer partnership % and per-row share labels.
 */
export const getDownlineList = async (req, res) => {
  try {
    const { id, role } = req;
    const {
      page = 1,
      limit = 10,
      searchQuery,
      listType = 'clients',
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const typeRaw = String(listType).toLowerCase();
    const type =
      typeRaw === 'agents'
        ? 'agents'
        : typeRaw === 'all'
          ? 'all'
          : typeRaw === 'admin' || typeRaw === 'admins'
            ? 'admin'
            : 'clients';

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const viewerPartnership = Number(admin.partnership) || 0;
    const viewerMySharePercent = getAccountMyKeepPercent(admin);
    const viewerUplineSharePercent = roundMoney(
      Math.max(0, 100 - viewerMySharePercent)
    );

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
      filter = {
        ...filter,
        userName: { $regex: searchQuery, $options: 'i' },
      };
    }

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const data = await Promise.all(
      allUsers.map(async (user) => {
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

        const row = user.toObject();
        const isEndUser = row.role === 'user';
        const parentShareOnRow = getParentShareOnDownlineRow(row);
        const commissionPct = parseCommissionPercent(row.commition);

        const parentSharePercent = isEndUser
          ? viewerMySharePercent
          : parentShareOnRow;
        const downlineKeepPercent = isEndUser
          ? commissionPct || viewerUplineSharePercent
          : roundMoney(Math.max(0, 100 - parentShareOnRow));

        const myPercent = isEndUser
          ? `${parentSharePercent}%`
          : `${parentSharePercent}% / ${downlineKeepPercent}%`;

        const rawBettingPL = roundMoney(row.bettingProfitLoss || 0);
        const parentViewPL = roundMoney(-rawBettingPL);
        const plSplit = splitProfitLossByMyShare(
          parentViewPL,
          isEndUser ? viewerMySharePercent : parentShareOnRow
        );

        const baseBalance = isEndUser
          ? roundMoney(row.baseBalance ?? row.balance ?? 0)
          : roundMoney(
              (row.baseBalance || 0) + (row.uplineBettingProfitLoss || 0)
            );
        const balance = baseBalance;
        const avbalance = roundMoney(row.avbalance || 0);
        const pendingBal = roundMoney(-balance);
        const totalExposure = isEndUser ? roundMoney(exposure) : 0;
        const hasOpenExposure = Math.abs(totalExposure) > 0.001;
        const currentPL =
          isEndUser && !hasOpenExposure
            ? roundMoney(avbalance - baseBalance)
            : 0;

        return {
          ...row,
          exposure: totalExposure,
          totalExposure,
          pendingBal,
          currentPL,
          balance,
          downlinePartnership: parentShareOnRow,
          parentSharePercent,
          downlineKeepPercent,
          downlineSharePercent: downlineKeepPercent,
          viewerShareOnRow: parentSharePercent,
          myPartnershipPercent: viewerMySharePercent,
          mySharePercent: parentSharePercent,
          myPercent,
          rawBettingPL,
          myPLShare: plSplit.myPL,
          uplinePLShare: plSplit.uplinePL,
          uplinePartnershipPercent: isEndUser
            ? viewerUplineSharePercent
            : downlineKeepPercent,
          commition: row.commition || '0',
          commissionEarned: row.commissionEarned || 0,
        };
      })
    );

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Downline list retrieved successfully',
      listType: type,
      viewer: {
        partnership: viewerPartnership,
        mySharePercent: viewerMySharePercent,
        uplineSharePercent: viewerUplineSharePercent,
        myPercentLabel: `${viewerMySharePercent}%`,
        uplinePercentLabel: `${viewerUplineSharePercent}%`,
        role: admin.role,
        userName: admin.userName,
        ...splitProfitLossByMyShare(
          roundMoney(-(admin.uplineBettingProfitLoss || 0)),
          viewerMySharePercent
        ),
      },
      data,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum) || 1,
      currentPage: pageNum,
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
    const { code } = req.body; // Get invite code from request body
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    if (!code) {
      return res.status(400).json({ message: 'Admin invite code is required' });
    }

    const filter = { invite: code, status: { $ne: 'delete' } };

    const subAdmins = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);
    return res.status(200).json({
      message: `Sub-admin details for level  retrieved successfully`,
      data: subAdmins,
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
      return res.status(400).json({ message: 'Invalid Master password.' });
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
      return res.status(400).json({ message: 'Invalid Master password.' });
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
      return res.status(400).json({ message: 'Invalid Master password.' });
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

    // Update partnership
    editUser.partnership = parsedPartnership;
    await editUser.save();

    // Return updated user list (same pattern as updateCreditReference)
    const filter =
      role === 'supperadmin'
        ? {
            _id: { $ne: id },
            role: { $ne: 'user' },
            status: { $ne: 'delete' },
          }
        : {
            invite: admin.code,
            role: { $ne: 'user' },
            status: { $ne: 'delete' },
          };

    const allUsers = await SubAdmin.find(filter);

    return res.status(200).json({
      success: true,
      message: `Partnership updated to ${parsedPartnership} successfully`,
      data: allUsers,
    });
  } catch (error) {
    console.error('Update Partnership Error:', error);
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
//       return res.status(400).json({ message: 'Invalid Master password.' });
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
      return res.status(400).json({ message: 'Invalid Master password.' });
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

    await updateAdmin(id);
    await updateAllUplines(userId);

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
      return res.status(400).json({ message: 'Invalid Master password.' });
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
      return res.status(400).json({ message: 'Invalid Master password.' });
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
    } = req.query;

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    let queue = [admin.code];
    let userIds = [];

    while (queue.length > 0) {
      const currentCode = queue.shift();

      const downlineUsers = await SubAdmin.find({
        invite: currentCode,
        status: { $ne: 'delete' },
      });

      for (const user of downlineUsers) {
        if (user.role === 'user') {
          userIds.push(user._id); // Collect user ID for bet query
        } else {
          // Add agent/admin code to queue to go deeper
          queue.push(user.code);
        }
      }
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
    if (selectedType) {
      filter.otype = selectedType;
    }
    // Filter by selectedVoid if provided
    if (selectedVoid === 'settel') {
      filter.status = { $ne: 0 };
    } else if (selectedVoid === 'void') {
      filter.status = 3;
    } else if (selectedVoid === 'unsettel') {
      filter.status = 0;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

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

    const sportsMap = new Map();
    const casinoMap = new Map();

    for (const bet of settledBets) {
      const eventName = bet.eventName || bet.gameName || 'N/A';
      const gameType = bet.marketName || bet.gameType || '-';
      const pl = Number(bet.profitLossChange || 0);
      const openingAmount = Number(bet.betAmount || 0);

      if (isSportsBet(bet)) {
        const key = `${eventName}__${gameType}`;
        if (!sportsMap.has(key)) {
          sportsMap.set(key, {
            eventName,
            gameType,
            opening: 0,
            closing: 0,
            profitLoss: 0,
          });
        }
        const row = sportsMap.get(key);
        row.opening += openingAmount;
        row.closing += pl;
        row.profitLoss += pl;
      } else {
        const key = eventName;
        if (!casinoMap.has(key)) {
          casinoMap.set(key, {
            eventName,
            opening: 0,
            closing: 0,
            profitLoss: 0,
          });
        }
        const row = casinoMap.get(key);
        row.opening += openingAmount;
        row.closing += pl;
        row.profitLoss += pl;
      }
    }

    // Derive closing using opening +/- P/L
    for (const row of sportsMap.values()) {
      row.closing = row.opening + row.profitLoss;
    }
    for (const row of casinoMap.values()) {
      row.closing = row.opening + row.profitLoss;
    }

    const sportsReport = [...sportsMap.values()];
    const casinoReport = [...casinoMap.values()];
    const sportsTotal = sportsReport.reduce(
      (sum, row) => sum + row.profitLoss,
      0
    );
    const casinoTotal = casinoReport.reduce(
      (sum, row) => sum + row.profitLoss,
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        sportsReport,
        casinoReport,
        sportsTotal,
        casinoTotal,
      },
    });
  } catch (error) {
    console.error('Error fetching total profit/loss report:', error);
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

/** Settled-bet P/L only (excludes open/unsettled exposure in avbalance). */
const getSettledClientPL = (account) => {
  if (account.role === 'user') {
    return roundMoney(account.bettingProfitLoss || 0);
  }
  return roundMoney(account.uplineBettingProfitLoss || 0);
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

    // Only fetch direct downlines (since settlement is direct)
    let filter = { status: { $ne: 'delete' }, invite: admin.code };

    if (roleType === 'user') {
      filter.role = 'user';
    } else if (roleType === 'master') {
      filter.role = { $nin: ['user', 'supperadmin'] };
    } else if (role === 'supperadmin' || role === 'superadmin') {
      filter.role = { $ne: 'supperadmin' };
    }

    const downlines = await SubAdmin.find(filter).lean();

    const creditors = [];
    const debtors = [];

    downlines.forEach((user) => {
      const pl = getSettledClientPL(user);
      if (Math.abs(pl) < 0.01) return;

      // pl > 0: client won settled bets (creditor / dena hai)
      // pl < 0: client lost settled bets (debtor / lena hai)

      const userData = {
        _id: user._id,
        userName: user.userName,
        role: user.role,
        balance: user.balance,
        baseBalance: user.baseBalance,
        creditReference: user.creditReference,
        clientPL: pl,
      };

      if (pl > 0) {
        creditors.push(userData);
      } else if (pl < 0) {
        debtors.push(userData);
      }
    });

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
      return res.status(400).json({ message: 'Invalid Master password.' });
    }

    const editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const pl = getSettledClientPL(editUser);

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
        userId: editUser._id,
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
        userId: editUser._id,
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

    return res.status(200).json({
      success: true,
      message: 'Settlement completed successfully',
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
