import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import pdfIcon from '../assets/icons/pdf-icon.svg';
import excelIcon from '../assets/icons/csv-icon.svg';
/* ============ Main Page ============ */

const EventLossReport = () => {
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
  const [filteredRows, setFilteredRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [hasSearched, setHasSearched] = useState(false);
  const [totals, setTotals] = useState({ pl: 0, amount: 0, orders: 0 });
  const [displayedTotals, setDisplayedTotals] = useState({ pl: 0, amount: 0, orders: 0 });
  const [selectedSport, setSelectedSport] = useState('all');
  const [localSearch, setLocalSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);
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
    setFilteredRows([]);
    setSelectedSport('all');
    setLocalSearch('');
    setPage(1);
    setLimit(25);
    setTotals({ pl: 0, amount: 0, orders: 0 });
    setDisplayedTotals({ pl: 0, amount: 0, orders: 0 });
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
        `/get/event-profit-loss?${query.toString()}`,
        {
          withCredentials: true,
        }
      );

      const data = res.data?.data?.report || [];
      setRows(data);
      setTotals({
        pl: res.data?.data?.totalPL || 0,
        amount: res.data?.data?.totalAmount || 0,
        orders: res.data?.data?.totalOrders || 0,
      });
    } catch (error) {
      setRows([]);
      setTotals({ pl: 0, amount: 0, orders: 0 });
      toast.error(error?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...rows];
    
    if (selectedSport && selectedSport !== 'all') {
      result = result.filter(row => String(row.sport).toLowerCase() === selectedSport.toLowerCase());
    }
    
    if (localSearch) {
      const lower = localSearch.toLowerCase();
      result = result.filter(row => 
        String(row.event).toLowerCase().includes(lower) || 
        String(row.competition).toLowerCase().includes(lower) ||
        String(row.sport).toLowerCase().includes(lower)
      );
    }
    
    setFilteredRows(result);
    setPage(1);

    setDisplayedTotals({
      pl: result.reduce((sum, r) => sum + r.pl, 0),
      amount: result.reduce((sum, r) => sum + r.totalAmount, 0),
      orders: result.reduce((sum, r) => sum + r.orderCount, 0),
    });
  }, [rows, selectedSport, localSearch]);

  const totalPages = Math.ceil(filteredRows.length / limit) || 1;
  const currentRows = filteredRows.slice((page - 1) * limit, page * limit);

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
          <div className='text-[15px] font-bold'>
            Event Profit & Loss Report
          </div>

          <div className='mt-2 mb-4 grid grid-cols-6 gap-6'>
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
              <div className='mb-2 grid grid-cols-6 items-end gap-6'>
                <input
                  type='text'
                  placeholder='Search'
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 outline-0'
                />
                <select
                  className='col-span-1 h-[30px] rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                >
                  <option value='all'>Select Sport</option>
                  {[...new Set(rows.map(r => r.sport))].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <div className='flex'>
                  <img src={excelIcon} alt='' className='w-[35px] cursor-pointer' />
                  <img src={pdfIcon} alt='' className='w-[35px] cursor-pointer' />
                </div>

                <div></div>
                <div></div>

                <div className='mr-10 ml-auto'>
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

              <table className='w-full table-auto border-collapse border border-gray-300'>
                <thead>
                  <tr className='bg-[#016a82] text-white'>
                    <th className='border-r border-white px-2 py-1 text-left'>SportType</th>
                    <th className='border-r border-white px-2 py-1 text-left'>Competition</th>
                    <th className='border-r border-white px-2 py-1 text-left'>Event</th>
                    <th className='border-r border-white px-2 py-1 text-right'>Order Count</th>
                    <th className='border-r border-white px-2 py-1 text-right'>Total Amount</th>
                    <th className='px-2 py-1 text-right'>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {rows && rows.length > 0 && (
                    <tr className='border border-gray-300 bg-gray-50 text-[14px] font-bold'>
                      <td className='border border-gray-300 px-2 py-1.5 text-right' colSpan={3}>
                        Grand Total (All Records)
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5 text-right text-gray-700'>
                        {totals.orders}
                      </td>
                      <td className={`border border-gray-300 px-2 py-1.5 text-right ${totals.amount > 0 ? 'text-green-600' : totals.amount < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {totals.amount.toFixed(2)}
                      </td>
                      <td className={`px-2 py-1.5 text-right ${totals.pl > 0 ? 'text-green-600' : totals.pl < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {totals.pl.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {currentRows && currentRows.length > 0 ? (
                    currentRows.map((row, idx) => (
                      <tr key={idx} className='border border-gray-300 odd:bg-gray-100 text-[14px] font-semibold'>
                        <td className='border border-gray-300 px-2 py-1.5 text-gray-700 font-normal'>{row.sport}</td>
                        <td className='border border-gray-300 px-2 py-1.5 text-gray-700 font-normal'>{row.competition}</td>
                        <td 
                          className='border border-gray-300 px-2 py-1.5 text-gray-700 font-normal underline cursor-pointer hover:text-[#016a82]'
                          onClick={() => setSelectedEventForModal(row)}
                        >
                          {row.event}
                        </td>
                        <td className='border border-gray-300 px-2 py-1.5 text-right text-gray-700 font-normal'>
                          {row.orderCount}
                        </td>
                        <td className={`border border-gray-300 px-2 py-1.5 text-right ${row.totalAmount > 0 ? 'text-green-600' : row.totalAmount < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                          {row.totalAmount.toFixed(2)}
                        </td>
                        <td className={`px-2 py-1.5 text-right ${row.pl > 0 ? 'text-green-600' : row.pl < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                          {row.pl.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-4 text-center text-gray-500 font-semibold">
                        {loading ? 'Loading...' : 'No data available'}
                      </td>
                    </tr>
                  )}
                  {currentRows && currentRows.length > 0 && (
                    <tr className='border border-gray-300 bg-gray-50 text-[14px] font-bold'>
                      <td className='border border-gray-300 px-2 py-1.5 text-right' colSpan={3}>
                        Total (Display Records)
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5 text-right text-gray-700'>
                        {displayedTotals.orders}
                      </td>
                      <td className={`border border-gray-300 px-2 py-1.5 text-right ${displayedTotals.amount > 0 ? 'text-green-600' : displayedTotals.amount < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {displayedTotals.amount.toFixed(2)}
                      </td>
                      <td className={`px-2 py-1.5 text-right ${displayedTotals.pl > 0 ? 'text-green-600' : displayedTotals.pl < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {displayedTotals.pl.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className='mt-4 flex flex-col justify-between gap-3 text-[13px] md:flex-row md:items-center'>
                <div>
                  Showing {filteredRows.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
                  {filteredRows.length > 0 ? Math.min(page * limit, filteredRows.length) : 0} of{' '}
                  {filteredRows.length} entries
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
            </>
          )}

          {selectedEventForModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-3 border-b bg-[#016a82] text-white">
                  <h3 className="font-bold text-lg">{selectedEventForModal.event}</h3>
                  <button onClick={() => setSelectedEventForModal(null)} className="text-white hover:text-gray-300 text-2xl font-bold leading-none cursor-pointer">
                    &times;
                  </button>
                </div>
                <div className="overflow-y-auto p-4 flex-1">
                  <table className='w-full table-auto border-collapse border border-gray-300'>
                    <thead>
                      <tr className='bg-[#016a82] text-white'>
                        <th className='border-r border-white px-2 py-1 text-left'>Market</th>
                        <th className='border-r border-white px-2 py-1 text-right'>Order Count</th>
                        <th className='border-r border-white px-2 py-1 text-right'>Total Amount</th>
                        <th className='px-2 py-1 text-right'>P/L</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className='border border-gray-300 bg-gray-50 text-[14px] font-bold'>
                        <td className='border border-gray-300 px-2 py-1.5 text-right'>Total</td>
                        <td className='border border-gray-300 px-2 py-1.5 text-right text-gray-700'>
                          {selectedEventForModal.orderCount}
                        </td>
                        <td className={`border border-gray-300 px-2 py-1.5 text-right ${selectedEventForModal.totalAmount > 0 ? 'text-green-600' : selectedEventForModal.totalAmount < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                          {selectedEventForModal.totalAmount.toFixed(2)}
                        </td>
                        <td className={`px-2 py-1.5 text-right ${selectedEventForModal.pl > 0 ? 'text-green-600' : selectedEventForModal.pl < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                          {selectedEventForModal.pl.toFixed(2)}
                        </td>
                      </tr>
                      {selectedEventForModal.markets && selectedEventForModal.markets.map((marketRow, idx) => (
                        <tr key={idx} className='border border-gray-300 odd:bg-gray-100 text-[14px]'>
                          <td className='border border-gray-300 px-2 py-1.5 text-gray-700'>{marketRow.market}</td>
                          <td className='border border-gray-300 px-2 py-1.5 text-right text-gray-700'>
                            {marketRow.orderCount}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1.5 text-right ${marketRow.totalAmount > 0 ? 'text-green-600' : marketRow.totalAmount < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                            {marketRow.totalAmount.toFixed(2)}
                          </td>
                          <td className={`px-2 py-1.5 text-right ${marketRow.pl > 0 ? 'text-green-600' : marketRow.pl < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                            {marketRow.pl.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default EventLossReport;
