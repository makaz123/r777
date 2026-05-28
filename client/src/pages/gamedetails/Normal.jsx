import React, { useMemo } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import PlaceBet from './PlaceBet';
import { useTranslation } from '../../context/LanguageContext';

function Normal({
  onBetSelect,
  NormalData,
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
    const isNormalBet = selectedBet?.gameType === 'Normal';
    const isMatching =
      !!selectedBet &&
      isNormalBet &&
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
  console.log('NormalData from normal', NormalData);

  // Transform API data to component format
  const transformedData = useMemo(() => {
    if (!NormalData || NormalData.length === 0) {
      return [];
    }

    return NormalData.map((item, index) => {
      // Get back and lay odds
      const backOdd = item.odds?.find((odd) => odd.otype === 'back');
      const layOdd = item.odds?.find((odd) => odd.otype === 'lay');

      return {
        id: index + 1,
        label: item.team || `Item ${index + 1}`,
        no: layOdd
          ? {
              rate: layOdd.odds,
              size: layOdd.size || 0,
              originalOdds: layOdd.odds,
            }
          : { rate: null, size: 0 },
        yes: backOdd
          ? {
              rate: backOdd.odds,
              size: backOdd.size || 0,
              originalOdds: backOdd.odds,
            }
          : { rate: null, size: 0 },
        min: item.min || 0,
        max: item.max || 0,
        sid: item.sid,
        gstatus: item.status,
        status: item.status, // Status from API
      };
    });
  }, [NormalData]);

  // Show everything in a single list (no left/right grouping)
  const allData = transformedData;

  // Get bet details from pending bets
  const getBetDetails = (team) => {
    const matchedBet = pendingBetAmounts?.find(
      (item) =>
        item.gameType === 'Normal' &&
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
      // For Normal, it's a single item selection - pass the selected item name
      onBetSelect({
        team: team,
        odds: rate.toString(),
        type: type, // 'back' (yes) or 'lay' (no)
        stake: '',
        //sid: sid, // Include section id
        teams: [team], // Single item - just the selected team/item name
        marketName: team,
        gameType: 'Normal',
        maxAmount: max || 0,
        minAmount: min || 0,
        size: size || 0, // Size/price value (the number in parentheses)
      });
    }
  };
  return (
    <div>
      <div className='text-secondary mt-1 flex items-center justify-between bg-[#18adc5] p-1'>
        <span className='text-[14px] font-bold'>Normal</span>
      </div>
      <div className='grid grid-cols-1 gap-0 lg:gap-2'>
        <div className=''>
          <div className='flex border-b border-b-[#c7c8ca]'>
            <div className='flex-1'></div>
            <div className='flex w-[40%] items-center justify-center text-[14px] font-bold text-black md:w-[16%]'>
              <span className='w-1/2 p-[2px] text-center'>{t('no', 'No')}</span>
              <span className='w-1/2 p-[2px] text-center'>
                {t('yes', 'Yes')}
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
                        className={`m-[1px] flex min-h-[36px] w-1/2 flex-col items-center justify-center rounded-[3px] bg-[#faa9ba] ${item.no.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                        onClick={() =>
                          item.no.rate &&
                          handleOddsClick(
                            item.label,
                            item.no.rate,
                            'lay',
                            item.sid,
                            item.min,
                            item.max,
                            item.no.size
                          )
                        }
                      >
                        {item.no.rate ? (
                          <>
                            <span className='text-[14px] leading-none font-bold text-black'>
                              {item.no.rate}
                            </span>
                            <span className='pt-[1px] text-[10px] leading-none font-[100] text-black'>
                              {item.no.size}
                            </span>
                          </>
                        ) : (
                          <span className='text-[15px] font-bold text-black'>
                            -
                          </span>
                        )}
                      </div>
                      <div
                        className={`m-[1px] flex min-h-[36px] w-1/2 flex-col items-center justify-center rounded-[3px] bg-[#72bbef] ${item.yes.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                        onClick={() =>
                          item.yes.rate &&
                          handleOddsClick(
                            item.label,
                            item.yes.rate,
                            'back',
                            item.sid,
                            item.min,
                            item.max,
                            item.yes.size
                          )
                        }
                      >
                        {item.yes.rate ? (
                          <>
                            <span className='text-[14px] leading-none font-bold text-black'>
                              {item.yes.rate}
                            </span>
                            <span className='pt-[1px] text-[10px] leading-none font-[100] text-black'>
                              {item.yes.size}
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

export default Normal;
