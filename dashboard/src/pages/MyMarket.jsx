import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { marketGames } from '../redux/reducer/marketAnalyzeReducer';
import Loader from '../components/Loader';
import {
  useAutoRefresh,
  DEFAULT_LIST_REFRESH_MS,
} from '../hooks/useAutoRefresh';
import { FaArrowRight, FaMinusCircle, FaPlusCircle } from 'react-icons/fa';

const SPORT_TABS = ['Cricket', 'Tennis', 'Soccer'];

const GAME_ROUTE = {
  'Cricket Game': (event) =>
    `/cricket-bet/${encodeURIComponent(event.eventName)}/Cricket Game/${event.gameId}?from=market`,
  'Tennis Game': (event) =>
    `/tennis-bet/${encodeURIComponent(event.eventName)}/Tennis Game/${event.gameId}?from=market`,
  'Soccer Game': (event) =>
    `/soccerbet/${encodeURIComponent(event.eventName)}/Soccer Game/${event.gameId}?from=market`,
  'Horse Racing Game': (event) => `/horse-racing-bet/${event.gameId}`,
  'Horse Racing': (event) => `/horse-racing-bet/${event.gameId}`,
};

const formatNum = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const exposureClass = (value) => {
  const n = Number(value) || 0;
  if (n < 0) return 'text-red-500';
  if (n > 0) return 'text-green-500';
  return 'text-black';
};

