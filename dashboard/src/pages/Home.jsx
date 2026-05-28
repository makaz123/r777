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
    if (n > 0) return 'text-[#0e7926]';
    if (n < 0) return 'text-[#c7313f]';
    return 'text-gray-800';
  };

  const summaryCards = [
    {
      title: 'P&L',
      value: stats?.header?.pl ?? 0,
      signed: true,
    },
    {
      title: 'COMMISSION',
      value: stats?.header?.commission ?? 0,
      signed: true,
    },
    {
      title: 'DEPOSIT',
      value: `${stats?.header?.deposit ?? 0}${stats?.header?.depositCount !== undefined ? ` (${stats?.header?.depositCount})` : ''}`,
      colorValue: stats?.header?.deposit ?? 0,
    },
    {
      title: 'WITHDRAWAL',
      value: `${stats?.header?.withdrawal ?? 0}${stats?.header?.withdrawalCount !== undefined ? ` (${stats?.header?.withdrawalCount})` : ''}`,
      colorValue: stats?.header?.withdrawal ?? 0,
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
      <div className='min-h-screen bg-[#e9edf2] px-2 pt-1 pb-10 md:px-[15px] md:pt-3'>
        <h5 className='mb-2 text-[16px] font-bold leading-[1.2]'>Dashboard</h5>
        <div className='mb-4 rounded-[3px] bg-white p-2 shadow-[0_2px_7px_0_#00708285]'>
          <div className='flex flex-wrap items-end items-start gap-[2%] gap-y-4 text-[12px] md:gap-x-8 md:pb-4'>
            <div className='w-[49%] md:w-fit'>
              <label className='mb-1 block'>From Date:</label>
              <DatePicker
                selected={pendingFrom}
                onChange={(date) => setPendingFrom(date)}
                showTimeSelect
                timeFormat='HH:mm'
                timeIntervals={1}
                dateFormat='dd/MM/yyyy HH:mm'
                className='w-full rounded border border-[#ced4da] px-3 py-1 text-[14px] text-gray-500 outline-none md:w-[220px]'
              />
            </div>
            <div className='w-[49%] md:w-fit'>
              <label className='mb-1 block'>To Date:</label>
              <DatePicker
                selected={pendingTo}
                onChange={(date) => setPendingTo(date)}
                showTimeSelect
                timeFormat='HH:mm'
                timeIntervals={1}
                dateFormat='dd/MM/yyyy HH:mm'
                className='w-full rounded border border-[#ced4da] px-3 py-1 text-[14px] text-gray-500 outline-none md:w-[220px]'
              />
            </div>
            <div className='flex w-full gap-1 pb-[1px] md:w-fit'>
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
        <div className='mb-4 grid grid-cols-2 gap-4 md:gap-8 lg:grid-cols-6'>
          {summaryCards.map((item, index) => (
            <div
              key={index}
              className='overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'
            >
              <div className='bg-[#16a3bb] px-[10px] py-[2px] text-[16px] font-medium text-black'>
                {item.title}
              </div>

              <div
                className={`px-2.5 py-2 text-[18px] font-bold ${
                  item.signed
                    ? getSignedValueColor(item.value)
                    : item.colorValue !== undefined
                      ? getSignedValueColor(item.colorValue)
                      : 'text-gray-800'
                }`}
              >
                {item.signed ? formatSignedMoney(item.value) : item.value}
              </div>
            </div>
          ))}
        </div>
        <div className='mb-4 grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-4'>
          {/* Winning Player */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] py-[2px] text-[16px] font-medium text-black'>
              TOP 5 WINNING PLAYER
            </div>

            <table className='w-full'>
              <thead>
                <tr className='text-[12px]'>
                  <th className='w-[75%] border-b-[2px] border-r border-[#dee2e6] p-1.5 text-left'>
                    Player
                  </th>
                  <th className='w-[25%] border-b-[2px] border-[#dee2e6] p-1.5 text-right'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats?.topWinningPlayers?.map((player, idx) => (
                  <tr
                    key={idx}
                    className='text-[12px] odd:bg-[#0000000d]'
                  >
                    <td className='w-[75%] border border-[#dee2e6] p-1.5 text-left'>
                      {player.userName}
                    </td>
                    <td className='w-[25%] border border-[#dee2e6] p-1.5 text-right text-[#0e7926]'>
                      {player.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Losing Player */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black'>
              TOP 5 LOSING PLAYER
            </div>

            <table className='w-full'>
              <thead>
                <tr className='text-[12px]'>
                  <th className='w-[75%] border-b-[2px] border-r border-[#dee2e6] p-1.5 text-left'>
                    Player
                  </th>
                  <th className='w-[25%] border-b-[2px] border-[#dee2e6] p-1.5 text-right'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats?.topLosingPlayers?.map((player, idx) => (
                  <tr
                    key={idx}
                    className='text-[12px] odd:bg-[#0000000d]'
                  >
                    <td className='w-[75%] border border-[#dee2e6] p-1.5 text-left'>
                      {player.userName}
                    </td>
                    <td className='w-[25%] border border-[#dee2e6] p-1.5 text-right text-[#c7313f]'>
                      {player.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Winning Markets */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black'>
              TOP 5 WINNING MARKETS
            </div>

            <table className='w-full'>
              <thead>
                <tr className='text-[12px]'>
                  <th className='w-[30%] border-b-[2px] border-r border-[#dee2e6] p-1.5 text-left'>
                    Sport
                  </th>
                  <th className='w-[30%] border-b-[2px] border-r border-[#dee2e6] p-1.5 text-left'>
                    Market
                  </th>
                  <th className='w-[30%] border border-[#dee2e6] p-1.5 text-left'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats?.topWinningMarkets?.map((market, idx) => (
                  <tr
                    key={idx}
                    className='text-[12px] odd:bg-[#0000000d]'
                  >
                    <td className='w-[30%] border border-[#dee2e6] p-1.5 text-left'>
                      {market.sport}
                    </td>
                    <td className='w-[30%] border border-[#dee2e6] p-1.5 text-left'>
                      {market.market}
                    </td>
                    <td className='w-[30%] border border-[#dee2e6] p-1.5 text-right text-[#0e7926]'>
                      {market.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Losing Markets */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black'>
              TOP 5 LOSING MARKETS
            </div>

            <table className='w-full'>
              <thead>
                <tr className='text-[12px]'>
                  <th className='w-[30%] border-b-[2px] border-r border-[#dee2e6] p-1.5 text-left'>
                    Sport
                  </th>
                  <th className='w-[30%] border-b-[2px] border-r border-[#dee2e6] p-1.5 text-left'>
                    Market
                  </th>
                  <th className='w-[30%] border-b-[2px] border-[#dee2e6] p-1.5 text-right'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats?.topLosingMarkets?.map((market, idx) => (
                  <tr
                    key={idx}
                    className='text-[12px] odd:bg-[#0000000d]' 
                  >
                    <td className='w-[30%] border border-[#dee2e6] p-1.5 text-left'>
                      {market.sport}
                    </td>
                    <td className='w-[30%] border border-[#dee2e6] p-1.5 text-left'>
                      {market.market}
                    </td>
                    <td className='w-[30%] border border-[#dee2e6] p-1.5 text-right text-[#c7313f]'>
                      -{market.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className='grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-4'>
          {/* User Count */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black flex items-center justify-between'>
              <span>USER COUNT</span>

              <span className='text-[12px] text-white underline font-normal'>
                Overall Count
              </span>
            </div>

            <table className='w-full'>
              <thead>
                <tr className='text-[12px]'>
                  <th className='w-[75%] border-b-[2px] border-r border-[#dee2e6] p-1.5 text-left'>
                    Role
                  </th>
                  <th className='w-[25%] border-b-[2px] border-[#dee2e6] p-1.5 text-right'>Count</th>
                </tr>
              </thead>

              <tbody>
                {stats?.userCount?.map((user, idx) => (
                  <tr
                    key={idx}
                    className='text-[12px] odd:bg-[#0000000d]'
                  >
                    <td className='w-[75%] border border-[#dee2e6] p-1.5 text-left'>
                      {user.role}
                    </td>
                    <td className='w-[25%] border border-[#dee2e6] p-1.5 text-right'>{user.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sports Gameplay */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black'>
              SPORTS GAMEPLAY DETAILS
            </div>

            <div className='p-1'>
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className='rounded border border-[#ced4da] px-2 py-[1px] outline-none h-[30px] text-[12px] text-[#495057]'
              >
                <option value='Cricket'>Select Sports</option>
                <option value='Cricket'>Cricket</option>
                <option value='Tennis'>Tennis</option>
                <option value='Soccer'>Soccer</option>
              </select>
            </div>

            <table className='w-full'>
              <tbody>
                <tr className='text-[12px] bg-[#0000000d]'>
                  <td className='border border-[#dee2e6] p-1.5 text-left'>Total Bets</td>
                  <td className='border border-[#dee2e6] p-1.5 text-right'>
                    {stats?.sportsGameplay?.[selectedSport]?.totalBets || 0}
                  </td>
                </tr>

                <tr className='text-[12px]'>
                  <td className='border border-[#dee2e6] p-1.5 text-left'>
                    Total Bet Amount
                  </td>
                  <td className='border border-[#dee2e6] p-1.5 text-right'>
                    {stats?.sportsGameplay?.[selectedSport]?.totalBetAmount ||
                      0}
                  </td>
                </tr>

                <tr className='text-[12px] bg-[#0000000d]'>
                  <td className='border border-[#dee2e6] p-1.5 text-left'>Total P&L</td>
                  <td
                    className={`border border-[#dee2e6] p-1.5 text-right ${(stats?.sportsGameplay?.[selectedSport]?.totalPL || 0) < 0 ? 'text-[#c7313f]' : 'text-[#0e7926]'}`}
                  >
                    {stats?.sportsGameplay?.[selectedSport]?.totalPL || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Others Gameplay */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black'>
              OTHERS GAMEPLAY DETAILS
            </div>

            <div className='p-1'>
              <select className='rounded border border-[#ced4da] px-2 py-[1px] outline-none h-[30px] text-[12px] text-[#495057]'>
                <option>Select Other</option>
              </select>
            </div>

            <table className='w-full'>
              <tbody>
                <tr className='text-[12px] bg-[#0000000d]'>
                  <td className='border border-[#dee2e6] p-1.5 text-left'>Total Bets</td>
                  <td className='border border-[#dee2e6] p-1.5 text-right'>
                    {stats?.othersGameplay?.totalBets || 0}
                  </td>
                </tr>

                <tr className='text-[12px]'>
                  <td className='border border-[#dee2e6] p-1.5 text-left'>
                    Total Bet Amount
                  </td>
                  <td className='border border-[#dee2e6] p-1.5 text-right'>
                    {stats?.othersGameplay?.totalBetAmount || 0}
                  </td>
                </tr>

                <tr className='text-[12px] bg-[#0000000d]'>
                  <td className='border border-[#dee2e6] p-1.5 text-left'>Total P&L</td>
                  <td
                    className={`border border-[#dee2e6] p-1.5 text-right ${(stats?.othersGameplay?.totalPL || 0) < 0 ? 'text-red-500' : ''}`}
                  >
                    {stats?.othersGameplay?.totalPL || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Casino Gameplay */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium text-black'>
              CASINO GAMEPLAY DETAILS
            </div>

            <table className='w-full'>
              <tbody>
                {casinoData.map((item, index) => (
                  <tr
                    key={index}
                    className='text-[12px] odd:bg-[#0000000d]'
                  >
                    <td className='border border-[#dee2e6] p-1.5 text-left'>{item}</td>
                    <td
                      className={`border border-[#dee2e6] p-1.5 text-right ${(stats?.casinoGameplay?.[item] || 0) < 0 ? 'text-red-500' : ''}`}
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
