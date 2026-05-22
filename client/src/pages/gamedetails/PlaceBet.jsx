// import React, { useState, useEffect } from 'react'
// import { useDispatch, useSelector } from 'react-redux'
// import { createBet, createfancyBet, getPendingBetAmo, messageClear } from '../../redux/reducer/betReducer'
// import { getUser } from '../../redux/reducer/authReducer'
// import { toast } from 'react-toastify'

// function PlaceBet({
//   selectedBet,
//   onBetChange,
//   onClose,
//   isMobile = false,
//   team1,
//   team2,
//   gameId,
//   eventName,
//   marketName,
//   gameType,
//   gameName = 'Cricket Game',
//   maxAmount,
//   minAmount,
//   fancyScore
// }) {
//   console.log("selectedBet",selectedBet);
//   const dispatch = useDispatch()
//   const { loading, errorMessage, successMessage } = useSelector((state) => state.bet)

//   const [stake, setStake] = useState('')
//   const [odds, setOdds] = useState(selectedBet?.odds || '')
//   const [betFor, setBetFor] = useState(selectedBet?.team || '')
//   const [betType, setBetType] = useState(selectedBet?.type || '') // 'back' or 'lay'
//   const prevBetKeyRef = React.useRef('')

//   useEffect(() => {
//     if (selectedBet) {
//       // Create a unique key for the bet selection (excluding stake)
//       const currentBetKey = `${selectedBet.team}-${selectedBet.odds}-${selectedBet.sid}-${selectedBet.type}`

//       // Only reset stake if the bet selection actually changed (different team/odds/sid)
//       if (currentBetKey !== prevBetKeyRef.current) {
//       setBetFor(selectedBet.team || '')
//       setOdds(selectedBet.odds || '')
//       setBetType(selectedBet.type || '')
//         setStake('') // Reset stake when bet selection changes
//         prevBetKeyRef.current = currentBetKey
//       }
//       // Don't update stake from selectedBet when user is typing - let local state handle it
//     }
//   }, [selectedBet])

//   // Toast messages are now handled in the parent component (CricketBet/FootballBet/TennisBet)
//   // to prevent duplicate toasts from multiple PlaceBet component instances

//   useEffect(() => {
//     dispatch(getUser())
//   }, [dispatch])

//   // Calculate profit based on stake and odds
//   const calculateProfit = () => {
//     if (!stake || !odds) return '0'
//     const stakeNum = parseFloat(stake)
//     const oddsNum = parseFloat(odds)
//     if (isNaN(stakeNum) || isNaN(oddsNum)) return '0'

//     // For back: profit = stake * (odds - 1)
//     // For lay: profit = stake * (1 - odds) but typically calculated differently
//     // Based on the image showing positive profit, assuming back bet calculation
//     const profitValue = stakeNum * (oddsNum - 1)
//     return profitValue.toFixed(2)
//   }

//   const profit = calculateProfit()

//   // Get all teams from selectedBet, fallback to team1/team2 if not available
//   const allTeams = selectedBet?.teams && selectedBet.teams.length > 0
//     ? selectedBet.teams
//     : (team1 && team2 ? [team1, team2] : []);

//   // Get the other team name (for backward compatibility)
//   const getOtherTeam = () => {
//     if (!team1 || !team2) return ''
//     return betFor === team1 ? team2 : team1
//   }

//   const otherTeam = getOtherTeam()

//   // Format number with commas
//   const formatNumber = (num) => {
//     if (!num || num === '0') return '0'
//     const numValue = parseFloat(num)
//     if (isNaN(numValue)) return '0'
//     return numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
//   }

//   const handleStakeChange = (value) => {
//     setStake(value)
//     // Update selectedBet with stake for suggestion calculations
//     if (onBetChange && selectedBet) {
//       onBetChange({ ...selectedBet, stake: value })
//     }
//   }

//   const handleQuickStake = (amount) => {
//     const currentStake = parseFloat(stake) || 0
//     const newStake = (currentStake + amount).toString()
//     setStake(newStake)
//     // Update selectedBet with stake for suggestion calculations
//     if (onBetChange && selectedBet) {
//       onBetChange({ ...selectedBet, stake: newStake })
//     }
//   }

//   const handleClearStake = () => {
//     setStake('')
//   }

//   const handleOddsChange = (value) => {
//     setOdds(value)
//     if (onBetChange && selectedBet) {
//       onBetChange({ ...selectedBet, odds: value })
//     }
//   }

//   const handleOddsIncrement = () => {
//     const currentOdds = parseFloat(odds) || 0
//     handleOddsChange((currentOdds + 0.01).toFixed(2))
//   }

//   const handleOddsDecrement = () => {
//     const currentOdds = parseFloat(odds) || 0
//     if (currentOdds > 0.01) {
//       handleOddsChange((currentOdds - 0.01).toFixed(2))
//     }
//   }

//   const handleReset = () => {
//     setStake('')
//     setOdds(selectedBet?.odds || '')
//     setBetFor(selectedBet?.team || '')
//   }

//   const handleSubmit = async () => {
//     if (!stake || !odds || !betFor) {
//       toast.error('Please fill in all required fields')
//       return
//     }

//     const stakeNum = parseFloat(stake)
//     const oddsNum = parseFloat(odds)

//     if (isNaN(stakeNum) || isNaN(oddsNum)) {
//       toast.error('Please enter valid stake and odds')
//       return
//     }

//     // Validate min/max amounts
//     if (minAmount && stakeNum < minAmount) {
//       toast.error(`Minimum bet amount is ${minAmount}`)
//       return
//     }

