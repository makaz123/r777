import express from 'express';
import multer from 'multer';
import { uploadBanner, getBanner, deleteBanners } from '../controllers/bannerController.js';
import { adminAuthMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/admin/banner', adminAuthMiddleware, upload.array('images', 10), uploadBanner);
router.delete('/admin/banner', adminAuthMiddleware, deleteBanners);
router.get('/banner', getBanner);

export default router;
