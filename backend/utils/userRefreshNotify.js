import SubAdmin from '../models/subAdminModel.js';
import { sendUserRefresh } from '../socket/bettingSocket.js';

/** Tell a user and all downlines to refetch profile (locks, balance, etc.). */
export async function refreshUserAndDownlines(rootUserId) {
  const rootId = String(rootUserId);
  const queue = [rootId];
  const seen = new Set();

  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);

    sendUserRefresh(id);

    const node = await SubAdmin.findById(id).select('code').lean();
    if (!node?.code) continue;

    const children = await SubAdmin.find({
      invite: node.code,
      status: { $ne: 'delete' },
    })
      .select('_id')
      .lean();

    for (const child of children) {
      queue.push(String(child._id));
    }
  }
}
