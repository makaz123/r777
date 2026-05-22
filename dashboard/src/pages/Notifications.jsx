import { useCallback, useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { getCurrentDashboardWeekRange } from '../utils/dashboardWeekRange';
import { canAccessNotifications, isSuperAdmin } from '../utils/roleUtils';

const formatWhen = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Notifications = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const role = userInfo?.role;
  const superAdmin = isSuperAdmin(role);

  const initialWeek = getCurrentDashboardWeekRange();
  const [pendingFrom, setPendingFrom] = useState(
    () => new Date(initialWeek.startDate)
  );
  const [pendingTo, setPendingTo] = useState(
    () => new Date(initialWeek.endDate)
  );
  const [appliedRange, setAppliedRange] = useState({
    startDate: initialWeek.startDate,
    endDate: initialWeek.endDate,
  });

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [compose, setCompose] = useState({ title: '', message: '' });
  const [sending, setSending] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: appliedRange.startDate,
        endDate: appliedRange.endDate,
      });
      const { data } = await api.get(`/notifications?${params}`);
      setList(data?.data || []);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to load notifications'
      );
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [appliedRange]);

  useEffect(() => {
    if (canAccessNotifications(role)) {
      loadNotifications();
    }
  }, [loadNotifications, role]);

  if (!canAccessNotifications(role)) {
    return <Navigate to='/home' replace />;
  }

  const handleGo = () => {
    if (!pendingFrom || !pendingTo) return;
    setAppliedRange({
      startDate: pendingFrom.toISOString(),
      endDate: pendingTo.toISOString(),
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!compose.title.trim() || !compose.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post('/notifications', compose);
      toast.success(data?.message || 'Notification sent');
      setCompose({ title: '', message: '' });
      loadNotifications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const toggleExpand = async (item) => {
    setExpandedId((prev) => (prev === item._id ? null : item._id));
    if (!item.isRead) {
      try {
        await api.patch('/notifications/mark-read', {
          notificationIds: [item._id],
        });
        setList((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
        );
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <>
      <Navbar />
      <div className='min-h-screen bg-[#e9edf2] px-[15px] py-3'>
        <h1 className='mb-4 text-[16px] font-bold'>Notifications</h1>

        {superAdmin && (
          <div className='mb-6 rounded-lg bg-white p-4 shadow-[0_2px_7px_0_#00708285]'>
            <h2 className='mb-3 text-[14px] font-semibold text-[#016a82]'>
              Send notification (Super Admin only)
            </h2>
            <form onSubmit={handleSend} className='space-y-3'>
              <input
                type='text'
                placeholder='Title'
                value={compose.title}
                onChange={(e) =>
                  setCompose((c) => ({ ...c, title: e.target.value }))
                }
                className='w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#4ecddd]'
                maxLength={200}
              />
              <textarea
                placeholder='Message for all roles except User (admin, agent, master, etc.)'
                value={compose.message}
                onChange={(e) =>
                  setCompose((c) => ({ ...c, message: e.target.value }))
                }
                rows={4}
                className='w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#4ecddd]'
                maxLength={2000}
              />
              <button
                type='submit'
                disabled={sending}
                className='rounded border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-2 text-sm text-white disabled:opacity-60'
              >
                {sending ? 'Sending…' : 'Send (all roles except User)'}
              </button>
            </form>
          </div>
        )}

        <div className='mb-4 rounded-lg bg-white p-3 shadow-[0_2px_7px_0_#00708285]'>
          <div className='flex flex-wrap items-end gap-4 text-[12px]'>
            <div>
              <label className='mb-1 block'>From Date:</label>
              <DatePicker
                selected={pendingFrom}
                onChange={setPendingFrom}
                showTimeSelect
                timeFormat='HH:mm'
                dateFormat='dd/MM/yyyy HH:mm'
                className='w-[240px] rounded border border-[#ced4da] px-3 py-1 text-sm'
              />
            </div>
            <div>
              <label className='mb-1 block'>To Date:</label>
              <DatePicker
                selected={pendingTo}
                onChange={setPendingTo}
                showTimeSelect
                timeFormat='HH:mm'
                dateFormat='dd/MM/yyyy HH:mm'
                className='w-[240px] rounded border border-[#ced4da] px-3 py-1 text-sm'
              />
            </div>
            <button
              type='button'
              onClick={handleGo}
              className='rounded border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1.5 text-sm text-white'
            >
              Go
            </button>
          </div>
        </div>

        <div className='rounded-lg bg-white shadow-[0_2px_7px_0_#00708285]'>
          {loading ? (
            <p className='px-4 py-12 text-center text-gray-400'>Loading…</p>
          ) : list.length === 0 ? (
            <p className='px-4 py-12 text-center text-gray-500'>
              No notifications in this date range
            </p>
          ) : (
            <ul className='divide-y divide-gray-100'>
              {list.map((item) => (
                <li key={item._id}>
                  <button
                    type='button'
                    onClick={() => toggleExpand(item)}
                    className={`w-full px-4 py-4 text-left transition hover:bg-[#f8fcfd] ${
                      expandedId === item._id ? 'bg-[#f0f8ff]' : ''
                    }`}
                  >
                    <div className='flex items-start gap-3'>
                      {!item.isRead && (
                        <span className='mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#16a3bb]' />
                      )}
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <span className='text-[14px] font-semibold text-gray-800'>
                            {item.title}
                          </span>
                          <span className='text-[11px] text-gray-400'>
                            {formatWhen(item.createdAt)}
                          </span>
                        </div>
                        <p className='mt-0.5 text-[12px] text-[#016a82]'>
                          From: {item.sentBy}
                        </p>
                        {expandedId === item._id ? (
                          <p className='mt-2 text-[13px] leading-relaxed whitespace-pre-wrap text-gray-700'>
                            {item.message}
                          </p>
                        ) : (
                          <p className='mt-1 line-clamp-2 text-[13px] text-gray-600'>
                            {item.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default Notifications;