//     if (maxAmount && stakeNum > maxAmount) {
//       toast.error(`Maximum bet amount is ${maxAmount}`)
//       return
//     }

//     // Determine if this is a fancy bet (Normal, meter, line, ball, khado, oddeven, fancy1)
//     const fancyBetTypes = ['Normal', 'meter', 'line', 'ball', 'khado', 'oddeven', 'fancy1']
//     const isFancyBet = fancyBetTypes.includes(gameType)

//     const formData = {
//       gameId: gameId,
//       sid: selectedBet?.sid || 4,
//       otype: betType,
//       price: stakeNum,
//       xValue: oddsNum.toString(),
//       gameType: gameType,
//       marketName: marketName || gameType,
//       eventName: eventName,
//       gameName: gameName,
//       teamName: betFor,
//       fancyScore: fancyScore || null,
//     }

//     try {
//       if (isFancyBet) {
//         await dispatch(createfancyBet(formData))
//       } else {
//         await dispatch(createBet(formData))
//       }

//       // Refresh user data and pending bets
//       await dispatch(getUser())
//       if (gameId) {
//         dispatch(getPendingBetAmo(gameId))
//       }

//       // Reset form and close modal
//       setStake('')
//       if (onClose) {
//         onClose()
//       }
//     } catch (error) {
//       console.error('Error placing bet:', error)
//     }
//   }

//   const handleEdit = () => {
//     // Handle edit logic here
//     console.log('Editing bet')
//   }

//   if (!selectedBet) {
//     return (
//       null
//     )
//   }

//   return (
//     <div className='bg-white'>
//       {/* Header */}
//       <div className={`${isMobile?"bg-primary":"bg-secondary"} text-white font-bold p-1 text-[15px] flex justify-between items-center`}>
//         <span>Place Bet</span>
//         {isMobile && onClose && (
//           <div className='flex items-center gap-2'>
//             <span className='text-[12px]'>Profit: {profit}</span>
//             <button
//               onClick={onClose}
//               className='text-white hover:text-gray-200 text-[20px] font-normal'
//               style={{ lineHeight: '1' }}
//             >
//               ×
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Betting Details Table */}

//         {/* Table Headers */}
//         <div className='grid grid-cols-4 bg-[#cccccc] text-black text-[12px] font-bold'>
//           <div className='p-2 '>(Bet for)</div>
//           <div className='p-2 '>Odds</div>
//           <div className='p-2 '>Stake</div>
//           <div className='p-2'>Profit</div>
//         </div>

//         <div className={`${betType === 'back' ? 'bg-[#72bbef]' : 'bg-[#faa9ba]'}`}>
//           {/* Table Data Row */}
//         <div className={`grid grid-cols-4  text-black text-[12px]`}>
//           <div className='p-2  text-[#000000] text-[12px] '>{betFor}</div>
//           <div className='p-2 flex  gap-1'>
//             <input
//               type='number'
//               value={odds}
//               onChange={(e) => handleOddsChange(e.target.value)}
//               step='0.01'
//               min='0.01'
//               className='w-full h-[25px] bg-white  px-1 py-0.5 text-[12px]'
//             />
//             <div className='flex flex-col'>
//               <button
//                 onClick={handleOddsIncrement}
//                 className='text-[10px] leading-none  bg-white hover:bg-gray-100'
//                 style={{ width: '16px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
//               >
//                 ▲
//               </button>
//               <button
//                 onClick={handleOddsDecrement}
//                 className='text-[10px] leading-none  bg-white hover:bg-gray-100'
//                 style={{ width: '16px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
//               >
//                 ▼
//               </button>
//             </div>
//           </div>
//           <div className='p-2 '>
//             <input
//               type='number'
//               value={stake}
//               onChange={(e) => handleStakeChange(e.target.value)}
//               placeholder=''
//               className='w-full h-[25px] bg-white px-1 py-0.5 text-[12px]'
//             />
//           </div>
//           <div className='p-2'>{profit}</div>
//         </div>

//       {/* Quick Stake Buttons */}
//       <div className=' p-2'>
//         <div className='flex  gap-1 mb-1'>
//           <button
//             onClick={() => handleQuickStake(1000)}
//             className='bg-[#cccccc] hover:bg-gray-500 text-[#000000] px-4 py-1 text-[14px] font-bold w-[calc(20%-2px)]'
//           >
//             +1k
//           </button>
//           <button
//             onClick={() => handleQuickStake(2000)}
//             className='bg-[#cccccc] hover:bg-gray-500 text-[#000000] px-4 py-1 text-[14px] font-bold w-[calc(20%-2px)]'
//           >
//             +2k
//           </button>
//           <button
//             onClick={() => handleQuickStake(5000)}
//             className='bg-[#cccccc] hover:bg-gray-500 text-[#000000] px-4 py-1 text-[14px] font-bold w-[calc(20%-2px)]'
//           >
//             +5k
//           </button>
//           <button
//             onClick={() => handleQuickStake(10000)}
//             className='bg-[#cccccc] hover:bg-gray-500 text-[#000000] px-4 py-1 text-[14px] font-bold w-[calc(20%-2px)]'
//           >
//             +10k
//           </button>
//           <button
//             onClick={() => handleQuickStake(20000)}
//             className='bg-[#cccccc] hover:bg-gray-500 text-[#000000] px-4 py-1 text-[14px] font-bold w-[calc(20%-2px)]'
//           >
//             +20k
//           </button>
//         </div>
//         <div className='flex gap-1'>
//           <button
//             onClick={() => handleQuickStake(25000)}
//             className='bg-[#cccccc] hover:bg-gray-500 text-[#000000] px-4 py-1 text-[14px] font-bold w-[calc(20%-2px)]'
//           >
//             +25k
//           </button>
//           <button
//             onClick={() => handleQuickStake(50000)}
//             className='bg-[#cccccc] hover:bg-gray-500 text-[#000000] px-4 py-1 text-[14px] font-bold w-[calc(20%-2px)]'
//           >
//             +50k
//           </button>
//           <button
//             onClick={() => handleQuickStake(75000)}
//             className='bg-[#cccccc] hover:bg-gray-500 text-[#000000] px-4 py-1 text-[14px] font-bold w-[calc(20%-2px)]'
//           >
//             +75k
//           </button>
//           <button
//             onClick={() => handleQuickStake(100000)}
//             className='bg-[#cccccc] hover:bg-gray-500 text-[#000000] px-4 py-1 text-[14px] font-bold w-[calc(20%-2px)]'
//           >
//             +1L
//           </button>
//           <button
//             onClick={() => handleQuickStake(200000)}
//             className='bg-[#cccccc] hover:bg-gray-500 text-[#000000] px-4 py-1 text-[14px] font-bold w-[calc(20%-2px)]'
//           >
//             +2L
//           </button>
//         </div>
//         <div className='flex justify-end mt-1'>
//           <button
//             onClick={handleClearStake}
//             className='text-[#212529] underline text-[12px] cursor-pointer'
//           >
//             clear
//           </button>
//         </div>
//       </div>

