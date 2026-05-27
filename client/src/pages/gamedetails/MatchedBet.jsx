// import React from "react";

// function MatchedBet({ pendingBetAmounts }) {
//   console.log("pendingBetAmounts", pendingBetAmounts);

//   if (!pendingBetAmounts || !Array.isArray(pendingBetAmounts) || pendingBetAmounts.length === 0) {
//     return null;
//   }

//   return (
//     <div className="bg-[#f7f7f7]">
//       {/* Table Headers */}
//       <div className="bg-white grid grid-cols-3 gap-px">
//         <div className="h-8 flex items-center text-sm font-semibold p-1 text-left">
//           Matched Bet
//         </div>
//         <div className="h-8 flex items-center text-sm font-semibold p-1 text-left">
//           Odds
//         </div>
//         <div className="h-8 flex items-center text-sm font-semibold p-1 text-left">
//           Stake
//         </div>
//       </div>

//       {/* Table Rows */}
//       {pendingBetAmounts.map((item, index) => (
//         <div
//           key={index}
//           className={`grid grid-cols-3 gap-px ${item?.otype === 'back' ? 'bg-[#72bbef]' : 'bg-[#faa9ba]'}`}
//         >
//           <div className="h-8 flex items-center text-sm font-semibold p-1 text-left text-gray-800">
//             {item?.teamName || 'N/A'}
//           </div>
//           <div className="h-8 flex items-center text-sm font-semibold p-1 text-right text-gray-800">
//             {item?.totalBetAmount || '0'}
//           </div>
//           <div className="h-8 flex items-center text-sm font-semibold p-1 text-right text-gray-800">
//             {(item?.totalPrice).toFixed(2) || '0'}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// export default MatchedBet;

import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getBetHistory } from '../../redux/reducer/betReducer';
import { useTranslation } from '../../context/LanguageContext';

function MatchedBet({ gameid }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { betHistory } = useSelector((state) => state.bet);

  const reloadBetHistory = useCallback(() => {
    if (!localStorage.getItem('auth') || !gameid) return;
    dispatch(
      getBetHistory({
        gameid,
        page: 1,
        limit: 10,
        selectedVoid: 'unsettel',
      })
    );
  }, [dispatch, gameid]);

  useEffect(() => {
    reloadBetHistory();
  }, [reloadBetHistory]);

  useEffect(() => {
    if (!gameid) return;

    const onBetHistoryRefresh = (e) => {
      const detailGid = e.detail?.gameId;
      if (detailGid == null || String(detailGid) === String(gameid)) {
        reloadBetHistory();
      }
    };

    window.addEventListener('client-bet-history-refresh', onBetHistoryRefresh);
    return () =>
      window.removeEventListener(
        'client-bet-history-refresh',
        onBetHistoryRefresh
      );
  }, [gameid, reloadBetHistory]);

  const filteredBetHistory = betHistory.filter((bet) => bet.gameId === gameid);

  const getMatchedBetLabel = (item) => {
    if (!item) return 'N/A';

    if (item.gameType === 'oddeven') {
      const market = item.marketName || '';
      const team = item.teamName || '';
      return [market, team].filter(Boolean).join(' / ') || 'N/A';
    }

    return item.teamName || item.marketName || 'N/A';
  };

  // Format number with commas
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className='bg-[#f7f7f7]'>
      {/* Table Headers */}
      <div className='grid grid-cols-4 border-b border-gray-300 bg-[#028dad] text-white'>
        <div className='col-span-2 flex items-center border border-white px-2 py-1 text-left text-sm'>
          {t('matched_bet', 'Matched Bet')}
        </div>
        <div className='flex items-center border border-white px-2 py-1 text-right text-sm'>
          {t('odds', 'Odds')}
        </div>
        <div className='flex items-center border border-white px-2 py-1 text-right text-sm'>
          {t('stake', 'Stake')}
        </div>
      </div>

      {/* Table Rows */}
      {filteredBetHistory.length > 0 ? (
        filteredBetHistory.map((item, index) => (
          <div
            key={index}
            className={`grid grid-cols-4 border-b border-gray-200 ${item?.otype === 'back' ? 'bg-[#72bbef]' : 'bg-[#faa9ba]'}`}
          >
            <div className='col-span-2 flex h-8 items-center truncate px-2 py-1 text-left text-sm font-semibold text-gray-800'>
              {getMatchedBetLabel(item)}
              {item?.fancyScore ? `/${item?.xValue}` : ''}
            </div>
            <div className='flex h-8 items-center px-2 py-1 text-right text-sm font-semibold text-gray-800'>
              {item?.fancyScore || item?.xValue || '0'}
            </div>
            <div className='flex h-8 items-center px-2 py-1 text-right text-sm font-semibold text-gray-800'>
              {formatNumber(
                item?.otype === 'back' ? item.price : item.betAmount
              )}
            </div>
          </div>
        ))
      ) : (
        <div className='flex items-center justify-center bg-white px-2 text-sm text-[#c7313f]'>
          {t('no_bets_found', 'No bets found')}
        </div>
      )}
    </div>
  );
}

export default MatchedBet;
