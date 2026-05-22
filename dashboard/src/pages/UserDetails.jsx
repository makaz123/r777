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
      toast.error(error?.response?.data?.message || 'Failed to load user details');
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
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9]">
      <Navbar />
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto text-[13px] text-[#333]">
        
        {/* Search Section */}
        <div className="bg-white rounded border border-gray-200 p-4 mb-4 shadow-sm w-full md:w-1/3">
          <h2 className="font-bold text-[16px] mb-2 text-black">User Details</h2>
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              placeholder="Search by client"
              className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => { if(searchResults.length > 0) setShowDropdown(true) }}
            />
            {showDropdown && searchResults.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-auto">
                {searchResults.map((user, index) => (
                  <li
                    key={user._id}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${index % 2 === 1 ? 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]' : 'text-gray-700'}`}
                    onClick={() => handleSelectUser(user)}
                  >
                    {user.userName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {loadingDetails && <div className="text-center p-4">Loading user details...</div>}

        {userDetails && !loadingDetails && (
          <div className="space-y-4">
            
            {/* Top Row: User Details & Settings */}
            <div className="flex flex-col lg:flex-row gap-4">
              
              {/* User Details */}
              <div className="bg-white rounded border border-gray-200 p-4 shadow-sm flex-1">
                <h2 className="font-bold text-[15px] mb-3 text-black">User Details:</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 text-[13px]">
                  <div><span className="text-gray-500 font-semibold mr-1">User Name :</span> {userDetails.userInfo.userName}</div>
                  <div><span className="text-gray-500 font-semibold mr-1">Role :</span> <span className="font-bold">{userDetails.userInfo.role}</span></div>
                  <div><span className="text-gray-500 font-semibold mr-1">Client Name :</span> <span className="font-bold">{userDetails.userInfo.clientName}</span></div>
                  
                  <div><span className="text-gray-500 font-semibold mr-1">Reference Name :</span> {userDetails.userInfo.referenceName}</div>
                  <div><span className="text-gray-500 font-semibold mr-1">Email :</span> {userDetails.userInfo.email}</div>
                  <div><span className="text-gray-500 font-semibold mr-1">Mobile :</span> {userDetails.userInfo.mobile}</div>
                  
                  <div className="col-span-3"><span className="text-gray-500 font-semibold mr-1">Parents :</span> {userDetails.userInfo.parents}</div>
                </div>
              </div>

              {/* Setting */}
              <div className="bg-white rounded border border-gray-200 p-4 shadow-sm lg:w-[500px]">
                <h2 className="font-bold text-[15px] mb-3 text-black">Setting:</h2>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <button className="bg-gradient-to-b from-[#359db1] to-[#247c8f] text-white py-1 px-2 rounded-full text-[11px] shadow-sm text-center">User Update</button>
                  <button className="bg-gradient-to-b from-[#359db1] to-[#247c8f] text-white py-1 px-2 rounded-full text-[11px] shadow-sm text-center">Deposit / Credit</button>
                  <button className="bg-gradient-to-b from-[#359db1] to-[#247c8f] text-white py-1 px-2 rounded-full text-[11px] shadow-sm text-center">Settlement</button>
                  <button className="bg-gradient-to-b from-[#359db1] to-[#247c8f] text-white py-1 px-2 rounded-full text-[11px] shadow-sm text-center">Last Login</button>
                  
                  <button className="bg-gradient-to-b from-[#359db1] to-[#247c8f] text-white py-1 px-2 rounded-full text-[11px] shadow-sm text-center mt-1">Change Password</button>
                  <button className="bg-gradient-to-b from-[#359db1] to-[#247c8f] text-white py-1 px-2 rounded-full text-[11px] shadow-sm text-center mt-1">Withdrawal</button>
                  <button className="bg-gradient-to-b from-[#359db1] to-[#247c8f] text-white py-1 px-2 rounded-full text-[11px] shadow-sm text-center mt-1">Game Control</button>
                  <button className="bg-gradient-to-b from-[#359db1] to-[#247c8f] text-white py-1 px-2 rounded-full text-[11px] shadow-sm text-center mt-1">Casino Control</button>
                </div>
                <div className="flex gap-6 justify-center mt-2">
                  <label className="flex items-center gap-1 font-semibold cursor-pointer text-[12px]"><input type="checkbox" checked={userDetails.settings.userLock} readOnly /> User Lock</label>
                  <label className="flex items-center gap-1 font-semibold cursor-pointer text-[12px]"><input type="checkbox" checked={userDetails.settings.betLock} readOnly /> Bet Lock</label>
                  <label className="flex items-center gap-1 font-semibold cursor-pointer text-[12px]"><input type="checkbox" checked={userDetails.settings.checkLimit} readOnly /> Check Limit</label>
                </div>
              </div>

            </div>

            {/* Account Details */}
            <div className="bg-white rounded border border-gray-200 p-4 shadow-sm">
              <h2 className="font-bold text-[15px] mb-3 text-black">Account Details:</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-y-4 gap-x-2 text-[12px]">
                <div><span className="text-gray-500 font-semibold mr-1">Credit Ref:</span> {userDetails.accountDetails.creditRef}</div>
                <div><span className="text-gray-500 font-semibold mr-1">Balance:</span> <span className="font-bold">{userDetails.accountDetails.balance}</span></div>
                <div><span className="text-gray-500 font-semibold mr-1">Available Balance:</span> <span className="font-bold">{Number(userDetails.accountDetails.availableBalance).toFixed(2)}</span></div>
                <div><span className="text-gray-500 font-semibold mr-1">P/L :</span> <span className="font-bold text-black">{userDetails.accountDetails.profitLoss}</span></div>

                <div><span className="text-gray-500 font-semibold mr-1">UpLine Balance:</span> <span className="font-bold">{Number(userDetails.accountDetails.uplineBalance).toFixed(2)}</span></div>
                <div><span className="text-gray-500 font-semibold mr-1">DownLine Balance:</span> {userDetails.accountDetails.downlineBalance}</div>
                <div><span className="text-gray-500 font-semibold mr-1">Exposure :</span> {userDetails.accountDetails.exposure}</div>
                <div><span className="text-gray-500 font-semibold mr-1">Max Profit:</span> {userDetails.accountDetails.maxProfit}</div>

                <div><span className="text-gray-500 font-semibold mr-1">Max Bet:</span> {userDetails.accountDetails.maxBet}</div>
                <div><span className="text-gray-500 font-semibold mr-1">Bet Lock:</span> <span className="font-bold">{userDetails.accountDetails.betLock}</span></div>
                <div><span className="text-gray-500 font-semibold mr-1">Active :</span> <span className="font-bold">{userDetails.accountDetails.active}</span></div>
                <div><span className="text-gray-500 font-semibold mr-1">Created On :</span> <span className="font-bold">{formatDate(userDetails.accountDetails.createdOn)}</span></div>
              </div>
            </div>

            {/* Game Play */}
            <div className="bg-white rounded border border-gray-200 p-4 shadow-sm">
              <h2 className="font-bold text-[15px] mb-3 text-black">Game Play:</h2>
              
              <div className="bg-[#f0f4f8] border border-gray-300 rounded mb-4 grid grid-cols-3 text-center py-2 shadow-sm font-semibold text-[13px]">
                <div>
                  <div className="text-gray-500 mb-1">P&L</div>
                  <div className={userDetails.gamePlay.overallPL >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {Number(userDetails.gamePlay.overallPL).toFixed(4)}
                  </div>
                </div>
                <div className="border-l border-r border-gray-300">
                  <div className="text-gray-500 mb-1">Commission</div>
                  <div className="text-red-500">{Number(userDetails.gamePlay.commission).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Total Bet</div>
                  <div className="text-black">{userDetails.gamePlay.totalBet}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 align-top">
                
                {/* Sports Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-white border-b border-gray-200 text-black">
                        <th className="p-2 font-bold w-1/4">Sport</th>
                        <th className="p-2 font-bold w-1/4 text-center">Bet</th>
                        <th className="p-2 font-bold w-1/4 text-right">Bet Amount</th>
                        <th className="p-2 font-bold w-1/4 text-right">P & L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetails.gamePlay.sports.map((sport, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-b-0">
                          <td className="p-2 text-gray-500">{sport.sport}</td>
                          <td className="p-2 text-center text-black">{sport.betCount}</td>
                          <td className="p-2 text-right text-black">{Number(sport.betAmount).toFixed(2)}</td>
                          <td className={`p-2 text-right ${sport.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(sport.profitLoss).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#f2f2f2] border-t-2 border-gray-300">
                        <td className="p-2 text-black font-semibold">Total</td>
                        <td className="p-2 text-center text-black">{userDetails.gamePlay.sports.reduce((sum, s) => sum + s.betCount, 0)}</td>
                        <td className="p-2 text-right text-black">{Number(userDetails.gamePlay.sports.reduce((sum, s) => sum + s.betAmount, 0)).toFixed(2)}</td>
                        <td className={`p-2 text-right font-semibold ${userDetails.gamePlay.sports.reduce((sum, s) => sum + s.profitLoss, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(userDetails.gamePlay.sports.reduce((sum, s) => sum + s.profitLoss, 0)).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Casino Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-white border-b border-gray-200 text-black">
                        <th className="p-2 font-bold w-1/2">Casino</th>
                        <th className="p-2 font-bold w-1/2 text-right">Total P & L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetails.gamePlay.casinos.map((casino, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-b-0">
                          <td className="p-2 text-gray-500">{casino.casino}</td>
                          <td className={`p-2 text-right ${casino.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(casino.profitLoss).toFixed(2)}</td>
                        </tr>
                      ))}
                      {userDetails.gamePlay.casinos.length === 0 && (
                        <tr><td colSpan="2" className="p-2 text-center text-gray-400">No Casino bets</td></tr>
                      )}
                      <tr className="bg-[#f2f2f2] border-t-2 border-gray-300">
                        <td className="p-2 text-black font-semibold">Total</td>
                        <td className={`p-2 text-right font-semibold ${userDetails.gamePlay.casinos.reduce((sum, c) => sum + c.profitLoss, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(userDetails.gamePlay.casinos.reduce((sum, c) => sum + c.profitLoss, 0)).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Market Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-white border-b border-gray-200 text-black">
                        <th className="p-2 font-bold w-1/3">Sport</th>
                        <th className="p-2 font-bold w-1/3 text-center">Market</th>
                        <th className="p-2 font-bold w-1/3 text-right">P & L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetails.gamePlay.markets.map((market, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-b-0">
                          <td className="p-2 text-gray-500">{market.sport}</td>
                          <td className="p-2 text-gray-500 text-center">{market.market}</td>
                          <td className={`p-2 text-right ${market.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(market.profitLoss).toFixed(2)}</td>
                        </tr>
                      ))}
                      {userDetails.gamePlay.markets.length === 0 && (
                        <tr><td colSpan="3" className="p-2 text-center text-gray-400">No Market bets</td></tr>
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
