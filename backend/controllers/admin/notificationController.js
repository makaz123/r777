import Notification from '../../models/notificationModel.js';
import SubAdmin from '../../models/subAdminModel.js';
import { getDateRangeUTC } from '../../utils/dateUtils.js';
import {
  isNotificationRecipient,
  NOTIFICATION_RECIPIENT_ROLES,
  staffNotificationFilter,
  unreadFilterForAdmin,
} from '../../utils/notificationAudience.js';

const isSuperAdminRole = (role) =>
  role === 'supperadmin' || role === 'superadmin';

const denyUserRole = (res) =>
  res.status(403).json({
    message: 'Notifications are not available for user accounts',
  });

const mapNotification = (doc, adminId) => {
  const row = doc.toObject ? doc.toObject() : doc;
  const read = (row.readBy || []).some(
    (r) => String(r.adminId) === String(adminId)
  );
  return {
    _id: row._id,
    title: row.title,
    message: row.message,
    sentBy: row.sentBy,
    createdAt: row.createdAt,
    audience: row.audience,
    targetRoles: row.targetRoles,
    isRead: read,
  };
};

export const getNotifications = async (req, res) => {
  try {
    const { id, role } = req;
    const { startDate, endDate } = req.query;

    if (!isNotificationRecipient(role)) {
      return denyUserRole(res);
    }

    const dateExtra =
      startDate && endDate
        ? { createdAt: getDateRangeUTC(startDate, endDate) }
        : {};

    const notifications = await Notification.find(
      staffNotificationFilter(dateExtra)
    )
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    return res.status(200).json({
      success: true,
      data: notifications.map((n) => mapNotification(n, id)),
    });
  } catch (error) {
    console.error('getNotifications:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const { id, role } = req;

    if (!isNotificationRecipient(role)) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const count = await Notification.countDocuments(
      staffNotificationFilter(unreadFilterForAdmin(id))
    );

    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('getUnreadNotificationCount:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    const { id, role } = req;
    const { notificationIds } = req.body;

    if (!isNotificationRecipient(role)) {
      return denyUserRole(res);
    }

    const idFilter = notificationIds?.length
      ? { _id: { $in: notificationIds } }
      : {};

    const items = await Notification.find(staffNotificationFilter(idFilter));
    const adminId = String(id);
    const now = new Date();

    await Promise.all(
      items.map(async (doc) => {
        const already = (doc.readBy || []).some(
          (r) => String(r.adminId) === adminId
        );
        if (!already) {
          doc.readBy.push({ adminId, readAt: now });
          await doc.save();
        }
      })
    );

    const remaining = await Notification.countDocuments(
      staffNotificationFilter(unreadFilterForAdmin(id))
    );

    return res.status(200).json({
      success: true,
      unreadCount: remaining,
    });
  } catch (error) {
    console.error('markNotificationsRead:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { id, role } = req;
    const { title, message } = req.body;

    if (!isSuperAdminRole(role)) {
      return res.status(403).json({
        message: 'Only super admin can send notifications',
      });
    }

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({
        message: 'Title and message are required',
      });
    }

    const admin = await SubAdmin.findById(id).select('userName role');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const notification = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      sentBy: admin.userName,
      sentById: admin._id,
      audience: 'all_except_user',
      targetRoles: [...NOTIFICATION_RECIPIENT_ROLES],
      readBy: [{ adminId: String(id), readAt: new Date() }],
    });

    const recipientCount = await SubAdmin.countDocuments({
      role: { $in: NOTIFICATION_RECIPIENT_ROLES },
      status: { $ne: 'delete' },
    });

    return res.status(201).json({
      success: true,
      message: `Notification sent to all staff roles (${recipientCount} accounts, users excluded)`,
      data: mapNotification(notification, id),
    });
  } catch (error) {
    console.error('createNotification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
