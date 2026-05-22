import React, { useState } from 'react';
import { AiOutlineMinusSquare, AiOutlinePlusSquare } from 'react-icons/ai';
import { RxCross2 } from 'react-icons/rx';

import Navbar from '../components/Navbar';

const CasinoLock = () => {
  const [selected, setSelected] = useState({});
  const [open, setOpen] = useState(false);

  const toggleCheckbox = (key) => {
    setSelected((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const casinoData = [
    'Live Teenpatti',
    'Teenpatti T20',
    '32 cards casino',
    'Hi Low',
    'Poker',
    'Poker 20-20',
    'Bollywood Casino',
    'Mufflis Teenpatti',
    'Trio',
    'Queen Race',
    'Teenpati Test',
  ];

  const CheckboxItem = ({ label, id }) => (
    <label className='flex cursor-pointer items-center gap-1.5'>
      <span className='text-[14px]'>{label}</span>
      <input
        type='checkbox'
        checked={selected[id] || false}
        onChange={() => toggleCheckbox(id)}
        className="relative h-[18px] w-[18px] cursor-pointer appearance-none border border-black bg-gray-200 after:absolute after:top-1/2 after:left-1/2 after:hidden after:-translate-x-1/2 after:-translate-y-1/2 after:text-[14px] after:font-bold after:text-white after:content-['✓'] checked:border-black checked:bg-black checked:after:block"
      />
    </label>
  );

  const SectionBox = ({ title, children }) => (
    <fieldset className='mb-1.5 rounded-sm border border-gray-500 px-3 pt-3 pb-4'>
      <legend className='px-1 text-[14px] font-semibold'>{title}</legend>
      {children}
    </fieldset>
  );

  return (
    <>
      <Navbar />
      <div className="scrollbar-hide pt-[15px]' bg-[#f0f0f5] px-[15px] py-[13px]">
        <div className='grid grid-cols-3 rounded-lg bg-white px-[15px] py-[7px] h-[calc(100vh-123px)]'>
          <div className='col-span-2'>
            {/* Event Type */}
            <SectionBox title='Provider:'>
              <div className='flex flex-wrap gap-3 px-2 text-[14px]'>
                {[
                  'Indian Poker/ Live Casino',
                  'Indian Poker II',
                  'Evolution',
                  'Vivo',
                  'Betgames',
                  'Casino III',
                  'Spribe',
                  'Mac88',
                  'Chicken Road',
                  'Rvgames',
                  'Ezugi',
                ].map((item) => (
                  <CheckboxItem key={item} label={item} id={item} />
                ))}
              </div>
            </SectionBox>

            <div className='mt-2 flex items-center px-2'>
              <h2 className='text-[14px] font-semibold'>Casino Control</h2>
            </div>

            <div className='ml-6'>
              {/* Header */}
              <div
                onClick={() => setOpen(!open)}
                className='flex cursor-pointer items-center gap-2 py-2'
              >
                {open ? (
                  <AiOutlineMinusSquare size={13}/>
                ) : (
                <AiOutlinePlusSquare size={13}/>
                )}

                <span className='text-[12px] font-semibold'>Indian Poker</span>
              </div>

              {/* List */}
              {open && (
                <div className='ml-7 flex flex-col gap-3'>
                {casinoData.map((item, index) => (
                  <div key={index} className='flex items-center gap-2'>
                    {/* Cross Icon */}
                    <div className='flex items-center justify-center border border-gray-300 bg-white'>
                      <RxCross2 className='text-gray-400' size={12} />
                    </div>

                    {/* Text */}
                    <span className='text-[12px] font-semibold'>{item}</span>

                    {/* Checkbox */}
                    <input
                        type='checkbox'
                        className="relative h-[18px] w-[18px] cursor-pointer appearance-none border border-black bg-gray-200 after:absolute after:top-1/2 after:left-1/2 after:hidden after:-translate-x-1/2 after:-translate-y-1/2 after:text-[14px] after:font-bold after:text-white after:content-['✓'] checked:border-black checked:bg-black checked:after:block"
                    />
                  </div>
                ))}
              </div>
              )}
              


            </div>
          </div>
          <div className='col-span-1 pr-[15px] pl-[30px]'>
            <table className='w-full'>
              <thead>
                <tr className='bg-[#066f88] text-[12px] text-white'>
                  <th className='px-1 py-0.5 text-left font-normal'>User</th>
                  <th className='px-1 py-0.5 text-left font-normal'>Type</th>
                  <th className='px-1 py-0.5 text-left font-normal'>
                    Description
                  </th>
                  <th className='px-1 py-0.5 text-left font-normal'>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className='text-[12px]'>
                  <td className='px-1 py-0.5'>rakesh</td>
                  <td className='px-1 py-0.5'>provider</td>
                  <td className='px-1 py-0.5'></td>
                  <td className='px-1 py-0.5'>
                    <span className='inline-block rounded-sm bg-red-600 p-0.5 font-semibold text-white'>
                      Del
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default CasinoLock;
