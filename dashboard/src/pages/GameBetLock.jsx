import React, { useState } from 'react';
import { AiOutlinePlus, AiOutlineMinus } from 'react-icons/ai';
import { FaArrowRight } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import { ImPlus, ImMinus } from 'react-icons/im';
const GameBetLock = () => {
  const [selected, setSelected] = useState({});
  const [openIds, setOpenIds] = useState([1, 2]);

  const toggleCheckbox = (key) => {
    setSelected((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const sportsTabs = [
    'Cricket',
    'Soccer',
    'Tennis',
    'Kabaddi',
    'Election',
    'Horse',
    'GreyHound',
  ];

  const competitionData = [
    {
      id: 1,
      title: '101480 - Indian Premier League',
      checked: false,
      children: [
        {
          id: 11,
          title: '35617510 - Chennai Super Kings v Mumbai Indians',
          checked: false,
          markets: [
            {
              id: 111,
              name: '43814603 - Bookmaker 0 Commission',
              checked: false,
            },
            {
              id: 112,
              name: '43814604 - To Win The Toss',
              checked: false,
            },
            {
              id: 113,
              name: '1.258307842 - Match Odds',
              checked: false,
            },
          ],
        },
      ],
    },

    {
      id: 2,
      title: '11365612 - Test Matches',
      checked: false,
      children: [
        {
          id: 21,
          title: '35617510 - England Lions v South Africa A',
          checked: false,
          markets: [
            {
              id: 211,
              name: '43814603 - Bookmaker 0 Commission',
              checked: false,
            },
            {
              id: 212,
              name: '43814604 - To Win The Toss',
              checked: false,
            },
            {
              id: 213,
              name: '1.258307842 - Match Odds',
              checked: false,
            },
          ],
        },
      ],
    },

    {
      id: 3,
      title: '11893330 - T20 Blast',
      checked: false,
      children: [
        {
          id: 31,
          title: '35617511 - Yorkshire v Lancashire',
          checked: false,
          markets: [
            {
              id: 311,
              name: '43814605 - Match Odds',
              checked: false,
            },
            {
              id: 312,
              name: '43814606 - Top Batsman',
              checked: false,
            },
          ],
        },
      ],
    },

    {
      id: 4,
      title: "12735685 - Women's T20 Blast",
      checked: false,
      children: [
        {
          id: 41,
          title: '35617512 - Sydney Women v Brisbane Women',
          checked: false,
          markets: [
            {
              id: 411,
              name: '43814607 - Match Odds',
              checked: false,
            },
            {
              id: 412,
              name: '43814608 - To Win Toss',
              checked: false,
            },
          ],
        },
      ],
    },

    {
      id: 5,
      title: "12735687 - Women's T20 Blast Div 2",
      checked: false,
      children: [
        {
          id: 51,
          title: '35617513 - Adelaide Women v Perth Women',
          checked: false,
          markets: [
            {
              id: 511,
              name: '43814609 - Match Odds',
              checked: false,
            },
            {
              id: 512,
              name: '43814610 - Over/Under',
              checked: false,
            },
          ],
        },
      ],
    },
  ];

  const toggleOpen = (id) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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
        <div className='grid grid-cols-3 rounded-lg bg-white px-[15px] py-[7px]'>
          <div className='col-span-2'>
            <div className='mb-2 text-[15px] font-bold'>
              Lock Application - rakesh1234567890
            </div>

            {/* Event Type */}
            <SectionBox title='Event Type:'>
              <div className='flex flex-wrap gap-3 px-2 text-[14px]'>
                {[
                  'Cricket',
                  'Soccer',
                  'Tennis',
                  'Kabaddi',
                  'Election',
                  'Horse',
                  'GreyHound',
                ].map((item) => (
                  <CheckboxItem key={item} label={item} id={item} />
                ))}
              </div>
            </SectionBox>

            {/* Type */}
            <SectionBox title='Type:'>
              <div className='flex flex-wrap gap-3 px-2 text-[14px]'>
                {[
                  'All Odds',
                  'Exch Bookmaker',
                  'All Bookmaker',
                  'Betfair Fancy',
                  'Exch Fancy',
                  'Other Fancy',
                ].map((item) => (
                  <CheckboxItem key={item} label={item} id={item} />
                ))}
              </div>
            </SectionBox>

            {/* Market Type */}
            <SectionBox title='Market Type:'>
              {/* Cricket */}
              <div className='mb-2'>
                <div className='-mt-2.5 mb-2 px-1 text-[14px] font-bold'>
                  Cricket
                </div>

                <div className='flex flex-wrap gap-x-3 gap-y-2 px-2 text-[14px]'>
                  {[
                    'Match Odds',
                    'Bookmaker',
                    'Special Maker',
                    'Tournament Winner',
                    'Tied Match',
                    'Completed Match',
                    'To Win the Toss',
                    '1st Inning Runs',
                    '1st Inning 6 Ovr Line',
                    '1st Inning 10 Ovr Line',
                    '1st Inning 15 Ovr Line',
                    '1st Inning 20 Ovr Line',
                    '2nd inning Runs',
                    '2nd Inning 6 Ovr Line',
                    '2nd Inning 10 Ovr Line',
                    '2nd Inning 15 Ovr Line',
                    'Over',
                    'Lambi',
                    'Batsman',
                    'Single Over',
                    'Odd Even',
                    'Three Selection',
                    'Ball By Ball',
                    'Lottery',
                  ].map((item) => (
                    <CheckboxItem key={item} label={item} id={item} />
                  ))}
                </div>
              </div>

              {/* Soccer */}
              <div className='mb-2'>
                <h2 className='mb-2 px-1 text-[14px] font-bold'>Soccer</h2>

                <div className='flex flex-wrap gap-x-3 gap-y-2 px-2 text-[14px]'>
                  {[
                    'Match Odds',
                    'Bookmaker',
                    'Special Maker',
                    'Over Under 05',
                    'Over Under 15',
                    'Over Under 25',
                    'Over Under 35',
                    'Lottery',
                  ].map((item) => (
                    <CheckboxItem
                      key={`soccer-${item}`}
                      label={item}
                      id={`soccer-${item}`}
                    />
                  ))}
                </div>
              </div>

              {/* Tennis */}
              <div className='mb-2'>
                <h2 className='mb-2 px-1 text-[14px] font-bold'>Tennis</h2>

                <div className='flex flex-wrap gap-x-3 gap-y-2 px-2 text-[14px]'>
                  {[
                    'Match Odds',
                    'Set Winner',
                    'Bookmaker',
                    'Special Maker',
                    'Lottery',
                  ].map((item) => (
                    <CheckboxItem
                      key={`tennis-${item}`}
                      label={item}
                      id={`tennis-${item}`}
                    />
                  ))}
                </div>
              </div>
            </SectionBox>

            {/* Header */}
            <div className='mt-2 flex items-center justify-between'>
              <h2 className='text-[14px] font-semibold'>
                Competition / Event / Markets
              </h2>

              <select className='min-w-[220px] rounded border border-gray-300 bg-white px-2 py-2 text-[14px] text-gray-600'>
                <option>May 22, 2026</option>
              </select>
            </div>

            {/* Tabs */}
            <div className='mb-3 flex items-center border-b border-gray-300'>
              {sportsTabs.map((tab, index) => (
                <button
                  key={index}
                  className={`px-4 py-2 text-[14px] whitespace-nowrap ${
                    index === 0
                      ? '-mb-px border border-gray-300 border-b-white bg-white'
                      : ''
                  } `}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Competition List */}
            <div className='space-y-3'>
              {competitionData.map((competition) => {
                const isOpen = openIds.includes(competition.id);

                return (
                  <div key={competition.id}>
                    {/* Competition Row */}
                    <div className='flex items-center justify-between bg-[#169bb3] px-2 py-1 font-semibold text-white'>
                      <div className='flex items-center gap-2'>
                        <span className='text-[14px]'>{competition.title}</span>

                        <input
                          type='checkbox'
                          checked={selected[competition.id] || false}
                          onChange={() => toggleCheckbox(competition.id)}
                          className="relative h-4 w-4 cursor-pointer appearance-none border border-gray-400 bg-white after:absolute after:top-1/2 after:left-1/2 after:hidden after:-translate-x-1/2 after:-translate-y-1/2 after:text-[15px] after:font-bold after:text-white after:content-['✓'] checked:border-black checked:bg-black checked:after:block"
                        />
                      </div>

                      <button onClick={() => toggleOpen(competition.id)}>
                        {isOpen ? <ImMinus size={12} /> : <ImPlus size={12} />}
                      </button>
                    </div>

                    {/* Children */}
                    {isOpen &&
                      competition.children.map((event) => (
                        <div key={event.id} className='mt-2 ml-12'>
                          {/* Event Row */}
                          <div className='flex items-center gap-2 bg-[#066f88] px-4 py-1 font-semibold text-white'>
                            <span className='text-[14px]'>{event.title}</span>

                            <input
                              type='checkbox'
                              checked={selected[event.id] || false}
                              onChange={() => toggleCheckbox(event.id)}
                              className="relative h-4 w-4 cursor-pointer appearance-none border border-gray-400 bg-gray-200 after:absolute after:top-1/2 after:left-1/2 after:hidden after:-translate-x-1/2 after:-translate-y-1/2 after:text-[15px] after:font-bold after:text-white after:content-['✓'] checked:border-black checked:bg-black checked:after:block"
                            />
                          </div>

                          {/* Markets */}
                          <div>
                            {event.markets.map((market) => (
                              <div
                                key={market.id}
                                className='flex items-center gap-2 border-b border-gray-200 py-1 pr-2 pl-7'
                              >
                                <FaArrowRight className='text-[14px]' />

                                <span className='text-[14px]'>
                                  {market.name}
                                </span>

                                <input
                                  type='checkbox'
                                  checked={selected[market.id] || false}
                                  onChange={() => toggleCheckbox(market.id)}
                                  className="relative h-4 w-4 cursor-pointer appearance-none border border-gray-400 bg-gray-200 after:absolute after:top-1/2 after:left-1/2 after:hidden after:-translate-x-1/2 after:-translate-y-1/2 after:text-[15px] after:font-bold after:text-white after:content-['✓'] checked:border-black checked:bg-black checked:after:block"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
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
                  <td className='px-1 py-0.5'>ET</td>
                  <td className='px-1 py-0.5'>Cricket</td>
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

export default GameBetLock;
