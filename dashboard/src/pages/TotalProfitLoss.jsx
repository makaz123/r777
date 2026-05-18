import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { toast } from 'react-toastify';

const TotalProfitLoss = () => {
  const [gameType, setGameType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [sportsReport, setSportsReport] = useState([]);
  const [casinoReport, setCasinoReport] = useState([]);
  const [sportsTotal, setSportsTotal] = useState(0);
  const [casinoTotal, setCasinoTotal] = useState(0);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const formatNumber = (value) => Number(value || 0).toFixed(2);

  const loadReport = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (searchQuery) query.append('searchQuery', searchQuery);
      if (selectedUserName) query.append('userName', selectedUserName);
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);

      const res = await api.get(`/get/total-profit-loss?${query.toString()}`, {
        withCredentials: true,
      });

      const data = res.data?.data || {};
      setSportsReport(data.sportsReport || []);
      setCasinoReport(data.casinoReport || []);
      setSportsTotal(Number(data.sportsTotal || 0));
      setCasinoTotal(Number(data.casinoTotal || 0));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedUserName('');
    setStartDate('');
    setEndDate('');
    setGameType('all');
    setSportsReport([]);
    setCasinoReport([]);
    setSportsTotal(0);
    setCasinoTotal(0);
  };

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
  }, [searchQuery]);

  return (
    <>
      <Navbar />
      <div className='px-[15px] md:px-7.5'>
        <div className='py-2 text-[22px]'>Total Profit Loss</div>

        <div className='mt-3 mb-6 flex items-end gap-2'>
          <div className='relative grid' ref={searchRef}>
            <span>Search By Client Name</span>
            <input
              type='type'
              className='mt-1 min-w-[200px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
              placeholder='Select Option'
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
              <div className='absolute top-[62px] z-20 max-h-56 min-w-[200px] overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg'>
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
          <div className='grid'>
            <span>From Date</span>
            <input
              type='date'
              className='mt-1 min-w-[200px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className='grid'>
            <span>To Date</span>
            <input
              type='date'
              className='mt-1 min-w-[200px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className='grid'>
            <span className='text-sm'>Type</span>
            <select
              className='mt-1 min-w-[280px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
            >
              <option value='all'>All</option>
              <option value='sports'>Sports Report</option>
              <option value='casino'>Casino Report</option>
            </select>
          </div>

          <button
            type='button'
            onClick={loadReport}
            className='ml-1 cursor-pointer rounded bg-[#0088cc] px-3 py-1.5 text-white'
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
          <button
            type='button'
            onClick={resetFilters}
            className='ml-1 cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-black'
          >
            Reset
          </button>
        </div>

        {(gameType === 'all' || gameType === 'sports') && (
          <div className='mt-2 mb-6'>
            <div className='pb-1 text-[14px]'>Sports Report</div>
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse border border-gray-300'>
                <thead>
                  <tr>
                    <th className='border border-gray-200/60 text-left'>
                      <div className='relative flex items-center justify-start px-2 text-[13px]'>
                        Event Name
                      </div>
                    </th>
                    <th className='border border-gray-200/60 text-left'>
                      <div className='relative flex items-center justify-start px-2 text-[13px]'>
                        Game Type
                      </div>
                    </th>
                    <th className='border border-gray-200/60 text-left'>
                      <div className='relative flex items-center justify-end px-2 text-[13px]'>
                        Opening
                      </div>
                    </th>
                    <th className='border border-gray-200/60 text-left'>
                      <div className='relative flex items-center justify-end px-2 text-[13px]'>
                        Closing
                      </div>
                    </th>
                    <th className='border border-gray-200/60 text-left'>
                      <div className='relative flex items-center justify-end px-2 text-[13px]'>
                        Profit Loss
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sportsReport.map((row, index) => (
                    <tr key={`${row.eventName}-${row.gameType}-${index}`}>
                      <td className='border border-gray-200/60 text-left'>
                        <div className='relative flex items-center justify-start px-2 text-[13px]'>
                          {row.eventName}
                        </div>
                      </td>
                      <td className='border border-gray-200/60 text-left'>
                        <div className='relative flex items-center justify-start px-2 text-[13px]'>
                          {row.gameType}
                        </div>
                      </td>
                      <td className='border border-gray-200/60 text-left'>
                        <div className='relative flex items-center justify-end px-2 text-[13px]'>
                          {formatNumber(row.opening)}
                        </div>
                      </td>
                      <td className='border border-gray-200/60 text-left'>
                        <div className='relative flex items-center justify-end px-2 text-[13px]'>
                          {formatNumber(row.closing)}
                        </div>
                      </td>
                      <td className='border border-gray-200/60 text-left'>
                        <div className='relative flex items-center justify-end px-2 text-[13px]'>
                          {formatNumber(row.profitLoss)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td
                      className='border border-gray-200/60 text-left'
                      colSpan={4}
                    >
                      <div className='relative flex items-center justify-end px-2 text-[13px] font-bold'>
                        Total Profit/Loss
                      </div>
                    </td>
                    <td className='border border-gray-200/60 text-left'>
                      <div className='relative flex items-center justify-end px-2 text-[13px]'>
                        {formatNumber(sportsTotal)}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(gameType === 'all' || gameType === 'casino') && (
          <div>
            <div className='pb-1 text-[14px]'>Casino Report</div>
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse border border-gray-300'>
                <thead>
                  <tr>
                    <th className='border border-gray-200/60 text-left'>
                      <div className='relative flex items-center justify-start px-2 text-[13px]'>
                        Event Name
                      </div>
                    </th>
                    <th className='border border-gray-200/60 text-left'>
                      <div className='relative flex items-center justify-end px-2 text-[13px]'>
                        Opening
                      </div>
                    </th>
                    <th className='border border-gray-200/60 text-left'>
                      <div className='relative flex items-center justify-end px-2 text-[13px]'>
                        Closing
                      </div>
                    </th>
                    <th className='border border-gray-200/60 text-left'>
                      <div className='relative flex items-center justify-end px-2 text-[13px]'>
                        Profit Loss
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {casinoReport.map((row, index) => (
                    <tr key={`${row.eventName}-${index}`}>
                      <td className='border border-gray-200/60 text-left'>
                        <div className='relative flex items-center justify-start px-2 text-[13px]'>
                          {row.eventName}
                        </div>
                      </td>
                      <td className='border border-gray-200/60 text-left'>
                        <div className='relative flex items-center justify-end px-2 text-[13px]'>
                          {formatNumber(row.opening)}
                        </div>
                      </td>
                      <td className='border border-gray-200/60 text-left'>
                        <div className='relative flex items-center justify-end px-2 text-[13px]'>
                          {formatNumber(row.closing)}
                        </div>
                      </td>
                      <td className='border border-gray-200/60 text-left'>
                        <div className='relative flex items-center justify-end px-2 text-[13px]'>
                          {formatNumber(row.profitLoss)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td
                      className='border border-gray-200/60 text-left'
                      colSpan={3}
                    >
                      <div className='relative flex items-center justify-end px-2 text-[13px] font-bold'>
                        Total Profit/Loss
                      </div>
                    </td>
                    <td className='border border-gray-200/60 text-left'>
                      <div className='relative flex items-center justify-end px-2 text-[13px]'>
                        {formatNumber(casinoTotal)}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TotalProfitLoss;
