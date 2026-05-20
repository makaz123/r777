import React from 'react';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { getDashboardStats } from '../redux/reducer/dashboardReducer';
import { useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { stats, loading: dashboardLoading } = useSelector(
    (state) => state.dashboardStats
  );
  const currentDate = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(currentDate.getMonth() - 12);
  const formatDate = (date) => date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  const [fromDate, setFromDate] = useState(formatDate(oneMonthAgo));
  const [toDate, setToDate] = useState(formatDate(currentDate));
  const [selectedSport, setSelectedSport] = useState("Cricket");

  useEffect(() => {
    dispatch(getDashboardStats({ startDate: fromDate, endDate: toDate }));
  }, [dispatch, fromDate, toDate]);

  const sportbookPL = stats?.sportsGameplay 
    ? Object.values(stats.sportsGameplay).reduce((sum, sport) => sum + (sport.totalPL || 0), 0)
    : 0;

  // Transform the data for the PieChart
  const transformBackupData = (data) => {
    return data?.map((item) => ({
      name: item.name,
      value: Math.abs(item.myProfit), // Using absolute value for display
      originalProfit: item.myProfit, // Keeping original value for reference
    }));
  };
  const transformLiveData = (data) => {
    return data?.map((item) => ({
      name: item.name,
      value: Math.abs(item.myProfit), // Using absolute value for display
      originalProfit: item.myProfit, // Keeping original value for reference
    }));
  };

  const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884D8',
    '#82CA9D',
  ];
  const formatNumber = (v) => {
    const num = Math.abs(Number(v));
    if (isNaN(num)) return 0;
    return Number.isInteger(num)
      ? num
      : num.toFixed(v.toString().split('.')[1]?.length === 1 ? 1 : 2);
  };
  // Custom tooltip formatter to show profit/loss
  const customTooltipFormatter = (value, name, props) => {
    const originalProfit = props.payload.originalProfit;
    const profitText =
      originalProfit < 0
        ? `Loss: ${formatNumber(originalProfit)}`
        : `Profit: ${formatNumber(originalProfit)}`;
    return [`${formatNumber(value)}`, `${name} (${profitText})`];
  };

 
  const summaryCards = [
    'P&L',
    'COMMISSION',
    'DEPOSIT',
    'WITHDRAWAL',
    'TOTAL BETS',
    'SPORTBOOK P&L',
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
                selected={fromDate ? new Date(fromDate) : null}
                onChange={(date) => setFromDate(date ? date.toISOString() : '')}
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
                selected={toDate ? new Date(toDate) : null}
                onChange={(date) => setToDate(date ? date.toISOString() : '')}
                showTimeSelect
                timeFormat='HH:mm'
                timeIntervals={1}
                dateFormat='dd/MM/yyyy HH:mm'
                className='w-[270px] rounded border border-[#ced4da] px-3 py-1 text-[14px] text-gray-500 outline-none'
              />
            </div>

            <div className='flex gap-1 px-[15px]'>
              <button className='rounded-l border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-3 py-1.5 text-[14px] text-white'>
                Submit
              </button>
              <button className='rounded-r border border-[#dc3545] bg-[#dc3545] px-3 py-1.5 text-[14px] text-white'>
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
                {item}
              </div>

              <div className='px-2.5 py-2 text-[18px] font-bold text-gray-800'>
                0
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
                  <tr key={idx} className="border-b border-gray-200 text-[12px]">
                    <td className="text-left p-1.5 w-80 border-r border-gray-200">{player.userName}</td>
                    <td className="text-right p-1.5 w-20 text-green-500">{player.amount}</td>
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
                  <tr key={idx} className="border-b border-gray-200 text-[12px]">
                    <td className="text-left p-1.5 w-80 border-r border-gray-200">{player.userName}</td>
                    <td className="text-right p-1.5 w-20 text-red-500">{player.amount}</td>
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
                  <tr key={idx} className="border-b border-gray-200 text-[12px]">
                    <td className="text-left p-1.5 w-30 border-r border-gray-200">{market.sport}</td>
                    <td className="text-left p-1.5 w-30 border-r border-gray-200">{market.market}</td>
                    <td className="text-right p-1.5 w-30 text-green-500">{market.amount}</td>
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
                  <tr key={idx} className="border-b border-gray-200 text-[12px]">
                    <td className="text-left p-1.5 w-30 border-r border-gray-200">{market.sport}</td>
                    <td className="text-left p-1.5 w-30 border-r border-gray-200">{market.market}</td>
                    <td className="text-right p-1.5 w-30 text-red-500">{market.amount}</td>
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
                <tr></tr>
              </tbody>
            </table>
          </div>

          {/* Sports Gameplay */}
          <div className='h-fit overflow-hidden rounded bg-white shadow-[0_2px_7px_0_#00708285]'>
            <div className='flex justify-between bg-[#16a3bb] px-[10px] pt-[5px] pb-[3px] text-[14px] text-black'>
              SPORTS GAMEPLAY DETAILS
            </div>

            <div className='p-1'>
              <select className='rounded border border-[#ced4da] px-2 py-2 outline-none'>
                <option>Select Sports</option>
              </select>
            </div>

            <table className='w-full'>
              <tbody>
                <tr className='border-y border-gray-200 bg-[#0000000d]'>
                  <td className='border-r border-gray-200 p-1.5'>Total Bets</td>
                  <td className='p-1.5 text-right'>0</td>
                </tr>

                <tr className='border-y border-gray-200'>
                  <td className='border-r border-gray-200 p-1.5'>
                    Total Bet Amount
                  </td>
                  <td className='p-1.5 text-right'>0</td>
                </tr>

                <tr className='border-y border-gray-200 bg-[#0000000d]'>
                  <td className='border-r border-gray-200 p-1.5'>Total P&L</td>
                  <td className='p-1.5 text-right'>0</td>
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
                  <td className='p-1.5 text-right'>0</td>
                </tr>

                <tr className='border-y border-gray-200'>
                  <td className='border-r border-gray-200 p-1.5'>
                    Total Bet Amount
                  </td>
                  <td className='p-1.5 text-right'>0</td>
                </tr>

                <tr className='border-y border-gray-200 bg-[#0000000d]'>
                  <td className='border-r border-gray-200 p-1.5'>Total P&L</td>
                  <td className='p-1.5 text-right'>0</td>
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
                    <td className='p-1.5 text-right'>0</td>
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
