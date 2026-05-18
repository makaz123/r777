import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

const CASINOS = [
  { slug: 'teen20', name: '20-20 Teenpatti' },
  { slug: 'teen', name: 'Teenpatti 1-day' },
  { slug: 'teen20c', name: '20-20 Teenpatti C' },
  { slug: 'teen20v1', name: '20-20 Teenpatti VIP1' },
  { slug: 'teen20b', name: '20-20 Teenpatti B' },
  { slug: 'teen41', name: 'Queen Top Open Teenpatti' },
  { slug: 'teen42', name: 'Jack Top Open Teenpatti' },
  { slug: 'teen32', name: 'Instant Teenpatti 2.0' },
  { slug: 'teen33', name: 'Instant Teenpatti 3.0' },
  { slug: 'teen6', name: 'Teenpatti 6' },
  { slug: 'teen62', name: 'V VIP Teenpatti 1-day' },
  { slug: 'teen8', name: 'Teenpatti Open' },
  { slug: 'teen9', name: 'Teenpatti Test' },
  { slug: 'teensin', name: 'Teenpatti Sin' },
  { slug: 'teenmuf', name: 'Teenpatti Muflis' },
  { slug: 'teenjoker', name: 'Teenpatti Joker' },
  { slug: 'poison', name: 'Teenpatti Poison One Day' },
  { slug: 'poison20', name: 'Teenpatti Poison 20-20' },
  { slug: 'joker20', name: 'Teenpatti Joker 20-20' },
  { slug: 'patti2', name: '2 Card Teenpatti' },
  { slug: 'poker', name: 'Poker 1-Day' },
  { slug: 'poker20', name: '20-20 Poker' },
  { slug: 'poker6', name: 'Poker 6 Players' },
  { slug: 'baccarat', name: 'Baccarat' },
  { slug: 'baccarat2', name: 'Baccarat 2' },
  { slug: 'dt20', name: '20-20 Dragon Tiger' },
  { slug: 'dt6', name: '1 Day Dragon Tiger' },
  { slug: 'dt202', name: '20-20 Dragon Tiger 2' },
  { slug: 'dtl20', name: '20-20 D T L' },
  { slug: 'card32', name: '32 Cards A' },
  { slug: 'card32eu', name: '32 Cards B' },
  { slug: 'lucky7', name: 'Lucky 7 - A' },
  { slug: 'lucky7eu', name: 'Lucky 7 - B' },
  { slug: 'lucky7eu2', name: 'Lucky 7 - C' },
  { slug: 'ab20', name: 'Andar Bahar' },
  { slug: 'abj', name: 'Andar Bahar 2' },
  { slug: '3cardj', name: '3 Cards Judgement' },
];

/* ============ Main Page ============ */

