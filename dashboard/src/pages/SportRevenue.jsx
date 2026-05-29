import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import pdfIcon from '../assets/icons/pdf-icon.svg';
import excelIcon from '../assets/icons/csv-icon.svg';
/* ============ Main Page ============ */

const SportRevenue = () => {
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

  const data = [
    {
      user: 'pradeep1110',
      distributor: 'mike999',
      sports: {
        cricket: {
          matchOdds: 0,
          bookmaker: 0,
          fancy: -2250,
          line: 0,
          lottery: 0,
          commission: 0,
          total: -2250,
          bets: 4,
        },
  
        soccer: {
          matchOdds: 0,
          bookmaker: 0,
          overUnder: 0,
          lottery: 0,
          commission: 0,
          total: 0,
          bets: 0,
        },
  
        tennis: {
          matchOdds: 500,
          bookmaker: 200,
          total: 700,
          bets: 2,
        },
      },
  
      totalPl: 4487.5,
      myShare: -2916.88,
    },
    {
      user: 'pradeep1110',
      distributor: 'mike999',
      sports: {
        cricket: {
          matchOdds: 0,
          bookmaker: 0,
          fancy: -2250,
          line: 0,
          lottery: 0,
          commission: 0,
          total: -2250,
          bets: 4,
        },
  
        soccer: {
          matchOdds: 0,
          bookmaker: 0,
          overUnder: 0,
          lottery: 0,
          commission: 0,
          total: 0,
          bets: 0,
        },
  
        tennis: {
          matchOdds: 500,
          bookmaker: 200,
          total: 700,
          bets: 2,
        },
      },
  
      totalPl: 4487.5,
      myShare: -2916.88,
    },
  ];

  const SPORTS_CONFIG = {
    cricket: [
      { key: 'matchOdds', label: 'MATCH ODDS' },
      { key: 'bookmaker', label: 'BOOKMAKER' },
      { key: 'fancy', label: 'FANCY' },
      { key: 'line', label: 'LINE' },
      { key: 'lottery', label: 'LOTTERY' },
      { key: 'commission', label: 'Commission' },
      { key: 'total', label: 'Total' },
      { key: 'bets', label: 'Bets' },
    ],
  
    soccer: [
      { key: 'matchOdds', label: 'MATCH ODDS' },
      { key: 'bookmaker', label: 'BOOKMAKER' },
      { key: 'overUnder', label: 'OVER UNDER' },
      { key: 'lottery', label: 'LOTTERY' },
      { key: 'commission', label: 'Commission' },
      { key: 'total', label: 'Total' },
      { key: 'bets', label: 'Bets' },
    ],
  
    tennis: [
      { key: 'matchOdds', label: 'MATCH ODDS' },
      { key: 'bookmaker', label: 'BOOKMAKER' },
      { key: 'total', label: 'Total' },
      { key: 'bets', label: 'Bets' },
    ],
  };

  return (
    <>
      <Navbar />
      <div className='scrollbar-hide pb-10 md:px-[15px] md:pt-[13px]'>
        <div className='min-h-[600px] rounded-lg bg-white px-[15px] py-[7px]'>
          <div className='text-[15px] font-bold'>Sports Revenue</div>
          <div className='mt-2 mb-6 grid gap-x-6 gap-y-4 md:grid-cols-6'>
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
          <div className='mb-2 flex flex-wrap items-end justify-between gap-2'>
            <div className='flex items-end'>
              <input
                type='text'
                placeholder='Search'
                className='h-fit rounded-sm border border-gray-300 px-2 py-1 outline-0'
              />
              <img src={excelIcon} alt='' className='w-[35px]' />
              <img src={pdfIcon} alt='' className='w-[35px]' />
            </div>

            <div className='ml-auto text-[14px]'>
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
          <div className='scrollbar-hide w-full overflow-x-scroll'>
            <table className='min-w-[1600px] w-full border-collapse text-sm'>
              {/* Top Header */}
              <thead>
                <tr className='bg-[#006d84] text-white'>
                  <th className='border border-gray-300 px-3 py-1'></th>
                  <th className='border border-gray-300 px-3 py-1'></th>

                  {Object.entries(SPORTS_CONFIG).map(([sport, columns]) => (
                    <th
                      key={sport}
                      colSpan={columns.length}
                      className='border border-gray-300 px-3 py-1 text-center'
                    >
                      {sport.toUpperCase()}
                    </th>
                  ))}

                  <th className='border border-gray-300 px-3 py-1'></th>
                  <th className='border border-gray-300 px-3 py-1'></th>
                </tr>

                <tr className='bg-[#006d84] text-white'>
                  <th className='border border-gray-300 text-left px-3 py-1'>User</th>
                  <th className='border border-gray-300 text-left px-3 py-1'>Distributor</th>

                  {Object.entries(SPORTS_CONFIG).map(([sport, columns]) =>
                    columns.map((column) => (
                      <th
                        key={`${sport}-${column.key}`}
                        className='border border-gray-300 px-3 py-1 whitespace-nowrap'
                      >
                        {column.label}
                      </th>
                    ))
                  )}

                  <th className='border border-gray-300 text-left px-3 py-1 whitespace-nowrap'>Total P&L</th>
                  <th className='border border-gray-300 text-left px-3 py-1 whitespace-nowrap'>My Share</th>
                </tr>
              </thead>

              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className='odd:bg-gray-100'>
                    <td className='border border-gray-300 px-3 py-1'>
                      {row.user}
                    </td>

                    <td className='border border-gray-300 px-3 py-1'>
                      {row.distributor}
                    </td>

                    {Object.entries(SPORTS_CONFIG).map(([sport, columns]) =>
                      columns.map((column) => (
                        <td
                          key={`${sport}-${column.key}`}
                          className='border border-gray-300 px-3 py-1 text-right'
                        >
                          {row.sports?.[sport]?.[column.key] ?? 0}
                        </td>
                      ))
                    )}

                    <td className='border border-gray-300 px-3 py-1 text-right'>
                      {row.totalPl}
                    </td>

                    <td className='border border-gray-300 px-3 py-1 text-right'>
                      {row.myShare}
                    </td>
                  </tr>
                ))}
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

export default SportRevenue;
