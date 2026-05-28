import express from 'express';
import multer from 'multer';
import {
  uploadBanner,
  getBanner,
  deleteBanners,
  getSiteSettings,
  updateSiteSettings,
} from '../controllers/bannerController.js';
import { adminAuthMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  '/admin/banner',
  adminAuthMiddleware,
  upload.array('images', 10),
  uploadBanner
);
router.delete('/admin/banner', adminAuthMiddleware, deleteBanners);
router.get('/banner', getBanner);
router.get('/settings', getSiteSettings);
router.post('/admin/settings', adminAuthMiddleware, updateSiteSettings);

export default router;
