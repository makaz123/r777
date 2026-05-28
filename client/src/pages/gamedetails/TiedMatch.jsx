import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FaArrowRight } from 'react-icons/fa';
import PlaceBet from './PlaceBet';
import { useTranslation } from '../../context/LanguageContext';

function TiedMatch({
  onBetSelect,
  tiedMatchList,
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
  console.log('tiedmatch from tiedmatch', tiedMatchList);
  const { userInfo } = useSelector((state) => state.auth);
  const backBg = ['bg-[#72bbef7f]', 'bg-[#72bbefbf]', 'bg-[#72bbef]'];
  const layBg = ['bg-[#faa9ba]', 'bg-[#faa9babf]', 'bg-[#faa9ba7f]'];
  const [showCashoutOptions, setShowCashoutOptions] = useState(false);
  // Transform API data similar to MatchOdds/Bookmaker
  const tiedMatchData = tiedMatchList?.[0]?.section?.length
    ? tiedMatchList[0].section.map((sec) => ({
        team: sec.nat,
        sid: sec.sid,
        odds: sec.odds,
        max: sec.max,
        min: sec.min,
        mname: tiedMatchList[0].mname || 'Tied Match',
        gstatus: sec.gstatus,
        status: tiedMatchList[0].status,
      }))
    : [];

  // Helper function to format stake/size
  const formatStake = (size) => {
    if (!size || size === 0) return '0';
    if (size < 1000) return size.toFixed(0);
    return `${(size / 1000).toFixed(1)}k`;
  };

  // Get bet details from pending bets
  const getBetDetails = (team) => {
    const matchedTeamBet = pendingBetAmounts?.find(
      (item) =>
        item.gameType === 'Tied Match' &&
        item.teamName?.toLowerCase() === team?.toLowerCase()
    );

    const otherTeamBet = pendingBetAmounts?.find(
      (item) => item.gameType === 'Tied Match'
    );

    const otype = matchedTeamBet?.otype || otherTeamBet?.otype || '';
    const totalBetAmount =
      matchedTeamBet?.totalBetAmount || otherTeamBet?.totalBetAmount || '';
    const totalPrice =
      matchedTeamBet?.totalPrice || otherTeamBet?.totalPrice || '';
    const teamName = matchedTeamBet?.teamName || otherTeamBet?.teamName || '';

    return {
      otype,
      totalBetAmount,
      totalPrice,
      teamName,
    };
  };

  // Calculate profit/loss suggestion
  const calculateSuggestion = (
    team,
    selectedTeam,
    selectedType,
    stake,
    odds
  ) => {
    if (!stake || !odds || !selectedBet) return null;

    const stakeNum = parseFloat(stake);
    const oddsNum = parseFloat(odds);
    if (isNaN(stakeNum) || isNaN(oddsNum) || stakeNum === 0) return null;

    const { otype, totalBetAmount, totalPrice, teamName } = getBetDetails(team);
    const isMatchedTeam = teamName?.toLowerCase() === team?.toLowerCase();
    const existingBet =
      (otype && totalBetAmount) || (totalPrice && teamName && isMatchedTeam);

    if (!existingBet) {
      const profit =
        selectedType === 'back'
          ? stakeNum * (oddsNum - 1)
          : stakeNum * (1 - oddsNum);
      return { value: Math.abs(profit), color: profit >= 0 ? 'green' : 'red' };
    }

    let p = stakeNum;
    let x = oddsNum;
    let b = selectedType === 'lay' ? p : p * (x - 1);
    p = selectedType === 'lay' ? p * (x - 1) : p;

    const totalBetAmt = parseFloat(totalBetAmount || 0);
    const totalPrc = parseFloat(totalPrice || 0);

    if (selectedTeam?.toLowerCase() === teamName?.toLowerCase()) {
      if (selectedType === otype) {
        b = b + totalBetAmt;
        p = p + totalPrc;
        const calValue = selectedType === 'back' ? b : p;
        return {
          value: Math.abs(calValue),
          color: calValue >= 0 ? 'green' : 'red',
        };
      } else {
        if (selectedType === 'back') {
          if (totalBetAmt > p) {
            p = totalPrc - b;
            return { value: Math.abs(p), color: 'red' };
          } else {
            b = b - totalPrc;
            return { value: Math.abs(b), color: b >= 0 ? 'green' : 'red' };
          }
        } else {
          if (totalPrc >= b) {
            b = totalBetAmt - p;
            return { value: Math.abs(b), color: b >= 0 ? 'green' : 'red' };
          } else {
            p = p - totalBetAmt;
            return { value: Math.abs(p), color: 'red' };
          }
        }
      }
    } else {
      if (selectedType === otype) {
        if (selectedType === 'back') {
          if (totalPrc >= b) {
            p = totalPrc - b;
            return { value: Math.abs(p), color: 'red' };
          } else {
            b = b - totalPrc;
            return { value: Math.abs(b), color: b >= 0 ? 'green' : 'red' };
          }
        } else {
          if (totalPrc >= b) {
            b = totalBetAmt - p;
            return { value: Math.abs(b), color: b >= 0 ? 'green' : 'red' };
          } else {
            p = p - totalBetAmt;
            return { value: Math.abs(p), color: 'red' };
          }
        }
      } else {
        b = b + totalBetAmt;
        p = p + totalPrc;
        const calValue = selectedType === 'back' ? b : p;
        return {
          value: Math.abs(calValue),
          color: calValue >= 0 ? 'green' : 'red',
        };
      }
    }
  };

  const handleOddsClick = (team, rate, type, sid, oname) => {
    if (onBetSelect && rate && rate !== 0) {
      // Extract all teams/options from TiedMatch (typically YES/NO)
      const allTeams = tiedMatchData.map((item) => item.team);

      onBetSelect({
        team: team,
        odds: rate.toString(),
        type: type, // 'back' or 'lay'
        oname: oname || '',
        stake: '',
        // sid: sid, // Include section id
        teams: allTeams, // Add all options (YES/NO) for TiedMatch
        marketName: tiedMatchList?.[0]?.mname || 'Tied Match',
        gameType: 'Tied Match',
        maxAmount: tiedMatchList?.[0]?.max || tiedMatchList?.[0]?.maxb || 0,
        minAmount: tiedMatchList?.[0]?.min || 0,
      });
    }
  };

  // Get max value from API
  const maxValue = tiedMatchList?.[0]?.max || tiedMatchList?.[0]?.maxb || 0;

  return (
    <div>
      <div className='text-secondary mt-1 flex items-center justify-between bg-[#18adc5] p-1'>
        <span className='text-[13px] font-bold lg:text-[14px]'>TIED_MATCH</span>
        <div>
          <button
            disabled={!showCashoutOptions}
            className={`p-1 font-[400] text-white ${
              showCashoutOptions
                ? 'cursor-pointer rounded-[3px] bg-black px-2.5 py-0.5 text-[12px] font-[600] text-white'
                : 'cursor-not-allowed rounded-[3px] bg-[#959595] px-2.5 py-0.5 text-[12px] font-[600] text-white'
            }`}
          >
            Cashout
          </button>
          <span className='ml-2 hidden md:inline-block'>
            {t('max', 'Max')}:{maxValue}
          </span>
        </div>
      </div>
      <div className='flex border-b border-b-[#c7c8ca]'>
        <div className='ml-2 flex-1 items-center text-[12px] font-bold text-[#097c93]'>
          <span className='block text-gray-400 md:hidden'>
            {t('max', 'Max')}:{maxValue}
          </span>
        </div>
        <div className='flex w-[40%] md:w-[48%]'>
          <div className='hidden w-1/3 p-[2px] md:block' />
          <div className='hidden w-1/3 p-[2px] md:block' />
          <div className='m-[1px] flex w-1/2 items-center justify-center rounded-tl-xl bg-[#72bbef] p-[2px] text-[14px] font-bold text-black md:w-1/3'>
            {t('back', 'Back')}
          </div>
          <div className='m-[1px] flex w-1/2 items-center justify-center rounded-tr-xl bg-[#faa9ba] p-[2px] text-[14px] font-bold text-black md:w-1/3'>
            {t('lay', 'Lay')}
          </div>
          <div className='hidden w-1/3 p-[2px] md:block' />
          <div className='hidden w-1/3 p-[2px] md:block' />
        </div>
      </div>
      {tiedMatchData.length > 0 ? (
        tiedMatchData.map(({ team, odds, sid, gstatus }, teamIndex) => {
          const isSuspended = gstatus === 'SUSPENDED';
          // Get back and lay odds (Tied Match typically has only 1 back and 1 lay)
          const backOdds = odds.filter((odd) => odd.otype === 'back');
          const layOdds = odds.filter((odd) => odd.otype === 'lay');

          // Create arrays with 3 slots, filling with null for empty slots
          const backArray = [
            backOdds[2] || null,
            backOdds[1] || null,
            backOdds[0] || null,
          ];

          const layArray = [
            layOdds[0] || null,
            layOdds[1] || null,
            layOdds[2] || null,
          ];

          const primaryBack = backArray[2] ?? backArray[1] ?? backArray[0];
          const primaryLay = layArray[0] ?? layArray[1] ?? layArray[2];

          const renderOddsCell = (item, type, bgClass) => {
            const hasOdds = item && item.odds > 0;
            return (
              <div
                className={`${bgClass} m-[1px] flex min-h-[36px] w-1/2 max-w-[100%] flex-col items-center justify-center rounded-[3px] ${hasOdds ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                onClick={() =>
                  hasOdds &&
                  handleOddsClick(team, item.odds, type, sid, item?.oname)
                }
              >
                {hasOdds ? (
                  <>
                    <span className='text-[14px] leading-none font-bold text-black lg:text-[14px]'>
                      {item.odds}
                    </span>
                    <span className='pt-[1px] text-[8px] leading-none font-[100] text-black lg:text-[10px]'>
                      {formatStake(item.size)}
                    </span>
                  </>
                ) : (
                  <span className='text-[15px] font-bold text-black lg:text-[16px]'>
                    -
                  </span>
                )}
              </div>
            );
          };

          const isTiedMatchMarket =
            selectedBet?.gameType === 'Tied Match' ||
            selectedBet?.marketName === 'Tied Match';
          const showInlineBetSlip =
            !!selectedBet &&
            isTiedMatchMarket &&
            selectedBet?.team?.toLowerCase() === team?.toLowerCase();

          return (
            <React.Fragment key={teamIndex}>
              <div className='flex border-b border-b-[#c7c8ca] hover:bg-[#f7f7f7]'>
                {/* Team with suggestions */}
                <div className='ml-2 flex flex-1 flex-col justify-center truncate text-[13px] font-bold text-black lg:text-[14px]'>
                  <div>{team}</div>
                  {(() => {
                    if (!userInfo) return null;
                    // Check if selectedBet belongs to Tied Match market
                    const isTiedMatchBet =
                      selectedBet?.gameType === 'Tied Match' ||
                      selectedBet?.marketName === 'Tied Match';

                    const { otype, totalBetAmount, totalPrice, teamName } =
                      getBetDetails(team);
                    const isMatchedTeam =
                      teamName?.toLowerCase() === team?.toLowerCase();
                    const existingBet =
                      (otype && totalBetAmount) ||
                      (totalPrice && teamName && isMatchedTeam);

                    // Check if this team is the selected team
                    const isSelectedTeam =
                      selectedBet?.team?.toLowerCase() === team?.toLowerCase();

                    // Show suggestions for all teams when a bet is selected in this market
                    if (isTiedMatchBet && selectedBet?.stake) {
                      let suggestionValue = null;
                      let suggestionColor = 'green';

                      if (isSelectedTeam) {
                        // For selected team: calculate profit/loss
                        const suggestion = calculateSuggestion(
                          team,
                          selectedBet.team,
                          selectedBet.type,
                          selectedBet.stake,
                          selectedBet.odds
                        );
                        if (suggestion) {
                          suggestionValue = suggestion.value;
                          suggestionColor = suggestion.color;
                        }
                      } else {
                        // For other teams: depends on bet type
                        const stakeNum = parseFloat(selectedBet.stake);
                        if (!isNaN(stakeNum) && stakeNum > 0) {
                          if (selectedBet.type === 'back') {
                            // BACK bet: if other team wins, you lose your stake
                            suggestionValue = stakeNum;
                            suggestionColor = 'red';
                          } else {
                            // LAY bet: if other team wins (selected team loses), you profit the stake
                            suggestionValue = stakeNum;
                            suggestionColor = 'green';
                          }
                        }
                      }

                      // If there's an existing bet, combine with suggestion
                      if (existingBet) {
                        let betColor =
                          otype === 'lay'
                            ? isMatchedTeam
                              ? 'red'
                              : 'green'
                            : otype === 'back'
                              ? isMatchedTeam
                                ? 'green'
                                : 'red'
                              : 'green';

                        const displayValue = (() => {
                          if (otype === 'lay') {
                            return isMatchedTeam ? totalPrice : totalBetAmount;
                          } else if (otype === 'back') {
                            return isMatchedTeam ? totalBetAmount : totalPrice;
                          }
                          return '';
                        })();

                        return (
                          <div
                            className='flex gap-1'
                            style={{ color: betColor }}
                          >
                            {displayValue && (
                              <span className='flex items-center gap-0.5 text-[11px]'>
                                <FaArrowRight />
                                {displayValue.toFixed(2)}
                              </span>
                            )}
                            {suggestionValue !== null && (
                              <span
                                style={{ color: suggestionColor }}
                                className='text-[11px]'
                              >
                                ({suggestionValue.toFixed(2)})
                              </span>
                            )}
                          </div>
                        );
                      } else {
                        // No existing bet, just show suggestion
                        if (suggestionValue !== null) {
                          return (
                            <span
                              style={{ color: suggestionColor }}
                              className='text-[11px]'
                            >
                              ({suggestionValue.toFixed(2)})
                            </span>
                          );
                        }
                      }
                    } else if (existingBet) {
                      // Show existing bet only (no selected bet in this market)
                      let betColor =
                        otype === 'lay'
                          ? isMatchedTeam
                            ? 'red'
                            : 'green'
                          : otype === 'back'
                            ? isMatchedTeam
                              ? 'green'
                              : 'red'
                            : 'green';

                      const displayValue = (() => {
                        if (otype === 'lay') {
                          return isMatchedTeam ? totalPrice : totalBetAmount;
                        } else if (otype === 'back') {
                          return isMatchedTeam ? totalBetAmount : totalPrice;
                        }
                        return '';
                      })();

                      return (
                        <div className='flex gap-1' style={{ color: betColor }}>
                          {displayValue && (
                            <span className='flex items-center gap-0.5 text-[11px]'>
                              <FaArrowRight />
                              {displayValue.toFixed(2)}
                            </span>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>

                {/* Mobile: primary back & lay */}
                <div
                  className={`relative flex w-[40%] md:hidden md:w-[48%] ${isSuspended ? 'suspended-event' : ''}`}
                >
                  {renderOddsCell(primaryBack, 'back', 'bg-[#72bbef]')}
                  {renderOddsCell(primaryLay, 'lay', 'bg-[#faa9ba]')}
                </div>

                <div
                  className={`relative hidden w-[40%] md:flex md:w-[48%] ${isSuspended ? 'suspended-event' : ''}`}
                >
                  {/* Desktop: BACK - 3 slots */}
                  {[0, 1, 2].map((i) => {
                    const backItem = backArray[i];
                    const hasOdds = backItem && backItem.odds > 0;
                    return (
                      <div
                        key={`back-${i}`}
                        className={`${backBg[i]} m-[1px] hidden min-h-[36px] w-1/2 max-w-[100%] flex-col items-center justify-center rounded-[3px] md:flex md:w-1/3 ${hasOdds ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                        onClick={() =>
                          hasOdds &&
                          handleOddsClick(
                            team,
                            backItem.odds,
                            'back',
                            sid,
                            backItem?.oname
                          )
                        }
                      >
                        {hasOdds ? (
                          <>
                            <span className='text-[14px] leading-none font-bold text-black lg:text-[14px]'>
                              {backItem.odds}
                            </span>
                            <span className='pt-[1px] text-[8px] leading-none font-[100] text-black lg:text-[10px]'>
                              {formatStake(backItem.size)}
                            </span>
                          </>
                        ) : (
                          <span className='text-[15px] font-bold text-black lg:text-[16px]'>
                            -
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Desktop: LAY - 3 slots */}
                  {[0, 1, 2].map((i) => {
                    const layItem = layArray[i];
                    const hasOdds = layItem && layItem.odds > 0;
                    return (
                      <div
                        key={`lay-${i}`}
                        className={`${layBg[i]} m-[1px] hidden min-h-[36px] w-1/2 max-w-[100%] flex-col items-center justify-center rounded-[3px] md:flex md:w-1/3 ${hasOdds ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                        onClick={() =>
                          hasOdds &&
                          handleOddsClick(
                            team,
                            layItem.odds,
                            'lay',
                            sid,
                            layItem?.oname
                          )
                        }
                      >
                        {hasOdds ? (
                          <>
                            <span className='text-[14px] leading-none font-bold text-[#333] lg:text-[14px]'>
                              {layItem.odds}
                            </span>
                            <span className='pt-[1px] text-[8px] leading-none font-[100] text-[#333] lg:text-[10px]'>
                              {formatStake(layItem.size)}
                            </span>
                          </>
                        ) : (
                          <span className='text-[15px] font-bold text-[#333] lg:text-[16px]'>
                            -
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                    marketName={selectedBet?.marketName || 'Tied Match'}
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
          {t('no_tied_match_data_available', 'No tied match data available')}
        </div>
      )}
    </div>
  );
}

export default TiedMatch;
