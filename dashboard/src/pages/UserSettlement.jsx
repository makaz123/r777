import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../redux/api';
import Navbar from '../components/Navbar';

const UserSettlement = ({ type = 'user' }) => {
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

  const fetchSettlementUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sub-admin/settlement-users?roleType=${type}`);
      if (res.data && res.data.success) {
        setCreditors(res.data.creditors || []);
        setDebtors(res.data.debtors || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch settlement users');
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

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!settleAmount || isNaN(Number(settleAmount)) || Number(settleAmount) <= 0) {
      toast.error('Please enter a valid positive settle amount');
      return;
    }
    if (!masterPassword) {
      toast.error('Master password is required');
      return;
    }

    setSettleLoading(true);
    try {
      const res = await api.post('/sub-admin/settle', {
        userId: selectedUser._id,
        amount: Number(settleAmount),
        remarks,
        masterPassword
      });

      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Settlement completed successfully');
        setShowModal(false);
        fetchSettlementUsers(); // Refresh data
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Settlement failed');
    } finally {
      setSettleLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {type === 'master' ? 'Master Settlement' : 'User Settlement'}
            </h1>
          </div>

          {loading ? (
            <div className="flex justify-center p-8">
              <span className="text-gray-500">Loading...</span>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Creditors Account (dena hai) */}
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-[#28a745] px-4 py-2 font-bold text-white">
                  Creditors Account (dena hai)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#e9ecef] text-gray-700">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Account</th>
                        <th className="px-3 py-2 font-semibold">Client(P/L)</th>
                        <th className="px-3 py-2 font-semibold text-center">Settle Amount</th>
                        <th className="px-3 py-2 font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {creditors.length > 0 ? (
                        creditors.map((user) => (
                          <tr key={user._id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-800 flex flex-col">
                              <span className="bg-[#17a2b8] text-white text-[10px] w-fit px-1 rounded-sm mb-0.5 uppercase">{user.role}</span>
                              {user.userName}
                            </td>
                            <td className="px-3 py-2 text-green-600 font-bold">{Number(user.clientPL).toFixed(2)}</td>
                            <td className="px-3 py-2 text-center">
                              <button 
                                onClick={() => openSettleModal(user)}
                                className="rounded bg-[#dc3545] px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition"
                              >
                                Full Settle
                              </button>
                            </td>
                            <td className="px-3 py-2">
                                <span className="text-xs text-gray-500 italic">Click settle to add remark</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-3 py-4 text-center text-gray-500">
                            No creditors found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Debtors Account (lena hai) */}
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-[#dc3545] px-4 py-2 font-bold text-white">
                  Debtors Account (lena hai)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#e9ecef] text-gray-700">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Account</th>
                        <th className="px-3 py-2 font-semibold">Client(P/L)</th>
                        <th className="px-3 py-2 font-semibold text-center">Settle Amount</th>
                        <th className="px-3 py-2 font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {debtors.length > 0 ? (
                        debtors.map((user) => (
                          <tr key={user._id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-800 flex flex-col">
                              <span className="bg-[#17a2b8] text-white text-[10px] w-fit px-1 rounded-sm mb-0.5 uppercase">{user.role}</span>
                              {user.userName}
                            </td>
                            <td className="px-3 py-2 text-red-600 font-bold">{Number(user.clientPL).toFixed(2)}</td>
                            <td className="px-3 py-2 text-center">
                              <button 
                                onClick={() => openSettleModal(user)}
                                className="rounded bg-[#dc3545] px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition"
                              >
                                Full Settle
                              </button>
                            </td>
                            <td className="px-3 py-2">
                                <span className="text-xs text-gray-500 italic">Click settle to add remark</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-3 py-4 text-center text-gray-500">
                            No debtors found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Settlement Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b px-6 py-4 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-800">
                Settle Account: <span className="text-blue-600">{selectedUser.userName}</span>
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSettleSubmit} className="p-6">
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Current P/L:</span>
                  <span className={`font-bold ${selectedUser.clientPL > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(selectedUser.clientPL).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-semibold">
                    {selectedUser.clientPL > 0 ? 'Creditor (You owe them)' : 'Debtor (They owe you)'}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Settle Amount</label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Enter amount"
                  required
                  min="0.01"
                  step="0.01"
                  max={Math.abs(selectedUser.clientPL)}
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Enter remarks (optional)"
                />
              </div>

              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-gray-700">Master Password</label>
                <input
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Enter your master password"
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  disabled={settleLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleLoading || !masterPassword || !settleAmount}
                  className="rounded-lg bg-[#dc3545] px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {settleLoading ? 'Processing...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UserSettlement;
