import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  getGraphData,
  getGraphTodayData,
} from '../redux/reducer/downlineReducer';
import { useEffect } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { graphbackup, graphtoday, loading } = useSelector(
    (state) => state.downline
  );
  const currentDate = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(currentDate.getMonth() - 12);
  const formatDate = (date) => date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  const [startDate, setStartDate] = useState(formatDate(oneMonthAgo));
  const [endDate, setEndDate] = useState(formatDate(currentDate));

  useEffect(() => {
    dispatch(
      getGraphData({
        startDate,
        endDate,
      })
    );
    dispatch(
      getGraphTodayData({
        startDate: currentDate,
        endDate: currentDate,
      })
    );
  }, [dispatch]);

  const PLdata = graphbackup?.report;
  const LivePLdata = graphtoday?.report;
  const Totaldata = graphbackup?.total;
  console.log(graphtoday, 'myReportseventData');

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


  const [fromDate, setFromDate] = useState("2026-05-18T00:00");
  const summaryCards = [
    "P&L",
    "COMMISSION",
    "DEPOSIT",
    "WITHDRAWAL",
    "TOTAL BETS",
    "SPORTBOOK P&L",
  ];

  const casinoData = [
    "Indian Poker/ Live Casino P&L",
    "Indian Poker II P&L",
    "Evolution P&L",
    "Vivo P&L",
    "Betgames P&L",
    "Casino III P&L",
    "Spribe P&L",
    "Mac88 P&L",
    "Chicken Road P&L",
    "Rvgames P&L",
    "Ezugi P&L",
  ];







  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#e9edf2] py-3 px-[15px]">
        <h1 className="text-[16px] font-bold mb-2">Dashboard</h1>
        <div className="bg-white rounded-[3px] p-2 mb-6 shadow-[0_2px_7px_0_#00708285]">
          <div className="flex flex-wrap items-start text-[12px]">
            <div className='pr-[15px] mb-4'>
              <label className="block">From Date:</label>
              <DatePicker
                selected={fromDate}
                onChange={(date) => setFromDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={1}
                dateFormat="dd/MM/yyyy HH:mm"
                className="border border-[#ced4da] rounded text-[14px] text-gray-500 px-3 py-1 w-[270px] outline-none"
              />
            </div>

            <div className='px-[15px] mb-4'>
              <label className="block">To Date:</label>
              <DatePicker
                selected={fromDate}
                onChange={(date) => setFromDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={1}
                dateFormat="dd/MM/yyyy HH:mm"
                className="border border-[#ced4da] rounded text-[14px] text-gray-500 px-3 py-1 w-[270px] outline-none"
              />
            </div>

            <div className='px-[15px] flex gap-1'>
              <button className="bg-gradient-to-b from-[#5ecbdd] to-[#146578] text-white px-3 py-1.5 text-[14px] border border-[#146578] rounded-l">
                Submit
              </button>
              <button className="bg-[#dc3545] text-white px-3 py-1.5 text-[14px] border border-[#dc3545] rounded-r">
                Reset
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 mb-5">
          {summaryCards.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded overflow-hidden shadow-[0_2px_7px_0_#00708285]"
            >
              <div className="bg-[#16a3bb] text-black px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium">
                {item}
              </div>

              <div className="px-2.5 py-2 text-[18px] font-bold text-gray-800">
                0
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-5">
          {/* Winning Player */}
          <div className="bg-white rounded overflow-hidden shadow-[0_2px_7px_0_#00708285]">
            <div className="bg-[#16a3bb] text-black px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium">
              TOP 5 WINNING PLAYER
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-[12px]">
                  <th className="text-left p-1.5 w-80 border-r border-gray-200">Player</th>
                  <th className="text-right p-1.5 w-20">Amount</th>
                </tr>
              </thead>
            </table>
          </div>

          {/* Losing Player */}
          <div className="bg-white rounded overflow-hidden shadow-[0_2px_7px_0_#00708285]">
            <div className="bg-[#16a3bb] text-black px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium">
              TOP 5 LOSING PLAYER
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-[12px]">
                  <th className="text-left p-1.5 w-80 border-r border-gray-200">Player</th>
                  <th className="text-right p-1.5 w-20">Amount</th>
                </tr>
              </thead>
            </table>
          </div>

          {/* Winning Markets */}
          <div className="bg-white rounded overflow-hidden shadow-[0_2px_7px_0_#00708285]">
            <div className="bg-[#16a3bb] text-black px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium">
              TOP 5 WINNING MARKETS
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-[12px]">
                  <th className="text-left p-1.5 w-30 border-r border-gray-200">Sport</th>
                  <th className="text-left p-1.5 w-30 border-r border-gray-200">Market</th>
                  <th className="text-right p-1.5 w-30">Amount</th>
                </tr>
              </thead>
            </table>
          </div>

          {/* Losing Markets */}
          <div className="bg-white rounded overflow-hidden shadow-[0_2px_7px_0_#00708285]">
            <div className="bg-[#16a3bb] text-black px-[10px] pt-[5px] pb-[3px] text-[14px] font-medium">
              TOP 5 LOSING MARKETS
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-[12px]">
                  <th className="text-left p-1.5 w-30 border-r border-gray-200">Sport</th>
                  <th className="text-left p-1.5 w-30 border-r border-gray-200">Market</th>
                  <th className="text-right p-1.5 w-30">Amount</th>
                </tr>
              </thead>
            </table>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* User Count */}
          <div className="bg-white rounded overflow-hidden shadow-[0_2px_7px_0_#00708285] h-fit">
            <div className="bg-[#16a3bb] text-black px-[10px] pt-[5px] pb-[3px] text-[14px] flex justify-between">
              <span>USER COUNT</span>

              <span className="text-[13px] text-white underline">
                Overall Count
              </span>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-[12px]">
                  <th className="text-left p-1.5 w-80 border-r border-gray-200">Role</th>
                  <th className="text-right p-1.5 w-20">Count</th>
                </tr>
              </thead>

              <tbody>
                <tr>

                </tr>
              </tbody>
            </table>
          </div>

          {/* Sports Gameplay */}
          <div className="bg-white rounded overflow-hidden shadow-[0_2px_7px_0_#00708285] h-fit">
            <div className="bg-[#16a3bb] text-black px-[10px] pt-[5px] pb-[3px] text-[14px] flex justify-between">
              SPORTS GAMEPLAY DETAILS
            </div>

            <div className="p-1">
              <select className="border border-[#ced4da] rounded px-2 py-2 outline-none">
                <option>Select Sports</option>
              </select>
            </div>

            <table className="w-full">
              <tbody>
                <tr className="border-y border-gray-200 bg-[#0000000d]">
                  <td className="p-1.5 border-r border-gray-200">Total Bets</td>
                  <td className="p-1.5 text-right">0</td>
                </tr>

                <tr className="border-y border-gray-200">
                  <td className="p-1.5 border-r border-gray-200">Total Bet Amount</td>
                  <td className="p-1.5 text-right">0</td>
                </tr>

                <tr className="border-y border-gray-200 bg-[#0000000d]">
                  <td className="p-1.5 border-r border-gray-200">Total P&L</td>
                  <td className="p-1.5 text-right">0</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Others Gameplay */}
          <div className="bg-white rounded overflow-hidden shadow-[0_2px_7px_0_#00708285] h-fit">
            <div className="bg-[#16a3bb] text-black px-[10px] pt-[5px] pb-[3px] text-[14px] flex justify-between">
              OTHERS GAMEPLAY DETAILS
            </div>

            <div className="p-1">
              <select className="border border-[#ced4da] rounded px-2 py-2 outline-none">
                <option>Select Other</option>
              </select>
            </div>

            <table className="w-full">
              <tbody>
                <tr className="border-y border-gray-200 bg-[#0000000d]">
                  <td className="p-1.5 border-r border-gray-200">Total Bets</td>
                  <td className="p-1.5 text-right">0</td>
                </tr>

                <tr className="border-y border-gray-200">
                  <td className="p-1.5 border-r border-gray-200">Total Bet Amount</td>
                  <td className="p-1.5 text-right">0</td>
                </tr>

                <tr className="border-y border-gray-200 bg-[#0000000d]">
                  <td className="p-1.5 border-r border-gray-200">Total P&L</td>
                  <td className="p-1.5 text-right">0</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Casino Gameplay */}
          <div className="bg-white rounded overflow-hidden shadow-[0_2px_7px_0_#00708285]">
            <div className="bg-[#16a3bb] text-black px-[10px] pt-[5px] pb-[3px] text-[14px] flex justify-between">
              CASINO GAMEPLAY DETAILS
            </div>

            <table className="w-full">
              <tbody>
                {casinoData.map((item, index) => (
                  <tr key={index} className="border-y border-gray-200 odd:bg-[#0000000d]">
                    <td className="p-1.5 border-r border-gray-200">{item}</td>
                    <td className="p-1.5 text-right">0</td>
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