//       {/* Action Buttons */}
//       <div className='flex gap-1 p-2'>
//         <button
//           onClick={handleEdit}
//           className='flex-1 bg-[#097c93] border border-[#097c93] hover:bg-[#086a82] text-white font-bold py-2 text-[12px]'
//         >
//           Edit
//         </button>
//         <button
//           onClick={handleReset}
//           className='flex-1 bg-[#bd1828] border border-[#bd1828] hover:bg-[#c82333] text-white font-bold py-2 text-[12px]'
//         >
//           Reset
//         </button>
//         <button
//           onClick={handleSubmit}
//           disabled={loading}
//           className={`flex-1 bg-[#198754] border border-[#198754] hover:bg-[#157347] text-white font-bold py-2 text-[12px] ${
//             loading ? 'cursor-not-allowed opacity-70' : ''
//           }`}
//         >
//           {loading ? 'Placing...' : (isMobile ? 'Place Bet' : 'Submit')}
//         </button>
//       </div>

//       {/* Bet Summary Footer - Mobile Only */}
//       {isMobile && allTeams.length > 0 && (
//         <div className={`${betType === 'back' ? 'bg-[#ffffff45]' : 'bg-[#ffffff45]'} p-2`}>
//           {allTeams.map((team, index) => (
//             <div key={index} className='flex justify-between items-center mb-1'>
//               <span className='text-black text-[12px]'>{team}</span>
//             {stake && (
//                 <span className={`text-[12px] font-semibold ${
//                   team === betFor
//                     ? 'text-[#28a745]' // Green for selected team/item (profit)
//                     : 'text-[#dc3545]' // Red for other teams/items (loss)
//                 }`}>
//                   {team === betFor ? formatNumber(profit) : `-${formatNumber(stake)}`}
//                 </span>
//             )}
//           </div>
//           ))}
//         </div>
//       )}
//         </div>
//     </div>
//   )
// }

// export default PlaceBet

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createBet,
  createfancyBet,
  getPendingBetAmo,
  getBetHistory,
  messageClear,
} from '../../redux/reducer/betReducer';
import { getUser } from '../../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import LoginPopup from '../../components/auth/LoginPopup';
import cancelIcon from '../../assets/icons/bt-iconCancel.jpg';
import { useTranslation } from '../../context/LanguageContext';

