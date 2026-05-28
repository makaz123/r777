import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import pdfIcon from '../assets/icons/pdf-icon.svg';
import excelIcon from '../assets/icons/csv-icon.svg';
/* ============ Main Page ============ */

const LiveBetsReport = () => {
  const [accountType, setAccountType] = useState('all');
  const [gameType, setGameType] = useState('all');
  const [sportsGameType, setSportsGameType] = useState('');
  const [sportsList, setSportsList] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const { userInfo } = useSelector((state) => state.auth);

  const allowedProfileRoles = ['admin', 'master', 'superadmin', 'supperadmin'];
  const hasClientSearchAccess = allowedProfileRoles.includes(userInfo?.role);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!hasClientSearchAccess) return;

    if (searchQuery.trim().length < 3) {
      setUserSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(
          `/get/all-only-user?page=1&limit=10&searchQuery=${encodeURIComponent(searchQuery.trim())}`,
          { withCredentials: true }
        );
        const suggestions = (res.data?.data || [])
          .map((u) => u?.userName)
          .filter(Boolean);
        setUserSuggestions([...new Set(suggestions)]);
        setShowSuggestions(true);
      } catch (error) {
        setUserSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, hasClientSearchAccess]);

  const resetFilters = () => {
    setAccountType('all');
    setGameType('all');
    setSportsGameType('');
    setSportsList('');
    setSearchQuery('');
    setSelectedUserName('');
    setStartDate('');
    setEndDate('');
    setUserSuggestions([]);
    setShowSuggestions(false);
    setRows([]);
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);

      if (accountType === 'casino' || accountType === 'sports') {
        query.append('gameType', accountType);
      } else if (gameType && gameType !== 'all') {
        query.append('gameType', gameType);
      }

      if (sportsGameType) query.append('sportsGameType', sportsGameType);
      if (sportsList) query.append('sportsName', sportsList);
      if (hasClientSearchAccess && selectedUserName) {
        query.append('userName', selectedUserName);
      }

      query.append('accountType', accountType);
      const res = await api.get(
        `/account-statement/history?${query.toString()}`,
        {
          withCredentials: true,
        }
      );

      setRows(res.data?.data || []);
    } catch (error) {
      setRows([]);
      toast.error(error?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const renderClientSearch = () =>
    hasClientSearchAccess ? (
      <div className='relative grid' ref={searchRef}>
        <input
          type='type'
          className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 outline-0'
          placeholder='Search by client'
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedUserName('');
          }}
          onFocus={() =>
            searchQuery.trim().length >= 3 &&
            userSuggestions.length > 0 &&
            setShowSuggestions(true)
          }
        />
        {showSuggestions && userSuggestions.length > 0 && (
          <div className='absolute top-full z-20 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg'>
            {userSuggestions.map((name) => (
              <button
                key={name}
                type='button'
                onClick={() => {
                  setSearchQuery(name);
                  setSelectedUserName(name);
                  setShowSuggestions(false);
                }}
                className='block w-full cursor-pointer px-2 py-1.5 text-left text-sm hover:bg-gray-100'
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      <Navbar />
      <div className='scrollbar-hide md:px-[15px] md:pt-[13px] pb-10'>
        <div className='min-h-[600px] rounded-lg bg-white px-[15px] py-[7px]'>
          <div className='text-[15px] font-bold'>Live Bets</div>

          <div className='mt-2 mb-5 grid md:grid-cols-6 md:gap-x-6 gap-y-4'>
            <select
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
            >
              <option value=''>Select Sport</option>
              <option value=''>Cricket</option>
              <option value=''>Soccer</option>
              <option value=''>Tennis</option>
            </select>

            <select className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'>
              <option value=''>Select Event</option>
            </select>

            <select className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'>
              <option value=''>Select Market Type</option>
            </select>

            <select className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'>
              <option value=''>Select Market</option>
            </select>

            <input
              type='text'
              placeholder='Amount From'
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 outline-0'
            />

            <input
              type='text'
              placeholder='Amount To'
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 outline-0'
            />

            {renderClientSearch()}

            <div className='flex gap-1'>
              <div className='flex items-center justify-center rounded-l bg-green-400 px-3.5 py-2 text-[15px] text-white'>
                Start
              </div>
              <div className='flex items-center justify-center bg-red-600 px-3.5 py-2 text-[15px] text-white'>
                Stop
              </div>
              <div className='flex items-center justify-center rounded-r border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-3.5 py-2 text-[15px] text-white hover:bg-gradient-to-t'>
                Reset
              </div>
            </div>
          </div>
          <div className='overflow-x-scroll scrollbar-hide w-full'>
          <table className='w-full table-auto border-collapse border border-gray-300'>
            <thead>
              <tr className='bg-[#016a82] text-white'>
                <th className='border-r border-white px-2 py-1 text-left'>
                  Time
                </th>
                <th className='border-r border-white px-2 py-1 text-left'>
                  User
                </th>
                <th className='border-r border-white px-2 py-1 text-left'>
                  Competition
                </th>
                <th className='border-r border-white px-2 py-1 text-left'>
                  Event
                </th>
                <th className='border-r border-white px-2 py-1 text-left'>
                  Market
                </th>
                <th className='border-r border-white px-2 py-1 text-left'>
                  Runner
                </th>
                <th className='border-r border-white px-2 py-1 text-left'>
                  Side
                </th>
                <th className='border-r border-white px-2 py-1 text-right'>
                  Line
                </th>
                <th className='border-r border-white px-2 py-1 text-right'>
                  Rate
                </th>
                <th className='border-r border-white px-2 py-1 text-right'>
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              <tr className='border border-gray-300 bg-[#faa9ba] text-gray-800'>
                <td className='border border-gray-300 px-2 py-1.5'>
                  25/5/2026, 4:10:55 pm
                </td>
                <td className='border border-gray-300 px-2 py-1.5'>lalli123</td>
                <td className='border border-gray-300 px-2 py-1.5'>
                  Women's T20 Blast Div 2
                </td>
                <td className='border border-gray-300 px-2 py-1.5'>
                  Kent W v Sussex Sharks W - 25 May 26
                </td>
                <td className='border border-gray-300 px-2 py-1.5'>
                  Bookmaker 0 Commission
                </td>
                <td className='border border-gray-300 px-2 py-1.5'>
                  Sussex Sharks W
                </td>
                <td className='border border-gray-300 px-2 py-1.5'>Lay</td>
                <td className='border border-gray-300 px-2 py-1.5 text-right font-bold text-black'>
                  120
                </td>
                <td className='border border-gray-300 px-2 py-1.5 text-right font-bold text-black'>
                  84
                </td>
                <td className='border border-gray-300 px-2 py-1.5 text-right font-bold text-black'>
                  100.00
                </td>
              </tr>
              <tr className='border border-gray-300 bg-[#72bbef] text-gray-800'>
                <td className='border border-gray-300 px-2 py-1.5'>
                  25/5/2026, 4:10:55 pm
                </td>
                <td className='border border-gray-300 px-2 py-1.5'>lalli123</td>
                <td className='border border-gray-300 px-2 py-1.5'>
                  Women's T20 Blast Div 2
                </td>
                <td className='border border-gray-300 px-2 py-1.5'>
                  Kent W v Sussex Sharks W - 25 May 26
                </td>
                <td className='border border-gray-300 px-2 py-1.5'>
                  Bookmaker 0 Commission
                </td>
                <td className='border border-gray-300 px-2 py-1.5'>
                  Sussex Sharks W
                </td>
                <td className='border border-gray-300 px-2 py-1.5'>Back</td>
                <td className='border border-gray-300 px-2 py-1.5 text-right font-bold text-black'>
                  120
                </td>
                <td className='border border-gray-300 px-2 py-1.5 text-right font-bold text-black'>
                  84
                </td>
                <td className='border border-gray-300 px-2 py-1.5 text-right font-bold text-black'>
                  100.00
                </td>
              </tr>
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          <div className='mt-4 flex flex-col justify-between gap-3 text-[13px] md:flex-row md:items-center'>
            <div>Showing 1 to 2 of 20 entries</div>
            <div className='flex flex-wrap'>
              {/* First Button */}
              <button className='pgBtn rounded-l-sm px-[13px] py-[6.5px]'>
                First
              </button>

              {/* Previous Button */}
              <button className='pgBtn px-[12px] py-[6px]'>Prev</button>
              {/* Page Numbers */}
              <button className='bg-gradient-to-b from-[#11859c] to-[#181818] px-[13px] py-[6.5px] leading-none text-white'>
                1
              </button>

              {/* Next Button */}
              <button className='pgBtn px-[13px] py-[6.5px]'>Next</button>

              {/* Last Button */}
              <button className='pgBtn rounded-r-sm px-[13px] py-[6.5px]'>
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LiveBetsReport;
