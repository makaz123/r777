import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import api from '../redux/api';
import Navbar from '../components/Navbar';
import { getAdmin } from '../redux/reducer/authReducer';

const roleBadge = (role) => {
  const r = String(role || 'user');
  if (r === 'user') return 'C';
  return r.charAt(0).toUpperCase();
};

const UserSettlement = ({ type = 'user' }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [creditors, setCreditors] = useState([]);
  const [debtors, setDebtors] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);

  const [settleAmounts, setSettleAmounts] = useState({});
  const [rowRemarks, setRowRemarks] = useState({});
  const [globalRemarks, setGlobalRemarks] = useState('');
  const [footerPassword, setFooterPassword] = useState('');

  const getFullSettleAmount = (user) =>
    Math.abs(Number(user.clientPL)).toFixed(2);

  const handleFullSettle = (user) => {
    setSettleAmounts((prev) => ({
      ...prev,
      [user._id]: getFullSettleAmount(user),
    }));
  };

  const handleFillAll = () => {
    const amounts = {};
    [...creditors, ...debtors].forEach((user) => {
      amounts[user._id] = getFullSettleAmount(user);
    });
    setSettleAmounts(amounts);
  };

  const handleClearAll = () => {
    setSettleAmounts({});
    setRowRemarks({});
    setGlobalRemarks('');
    setFooterPassword('');
  };

  const handleAmountChange = (userId, value) => {
    setSettleAmounts((prev) => ({ ...prev, [userId]: value }));
  };

  const handleRowRemarkChange = (userId, value) => {
    setRowRemarks((prev) => ({ ...prev, [userId]: value }));
  };

  const fetchSettlementUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sub-admin/settlement-users?roleType=${type}`);
      if (res.data && res.data.success) {
        setCreditors(res.data.creditors || []);
        setDebtors(res.data.debtors || []);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to fetch settlement users'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlementUsers();
  }, [type]);

  const openSettleModal = (user) => {
    setSelectedUser(user);
    setSettleAmount(Math.abs(user.clientPL).toString());
    setRemarks('Settlement');
    setMasterPassword('');
    setShowModal(true);
  };

  const handleBulkSubmit = async () => {
    if (!footerPassword) {
      toast.error('Master password is required');
      return;
    }

    const payloads = [];
    Object.entries(settleAmounts).forEach(([userId, amount]) => {
      if (amount && Number(amount) > 0) {
        payloads.push({
          userId,
          amount: Number(amount),
          remarks: rowRemarks[userId] || globalRemarks || 'Settlement',
          masterPassword: footerPassword,
        });
      }
    });

    if (payloads.length === 0) {
      toast.error('No valid settle amounts entered.');
      return;
    }

    setSettleLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const payload of payloads) {
      try {
        const res = await api.post('/sub-admin/settle', payload, {
          withCredentials: true,
        });
        if (res.data && res.data.success) {
          successCount++;
        } else {
          failCount++;
          toast.error(
            res.data?.message || 'Settlement failed for one account.'
          );
        }
      } catch (err) {
        failCount++;
        toast.error(
          err.response?.data?.message ||
            err.message ||
            'Settlement failed for one account.'
        );
        if (
          err.response?.status === 400 &&
          err.response?.data?.message === 'Invalid Master password.'
        ) {
          break;
        }
      }
    }

    setSettleLoading(false);
    if (successCount > 0) {
      toast.success(`Successfully settled ${successCount} account(s).`);
      handleClearAll();
      await fetchSettlementUsers();
      await dispatch(getAdmin());
    } else if (failCount > 0) {
      toast.error('No accounts were settled. Check amounts and master password.');
    }
  };

  return (
    <>
      <Navbar />
      <div className='h-[calc(100vh-52px)] bg-[#f0f0f5] px-[15px] py-[13px]'>
        <div className='h-full min-h-[600px] rounded-lg bg-white px-[15px] py-[7px]'>
          <h1 className='mb-2 text-[16px] font-bold text-gray-800'>
            {type === 'master' ? 'Master Settlement' : 'User Settlement'}
          </h1>

          {loading ? (
            <div className='flex justify-center p-8'>
              <span className='text-gray-500'>Loading...</span>
            </div>
          ) : (
            <div className='grid gap-[30px] md:grid-cols-2'>
              {/* Creditors Account (dena hai) */}
              <table className='w-full border border-[#dee2e6] text-left text-[14px] h-fit'>
                <thead className=''>
                  <tr className='bg-[#28a745] font-bold text-white'>
                    <th colSpan={5} className='p-2 leading-[16px]'>
                      Creditors Account (dena hai)
                    </th>
                  </tr>
                  <tr className='bg-[#ccc] text-[#393933]'>
                    <th className='border-[2px] border-[#dee2e6] p-2 leading-[16px] font-semibold'>
                      Account
                    </th>
                    <th className='border-[2px] border-[#dee2e6] p-2 leading-[16px] font-semibold'>
                      Client(P/L)
                    </th>
                    <th
                      colSpan={2}
                      className='border-[2px] border-[#dee2e6] p-2 leading-[16px] font-semibold'
                    >
                      Settle Amount
                    </th>
                    <th className='border-[2px] border-[#dee2e6] p-2 leading-[16px] font-semibold'>
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {creditors.length > 0 ? (
                    creditors.map((user) => (
                      <tr
                        key={user._id}
                        className='divide-x divide-gray-200 hover:bg-gray-50'
                      >
                        <td className='w-[20%] p-2 leading-[16px] font-bold text-gray-800'>
                          <div className='flex items-center gap-1'>
                            <span className='flex h-[14px] w-[14px] items-center justify-center bg-[#094d54] text-[12px] font-bold text-white'>
                              {roleBadge(user.role)}
                            </span>
                            {user.userName}
                          </div>
                        </td>
                        <td className='w-[12%] p-2 leading-[16px] font-bold text-green-600'>
                          {Number(user.clientPL).toFixed(2)}
                          {/* {user.role !== 'user' &&
                            user.grossClientPL != null &&
                            Math.abs(user.grossClientPL - user.clientPL) >
                              0.01 && (
                              <span className='mt-0.5 block text-[10px] font-normal text-gray-600'>
                                {user.sharePercent}% of gross{' '}
                                {Number(user.grossClientPL).toFixed(2)}
                              </span>
                            )} */}
                        </td>
                        <td className='w-[16%] p-2 leading-[16px]'>
                          <input
                            type='text'
                            value={settleAmounts[user._id] ?? ''}
                            onChange={(e) =>
                              handleAmountChange(user._id, e.target.value)
                            }
                            className='h-[30px] w-full rounded-sm border border-[#ced4da] px-3 outline-none'
                            placeholder='0'
                          />
                        </td>
                        <td className='w-[15%] p-2 text-end leading-[16px]'>
                          <button
                            type='button'
                            onClick={() => handleFullSettle(user)}
                            className='h-[30px] rounded border border-[#28a745] bg-[#dc3545] bg-gradient-to-b from-[#4ce870] to-[#0a8125] px-2 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                          >
                            Full Settle
                          </button>
                        </td>
                        <td className='w-[37%] p-2 leading-[16px]'>
                          <input
                            type='text'
                            value={rowRemarks[user._id] ?? ''}
                            onChange={(e) =>
                              handleRowRemarkChange(user._id, e.target.value)
                            }
                            className='h-[30px] w-full rounded-sm border border-[#ced4da] px-2 outline-none'
                            placeholder='Remarks'
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan='5' className='p-2 text-center text-gray-500'>
                        No creditors found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Debtors Account (lena hai) */}
              <table className='w-full border border-[#dee2e6] text-left text-[14px]'>
                <thead className=''>
                  <tr className='bg-[#cb0707] font-bold text-white'>
                    <th colSpan={5} className='p-2 leading-[16px]'>
                      Debtors Account (lena hai)
                    </th>
                  </tr>
                  <tr className='bg-[#ccc] text-[#393933]'>
                    <th className='border-[2px] border-[#dee2e6] p-2 leading-[16px] font-semibold'>
                      Account
                    </th>
                    <th className='border-[2px] border-[#dee2e6] p-2 leading-[16px] font-semibold'>
                      Client(P/L)
                    </th>
                    <th
                      colSpan={2}
                      className='border-[2px] border-[#dee2e6] p-2 leading-[16px] font-semibold'
                    >
                      Settle Amount
                    </th>
                    <th className='border-[2px] border-[#dee2e6] p-2 leading-[16px] font-semibold'>
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {debtors.length > 0 ? (
                    debtors.map((user) => (
                      <tr
                        key={user._id}
                        className='divide-x divide-gray-200 hover:bg-gray-50'
                      >
                        <td className='w-[20%] p-2 leading-[16px] font-bold text-gray-800'>
                          <div className='flex items-center gap-1'>
                            <span className='flex h-[14px] w-[14px] items-center justify-center bg-[#094d54] text-[12px] font-bold text-white'>
                              {roleBadge(user.role)}
                            </span>
                            {user.userName}
                          </div>
                        </td>
                        <td className='w-[12%] p-2 leading-[16px] font-bold text-[#c7313f]'>
                          {Number(user.clientPL).toFixed(2)}
                          {/* {user.role !== 'user' &&
                            user.grossClientPL != null &&
                            Math.abs(user.grossClientPL - user.clientPL) >
                              0.01 && (
                              <span className='mt-0.5 block text-[10px] font-normal text-gray-600'>
                                {user.sharePercent}% of gross{' '}
                                {Number(user.grossClientPL).toFixed(2)}
                              </span>
                            )} */}
                        </td>
                        <td className='w-[16%] p-2 leading-[16px]'>
                          <input
                            type='text'
                            value={settleAmounts[user._id] ?? ''}
                            onChange={(e) =>
                              handleAmountChange(user._id, e.target.value)
                            }
                            className='h-[30px] w-full rounded-sm border border-[#ced4da] px-3 outline-none'
                            placeholder='0'
                          />
                        </td>
                        <td className='w-[15%] p-2 text-end leading-[16px]'>
                          <button
                            type='button'
                            onClick={() => handleFullSettle(user)}
                            className='h-[30px] rounded border border-[#cb0707] bg-[#dc3545] bg-gradient-to-b from-[#960a0a] to-[#e44] px-2 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                          >
                            Full Settle
                          </button>
                        </td>
                        <td className='w-[37%] p-2 leading-[16px]'>
                          <input
                            type='text'
                            value={rowRemarks[user._id] ?? ''}
                            onChange={(e) =>
                              handleRowRemarkChange(user._id, e.target.value)
                            }
                            className='h-[30px] w-full rounded-sm border border-[#ced4da] px-2 outline-none'
                            placeholder='Remarks'
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan='5' className='p-2 text-center text-gray-500'>
                        No creditors found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div className='fixed bottom-0 left-0 w-full bg-[#045662] py-2'>
        <div className='flex justify-center gap-1'>
          <input
            type='text'
            placeholder='Remarks'
            value={globalRemarks}
            onChange={(e) => setGlobalRemarks(e.target.value)}
            className='h-[30px] w-[250px] rounded-sm bg-white px-2'
          />
          <button
            type='button'
            onClick={handleFillAll}
            className='cursor-pointer rounded-sm border border-black bg-gradient-to-b from-[#545454] to-[#000] px-2 py-1 text-white hover:opacity-90'
          >
            Fill All
          </button>
          <input
            type='text'
            placeholder='Password'
            value={footerPassword}
            onChange={(e) => setFooterPassword(e.target.value)}
            className='h-[30px] w-[150px] rounded-sm bg-white px-2'
          />
          <button
            type='button'
            onClick={handleBulkSubmit}
            disabled={settleLoading}
            className={`rounded-sm border border-black bg-gradient-to-b from-[#545454] to-[#000] px-2 py-1 text-white ${settleLoading ? 'opacity-50' : 'cursor-pointer hover:opacity-90'}`}
          >
            {settleLoading ? 'Processing...' : 'Submit'}
          </button>
          <button
            type='button'
            onClick={handleClearAll}
            className='cursor-pointer rounded-sm border border-black bg-gradient-to-b from-[#545454] to-[#000] px-2 py-1 text-white hover:opacity-90'
          >
            Clear All
          </button>
        </div>
      </div>
      {/* Settlement Modal */}
      {/* {showModal && selectedUser && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-md rounded-xl bg-white shadow-xl'>
            <div className='flex items-center justify-between rounded-t-xl border-b bg-gray-50 px-6 py-4'>
              <h3 className='text-lg font-bold text-gray-800'>
                Settle Account:{' '}
                <span className='text-blue-600'>{selectedUser.userName}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className='text-xl leading-none font-bold text-gray-400 hover:text-gray-600'
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className='p-6'>
              <div className='mb-4'>
                <div className='mb-1 flex justify-between text-sm'>
                  <span className='text-gray-600'>Current P/L:</span>
                  <span
                    className={`font-bold ${selectedUser.clientPL > 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {Number(selectedUser.clientPL).toFixed(2)}
                  </span>
                </div>
                <div className='mb-1 flex justify-between text-sm'>
                  <span className='text-gray-600'>Type:</span>
                  <span className='font-semibold'>
                    {selectedUser.clientPL > 0
                      ? 'Creditor (You owe them)'
                      : 'Debtor (They owe you)'}
                  </span>
                </div>
              </div>

              <div className='mb-4'>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Settle Amount
                </label>
                <input
                  type='number'
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
                  placeholder='Enter amount'
                  required
                  min='0.01'
                  step='0.01'
                  max={Math.abs(selectedUser.clientPL)}
                />
              </div>

              <div className='mb-4'>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Remarks
                </label>
                <input
                  type='text'
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
                  placeholder='Enter remarks (optional)'
                />
              </div>

              <div className='mb-6'>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Master Password
                </label>
                <input
                  type='password'
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
                  placeholder='Enter your master password'
                  required
                />
              </div>

              <div className='flex justify-end gap-3'>
                <button
                  type='button'
                  onClick={() => setShowModal(false)}
                  className='rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100'
                  disabled={settleLoading}
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={settleLoading || !masterPassword || !settleAmount}
                  className='rounded-lg bg-[#dc3545] px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50'
                >
                  {settleLoading ? 'Processing...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )} */}
    </>
  );
};

export default UserSettlement;
