import { v2 as cloudinary } from 'cloudinary';
import Banner from '../models/bannerModel.js';
import SiteSetting from '../models/siteSettingModel.js';

const isSuperAdminRole = (role) =>
  role === 'supperadmin' || role === 'superadmin';

// Configure cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '12345',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'abcde',
});

export const uploadBanner = async (req, res) => {
  try {
    if (!isSuperAdminRole(req.role)) {
      return res.status(403).json({
        message: 'Only super admin can manage banner settings',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images provided' });
    }

    const { page = 'home' } = req.body;

    const newBanners = [];

    // Process all files concurrently
    const uploadPromises = req.files.map(async (file) => {
      // Convert buffer to Data URI
      const b64 = Buffer.from(file.buffer).toString('base64');
      let dataURI = 'data:' + file.mimetype + ';base64,' + b64;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'banners',
      });

      // Create new banner
      const newBanner = new Banner({
        imageUrl: result.secure_url,
        page: page,
        isActive: true,
      });

      await newBanner.save();
      newBanners.push(newBanner);
    });

    await Promise.all(uploadPromises);

    return res.status(200).json({
      success: true,
      banners: newBanners,
      message: 'Banners uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading banners:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while uploading banners',
    });
  }
};

export const getBanner = async (req, res) => {
  try {
    const { page } = req.query;
    const filter = { isActive: true };
    if (page) {
      filter.page = page;
    }
    const banners = await Banner.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, banners });
  } catch (error) {
    console.error('Error fetching banners:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteBanners = async (req, res) => {
  try {
    if (!isSuperAdminRole(req.role)) {
      return res.status(403).json({
        message: 'Only super admin can manage banner settings',
      });
    }

    const { bannerIds } = req.body;
    if (!bannerIds || !Array.isArray(bannerIds) || bannerIds.length === 0) {
      return res.status(400).json({ message: 'No banner IDs provided' });
    }

    await Banner.deleteMany({ _id: { $in: bannerIds } });

    return res
      .status(200)
      .json({ success: true, message: 'Banners deleted successfully' });
  } catch (error) {
    console.error('Error deleting banners:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getSiteSettings = async (req, res) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) {
      settings = await SiteSetting.create({
        marqueeText:
          '1️⃣Welcome To Our Exchange .....✨✨✨2️⃣ IPL Winner Cup Bookmaker Bets Started In Our Exchange 💫💫💫',
      });
    }
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateSiteSettings = async (req, res) => {
  try {
    if (!isSuperAdminRole(req.role)) {
      return res.status(403).json({
        message: 'Only super admin can manage site settings',
      });
    }

    const { marqueeText } = req.body;

    let settings = await SiteSetting.findOne();
    if (!settings) {
      settings = new SiteSetting();
    }

    if (marqueeText !== undefined) {
      settings.marqueeText = marqueeText;
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating site settings:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
