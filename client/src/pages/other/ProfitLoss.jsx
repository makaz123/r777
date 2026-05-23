import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProLoss } from '../../redux/reducer/betReducer';
import { getUser } from '../../redux/reducer/authReducer';
import { useTranslation } from '../../context/LanguageContext';

function ProfitLoss() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { proLossHistory, loading } = useSelector((state) => state.bet);
  const { userInfo } = useSelector((state) => state.auth);

  // Date setup - default to last 4 months
  const currentDate = new Date();
  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(currentDate.getMonth() - 4);
  const formatDateTime = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [startDate, setStartDate] = useState(formatDateTime(fourMonthsAgo));
  const [endDate, setEndDate] = useState(formatDateTime(currentDate));
  const [selectedGame, setSelectedGame] = useState('');

  const fetchProfitLoss = useCallback(() => {
    if (!startDate || !endDate || !userInfo?._id) return;
    dispatch(
      getProLoss({
        startDate,
        endDate,
        page: 1,
        limit: 1000, // Fetch all for grouped view
        gameName: selectedGame,
        groupByMarket: true,
      })
    );
  }, [dispatch, startDate, endDate, selectedGame, userInfo?._id]);

  useEffect(() => {
    if (!userInfo) {
      dispatch(getUser());
    }
  }, [dispatch, userInfo]);

  useEffect(() => {
    if (userInfo?._id) {
      fetchProfitLoss();
    }
  }, [fetchProfitLoss, userInfo?._id]);

  const handleReset = () => {
    setStartDate(formatDateTime(fourMonthsAgo));
    setEndDate(formatDateTime(currentDate));
    setSelectedGame('');
  };

  const handleSubmit = () => {
    fetchProfitLoss();
  };

  const totalPL = proLossHistory?.reduce((sum, row) => sum + (Number(row.myProfit) || 0), 0) || 0;

  return (
    <div className='w-full overflow-x-auto p-0.5'>
      <div className='w-full border border-[#00000020] bg-[#fff] shadow-[0_0_5px_#a4a4a4]'>
        <div className='bg-[#24b0c8] px-3 py-2 text-white'>
          <h4 className='text-[15px] font-bold'>
            Profit & Loss Report
          </h4>
        </div>
        <div className='mb-2 w-full p-2 bg-[#f8f9fa]'>
          {/* Top Filters Row */}
          <div className='flex flex-wrap items-center gap-2'>
            <input
              type='datetime-local'
              className='h-[30px] w-[200px] border border-[#dbdbdb] px-2 text-[13px] outline-none rounded-sm'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type='datetime-local'
              className='h-[30px] w-[200px] border border-[#dbdbdb] px-2 text-[13px] outline-none rounded-sm'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              className='bg-gradient-to-b from-[#3ba2b8] to-[#1e7e92] text-white h-[30px] w-[60px] px-2 text-[13px] rounded shadow-sm border border-[#1a6e80]'
            >
              Go
            </button>
            <button
              onClick={handleReset}
              className='bg-gradient-to-b from-[#3ba2b8] to-[#1e7e92] text-white h-[30px] w-[60px] px-2 text-[13px] rounded shadow-sm border border-[#1a6e80]'
            >
              Reset
            </button>
          </div>

          <div className='scrollbar-hide overflow-x-auto mt-3 border border-[#dbdbdb] bg-white'>
            <table className='w-full min-w-[600px] border-collapse text-left text-[13px]'>
              <thead>
                <tr className='bg-[#008ba3] text-white'>
                  <th className='border-r border-white/20 px-3 py-2 font-bold'>
                    Sport
                  </th>
                  <th className='border-r border-white/20 px-3 py-2 font-bold'>
                    Market Name
                  </th>
                  <th className='px-3 py-2 font-bold text-right'>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan='3'
                      className='border border-gray-200 px-3 py-2 text-center'
                    >
                      Loading...
                    </td>
                  </tr>
                ) : proLossHistory && proLossHistory.length > 0 ? (
                  <>
                    {proLossHistory.map((row, index) => (
                      <tr
                        key={index}
                        className='border-b border-gray-200 hover:bg-gray-50'
                      >
                        <td className='border-r border-gray-200 px-3 py-2 text-[#333]'>
                          {row.gameName === 'Cricket Game' ? 'Cricket' : row.gameName === 'Tennis Game' ? 'Tennis' : row.gameName === 'Soccer Game' ? 'Soccer' : row.gameName || '-'}
                        </td>
                        <td className='border-r border-gray-200 px-3 py-2 text-[#333]'>
                          {row.marketName || '-'}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${Number(row.myProfit) >= 0 ? 'text-[#008000]' : 'text-[#ff0000]'}`}
                        >
                          {Number(row.myProfit || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className='border-b border-gray-200'>
                      <td colSpan='2' className='border-r border-gray-200 px-3 py-2 font-bold text-[#333]'>
                        Total
                      </td>
                      <td
                        className={`px-3 py-2 text-right ${totalPL >= 0 ? 'text-[#008000]' : 'text-[#ff0000]'}`}
                      >
                        {totalPL.toFixed(2)}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td
                      colSpan='3'
                      className='h-8 border border-gray-300 p-2 text-center'
                    >
                      {t('no_data_found', 'No data found')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfitLoss;
