import React, { useMemo } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import PlaceBet from './PlaceBet';
import { useTranslation } from '../../context/LanguageContext';

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
  const { t } = useTranslation();
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

  const allData = transformedData;

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
          <div className='flex border-b border-b-[#c7c8ca]'>
            <div className='flex-1'></div>
            <div className='flex w-[40%] items-center justify-center text-[14px] font-bold text-black md:w-[16%]'>
              <span className='w-1/2 p-[2px] text-center'>
                {t('back', 'Back')}
              </span>
              <span className='w-1/2 p-[2px] text-center'>
                {t('lay', 'Lay')}
              </span>
            </div>
            <div className='hidden w-[16%] lg:block'></div>
          </div>
          {allData.length > 0 ? (
            allData.map((item) => {
              const hasStatus = item.status && item.status.trim() !== '';
              return (
                <React.Fragment key={item.id}>
                  <div className='flex border-b border-b-[#c7c8ca] hover:bg-[#f7f7f7]'>
                    <div className='ml-2 flex w-[60%] flex-col justify-center truncate text-[14px] text-black md:w-[68%]'>
                      <div className='truncate font-bold'>{item.label}</div>
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
                      className={`relative flex w-[40%] md:w-[16%] ${hasStatus ? 'suspended-event' : ''} `}
                    >
                      <div
                        className={`m-[1px] flex min-h-[36px] w-1/2 flex-col items-center justify-center rounded-[3px] bg-[#72bbef] ${item.no.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
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
                        className={`m-[1px] flex min-h-[36px] w-1/2 flex-col items-center justify-center rounded-[3px] bg-[#faa9ba] ${item.yes.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
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
                    </div>

                    <div className='hidden w-[40%] flex-col items-end justify-center px-2 md:w-[16%] lg:flex'>
                      <span className='text-[10px] leading-4 font-bold capitalize'>
                        {t('min', 'Min')}:{item.min}
                      </span>
                      <span className='text-[10px] leading-4 font-bold'>
                        {t('max', 'Max')}:{item.max}
                      </span>
                    </div>
                  </div>
                  {renderInlineBetSlip(item)}
                </React.Fragment>
              );
            })
          ) : (
            <div className='py-4 text-center text-gray-500'>
              {t('no_data_available', 'No data available')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Fancy1;
