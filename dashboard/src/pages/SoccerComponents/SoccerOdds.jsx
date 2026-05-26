import React from 'react';
import { useSelector } from 'react-redux';
import { FaArrowRight, FaLock } from 'react-icons/fa';
import OddsGridCells from '../../components/OddsGridCells';
const SoccerOdds = ({ matchOddsList, onBookClick }) => {
  const { pendingBet, betsData } = useSelector((state) => state.market);

  const betCount = Array.isArray(betsData) 
    ? betsData.filter(item => item?.gameType === 'Match Odds' || item?.gameType === 'Winner').length 
    : 0;

  const oddsData =
    Array.isArray(matchOddsList) &&
    matchOddsList.length > 0 &&
    matchOddsList[0].section
      ? matchOddsList[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          mname: 'Match Odds',
          status: matchOddsList[0].status,
        }))
      : [];

  // Helper function
  const getBetDetails = (pendingBet, matchData, team) => {
    const marketBets =
      pendingBet?.filter((item) => item.gameType === matchData?.mname) || [];

    if (marketBets.length === 0) {
      return {
        isHedged: false,
        netOutcome: null,
        displayAmount: null,
        otype: '',
        totalBetAmount: '',
        totalPrice: '',
        teamName: '',
        isMatchedTeam: false,
      };
    }

    const matchedTeamBet = marketBets.find(
      (item) => item.teamName?.toLowerCase() === team?.toLowerCase()
    );
    let netOutcome = 0;
    marketBets.forEach((bet) => {
      const isBetOnThisTeam =
        bet.teamName?.toLowerCase() === team?.toLowerCase();
      const betAmount = parseFloat(bet.totalBetAmount) || 0;
      const stake = parseFloat(bet.totalPrice) || 0;

      if (bet.otype === 'back') {
        if (isBetOnThisTeam) {
          netOutcome += betAmount;
        } else {
          netOutcome -= stake;
        }
      } else {
        if (isBetOnThisTeam) {
          netOutcome -= stake;
        } else {
          netOutcome += betAmount;
        }
      }
    });

    return {
      isHedged: true,
      netOutcome: Math.round(netOutcome * 100) / 100,
      otype: matchedTeamBet?.otype || marketBets[0]?.otype || '',
      totalBetAmount:
        matchedTeamBet?.totalBetAmount || marketBets[0]?.totalBetAmount || '',
      totalPrice: matchedTeamBet?.totalPrice || marketBets[0]?.totalPrice || '',
      teamName: matchedTeamBet?.teamName || marketBets[0]?.teamName || '',
      isMatchedTeam: !!matchedTeamBet,
    };
  };

  // Inside your React functional component (e.g., in a file like MyComponent.jsx)
  function MyComponent({ team, matchData, pendingBet }) {
    const betDetails = getBetDetails(pendingBet, matchData, team);
    const {
      isHedged,
      netOutcome,
      displayAmount,
      otype,
      totalBetAmount,
      totalPrice,
      teamName,
      isMatchedTeam: isMatchedFromDetails,
    } = betDetails;

    const isMatchedTeam =
      isMatchedFromDetails !== undefined
        ? isMatchedFromDetails
        : teamName?.toLowerCase() === team?.toLowerCase();

    const existingBet =
      (otype && totalBetAmount) ||
      (totalPrice && teamName) ||
      isHedged ||
      displayAmount !== null
        ? true
        : false;

    // Determine the actual value to display
    let actualDisplayValue;
    if (isHedged) {
      actualDisplayValue = netOutcome;
    } else if (displayAmount !== null && displayAmount !== undefined) {
      actualDisplayValue = displayAmount;
    } else if (otype === 'lay') {
      actualDisplayValue = isMatchedTeam ? totalPrice : totalBetAmount;
    } else if (otype === 'back') {
      actualDisplayValue = isMatchedTeam ? totalBetAmount : totalPrice;
    } else {
      actualDisplayValue = null;
    }

    // Color based on actual value - simple logic: negative = red, positive/zero = green
    const numericValue = parseFloat(actualDisplayValue) || 0;
    const betColor =
      existingBet && actualDisplayValue !== null
        ? numericValue >= 0
          ? 'green'
          : 'red'
        : 'green';

    const displayValue = (() => {
      if (!existingBet || actualDisplayValue === null) {
        return null;
      }

      return (
        <span className='flex items-center gap-0.5'>
          <FaArrowRight />
          {actualDisplayValue}
        </span>
      );
    })();

    return (
      <div className='w-1/2 p-1 text-left text-sm font-bold md:text-[14px]'>
        <div className='flex justify-between'>
          <p>{team}</p>
          <p style={{ color: betColor }}>{displayValue}</p>
        </div>
      </div>
    );
  }

  const formatToK = (num) => {
    if (!num || num < 1000) return num;
    const n = Number(num);
    return `${n / 1000}k`;
  };
  const isSuspended = oddsData[0]?.status === 'SUSPENDED';

  return (
    <div>
      <div>
        {oddsData.length > 0 && (
          <>
            <div className='mt-2 flex items-center justify-between bg-[#27a6c3] px-2.5 py-[3px] text-[14px] text-white'>
              <div className='flex items-center gap-1'>
                <span className='font-bold'>{oddsData[0]?.mname}</span>
                <span
                  className='cursor-pointer rounded-[3px] bg-[#f8bb12] px-2 py-[3px] text-[11px] leading-none text-black'
                  onClick={onBookClick}
                >
                  Book
                </span>
                <span className='flex items-center gap-0.5 rounded-[3px] bg-[#f8bb12] px-2 py-[3px] text-[11px] leading-none text-black'>
                  BL <FaLock size={9} />
                </span>
                <span className='rounded-[3px] bg-[#f8bb12] px-2 py-[3px] text-[11px] leading-none text-black'>
                  BetPlace
                </span>
                <span className='rounded-[3px] bg-[#f8bb12] px-2 py-[3px] text-[11px] leading-none text-black'>
                  {betCount}
                </span>
              </div>
              <div>
                Min: {matchOddsList[0]?.min} | Max:{' '}
                {formatToK(matchOddsList[0]?.maxb)}
              </div>
            </div>

            <div className='relative'>
              {isSuspended && (
                <div className='absolute z-10 flex h-full w-full items-center justify-center bg-[#e1e1e17e]'>
                  <p className='text-3xl font-bold text-red-700'>SUSPENDED</p>
                </div>
              )}

              {/* Header */}
              <div className='flex border-b border-gray-300 bg-white text-center'>
                <div className='w-1/2 p-1'>
                  <div className='rounded-md bg-[#bed5d8] p-0.5 text-xs text-gray-600 md:hidden'>
                    <span className='text-[#315195]'>Min/Max </span>

                    {isSuspended
                      ? '100-100000'
                      : `${matchOddsList[0]?.min}-${formatToK(matchOddsList[0]?.maxb)}`}
                  </div>
                </div>

                <div className='grid w-1/2 grid-cols-6'>
                  <div className='col-span-1'></div>
                  <div className='col-span-1'></div>
                  <div className='col-span-1 mx-0.5 mt-0.5 rounded-tl-2xl bg-[#72bbef] p-1 text-[12px] font-bold text-slate-800 md:col-span-1'>
                    Back
                  </div>
                  <div className='col-span-1 mx-0.5 mt-0.5 rounded-tr-2xl bg-[#faa9ba] p-1 text-[12px] font-bold text-slate-800 md:col-span-1'>
                    Lay
                  </div>
                  <div className='col-span-1'></div>
                  <div className='col-span-1'></div>
                </div>
              </div>

              {/* Rows */}
              {oddsData.map(({ team, odds }, index) => (
                <div
                  key={team}
                  className={`flex border-b border-gray-300 bg-white text-center text-[10px] font-semibold ${
                    isSuspended ? 'opacity-30' : ''
                  }`}
                >
                  {!isSuspended ? (
                    <MyComponent
                      team={team}
                      matchData={oddsData[0]}
                      pendingBet={pendingBet}
                      index={index}
                    />
                  ) : (
                    <div className='w-1/2 p-1 pl-4 text-left text-sm font-bold md:col-span-3 md:text-[14px]'>
                      {team}
                    </div>
                  )}

                  <div className='grid w-1/2 grid-cols-6'>
                    <OddsGridCells odds={odds} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SoccerOdds;
