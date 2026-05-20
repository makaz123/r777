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

  const { casinoAnalysisData, casinoAnalysisLoading, errorMessage } = useSelector(
    (state) => state.market
  );

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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">
              Indian Poker Analysis
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time exposure, orders, and GGR analysis for pending casino games.
            </p>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <SearchIcon size={18} />
              </span>
              <input
                type="text"
                placeholder="Search casino games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#18b0c8] focus:border-[#18b0c8] transition-all"
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={casinoAnalysisLoading}
              className="flex items-center justify-center p-2.5 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#18b0c8] disabled:opacity-50 transition-all shadow-sm cursor-pointer"
              title="Refresh live stats"
            >
              <IoRefresh
                size={18}
                className={`${casinoAnalysisLoading ? 'animate-spin text-[#18b0c8]' : 'text-gray-600'}`}
              />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-sm text-red-700 flex items-center justify-between shadow-sm">
            <span>{errorMessage}</span>
            <button
              onClick={handleRefresh}
              className="text-red-500 hover:text-red-800 underline font-semibold text-xs transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Casino Table Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg">
          {/* Header Bar matching style */}
          <div className="bg-[#18b0c8] px-5 py-3.5 flex items-center justify-between border-b border-cyan-500">
            <h2 className="text-base md:text-lg font-semibold text-white tracking-wide">
              Live Casino
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-white/20 text-white rounded-full">
              {filteredData.length} active games
            </span>
          </div>

          {casinoAnalysisLoading && filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader />
              <p className="text-sm text-gray-400 mt-4 animate-pulse">
                Fetching live GGR metrics...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#022c43] text-white text-[13px] font-semibold select-none">
                    <th className="py-3 px-5 border-r border-[#0d3b56]/20">Event Name</th>
                    <th className="py-3 px-5 text-right border-r border-[#0d3b56]/20">Total Order</th>
                    <th className="py-3 px-5 text-right border-r border-[#0d3b56]/20">Total Amount</th>
                    <th className="py-3 px-5 text-right">Max Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-gray-400">
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
                          className={`hover:bg-cyan-50/30 transition-colors group ${
                            hasStats ? 'bg-amber-50/10' : ''
                          }`}
                        >
                          <td className="py-3 px-5 border-r border-gray-100">
                            <span className="font-medium text-cyan-600 hover:text-cyan-800 hover:underline cursor-pointer transition-all duration-200">
                              {row.eventName}
                            </span>
                            {hasStats && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 animate-pulse">
                                Live
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-5 text-right font-semibold text-gray-700 border-r border-gray-100">
                            <span className={row.totalOrder > 0 ? 'text-[#18b0c8]' : ''}>
                              {row.totalOrder.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right font-semibold text-gray-700 border-r border-gray-100">
                            <span>
                              {row.totalAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-gray-800">
                            <span className={row.maxProfit > 0 ? 'text-emerald-600 font-extrabold' : row.maxProfit < 0 ? 'text-red-600 font-extrabold' : ''}>
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
