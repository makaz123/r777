import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import pdfIcon from '../assets/icons/pdf-icon.svg';
import excelIcon from '../assets/icons/csv-icon.svg';
/* ============ Main Page ============ */

const TransactionReport = () => {
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
      <div className='scrollbar-hide h-[calc(100vh-52px)] overflow-y-scroll bg-[#f0f0f5] md:px-[15px] md:py-[13px]'>
        <div className='h-full min-h-[600px] rounded-lg bg-white px-[15px] py-[7px]'>
          <div className='text-[15px] font-bold'>Transaction Report</div>

          <div className='mt-2 mb-5 grid grid-cols-6 gap-6'>
            {renderClientSearch()}

            <input
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
            />

            <input
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
            />

            <div className='col-span-1 flex gap-1 outline-0'>
              <button
                type='button'
                onClick={loadReport}
                className='cursor-pointer rounded-l border border-[#247c8f] bg-gradient-to-t from-[#5ecbdd] to-[#146578] px-3 py-1.5 text-white'
              >
                Go
              </button>
              <button
                type='button'
                onClick={resetFilters}
                className='cursor-pointer rounded-r border border-[#247c8f] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-3 py-1.5 text-white hover:bg-gradient-to-t'
              >
                Reset
              </button>
            </div>
          </div>

          <div className='mb-5 flex items-end justify-between'>
            <div className='flex items-end'>
              <input
                type='text'
                placeholder='Search'
                className='h-fit rounded-sm border border-gray-300 px-2 py-1 outline-0'
              />
              <img src={excelIcon} alt='' className='w-[35px]' />
              <img src={pdfIcon} alt='' className='w-[35px]' />
            </div>

            <div className='mr-10'>
              <span>Show</span>
              <select
                name=''
                id=''
                className='mx-2 rounded-sm border border-gray-300 px-2 py-1 text-gray-500 outline-0'
              >
                <option value=''>25</option>
                <option value=''>50</option>
                <option value=''>100</option>
              </select>
              <span>entries</span>
            </div>
          </div>

          <table className='w-full table-auto border-collapse border border-gray-300'>
            <thead>
              <tr className='bg-[#016a82] text-white'>
                <th className='border-r border-white px-2 py-1 text-left'>
                  Date & Time
                </th>
                <th className='w-[100px] border-r border-white px-2 py-1 text-right whitespace-nowrap'>
                  Credit
                </th>
                <th className='w-[100px] border-r border-white px-2 py-1 text-right whitespace-nowrap'>
                  Debit
                </th>
                <th className='border-r border-white px-2 py-1 text-left'>
                  Description
                </th>
                <th className='px-2 py-1 text-left'>From → to</th>
              </tr>
            </thead>
            <tbody>
              <tr className='border border-gray-300 odd:bg-gray-100'>
                <td className='border border-gray-300 px-2 py-1.5'>
                  25-05-2026
                </td>
                <td className='border border-gray-300 px-2 py-1.5 text-right'>
                  325000.00
                </td>
                <td className='border border-gray-300 px-2 py-1.5 text-right'>
                  -
                </td>
                <td className='border border-gray-300 px-2 py-1.5'>
                  Settlement
                </td>

                <td className='px-2 py-1.5'>Admin → User</td>
              </tr>
            </tbody>
          </table>

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

export default TransactionReport;
