import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProLoss } from '../../redux/reducer/betReducer';
import { getUser } from '../../redux/reducer/authReducer';

function ProfitLoss() {
  const dispatch = useDispatch();
  const { proLossHistory, loading } = useSelector((state) => state.bet);
  const { userInfo } = useSelector((state) => state.auth);

  // Date setup - default to last 4 months
  const currentDate = new Date();
  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(currentDate.getMonth() - 4);
  const formatDate = (date) => date.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(formatDate(fourMonthsAgo));
  const [endDate, setEndDate] = useState(formatDate(currentDate));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100); // High limit for P/L report by default

  const fetchProfitLoss = useCallback(() => {
    if (!startDate || !endDate || !userInfo?._id) return;
    dispatch(
      getProLoss({
        startDate,
        endDate,
        page,
        limit,
      })
    );
  }, [dispatch, startDate, endDate, page, limit, userInfo?._id]);

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
    setStartDate(formatDate(fourMonthsAgo));
    setEndDate(formatDate(currentDate));
    setPage(1);
    // Let the useEffect trigger the fetch
  };

  const handleSubmit = () => {
    setPage(1);
    fetchProfitLoss();
  };

  return (
    <div className='w-full overflow-x-auto p-0.5'>
      <div className='w-full border border-[#00000020] bg-[#fff] shadow-[0_0_5px_#a4a4a4]'>
        <div className='bg-secondary text-secondary p-2'>
          <h4 className='text-[16px] font-[400]'>Profit & Loss Report</h4>
        </div>
        <div className='mb-2 w-full p-2'>
          <div className='flex flex-wrap gap-2'>
            <input
              type='date'
              placeholder='Start Date'
              className='h-[38px] border border-[#dbdbdb] p-1 outline-none'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <input
              type='date'
              placeholder='End Date'
              className='h-[38px] border border-[#dbdbdb] p-1 outline-none'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <button
              onClick={handleSubmit}
              className='bg-primary text-primary h-[38px] w-[80px] rounded-xs px-4 py-1 text-[16px] font-[400] lg:w-auto'
            >
              Go
            </button>
            <button
              onClick={handleReset}
              className='bg-primary text-primary h-[38px] w-[80px] rounded-xs px-4 py-1 text-[16px] font-[400] lg:w-auto'
            >
              Reset
            </button>
          </div>

          <div className='scrollbar-hide mt-4 overflow-x-auto'>
            <table className='w-full min-w-[600px] border border-gray-300'>
              <thead>
                <tr className='bg-[#e0e6e6]'>
                  <th className='h-8 border border-gray-300 p-2 text-left text-sm font-semibold whitespace-nowrap'>
                    Event / Game Name
                  </th>
                  <th className='h-8 border border-gray-300 p-2 text-left text-sm font-semibold whitespace-nowrap'>
                    Win Amount
                  </th>
                  <th className='h-8 border border-gray-300 p-2 text-left text-sm font-semibold whitespace-nowrap'>
                    Loss Amount
                  </th>
                  <th className='h-8 border border-gray-300 p-2 text-left text-sm font-semibold whitespace-nowrap'>
                    Net Profit
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan='4'
                      className='h-8 border border-gray-300 p-2 text-center'
                    >
                      Loading...
                    </td>
                  </tr>
                ) : proLossHistory && proLossHistory.length > 0 ? (
                  proLossHistory.map((item, index) => (
                    <tr
                      key={item._id || item.name || index}
                      className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    >
                      <td className='h-8 border border-gray-300 p-2 text-left text-sm'>
                        {item.name || item.gameName || item.eventName || '-'}
                      </td>
                      <td className='h-8 border border-gray-300 p-2 text-left text-sm font-medium text-green-600'>
                        {Number(item.WinAmount || 0).toFixed(2)}
                      </td>
                      <td className='h-8 border border-gray-300 p-2 text-left text-sm font-medium text-red-600'>
                        {Number(item.LossAmount || 0).toFixed(2)}
                      </td>
                      <td
                        className={`h-8 border border-gray-300 p-2 text-left text-sm font-bold ${Number(item.myProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {Number(item.myProfit || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan='4'
                      className='h-8 border border-gray-300 p-2 text-center'
                    >
                      No data found
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