const MyMarket = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeSport, setActiveSport] = useState('Cricket');
  const [openRows, setOpenRows] = useState([]);

  const { sportAnalysis, loading, errorMessage } = useSelector(
    (state) => state.market
  );

  useEffect(() => {
    dispatch(marketGames());
  }, [dispatch]);

  useAutoRefresh(() => dispatch(marketGames()), DEFAULT_LIST_REFRESH_MS);

  const tabCounts = useMemo(
    () => SPORT_TABS.map((sport) => sportAnalysis?.[sport]?.count ?? 0),
    [sportAnalysis]
  );

  useEffect(() => {
    setActiveSport((current) => {
      const currentCount = sportAnalysis?.[current]?.count ?? 0;
      if (currentCount > 0) return current;
      const firstWithData = SPORT_TABS.find(
        (sport) => (sportAnalysis?.[sport]?.count ?? 0) > 0
      );
      return firstWithData || current;
    });
  }, [sportAnalysis]);

  const events = sportAnalysis?.[activeSport]?.events ?? [];

  const toggleRow = (rowKey) => {
    setOpenRows((prev) =>
      prev.includes(rowKey)
        ? prev.filter((k) => k !== rowKey)
        : [...prev, rowKey]
    );
  };

  const goToEvent = (event) => {
    const build = GAME_ROUTE[event.gameName];
    if (build) navigate(build(event));
  };

  return (
    <div>
      <Navbar />

      <div className='scrollbar-hide md:px-[15px] md:pt-[13px] pb-10'>
        <div className='min-h-[600px] rounded-lg bg-white px-[15px] py-[7px]'>
          {loading ? (
            <div className='flex items-center justify-center py-20'>
              <Loader />
            </div>
          ) : (
            <>
              <div className='text-[16px] font-bold'>Sport Analysis</div>

              {errorMessage && (
                <p className='mt-2 text-sm text-red-600'>{errorMessage}</p>
              )}

              <div className='mt-4 flex gap-1 border-b border-gray-200'>
                {SPORT_TABS.map((sport, index) => {
                  const isActive = activeSport === sport;
                  const count = tabCounts[index];

                  return (
                    count > 0 && (
                      <button
                        key={sport}
                        type='button'
                        onClick={() => setActiveSport(sport)}
                        className={`relative rounded-t-sm px-4 py-1 text-[14px] ${
                          isActive
                            ? 'bg-[#007082] text-white'
                            : 'border border-[#007082] text-[#007082]'
                        }`}
                      >
                        {sport}

                        <span className='absolute -top-3 right-0 flex h-[18px] min-w-[22px] items-center justify-center rounded-sm bg-[#16a5bd] px-1 text-[10px] text-white'>
                          ({count})
                        </span>
                      </button>
                    )
                  );
                })}
              </div>

              {events.length === 0 ? (
                <p className='mt-6 text-center text-sm text-gray-500'>
                  No pending bets for {activeSport}.
                </p>
              ) : (
                events.map((item) => {
                  const rowKey = `${item.gameId}-${item.eventName}`;
                  const markets =
                    item.markets?.length > 0
                      ? item.markets
                      : item.market
                        ? [item.market]
                        : [];

                  return (
                    <div
                      key={rowKey}
                      className='scrollbar-hide mb-3 overflow-y-scroll bg-white px-2'
                    >
                      <div className='flex items-center gap-2 pt-2 pb-1 text-[16px] font-bold'>
                        <span>
                          <FaArrowRight className='text-black' />
                        </span>
                        <span className='whitespace-nowrap'>{item.title}</span>
                      </div>

                      <table className='w-full border-collapse text-[14px] font-light'>
                        <thead>
                          <tr className='bg-[#1aa0b8] text-white'>
                            <th className='border border-gray-300 px-3 py-1 text-left'>
                              Event Name
                            </th>
                            <th className='border border-gray-300 px-3 py-1 text-right whitespace-nowrap'>
                              Total Bets
                            </th>
                            <th className='border border-gray-300 px-3 py-1 text-right'>
                              Exposure
                            </th>
                            <th className='border border-gray-300 px-3 py-1 text-right whitespace-nowrap'>
                              Total Amount
                            </th>
                            <th className='border border-gray-300 px-3 py-1 text-right whitespace-nowrap'>
                              Max Profit
                            </th>
                            <th className='w-[50px] border border-gray-300 px-3 py-1 text-center'>
                              &nbsp;
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          <tr className='text-[14px] font-semibold'>
                            <td className='border border-gray-300 px-3 py-1'>
                              <button
                                type='button'
                                className='text-left whitespace-nowrap underline'
                                onClick={() => goToEvent(item)}
                              >
                                {item.match}
                              </button>
                            </td>
                            <td className='border border-gray-300 px-3 py-1 text-right'>
                              {item.totalBets}
                            </td>
                            <td
                              className={`border border-gray-300 px-3 py-1 text-right ${exposureClass(item.exposure)}`}
                            >
                              {formatNum(item.exposure)}
                            </td>
                            <td className='border border-gray-300 px-3 py-1 text-right'>
                              {formatNum(item.totalAmount)}
                            </td>
                            <td className='border border-gray-300 px-3 py-1 text-right'>
                              {formatNum(item.maxProfit)}
                            </td>
                            <td className='border border-gray-300 px-3 py-1 text-center'>
                              <button
                                type='button'
                                onClick={() => toggleRow(rowKey)}
                                disabled={markets.length === 0}
                              >
                                {openRows.includes(rowKey) ? (
                                  <FaMinusCircle className='text-[18px] text-[#1aa0b8]' />
                                ) : (
                                  <FaPlusCircle className='text-[18px] text-[#1aa0b8]' />
                                )}
                              </button>
                            </td>
                          </tr>

                          {openRows.includes(rowKey) && markets.length > 0 && (
                            <tr>
                              <td
                                colSpan={6}
                                className='border border-gray-300 p-0'
                              >
                                <div className='pt-0.5 pr-2 pb-4 pl-[185px]'>
                                  <table className='w-full border-collapse'>
                                    <thead>
                                      <tr className='bg-[#045a66] text-white'>
                                        <th className='border border-gray-300 px-3 py-1 text-left'>
                                          Markets
                                        </th>
                                        <th className='border border-gray-300 px-3 py-1 text-right'>
                                          Bets
                                        </th>
                                        <th className='border border-gray-300 px-3 py-1 text-right'>
                                          Exposure
                                        </th>
                                        <th className='border border-gray-300 px-3 py-1 text-right whitespace-nowrap'>
                                          Max Profit
                                        </th>
                                        <th className='border border-gray-300 px-3 py-1 text-right whitespace-nowrap'>
                                          {item.team1}
                                        </th>
                                        <th className='border border-gray-300 px-3 py-1 text-right whitespace-nowrap'>
                                          {item.team2}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {markets.map((mkt) => (
                                        <tr key={mkt.name} className='bg-white'>
                                          <td className='border border-gray-300 px-3 py-1 font-semibold whitespace-nowrap'>
                                            {mkt.name}
                                          </td>
                                          <td className='border border-gray-300 px-3 py-1 text-right'>
                                            {mkt.bets}
                                          </td>
                                          <td
                                            className={`border border-gray-300 px-3 py-1 text-right ${exposureClass(mkt.exposure)}`}
                                          >
                                            {formatNum(mkt.exposure)}
                                          </td>
                                          <td className='border border-gray-300 px-3 py-1 text-right'>
                                            {formatNum(mkt.maxProfit)}
                                          </td>
                                          <td
                                            className={`border border-gray-300 px-3 py-1 text-right ${exposureClass(mkt.team1Value)}`}
                                          >
                                            {formatNum(mkt.team1Value)}
                                          </td>
                                          <td
                                            className={`border border-gray-300 px-3 py-1 text-right ${exposureClass(mkt.team2Value)}`}
                                          >
                                            {formatNum(mkt.team2Value)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyMarket;
