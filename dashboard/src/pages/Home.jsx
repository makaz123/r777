import React, { useCallback, useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { useDispatch, useSelector } from 'react-redux';
import { getDashboardStats } from '../redux/reducer/dashboardReducer';
import { getCurrentDashboardWeekRange } from '../utils/dashboardWeekRange';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Home = () => {
  const dispatch = useDispatch();
  const { stats } = useSelector((state) => state.dashboardStats);

  const initialWeekRef = useRef(getCurrentDashboardWeekRange());
  const [pendingFrom, setPendingFrom] = useState(
    () => new Date(initialWeekRef.current.startDate)
  );
  const [pendingTo, setPendingTo] = useState(
    () => new Date(initialWeekRef.current.endDate)
  );
  const [selectedSport, setSelectedSport] = useState('Cricket');
  const weekKeyRef = useRef(initialWeekRef.current.weekKey);

  const fetchStats = useCallback(
    (startDate, endDate) => {
      dispatch(getDashboardStats({ startDate, endDate }));
    },
    [dispatch]
  );

  const applyCurrentWeek = useCallback(() => {
    const week = getCurrentDashboardWeekRange();
    weekKeyRef.current = week.weekKey;
    setPendingFrom(new Date(week.startDate));
    setPendingTo(new Date(week.endDate));
    return week;
  }, []);

  const handleSubmit = useCallback(() => {
    if (!pendingFrom || !pendingTo) return;
    fetchStats(pendingFrom.toISOString(), pendingTo.toISOString());
  }, [fetchStats, pendingFrom, pendingTo]);

  const checkWeekRollover = useCallback(() => {
    const week = getCurrentDashboardWeekRange();
    if (week.weekKey !== weekKeyRef.current) {
      weekKeyRef.current = week.weekKey;
      setPendingFrom(new Date(week.startDate));
      setPendingTo(new Date(week.endDate));
      fetchStats(week.startDate, week.endDate);
    }
  }, [fetchStats]);

  useEffect(() => {
    const week = initialWeekRef.current;
    fetchStats(week.startDate, week.endDate);
  }, [fetchStats]);

  // Auto-reset to new week after Sunday 11:59 PM (Monday 00:00 = new weekKey)
  useEffect(() => {
    const intervalId = setInterval(checkWeekRollover, 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkWeekRollover();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkWeekRollover]);

  const formatSignedMoney = (value) => {
    const n = Number(value);
    if (Number.isNaN(n)) return '0.00';
    return n.toFixed(2);
  };

  const getSignedValueColor = (value) => {
    const n = Number(value) || 0;
    if (n > 0) return 'text-green-600';
    if (n < 0) return 'text-red-600';
    return 'text-gray-800';
  };

  const summaryCards = [
    {
      title: 'P&L',
      value: stats?.header?.pl ?? 0,
      signed: true,
    },
    { title: 'COMMISSION', value: stats?.header?.commission ?? 0 },
    {
      title: 'DEPOSIT',
      value: `${stats?.header?.deposit ?? 0}${stats?.header?.depositCount !== undefined ? ` (${stats?.header?.depositCount})` : ''}`,
    },
    {
      title: 'WITHDRAWAL',
      value: `${stats?.header?.withdrawal ?? 0}${stats?.header?.withdrawalCount !== undefined ? ` (${stats?.header?.withdrawalCount})` : ''}`,
    },
    { title: 'TOTAL BETS', value: stats?.header?.totalBets ?? 0 },
    {
      title: 'SPORTBOOK P&L',
      value: stats?.header?.sportbookPL ?? 0,
      signed: true,
    },
  ];

  const casinoData = [
    'Indian Poker/ Live Casino P&L',
    'Indian Poker II P&L',
    'Evolution P&L',
    'Vivo P&L',
    'Betgames P&L',
    'Casino III P&L',
    'Spribe P&L',
    'Mac88 P&L',
    'Chicken Road P&L',
    'Rvgames P&L',
    'Ezugi P&L',
  ];

  return (
    <>
      <Navbar />
      <div className='min-h-screen bg-[#e9edf2] px-[15px] py-3'>
        <h1 className='mb-2 text-[16px] font-bold'>Dashboard</h1>
        <div className='mb-6 rounded-[3px] bg-white p-2 shadow-[0_2px_7px_0_#00708285]'>
          <div className='flex flex-wrap items-start text-[12px]'>
            <div className='mb-4 pr-[15px]'>
              <label className='block'>From Date:</label>
              <DatePicker
                selected={pendingFrom}
                onChange={(date) => setPendingFrom(date)}
                showTimeSelect
                timeFormat='HH:mm'
                timeIntervals={1}
                dateFormat='dd/MM/yyyy HH:mm'
                className='w-[270px] rounded border border-[#ced4da] px-3 py-1 text-[14px] text-gray-500 outline-none'
              />
            </div>

            <div className='mb-4 px-[15px]'>
              <label className='block'>To Date:</label>
              <DatePicker
                selected={pendingTo}
                onChange={(date) => setPendingTo(date)}
                showTimeSelect
                timeFormat='HH:mm'
                timeIntervals={1}
                dateFormat='dd/MM/yyyy HH:mm'
                className='w-[270px] rounded border border-[#ced4da] px-3 py-1 text-[14px] text-gray-500 outline-none'
              />
            </div>

            <div className='flex gap-1 px-[15px]'>
              <button
                type='button'
                onClick={handleSubmit}
                className='rounded-l border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-3 py-1.5 text-[14px] text-white'
              >
                Submit
              </button>
              <button
                type='button'
                onClick={() => {
                  const week = applyCurrentWeek();
                  fetchStats(week.startDate, week.endDate);
                }}
                className='rounded-r border border-[#dc3545] bg-[#dc3545] px-3 py-1.5 text-[14px] text-white'
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        <div className='mb-5 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-6'>
          {summaryCards.map((item, index) => (
            <div
              key={index}
              className='overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'
            >
              <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black'>
                {item.title}
              </div>

              <div
                className={`px-2.5 py-2 text-[18px] font-bold ${
                  item.signed
                    ? getSignedValueColor(item.value)
                    : 'text-gray-800'
                }`}
              >
                {item.signed ? formatSignedMoney(item.value) : item.value}
              </div>
            </div>
          ))}
        </div>
        <div className='mb-5 grid grid-cols-1 gap-8 lg:grid-cols-4'>
          {/* Winning Player */}
          <div className='overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black'>
              TOP 5 WINNING PLAYER
            </div>

            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-200 text-[12px]'>
                  <th className='w-80 border-r border-gray-200 p-1.5 text-left'>
                    Player
                  </th>
                  <th className='w-20 p-1.5 text-right'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats?.topWinningPlayers?.map((player, idx) => (
                  <tr
                    key={idx}
                    className='border-b border-gray-200 text-[12px]'
                  >
                    <td className='w-80 border-r border-gray-200 p-1.5 text-left'>
                      {player.userName}
                    </td>
                    <td className='w-20 p-1.5 text-right text-green-500'>
                      {player.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Losing Player */}
          <div className='overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black'>
              TOP 5 LOSING PLAYER
            </div>

            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-200 text-[12px]'>
                  <th className='w-80 border-r border-gray-200 p-1.5 text-left'>
                    Player
                  </th>
                  <th className='w-20 p-1.5 text-right'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats?.topLosingPlayers?.map((player, idx) => (
                  <tr
                    key={idx}
                    className='border-b border-gray-200 text-[12px]'
                  >
                    <td className='w-80 border-r border-gray-200 p-1.5 text-left'>
                      {player.userName}
                    </td>
                    <td className='w-20 p-1.5 text-right text-red-500'>
                      {player.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Winning Markets */}
          <div className='overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black'>
              TOP 5 WINNING MARKETS
            </div>

            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-200 text-[12px]'>
                  <th className='w-30 border-r border-gray-200 p-1.5 text-left'>
                    Sport
                  </th>
                  <th className='w-30 border-r border-gray-200 p-1.5 text-left'>
                    Market
                  </th>
                  <th className='w-30 p-1.5 text-right'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats?.topWinningMarkets?.map((market, idx) => (
                  <tr
                    key={idx}
                    className='border-b border-gray-200 text-[12px]'
                  >
                    <td className='w-30 border-r border-gray-200 p-1.5 text-left'>
                      {market.sport}
                    </td>
                    <td className='w-30 border-r border-gray-200 p-1.5 text-left'>
                      {market.market}
                    </td>
                    <td className='w-30 p-1.5 text-right text-green-500'>
                      {market.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Losing Markets */}
          <div className='overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black'>
              TOP 5 LOSING MARKETS
            </div>

            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-200 text-[12px]'>
                  <th className='w-30 border-r border-gray-200 p-1.5 text-left'>
                    Sport
                  </th>
                  <th className='w-30 border-r border-gray-200 p-1.5 text-left'>
                    Market
                  </th>
                  <th className='w-30 p-1.5 text-right'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats?.topLosingMarkets?.map((market, idx) => (
                  <tr
                    key={idx}
                    className='border-b border-gray-200 text-[12px]'
                  >
                    <td className='w-30 border-r border-gray-200 p-1.5 text-left'>
                      {market.sport}
                    </td>
                    <td className='w-30 border-r border-gray-200 p-1.5 text-left'>
                      {market.market}
                    </td>
                    <td className='w-30 p-1.5 text-right text-red-500'>
                      {market.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className='grid grid-cols-1 gap-8 lg:grid-cols-4'>
          {/* User Count */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='flex justify-between bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] text-black'>
              <span>USER COUNT</span>

              <span className='text-[13px] text-white underline'>
                Overall Count
              </span>
            </div>

            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-200 text-[12px]'>
                  <th className='w-80 border-r border-gray-200 p-1.5 text-left'>
                    Role
                  </th>
                  <th className='w-20 p-1.5 text-right'>Count</th>
                </tr>
              </thead>

              <tbody>
                {stats?.userCount?.map((user, idx) => (
                  <tr
                    key={idx}
                    className='border-b border-gray-200 text-[12px]'
                  >
                    <td className='w-80 border-r border-gray-200 p-1.5 text-left'>
                      {user.role}
                    </td>
                    <td className='w-20 p-1.5 text-right'>{user.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sports Gameplay */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='flex justify-between bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] text-black'>
              SPORTS GAMEPLAY DETAILS
            </div>

            <div className='p-1'>
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className='rounded border border-[#ced4da] px-2 py-2 outline-none'
              >
                <option value='Cricket'>Cricket</option>
                <option value='Tennis'>Tennis</option>
                <option value='Soccer'>Soccer</option>
              </select>
            </div>

            <table className='w-full'>
              <tbody>
                <tr className='border-y border-gray-200 bg-[#0000000d]'>
                  <td className='border-r border-gray-200 p-1.5'>Total Bets</td>
                  <td className='p-1.5 text-right'>
                    {stats?.sportsGameplay?.[selectedSport]?.totalBets || 0}
                  </td>
                </tr>

                <tr className='border-y border-gray-200'>
                  <td className='border-r border-gray-200 p-1.5'>
                    Total Bet Amount
                  </td>
                  <td className='p-1.5 text-right'>
                    {stats?.sportsGameplay?.[selectedSport]?.totalBetAmount ||
                      0}
                  </td>
                </tr>

                <tr className='border-y border-gray-200 bg-[#0000000d]'>
                  <td className='border-r border-gray-200 p-1.5'>Total P&L</td>
                  <td
                    className={`p-1.5 text-right ${(stats?.sportsGameplay?.[selectedSport]?.totalPL || 0) < 0 ? 'text-red-500' : ''}`}
                  >
                    {stats?.sportsGameplay?.[selectedSport]?.totalPL || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Others Gameplay */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='flex justify-between bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] text-black'>
              OTHERS GAMEPLAY DETAILS
            </div>

            <div className='p-1'>
              <select className='rounded border border-[#ced4da] px-2 py-2 outline-none'>
                <option>Select Other</option>
              </select>
            </div>

            <table className='w-full'>
              <tbody>
                <tr className='border-y border-gray-200 bg-[#0000000d]'>
                  <td className='border-r border-gray-200 p-1.5'>Total Bets</td>
                  <td className='p-1.5 text-right'>
                    {stats?.othersGameplay?.totalBets || 0}
                  </td>
                </tr>

                <tr className='border-y border-gray-200'>
                  <td className='border-r border-gray-200 p-1.5'>
                    Total Bet Amount
                  </td>
                  <td className='p-1.5 text-right'>
                    {stats?.othersGameplay?.totalBetAmount || 0}
                  </td>
                </tr>

                <tr className='border-y border-gray-200 bg-[#0000000d]'>
                  <td className='border-r border-gray-200 p-1.5'>Total P&L</td>
                  <td
                    className={`p-1.5 text-right ${(stats?.othersGameplay?.totalPL || 0) < 0 ? 'text-red-500' : ''}`}
                  >
                    {stats?.othersGameplay?.totalPL || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Casino Gameplay */}
          <div className='overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='flex justify-between bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] text-black'>
              CASINO GAMEPLAY DETAILS
            </div>

            <table className='w-full'>
              <tbody>
                {casinoData.map((item, index) => (
                  <tr
                    key={index}
                    className='border-y border-gray-200 odd:bg-[#0000000d]'
                  >
                    <td className='border-r border-gray-200 p-1.5'>{item}</td>
                    <td
                      className={`p-1.5 text-right ${(stats?.casinoGameplay?.[item] || 0) < 0 ? 'text-red-500' : ''}`}
                    >
                      {stats?.casinoGameplay?.[item] || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
