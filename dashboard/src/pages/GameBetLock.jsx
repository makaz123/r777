import React, { useState, useEffect, useCallback } from 'react';
import { ImPlus, ImMinus } from 'react-icons/im';
import { FaArrowRight } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import api from '../redux/api';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';

const SPORTS_TABS = [
  'Cricket',
  'Soccer',
  'Tennis',
  'Kabaddi',
  'Election',
  'Horse',
  'GreyHound',
];

const emptySportLocks = () => ({
  types: [],
  marketTypes: [],
  tournaments: [],
  matches: [],
  markets: [],
});

const GameBetLock = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const [selected, setSelected] = useState({});
  const [openIds, setOpenIds] = useState([]);
  const [activeTab, setActiveTab] = useState('Cricket');
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [competitionData, setCompetitionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedLocks, setSavedLocks] = useState([]);

  useEffect(() => {
    const dateArray = [];
    for (let i = -5; i <= 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      const formattedDate = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      dateArray.push({ value: dateString, label: formattedDate });
      if (i === 0) setSelectedDate(dateString);
    }
    setDates(dateArray);
  }, []);

  const fetchUserLocks = useCallback(async () => {
    if (!userInfo?._id) return;
    try {
      const { data } = await api.get(`/admin/betlock/${userInfo._id}`);
      if (data.success) {
        const advancedLocks = data.advancedBetLocks || {};
        const newSelected = {};
        const newSavedLocks = [];

        Object.keys(advancedLocks).forEach((sportStr) => {
          const sportLocks = advancedLocks[sportStr];
          if (sportLocks.types) {
            sportLocks.types.forEach((type) => {
              newSelected[`type-${type}`] = true;
              newSavedLocks.push({
                sport: sportStr,
                type: 'Type',
                description: type,
                id: `type-${type}`,
              });
            });
          }
          if (sportLocks.marketTypes) {
            sportLocks.marketTypes.forEach((mt) => {
              newSelected[`marketType-${mt}`] = true;
              newSavedLocks.push({
                sport: sportStr,
                type: 'Market Type',
                description: mt,
                id: `marketType-${mt}`,
              });
            });
          }
          if (sportLocks.tournaments) {
            sportLocks.tournaments.forEach((t) => {
              newSelected[`comp-${t}`] = true;
              newSavedLocks.push({
                sport: sportStr,
                type: 'Tournament',
                description: t,
                id: `comp-${t}`,
              });
            });
          }
          if (sportLocks.matches) {
            sportLocks.matches.forEach((m) => {
              newSelected[`match-${m}`] = true;
              newSavedLocks.push({
                sport: sportStr,
                type: 'Match',
                description: m,
                id: `match-${m}`,
              });
            });
          }
          if (sportLocks.markets) {
            sportLocks.markets.forEach((mk) => {
              newSelected[`market-${mk}`] = true;
              newSavedLocks.push({
                sport: sportStr,
                type: 'Market',
                description: mk,
                id: `market-${mk}`,
              });
            });
          }
        });
        setSelected(newSelected);
        setSavedLocks(newSavedLocks);
      }
    } catch (error) {
      console.error('Error fetching locks:', error);
      toast.error('Failed to fetch user locks');
    }
  }, [userInfo?._id]);

  useEffect(() => {
    fetchUserLocks();
  }, [fetchUserLocks]);

  useEffect(() => {
    if (selectedDate && activeTab) {
      fetchTreeData();
    }
  }, [selectedDate, activeTab]);

  const buildAdvancedBetLocks = (locksList, selectedMap) => {
    const advancedBetLocks = {};
    SPORTS_TABS.forEach((sport) => {
      advancedBetLocks[sport.toLowerCase()] = emptySportLocks();
    });

    locksList.forEach((lock) => {
      if (!selectedMap[lock.id]) return;

      const sportLower = String(lock.sport || '').toLowerCase();
      if (!advancedBetLocks[sportLower]) {
        advancedBetLocks[sportLower] = emptySportLocks();
      }

      const { id } = lock;
      if (id.startsWith('type-')) {
        advancedBetLocks[sportLower].types.push(id.replace('type-', ''));
      } else if (id.startsWith('marketType-')) {
        advancedBetLocks[sportLower].marketTypes.push(
          id.replace('marketType-', '')
        );
      } else if (id.startsWith('comp-')) {
        advancedBetLocks[sportLower].tournaments.push(id.replace('comp-', ''));
      } else if (id.startsWith('match-')) {
        advancedBetLocks[sportLower].matches.push(id.replace('match-', ''));
      } else if (id.startsWith('market-')) {
        advancedBetLocks[sportLower].markets.push(id.replace('market-', ''));
      }
    });

    return advancedBetLocks;
  };

  const persistLocks = async (locksList, selectedMap, successMessage) => {
    if (!userInfo?._id) return false;
    setSaving(true);
    try {
      const advancedBetLocks = buildAdvancedBetLocks(locksList, selectedMap);
      const { data } = await api.post(`/admin/betlock/${userInfo._id}`, {
        advancedBetLocks,
      });

      if (data.success) {
        toast.success(successMessage || 'Locks saved successfully');
        await fetchUserLocks();
        return true;
      }
      toast.error('Failed to save locks');
      return false;
    } catch (error) {
      console.error('Error saving locks:', error);
      toast.error(
        'Error saving locks: ' +
          (error.response?.data?.message || error.message)
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const fetchTreeData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/admin/betlock/tree?sport=${activeTab}&date=${selectedDate}`
      );
      if (data.success) {
        setCompetitionData(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tree data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheckbox = (id, typeName, description, sport) => {
    setSelected((prev) => {
      const isChecked = !prev[id];
      const newState = { ...prev, [id]: isChecked };

      let locksToAdd = [];
      let locksToRemove = [id];

      if (isChecked) {
        locksToAdd.push({ sport, type: typeName, description, id });
      }

      if (id.startsWith('comp-')) {
        const compIdStr = id.replace('comp-', '');
        const comp = competitionData.find(
          (c) => String(c.id) === String(compIdStr)
        );
        if (comp?.children) {
          comp.children.forEach((event) => {
            const eventId = `match-${event.id}`;
            newState[eventId] = isChecked;
            if (isChecked) {
              locksToAdd.push({
                sport,
                type: 'Match',
                description: event.title,
                id: eventId,
              });
            } else {
              locksToRemove.push(eventId);
            }

            event.markets.forEach((market) => {
              const marketId = `market-${market.id}`;
              newState[marketId] = isChecked;
              if (isChecked) {
                locksToAdd.push({
                  sport,
                  type: 'Market',
                  description: market.name,
                  id: marketId,
                });
              } else {
                locksToRemove.push(marketId);
              }
            });
          });
        }
      }

      if (id.startsWith('match-')) {
        const eventIdStr = id.replace('match-', '');
        const event = competitionData
          .flatMap((c) => c.children || [])
          .find((e) => String(e.id) === String(eventIdStr));
        event?.markets?.forEach((market) => {
          const marketId = `market-${market.id}`;
          newState[marketId] = isChecked;
          if (isChecked) {
            locksToAdd.push({
              sport,
              type: 'Market',
              description: market.name,
              id: marketId,
            });
          } else {
            locksToRemove.push(marketId);
          }
        });
      }

      setSavedLocks((s) => {
        let updated = s.filter((l) => !locksToRemove.includes(l.id));
        locksToAdd.forEach((lock) => {
          if (!updated.some((l) => l.id === lock.id)) updated.push(lock);
        });
        return updated;
      });

      return newState;
    });
  };

  const removeLock = async (id) => {
    const idsToClear = new Set([id]);

    if (id.startsWith('comp-')) {
      const comp = competitionData.find((c) => `comp-${c.id}` === id);
      comp?.children?.forEach((ev) => {
        idsToClear.add(`match-${ev.id}`);
        ev.markets?.forEach((m) => idsToClear.add(`market-${m.id}`));
      });
    } else if (id.startsWith('match-')) {
      const eventId = id.replace('match-', '');
      const event = competitionData
        .flatMap((c) => c.children || [])
        .find((e) => String(e.id) === String(eventId));
      event?.markets?.forEach((m) => idsToClear.add(`market-${m.id}`));
    }

    const nextSelected = { ...selected };
    idsToClear.forEach((lockId) => {
      nextSelected[lockId] = false;
    });

    const nextSaved = savedLocks.filter((l) => !idsToClear.has(l.id));
    setSelected(nextSelected);
    setSavedLocks(nextSaved);
    await persistLocks(nextSaved, nextSelected, 'Lock removed');
  };

  const handleSaveLocks = async () => {
    await persistLocks(savedLocks, selected);
  };

  const toggleOpen = (id) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const CheckboxItem = ({ label, id, typeName, sportName }) => (
    <label className='flex cursor-pointer items-center gap-1.5'>
      <span className='text-[14px]'>{label}</span>
      <input
        type='checkbox'
        checked={Boolean(selected[id])}
        onChange={() => toggleCheckbox(id, typeName, label, sportName)}
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

  const getMarketTypes = (sport) => {
    if (sport === 'Cricket')
      return [
        'Match Odds',
        'Bookmaker',
        'Special Maker',
        'Tournament Winner',
        'Tied Match',
        'Completed Match',
        'To Win the Toss',
        '1st Inning Runs',
        'Over',
        'Lambi',
        'Batsman',
        'Single Over',
        'Odd Even',
        'Lottery',
      ];
    if (sport === 'Soccer')
      return [
        'Match Odds',
        'Bookmaker',
        'Special Maker',
        'Over Under 05',
        'Over Under 15',
        'Over Under 25',
        'Lottery',
      ];
    if (sport === 'Tennis')
      return [
        'Match Odds',
        'Set Winner',
        'Bookmaker',
        'Special Maker',
        'Lottery',
      ];
    return ['Match Odds', 'Bookmaker'];
  };

  return (
    <>
      <Navbar />
      <div className="scrollbar-hide pt-[15px]' bg-[#f0f0f5] md:px-[15px] md:py-[13px]">
        <div className='grid grid-cols-3 rounded-lg bg-white px-[15px] py-[7px]'>
          <div className='col-span-2'>
            <div className='mb-2 flex justify-between text-[15px] font-bold'>
              <span>Lock Application - {userInfo?.userName}</span>
              <button
                onClick={handleSaveLocks}
                disabled={saving}
                className='rounded bg-blue-600 px-4 py-1 text-white hover:bg-blue-700 disabled:opacity-60'
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <SectionBox title='Event Type:'>
              <div className='flex flex-wrap gap-3 px-2 text-[14px]'>
                {SPORTS_TABS.map((item) => (
                  <CheckboxItem
                    key={item}
                    label={item}
                    id={`type-${item}`}
                    typeName='Event Type'
                    sportName={item}
                  />
                ))}
              </div>
            </SectionBox>

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
                  <CheckboxItem
                    key={item}
                    label={item}
                    id={`type-${item}`}
                    typeName='Type'
                    sportName={activeTab}
                  />
                ))}
              </div>
            </SectionBox>

            <SectionBox title='Market Type:'>
              <div className='mb-2'>
                <div className='-mt-2.5 mb-2 px-1 text-[14px] font-bold'>
                  {activeTab}
                </div>
                <div className='flex flex-wrap gap-x-3 gap-y-2 px-2 text-[14px]'>
                  {getMarketTypes(activeTab).map((item) => (
                    <CheckboxItem
                      key={item}
                      label={item}
                      id={`marketType-${item}`}
                      typeName='Market Type'
                      sportName={activeTab}
                    />
                  ))}
                </div>
              </div>
            </SectionBox>

            <div className='mt-2 flex items-center justify-between'>
              <h2 className='text-[14px] font-semibold'>
                Competition / Event / Markets
              </h2>

              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className='min-w-[220px] rounded border border-gray-300 bg-white px-2 py-2 text-[14px] text-gray-600'
              >
                {dates.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className='scrollbar-hide mb-3 flex items-center overflow-x-auto border-b border-gray-300'>
              {SPORTS_TABS.map((tab, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-[14px] whitespace-nowrap ${
                    activeTab === tab
                      ? '-mb-px border border-gray-300 border-b-white bg-white font-bold'
                      : ''
                  } `}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className='min-h-[200px] space-y-3'>
              {loading ? (
                <div className='flex justify-center p-4'>Loading...</div>
              ) : competitionData.length === 0 ? (
                <div className='p-4 text-center text-gray-500'>
                  No events found for {activeTab} on this date.
                </div>
              ) : (
                competitionData.map((competition) => {
                  const compId = `comp-${competition.id}`;
                  const isOpen = openIds.includes(competition.id);

                  return (
                    <div key={competition.id}>
                      <div className='flex items-center justify-between bg-[#169bb3] px-2 py-1 font-semibold text-white'>
                        <div className='flex items-center gap-2'>
                          <span className='text-[14px]'>
                            {competition.title}
                          </span>

                          <input
                            type='checkbox'
                            checked={Boolean(selected[compId])}
                            onChange={() =>
                              toggleCheckbox(
                                compId,
                                'Tournament',
                                competition.title,
                                activeTab
                              )
                            }
                            className="relative h-4 w-4 cursor-pointer appearance-none border border-gray-400 bg-white after:absolute after:top-1/2 after:left-1/2 after:hidden after:-translate-x-1/2 after:-translate-y-1/2 after:text-[15px] after:font-bold after:text-white after:content-['✓'] checked:border-black checked:bg-black checked:after:block"
                          />
                        </div>

                        <button onClick={() => toggleOpen(competition.id)}>
                          {isOpen ? (
                            <ImMinus size={12} />
                          ) : (
                            <ImPlus size={12} />
                          )}
                        </button>
                      </div>

                      {isOpen &&
                        competition.children.map((event) => {
                          const eventId = `match-${event.id}`;
                          return (
                            <div key={event.id} className='mt-2 ml-12'>
                              <div className='flex items-center gap-2 bg-[#066f88] px-4 py-1 font-semibold text-white'>
                                <span className='text-[14px]'>
                                  {event.title}
                                </span>

                                <input
                                  type='checkbox'
                                  checked={Boolean(selected[eventId])}
                                  onChange={() =>
                                    toggleCheckbox(
                                      eventId,
                                      'Match',
                                      event.title,
                                      activeTab
                                    )
                                  }
                                  className="relative h-4 w-4 cursor-pointer appearance-none border border-gray-400 bg-gray-200 after:absolute after:top-1/2 after:left-1/2 after:hidden after:-translate-x-1/2 after:-translate-y-1/2 after:text-[15px] after:font-bold after:text-white after:content-['✓'] checked:border-black checked:bg-black checked:after:block"
                                />
                              </div>

                              <div>
                                {event.markets.map((market) => {
                                  const marketId = `market-${market.id}`;
                                  return (
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
                                        checked={Boolean(selected[marketId])}
                                        onChange={() =>
                                          toggleCheckbox(
                                            marketId,
                                            'Market',
                                            market.name,
                                            activeTab
                                          )
                                        }
                                        className="relative h-4 w-4 cursor-pointer appearance-none border border-gray-400 bg-gray-200 after:absolute after:top-1/2 after:left-1/2 after:hidden after:-translate-x-1/2 after:-translate-y-1/2 after:text-[15px] after:font-bold after:text-white after:content-['✓'] checked:border-black checked:bg-black checked:after:block"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className='col-span-1 pr-[15px] pl-[30px]'>
            <p className='mb-2 text-[11px] text-gray-600'>
              Uncheck a lock or click Del, then Save Changes. Del saves
              immediately.
            </p>
            <table className='w-full border-collapse'>
              <thead>
                <tr className='bg-[#066f88] text-[12px] text-white'>
                  <th className='px-2 py-1.5 text-left font-normal'>Sport</th>
                  <th className='px-2 py-1.5 text-left font-normal'>Type</th>
                  <th className='px-2 py-1.5 text-left font-normal'>
                    Description
                  </th>
                  <th className='px-2 py-1.5 text-left font-normal'>Action</th>
                </tr>
              </thead>
              <tbody>
                {savedLocks.length === 0 ? (
                  <tr>
                    <td
                      colSpan='4'
                      className='py-4 text-center text-[12px] text-gray-500'
                    >
                      No locks active
                    </td>
                  </tr>
                ) : (
                  savedLocks.map((lock, idx) => (
                    <tr
                      key={idx}
                      className='border-b border-gray-200 text-[12px]'
                    >
                      <td className='px-2 py-1.5'>{lock.sport}</td>
                      <td className='px-2 py-1.5'>{lock.type}</td>
                      <td
                        className='max-w-[150px] truncate px-2 py-1.5'
                        title={lock.description}
                      >
                        {lock.description}
                      </td>
                      <td className='px-2 py-1.5'>
                        <button
                          type='button'
                          onClick={() => removeLock(lock.id)}
                          disabled={saving}
                          className='inline-block rounded-sm bg-red-600 px-1.5 py-0.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60'
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default GameBetLock;
