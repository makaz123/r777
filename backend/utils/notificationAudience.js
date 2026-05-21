/** Roles that receive dashboard notifications (end-user `user` role excluded). */
export const NOTIFICATION_RECIPIENT_ROLES = [
  'supperadmin',
  'superadmin',
  'admin',
  'white',
  'super',
  'master',
  'agent',
];

export const isNotificationRecipient = (role) =>
  NOTIFICATION_RECIPIENT_ROLES.includes(role);

export const unreadFilterForAdmin = (adminId) => ({
  readBy: { $not: { $elemMatch: { adminId: String(adminId) } } },
});

/** Staff broadcast only; includes records created before audience field existed */
export const staffNotificationFilter = (extra = {}) => ({
  ...extra,
  $or: [{ audience: 'all_except_user' }, { audience: { $exists: false } }],
});
