import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaArrowRight, FaCheck } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../redux/api';
import PlaceBet from './PlaceBet';
import { useTranslation } from '../../context/LanguageContext';
import {
  getPendingBetAmo,
  getPendingBet,
  executeCashout,
  clearCashoutValues,
  updateCashoutValues,
} from '../../redux/reducer/betReducer';
import { getUser } from '../../redux/reducer/authReducer';

function MatchOdds({
  onBetSelect,
  matchOddsList,
  pendingBetAmounts,
  selectedBet,
  gameid,
  team1,
  team2,
  eventName: matchEventName,
  gameName,
  sid: sidProp,
  onBetChange,
  onClose,
}) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { userInfo } = useSelector((state) => state.auth);
  const { eventName, cashoutValues, cashoutLoading, cashoutPL } = useSelector(
    (state) => state.bet
  );

  const [showCashoutOptions, setShowCashoutOptions] = useState(false);
  const [cashedOutBetIds, setCashedOutBetIds] = useState(new Set());

  useEffect(() => {
    if (!gameid) return;
    if (!localStorage.getItem('auth')) return;
    dispatch(getPendingBetAmo(gameid));
    dispatch(getPendingBet(gameid));
  }, [dispatch, gameid]);

  useEffect(() => {
    if (selectedBet) {
      setShowCashoutOptions(false);
      dispatch(clearCashoutValues());
    }
  }, [selectedBet, dispatch]);

  const backBg = ['bg-[#72bbef7f]', 'bg-[#72bbefbf]', 'bg-[#72bbef]'];
  const layBg = ['bg-[#faa9ba]', 'bg-[#faa9babf]', 'bg-[#faa9ba7f]'];

  // Transform API data similar to MatchOdd component
  const oddsData = matchOddsList?.[0]?.section?.length
    ? matchOddsList[0].section.map((sec) => ({
        team: sec.nat,
        sid: sec.sid,
        odds: sec.odds,
        max: sec.max,
        min: sec.min,
        mname:
          matchOddsList[0].mname === 'MATCH_ODDS' ? 'Match Odds' : 'Winner',
        status: matchOddsList[0].status,
      }))
    : [];

  const CASHOUT_GAME_TYPES = ['Match Odds', 'MATCH_ODDS'];

  const marketBetsForCashout =
    Array.isArray(eventName) && oddsData?.[0]?.mname && gameid
      ? eventName.filter(
          (b) =>
            String(b.gameId) === String(gameid) &&
            CASHOUT_GAME_TYPES.includes(b.gameType) &&
            !b.isCashoutHedge &&
            !b.isCashedOut &&
            !cashedOutBetIds.has(String(b.betId || b._id))
        )
      : [];

  const uniqueMarketBetsForCashout = marketBetsForCashout.filter(
    (bet, index, arr) =>
      index ===
      arr.findIndex(
        (b) => String(b.betId || b._id) === String(bet.betId || bet._id)
      )
  );

  const hasCashoutAvailable = uniqueMarketBetsForCashout.length > 0;

  const marketCashoutPL = cashoutPL?.[oddsData?.[0]?.mname] || 0;

  const mergedCashoutValue =
    uniqueMarketBetsForCashout.reduce((sum, bet) => {
      const id = bet.betId || bet._id;
      const val = cashoutValues[id];
      return val !== undefined ? sum + val : sum;
    }, 0) + (marketCashoutPL || 0);

  const hasMergedValue = uniqueMarketBetsForCashout.some((bet) => {
    const id = bet.betId || bet._id;
    return cashoutValues[id] !== undefined;
  });

  const fetchCashoutQuotes = async () => {
    const betIds = uniqueMarketBetsForCashout
      .map((b) => b.betId || b._id)
      .filter(Boolean);

    if (betIds.length === 0) return;

    const results = await Promise.allSettled(
      betIds.map((betId) =>
        api.post('/user/cashout/quote', { betId }, { withCredentials: true })
      )
    );

    const freshValues = {};
    for (const result of results) {
      if (
        result.status === 'fulfilled' &&
        result.value?.data?.cashoutAvailable
      ) {
        freshValues[result.value.data.betId] = result.value.data.cashoutValue;
      }
    }

    if (Object.keys(freshValues).length > 0) {
      dispatch(
        updateCashoutValues(
          Object.entries(freshValues).map(([betId, cashoutValue]) => ({
            betId,
            cashoutValue,
          }))
        )
      );
    }
  };

  const handleCashOutClick = async () => {
    if (!hasCashoutAvailable || cashoutLoading) return;

    const teams = oddsData.map((item) => item.team);
    if (teams.length < 2) return;

    const teamA = teams[0];
    const teamB = teams[1];
    const detailsA = getBetDetails(teamA, matchOddsList?.[0]?.mname);
    const detailsB = getBetDetails(teamB, matchOddsList?.[0]?.mname);

    // Calculate current net outcome for both teams
    const plA = detailsA.netOutcome !== null ? detailsA.netOutcome : 0;
    const plB = detailsB.netOutcome !== null ? detailsB.netOutcome : 0;

    // If balanced, do nothing
    if (Math.abs(plA - plB) < 0.1) {
      toast.error('Bets are already balanced!');
      return;
    }

    // Team with highest PL is the one we want to LAY
    const teamToBet = plA > plB ? teamA : teamB;
    const pHigh = Math.max(plA, plB);
    const pLow = Math.min(plA, plB);

    const teamData = oddsData.find((t) => t.team === teamToBet);
    if (!teamData) return;

    // Find the best LAY odds (highest lay odds available > 0)
    const layOdds = teamData.odds.filter(
      (o) => o.otype === 'lay' && o.odds > 0
    );
    if (layOdds.length === 0) {
      toast.error('No lay odds available for cashout');
      return;
    }

    const bestLayOdds = Math.max(...layOdds.map((o) => o.odds));
    const bestLayItem = layOdds.find((o) => o.odds === bestLayOdds);

    const X = parseFloat(bestLayOdds);
    if (isNaN(X) || X <= 0) return;

    // Cashout Formula for Match Odds: S = (pHigh - pLow) / X
    let calculatedStake = (pHigh - pLow) / X;
    calculatedStake = Math.round(calculatedStake * 100) / 100;

    if (calculatedStake <= 0) {
      toast.error('Already balanced or no cashout needed.');
      return;
    }

    const marketName = matchOddsList?.[0]?.mname || 'MATCH_ODDS';
    const gameType =
      marketName === 'MATCH_ODDS' || marketName === 'TOURNAMENT_WINNER'
        ? 'Match Odds'
        : 'Winner';

    onBetSelect({
      team: teamToBet,
      odds: X.toString(),
      type: 'lay',
      oname: bestLayItem?.oname || '',
      stake: calculatedStake.toString(),
      teams: teams,
      marketName: marketName,
      gameType: gameType,
      maxAmount: matchOddsList?.[0]?.max || matchOddsList?.[0]?.maxb || 0,
      minAmount: matchOddsList?.[0]?.min || 0,
    });

    setShowCashoutOptions(false);
  };

  // Helper function to format stake/size
  const formatStake = (size) => {
    if (!size || size === 0) return '0';
    if (size < 1000) return size.toFixed(2);
    return `${(size / 1000).toFixed(1)}k`;
  };

  const getBetDetails = (team, marketName) => {
    const mname = marketName === 'MATCH_ODDS' ? 'Match Odds' : marketName;
    const mCashoutPL = cashoutPL?.[mname] || 0;

    const marketBets =
      pendingBetAmounts?.filter(
        (item) => item.gameType === 'Match Odds' || item.gameType === marketName
      ) || [];

    const matchedTeamBet = marketBets.find(
      (item) => item.teamName?.toLowerCase() === team?.toLowerCase()
    );
    const otherTeamBet = marketBets[0];

    const otype = matchedTeamBet?.otype || otherTeamBet?.otype || '';
    const totalBetAmount =
      matchedTeamBet?.totalBetAmount || otherTeamBet?.totalBetAmount || '';
    const totalPrice =
      matchedTeamBet?.totalPrice || otherTeamBet?.totalPrice || '';
    const teamName = matchedTeamBet?.teamName || otherTeamBet?.teamName || '';

    if (marketBets.length === 0) {
      if (mCashoutPL) {
        return {
          isHedged: true,
          netOutcome: Math.round(mCashoutPL * 100) / 100,
          otype: '',
          totalBetAmount: '',
          totalPrice: '',
          teamName: '',
        };
      }
      return {
        isHedged: false,
        netOutcome: null,
        otype,
        totalBetAmount,
        totalPrice,
        teamName,
      };
    }

    let netOutcome = 0;
    marketBets.forEach((bet) => {
      const isBetOnThisTeam =
        bet.teamName?.toLowerCase() === team?.toLowerCase();
      const betAmt = parseFloat(bet.totalBetAmount) || 0;
      const stake = parseFloat(bet.totalPrice) || 0;

      if (bet.otype === 'back') {
        netOutcome += isBetOnThisTeam ? betAmt : -stake;
      } else {
        netOutcome += isBetOnThisTeam ? -stake : betAmt;
      }
    });

    netOutcome += mCashoutPL;

    return {
      isHedged: true,
      netOutcome: Math.round(netOutcome * 100) / 100,
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

    const { netOutcome } = getBetDetails(team, matchOddsList?.[0]?.mname);
    let newPL = netOutcome !== null ? netOutcome : 0;

    const isMatchedTeam = team?.toLowerCase() === selectedTeam?.toLowerCase();

    if (selectedType === 'back') {
      if (isMatchedTeam) {
        newPL += stakeNum * (oddsNum - 1);
      } else {
        newPL -= stakeNum;
      }
    } else if (selectedType === 'lay') {
      if (isMatchedTeam) {
        newPL -= stakeNum * (oddsNum - 1);
      } else {
        newPL += stakeNum;
      }
    }

    return {
      value: newPL,
      color: newPL >= 0 ? 'green' : 'red',
    };
  };

  const handleOddsClick = (team, rate, type, sid, oname) => {
    if (onBetSelect && rate) {
      // Extract all teams from this matchOddsList
      const allTeams = oddsData.map((item) => item.team);

      const marketName = matchOddsList?.[0]?.mname || 'MATCH_ODDS';
      const gameType =
        marketName === 'MATCH_ODDS' || marketName === 'TOURNAMENT_WINNER'
          ? 'Match Odds'
          : 'Winner';

      onBetSelect({
        team: team,
        odds: rate.toString(),
        type: type, // 'back' or 'lay'
        oname: oname || '',
        stake: '',
        //sid: sid, // Include section id
        teams: allTeams, // Add all teams for MatchOdds
        marketName: marketName,
        gameType: gameType,
        maxAmount: matchOddsList?.[0]?.max || matchOddsList?.[0]?.maxb || 0,
        minAmount: matchOddsList?.[0]?.min || 0,
      });
    }
  };

  // Get max value from API
  const maxValue = matchOddsList?.[0]?.max || matchOddsList?.[0]?.maxb || 0;

  return (
    <div>
      <div className='text-secondary mt-1 flex items-center justify-between bg-[#18adc5] p-1'>
        <span className='text-[13px] font-bold lg:text-[14px]'>
          {t('match_odds', 'Match Odds')}
        </span>
        <div>
          {hasCashoutAvailable ? (
            <button
              onClick={handleCashOutClick}
              className='cursor-pointer bg-[#198754] p-1 font-[400] text-white'
            >
              {t('cashout', 'Cashout')}
            </button>
          ) : (
            <button
              disabled
              className='cursor-not-allowed bg-[#198754] p-1 font-[400] text-white opacity-60'
            >
              {t('cashout', 'Cashout')}
            </button>
          )}
          <span className='ml-2 hidden md:inline-block'>
            {t('max', 'Max')}:{maxValue}
          </span>
        </div>
      </div>
      <div className='grid grid-cols-[1fr_70px_70px] border-b border-b-[#c7c8ca] md:grid-cols-[1fr_70px_70px_70px_70px_70px_70px]'>
        <div className='ml-2 flex items-center text-[12px] font-bold text-[#097c93]'>
          <span className='block text-gray-400 md:hidden'>
            {t('max', 'Max')}:{maxValue}
          </span>
        </div>
        <div className='hidden md:block' />
        <div className='hidden md:block' />
        <div className='m-[1px] flex items-center justify-center rounded-tl-xl bg-[#72bbef] p-[2px] text-[14px] font-bold text-black'>
          {t('back', 'Back')}
        </div>
        <div className='m-[1px] flex items-center justify-center rounded-tr-xl bg-[#faa9ba] p-[2px] text-[14px] font-bold text-black'>
          {t('lay', 'Lay')}
        </div>
        <div className='hidden md:block' />
        <div className='hidden md:block' />
      </div>

      {oddsData.length > 0 ? (
        oddsData.map(({ team, odds, sid }, teamIndex) => {
          // Separate back and lay odds
          const backOdds = odds
            .filter((odd) => odd.otype === 'back' && odd.odds > 0)
            .slice(0, 3); // Take only first 3

          const layOdds = odds
            .filter((odd) => odd.otype === 'lay' && odd.odds > 0)
            .slice(0, 3); // Take only first 3

          const primaryBack = backOdds[2] ?? backOdds[1] ?? backOdds[0];
          const primaryLay = layOdds[0] ?? layOdds[1] ?? layOdds[2];

          const renderOddsCell = (item, type, bgClass) => {
            const formattedOdds = item ? item.odds : null;
            return (
              <div
                className={`${bgClass} m-[1px] flex min-h-[36px] max-w-[100%] flex-col items-center justify-center rounded-[3px] ${formattedOdds ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                onClick={() =>
                  formattedOdds &&
                  handleOddsClick(team, formattedOdds, type, sid, item?.oname)
                }
              >
                {formattedOdds ? (
                  <>
                    <span className='text-[14px] leading-none font-bold text-black lg:text-[14px]'>
                      {formattedOdds}
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

          const marketName = matchOddsList?.[0]?.mname || 'MATCH_ODDS';
          const isMatchOddsMarket =
            selectedBet?.gameType === 'Match Odds' ||
            selectedBet?.gameType === 'Winner' ||
            selectedBet?.marketName === 'MATCH_ODDS' ||
            selectedBet?.marketName === 'TOURNAMENT_WINNER';
          const showInlineBetSlip =
            !!selectedBet &&
            isMatchOddsMarket &&
            selectedBet?.team?.toLowerCase() === team?.toLowerCase();

          return (
            <React.Fragment key={teamIndex}>
              <div className='grid grid-cols-[1fr_70px_70px] border-b border-b-[#c7c8ca] hover:bg-[#f7f7f7] md:grid-cols-[1fr_70px_70px_70px_70px_70px_70px]'>
                {/* Team with suggestions */}
                <div className='ml-2 flex items-center justify-between truncate text-[13px] font-bold text-black lg:text-[14px]'>
                  <div className='flex flex-col'>
                    <div className='flex items-center'>
                      <span>{team}</span>
                    </div>
                    {(() => {
                      if (!userInfo) return null;
                      const {
                        otype,
                        totalBetAmount,
                        totalPrice,
                        teamName,
                        isHedged,
                        netOutcome,
                      } = getBetDetails(team, matchOddsList?.[0]?.mname);
                      const isMatchedTeam =
                        teamName?.toLowerCase() === team?.toLowerCase();
                      const existingBet =
                        isHedged ||
                        (otype && totalBetAmount) ||
                        (totalPrice && teamName && isMatchedTeam);

                      if (existingBet) {
                        let betColor;
                        let displayValue;

                        if (isHedged && netOutcome !== null) {
                          displayValue = netOutcome;
                          betColor = netOutcome >= 0 ? 'green' : 'red';
                        } else {
                          betColor =
                            otype === 'lay'
                              ? isMatchedTeam
                                ? 'red'
                                : 'green'
                              : otype === 'back'
                                ? isMatchedTeam
                                  ? 'green'
                                  : 'red'
                                : 'green';

                          displayValue = (() => {
                            if (otype === 'lay') {
                              return isMatchedTeam
                                ? totalPrice
                                : totalBetAmount;
                            } else if (otype === 'back') {
                              return isMatchedTeam
                                ? totalBetAmount
                                : totalPrice;
                            }
                            return '';
                          })();
                        }

                        return (
                          <div
                            className='flex gap-1'
                            style={{ color: betColor }}
                          >
                            {displayValue !== '' &&
                              displayValue !== null &&
                              displayValue !== undefined && (
                                <span className='flex items-center gap-0.5 text-[11px]'>
                                  <FaArrowRight />
                                  {parseFloat(displayValue).toFixed(2)}
                                </span>
                              )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Suggestion Value on the right */}
                  {(() => {
                    if (!userInfo) return null;
                    const isMatchOddsBet =
                      selectedBet?.gameType === 'Match Odds' ||
                      selectedBet?.gameType === 'Winner' ||
                      selectedBet?.marketName === 'MATCH_ODDS' ||
                      selectedBet?.marketName === 'TOURNAMENT_WINNER';

                    if (isMatchOddsBet && selectedBet?.stake) {
                      const suggestion = calculateSuggestion(
                        team,
                        selectedBet.team,
                        selectedBet.type,
                        selectedBet.stake,
                        selectedBet.odds
                      );

                      if (suggestion) {
                        return (
                          <span
                            style={{ color: suggestion.color }}
                            className='mr-2 text-[12px] font-bold'
                          >
                            {suggestion.value < 0 ? '-' : ''}
                            {Math.abs(suggestion.value).toFixed(2)}
                          </span>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
                {/* Mobile: primary back & lay */}
                <div className='md:hidden'>
                  {renderOddsCell(primaryBack, 'back', 'bg-[#72bbef]')}
                </div>
                <div className='md:hidden'>
                  {renderOddsCell(primaryLay, 'lay', 'bg-[#faa9ba]')}
                </div>

                {/* Desktop: BACK - 3 slots */}
                {[0, 1, 2].map((i) => {
                  const backItem = backOdds[i];
                  const formattedOdds = backItem ? backItem.odds : null;
                  return (
                    <div
                      key={`back-${i}`}
                      className={`${backBg[i]} m-[1px] hidden min-h-[36px] max-w-[100%] flex-col items-center justify-center rounded-[3px] md:flex ${formattedOdds ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                      onClick={() =>
                        formattedOdds &&
                        handleOddsClick(
                          team,
                          formattedOdds,
                          'back',
                          sid,
                          backItem?.oname
                        )
                      }
                    >
                      {formattedOdds ? (
                        <>
                          <span className='text-[14px] leading-none font-bold text-black lg:text-[14px]'>
                            {formattedOdds}
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
                  const layItem = layOdds[i];
                  const formattedOdds = layItem ? layItem.odds : null;
                  return (
                    <div
                      key={`lay-${i}`}
                      className={`${layBg[i]} m-[1px] hidden min-h-[36px] max-w-[100%] flex-col items-center justify-center rounded-[3px] md:flex ${formattedOdds ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                      onClick={() =>
                        formattedOdds &&
                        handleOddsClick(
                          team,
                          formattedOdds,
                          'lay',
                          sid,
                          layItem?.oname
                        )
                      }
                    >
                      {formattedOdds ? (
                        <>
                          <span className='text-[15px] leading-none font-bold text-[#333] lg:text-[14px]'>
                            {formattedOdds}
                          </span>
                          <span className='pt-[1px] text-[11px] leading-none font-[100] text-[#333] lg:text-[10px]'>
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
                    sid={sidProp}
                    marketName={selectedBet?.marketName || marketName}
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
          {t('no_data_to_display', 'No match odds available')}
        </div>
      )}
    </div>
  );
}

export default MatchOdds;
