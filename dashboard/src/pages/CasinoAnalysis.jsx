import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useSelector, useDispatch } from 'react-redux';
import { getCasinoAnalysis } from '../redux/reducer/marketAnalyzeReducer';

const CasinoAnalysis = () => {
  const dispatch = useDispatch();

  const [searchTerm, setSearchTerm] = useState('');

  const { casinoAnalysisLoading, errorMessage } = useSelector(
    (state) => state.market
  );

  useEffect(() => {
    dispatch(getCasinoAnalysis());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(getCasinoAnalysis());
  };

  // Static Data
  const casinoAnalysisData = [
    {
      eventName: 'Live Teenpatti',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Teenpatti T20',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: '32 Card Casino',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Hi Low',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Poker',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Six player poker',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Poker 20-20',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Bollywood Casino',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Casino Meter',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Casino War',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Muflis Teenpatti',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Trio',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Queen Race',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Teenpatti Test',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Teenpatti Open',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: '2 Card Teenpatti',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'The Trap',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: '29 Card Baccarat',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Race to 17',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Andar Bahar',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Race 20-20',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Matka',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Baccarat',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Sicbo',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Roulette',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: '7 Up & Down',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Dragon Tiger',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Amar Akbar Anthony',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
  ];

  const virtualCasinoData = [
    {
      eventName: 'Teenpatti One Day (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Teenpatti T20 (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: '32 Card Casino (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Hi Low (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Poker (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Six Player Poker (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Andar Bahar (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Matka (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Roulette (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: '7 Up & Down (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Dragon Tiger (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
    {
      eventName: 'Amar Akbar Anthony (virtual)',
      totalOrder: 0,
      exposure: 0,
      totalAmount: 0,
      maxProfit: 0,
    },
  ];

  return (
    <>
      <Navbar />

      <div className='scrollbar-hide md:px-[15px] md:pt-[13px] pb-10'>
        <div className='min-h-[600px] rounded-sm bg-white px-[15px] py-[7px]'>
          {/* Header */}
          <div className='flex items-center justify-between'>
            <h1 className='text-[16px] font-bold text-gray-800'>
              Indian Poker Analysis
            </h1>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className='mt-2 rounded border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-600'>
              {errorMessage}
            </div>
          )}

          {/* live casino Table */}
          <div className='mt-1 border border-[#159eb6]'>
            {/* Table Heading */}
            <div className='bg-[#159eb6] px-2.5 py-0.5 text-[16px] font-bold text-white'>
              Live Casino
            </div>

            {/* Loader */}
            {casinoAnalysisLoading ? (
              <div className='p-5 text-center'>Loading...</div>
            ) : (
              <div className='overflow-x-auto p-2.5'>
                <table className='w-[1000px] border-collapse md:w-full'>
                  {/* Table Head */}
                  <thead>
                    <tr className='bg-[#045662] text-white text-[14px]'>
                      <th className='w-[54%] border-r border-white px-2.5 py-0.5 text-left'>
                        Event Name
                      </th>

                      <th className='w-[10%] border-r border-white px-2.5 py-0.5 text-right'>
                        Total Order
                      </th>

                      <th className='w-[12%] border-r border-white px-2.5 py-0.5 text-right'>
                        Exposure
                      </th>

                      <th className='w-[12%] border-r border-white px-2.5 py-0.5 text-right'>
                        Total Amount
                      </th>

                      <th className='w-[12%] px-2.5 py-0.5 text-right'>
                        Max Profit
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody>
                    {casinoAnalysisData.map((item, index) => (
                      <tr
                        key={index}
                        className='border border-gray-200 hover:bg-gray-50 text-[14px]'
                      >
                        <td className='border-r border-gray-200 px-2.5 py-0.5 font-bold underline hover:text-blue-600'>
                          {item.eventName}
                        </td>

                        <td className='border-r border-gray-200 px-2.5 py-0.5 text-right font-bold'>
                          {item.totalOrder}
                        </td>

                        <td className='border-r border-gray-200 px-2.5 py-0.5 text-right font-bold text-green-600'>
                          {item.exposure}
                        </td>

                        <td className='border-r border-gray-200 px-2.5 py-0.5 text-right font-bold'>
                          {item.totalAmount}
                        </td>

                        <td className='px-2.5 py-0.5 text-right font-bold'>
                          {item.maxProfit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* virtual casino Table */}
          <div className='mt-2 border border-[#159eb6]'>
            {/* Table Heading */}
            <div className='bg-[#159eb6] px-2.5 py-0.5 text-[16px] font-bold text-white'>
              Live Casino
            </div>

            {/* Loader */}
            {casinoAnalysisLoading ? (
              <div className='p-5 text-center'>Loading...</div>
            ) : (
              <div className='overflow-x-auto p-2.5'>
                <table className='w-[1000px] border-collapse md:w-full'>
                  {/* Table Head */}
                  <thead>
                    <tr className='bg-[#045662] text-white text-[14px]'>
                      <th className='w-[54%] border-r border-white px-2.5 py-0.5 text-left'>
                        Event Name
                      </th>

                      <th className='w-[10%] border-r border-white px-2.5 py-0.5 text-right'>
                        Total Order
                      </th>

                      <th className='w-[12%] border-r border-white px-2.5 py-0.5 text-right'>
                        Exposure
                      </th>

                      <th className='w-[12%] border-r border-white px-2.5 py-0.5 text-right'>
                        Total Amount
                      </th>

                      <th className='w-[12%] px-2.5 py-0.5 text-right'>
                        Max Profit
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody>
                    {virtualCasinoData.map((item, index) => (
                      <tr
                        key={index}
                        className='border border-gray-200 hover:bg-gray-50'
                      >
                        <td className='border-r border-gray-200 px-2.5 py-0.5 font-bold underline hover:text-blue-600'>
                          {item.eventName}
                        </td>

                        <td className='border-r border-gray-200 px-2.5 py-0.5 text-right font-bold'>
                          {item.totalOrder}
                        </td>

                        <td className='border-r border-gray-200 px-2.5 py-0.5 text-right font-bold text-green-600'>
                          {item.exposure}
                        </td>

                        <td className='border-r border-gray-200 px-2.5 py-0.5 text-right font-bold'>
                          {item.totalAmount}
                        </td>

                        <td className='px-2.5 py-0.5 text-right font-bold'>
                          {item.maxProfit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CasinoAnalysis;
