import { useCallback, useEffect, useRef, useState } from 'react';
import { IoNotificationsOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../redux/api';
import { canAccessNotifications } from '../utils/roleUtils';

const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const NotificationBell = ({ role }) => {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data?.count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setItems((data?.data || []).slice(0, 8));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccessNotifications(role)) return;
    fetchUnread();
    const id = setInterval(fetchUnread, 120000);
    return () => clearInterval(id);
  }, [role, fetchUnread]);

  useEffect(() => {
    if (open && canAccessNotifications(role)) {
      fetchRecent();
    }
  }, [open, role, fetchRecent]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const markRead = async (notificationId) => {
    try {
      const { data } = await api.patch('/notifications/mark-read', {
        notificationIds: [notificationId],
      });
      setUnreadCount(data?.unreadCount ?? 0);
      setItems((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch {
      /* ignore */
    }
  };

  const handleSelect = async (item) => {
    setActiveId(item._id);
    if (!item.isRead) await markRead(item._id);
  };

  const markAllRead = async () => {
    try {
      const { data } = await api.patch('/notifications/mark-read', {});
      setUnreadCount(data?.unreadCount ?? 0);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* ignore */
    }
  };

  if (!canAccessNotifications(role)) return null;

  const active = items.find((n) => n._id === activeId);

  return (
    <div className='relative' ref={panelRef}>
      <button
        type='button'
        aria-label='Notifications'
        onClick={() => setOpen((p) => !p)}
        className='relative flex items-center justify-center rounded border border-white/40 p-1 md:p-1.5 text-white transition hover:bg-white/20'
      >
        <IoNotificationsOutline size={20} />
        {unreadCount > 0 && (
          <span className='absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className='absolute top-11 right-0 z-[200] w-[min(92vw,380px)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl'
          >
            <div className='flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#022c43] to-[#18b0c8] px-4 py-3'>
              <h3 className='text-[15px] font-semibold text-white'>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  type='button'
                  onClick={markAllRead}
                  className='text-[11px] text-white/90 underline hover:text-white'
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className='max-h-[320px] overflow-y-auto'>
              {loading ? (
                <p className='px-4 py-8 text-center text-sm text-gray-400'>
                  Loading…
                </p>
              ) : items.length === 0 ? (
                <p className='px-4 py-8 text-center text-sm text-gray-500'>
                  No notifications yet
                </p>
              ) : (
                <ul>
                  {items.map((item) => (
                    <li key={item._id}>
                      <button
                        type='button'
                        onClick={() => handleSelect(item)}
                        className={`w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-[#f0f8ff] ${
                          activeId === item._id ? 'bg-[#e8f7fa]' : ''
                        } ${!item.isRead ? 'border-l-4 border-l-[#16a3bb]' : 'border-l-4 border-l-transparent'}`}
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <span
                            className={`text-[13px] font-semibold text-gray-800 ${!item.isRead ? '' : 'font-medium'}`}
                          >
                            {item.title}
                          </span>
                          {!item.isRead && (
                            <span className='mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#16a3bb]' />
                          )}
                        </div>
                        <p className='mt-1 line-clamp-2 text-[12px] text-gray-600'>
                          {item.message}
                        </p>
                        <p className='mt-1 text-[11px] text-gray-400'>
                          {item.sentBy} · {formatWhen(item.createdAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {active && (
              <div className='border-t border-gray-200 bg-gray-50 px-4 py-3'>
                <p className='text-[12px] font-semibold text-[#016a82]'>
                  {active.title}
                </p>
                <p className='mt-1 text-[12px] leading-relaxed whitespace-pre-wrap text-gray-700'>
                  {active.message}
                </p>
              </div>
            )}

            <div className='border-t border-gray-100 p-2'>
              <button
                type='button'
                onClick={() => {
                  setOpen(false);
                  navigate('/notifications');
                }}
                className='w-full rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] py-2 text-[13px] font-medium text-white hover:opacity-95'
              >
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
