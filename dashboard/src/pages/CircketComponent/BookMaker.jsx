import React from 'react';
import { useSelector } from 'react-redux';
import { FaArrowRight, FaLock } from 'react-icons/fa';
import OddsGridCells from '../../components/OddsGridCells';

const BookMaker = ({ BookmakerList, onBookClick }) => {
  const { pendingBet, betsData } = useSelector((state) => state.market);

  const bookmakerData =
    Array.isArray(BookmakerList) &&
    BookmakerList.length > 0 &&
    BookmakerList[0].section
      ? BookmakerList[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          max: sec.max,
          min: sec.min,
          mname: 'Bookmaker',
          status: sec.gstatus,
        }))
      : [];

  const betCount = Array.isArray(betsData)
    ? betsData.filter(
        (item) =>
          item?.gameType === 'Bookmaker' ||
          item?.marketName === 'Bookmaker' ||
          item?.gameType === bookmakerData[0]?.mname
      ).length
    : 0;

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
      displayAmount !== null;

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

    let ratio = null;
    let oppositeTeam = null;

    if (netOutcome !== 0 && bookmakerData && bookmakerData.length >= 2) {
      for (const other of bookmakerData) {
        if (other.team !== team) {
          const otherDetails = getBetDetails(pendingBet, matchData, other.team);
          if (
            (netOutcome > 0 && otherDetails.netOutcome < 0) ||
            (netOutcome < 0 && otherDetails.netOutcome > 0)
          ) {
            ratio = Math.abs(netOutcome / otherDetails.netOutcome);
            oppositeTeam = other.team;
            break;
          }
        }
      }
    }

    return (
      <div className='md w-[60%] p-1 text-left text-[12px] font-bold md:w-[52%] md:text-[14px]'>
        <div className='flex items-center justify-between'>
          <p>
            {team}
            {ratio !== null && (
              <span className='ml-1 text-[11px] font-normal tracking-tight text-[#4d6a8a]'>
                [{oppositeTeam} : {ratio.toFixed(2)}]
              </span>
            )}
          </p>
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

  const isSuspended = bookmakerData[0]?.status === 'SUSPENDED';

  return (
    <div>
      <div>
        {bookmakerData.length > 0 && (
          <>
            <div className='mt-2 flex items-center justify-between bg-[#27a6c3] px-2.5 py-[3px] text-[14px] text-white'>
              <div className='flex items-center gap-1'>
                <span className='font-bold'>{bookmakerData[0]?.mname}</span>
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
              <div className='hidden md:flex'>
                Min: {BookmakerList[0]?.min} | Max: {BookmakerList[0]?.maxb}
              </div>
            </div>

            <div className='relative'>
              <div className='flex border-b border-gray-300 bg-white text-center'>
                <div className='w-[60%] p-1 md:w-[52%]'>
                  <div className='p-0.5 text-left text-xs text-gray-600 md:hidden'>
                    Min: {BookmakerList[0]?.min} | Max: {BookmakerList[0]?.maxb}
                  </div>
                </div>

                <div className='flex w-[40%] md:w-[48%]'>
                  <div className='m-0.5 hidden w-1/3 md:block'></div>
                  <div className='m-0.5 hidden w-1/3 md:block'></div>
                  <div className='m-0.5 flex w-1/2 items-center justify-center rounded-tl-xl bg-[#72bbef] p-[2px] text-[12px] font-bold text-black md:w-1/3 md:text-[14px]'>
                    Back
                  </div>
                  <div className='m-0.5 flex w-1/2 items-center justify-center rounded-tr-xl bg-[#faa9ba] p-[2px] text-[12px] font-bold text-black md:w-1/3 md:text-[14px]'>
                    Lay
                  </div>
                  <div className='m-0.5 hidden w-1/3 md:block'></div>
                  <div className='m-0.5 hidden w-1/3 md:block'></div>
                </div>
              </div>

              {bookmakerData.map(({ team, odds }, index) => (
                <div
                  key={team}
                  className='flex border-b border-gray-300 bg-white text-center font-semibold'
                >
                  <MyComponent
                    team={team}
                    matchData={bookmakerData[0]}
                    pendingBet={pendingBet}
                    index={index}
                  />
                  <div
                    className={`relative flex w-[40%] md:w-[48%] ${isSuspended ? 'suspended-event' : ''}`}
                  >
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

export default BookMaker;
