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

  // Helper function to format odds (convert integer odds to decimal)
  const formatOdds = (odds) => {
    if (!odds || odds === 0) return null;
    // If odds is already a decimal (< 10), return as is
    if (odds < 10) {
      return odds.toFixed(2);
    }
    // If odds is an integer (>= 10), divide by 100
    return (odds / 100).toFixed(2);
  };

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

  // Split data into left and right columns
  const mid = Math.ceil(transformedData.length / 2);
  const leftData = transformedData.slice(0, mid);
  const rightData = transformedData.slice(mid);

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
          <div className='grid grid-cols-[1fr_60px_60px] border-b border-b-[#c7c8ca] lg:grid-cols-[1fr_60px_60px_60px]'>
            <div></div>
            <div className='m-[1px] flex items-center justify-center rounded-tl-xl bg-[#faa9ba] p-[2px] text-[14px] font-bold text-black'>
              {t('no', 'No')}
            </div>
            <div className='m-[1px] flex items-center justify-center rounded-tr-xl bg-[#72bbef] p-[2px] text-[14px] font-bold text-black'>
              {t('yes', 'Yes')}
            </div>
            <div className='hidden lg:block'></div>
          </div>
          {leftData.length > 0 ? (
            leftData.map((item) => {
              const hasStatus = item.status && item.status.trim() !== '';

              return (
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

                    {hasStatus ? (
                      <div className='col-span-2 flex min-h-[36px] items-center justify-center bg-[#4b4b4b] lg:col-span-3'>
                        <span className='text-[14px] font-bold tracking-wide text-red-600 lg:text-[16px]'>
                          {item.status}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`m-[1px] flex min-h-[36px] flex-col items-center justify-center rounded-[3px] bg-[#faa9ba] ${item.no.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
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
                          className={`m-[1px] flex min-h-[36px] flex-col items-center justify-center rounded-[3px] bg-[#72bbef] ${item.yes.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
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

                        <div className='hidden flex-col items-center justify-center lg:flex'>
                          <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                            {t('min', 'Min')}:{item.min}
                          </span>
                          <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                            {t('max', 'Max')}:{item.max}
                          </span>
                        </div>
                      </>
                    )}
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
        <div className=''>
          <div className='grid grid-cols-[1fr_60px_60px] border-b border-b-[#c7c8ca] lg:grid-cols-[1fr_60px_60px_60px]'>
            <div></div>
            <div className='m-[1px] hidden items-center justify-center rounded-tl-xl bg-[#faa9ba] p-[2px] text-[14px] font-bold text-black lg:flex'>
              {t('no', 'No')}
            </div>
            <div className='m-[1px] hidden items-center justify-center rounded-tr-xl bg-[#72bbef] p-[2px] text-[14px] font-bold text-black lg:flex'>
              {t('yes', 'Yes')}
            </div>
            <div></div>
          </div>
          {rightData.length > 0 ? (
            rightData.map((item) => {
              const hasStatus = item.status && item.status.trim() !== '';

              return (
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

                    {hasStatus ? (
                      <div className='col-span-2 flex min-h-[36px] items-center justify-center bg-[#4b4b4b] lg:col-span-3'>
                        <span className='text-[14px] font-bold tracking-wide text-red-600 lg:text-[16px]'>
                          {item.status}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`m-[1px] flex min-h-[36px] flex-col items-center justify-center rounded-[3px] bg-[#faa9ba] ${item.no.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
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
                          className={`m-[1px] flex min-h-[36px] flex-col items-center justify-center rounded-[3px] bg-[#72bbef] ${item.yes.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
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

                        <div className='hidden flex-col items-center justify-center lg:flex'>
                          <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                            {t('min', 'Min')}:{item.min}
                          </span>
                          <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                            {t('max', 'Max')}:{item.max}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {renderInlineBetSlip(item)}
                </React.Fragment>
              );
            })
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Normal;
