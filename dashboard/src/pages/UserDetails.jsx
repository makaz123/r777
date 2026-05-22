import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { toast } from 'react-toastify';

const UserDetails = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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
      const res = await api.get(`/get/all-only-user?searchQuery=${query}`, {
        withCredentials: true,
      });
      setSearchResults(res.data?.data || []);
      setShowDropdown(true);
    } catch (error) {
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
      toast.error(
        error?.response?.data?.message || 'Failed to load user details'
      );
    } finally {
      setLoadingDetails(false);
    }
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

  return (
    <div className='min-h-screen bg-[#f5f7f9]'>
      <Navbar />
      <div className='mx-auto max-w-[1400px] p-4 text-[13px] text-[#333] md:p-6'>
        {/* Search Section */}
        <div className='mb-4 w-full rounded border border-gray-200 bg-white p-4 shadow-sm md:w-1/3'>
          <h2 className='mb-2 text-[16px] font-bold text-black'>
            User Details
          </h2>
          <div className='relative' ref={dropdownRef}>
            <input
              type='text'
              placeholder='Search by client'
              className='w-full rounded border border-gray-300 px-3 py-1.5 focus:border-blue-400 focus:outline-none'
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
            />
            {showDropdown && searchResults.length > 0 && (
              <ul className='absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-gray-200 bg-white shadow-lg'>
                {searchResults.map((user, index) => (
                  <li
                    key={user._id}
                    className={`cursor-pointer px-3 py-2 hover:bg-gray-100 ${index % 2 === 1 ? 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]' : 'text-gray-700'}`}
                    onClick={() => handleSelectUser(user)}
                  >
                    {user.userName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {loadingDetails && (
          <div className='p-4 text-center'>Loading user details...</div>
        )}

        {userDetails && !loadingDetails && (
          <div className='space-y-4'>
            {/* Top Row: User Details & Settings */}
            <div className='flex flex-col gap-4 lg:flex-row'>
              {/* User Details */}
              <div className='flex-1 rounded border border-gray-200 bg-white p-4 shadow-sm'>
                <h2 className='mb-3 text-[15px] font-bold text-black'>
                  User Details:
                </h2>
                <div className='grid grid-cols-1 gap-y-4 text-[13px] md:grid-cols-3'>
                  <div>
                    <span className='mr-1 font-semibold text-gray-500'>
                      User Name :
                    </span>{' '}
                    {userDetails.userInfo.userName}
                  </div>
                  <div>
                    <span className='mr-1 font-semibold text-gray-500'>
                      Role :
                    </span>{' '}
                    <span className='font-bold'>
                      {userDetails.userInfo.role}
                    </span>
                  </div>
                  <div>
                    <span className='mr-1 font-semibold text-gray-500'>
                      Client Name :
                    </span>{' '}
                    <span className='font-bold'>
                      {userDetails.userInfo.clientName}
                    </span>
                  </div>

                  <div>
                    <span className='mr-1 font-semibold text-gray-500'>
                      Reference Name :
                    </span>{' '}
                    {userDetails.userInfo.referenceName}
                  </div>
                  <div>
                    <span className='mr-1 font-semibold text-gray-500'>
                      Email :
                    </span>{' '}
                    {userDetails.userInfo.email}
                  </div>
                  <div>
                    <span className='mr-1 font-semibold text-gray-500'>
                      Mobile :
                    </span>{' '}
                    {userDetails.userInfo.mobile}
                  </div>

                  <div className='col-span-3'>
                    <span className='mr-1 font-semibold text-gray-500'>
                      Parents :
                    </span>{' '}
                    {userDetails.userInfo.parents}
                  </div>
                </div>
              </div>

              {/* Setting */}
              <div className='rounded border border-gray-200 bg-white p-4 shadow-sm lg:w-[500px]'>
                <h2 className='mb-3 text-[15px] font-bold text-black'>
                  Setting:
                </h2>
                <div className='mb-4 grid grid-cols-4 gap-2'>
                  <button className='rounded-full bg-gradient-to-b from-[#359db1] to-[#247c8f] px-2 py-1 text-center text-[11px] text-white shadow-sm'>
                    User Update
                  </button>
                  <button className='rounded-full bg-gradient-to-b from-[#359db1] to-[#247c8f] px-2 py-1 text-center text-[11px] text-white shadow-sm'>
                    Deposit / Credit
                  </button>
                  <button className='rounded-full bg-gradient-to-b from-[#359db1] to-[#247c8f] px-2 py-1 text-center text-[11px] text-white shadow-sm'>
                    Settlement
                  </button>
                  <button className='rounded-full bg-gradient-to-b from-[#359db1] to-[#247c8f] px-2 py-1 text-center text-[11px] text-white shadow-sm'>
                    Last Login
                  </button>

                  <button className='mt-1 rounded-full bg-gradient-to-b from-[#359db1] to-[#247c8f] px-2 py-1 text-center text-[11px] text-white shadow-sm'>
                    Change Password
                  </button>
                  <button className='mt-1 rounded-full bg-gradient-to-b from-[#359db1] to-[#247c8f] px-2 py-1 text-center text-[11px] text-white shadow-sm'>
                    Withdrawal
                  </button>
                  <button className='mt-1 rounded-full bg-gradient-to-b from-[#359db1] to-[#247c8f] px-2 py-1 text-center text-[11px] text-white shadow-sm'>
                    Game Control
                  </button>
                  <button className='mt-1 rounded-full bg-gradient-to-b from-[#359db1] to-[#247c8f] px-2 py-1 text-center text-[11px] text-white shadow-sm'>
                    Casino Control
                  </button>
                </div>
                <div className='mt-2 flex justify-center gap-6'>
                  <label className='flex cursor-pointer items-center gap-1 text-[12px] font-semibold'>
                    <input
                      type='checkbox'
                      checked={userDetails.settings.userLock}
                      readOnly
                    />{' '}
                    User Lock
                  </label>
                  <label className='flex cursor-pointer items-center gap-1 text-[12px] font-semibold'>
                    <input
                      type='checkbox'
                      checked={userDetails.settings.betLock}
                      readOnly
                    />{' '}
                    Bet Lock
                  </label>
                  <label className='flex cursor-pointer items-center gap-1 text-[12px] font-semibold'>
                    <input
                      type='checkbox'
                      checked={userDetails.settings.checkLimit}
                      readOnly
                    />{' '}
                    Check Limit
                  </label>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className='rounded border border-gray-200 bg-white p-4 shadow-sm'>
              <h2 className='mb-3 text-[15px] font-bold text-black'>
                Account Details:
              </h2>
              <div className='grid grid-cols-1 gap-x-2 gap-y-4 text-[12px] md:grid-cols-4'>
                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    Credit Ref:
                  </span>{' '}
                  {userDetails.accountDetails.creditRef}
                </div>
                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    Balance:
                  </span>{' '}
                  <span className='font-bold'>
                    {userDetails.accountDetails.balance}
                  </span>
                </div>
                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    Available Balance:
                  </span>{' '}
                  <span className='font-bold'>
                    {Number(
                      userDetails.accountDetails.availableBalance
                    ).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    P/L :
                  </span>{' '}
                  <span className='font-bold text-black'>
                    {userDetails.accountDetails.profitLoss}
                  </span>
                </div>

                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    UpLine Balance:
                  </span>{' '}
                  <span className='font-bold'>
                    {Number(userDetails.accountDetails.uplineBalance).toFixed(
                      2
                    )}
                  </span>
                </div>
                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    DownLine Balance:
                  </span>{' '}
                  {userDetails.accountDetails.downlineBalance}
                </div>
                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    Exposure :
                  </span>{' '}
                  {userDetails.accountDetails.exposure}
                </div>
                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    Max Profit:
                  </span>{' '}
                  {userDetails.accountDetails.maxProfit}
                </div>

                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    Max Bet:
                  </span>{' '}
                  {userDetails.accountDetails.maxBet}
                </div>
                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    Bet Lock:
                  </span>{' '}
                  <span className='font-bold'>
                    {userDetails.accountDetails.betLock}
                  </span>
                </div>
                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    Active :
                  </span>{' '}
                  <span className='font-bold'>
                    {userDetails.accountDetails.active}
                  </span>
                </div>
                <div>
                  <span className='mr-1 font-semibold text-gray-500'>
                    Created On :
                  </span>{' '}
                  <span className='font-bold'>
                    {formatDate(userDetails.accountDetails.createdOn)}
                  </span>
                </div>
              </div>
            </div>

            {/* Game Play */}
            <div className='rounded border border-gray-200 bg-white p-4 shadow-sm'>
              <h2 className='mb-3 text-[15px] font-bold text-black'>
                Game Play:
              </h2>

              <div className='mb-4 grid grid-cols-3 rounded border border-gray-300 bg-[#f0f4f8] py-2 text-center text-[13px] font-semibold shadow-sm'>
                <div>
                  <div className='mb-1 text-gray-500'>P&L</div>
                  <div
                    className={
                      userDetails.gamePlay.overallPL >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {Number(userDetails.gamePlay.overallPL).toFixed(4)}
                  </div>
                </div>
                <div className='border-r border-l border-gray-300'>
                  <div className='mb-1 text-gray-500'>Commission</div>
                  <div className='text-red-500'>
                    {Number(userDetails.gamePlay.commission).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className='mb-1 text-gray-500'>Total Bet</div>
                  <div className='text-black'>
                    {userDetails.gamePlay.totalBet}
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 align-top lg:grid-cols-3'>
                {/* Sports Table */}
                <div className='overflow-x-auto'>
                  <table className='w-full border-collapse border border-gray-200 text-left'>
                    <thead>
                      <tr className='border-b border-gray-200 bg-white text-black'>
                        <th className='w-1/4 p-2 font-bold'>Sport</th>
                        <th className='w-1/4 p-2 text-center font-bold'>Bet</th>
                        <th className='w-1/4 p-2 text-right font-bold'>
                          Bet Amount
                        </th>
                        <th className='w-1/4 p-2 text-right font-bold'>
                          P & L
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetails.gamePlay.sports.map((sport, i) => (
                        <tr
                          key={i}
                          className='border-b border-gray-100 last:border-b-0'
                        >
                          <td className='p-2 text-gray-500'>{sport.sport}</td>
                          <td className='p-2 text-center text-black'>
                            {sport.betCount}
                          </td>
                          <td className='p-2 text-right text-black'>
                            {Number(sport.betAmount).toFixed(2)}
                          </td>
                          <td
                            className={`p-2 text-right ${sport.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {Number(sport.profitLoss).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className='border-t-2 border-gray-300 bg-[#f2f2f2]'>
                        <td className='p-2 font-semibold text-black'>Total</td>
                        <td className='p-2 text-center text-black'>
                          {userDetails.gamePlay.sports.reduce(
                            (sum, s) => sum + s.betCount,
                            0
                          )}
                        </td>
                        <td className='p-2 text-right text-black'>
                          {Number(
                            userDetails.gamePlay.sports.reduce(
                              (sum, s) => sum + s.betAmount,
                              0
                            )
                          ).toFixed(2)}
                        </td>
                        <td
                          className={`p-2 text-right font-semibold ${userDetails.gamePlay.sports.reduce((sum, s) => sum + s.profitLoss, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {Number(
                            userDetails.gamePlay.sports.reduce(
                              (sum, s) => sum + s.profitLoss,
                              0
                            )
                          ).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Casino Table */}
                <div className='overflow-x-auto'>
                  <table className='w-full border-collapse border border-gray-200 text-left'>
                    <thead>
                      <tr className='border-b border-gray-200 bg-white text-black'>
                        <th className='w-1/2 p-2 font-bold'>Casino</th>
                        <th className='w-1/2 p-2 text-right font-bold'>
                          Total P & L
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetails.gamePlay.casinos.map((casino, i) => (
                        <tr
                          key={i}
                          className='border-b border-gray-100 last:border-b-0'
                        >
                          <td className='p-2 text-gray-500'>{casino.casino}</td>
                          <td
                            className={`p-2 text-right ${casino.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {Number(casino.profitLoss).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {userDetails.gamePlay.casinos.length === 0 && (
                        <tr>
                          <td
                            colSpan='2'
                            className='p-2 text-center text-gray-400'
                          >
                            No Casino bets
                          </td>
                        </tr>
                      )}
                      <tr className='border-t-2 border-gray-300 bg-[#f2f2f2]'>
                        <td className='p-2 font-semibold text-black'>Total</td>
                        <td
                          className={`p-2 text-right font-semibold ${userDetails.gamePlay.casinos.reduce((sum, c) => sum + c.profitLoss, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {Number(
                            userDetails.gamePlay.casinos.reduce(
                              (sum, c) => sum + c.profitLoss,
                              0
                            )
                          ).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Market Table */}
                <div className='overflow-x-auto'>
                  <table className='w-full border-collapse border border-gray-200 text-left'>
                    <thead>
                      <tr className='border-b border-gray-200 bg-white text-black'>
                        <th className='w-1/3 p-2 font-bold'>Sport</th>
                        <th className='w-1/3 p-2 text-center font-bold'>
                          Market
                        </th>
                        <th className='w-1/3 p-2 text-right font-bold'>
                          P & L
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetails.gamePlay.markets.map((market, i) => (
                        <tr
                          key={i}
                          className='border-b border-gray-100 last:border-b-0'
                        >
                          <td className='p-2 text-gray-500'>{market.sport}</td>
                          <td className='p-2 text-center text-gray-500'>
                            {market.market}
                          </td>
                          <td
                            className={`p-2 text-right ${market.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {Number(market.profitLoss).toFixed(2)}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetails;
