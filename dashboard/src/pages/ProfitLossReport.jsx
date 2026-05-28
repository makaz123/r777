import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import pdfIcon from '../assets/icons/pdf-icon.svg';
import excelIcon from '../assets/icons/csv-icon.svg';
/* ============ Main Page ============ */

const ProfitLossReport = () => {
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
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return getFormattedDateTime(d);
  });
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ pl: 0, commission: 0, amount: 0 });
  const [hasSearched, setHasSearched] = useState(false);
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
    const dEnd = new Date();
    dEnd.setDate(dEnd.getDate() + 1);
    dEnd.setHours(0, 0, 0, 0);
    setEndDate(getFormattedDateTime(dEnd));
    const dStart = new Date();
    dStart.setDate(dStart.getDate() - 1);
    dStart.setHours(0, 0, 0, 0);
    setStartDate(getFormattedDateTime(dStart));
    setUserSuggestions([]);
    setShowSuggestions(false);
    setRows([]);
    setTotals({ pl: 0, commission: 0, amount: 0 });
    setHasSearched(false);
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
      } else if (hasClientSearchAccess && searchQuery) {
        query.append('searchQuery', searchQuery);
      }

      const res = await api.get(
        `/get/total-profit-loss?${query.toString()}`,
        {
          withCredentials: true,
        }
      );

      setRows(res.data?.data?.report || []);
      setTotals({
        pl: res.data?.data?.totalPL || 0,
        commission: res.data?.data?.totalCommission || 0,
        amount: res.data?.data?.totalAmount || 0,
      });
    } catch (error) {
      setRows([]);
      setTotals({ pl: 0, commission: 0, amount: 0 });
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
          <div className='text-[15px] font-bold'>Profit & Loss</div>

          <div className='mt-2 mb-5 grid grid-cols-6 gap-6'>
            {renderClientSearch()}

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
                onClick={() => {
                  setHasSearched(true);
                  loadReport();
                }}
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

          {hasSearched && (
            <>
              <div className='mb-5 flex items-end justify-between'>
                <div className='flex items-end'>
                  <img src={excelIcon} alt='' className='w-[35px] cursor-pointer' />
                  <img src={pdfIcon} alt='' className='w-[35px] cursor-pointer' />
                </div>
              </div>

              <table className='w-full table-auto border-collapse border border-gray-300'>
                <thead>
                  <tr className='bg-[#016a82] text-white'>
                    <th className='border-r border-white px-2 py-1 text-left'>Sport</th>
                    <th className='border-r border-white px-2 py-1 text-left'>Market Name</th>
                    <th className='border-r border-white px-2 py-1 text-right'>P&L</th>
                    <th className='border-r border-white px-2 py-1 text-right'>Commission</th>
                    <th className='px-2 py-1 text-right'>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows && rows.length > 0 ? (
                    rows.map((row, idx) => (
                      <tr key={idx} className='border border-gray-300 odd:bg-gray-100 text-[14px] font-semibold'>
                        <td className='border border-gray-300 px-2 py-1.5 text-gray-700 font-normal'>{row.sport}</td>
                        <td className='border border-gray-300 px-2 py-1.5 text-gray-700 font-normal'>{row.marketName}</td>
                        <td className={`border border-gray-300 px-2 py-1.5 text-right ${row.pl > 0 ? 'text-green-600' : row.pl < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                          {row.pl.toFixed(2)}
                        </td>
                        <td className={`border border-gray-300 px-2 py-1.5 text-right ${row.commission > 0 ? 'text-green-600' : row.commission < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                          {row.commission.toFixed(2)}
                        </td>
                        <td className={`px-2 py-1.5 text-right ${row.amount > 0 ? 'text-green-600' : row.amount < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                          {row.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-4 text-center text-gray-500 font-semibold">
                        {loading ? 'Loading...' : 'No data available'}
                      </td>
                    </tr>
                  )}
                  {rows && rows.length > 0 && (
                    <tr className='border border-gray-300 bg-gray-50 text-[14px] font-bold'>
                      <td className='border border-gray-300 px-2 py-1.5' colSpan={2}>
                        Total
                      </td>
                      <td className={`border border-gray-300 px-2 py-1.5 text-right ${totals.pl > 0 ? 'text-green-600' : totals.pl < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {totals.pl.toFixed(2)}
                      </td>
                      <td className={`border border-gray-300 px-2 py-1.5 text-right ${totals.commission > 0 ? 'text-green-600' : totals.commission < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {totals.commission.toFixed(2)}
                      </td>
                      <td className={`px-2 py-1.5 text-right ${totals.amount > 0 ? 'text-green-600' : totals.amount < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {totals.amount.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfitLossReport;
