import express from 'express';

import {
  changePasswordByDownline,
  changePasswordBySelf,
  changePasswordBySubAdmin,
  createSubAdmin,
  deleteSubAdmin,
  forceLogoutUser,
  getAgentTransactionHistory,
  // getAllBetHistory,
  getAllDownlineBets,
  getAllOnlyUser,
  getAllUser,
  getAllUsersWithCompleteInfo,
  getDownlineList,
  getCreditRefHistoryByUserId,
  getDeleteUser,
  getLoginHistory,
  getPasswordHistoryByUserId,
  getRegisterDetailReport,
  getSubAdmin,
  getSubAdminuser,
  getTotalProfitLossReport,
  getEventProfitLossReport,
  getUserProfile,
  getUsersByInvite,
  getUserTransactionHistory,
  loginSubAdmin,
  logout,
  parentsDetails,
  restoreDeleteUser,
  updateCreditReference,
  updateExploserLimit,
  updateGameLock,
  updatePartnership,
  updateUserLock,
  userSetting,
  withdrowalAndDeposite,
  getSettlementUsers,
  settleUser,
  getUserFullDetails,
  updateAdminDetails,
} from '../../controllers/admin/subAdminController.js';
import { adminAuthMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Only logged-in users can create sub-admins
router.post('/sub-admin/create', adminAuthMiddleware, createSubAdmin);
router.post('/sub-admin/login', loginSubAdmin);
router.get('/sub-admin/getuserbyid', adminAuthMiddleware, getSubAdmin);

// Settlement routes
router.get(
  '/sub-admin/settlement-users',
  adminAuthMiddleware,
  getSettlementUsers
);
router.post('/sub-admin/settle', adminAuthMiddleware, settleUser);

router.get('/get/all-user', adminAuthMiddleware, getAllUser);
router.get('/get/delete-user', adminAuthMiddleware, getDeleteUser);
router.get('/get/all-user-by-invite', adminAuthMiddleware, getUsersByInvite);
router.post('/user-logout', adminAuthMiddleware, logout);
router.post('/force-logout/:userId', adminAuthMiddleware, forceLogoutUser);
router.put('/update/user-details', adminAuthMiddleware, updateCreditReference);
router.put('/update/admin-details', adminAuthMiddleware, updateAdminDetails);
router.put(
  '/update/user-explosore-limit',
  adminAuthMiddleware,
  updateExploserLimit
);
router.put('/withdrowal-deposite', adminAuthMiddleware, withdrowalAndDeposite);
router.put('/update/partnership', adminAuthMiddleware, updatePartnership);
router.put('/user-setting', adminAuthMiddleware, userSetting);
router.put('/user-lock', adminAuthMiddleware, updateUserLock);
router.delete('/sub-admin/delete/:userId', adminAuthMiddleware, deleteSubAdmin);
router.delete(
  '/restore/user/:userId/:masterPassword',
  adminAuthMiddleware,
  restoreDeleteUser
);
router.post('/sub-admin/getSubAdmin', adminAuthMiddleware, getSubAdminuser);
router.get('/get/all-only-user', adminAuthMiddleware, getAllOnlyUser);
router.get('/get/downline-list', adminAuthMiddleware, getDownlineList);
router.get('/credit-ref-history/:userId', getCreditRefHistoryByUserId);
router.post('/change/password-self', adminAuthMiddleware, changePasswordBySelf);
router.post(
  '/change/password-downline',
  adminAuthMiddleware,
  changePasswordByDownline
);
router.get(
  '/get/password-history',
  adminAuthMiddleware,
  getPasswordHistoryByUserId
);
router.get('/get/login-history/:userId', adminAuthMiddleware, getLoginHistory);
router.get('/get/user-profile/:userId', adminAuthMiddleware, getUserProfile);
router.get(
  '/get/agent-trantionhistory',
  adminAuthMiddleware,
  getAgentTransactionHistory
);
router.get(
  '/get/user-trantion-history/:userId',
  adminAuthMiddleware,
  getUserTransactionHistory
);
router.get('/get/all-bet-list', adminAuthMiddleware, getAllDownlineBets);
router.get(
  '/get/total-profit-loss',
  adminAuthMiddleware,
  getTotalProfitLossReport
);
router.get(
  '/get/event-profit-loss',
  adminAuthMiddleware,
  getEventProfitLossReport
);
router.get('/get/bet-perents/:id', adminAuthMiddleware, parentsDetails);
router.patch('/gamelock/:id', adminAuthMiddleware, updateGameLock);
router.get(
  '/getAllUsersWithCompleteInfo',
  adminAuthMiddleware,
  getAllUsersWithCompleteInfo
);
router.get(
  '/get/register-detail',
  adminAuthMiddleware,
  getRegisterDetailReport
);
router.post(
  '/change/password-subAdmin',
  adminAuthMiddleware,
  changePasswordBySubAdmin
);
router.get(
  '/get/user-full-details/:userId',
  adminAuthMiddleware,
  getUserFullDetails
);

import CasinoBetHistory from '../../models/casinoBetHistory.model.js';
import betHistoryModel from '../../models/betHistoryModel.js';
import TransactionHistory from '../../models/transtionHistoryModel.js';
import SubAdmin from '../../models/subAdminModel.js';

router.get('/wipe-test-data', async (req, res) => {
  try {
    await TransactionHistory.deleteMany({});
    await CasinoBetHistory.deleteMany({});
    await betHistoryModel.deleteMany({});
    await SubAdmin.updateMany(
      {},
      {
        $set: {
          bettingProfitLoss: 0,
          uplineBettingProfitLoss: 0,
        },
        $unset: { weekPLResetAt: 1 },
      }
    );
    res.send('Test data wiped successfully!');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

export default router;
