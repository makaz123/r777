import { useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';

const UserWinLoss = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoad = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/get/users/win-loss', {
        params: { startDate, endDate },
      });
      setData(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setData([]);
    setError('');
  };

  const totals = data.reduce(
    (acc, row) => ({
      casinoPL: acc.casinoPL + row.casinoPL,
      sportsPL: acc.sportsPL + row.sportsPL,
      totalPL: acc.totalPL + row.totalPL,
    }),
    { casinoPL: 0, sportsPL: 0, totalPL: 0 }
  );

  return (
    <>
      <Navbar />
      <div className='px-[15px] md:px-7.5'>
        <div className='py-2 text-[22px]'>User Win Loss</div>

        <div className='mt-3 mb-6 flex items-end gap-2'>
          <div className='grid'>
            <span>Search By Client Name</span>
            <input
              type='type'
              className='mt-1 min-w-[200px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
              placeholder='Select Option'
            />
          </div>
          <div className='grid'>
            <span>From Date</span>
            <input
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className='mt-1 min-w-[200px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
            />
          </div>
          <div className='grid'>
            <span>To Date</span>
            <input
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className='mt-1 min-w-[200px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
            />
          </div>
          <div
            onClick={handleLoad}
            className='ml-1 cursor-pointer rounded bg-[#0088cc] px-3 py-1.5 text-white'
          >
            {loading ? 'Loading...' : 'Load'}
          </div>
          <div
            onClick={handleReset}
            className='ml-1 cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-black'
          >
            Reset
          </div>
        </div>

        {error && <div className='mb-4 text-red-500'>{error}</div>}

        <div>
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse border border-gray-300'>
              <thead>
                <tr className='bg-gray-50'>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-start px-2 text-[13px]'>
                      No
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-start px-2 text-[13px]'>
                      User Name
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-end px-2 text-[13px]'>
                      Casino
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-end px-2 text-[13px]'>
                      Sports
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-end px-2 text-[13px]'>
                      Profit Loss
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? (
                  <>
                    {data.map((row, i) => (
                      <tr key={row.userId}>
                        <td className='border border-gray-200/60'>
                          <div className='px-2 text-[13px]'>{i + 1}</div>
                        </td>
                        <td className='border border-gray-200/60'>
                          <div className='px-2 text-[13px]'>{row.userName}</div>
                        </td>
                        <td className='border border-gray-200/60'>
                          <div className={`px-2 text-right text-[13px]`}>
                            {row.casinoPL.toFixed(2)}
                          </div>
                        </td>
                        <td className='border border-gray-200/60'>
                          <div className={`px-2 text-right text-[13px]`}>
                            {row.sportsPL.toFixed(2)}
                          </div>
                        </td>
                        <td className='border border-gray-200/60'>
                          <div
                            className={`px-2 text-right text-[13px] font-semibold`}
                          >
                            {row.totalPL.toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className='font-bold'>
                      <td
                        className='border border-gray-200/60'
                        colSpan={2}
                      ></td>
                      <td className='border border-gray-200/60'>
                        <div className={`px-2 text-right text-[13px]`}>
                          {totals.casinoPL.toFixed(2)}
                        </div>
                      </td>
                      <td className='border border-gray-200/60'>
                        <div className={`px-2 text-right text-[13px]`}>
                          {totals.sportsPL.toFixed(2)}
                        </div>
                      </td>
                      <td className='border border-gray-200/60'>
                        <div className={`px-2 text-right text-[13px]`}>
                          {totals.totalPL.toFixed(2)}
                        </div>
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className='border border-gray-200/60 py-4 text-center text-gray-500'
                    >
                      {loading
                        ? 'Loading...'
                        : 'No data. Select date range and click Load.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserWinLoss;
