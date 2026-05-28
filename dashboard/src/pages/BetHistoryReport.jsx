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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
    setStartDate('');
    setEndDate('');
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

      const res = await api.get(
        `/get/all-bet-list?${query.toString()}`,
        {
          withCredentials: true,
        }
      );

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
    loadReport();
  }, [page, limit]);

  useEffect(() => {
    let result = [...rows];
    
    if (localSport) {
      result = result.filter(r => r.gameName === localSport);
    }
    if (localEvent) {
      result = result.filter(r => r.eventName === localEvent);
    }
    if (localMarketType) {
      result = result.filter(r => r.gameType === localMarketType);
    }
    if (localMarket) {
      result = result.filter(r => r.marketName === localMarket);
    }
    if (localStatus) {
      result = result.filter(r => {
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
  const sportsOptions = [...new Set(rows.map(r => r.gameName).filter(Boolean))];
  const eventsOptions = [...new Set(rows.filter(r => !localSport || r.gameName === localSport).map(r => r.eventName).filter(Boolean))];
  const marketTypeOptions = [...new Set(rows.filter(r => (!localSport || r.gameName === localSport) && (!localEvent || r.eventName === localEvent)).map(r => r.gameType).filter(Boolean))];
  const marketOptions = [...new Set(rows.filter(r => (!localSport || r.gameName === localSport) && (!localEvent || r.eventName === localEvent) && (!localMarketType || r.gameType === localMarketType)).map(r => r.marketName).filter(Boolean))];

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
          <div className='text-[15px] font-bold'>Bet History</div>

          <div className='mt-2 mb-5 grid grid-cols-6 gap-6'>
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
              <option value=''>Select Sport</option>
              {sportsOptions.map(sport => <option key={sport} value={sport}>{sport}</option>)}
            </select>

            <select
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
              value={localEvent}
              onChange={(e) => {
                setLocalEvent(e.target.value);
                setLocalMarketType('');
                setLocalMarket('');
              }}
            >
              <option value=''>Select Event</option>
              {eventsOptions.map(event => <option key={event} value={event}>{event}</option>)}
            </select>

            <select
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
              value={localMarketType}
              onChange={(e) => {
                setLocalMarketType(e.target.value);
                setLocalMarket('');
              }}
            >
              <option value=''>Select Market Type</option>
              {marketTypeOptions.map(mType => <option key={mType} value={mType}>{mType}</option>)}
            </select>

            <select
              className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
              value={localMarket}
              onChange={(e) => setLocalMarket(e.target.value)}
            >
              <option value=''>Select Market</option>
              {marketOptions.map(m => <option key={m} value={m}>{m}</option>)}
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
              <option value='3'>VOID</option>
              <option value='0'>UNSETTLED</option>
            </select>

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

          <div className='mb-2 flex items-end justify-between'>
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
                  <tr key={idx} className={`border border-gray-300 text-gray-800 ${row.status === 1 ? 'bg-[#72bbef]' : row.status === 2 ? 'bg-[#faa9ba]' : 'odd:bg-gray-100'}`}>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px] whitespace-nowrap'>
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>{row.userName}</td>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>{row.gameType || '-'}</td>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px] max-w-[200px] truncate' title={row.eventName}>{row.eventName || '-'}</td>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>{row.marketName || '-'}</td>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>{row.teamName || '-'}</td>
                    <td className='border border-gray-300 px-2 py-1.5 text-[14px] capitalize'>{row.otype || '-'}</td>
                    <td className='border border-gray-300 px-2 py-1.5 text-right font-bold text-black text-[14px]'>
                      {row.fancyScore || '-'}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-right font-bold text-black text-[14px]'>
                      {row.price || row.xValue || 0}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-right font-bold text-black text-[14px]'>
                      {Number(row.betAmount || 0).toFixed(2)}
                    </td>
                    <td className={`border border-gray-300 px-2 py-1.5 text-right font-bold text-[14px] ${row.profitLossChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {Number(row.profitLossChange || 0).toFixed(2)}
                    </td>
                    <td className='border border-gray-300 px-2 py-1.5 text-center uppercase text-[12px] font-bold'>
                      {row.status === 1 ? 'WON' : row.status === 2 ? 'LOST' : row.status === 3 ? 'VOID' : 'UNSETTLED'}
                    </td>
                    <td className='px-2 py-1.5 text-[13px] text-gray-500'>
                       -
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="13" className="text-center py-4 text-gray-500">{loading ? 'Loading...' : 'No data available'}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {/* Pagination */}
          <div className='mt-4 flex flex-col justify-between gap-3 text-[13px] md:flex-row md:items-center'>
            <div>Showing {(page - 1) * limit + (filteredRows.length > 0 ? 1 : 0)} to {Math.min(page * limit, totalEntries)} of {totalEntries} entries</div>
            <div className='flex flex-wrap'>
              <button disabled={page === 1} onClick={() => setPage(1)} className='pgBtn rounded-l-sm px-[13px] py-[6.5px] disabled:opacity-50'>
                First
              </button>

              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className='pgBtn px-[12px] py-[6px] disabled:opacity-50'>Prev</button>
              
              <button className='bg-gradient-to-b from-[#11859c] to-[#181818] px-[13px] py-[6.5px] leading-none text-white'>
                {page}
              </button>

              <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className='pgBtn px-[13px] py-[6.5px] disabled:opacity-50'>Next</button>

              <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className='pgBtn rounded-r-sm px-[13px] py-[6.5px] disabled:opacity-50'>
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