const AccountStatement = () => {
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
    ) : null;

  return (
    <>
      <Navbar />
      <div className='px-[15px] md:px-7.5'>
        <div className='py-2 text-[22px]'>Account Statement</div>

        <div className='mt-3 mb-6 flex flex-wrap items-end gap-2'>
          <div className='grid'>
            <span className='text-sm'>Account Type</span>
            <select
              className='mt-1 min-w-[280px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
            >
              <option value='all'>All</option>
              <option value='deposit'>Deposit/Withdraw Report</option>
              <option value='sports'>Sports Report</option>
              <option value='casino'>Casino Report</option>
            </select>
          </div>

          {accountType === 'all' && (
            <>
              <div className='grid'>
                <span className='text-sm'>Game Name</span>
                <select className='mt-1 min-w-[280px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'>
                  <option value=''>All</option>
                </select>
              </div>
              <div className='grid'>
                <span className='text-sm'>Game Type</span>
                <select
                  className='mt-1 min-w-[280px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value)}
                >
                  <option value='all'>All</option>
                  <option value='sports'>Sports</option>
                  <option value='casino'>Casino</option>
                </select>
              </div>
              {renderClientSearch()}
            </>
          )}

          {accountType === 'deposit' && (
            <>
              <div className='grid'>
                <span className='text-sm'>Game Name</span>
                <select className='mt-1 min-w-[280px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'>
                  <option value=''>All</option>
                  <option value='upper'>Upper</option>
                  <option value='down'>Down</option>
                </select>
              </div>
              {renderClientSearch()}
            </>
          )}

          {accountType === 'sports' && (
            <>
              <div className='grid'>
                <span className='text-sm'>Sports List</span>
                <select
                  className='mt-1 min-w-[280px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
                  value={sportsList}
                  onChange={(e) => setSportsList(e.target.value)}
                >
                  <option value=''>All</option>
                  <option value='cricket'>Cricket</option>
                  <option value='tennis'>Tennis</option>
                  <option value='soccer'>Soccer</option>
                </select>
              </div>
              <div className='grid'>
                <span className='text-sm'>Game Type</span>
                <select
                  className='mt-1 min-w-[280px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
                  value={sportsGameType}
                  onChange={(e) => setSportsGameType(e.target.value)}
                >
                  <option value=''>All</option>
                  <option value='matchOdds'>Match Odds</option>
                  <option value='fancy'>Fancy</option>
                </select>
              </div>
              {renderClientSearch()}
            </>
          )}

          {accountType === 'casino' && (
            <>
              <div className='grid'>
                <span className='text-sm'>Casino List</span>
                <select className='mt-1 min-w-[280px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'>
                  <option value=''>Select Casino</option>
                  {CASINOS.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {renderClientSearch()}
            </>
          )}

          <div className='grid'>
            <span className='text-sm'>From</span>
            <input
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className='mt-1 min-w-[180px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
            />
          </div>

          <div className='grid'>
            <span className='text-sm'>To</span>
            <input
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className='mt-1 min-w-[180px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
            />
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

        <div>
          <table className='w-full border-collapse border border-gray-300'>
            <thead>
              <tr>
                <th className='w-1/8 py-2 text-left'>
                  <div className='px-2 text-[13px]'>Date</div>
                </th>
                <th className='w-1/8 py-2 text-right'>
                  <div className='px-2 text-[13px]'>Credit</div>
                </th>
                <th className='w-1/8 py-2 text-right'>
                  <div className='px-2 text-[13px]'>Debit</div>
                </th>
                <th className='w-1/8 py-2 text-right'>
                  <div className='px-2 text-[13px]'>Closing</div>
                </th>
                <th className='w-3/8 py-2 text-left'>
                  <div className='px-2 text-[13px]'>Description</div>
                </th>
                <th className='w-1/8 py-2 text-left'>
                  <div className='px-2 text-[13px]'>Fromto</div>
                </th>
              </tr>
            </thead>
            <tbody className='border-t border-black'>
              {rows.length > 0 ? (
                rows.map((row, index) => (
                  <tr
                    key={`${row.marketId || row.name}-${index}`}
                    className='odd:bg-gray-100'
                  >
                    <td className='w-1/8 border-r border-gray-200 py-2 text-left'>
                      <div className='px-2 text-[13px]'>
                        {row.date
                          ? new Date(row.date).toLocaleDateString()
                          : '-'}
                      </div>
                    </td>
                    <td className='w-1/8 border-r border-gray-200 py-2 text-right'>
                      <div className='px-2 text-[13px]'>{row.credit ?? 0}</div>
                    </td>
                    <td className='w-1/8 border-r border-gray-200 py-2 text-right'>
                      <div className='px-2 text-[13px]'>{row.debit ?? 0}</div>
                    </td>
                    <td className='w-1/8 border-r border-gray-200 py-2 text-right'>
                      <div className='px-2 text-[13px]'>{row.closing ?? 0}</div>
                    </td>
                    <td className='w-3/8 border-r border-gray-200 py-2 text-left'>
                      <div className='px-2 text-[13px]'>
                        <span className='flex w-fit rounded-sm bg-[#444] px-2.5 py-[5px] text-white'>
                          {row.description || '-'}
                        </span>
                      </div>
                    </td>
                    <td className='w-1/8 border-r border-gray-200 py-2 text-left'>
                      <div className='px-2 text-[13px]'>
                        {row.fromto || row.userName || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className='border-r border-gray-200 py-4 text-center text-[13px] text-gray-500'
                  >
                    {loading ? 'Loading...' : 'No data'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default AccountStatement;
