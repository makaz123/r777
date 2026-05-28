import express from 'express';
import {
  getBetLockTree,
  getUserBetLocks,
  updateUserBetLocks,
} from '../../controllers/admin/betLockController.js';
import { adminAuthMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/tree', adminAuthMiddleware, getBetLockTree);
router.get('/:userId', adminAuthMiddleware, getUserBetLocks);
router.post('/:userId', adminAuthMiddleware, updateUserBetLocks);

export default router;
