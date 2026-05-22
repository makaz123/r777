import mongoose from 'mongoose';
import { NOTIFICATION_RECIPIENT_ROLES } from '../utils/notificationAudience.js';

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    sentBy: {
      type: String,
      required: true,
      trim: true,
    },
    sentById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubAdmin',
    },
    /** Broadcast to all staff roles; never to end-user `user` accounts */
    audience: {
      type: String,
      default: 'all_except_user',
      enum: ['all_except_user'],
    },
    targetRoles: {
      type: [String],
      default: () => [...NOTIFICATION_RECIPIENT_ROLES],
    },
    readBy: [
      {
        adminId: { type: String, required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
