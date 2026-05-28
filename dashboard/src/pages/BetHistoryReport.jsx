import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import pdfIcon from '../assets/icons/pdf-icon.svg';
import excelIcon from '../assets/icons/csv-icon.svg';
/* ============ Main Page ============ */

const BetHistoryReport = () => {
  const [gameType, setGameType] = useState('all');
  const [initialLoad, setInitialLoad] = useState(true);
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
  const [filteredRows, setFilteredRows] = useState([]);

  // Local filter states
  const [localSport, setLocalSport] = useState('');
  const [localEvent, setLocalEvent] = useState('');
  const [localMarketType, setLocalMarketType] = useState('');
  const [localMarket, setLocalMarket] = useState('');
  const [localStatus, setLocalStatus] = useState('');

  const [loading, setLoading] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
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
    setGameType('all');
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
    setLocalSport('');
    setLocalEvent('');
    setLocalMarketType('');
    setLocalMarket('');
    setLocalStatus('');
    setPage(1);
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      query.append('page', page);
      query.append('limit', limit);

      if (gameType && gameType !== 'all') {
        query.append('selectedGame', gameType);
      }
      if (hasClientSearchAccess && selectedUserName) {
        query.append('userName', selectedUserName);
      }

      if (localSport) query.append('selectedSport', localSport);
      if (localEvent) query.append('selectedEvent', localEvent);
      if (localMarketType) query.append('selectedMarketType', localMarketType);
      if (localMarket) query.append('selectedMarket', localMarket);
      if (localStatus) query.append('selectedStatus', localStatus);

      const res = await api.get(`/get/all-bet-list?${query.toString()}`, {
        withCredentials: true,
      });

      setRows(res.data?.data || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotalEntries(res.data?.totalBets || res.data?.data?.length || 0);
    } catch (error) {
      setRows([]);
      toast.error(error?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialLoad) {
      setInitialLoad(false);
      return;
    }
    loadReport();
  }, [page, limit]);

  useEffect(() => {
    let result = [...rows];

    if (localSport) {
      const sportLower = localSport.toLowerCase();
      result = result.filter((r) =>
        String(r.gameName).toLowerCase().includes(sportLower)
      );
    }
    if (localEvent) {
      const eventLower = localEvent.toLowerCase();
      result = result.filter(
        (r) => String(r.eventName).toLowerCase() === eventLower
      );
    }
    if (localMarketType) {
      const mtLower = localMarketType.toLowerCase();
      result = result.filter(
        (r) => String(r.gameType).toLowerCase() === mtLower
      );
    }
    if (localMarket) {
      const mLower = localMarket.toLowerCase();
      result = result.filter(
        (r) => String(r.marketName).toLowerCase() === mLower
      );
    }
    if (localStatus) {
      result = result.filter((r) => {
        if (localStatus === '1') return r.status === 1;
        if (localStatus === '2') return r.status === 2;
        if (localStatus === '3') return r.status === 3;
        if (localStatus === '0') return r.status === 0;
        return true;
      });
    }

    setFilteredRows(result);
  }, [rows, localSport, localEvent, localMarketType, localMarket, localStatus]);

  // Derive Dropdown Options
  const sportsOptions = [
    'Cricket',
    'Soccer',
    'Tennis',
    'Kabaddi',
    'Election',
    'Horse Racing',
    'Greyhound Racing',
  ];

  const casinoOptions = [
    'Indian Poker/ Live Casino',
    'Indian Poker II',
    'Evolution',
    'Vivo',
    'Betgames',
    'Casino III',
    'Spribe',
    'Mac88',
    'Chicken Road',
    'Rvgames',
    'Ezugi',
  ];

  const eventsOptions = [
    ...new Set(
      rows
        .filter(
          (r) =>
            !localSport ||
            String(r.gameName).toLowerCase().includes(localSport.toLowerCase())
        )
        .map((r) => r.eventName)
        .filter(Boolean)
    ),
  ];
  const marketTypeOptions = [
    ...new Set(
      rows
        .filter(
          (r) =>
            (!localSport ||
              String(r.gameName)
                .toLowerCase()
                .includes(localSport.toLowerCase())) &&
            (!localEvent ||
              String(r.eventName).toLowerCase() === localEvent.toLowerCase())
        )
        .map((r) => r.gameType)
        .filter(Boolean)
    ),
  ];
  const marketOptions = [
    ...new Set(
      rows
        .filter(
          (r) =>
            (!localSport ||
              String(r.gameName)
                .toLowerCase()
                .includes(localSport.toLowerCase())) &&
            (!localEvent ||
              String(r.eventName).toLowerCase() === localEvent.toLowerCase()) &&
            (!localMarketType ||
              String(r.gameType).toLowerCase() ===
                localMarketType.toLowerCase())
        )
        .map((r) => r.marketName)
        .filter(Boolean)
    ),
  ];

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
          <div className='text-[15px] font-bold'>Bet History</div>

          <div className='mt-2 mb-5 grid md:grid-cols-6 gap-4 md:gap-6'>
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

            <select
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
            >
              <option value='all'>Sports</option>
              <option value='casino'>Casino</option>
            </select>

            <select
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
              value={localSport}
              onChange={(e) => {
                setLocalSport(e.target.value);
                setLocalEvent('');
                setLocalMarketType('');
                setLocalMarket('');
              }}
            >
              {gameType === 'casino' ? (
                <>
                  <option value=''>Select Casino</option>
                  {casinoOptions.map((casino) => (
                    <option key={casino} value={casino}>
                      {casino}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value=''>Select Sport</option>
                  {sportsOptions.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </>
              )}
            </select>

            <select
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0 disabled:cursor-not-allowed disabled:bg-gray-200'
              value={localEvent}
              disabled={gameType === 'casino'}
              onChange={(e) => {
                setLocalEvent(e.target.value);
                setLocalMarketType('');
                setLocalMarket('');
              }}
            >
              <option value=''>Select Event</option>
              {eventsOptions.map((event) => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </select>

            <select
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0 disabled:cursor-not-allowed disabled:bg-gray-200'
              value={localMarketType}
              disabled={gameType === 'casino'}
              onChange={(e) => {
                setLocalMarketType(e.target.value);
                setLocalMarket('');
              }}
            >
              <option value=''>Select Market Type</option>
              {marketTypeOptions.map((mType) => (
                <option key={mType} value={mType}>
                  {mType}
                </option>
              ))}
            </select>

            <select
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0 disabled:cursor-not-allowed disabled:bg-gray-200'
              value={localMarket}
              disabled={gameType === 'casino'}
              onChange={(e) => setLocalMarket(e.target.value)}
            >
              <option value=''>Select Market</option>
              {marketOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {renderClientSearch()}

            <select
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
              value={localStatus}
              onChange={(e) => setLocalStatus(e.target.value)}
            >
              <option value=''>Select Status</option>
              <option value='1'>WON</option>
              <option value='2'>LOST</option>
            </select>

            <div className='col-span-1 flex gap-1 outline-0'>
              <button
                type='button'
                onClick={() => {
                  setPage(1);
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

          <div className='mb-2 flex flex-wrap gap-2 items-end justify-between'>
            <div className='flex items-end'>
              <input
                type='text'
                placeholder='Search'
                className='h-fit rounded-sm border border-gray-300 px-2 py-1 outline-0'
              />
              <img src={excelIcon} alt='' className='w-[35px]' />
              <img src={pdfIcon} alt='' className='w-[35px]' />
            </div>

            <div className='ml-auto md:mr-10'>
              <span>Show</span>
              <select
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
          <div className='overflow-x-scroll scrollbar-hide w-full'>
          <table className='w-full table-auto border-collapse border border-gray-300'>
            <thead>
              <tr className='bg-[#016a82] text-white'>
                <th className='border-r border-white px-2 py-1 text-left'>
                  Date & Time
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
                <th className='border-r border-white px-2 py-1 text-right'>
                  PL
                </th>
                <th className='border-r border-white px-2 py-1 text-right'>
                  Status
                </th>
                <th className='px-2 py-1 text-left'>Client IP</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border border-gray-300 text-gray-800 ${row.status === 1 ? 'bg-[#72bbef]' : row.status === 2 ? 'bg-[#faa9ba]' : 'odd:bg-gray-100'}`}
                  >
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px] whitespace-nowrap'>
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                      {row.userName}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                      {row.gameType || '-'}
                    </td>
                    <td
                      className='max-w-[200px] truncate border border-gray-300 px-2 py-1.5 text-[14px]'
                      title={row.eventName}
                    >
                      {row.eventName || '-'}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                      {row.marketName || '-'}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                      {row.teamName || '-'}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px] capitalize'>
                      {row.otype || '-'}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px] font-bold text-black'>
                      {row.fancyScore || '-'}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px] font-bold text-black'>
                      {row.price || row.xValue || 0}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px] font-bold text-black'>
                      {Number(row.betAmount || 0).toFixed(2)}
                    </td>
                    <td
                      className={`border border-gray-300 px-2 py-1.5 text-right text-[14px] font-bold ${row.profitLossChange >= 0 ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {Number(row.profitLossChange || 0).toFixed(2)}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-center text-[12px] font-bold uppercase'>
                      {row.status === 1
                        ? 'WON'
                        : row.status === 2
                          ? 'LOST'
                          : row.status === 3
                            ? 'VOID'
                            : 'DECLARED'}
                    </td>
                    <td className='px-2 py-1.5 text-[13px] text-gray-500'>-</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='13' className='py-4 text-center text-gray-500'>
                    {loading ? 'Loading...' : 'No data available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          {/* Pagination */}
          <div className='mt-4 flex flex-col justify-between gap-3 text-[13px] md:flex-row md:items-center'>
            <div>
              Showing {(page - 1) * limit + (filteredRows.length > 0 ? 1 : 0)}{' '}
              to {Math.min(page * limit, totalEntries)} of {totalEntries}{' '}
              entries
            </div>
            <div className='flex flex-wrap'>
              <button
                disabled={page === 1}
                onClick={() => setPage(1)}
                className='pgBtn rounded-l-sm px-[13px] py-[6.5px] disabled:opacity-50'
              >
                First
              </button>

              <button
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
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className='pgBtn px-[13px] py-[6.5px] disabled:opacity-50'
              >
                Next
              </button>

              <button
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

export default BetHistoryReport;
