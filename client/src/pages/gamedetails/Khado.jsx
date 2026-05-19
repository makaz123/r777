import React, { useMemo } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import PlaceBet from './PlaceBet';
import { useTranslation } from '../../context/LanguageContext';

function Khado({
  onBetSelect,
  khadoData,
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
  console.log('khadoData from khado', khadoData);

  // Helper function to format max value (handle numbers and strings like "2L")
  const formatMax = (max) => {
    if (typeof max === 'string') return max;
    if (max >= 100000) return `${(max / 100000).toFixed(0)}L`;
    if (max >= 1000) return `${(max / 1000).toFixed(0)}k`;
    return max;
  };

  // Transform API data to component format
  const transformedData = useMemo(() => {
    if (!khadoData || khadoData.length === 0) {
      return [];
    }

    return khadoData.map((item, index) => {
      // Get back odds (Khado only shows Back column)
      const backOdd = item.odds?.find((odd) => odd.otype === 'back');

      return {
        id: index + 1,
        label: item.team || `Item ${index + 1}`,
        no:
          backOdd && backOdd.odds > 0
            ? {
                rate: backOdd.odds,
                size: backOdd.size || 0,
              }
            : { rate: null, size: null },
        min: item.min || 0,
        max: formatMax(item.max || 0),
        sid: item.sid,
        status: item.status, // Status from API
      };
    });
  }, [khadoData]);

  // Get bet details from pending bets
  const getBetDetails = (team) => {
    const matchedBet = pendingBetAmounts?.find(
      (item) =>
        item.gameType === 'khado' &&
        item.teamName?.toLowerCase() === team?.toLowerCase()
    );

    return {
      otype: matchedBet?.otype || '',
      totalBetAmount: matchedBet?.totalBetAmount || '',
      totalPrice: matchedBet?.totalPrice || '',
      teamName: matchedBet?.teamName || '',
    };
  };

  const handleOddsClick = (team, rate, sid, min, max, size) => {
    if (onBetSelect && rate) {
      // For Khado, it's a single item selection - pass the selected item name
      onBetSelect({
        team: team,
        odds: rate.toString(),
        type: 'back',
        stake: '',
        // sid: sid, // Include section id
        teams: [team], // Single item - just the selected team/item name
        marketName: team,
        gameType: 'khado',
        maxAmount: max || 0,
        minAmount: min || 0,
        size: size || 0, // Size/price value (the number in parentheses)
      });
    }
  };
  return (
    <div>
      <div className='text-secondary mt-1 flex items-center justify-between bg-[#18adc5] p-1'>
        <span className='text-[14px] font-bold'>Khado</span>
      </div>
      <div className=''>
        <div className='grid grid-cols-[1fr_60px] border-b border-b-[#c7c8ca] lg:grid-cols-[1fr_60px_60px]'>
          <div></div>
          <div className='m-[1px] flex items-center justify-center rounded-t-xl bg-[#72bbef] p-[2px] text-[14px] font-bold text-black'>
            {t('back', 'Back')}
          </div>

          <div className='hidden lg:block'></div>
        </div>
        {transformedData.length > 0 ? (
          transformedData.map((item) => {
            const hasStatus = item.status && item.status.trim() !== '';
            const isKhadoBet = selectedBet?.gameType === 'khado';
            const showInlineBetSlip =
              !!selectedBet &&
              isKhadoBet &&
              (selectedBet?.team?.toLowerCase() === item.label?.toLowerCase() ||
                selectedBet?.marketName?.toLowerCase() ===
                  item.label?.toLowerCase());

            return (
              <React.Fragment key={item.id}>
                <div className='grid grid-cols-[1fr_60px] border-b border-b-[#c7c8ca] hover:bg-[#f7f7f7] lg:grid-cols-[1fr_60px_60px]'>
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
                    <div className='col-span-1 flex min-h-[36px] items-center justify-center bg-[#4b4b4b] lg:col-span-2'>
                      <span className='text-[14px] font-bold tracking-wide text-red-600 lg:text-[16px]'>
                        {item.status}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`m-[1px] flex min-h-[36px] flex-col items-center justify-center rounded-[3px] bg-[#72bbef] ${item.no.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                        onClick={() =>
                          item.no.rate &&
                          handleOddsClick(
                            item.label,
                            item.no.rate,
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
                {showInlineBetSlip && (
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
                )}
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
  );
}

export default Khado;
