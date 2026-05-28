import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../utils/apiErrorMessage';
import { useDispatch } from 'react-redux';
import {
  withdrawalAndDeposite,
  changePasswordByDownline,
  updateCreditReference,
  getAdmin,
} from '../redux/reducer/authReducer';
import { motion, AnimatePresence } from 'framer-motion';

const getOneWeekAgoDefault = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getNowDefault = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const UserDetails = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const dispatch = useDispatch();

  // Modals state
  const [depositPopup, setDepositPopup] = useState(false);
  const [withdrawPopup, setWithdrawPopup] = useState(false);
  const [passwordPopup, setPasswordPopup] = useState(false);
  const [lastLoginPopup, setLastLoginPopup] = useState(false);

  // Settlement state
  const [settlePopup, setSettlePopup] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleRemarks, setSettleRemarks] = useState('');
  const [settlePassword, setSettlePassword] = useState('');
  const [isSettling, setIsSettling] = useState(false);

  const [formData, setFormData] = useState({
    remark: '',
    balance: '',
    masterPassword: '',
    creditReference: '',
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loginHistoryData, setLoginHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loginStartDate, setLoginStartDate] = useState(getOneWeekAgoDefault());
  const [loginEndDate, setLoginEndDate] = useState(getNowDefault());

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      setLoadingSearch(true);
      const res = await api.get('/get/all-only-user', {
        params: { searchQuery: query, page: 1, limit: 50 },
        withCredentials: true,
      });
      setSearchResults(res.data?.data || []);
      setShowDropdown(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      console.error('Search error:', error);
    } finally {
      setLoadingSearch(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      setLoadingDetails(true);
      const res = await api.get(`/get/user-full-details/${userId}`, {
        withCredentials: true,
      });
      setUserDetails(res.data?.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoadingDetails(false);
    }
  };

  const resetBankingForm = () => {
    setFormData({
      remark: '',
      balance: '',
      masterPassword: '',
      creditReference: '',
    });
  };

  const openDepositModal = () => {
    resetBankingForm();
    setDepositPopup(true);
  };

  const closeCreditDepositModal = () => {
    setDepositPopup(false);
    resetBankingForm();
  };

  const openWithdrawModal = () => {
    resetBankingForm();
    setWithdrawPopup(true);
  };

  const openPasswordModal = () => {
    setNewPassword('');
    setConfirmPassword('');
    setFormData((prev) => ({ ...prev, masterPassword: '' }));
    setPasswordPopup(true);
  };

  const clientAvBalance = userDetails?.accountDetails?.availableBalance ?? 0;
  const clientCreditRef = userDetails?.accountDetails?.creditRef ?? 0;

  const openSettleModal = () => {
    if (userDetails?.userInfo?.invite !== userInfo?.code) {
      toast.error('You can only settle with your direct downlines.');
      return;
    }

    const value = userDetails?.accountDetails?.profitLoss || 0;

    setSettlePopup(true);
    setSettleAmount('');

    if (value > 0) {
      setSettleRemarks(
        `${userDetails?.userInfo?.userName} received cash from ${userInfo?.userName || ''}`
      );
    } else {
      setSettleRemarks(
        `${userInfo?.userName || ''} received cash from ${userDetails?.userInfo?.userName}`
      );
    }

    setSettlePassword('');
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !settleAmount || !settlePassword) {
      toast.error('Please fill all required fields.');
      return;
    }

    setIsSettling(true);
    try {
      const payload = {
        userId: selectedUserId,
        amount: Number(settleAmount),
        remarks: settleRemarks,
        masterPassword: settlePassword,
      };
      const res = await api.post('/sub-admin/settle', payload, {
        withCredentials: true,
      });
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Settled successfully');
        setSettlePopup(false);
        dispatch(getAdmin());
        fetchUserDetails(selectedUserId);
      } else {
        toast.error(res.data.message || 'Settlement failed');
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Settlement failed'
      );
    } finally {
      setIsSettling(false);
    }
  };

  const handleCreditDepositSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('No user selected.');
      return;
    }
    if (!formData.masterPassword) {
      toast.error('Please enter login password.');
      return;
    }

    const depositAmount = parseFloat(formData.balance);
    const hasDeposit = !Number.isNaN(depositAmount) && depositAmount > 0;

    const newCredStr =
      formData.creditReference === null ||
      formData.creditReference === undefined
        ? ''
        : String(formData.creditReference).trim();
    const newCredNum = parseFloat(newCredStr);
    const oldCredNum = parseFloat(clientCreditRef);
    const hasCreditChange =
      newCredStr !== '' &&
      !Number.isNaN(newCredNum) &&
      newCredNum !== oldCredNum;

    if (!hasDeposit && !hasCreditChange) {
      toast.error('Enter a deposit amount and/or a new credit reference.');
      return;
    }

    try {
      const successParts = [];
      if (hasCreditChange) {
        const data = await dispatch(
          updateCreditReference({
            formData: {
              creditReference: newCredNum,
              masterPassword: formData.masterPassword,
            },
            userId: selectedUserId,
          })
        ).unwrap();
        if (data?.message) successParts.push(data.message);
      }
      if (hasDeposit) {
        const data = await dispatch(
          withdrawalAndDeposite({
            formData,
            userId: selectedUserId,
            type: 'deposite',
          })
        ).unwrap();
        if (data?.message) successParts.push(data.message);
      }
      toast.success(successParts.join(' ') || 'Saved successfully.');
      dispatch(getAdmin());
      closeCreditDepositModal();
      fetchUserDetails(selectedUserId);
    } catch (error) {
      toast.error(error || 'Deposit failed');
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('No user selected.');
      return;
    }
    if (!formData.masterPassword) {
      toast.error('Please enter login password.');
      return;
    }
    try {
      const result = await dispatch(
        withdrawalAndDeposite({
          formData,
          userId: selectedUserId,
          type: 'withdrawal',
        })
      ).unwrap();
      toast.success(result?.message || 'Withdrawal successful');
      setWithdrawPopup(false);
      resetBankingForm();
      dispatch(getAdmin());
      fetchUserDetails(selectedUserId);
    } catch (error) {
      toast.error(error || 'Withdrawal failed');
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user first.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Password not match.');
      return;
    }

    if (!formData.masterPassword) {
      toast.error('Please enter login password.');
      return;
    }

    try {
      const result = await dispatch(
        changePasswordByDownline({
          id: selectedUserId,
          masterPassword: formData.masterPassword,
          newPassword,
        })
      ).unwrap();

      toast.success(result?.message || 'Password changed');
      setPasswordPopup(false);
      setNewPassword('');
      setConfirmPassword('');
      setFormData((prev) => ({ ...prev, masterPassword: '' }));
    } catch (error) {
      toast.error(error || 'Change password failed');
    }
  };

  const fetchLoginHistoryData = async (e) => {
    if (e) e.preventDefault();
    if (!selectedUserId) return;
    setLastLoginPopup(true);
    try {
      setLoadingHistory(true);
      let query = '';
      if (loginStartDate)
        query += `?startDate=${new Date(loginStartDate).toISOString()}`;
      if (loginEndDate)
        query += `${query ? '&' : '?'}endDate=${new Date(loginEndDate).toISOString()}`;

      const res = await api.get(
        `/get/login-history/${selectedUserId}${query}`,
        {
          withCredentials: true,
        }
      );
      setLoginHistoryData(res.data?.data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleResetLoginHistory = () => {
    const defaultStart = getOneWeekAgoDefault();
    const defaultEnd = getNowDefault();
    setLoginStartDate(defaultStart);
    setLoginEndDate(defaultEnd);
    // Need to use setTimeout to allow state to clear before fetching
    setTimeout(() => {
      if (selectedUserId) {
        setLoadingHistory(true);
        let query = `?startDate=${new Date(defaultStart).toISOString()}&endDate=${new Date(defaultEnd).toISOString()}`;
        api
          .get(`/get/login-history/${selectedUserId}${query}`, {
            withCredentials: true,
          })
          .then((res) => setLoginHistoryData(res.data?.data || []))
          .catch((err) => toast.error(getApiErrorMessage(err)))
          .finally(() => setLoadingHistory(false));
      }
    }, 0);
  };

  const handleSelectUser = (user) => {
    setSearchQuery(user.userName);
    setSelectedUserId(user._id);
    setShowDropdown(false);
    fetchUserDetails(user._id);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPL = (value) => Number(value || 0).toFixed(2);

  const plColorClass = (value) =>
    Number(value) >= 0 ? 'text-green-600' : 'text-red-600';

  const activeCasinoRows = (userDetails?.gamePlay?.casinos || []).filter(
    (c) =>
      Math.abs(Number(c.profitLoss) || 0) > 0.001 ||
      (c.betCount && c.betCount > 0)
  );

  const value =
    userDetails?.gamePlay.overallPL ?? userDetails?.accountDetails.profitLoss;

  return (
    <>
      <Navbar />
      <div className='scrollbar-hide md:px-[15px] md:py-[13px]'>
        {/* Search Section */}

        <div className='min-h-[600px] rounded-lg bg-white px-[15px] py-[7px]'>
          <h2 className='mb-2 text-[15px] font-bold text-black'>
            User Details
          </h2>
          {/* <p className='mb-2 text-[11px] text-gray-500'>
            {userInfo?.role === 'supperadmin' || userInfo?.role === 'superadmin'
              ? 'Search all clients on the platform'
              : 'Search clients in your downline (all levels)'}
          </p> */}
          <div className='relative' ref={dropdownRef}>
            <input
              type='text'
              placeholder='Search by client'
              className='w-[230px] rounded border border-gray-300 px-2 py-1 focus:border-blue-400 focus:outline-none'
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
            />
            {showDropdown && searchResults.length > 0 && (
              <ul className='absolute z-10 max-h-60 w-[230px] overflow-auto border border-t-0 border-gray-200 bg-white shadow-lg'>
                {searchResults.map((user, index) => (
                  <li
                    key={user._id}
                    className={`cursor-pointer px-2 py-1.5 hover:bg-black hover:text-white`}
                    onClick={() => handleSelectUser(user)}
                  >
                    {user.userName}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {loadingDetails && (
            <div className='p-4 text-center'>Loading user details...</div>
          )}

          {userDetails && !loadingDetails && (
            <div className='mt-4 space-y-5'>
              {/* Top Row: User Details & Settings */}

              <div className='gap-[30px] md:flex'>
                <fieldset className='h-fit rounded-sm border border-gray-300 bg-gray-50 px-[15px] pt-1 pb-6 md:w-1/2'>
                  <legend className='text-[16px] font-semibold md:text-[20px]'>
                    User Details:
                  </legend>
                  <div className='grid grid-cols-2 space-y-4 text-[12px] font-bold md:grid-cols-3 md:text-[14px]'>
                    <div className='col-span-1 flex flex-wrap'>
                      <span className='pr-2.5 text-gray-500'>User Name:</span>
                      {userDetails.userInfo.userName}
                    </div>
                    <div className='col-span-1 flex flex-wrap'>
                      <span className='pr-2.5 text-gray-500'>Role:</span>
                      {userDetails.userInfo.role}
                    </div>

                    <div className='col-span-1 flex flex-wrap'>
                      <span className='pr-2.5 text-gray-500'>Client Name:</span>
                      {userDetails.userInfo.clientName}
                    </div>
                    <div className='col-span-1 flex flex-wrap'>
                      <span className='pr-2.5 text-gray-500'>
                        Reference Name:
                      </span>
                      {userDetails.userInfo.referenceName}
                    </div>
                    <div className='col-span-1 flex flex-wrap'>
                      <span className='pr-2.5 text-gray-500'>Email:</span>
                      {userDetails.userInfo.email}
                    </div>
                    <div className='col-span-1 flex flex-wrap'>
                      <span className='pr-2.5 text-gray-500'>Mobile:</span>
                      {userDetails.userInfo.mobile}
                    </div>
                    <div className='col-span-1 flex flex-wrap'>
                      <span className='pr-2.5 text-gray-500'>Parents:</span>
                      {userDetails.userInfo.parents}
                    </div>
                  </div>
                </fieldset>
                <fieldset className='mt-4 rounded-sm border border-gray-300 px-[10px] pt-1 md:mt-0 md:w-1/2 md:px-[15px]'>
                  <legend className='text-[16px] font-semibold md:text-[20px]'>
                    Setting:
                  </legend>
                  <div className='grid w-full grid-cols-3 flex-wrap gap-2 md:flex'>
                    <div className='col-span-1 flex justify-center rounded-full border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] py-2 text-[10px] font-bold text-white md:w-[140px] md:text-[12px]'>
                      User Update
                    </div>
                    <div
                      className='col-span-1 flex justify-center rounded-full border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] py-2 text-[10px] font-bold text-white md:w-[140px] md:text-[12px]'
                      onClick={openDepositModal}
                    >
                      Deposit / Credit
                    </div>
                    <div className='col-span-1 flex justify-center rounded-full border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] py-2 text-[10px] font-bold text-white md:w-[140px] md:text-[12px]'>
                      Settlement
                    </div>
                    <div
                      className='col-span-1 flex justify-center rounded-full border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] py-2 text-[10px] font-bold text-white md:w-[140px] md:text-[12px]'
                      onClick={fetchLoginHistoryData}
                    >
                      Last Login
                    </div>
                    <div
                      className='col-span-1 flex justify-center rounded-full border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] py-2 text-[10px] font-bold text-white md:w-[140px] md:text-[12px]'
                      onClick={openPasswordModal}
                    >
                      Change Password
                    </div>
                    <div
                      className='col-span-1 flex justify-center rounded-full border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] py-2 text-[10px] font-bold text-white md:w-[140px] md:text-[12px]'
                      onClick={openWithdrawModal}
                    >
                      Withdrawal
                    </div>
                    <div className='col-span-1 flex justify-center rounded-full border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] py-2 text-[10px] font-bold text-white md:w-[140px] md:text-[12px]'>
                      Game Control
                    </div>
                    <div className='col-span-1 flex justify-center rounded-full border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] py-2 text-[10px] font-bold text-white md:w-[140px] md:text-[12px]'>
                      Casino Control
                    </div>
                  </div>

                  <div className='flex gap-2 py-3.5 text-[12px] font-bold'>
                    <div className='flex items-center gap-1 pl-6 md:w-[140px]'>
                      <input
                        type='checkbox'
                        checked={userDetails.settings.userLock}
                        readOnly
                      />
                      User Lock
                    </div>
                    <div className='flex items-center gap-1 pl-6 md:w-[140px]'>
                      <input
                        type='checkbox'
                        checked={userDetails.settings.betLock}
                        readOnly
                      />
                      Bet Lock
                    </div>
                    <div className='flex items-center gap-1 pl-6 md:w-[140px]'>
                      <input
                        type='checkbox'
                        checked={userDetails.settings.checkLimit}
                        readOnly
                      />
                      Check Limit
                    </div>
                  </div>
                </fieldset>
              </div>

              <fieldset className='w-full rounded-sm border border-gray-300 bg-gray-50 px-[15px] pt-1 pb-6'>
                <legend className='text-[16px] font-semibold md:text-[20px]'>
                  Account Details:
                </legend>
                <div className='grid grid-cols-2 space-y-5 text-[10px] font-bold md:grid-cols-4 md:text-[14px]'>
                  <div>
                    <span className='pr-2.5 text-gray-500'>Credit Ref:</span>
                    {userDetails.accountDetails.creditRef}
                  </div>
                  <div>
                    <span className='pr-2.5 text-gray-500'>
                      UpLine Balance:
                    </span>
                    {Number(userDetails.accountDetails.uplineBalance).toFixed(
                      2
                    )}
                  </div>
                  <div>
                    <span className='pr-2.5 text-gray-500'>Max Bet:</span>
                    {userDetails.accountDetails.maxBet}
                  </div>
                  <div>
                    <span className='pr-2.5 text-gray-500'>Balance:</span>
                    {userDetails.accountDetails.balance}
                  </div>
                  <div>
                    <span className='pr-2.5 text-gray-500'>
                      DownLine Balance:
                    </span>
                    {userDetails.accountDetails.downlineBalance}
                  </div>
                  <div>
                    <span className='pr-2.5 text-gray-500'>Bet Lock:</span>
                    {userDetails.accountDetails.betLock}
                  </div>
                  <div>
                    <span className='pr-2.5 text-gray-500'>
                      Available Balance:
                    </span>
                    {Number(
                      userDetails.accountDetails.availableBalance
                    ).toFixed(2)}
                  </div>
                  <div>
                    <span className='pr-2.5 text-gray-500'>Exposure:</span>
                    {userDetails.accountDetails.exposure}
                  </div>
                  <div>
                    <span className='pr-2.5 text-gray-500'>Active:</span>
                    {userDetails.accountDetails.active}
                  </div>
                  <div>
                    <span
                      className='pr-2.5 text-gray-500'
                      // onClick={openSettleModal}
                    >
                      P/L:
                    </span>
                    {formatPL(userDetails.accountDetails.profitLoss)}
                    {/* {userDetails.accountDetails.sportsPL != null && (
                        <span className='ml-1 text-[10px] text-gray-400'>
                          (Sports {formatPL(userDetails.accountDetails.sportsPL)}
                          {activeCasinoRows.length > 0
                            ? ` + Casino ${formatPL(userDetails.accountDetails.casinoPL)}`
                            : ''}
                          )
                        </span>
                      )} */}
                  </div>
                  <div>
                    <span className='pr-2.5 text-gray-500'>Max Profit:</span>
                    {userDetails.accountDetails.maxProfit}
                  </div>
                  <div>
                    <span className='pr-2.5 text-gray-500'>Created On:</span>
                    {formatDate(userDetails.accountDetails.createdOn)}
                  </div>
                </div>
              </fieldset>

              <fieldset className='w-full rounded-sm border border-gray-300 px-[15px] pt-1 pb-6'>
                <legend className='text-[16px] font-semibold md:text-[20px]'>
                  Game Play:
                </legend>

                <div className='rounded-sm border border-gray-200 p-1'>
                  <div className='grid grid-cols-3 rounded-md border border-gray-200 bg-gray-100 py-0.5'>
                    <div>
                      <span className='block text-center text-gray-500'>
                        P&L
                      </span>
                      <span
                        className={`block text-center font-bold ${value > 0 ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {formatPL(value)}
                      </span>
                    </div>
                    <div>
                      <span className='block text-center text-gray-500'>
                        Commission
                      </span>
                      <span className='block text-center font-bold'>
                        {Number(userDetails.gamePlay.commission).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className='block text-center text-gray-500'>
                        Total Bet
                      </span>
                      <span className='block text-center font-bold'>
                        {userDetails.gamePlay.totalBet}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='mt-2.5 flex flex-wrap gap-4 md:gap-8'>
                  {/* Sports Table */}
                  <div className='w-full overflow-x-auto text-[10px] md:w-[40%] md:text-[14px]'>
                    <table className='w-full border-collapse border border-gray-200 text-left'>
                      <thead>
                        <tr className='border-b-2 border-gray-200 bg-white text-black'>
                          <th className='w-1/4 border-r border-gray-200 px-2 py-1.5 font-bold'>
                            Sport
                          </th>
                          <th className='w-1/4 border-r border-gray-200 px-2 py-1.5 font-bold'>
                            Bet
                          </th>
                          <th className='w-1/4 border-r border-gray-200 px-2 py-1.5 font-bold'>
                            Bet Amount
                          </th>
                          <th className='w-1/4 px-2 py-1.5 font-bold'>P & L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetails.gamePlay.sports.map((sport, i) => (
                          <tr
                            key={i}
                            className='border-t border-gray-200 odd:bg-[#f2f2f2]'
                          >
                            <td className='w-1/4 border-r border-gray-200 px-2 py-1.5 text-gray-500'>
                              {sport.sport}
                            </td>
                            <td className='w-1/4 border-r border-gray-200 px-2 py-1.5 text-gray-500'>
                              {sport.betCount}
                            </td>
                            <td className='w-1/4 border-r border-gray-200 px-2 py-1.5 text-gray-500'>
                              {Number(sport.betAmount).toFixed(2)}
                            </td>
                            <td
                              className={`w-1/4 px-2 py-1.5 ${plColorClass(sport.profitLoss)}`}
                            >
                              {formatPL(sport.profitLoss)}
                            </td>
                          </tr>
                        ))}
                        <tr className='border-t border-gray-300 bg-[#f2f2f2]'>
                          <td className='w-1/4 border-r border-gray-200 px-2 py-1.5 font-bold text-gray-600'>
                            Total
                          </td>
                          <td className='w-1/4 border-r border-gray-200 px-2 py-1.5 font-bold text-gray-600'>
                            {userDetails.gamePlay.sports.reduce(
                              (sum, s) => sum + s.betCount,
                              0
                            )}
                          </td>
                          <td className='w-1/4 border-r border-gray-200 px-2 py-1.5 font-bold text-gray-600'>
                            {Number(
                              userDetails.gamePlay.sports.reduce(
                                (sum, s) => sum + s.betAmount,
                                0
                              )
                            ).toFixed(2)}
                          </td>
                          <td
                            className={`w-1/4 px-2 py-1.5 font-semibold ${plColorClass(userDetails.gamePlay.sports.reduce((sum, s) => sum + s.profitLoss, 0))}`}
                          >
                            {formatPL(
                              userDetails.gamePlay.sports.reduce(
                                (sum, s) => sum + s.profitLoss,
                                0
                              )
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Casino Table */}
                  <div className='w-full overflow-x-auto text-[10px] md:w-[25%] md:text-[14px]'>
                    <table className='w-full border-collapse border border-gray-200 text-left'>
                      <thead>
                        <tr className='border-b-2 border-gray-200 bg-white text-black'>
                          <th className='w-1/2 border-r border-gray-200 px-2 py-1.5 font-bold'>
                            Casino
                          </th>
                          <th className='w-1/2 px-2 py-1.5 font-bold'>
                            Total P & L
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCasinoRows.map((casino, i) => (
                          <tr
                            key={i}
                            className='border-t border-gray-200 odd:bg-[#f2f2f2]'
                          >
                            <td className='w-1/2 border-r border-gray-200 px-2 py-1.5 text-gray-500'>
                              {casino.casino}
                            </td>
                            <td
                              className={`w-1/2 border-r border-gray-200 px-2 py-1.5 text-gray-500 ${plColorClass(casino.profitLoss)}`}
                            >
                              {formatPL(casino.profitLoss)}
                            </td>
                          </tr>
                        ))}
                        {activeCasinoRows.length === 0 && (
                          <tr>
                            <td
                              colSpan='2'
                              className='p-2 text-center text-gray-400'
                            >
                              No Casino bets
                            </td>
                          </tr>
                        )}
                        <tr className='border-t border-gray-300 bg-[#f2f2f2]'>
                          <td className='w-1/2 border-r border-gray-200 px-2 py-1.5 font-bold text-gray-600'>
                            Total
                          </td>
                          <td
                            className={`w-1/2 px-2 py-1.5 font-bold text-gray-600 ${plColorClass(activeCasinoRows.reduce((sum, c) => sum + c.profitLoss, 0))}`}
                          >
                            {formatPL(
                              activeCasinoRows.reduce(
                                (sum, c) => sum + c.profitLoss,
                                0
                              )
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Market Table */}
                  <div className='w-full overflow-x-auto text-[10px] md:w-[35%] md:text-[14px]'>
                    <table className='w-full border-collapse border border-gray-200 text-left'>
                      <thead>
                        <tr className='border-b-2 border-gray-200 bg-white text-black'>
                          <th className='w-1/3 border-r border-gray-200 px-2 py-1.5 font-bold'>
                            Sport
                          </th>
                          <th className='w-1/3 border-r border-gray-200 px-2 py-1.5 font-bold'>
                            Market
                          </th>
                          <th className='w-1/3 px-2 py-1.5 font-bold'>P & L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetails.gamePlay.markets.map((market, i) => (
                          <tr
                            key={i}
                            className='border-t border-gray-200 odd:bg-[#f2f2f2]'
                          >
                            <td className='w-1/3 border-r border-gray-200 px-2 py-1.5 text-gray-600'>
                              {market.sport}
                            </td>
                            <td className='w-1/3 border-r border-gray-200 px-2 py-1.5 text-[11px] text-gray-600'>
                              {market.market}
                            </td>
                            <td
                              className={`w-1/3 px-2 py-1.5 ${plColorClass(market.profitLoss)}`}
                            >
                              {formatPL(market.profitLoss)}
                            </td>
                          </tr>
                        ))}
                        {userDetails.gamePlay.markets.length === 0 && (
                          <tr>
                            <td
                              colSpan='3'
                              className='p-2 text-center text-gray-400'
                            >
                              No Market bets
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </div>

      {/* Credit / Deposit popup */}
      {depositPopup && userDetails && (
        <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-black/45 text-[13px]'>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className='absolute top-8 left-1/2 w-full max-w-[500px] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg'
          >
            <div className='flex items-center justify-between bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1 text-white'>
              <span className='text-[16px] font-semibold'>
                Credit / Deposit
              </span>
              <button
                type='button'
                onClick={closeCreditDepositModal}
                aria-label='Close'
                className='text-xl leading-none font-bold text-gray-200'
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreditDepositSubmit}
              className='space-y-3 bg-sky-50 px-4 py-2'
            >
              <div className='flex flex-wrap items-end gap-2'>
                <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                  My Available
                </label>
                <div className='flex min-w-0 flex-1 flex-wrap items-end gap-8'>
                  <input
                    type='text'
                    readOnly
                    className='min-w-[80px] flex-1 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                    value={userInfo?.avbalance ?? ''}
                  />
                  <div className='flex min-w-[80px] flex-1 flex-col gap-0.5'>
                    <span className='text-[14px]'>After</span>
                    <input
                      type='text'
                      readOnly
                      className='w-full rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                      value={
                        Number(userInfo?.avbalance || 0) -
                        Number(formData.balance || 0)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className='border-2 border-dashed border-gray-800 px-1.5 py-3'>
                <div className='grid grid-cols-1 gap-8 sm:grid-cols-2'>
                  <div>
                    <label className='mb-1 block text-[14px] text-gray-950'>
                      Old Cred Ref.
                    </label>
                    <input
                      type='text'
                      readOnly
                      className='w-full rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 text-end outline-none'
                      value={clientCreditRef}
                    />
                  </div>
                  <div>
                    <label className='mb-1 block text-[14px] text-gray-950'>
                      New Cred Ref.
                    </label>
                    <input
                      type='text'
                      className='w-full rounded-[2px] border border-gray-500 bg-white px-2 py-1.5 outline-none'
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          creditReference: e.target.value,
                        })
                      }
                      value={formData.creditReference ?? ''}
                    />
                  </div>
                </div>
              </div>

              <div className='border-2 border-dashed border-gray-800 px-1.5 py-3'>
                <div className='mb-3 flex flex-wrap items-end gap-2'>
                  <span className='min-w-[170px] shrink-0 text-[14px] text-gray-950'>
                    {userDetails.userInfo.userName}
                  </span>
                  <div className='flex min-w-0 flex-1 flex-wrap gap-8'>
                    <input
                      type='text'
                      readOnly
                      className='min-w-[80px] flex-1 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                      value={clientAvBalance}
                    />
                    <input
                      type='text'
                      readOnly
                      className='min-w-[80px] flex-1 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                      value={
                        Number(clientAvBalance) + Number(formData.balance || 0)
                      }
                    />
                  </div>
                </div>
                <div className='mb-3 flex flex-wrap items-center gap-2'>
                  <label className='min-w-[170px] shrink-0 text-[14px] text-gray-950'>
                    Add Deposit
                  </label>
                  <input
                    type='number'
                    min={0}
                    step='any'
                    className='min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 outline-none'
                    onChange={(e) =>
                      setFormData({ ...formData, balance: e.target.value })
                    }
                    value={formData.balance ?? ''}
                  />
                </div>
                <div className='flex flex-wrap items-start gap-2'>
                  <label className='min-w-[170px] shrink-0 text-[14px] text-gray-950'>
                    Remarks
                  </label>
                  <textarea
                    rows={3}
                    className='min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 outline-none'
                    onChange={(e) =>
                      setFormData({ ...formData, remark: e.target.value })
                    }
                    value={formData.remark ?? ''}
                  />
                </div>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <label className='min-w-[175px] shrink-0 text-[14px] text-gray-950'>
                  Login Password
                </label>
                <input
                  type='password'
                  autoComplete='off'
                  className='min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 outline-none'
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      masterPassword: e.target.value,
                    })
                  }
                  value={formData.masterPassword}
                />
              </div>

              <div className='flex justify-end gap-2 pt-1'>
                <button
                  type='submit'
                  className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                >
                  Submit
                </button>
                <button
                  type='button'
                  onClick={closeCreditDepositModal}
                  className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* withdraw popup */}
      {withdrawPopup && userDetails && (
        <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className='absolute top-8 left-1/2 w-full max-w-[500px] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg'
          >
            <div className='flex items-center justify-between bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1 text-white'>
              <span className='text-[16px] font-semibold'>Withdraw</span>
              <button
                type='button'
                onClick={() => {
                  setWithdrawPopup(false);
                  resetBankingForm();
                }}
                className='text-xl leading-none font-bold text-gray-200'
              >
                ×
              </button>
            </div>
            <div className='space-y-3 bg-sky-50 px-4 py-1'>
              <div className='flex flex-wrap items-end gap-2'>
                <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                  {userInfo?.userName}
                </label>
                <div className='flex flex-1 items-end gap-8'>
                  <div className='w-1/2'>
                    <input
                      type='text'
                      value={userInfo?.avbalance ?? ''}
                      readOnly
                      className='w-full flex-1 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                    />
                  </div>
                  <div className='flex w-1/2 flex-col gap-0.5'>
                    <span className='text-[14px]'>After</span>
                    <input
                      type='text'
                      className='w-full rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                      value={
                        Number(userInfo?.avbalance || 0) +
                        Number(formData.balance || 0)
                      }
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className='flex flex-wrap items-end gap-2'>
                <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                  {userDetails.userInfo.userName}
                </label>
                <div className='flex flex-1 items-end gap-8'>
                  <input
                    type='text'
                    className='w-1/2 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                    value={clientAvBalance}
                    readOnly
                  />
                  <input
                    type='text'
                    className='w-1/2 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                    value={
                      Number(clientAvBalance) - Number(formData.balance || 0)
                    }
                    readOnly
                  />
                </div>
              </div>

              <form onSubmit={handleWithdrawSubmit}>
                <div className='mb-3 flex flex-wrap items-center gap-2'>
                  <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                    Amount
                  </label>
                  <input
                    type='text'
                    className='min-w-0 flex-1 border border-gray-700 bg-white px-2 py-1.5 outline-none'
                    onChange={(e) =>
                      setFormData({ ...formData, balance: e.target.value })
                    }
                    value={formData.balance}
                  />
                </div>

                <div className='mb-3 flex flex-wrap items-center gap-2'>
                  <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                    Remark
                  </label>
                  <textarea
                    rows={3}
                    className='min-w-0 flex-1 border border-gray-700 bg-white px-2 py-1.5 outline-none'
                    onChange={(e) =>
                      setFormData({ ...formData, remark: e.target.value })
                    }
                    value={formData.remark}
                  />
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                    Login Password
                  </label>
                  <input
                    type='password'
                    className='min-w-0 flex-1 border border-gray-700 bg-white px-2 py-1.5 outline-none'
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        masterPassword: e.target.value,
                      })
                    }
                    value={formData.masterPassword}
                  />
                </div>

                <div className='mt-3 flex justify-end gap-2 border-t border-gray-200 py-2'>
                  <button
                    type='submit'
                    className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                  >
                    Submit
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setWithdrawPopup(false);
                      resetBankingForm();
                    }}
                    className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* change Password popup */}
      {passwordPopup && userDetails && (
        <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className='absolute top-8 left-1/2 w-full max-w-[500px] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg'
          >
            <div className='flex items-center justify-between bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1 text-white'>
              <span className='text-[16px] font-semibold'>Change Password</span>
              <button
                type='button'
                onClick={() => setPasswordPopup(false)}
                className='text-xl leading-none font-bold text-gray-200'
              >
                ×
              </button>
            </div>
            <div className='space-y-3 bg-sky-50 px-5 pt-4 pb-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                  New Password
                </label>
                <input
                  type='text'
                  className='flex-1 rounded-[2px] border border-gray-500 bg-white px-2 py-1.5 outline-none'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                  Confirm Password
                </label>
                <input
                  type='text'
                  className='flex-1 rounded-[2px] border border-gray-500 bg-white px-2 py-1.5 outline-none'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                  Login Password
                </label>
                <input
                  type='password'
                  className='flex-1 rounded-[2px] border border-gray-500 bg-white px-2 py-1.5 outline-none'
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      masterPassword: e.target.value,
                    })
                  }
                  value={formData.masterPassword}
                />
              </div>

              <div className='mt-3 flex justify-end gap-2 border-t border-gray-200 py-1'>
                <button
                  type='button'
                  className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                  onClick={handleChangePassword}
                >
                  Submit
                </button>
                <button
                  type='button'
                  onClick={() => setPasswordPopup(false)}
                  className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Last Login Modal */}
      {lastLoginPopup && (
        <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className='absolute top-8 left-1/2 w-full max-w-[700px] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg'
          >
            <div className='flex items-center justify-between bg-gradient-to-b from-[#359db1] to-[#247c8f] px-4 py-1 text-white'>
              <h3 className='text-[15px] font-bold'>
                Last Logins of {userDetails.userInfo.userName}
              </h3>
              <button
                onClick={() => setLastLoginPopup(false)}
                className='text-xl leading-none font-bold text-gray-200'
              >
                &times;
              </button>
            </div>
            <div className='flex items-center gap-8 bg-[#f0f4f8] p-4'>
              <input
                type='datetime-local'
                className='rounded border border-gray-400 bg-white px-2 py-1 text-[13px] outline-none'
                value={loginStartDate}
                onChange={(e) => setLoginStartDate(e.target.value)}
              />
              <input
                type='datetime-local'
                className='rounded border border-gray-400 bg-white px-2 py-1 text-[13px] outline-none'
                value={loginEndDate}
                onChange={(e) => setLoginEndDate(e.target.value)}
              />
              <div className='flex gap-1'>
                <button
                  onClick={fetchLoginHistoryData}
                  className='rounded-l border border-[#247c8f] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1 text-[13px] font-semibold text-white'
                >
                  Go
                </button>
                <button
                  onClick={handleResetLoginHistory}
                  className='rounded-r border border-[#247c8f] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1 text-[13px] font-semibold text-white'
                >
                  Reset
                </button>
              </div>
            </div>
            <div className='flex-1 overflow-auto bg-[#f0f4f8] p-2 pt-0'>
              <table className='w-full border-collapse border border-gray-300 bg-[#f0f4f8] text-left text-[13px]'>
                <thead>
                  <tr className='bg-[#146578] text-white'>
                    <th className='p-2 font-semibold'>Date & Time</th>
                    <th className='border-l border-white/20 p-2 font-semibold'>
                      IP
                    </th>
                    <th className='border-l border-white/20 p-2 font-semibold'>
                      Device
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHistory ? (
                    <tr>
                      <td
                        colSpan='3'
                        className='bg-gray-200 p-2 text-center text-gray-500'
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : loginHistoryData.length === 0 ? (
                    <tr>
                      <td
                        colSpan='3'
                        className='bg-gray-200 p-2 text-center text-gray-500'
                      >
                        No Data Found.
                      </td>
                    </tr>
                  ) : (
                    loginHistoryData.map((log, i) => (
                      <tr
                        key={i}
                        className='border-b border-gray-300 bg-gray-100'
                      >
                        <td className='p-2'>
                          {log.dateTime ||
                            new Date(log.createdAt).toLocaleString('en-GB')}
                        </td>
                        <td className='border-l border-gray-300 p-2'>
                          {log.ip || '-'}
                        </td>
                        <td className='border-l border-gray-300 p-2'>
                          {log.isp || log.device || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
      {/* Settlement Modal */}
      {settlePopup && (
        <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className='absolute top-8 left-1/2 w-full max-w-[500px] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg'
          >
            <div className='flex items-center justify-between bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-2 text-white'>
              <span className='text-[16px] font-bold'>Settlement</span>
              <button
                type='button'
                onClick={() => setSettlePopup(false)}
                className='text-xl leading-none font-bold text-gray-200'
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSettleSubmit}
              className='space-y-4 px-6 py-4 text-[14px]'
            >
              <div className='grid grid-cols-2 gap-x-2 gap-y-4'>
                <div className='font-bold text-gray-800'>User Name:</div>
                <div className='text-black'>
                  {userDetails?.userInfo?.userName}
                </div>

                <div className='font-bold text-gray-800'>My Available Bal</div>
                <div className='font-bold text-gray-800'>P&L</div>

                <div className='font-bold text-green-600'>
                  {Number(userInfo?.avbalance || 0).toFixed(2)}
                </div>
                <div
                  className={`font-bold ${plColorClass(userDetails?.accountDetails?.profitLoss)}`}
                >
                  {formatPL(userDetails?.accountDetails?.profitLoss)}
                </div>

                <div className='font-bold text-gray-800'>Exposure</div>
                <div className='font-bold text-gray-800'>Amount To Settle</div>

                <div className='text-black'>
                  {formatPL(userDetails?.accountDetails?.exposure)}
                </div>
                <div
                  className={`font-bold ${plColorClass(userDetails?.accountDetails?.profitLoss)}`}
                >
                  {formatPL(userDetails?.accountDetails?.profitLoss)}
                </div>
              </div>

              <div className='mt-4 flex items-center gap-2'>
                <label className='w-[140px] font-bold text-gray-800'>
                  Settle Amount
                </label>
                <input
                  type='number'
                  step='0.01'
                  className='h-[30px] flex-1 rounded-sm border border-gray-400 px-2 outline-none'
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  required
                />
                <button
                  type='button'
                  onClick={() =>
                    setSettleAmount(
                      Math.abs(
                        userDetails?.accountDetails?.profitLoss || 0
                      ).toFixed(2)
                    )
                  }
                  className='rounded-sm border border-black bg-gradient-to-b from-[#545454] to-[#000] px-3 py-1 text-white hover:opacity-90'
                >
                  Full Settle
                </button>
              </div>

              <div className='flex items-start gap-2'>
                <label className='w-[140px] font-bold text-gray-800'>
                  Remarks
                </label>
                <textarea
                  rows={3}
                  className='flex-1 rounded-sm border border-gray-400 px-2 py-1 outline-none'
                  value={settleRemarks}
                  onChange={(e) => setSettleRemarks(e.target.value)}
                />
              </div>

              <div className='flex items-center gap-2'>
                <label className='w-[140px] font-bold text-gray-800'>
                  Login Password
                </label>
                <input
                  type='password'
                  className='h-[30px] flex-1 rounded-sm border border-gray-400 px-2 outline-none'
                  value={settlePassword}
                  onChange={(e) => setSettlePassword(e.target.value)}
                  required
                />
              </div>

              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='submit'
                  disabled={isSettling}
                  className='rounded bg-gradient-to-b from-[#359db1] to-[#247c8f] px-6 py-1.5 font-bold text-white shadow hover:opacity-90 disabled:opacity-50'
                >
                  {isSettling ? 'Processing...' : 'Submit'}
                </button>
                <button
                  type='button'
                  onClick={() => setSettlePopup(false)}
                  className='rounded bg-gradient-to-b from-[#359db1] to-[#247c8f] px-6 py-1.5 font-bold text-white shadow hover:opacity-90'
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default UserDetails;
