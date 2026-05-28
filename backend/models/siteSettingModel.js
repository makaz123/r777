import mongoose from 'mongoose';

const siteSettingSchema = new mongoose.Schema(
  {
    marqueeText: {
      type: String,
      default: '1️⃣Welcome To Our Exchange .....✨✨✨2️⃣ IPL Winner Cup Bookmaker Bets Started In Our Exchange 💫💫💫',
    },
  },
  { timestamps: true }
);

export default mongoose.model('SiteSetting', siteSettingSchema);
