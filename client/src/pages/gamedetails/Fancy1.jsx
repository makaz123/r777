import React, { useMemo } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import PlaceBet from './PlaceBet';

function Fancy1({
  onBetSelect,
  fancy1Data,
  pendingBetAmounts,
  selectedBet,
  gameid,
  team1,
  team2,
  eventName: matchEventName,
  gameName,
  onBetChange,
  onClose,
}) {
  const renderInlineBetSlip = (item) => {
    const isFancy1Bet = selectedBet?.gameType === 'fancy1';
    const isMatching =
      !!selectedBet &&
      isFancy1Bet &&
      (selectedBet?.team?.toLowerCase() === item.label?.toLowerCase() ||
        selectedBet?.marketName?.toLowerCase() === item.label?.toLowerCase());
    if (!isMatching) return null;
    return (
      <div className='border-b border-b-[#c7c8ca] bg-[#fafafa]'>
        <PlaceBet
          selectedBet={selectedBet}
          onBetChange={onBetChange}
          onClose={onClose}
          team1={team1}
          team2={team2}
          gameId={gameid}
          eventName={matchEventName}
          marketName={selectedBet?.marketName || item.label}
          gameType={selectedBet?.gameType}
          gameName={gameName}
          maxAmount={selectedBet?.maxAmount}
          minAmount={selectedBet?.minAmount}
        />
      </div>
    );
  };
  console.log('fancy1Data from fancy1', fancy1Data);

  // Helper function to format max value (handle numbers and strings like "2L")
  const formatMax = (max) => {
    if (typeof max === 'string') return max;
    if (max >= 100000) return `${(max / 100000).toFixed(0)}L`;
    if (max >= 1000) return `${(max / 1000).toFixed(0)}k`;
    return max;
  };

  // Transform API data to component format
  const transformedData = useMemo(() => {
    if (!fancy1Data || fancy1Data.length === 0) {
      return [];
    }

    return fancy1Data.map((item, index) => {
      // Get back and lay odds
      const backOdd = item.odds?.find((odd) => odd.otype === 'back');
      const layOdd = item.odds?.find((odd) => odd.otype === 'lay');

      return {
        id: index + 1,
        label: item.team || `Item ${index + 1}`,
        no:
          backOdd && backOdd.odds > 0
            ? {
                rate: backOdd.odds,
                stake: backOdd.size || 0,
              }
            : { rate: null, stake: null },
        yes:
          layOdd && layOdd.odds > 0
            ? {
                rate: layOdd.odds,
                stake: layOdd.size || 0,
              }
            : { rate: null, stake: null },
        min: item.min || 0,
        max: formatMax(item.max || 0),
        sid: item.sid,
      };
    });
  }, [fancy1Data]);

  // Split data into left and right columns
  const mid = Math.ceil(transformedData.length / 2);
  const leftData = transformedData.slice(0, mid);
  const rightData = transformedData.slice(mid);

  // Get bet details from pending bets
  const getBetDetails = (team) => {
    const matchedBet = pendingBetAmounts?.find(
      (item) =>
        item.gameType === 'fancy1' &&
        item.teamName?.toLowerCase() === team?.toLowerCase()
    );

    return {
      otype: matchedBet?.otype || '',
      totalBetAmount: matchedBet?.totalBetAmount || '',
      totalPrice: matchedBet?.totalPrice || '',
      teamName: matchedBet?.teamName || '',
    };
  };

  const handleOddsClick = (team, rate, type, sid, min, max, size) => {
    if (onBetSelect && rate) {
      // For Fancy1, it's a single item selection - pass the selected item name
      onBetSelect({
        team: team,
        odds: rate.toString(),
        type: type, // 'back' or 'lay'
        stake: '',
        //sid: sid, // Include section id
        teams: [team], // Single item - just the selected team/item name
        marketName: team,
        gameType: 'fancy1',
        maxAmount: max || 0,
        minAmount: min || 0,
        size: size || 0, // Size/price value (the number in parentheses) - note: Fancy1 uses "stake" property name
      });
    }
  };
  return (
    <div>
      <div className='text-secondary mt-1 flex items-center justify-between bg-[#18adc5] p-1'>
        <span className='text-[14px] font-bold'>Fancy1</span>
      </div>
      <div className='grid grid-cols-1 gap-0 lg:gap-2'>
        <div className=''>
          <div className='grid grid-cols-[1fr_60px_60px] border-b border-b-[#c7c8ca] lg:grid-cols-[1fr_60px_60px_60px]'>
            <div></div>
            <div className='m-[1px] flex items-center justify-center rounded-tl-xl bg-[#72bbef] p-[2px] text-[14px] font-bold text-black'>
              Back
            </div>
            <div className='m-[1px] flex items-center justify-center rounded-tr-xl bg-[#faa9ba] p-[2px] text-[14px] font-bold text-black'>
              Lay
            </div>
            <div className='hidden lg:block'></div>
          </div>
          {leftData.length > 0 ? (
            leftData.map((item) => (
              <React.Fragment key={item.id}>
                <div className='grid grid-cols-[1fr_60px_60px] border-b border-b-[#c7c8ca] hover:bg-[#f7f7f7] lg:grid-cols-[1fr_60px_60px_60px]'>
                  <div className='ml-2 flex flex-col justify-center text-[13px] font-[400] text-black'>
                    <div>{item.label}</div>
                    {(() => {
                      if (!localStorage.getItem('auth')) return null;
                      const { otype, totalBetAmount, totalPrice, teamName } =
                        getBetDetails(item.label);
                      const existingBet =
                        (otype && totalBetAmount) || (totalPrice && teamName);

                      if (existingBet) {
                        const displayValue =
                          otype === 'back' ? totalBetAmount : totalPrice;
                        return (
                          <div className='flex gap-1 text-[11px]'>
                            {displayValue && (
                              <span className='flex items-center gap-0.5 text-red-500'>
                                <FaArrowRight />
                                {displayValue}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div
                    className={`m-[1px] flex min-h-[36px] flex-col items-center justify-center rounded-[3px] bg-[#72bbef] ${item.no.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                    onClick={() =>
                      item.no.rate &&
                      handleOddsClick(
                        item.label,
                        item.no.rate,
                        'back',
                        item.sid,
                        item.min,
                        item.max,
                        item.no.stake
                      )
                    }
                  >
                    {item.no.rate ? (
                      <>
                        <span className='text-[14px] leading-none font-bold text-black'>
                          {item.no.rate}
                        </span>
                        <span className='pt-[1px] text-[10px] leading-none font-[100] text-black'>
                          {item.no.stake}
                        </span>
                      </>
                    ) : (
                      <span className='text-[15px] font-bold text-black'>
                        -
                      </span>
                    )}
                  </div>

                  <div
                    className={`m-[1px] flex min-h-[36px] flex-col items-center justify-center rounded-[3px] bg-[#faa9ba] ${item.yes.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                    onClick={() =>
                      item.yes.rate &&
                      handleOddsClick(
                        item.label,
                        item.yes.rate,
                        'lay',
                        item.sid,
                        item.min,
                        item.max,
                        item.yes.stake
                      )
                    }
                  >
                    {item.yes.rate ? (
                      <>
                        <span className='text-[14px] leading-none font-bold text-black'>
                          {item.yes.rate}
                        </span>
                        <span className='pt-[1px] text-[10px] leading-none font-[100] text-black'>
                          {item.yes.stake}
                        </span>
                      </>
                    ) : (
                      <span className='text-[15px] font-bold text-black'>
                        -
                      </span>
                    )}
                  </div>

                  <div className='hidden flex-col items-center justify-center lg:flex'>
                    <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                      Min:{item.min}
                    </span>
                    <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                      Max:{item.max}
                    </span>
                  </div>
                </div>
                {renderInlineBetSlip(item)}
              </React.Fragment>
            ))
          ) : (
            <div className='py-4 text-center text-gray-500'>
              No data available
            </div>
          )}
        </div>
        <div className=''>
          <div className='grid grid-cols-[1fr_60px_60px] border-b border-b-[#c7c8ca] lg:grid-cols-[1fr_60px_60px_60px]'>
            <div></div>
            <div className='m-[1px] hidden items-center justify-center rounded-tl-xl bg-[#72bbef] p-[2px] text-[14px] font-bold text-black lg:flex'>
              Back
            </div>
            <div className='m-[1px] hidden items-center justify-center rounded-tr-xl bg-[#faa9ba] p-[2px] text-[14px] font-bold text-black lg:flex'>
              Lay
            </div>
            <div></div>
          </div>
          {rightData.length > 0 ? (
            rightData.map((item) => (
              <React.Fragment key={item.id}>
                <div className='grid grid-cols-[1fr_60px_60px] border-b border-b-[#c7c8ca] hover:bg-[#f7f7f7] lg:grid-cols-[1fr_60px_60px_60px]'>
                  <div className='ml-2 flex flex-col justify-center text-[13px] font-[400] text-black'>
                    <div>{item.label}</div>
                    {(() => {
                      if (!localStorage.getItem('auth')) return null;
                      const { otype, totalBetAmount, totalPrice, teamName } =
                        getBetDetails(item.label);
                      const existingBet =
                        (otype && totalBetAmount) || (totalPrice && teamName);

                      if (existingBet) {
                        const displayValue =
                          otype === 'back' ? totalBetAmount : totalPrice;
                        return (
                          <div className='flex gap-1 text-[11px]'>
                            {displayValue && (
                              <span className='flex items-center gap-0.5 text-red-500'>
                                <FaArrowRight />
                                {displayValue}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div
                    className={`m-[1px] flex min-h-[36px] flex-col items-center justify-center rounded-[3px] bg-[#72bbef] ${item.no.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                    onClick={() =>
                      item.no.rate &&
                      handleOddsClick(
                        item.label,
                        item.no.rate,
                        'back',
                        item.sid,
                        item.min,
                        item.max,
                        item.no.stake
                      )
                    }
                  >
                    {item.no.rate ? (
                      <>
                        <span className='text-[14px] leading-none font-bold text-black'>
                          {item.no.rate}
                        </span>
                        <span className='pt-[1px] text-[10px] leading-none font-[100] text-black'>
                          {item.no.stake}
                        </span>
                      </>
                    ) : (
                      <span className='text-[15px] font-bold text-black'>
                        -
                      </span>
                    )}
                  </div>

                  <div
                    className={`m-[1px] flex min-h-[36px] flex-col items-center justify-center rounded-[3px] bg-[#faa9ba] ${item.yes.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                    onClick={() =>
                      item.yes.rate &&
                      handleOddsClick(
                        item.label,
                        item.yes.rate,
                        'lay',
                        item.sid,
                        item.min,
                        item.max,
                        item.yes.stake
                      )
                    }
                  >
                    {item.yes.rate ? (
                      <>
                        <span className='text-[14px] leading-none font-bold text-black'>
                          {item.yes.rate}
                        </span>
                        <span className='pt-[1px] text-[10px] leading-none font-[100] text-black'>
                          {item.yes.stake}
                        </span>
                      </>
                    ) : (
                      <span className='text-[15px] font-bold text-black'>
                        -
                      </span>
                    )}
                  </div>

                  <div className='hidden flex-col items-center justify-center lg:flex'>
                    <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                      Min:{item.min}
                    </span>
                    <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                      Max:{item.max}
                    </span>
                  </div>
                </div>
                {renderInlineBetSlip(item)}
              </React.Fragment>
            ))
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Fancy1;
