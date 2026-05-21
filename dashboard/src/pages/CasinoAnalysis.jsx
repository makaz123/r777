import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useSelector, useDispatch } from 'react-redux';
import { getCasinoAnalysis } from '../redux/reducer/marketAnalyzeReducer';
import Loader from '../components/Loader';
import { IoMdRefresh as IoRefresh } from 'react-icons/io';
import { AiOutlineSearch as SearchIcon } from 'react-icons/ai';

const CasinoAnalysis = () => {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');

  const { casinoAnalysisData, casinoAnalysisLoading, errorMessage } =
    useSelector((state) => state.market);

  useEffect(() => {
    dispatch(getCasinoAnalysis());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(getCasinoAnalysis());
  };

  // Filtered games based on search term
  const filteredData = Array.isArray(casinoAnalysisData)
    ? casinoAnalysisData.filter((item) =>
        item.eventName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div className='flex min-h-screen flex-col bg-gray-50 font-sans'>
      <Navbar />

      <main className='mx-auto w-full max-w-7xl flex-1 p-4 md:p-6'>
        {/* Page Title & Breadcrumb */}
        <div className='mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <h1 className='text-xl font-bold tracking-tight text-gray-800 md:text-2xl'>
              Indian Poker Analysis
            </h1>
            <p className='mt-1 text-sm text-gray-500'>
              Real-time exposure, orders, and GGR analysis for pending casino
              games.
            </p>
          </div>

          {/* Search & Actions Bar */}
          <div className='flex w-full items-center gap-3 md:w-auto'>
            <div className='relative flex-1 md:w-72'>
              <span className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400'>
                <SearchIcon size={18} />
              </span>
              <input
                type='text'
                placeholder='Search casino games...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-9 text-sm text-gray-700 placeholder-gray-400 transition-all focus:border-[#18b0c8] focus:ring-2 focus:ring-[#18b0c8] focus:outline-none'
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={casinoAnalysisLoading}
              className='flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white p-2.5 text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-[#18b0c8] disabled:opacity-50'
              title='Refresh live stats'
            >
              <IoRefresh
                size={18}
                className={`${casinoAnalysisLoading ? 'animate-spin text-[#18b0c8]' : 'text-gray-600'}`}
              />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className='mb-6 flex items-center justify-between rounded-r-lg border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700 shadow-sm'>
            <span>{errorMessage}</span>
            <button
              onClick={handleRefresh}
              className='cursor-pointer text-xs font-semibold text-red-500 underline transition-colors hover:text-red-800'
            >
              Retry
            </button>
          </div>
        )}

        {/* Casino Table Card */}
        <div className='overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition-all duration-300 hover:shadow-lg'>
          {/* Header Bar matching style */}
          <div className='flex items-center justify-between border-b border-cyan-500 bg-[#18b0c8] px-5 py-3.5'>
            <h2 className='text-base font-semibold tracking-wide text-white md:text-lg'>
              Live Casino
            </h2>
            <span className='rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white'>
              {filteredData.length} active games
            </span>
          </div>

          {casinoAnalysisLoading && filteredData.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20'>
              <Loader />
              <p className='mt-4 animate-pulse text-sm text-gray-400'>
                Fetching live GGR metrics...
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse text-left'>
                <thead>
                  <tr className='bg-[#022c43] text-[13px] font-semibold text-white select-none'>
                    <th className='border-r border-[#0d3b56]/20 px-5 py-3'>
                      Event Name
                    </th>
                    <th className='border-r border-[#0d3b56]/20 px-5 py-3 text-right'>
                      Total Order
                    </th>
                    <th className='border-r border-[#0d3b56]/20 px-5 py-3 text-right'>
                      Total Amount
                    </th>
                    <th className='px-5 py-3 text-right'>Max Profit</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 text-sm'>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan='4'
                        className='py-12 text-center text-gray-400'
                      >
                        No casino games found matching search term.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row, idx) => {
                      const hasStats =
                        row.totalOrder > 0 ||
                        row.totalAmount > 0 ||
                        row.maxProfit !== 0;

                      return (
                        <tr
                          key={idx}
                          className={`group transition-colors hover:bg-cyan-50/30 ${
                            hasStats ? 'bg-amber-50/10' : ''
                          }`}
                        >
                          <td className='border-r border-gray-100 px-5 py-3'>
                            <span className='cursor-pointer font-medium text-cyan-600 transition-all duration-200 hover:text-cyan-800 hover:underline'>
                              {row.eventName}
                            </span>
                            {hasStats && (
                              <span className='ml-2 inline-flex animate-pulse items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800'>
                                Live
                              </span>
                            )}
                          </td>
                          <td className='border-r border-gray-100 px-5 py-3 text-right font-semibold text-gray-700'>
                            <span
                              className={
                                row.totalOrder > 0 ? 'text-[#18b0c8]' : ''
                              }
                            >
                              {row.totalOrder.toLocaleString()}
                            </span>
                          </td>
                          <td className='border-r border-gray-100 px-5 py-3 text-right font-semibold text-gray-700'>
                            <span>
                              {row.totalAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className='px-5 py-3 text-right font-bold text-gray-800'>
                            <span
                              className={
                                row.maxProfit > 0
                                  ? 'font-extrabold text-emerald-600'
                                  : row.maxProfit < 0
                                    ? 'font-extrabold text-red-600'
                                    : ''
                              }
                            >
                              {row.maxProfit.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CasinoAnalysis;
