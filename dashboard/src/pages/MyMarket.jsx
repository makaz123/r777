import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { marketGames } from '../redux/reducer/marketAnalyzeReducer';
import Loader from '../components/Loader';
import { FaArrowRight, FaMinusCircle, FaPlusCircle } from 'react-icons/fa';

const MyMarket = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [market, setMarket] = useState([]);

  const { marketData, loading, errorMessage, successMessage } = useSelector(
    (state) => state.market
  );
  console.log('marketData', marketData);
  const cricketGame = Array.isArray(marketData)
    ? marketData.filter((item) => item.gameName === 'Cricket Game')
    : [];

  const tennisGame = Array.isArray(marketData)
    ? marketData.filter((item) => item.gameName === 'Tennis Game')
    : [];

  const soccerGame = Array.isArray(marketData)
    ? marketData.filter((item) => item.gameName === 'Soccer Game')
    : [];

  const horseRacingGame = Array.isArray(marketData)
    ? marketData.filter(
        (item) =>
          item.gameName === 'Horse Racing Game' ||
          item.gameName === 'Horse Racing'
      )
    : [];

  const casinoGame = Array.isArray(marketData)
    ? marketData.filter((item) => item.gameName === 'Casino')
    : [];

  useEffect(() => {
    dispatch(marketGames());
  }, [dispatch]);



  const data = [
    {
      title: 'ATP Hamburg 2026',
      match: 'Paul v To Etcheverry - 20 May 26 18:20',
      totalBets: 1,
      exposure: -54,
      totalAmount: 100,
      maxProfit: 65,
      team1: 'Tommy Paul',
      team2: 'Tomas Martin Etcheverry',
      market: {
        name: 'Match Odds',
        bets: 1,
        exposure: -54,
        maxProfit: 65,
        team1Value: -54,
        team2Value: 65,
      },
    },
    {
      title: 'WTA Rabat 2026',
      match: 'Pe Marcinko v Ye Kotliar - 20 May 26 17:25',
      totalBets: 2,
      exposure: -2,
      totalAmount: 200,
      maxProfit: 0,
      team1: 'Petra Marcinko',
      team2: 'Yelyzaveta Kotliar',
      market: {
        name: 'Match Odds',
        bets: 2,
        exposure: -2,
        maxProfit: 0,
        team1Value: -2,
        team2Value: 0,
      },
    },
  ];

  const [openRows, setOpenRows] = useState([]);
  const toggleRow = (index) => {
    setOpenRows((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div>
      <Navbar />

      <div className='px-[15px] bg-[#f0f0f5] py-[13px] h-[calc(100vh-52px)] overflow-y-scroll scrollbar-hide'>
        <div className='rounded-lg bg-white py-[7px] px-[15px] h-full min-h-[600px]'>
        {loading ? (
          <div className='flex items-center justify-center'>
            <Loader />
          </div>
        ) : (
          <>
            {/* Cricket */}

            <div className='font-bold text-[16px]'>Sport Analysis</div>
            
            <div className='flex mt-4 gap-1 border-b border-gray-200'>
              <div className='relative bg-[#007082] px-4 py-1 rounded-t-sm text-white text-[14px]'>
                Cricket
                <span className='absolute -top-3 right-0 bg-[#16a5bd] w-[22px] h-[18px] rounded-sm text-[10px] flex justify-center items-center text-white'>(1)</span>
              </div>
              <div className='relative border border-[#007082] px-4 py-1 rounded-t-sm text-[#007082]  text-[14px]'>
                Tennis
                <span className='absolute -top-3 right-0 bg-[#16a5bd] w-[22px] h-[18px] rounded-sm text-[10px] flex justify-center items-center text-white'>(3)</span>
              </div>
            </div>

            {data.map((item, index) => (
                <div key={index} className="mb-3 bg-white px-2">
                  {/* Tournament Title */}
                  <div className="flex items-center gap-2 text-[16px] pb-1 pt-2 font-bold">
                    <FaArrowRight className="text-black" />
                    <span>{item.title}</span>
                  </div>

                  {/* Main Table */}
                  <table className="w-full border-collapse text-[14px] font-light">
                    <thead>
                      <tr className="bg-[#1aa0b8] text-white">
                        <th className="border border-gray-300 px-3 py-1 text-left">
                          Event Name
                        </th>
                        <th className="border border-gray-300 px-3 py-1 text-right">
                          Total Bets
                        </th>
                        <th className="border border-gray-300 px-3 py-1 text-right">
                          Exposure
                        </th>
                        <th className="border border-gray-300 px-3 py-1 text-right">
                          Total Amount
                        </th>
                        <th className="border border-gray-300 px-3 py-1 text-right">
                          Max Profit
                        </th>
                        <th className="border border-gray-300 px-3 py-1 text-center w-[50px]">
                          &nbsp;
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr className="font-semibold text-[14px]">
                        <td className="border border-gray-300 px-3 py-1 underline">
                          {item.match}
                        </td>

                        <td className="border border-gray-300 px-3 py-1 text-right">
                          {item.totalBets}
                        </td>

                        <td className="border border-gray-300 px-3 py-1 text-right text-black">
                          {item.exposure}
                        </td>

                        <td className="border border-gray-300 px-3 py-1 text-right">
                          {item.totalAmount}
                        </td>

                        <td className="border border-gray-300 px-3 py-1 text-right">
                          {item.maxProfit}
                        </td>

                        <td className="border border-gray-300 px-3 py-1 text-center">
                          <button onClick={() => toggleRow(index)}>
                            {openRows.includes(index) ? (
                              <FaMinusCircle className="text-[#1aa0b8] text-[18px]" />
                            ) : (
                              <FaPlusCircle className="text-[#1aa0b8] text-[18px]" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {openRows.includes(index) && (
                        <tr>
                          <td
                            colSpan={6}
                            className="border border-gray-300  p-0"
                          >
                            <div className="pl-[185px] pt-0.5 pr-2 pb-4">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="bg-[#045a66] text-white">
                                    <th className="border border-gray-300 px-3 py-1 text-left">
                                      Markets
                                    </th>

                                    <th className="border border-gray-300 px-3 py-1 text-right">
                                      Bets
                                    </th>

                                    <th className="border border-gray-300 px-3 py-1 text-right">
                                      Exposure
                                    </th>

                                    <th className="border border-gray-300 px-3 py-1 text-right">
                                      Max Profit
                                    </th>

                                    <th className="border border-gray-300 px-3 py-1 text-right">
                                      {item.team1}
                                    </th>

                                    <th className="border border-gray-300 px-3 py-1 text-right">
                                      {item.team2}
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>
                                  <tr className="bg-white">
                                    <td className="border border-gray-300 px-3 py-1 font-semibold">
                                      {item.market.name}
                                    </td>

                                    <td className="border border-gray-300 px-3 py-1 text-right">
                                      {item.market.bets}
                                    </td>

                                    <td className="border border-gray-300 px-3 py-1 text-right">
                                      {item.market.exposure}
                                    </td>

                                    <td className="border border-gray-300 px-3 py-1 text-right">
                                      {item.market.maxProfit}
                                    </td>

                                    <td className="border border-gray-300 px-3 py-1 text-right text-red-500">
                                      {item.market.team1Value}
                                    </td>

                                    <td className="border border-gray-300 px-3 py-1 text-right text-green-500">
                                      {item.market.team2Value}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}







            <div className='mt-4'>
              {cricketGame.length > 0 && (
                <div>
                  <div className='bg-dark mb-2 px-4 py-2 font-semibold text-white'>
                    Cricket
                  </div>
                  {cricketGame[0]?.events.map((event, index) => (
                    <div
                      key={index}
                      className='flex justify-between gap-2 border-b-2 border-gray-300 px-2 pb-2'
                    >
                      <p
                        className='cursor-pointer text-[4vw] leading-[25px] font-[600] text-[#2789ce] md:text-xs lg:text-sm'
                        onClick={() =>
                          navigate(
                            `/cricket-bet/${event.eventName}/Cricket Game/${event.gameId}?from=market`
                          )
                        }
                      >
                        {event.eventName}
                      </p>
                      <p className='ml-1 font-[400] text-gray-400'>
                        {event.pendingBetCount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tennis */}
            <div className='mt-4'>
              {tennisGame.length > 0 && (
                <div>
                  <div className='bg-dark mb-2 px-4 py-2 font-semibold text-white'>
                    Tennis
                  </div>
                  {tennisGame[0]?.events.map((event, index) => (
                    <div
                      key={index}
                      className='flex justify-between gap-2 border-b-2 border-gray-300 px-2 pb-2'
                    >
                      <p
                        className='cursor-pointer text-[4vw] leading-[25px] font-[600] text-[#2789ce] md:text-xs lg:text-sm'
                        onClick={() =>
                          navigate(
                            `/tennis-bet/${event.eventName}/Tennis Game/${event.gameId}?from=market`
                          )
                        }
                      >
                        {event.eventName}
                      </p>
                      <p className='ml-1 font-[400] text-gray-400'>
                        {event.pendingBetCount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Soccer */}
            <div className='mt-4'>
              {soccerGame.length > 0 && (
                <div>
                  <div className='bg-dark mb-2 px-4 py-2 font-semibold text-white'>
                    Soccer
                  </div>
                  {soccerGame[0]?.events.map((event, index) => (
                    <div
                      key={index}
                      className='flex justify-between gap-2 border-b-2 border-gray-300 px-2 pb-2'
                    >
                      <p
                        className='cursor-pointer text-[4vw] leading-[25px] font-[600] text-[#2789ce] md:text-xs lg:text-sm'
                        onClick={() =>
                          navigate(
                            `/soccerbet/${event.eventName}/Soccer Game/${event.gameId}?from=market`
                          )
                        }
                      >
                        {event.eventName}
                      </p>
                      <p className='ml-1 font-[400] text-gray-400'>
                        {event.pendingBetCount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Horse Racing */}
            <div className='mt-4'>
              {horseRacingGame.length > 0 && (
                <div>
                  <div className='bg-dark mb-2 px-4 py-2 font-semibold text-white'>
                    Horse Racing
                  </div>
                  {horseRacingGame[0]?.events.map((event, index) => (
                    <div
                      key={index}
                      className='flex justify-between gap-2 border-b-2 border-gray-300 px-2 pb-2'
                    >
                      <p
                        className='cursor-pointer text-[4vw] leading-[25px] font-[600] text-[#2789ce] md:text-xs lg:text-sm'
                        onClick={() =>
                          navigate(`/horse-racing-bet/${event.gameId}`)
                        }
                      >
                        {event.eventName}
                      </p>
                      <p className='ml-1 font-[400] text-gray-400'>
                        {event.pendingBetCount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Casino */}
            <div className='mt-4'>
              {casinoGame.length > 0 && (
                <div>
                  <div className='bg-dark mb-2 px-4 py-2 font-semibold text-white'>
                    Casino
                  </div>
                  {casinoGame[0]?.events.map((event, index) => (
                    <div
                      key={index}
                      className='flex justify-between gap-2 border-b-2 border-gray-300 px-2 pb-2'
                    >
                      <p
                        className='cursor-pointer text-[4vw] leading-[25px] font-[600] text-[#2789ce] md:text-xs lg:text-sm'
                        onClick={() => navigate(`/casino-bet/${event.gameId}`)}
                      >
                        {event.eventName}
                      </p>
                      <p className='ml-1 font-[400] text-gray-400'>
                        {event.pendingBetCount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default MyMarket;
