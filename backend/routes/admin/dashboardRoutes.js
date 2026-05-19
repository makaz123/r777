import express from 'express';
import { getDashboardStats } from '../../controllers/admin/dashboardController.js';
import { adminAuthMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Route to fetch dashboard stats aggregated for all recursive downlines
router.get('/stats', adminAuthMiddleware, getDashboardStats);

export default router;
