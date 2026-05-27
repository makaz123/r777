import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import pdfIcon from '../assets/icons/pdf-icon.svg';
import excelIcon from '../assets/icons/csv-icon.svg';

/* ============ Main Page ============ */

const AccountStatement = () => {
  const [accountType, setAccountType] = useState('all');
  const [gameType, setGameType] = useState('all');
  const [sportsGameType, setSportsGameType] = useState('');
  const [sportsList, setSportsList] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const getFormattedDateTime = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    let hours = '' + d.getHours();
    let minutes = '' + d.getMinutes();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    if (hours.length < 2) hours = '0' + hours;
    if (minutes.length < 2) minutes = '0' + minutes;

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return getFormattedDateTime(d);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return getFormattedDateTime(d);
  });
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
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

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setSelectedUserName('');
    if (!query) {
      setUserSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await api.get('/get/all-only-user', {
        params: { searchQuery: query, page: 1, limit: 10 },
        withCredentials: true,
      });
      const suggestions = (res.data?.data || [])
        .map((u) => u?.userName)
        .filter(Boolean);
      setUserSuggestions([...new Set(suggestions)]);
      setShowSuggestions(true);
    } catch (error) {
      setUserSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const resetFilters = () => {
    setAccountType('all');
    setGameType('all');
    setSportsGameType('');
    setSportsList('');
    setSearchQuery('');
    setSelectedUserName('');
    const dEnd = new Date();
    dEnd.setHours(23, 59, 59, 999);
    setEndDate(getFormattedDateTime(dEnd));
    const dStart = new Date();
    dStart.setDate(dStart.getDate() - 1);
    dStart.setHours(0, 0, 0, 0);
    setStartDate(getFormattedDateTime(dStart));
    setUserSuggestions([]);
    setShowSuggestions(false);
    setRows([]);
    setPage(1);
    setLimit(25);
    setTotal(0);
    setTotalPages(1);
    setOpeningBalance(0);
    setClosingBalance(0);
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      query.append('page', page);
      query.append('limit', limit);

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
      setTotal(res.data?.pagination?.total || 0);
      setTotalPages(res.data?.pagination?.pages || 1);
      setOpeningBalance(res.data?.openingBalance || 0);
      setClosingBalance(res.data?.closingBalance || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setOpeningBalance(0);
      setClosingBalance(0);
      toast.error(error?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  // Trigger load on component mount or filter changes
  useEffect(() => {
    loadReport();
  }, [page, limit]);

  const renderClientSearch = () =>
    hasClientSearchAccess ? (
      <div className='relative grid' ref={searchRef}>
        <input
          type='text'
          className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 outline-0'
          placeholder='Search by client'
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (userSuggestions.length > 0) setShowSuggestions(true);
          }}
        />
        {showSuggestions && userSuggestions.length > 0 && (
          <ul className='absolute top-full z-20 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg'>
            {userSuggestions.map((name) => (
              <li
                key={name}
                className='cursor-pointer px-2 py-1.5 text-left text-sm hover:bg-black hover:text-white'
                onClick={() => {
                  setSearchQuery(name);
                  setSelectedUserName(name);
                  setShowSuggestions(false);
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    ) : null;

  return (
    <>
      <Navbar />
      <div className='scrollbar-hide h-[calc(100vh-52px)] overflow-y-scroll bg-[#f0f0f5] md:px-[15px] md:py-[13px]'>
        <div className='h-full min-h-[600px] rounded-lg bg-white px-[15px] py-[7px]'>
          <div className='text-[15px] font-bold'>Account Statement Report</div>

          <div className='mt-2 mb-2 grid gap-4 md:mb-6 md:grid-cols-6 md:gap-6'>
            <select
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
            >
              <option value='all'>ALL</option>
              <option value='deposit'>BALANCE REPORT</option>
              <option value='sports'>GAME REPORT</option>
              <option value='settlement'>SETTLEMENT REPORT</option>
              <option value='bonus'>BONUS REPORT</option>
            </select>

            {accountType === 'all' && (
              <>
                <select className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'>
                  <option value=''>ALL</option>
                </select>
                {renderClientSearch()}
              </>
            )}

            {accountType === 'deposit' && (
              <>
                <select className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'>
                  <option value=''>ALL</option>
                </select>
                {renderClientSearch()}
              </>
            )}

            {accountType === 'sports' && (
              <>
                <select
                  className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
                  value={sportsList}
                  onChange={(e) => setSportsList(e.target.value)}
                >
                  <option value='all'>ALL</option>
                  <option value='cricket'>Cricket</option>
                  <option value='tennis'>Tennis</option>
                  <option value='soccer'>Soccer</option>
                  <option value='soccer'>Indian Poker / Live Casino</option>
                  <option value='soccer'>Indian Poker II</option>
                  <option value='soccer'>Pragmatic</option>
                  <option value='soccer'>Evolution</option>
                  <option value='soccer'>Casino II</option>
                  <option value='soccer'>Vivo</option>
                  <option value='soccer'>Bet Games</option>
                  <option value='soccer'>Casino III</option>
                  <option value='soccer'>Spribe</option>
                </select>
                {renderClientSearch()}
              </>
            )}

            {accountType === 'settlement' && (
              <>
                <select className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'>
                  <option value=''>ALL</option>
                </select>
                {renderClientSearch()}
              </>
            )}

            {accountType === 'bonus' && (
              <>
                <select className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'>
                  <option value=''>ALL</option>
                </select>
                {renderClientSearch()}
              </>
            )}

            <input
              type='datetime-local'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
            />

            <input
              type='datetime-local'
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

          <div className='mb-5 flex flex-wrap items-end justify-between gap-5'>
            <div className='flex items-end'>
              <input
                type='text'
                placeholder='Search'
                className='h-fit rounded-sm border border-gray-300 px-2 py-1 outline-0'
              />
              <img src={excelIcon} alt='' className='w-[35px]' />
              <img src={pdfIcon} alt='' className='w-[35px]' />
            </div>
            <table className='w-full md:w-[500px]'>
              <tbody>
                <tr>
                  <td className='w-1/2 border border-gray-200 px-1 py-1 text-center text-[12px]'>
                    Opening Balance
                  </td>
                  <td className='w-1/2 border border-gray-200 px-1 py-1 text-end text-[12px] font-bold text-green-700'>
                    1234567890
                  </td>
                </tr>
                <tr>
                  <td className='w-1/2 border border-gray-200 px-1 py-1 text-center text-[12px]'>
                    Closing Balance
                  </td>
                  <td className='w-1/2 border border-gray-200 px-1 py-1 text-end text-[12px] font-bold text-green-700'>
                    1234567890
                  </td>
                </tr>
              </tbody>
              <tr></tr>
            </table>
            <div>
              <span>Show</span>
              <select
                name='limit'
                id='limit'
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className='mx-2 rounded-sm border border-gray-300 px-2 py-1 text-gray-500 outline-0'
              >
                <option value='25'>25</option>
                <option value='50'>50</option>
                <option value='100'>100</option>
              </select>
              <span>entries</span>
            </div>
          </div>
          <div className='scrollbar-hide overflow-x-scroll'>
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

                  <th className='w-[100px] border-r border-white px-2 py-1 text-right whitespace-nowrap'>
                    Closing
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
                    1000000000000.00
                  </td>
                  <td className='border border-gray-300 px-2 py-1.5 text-right'>
                    -
                  </td>

                  <td className='border border-gray-300 px-2 py-1.5 text-right'>
                    2500000.00
                  </td>

                  <td className='border border-gray-300 px-2 py-1.5'>
                    Settlement
                  </td>

                  <td className='px-2 py-1.5'>Admin → User</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className='mt-4 flex flex-col justify-between gap-3 text-[13px] md:flex-row md:items-center'>
            <div>
              Showing {rows.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
              {rows.length > 0 ? (page - 1) * limit + rows.length : 0} of{' '}
              {total} entries
            </div>
            <div className='flex flex-wrap'>
              <button
                type='button'
                disabled={page === 1}
                onClick={() => setPage(1)}
                className='pgBtn rounded-l-sm px-[13px] py-[6.5px] disabled:opacity-50'
              >
                First
              </button>

              <button
                type='button'
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className='pgBtn px-[12px] py-[6px] disabled:opacity-50'
              >
                Prev
              </button>

              <button className='bg-gradient-to-b from-[#11859c] to-[#181818] px-[13px] py-[6.5px] leading-none text-white'>
                {page}
              </button>

              <button
                type='button'
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className='pgBtn px-[13px] py-[6.5px] disabled:opacity-50'
              >
                Next
              </button>

              <button
                type='button'
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                className='pgBtn rounded-r-sm px-[13px] py-[6.5px] disabled:opacity-50'
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountStatement;