function PlaceBet({
  selectedBet,
  onBetChange,
  onClose,
  team1,
  team2,
  gameId,
  eventName,
  marketName,
  gameType,
  gameName = 'Cricket Game',
  sid,
  maxAmount,
  minAmount,
  fancyScore,
}) {
  const { t } = useTranslation();
  console.log('selectedBet', selectedBet);
  const dispatch = useDispatch();
  const { loading, errorMessage, successMessage, pendingBetAmounts } =
    useSelector((state) => state.bet);
  const { userInfo } = useSelector((state) => state.auth);

  const DEFAULT_GAME_STAKES = [
    { label: '1k', value: 1000 },
    { label: '2k', value: 2000 },
    { label: '5k', value: 5000 },
    { label: '10k', value: 10000 },
    { label: '20k', value: 20000 },
    { label: '50k', value: 50000 },
  ];

  const quickStakes = (() => {
    const saved = userInfo?.quickStakes;
    if (!saved?.length) return DEFAULT_GAME_STAKES;
    return DEFAULT_GAME_STAKES.map((def, i) => {
      const item = saved[i];
      if (!item) return { ...def };
      if (typeof item === 'object' && item.label && item.value) return item;
      if (typeof item === 'number' && item > 0)
        return { label: def.label, value: item };
      return { ...def };
    });
  })();

  const [stake, setStake] = useState('');
  const [odds, setOdds] = useState(
    selectedBet?.odds !== undefined && selectedBet?.odds !== null
      ? String(selectedBet.odds)
      : ''
  );
  const [betFor, setBetFor] = useState(
    selectedBet?.team !== undefined && selectedBet?.team !== null
      ? String(selectedBet.team)
      : ''
  );
  const [betType, setBetType] = useState(selectedBet?.type || ''); // 'back' or 'lay'
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const prevBetKeyRef = React.useRef('');
  const autoCloseTimerRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  const loadingRef = React.useRef(loading);

  // Update ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Keep loading ref in sync so timeout callback can check if bet is still placing
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    if (selectedBet) {
      // Create a unique key for the bet selection (excluding stake)
      const currentBetKey = `${selectedBet.team}-${selectedBet.odds}-${selectedBet.sid}-${selectedBet.type}`;

      // Only reset stake if the bet selection actually changed (different team/odds/sid)
      if (currentBetKey !== prevBetKeyRef.current) {
        setBetFor(
          selectedBet.team !== undefined && selectedBet.team !== null
            ? String(selectedBet.team)
            : ''
        );
        setOdds(
          selectedBet.odds !== undefined && selectedBet.odds !== null
            ? String(selectedBet.odds)
            : ''
        );
        setBetType(selectedBet.type || '');
        setStake(selectedBet.stake || ''); // Reset or pre-fill stake when bet selection changes
        prevBetKeyRef.current = currentBetKey;
      }
      // Don't update stake from selectedBet when user is typing - let local state handle it
    }
  }, [selectedBet]);

  // Toast messages are now handled in the parent component (CricketBet/FootballBet/TennisBet)
  // to prevent duplicate toasts from multiple PlaceBet component instances

  useEffect(() => {
    if (!localStorage.getItem('auth')) return;
    dispatch(getUser());
  }, [dispatch]);

  const isLoggedIn = !!userInfo && !!localStorage.getItem('auth');

  // Auto-close after 5 seconds of inactivity (only when logged in)
  useEffect(() => {
    if (selectedBet && isLoggedIn) {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }

      // autoCloseTimerRef.current = setTimeout(() => {
      //   if (!loadingRef.current && onCloseRef.current) {
      //     onCloseRef.current();
      //   }
      //   autoCloseTimerRef.current = null;
      // }, 5000);

      return () => {
        if (autoCloseTimerRef.current) {
          clearTimeout(autoCloseTimerRef.current);
          autoCloseTimerRef.current = null;
        }
      };
    } else {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    }
  }, [selectedBet, isLoggedIn]);

  // Reset auto-close timer on any user interaction (only when logged in)
  const resetAutoCloseTimer = React.useCallback(() => {
    if (selectedBet && isLoggedIn) {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      if (onCloseRef.current) {
        autoCloseTimerRef.current = setTimeout(() => {
          if (!loadingRef.current && onCloseRef.current) {
            onCloseRef.current();
          }
          autoCloseTimerRef.current = null;
        }, 5000);
      }
    }
  }, [selectedBet, isLoggedIn]);

  // Get bet details from pending bets (same logic as components)
  const getBetDetails = (team) => {
    const gameTypeToMatch = gameType || marketName || '';
    const marketNameToMatch = marketName || gameType || '';

    // For Match Odds, also check for 'Match Odds' or 'Winner' or 'MATCH_ODDS' or 'TOURNAMENT_WINNER'
    const isMatchOdds =
      gameType === 'Match Odds' ||
      gameType === 'Winner' ||
      marketName === 'MATCH_ODDS' ||
      marketName === 'TOURNAMENT_WINNER';

    const matchedTeamBet = pendingBetAmounts?.find((item) => {
      const matchesGameType =
        item.gameType === gameTypeToMatch ||
        item.gameType === marketNameToMatch ||
        (isMatchOdds &&
          (item.gameType === 'Match Odds' ||
            item.gameType === 'Winner' ||
            item.gameType === 'MATCH_ODDS' ||
            item.gameType === 'TOURNAMENT_WINNER'));
      return (
        matchesGameType && item.teamName?.toLowerCase() === team?.toLowerCase()
      );
    });

    const otherTeamBet = pendingBetAmounts?.find((item) => {
      const matchesGameType =
        item.gameType === gameTypeToMatch ||
        item.gameType === marketNameToMatch ||
        (isMatchOdds &&
          (item.gameType === 'Match Odds' ||
            item.gameType === 'Winner' ||
            item.gameType === 'MATCH_ODDS' ||
            item.gameType === 'TOURNAMENT_WINNER'));
      return matchesGameType;
    });

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

  // Calculate suggestion based on game type (same logic as components)
  // Don't show suggestions for these bet types - only show values after placing bet from API
  const calculateSuggestion = (
    team,
    selectedTeam,
    selectedType,
    stake,
    odds
  ) => {
    // Don't show suggestions for these bet types
    // fancy1 uses Match-Odds math, so it falls through to the match-odds branch below.
    const noSuggestionMarkets = ['khado', 'Normal', 'meter', 'oddeven'];
    if (noSuggestionMarkets.includes(gameType)) {
      return null;
    }

    if (!stake || !odds || !selectedBet) return null;

    const stakeNum = parseFloat(stake);
    const oddsNum = parseFloat(odds);
    if (isNaN(stakeNum) || isNaN(oddsNum) || stakeNum === 0) return null;

    const { otype, totalBetAmount, totalPrice, teamName } = getBetDetails(team);
    const isMatchedTeam = teamName?.toLowerCase() === team?.toLowerCase();
    const existingBet =
      (otype && totalBetAmount) || (totalPrice && teamName && isMatchedTeam);

    // Determine calculation method based on game type
    // Games using (odds / 100): Bookmaker, Normal, Meter, Khado
    // Games using (odds - 1): Match Odds, OverUnder, TiedMatch, Fancy1, OddEven
    const usesFancyCalculation = [
      'Bookmaker',
      'Normal',
      'meter',
      'khado',
    ].includes(gameType);
    const isBookmaker = gameType === 'Bookmaker';
    const isKhado = gameType === 'khado';

    if (!existingBet) {
      // No existing bet - calculate based on game type
      let profit;
      if (usesFancyCalculation) {
        // Bookmaker, Normal, Meter, Khado: profit = stake * (odds / 100)
        if (isKhado) {
          profit = stakeNum * (oddsNum / 100); // Khado only has back
        } else if (isBookmaker) {
          // Bookmaker: b = otype === 'lay' ? p : p * (x / 100), p = otype === 'lay' ? p * (x / 100) : p
          const p = stakeNum;
          const x = oddsNum;
          const b = selectedType === 'lay' ? p : p * (x / 100);
          const pCalc = selectedType === 'lay' ? p * (x / 100) : p;

          if (selectedType === 'back') {
            profit = b; // For BACK: profit = stake * (odds / 100)
            return {
              value: Math.abs(profit),
              color: profit >= 0 ? 'green' : 'red',
            };
          } else {
            // For LAY: if selected team wins, you lose pCalc (stake * odds / 100)
            // The value should be negative to show loss
            profit = -pCalc; // Negative because it's a loss if selected team wins
            return { value: Math.abs(profit), color: 'red' }; // Always red for LAY loss on selected team
          }
        } else {
          // Normal, Meter
          profit =
            selectedType === 'back'
              ? stakeNum * (oddsNum / 100)
              : stakeNum * (1 - oddsNum / 100);
        }
      } else {
        // Match Odds, OverUnder, TiedMatch, Fancy1, OddEven: profit = stake * (odds - 1)
        profit =
          selectedType === 'back'
            ? stakeNum * (oddsNum - 1)
            : stakeNum * (1 - oddsNum);
      }
      return { value: Math.abs(profit), color: profit >= 0 ? 'green' : 'red' };
    }

    // Complex calculation with existing bet
    const totalBetAmt = parseFloat(totalBetAmount || 0);
    const totalPrc = parseFloat(totalPrice || 0);

    // Calculate new bet values based on game type
    let p, x, b;
    if (usesFancyCalculation) {
      if (isKhado) {
        // Khado only has back
        p = stakeNum;
        x = oddsNum;
        b = p * (x / 100);
        p = p;
      } else if (isBookmaker) {
        // Bookmaker calculation: b = otype === 'lay' ? p : p * (x / 100)
        // p = otype === 'lay' ? p * (x / 100) : p
        p = stakeNum;
        x = oddsNum;
        b = selectedType === 'lay' ? p : p * (x / 100);
        p = selectedType === 'lay' ? p * (x / 100) : p;
      } else {
        // Normal, Meter
        p = stakeNum;
        x = oddsNum;
        b = selectedType === 'back' ? p * (x / 100) : p * (1 - x / 100);
        p = selectedType === 'lay' ? p * (1 - x / 100) : p;
      }
    } else {
      // Match Odds, OverUnder, TiedMatch, Fancy1, OddEven
      p = stakeNum;
      x = oddsNum;
      b = selectedType === 'lay' ? p : p * (x - 1);
      p = selectedType === 'lay' ? p * (x - 1) : p;
    }

    // For Bookmaker, use the specific logic from the provided component
    if (isBookmaker && existingBet) {
      if (selectedTeam?.toLowerCase() === teamName?.toLowerCase()) {
        if (selectedType === otype) {
          // Same team, same type - merge
          b = b + totalBetAmt;
          p = p + totalPrc;
          const calValue = selectedType === 'back' ? b : p;
          return {
            value: Math.abs(calValue),
            color: selectedType === 'back' && calValue >= 0 ? 'green' : 'red',
          };
        } else {
          // Same team, opposite type - offset
          if (selectedType === 'back') {
            if (totalBetAmt > p) {
              p = totalPrc - b;
              return { value: Math.abs(p), color: 'red' };
            } else {
              b = b - totalPrc;
              return { value: Math.abs(b), color: b < 0 ? 'red' : 'green' };
            }
          } else if (selectedType === 'lay') {
            if (totalPrc >= b) {
              b = totalBetAmt - p;
              return { value: Math.abs(b), color: b < 0 ? 'red' : 'green' };
            } else {
              p = p - totalBetAmt;
              return { value: Math.abs(p), color: 'red' };
            }
          }
        }
      } else {
        // Different team
        if (selectedType === otype) {
          if (selectedType === 'back') {
            if (totalPrc >= b) {
              p = totalPrc - b;
              return { value: Math.abs(p), color: 'red' };
            } else {
              b = b - totalPrc;
              return { value: Math.abs(b), color: b < 0 ? 'red' : 'green' };
            }
          } else if (selectedType === 'lay') {
            if (totalPrc >= b) {
              b = totalBetAmt - p;
              return { value: Math.abs(b), color: b < 0 ? 'red' : 'green' };
            } else {
              p = p - totalBetAmt;
              return { value: Math.abs(p), color: 'red' };
            }
          }
        } else {
          // Different team, different type - add
          b = b + totalBetAmt;
          p = p + totalPrc;
          const calValue = selectedType === 'back' ? b : p;
          return {
            value: Math.abs(calValue),
            color: selectedType === 'back' && calValue >= 0 ? 'green' : 'red',
          };
        }
      }
    }

    // For other game types, use the original logic
    if (selectedTeam?.toLowerCase() === teamName?.toLowerCase()) {
      if (selectedType === otype) {
        // Same team, same type - merge
        b = b + totalBetAmt;
        p = p + totalPrc;
        const calValue = selectedType === 'back' ? b : p;
        return {
          value: Math.abs(calValue),
          color: calValue >= 0 ? 'green' : 'red',
        };
      } else {
        // Same team, opposite type - offset
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
      // Different team
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
        // Different team, different type - add
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

  // Calculate profit for display (always show green/profit value)
  const calculateProfit = () => {
    if (!stake || !odds) return '0';

    const stakeNum = parseFloat(stake);
    const oddsNum = parseFloat(odds);
    if (isNaN(stakeNum) || isNaN(oddsNum)) return '0';

    // Always show the green/profit value
    // For BACK: profit if selected team wins
    // For LAY: profit if selected team loses (stake)
    if (betType === 'back') {
      // BACK: get green value from selected team suggestion
      const suggestion = calculateSuggestion(
        betFor,
        betFor,
        betType,
        stake,
        odds
      );
      if (suggestion && suggestion.color === 'green') {
        return suggestion.value.toFixed(2);
      }
      // Fallback: calculate profit if selected team wins
      const usesFancyCalculation = [
        'Bookmaker',
        'Normal',
        'meter',
        'khado',
      ].includes(gameType);
      const isKhado = gameType === 'khado';

      let profitValue;
      if (usesFancyCalculation) {
        if (isKhado) {
          profitValue = stakeNum * (oddsNum / 100);
        } else {
          // Bookmaker, Normal, Meter
          profitValue = stakeNum * (oddsNum / 100);
        }
      } else {
        // Match Odds, OverUnder, etc.
        profitValue = stakeNum * (oddsNum - 1);
      }
      return profitValue.toFixed(2);
    } else {
      // LAY: green value is the stake (profit if selected team loses)
      return stakeNum.toFixed(2);
    }
  };

  const profit = calculateProfit();

  // Get all teams from selectedBet, fallback to team1/team2 if not available
  const allTeams =
    selectedBet?.teams && selectedBet.teams.length > 0
      ? selectedBet.teams
      : team1 && team2
        ? [team1, team2]
        : [];

  // Get the other team name (for backward compatibility)
  const getOtherTeam = () => {
    if (!team1 || !team2) return '';
    return betFor === team1 ? team2 : team1;
  };

  const otherTeam = getOtherTeam();
  const isOddEvenMarket =
    gameType === 'oddeven' || selectedBet?.gameType === 'oddeven';

  // Format number with commas
  const formatNumber = (num) => {
    if (!num || num === '0') return '0';
    const numValue = parseFloat(num);
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const handleStakeChange = (value) => {
    setStake(value);
    resetAutoCloseTimer(); // Reset timer on interaction
    // Update selectedBet with stake for suggestion calculations
    if (onBetChange && selectedBet) {
      onBetChange({ ...selectedBet, stake: value });
    }
  };

  const handleQuickStake = (amount) => {
    const currentStake = parseFloat(stake) || 0;
    const newStake = (currentStake + amount).toString();
    setStake(newStake);
    resetAutoCloseTimer(); // Reset timer on interaction
    // Update selectedBet with stake for suggestion calculations
    if (onBetChange && selectedBet) {
      onBetChange({ ...selectedBet, stake: newStake });
    }
  };

  const handleClearStake = () => {
    setStake('');
    resetAutoCloseTimer(); // Reset timer on interaction
  };

  const handleNumpadInput = (key) => {
    resetAutoCloseTimer();
    let newStake = stake?.toString() || '';

    if (key === 'x') {
      // Backspace - remove last character
      newStake = newStake.slice(0, -1);
    } else if (key === '.') {
      // Only allow one decimal point
      if (newStake.includes('.')) return;
      newStake = newStake === '' ? '0.' : newStake + '.';
    } else {
      // Digit ('0'-'9' or '00')
      // Avoid leading zeros like "007"
      if (newStake === '0') {
        newStake = key === '00' ? '0' : key;
      } else {
        newStake = newStake + key;
      }
    }

    setStake(newStake);
    if (onBetChange && selectedBet) {
      onBetChange({ ...selectedBet, stake: newStake });
    }
  };

  const handleOddsChange = (value) => {
    setOdds(value);
    resetAutoCloseTimer(); // Reset timer on interaction
    if (onBetChange && selectedBet) {
      onBetChange({ ...selectedBet, odds: value });
    }
  };

  const handleOddsIncrement = () => {
    const currentOdds = parseFloat(odds) || 0;
    handleOddsChange((currentOdds + 0.01).toFixed(2));
    // Timer reset is handled in handleOddsChange
  };

  const handleOddsDecrement = () => {
    const currentOdds = parseFloat(odds) || 0;
    if (currentOdds > 0.01) {
      handleOddsChange((currentOdds - 0.01).toFixed(2));
      // Timer reset is handled in handleOddsChange
    }
  };

  const handleReset = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (onClose) {
      onClose();
      return;
    }
    setStake('');
    setOdds(
      selectedBet?.odds !== undefined && selectedBet?.odds !== null
        ? String(selectedBet.odds)
        : ''
    );
    setBetFor(
      selectedBet?.team !== undefined && selectedBet?.team !== null
        ? String(selectedBet.team)
        : ''
    );
  };

  const handleSubmit = async () => {
    if (!userInfo || !localStorage.getItem('auth')) {
      setShowLoginPopup(true);
      return;
    }

    const isInvalid = (val) => val === '' || val === null || val === undefined;

    if (isInvalid(stake) || isInvalid(odds) || isInvalid(betFor)) {
      const missing = [];
      if (isInvalid(stake)) missing.push('stake');
      if (isInvalid(odds)) missing.push('odds');
      if (isInvalid(betFor)) missing.push('betFor');
      toast.error(
        `Please fill in all required fields. Missing: ${missing.join(', ')}`
      );
      return;
    }

    const stakeNum = parseFloat(stake);
    const oddsNum = parseFloat(odds);

    if (isNaN(stakeNum) || isNaN(oddsNum)) {
      toast.error('Please enter valid stake and odds');
      return;
    }

    // Validate min/max amounts
    if (minAmount && stakeNum < minAmount) {
      toast.error(`Minimum bet amount is ${minAmount}`);
      return;
    }

    if (maxAmount && stakeNum > maxAmount) {
      toast.error(`Maximum bet amount is ${maxAmount}`);
      return;
    }

    // Determine if this is a fancy bet (Normal, meter, line, ball, khado).
    // fancy1 and oddeven use Match Odds math and route through the sports
    // placeBet endpoint, not the fancy one.
    const fancyBetTypes = ['Normal', 'meter', 'line', 'ball', 'khado'];
    const isFancyBet = fancyBetTypes.includes(gameType);

    // For all fancy bets (Normal, Meter, Khado):
    // fancyScore = original odds value (rate), xValue = size value, price = stake
    // For other fancy bets: use existing logic
    let finalFancyScore = fancyScore || null;
    let finalXValue = oddsNum.toString();

    const fancyBetTypesWithSize = ['Normal', 'meter', 'khado'];
    if (
      fancyBetTypesWithSize.includes(gameType) &&
      selectedBet?.size !== undefined &&
      selectedBet?.size !== null
    ) {
      // For fancy bets: fancyScore is the original odds value (rate) from selectedBet, xValue is the size value
      finalFancyScore = parseFloat(selectedBet.odds || oddsNum); // The original odds value (e.g., 15)
      finalXValue = selectedBet.size.toString(); // The size value (e.g., 120)
    }

    const formData = {
      gameId: gameId,
      sid: sid !== undefined ? sid : selectedBet?.sid || 4,
      otype: betType,
      oname: selectedBet?.oname || '',
      price: stakeNum,
      xValue: finalXValue,
      gameType: gameType,
      marketName: marketName || gameType,
      eventName: eventName,
      gameName: gameName,
      teamName: betFor,
      fancyScore: finalFancyScore,
    };

    try {
      if (isFancyBet) {
        await dispatch(createfancyBet(formData));
      } else {
        await dispatch(createBet(formData));
      }

      // Refresh user data and pending bets
      await dispatch(getUser());
      if (gameId) {
        dispatch(getPendingBetAmo(gameId));
        dispatch(
          getBetHistory({
            gameid: gameId,
            page: 1,
            limit: 10,
            selectedVoid: 'unsettel',
          })
        );
      }

      // Reset form and close modal
      setStake('');
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error placing bet:', error);
    }
  };

  const handleEdit = () => {
    // Handle edit logic here
    console.log('Editing bet');
    resetAutoCloseTimer(); // Reset timer on interaction
  };

  // if (!selectedBet) {
  //   return (
  //     <LoginPopup
  //       open={showLoginPopup}
  //       onClose={() => setShowLoginPopup(false)}
  //     />
  //   );
  // }

  return (
    <>
      <div className='overflow-hidden'>
        <div
          className={`${betType === 'back' ? 'bg-[#beddf4]' : 'bg-[#f3dce2]'} grid grid-cols-[1fr_1fr] items-center border-b border-[#9fb4c2] py-0.5 text-black md:grid-cols-[1fr_140px_140px]`}
        >
          <div className='hidden px-2 py-1 text-right text-[14px] font-bold md:flex'>
            {betFor} - {t('match_odds_upper', 'MATCH ODDS')}
          </div>

          <div className='flex items-center px-0.5 md:w-auto'>
            <button
              onClick={handleOddsDecrement}
              className='flex h-[40px] w-[60px] items-center justify-center bg-[#8f8f8f] text-[16px] leading-none font-bold text-white md:h-[26px] md:w-[36px] md:rounded-l-sm'
            >
              −
            </button>

            <input
              type='number'
              value={odds}
              onChange={(e) => handleOddsChange(e.target.value)}
              step='0.01'
              min='0.01'
              className='h-[40px] w-full border-0 bg-white text-center text-[14px] font-bold outline-none md:h-[26px]'
            />

            <button
              onClick={handleOddsIncrement}
              className='flex h-[40px] w-[60px] items-center justify-center bg-[#8f8f8f] text-[16px] leading-none font-bold text-white md:h-[26px] md:w-[36px] md:rounded-r-sm'
            >
              +
            </button>
          </div>
          <div className='flex items-center px-0.5'>
            <button
              onClick={handleClearStake}
              className='flex h-[40px] w-[60px] items-center justify-center bg-[#8f8f8f] text-[16px] leading-none font-bold text-white md:h-[26px] md:w-[36px] md:rounded-l-sm'
            >
              −
            </button>

            <input
              type='number'
              value={stake}
              onChange={(e) => handleStakeChange(e.target.value)}
              className='h-[40px] w-full border-0 bg-white text-center text-[14px] font-bold outline-none md:h-[26px]'
            />

            <button
              onClick={() => handleQuickStake(100)}
              className='flex h-[40px] w-[60px] items-center justify-center bg-[#8f8f8f] text-[16px] leading-none font-bold text-white md:h-[26px] md:w-[36px] md:rounded-r-sm'
            >
              +
            </button>
          </div>
        </div>

        <div
          className={`${betType === 'back' ? 'bg-[#d4e8f8]' : 'bg-[#faeff2]'} justify-end pt-0.5 pb-1 md:flex`}
        >
          <div className='flex'>
            {quickStakes.map((item, i) => (
              <button
                key={i}
                onClick={() => handleQuickStake(item.value)}
                className={`${betType === 'back' ? 'bg-[#61cce6] hover:from-[#29a3c2] hover:to-[#61cce6]' : 'bg-[#fbbcbf] hover:from-[#eb7c81] hover:to-[#fbbcbf]'} h-[30px] flex-1 border-l border-gray-400 bg-gradient-to-b px-3 text-[14px] font-bold text-black hover:text-white md:mx-0.5 md:h-[26px] md:rounded-[3px]`}
              >
                {item.value}
              </button>
            ))}
          </div>
          <div className='md:hidden'>
            <table className='w-full table-fixed border-collapse select-none'>
              <tbody>
                <tr>
                  {['1', '2', '3', '4', '5', '6'].map((key) => (
                    <td
                      key={key}
                      onClick={() => handleNumpadInput(key)}
                      className='h-[30px] cursor-pointer border border-gray-400 bg-white text-center text-[14px] font-bold text-black active:bg-gray-200'
                    >
                      {key}
                    </td>
                  ))}
                  <td
                    rowSpan={2}
                    onClick={() => handleNumpadInput('x')}
                    className='cursor-pointer border border-gray-400 bg-white text-center'
                  >
                    <span className='flex justify-center'>
                      <img src={cancelIcon} />
                    </span>
                  </td>
                </tr>

                <tr>
                  {['7', '8', '9', '0', '00', '.'].map((key) => (
                    <td
                      key={key}
                      onClick={() => handleNumpadInput(key)}
                      className='h-[30px] cursor-pointer border border-gray-400 bg-white text-center text-[14px] font-bold text-black active:bg-gray-200'
                    >
                      {key}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {/* Place Bet */}
          <div className='flex py-0.5 md:py-0'>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className='mx-0.5 h-[30px] flex-1 rounded-[3px] bg-[#07af07] bg-gradient-to-b to-[#07af07] px-3 text-[14px] font-bold whitespace-nowrap text-white hover:from-[#026d02] md:h-[26px]'
            >
              {loading
                ? t('placing', 'Placing...')
                : t('place_bet', 'Place Bet')}
            </button>

            {/* Cancel */}
            <button
              onClick={handleReset}
              className='mx-0.5 h-[30px] flex-1 rounded-[3px] bg-[#ff5071] bg-gradient-to-b to-[#ff5071] px-3 text-[14px] font-bold text-white hover:from-[#c30529] md:h-[26px]'
            >
              {t('cancel', 'Cancel')}
            </button>
          </div>
        </div>
      </div>

      {/* <div className={`${betType === 'back' ? 'bg-[#72bbef]' : 'bg-[#faa9ba]'}`}>
        <div className={`grid grid-cols-4 text-[12px] text-black`}>
          <div className='p-2 text-[12px] text-[#000000]'>{betFor}</div>
          <div className='flex gap-1 p-2'>
            <input
              type='number'
              value={odds}
              onChange={(e) => handleOddsChange(e.target.value)}
              step='0.01'
              min='0.01'
              className='h-[25px] w-full bg-white px-1 py-0.5 text-[12px]'
            />
            <div className='flex flex-col'>
              <button
                onClick={handleOddsIncrement}
                className='bg-white text-[10px] leading-none hover:bg-gray-100'
                style={{
                  width: '16px',
                  height: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                ▲
              </button>
              <button
                onClick={handleOddsDecrement}
                className='bg-white text-[10px] leading-none hover:bg-gray-100'
                style={{
                  width: '16px',
                  height: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                ▼
              </button>
            </div>
          </div>
          <div className='p-2'>
            <input
              type='number'
              value={stake}
              onChange={(e) => handleStakeChange(e.target.value)}
              placeholder=''
              className='h-[25px] w-full bg-white px-1 py-0.5 text-[12px]'
            />
          </div>
          <div className='p-2'>
            {(() => {
              const noSuggestionMarkets = [
                'khado',
                'Normal',
                'meter',
                'oddeven',
              ];
              const hideProfit = noSuggestionMarkets.includes(gameType);
              return hideProfit ? '-' : profit;
            })()}
          </div>
        </div>
        <div className='p-2'>
          <div className='mb-1 flex flex-wrap gap-1'>
            {quickStakes.map((item, i) => (
              <button
                key={i}
                onClick={() => handleQuickStake(item.value)}
                className='bg-[#cccccc] px-4 py-1 text-[14px] font-bold text-[#000000] hover:bg-gray-500'
                style={{ width: 'calc(20% - 4px)' }}
              >
                +{item.label}
              </button>
            ))}
          </div>
          <div className='mt-1 flex justify-end'>
            <button
              onClick={handleClearStake}
              className='cursor-pointer text-[12px] text-[#212529] underline'
            >
              clear
            </button>
          </div>
        </div>
        <div className='flex gap-1 p-2'>
          <button
            onClick={handleEdit}
            className='flex-1 border border-[#097c93] bg-[#097c93] py-2 text-[12px] font-bold text-white hover:bg-[#086a82]'
          >
            Edit
          </button>
          <button
            onClick={handleReset}
            className='flex-1 border border-[#bd1828] bg-[#bd1828] py-2 text-[12px] font-bold text-white hover:bg-[#c82333]'
          >
            Reset
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 border border-[#198754] bg-[#198754] py-2 text-[12px] font-bold text-white hover:bg-[#157347] ${
              loading ? 'cursor-not-allowed opacity-70' : ''
            }`}
          >
            {loading ? 'Placing...' : isMobile ? 'Place Bet' : 'Submit'}
          </button>
        </div>
      </div> */}

      <div className='fixed top-0 z-30'>
        <LoginPopup
          open={showLoginPopup}
          onClose={() => setShowLoginPopup(false)}
        />
      </div>
    </>
  );
}

export default PlaceBet;
