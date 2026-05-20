import { useState, useEffect } from 'react';
import { FaRegPlusSquare, FaRegMinusSquare } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCricketData } from '../redux/reducer/cricketSlice';
import { fetchSoccerData } from '../redux/reducer/soccerSlice';
import { fetchTennisData } from '../redux/reducer/tennisSlice';
import { MdOutlineArrowDropDown } from 'react-icons/md';
import { AiOutlineCloseSquare } from 'react-icons/ai';

function SportsSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { matches: cricketMatches } = useSelector((state) => state.cricket);
  const { matches: tennisMatches } = useSelector((state) => state.tennis);
  const { matches: soccerMatches } = useSelector((state) => state.soccer);

  useEffect(() => {
    dispatch(fetchCricketData());
    dispatch(fetchTennisData());
    dispatch(fetchSoccerData());
  }, [dispatch]);

  const [expandedItems, setExpandedItems] = useState(new Set(['allSports']));

  const toggleItem = (itemId) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const isExpanded = (itemId) => expandedItems.has(itemId);

  const groupMatchesByTitle = (matches) => {
    if (!matches || matches.length === 0) return {};
    return matches.reduce((acc, match) => {
      const title = match.title || 'Other';
      if (!acc[title]) {
        acc[title] = [];
      }
      acc[title].push(match);
      return acc;
    }, {});
  };

  const groupedCricket = groupMatchesByTitle(cricketMatches);
  const groupedTennis = groupMatchesByTitle(tennisMatches);
  const groupedSoccer = groupMatchesByTitle(soccerMatches);

  const createTitleKey = (sportKey, title) => {
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    return `${sportKey}-${safeTitle}`;
  };

  const ToggleIcon = ({ expanded }) =>
    expanded ? (
      <FaRegMinusSquare className='inline flex-shrink-0 text-xs' />
    ) : (
      <FaRegPlusSquare className='inline flex-shrink-0 text-xs' />
    );

  const renderSportSection = (
    sportName,
    groupedData,
    sportKey,
    routePrefix
  ) => {
    // console.log('renderSportSection:', { sportName, groupedData, sportKey });
    const titles = Object.keys(groupedData);
    const hasData = titles.length > 0;

    return (
      <>
        <button
          onClick={() => toggleItem(sportKey)}
          className='flex w-full cursor-pointer items-center justify-between gap-1.5 px-4 py-1.5 text-white hover:bg-[#18b0c8]'
        >
          {sportName} <MdOutlineArrowDropDown />
        </button>
        {isExpanded(sportKey) && hasData && (
          <div className='bg-blue-100 pr-2 pl-6'>
            {titles.map((title) => {
              const titleKey = createTitleKey(sportKey, title);
              const matches = groupedData[title];
              return (
                <>
                  <button
                    onClick={() => toggleItem(titleKey)}
                    className='flex w-full cursor-pointer items-center gap-1.5 py-[5px] text-black'
                  >
                    <ToggleIcon expanded={isExpanded(titleKey)} />
                    <span className='text-left'>{title}</span>{' '}
                  </button>
                  {isExpanded(titleKey) && matches && matches.length > 0 && (
                    <div className='pr-2 pl-2'>
                      {matches.map((match) => (
                        <a
                          href='#'
                          className='flex items-center gap-1 py-1 text-black transition-colors'
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(
                              `${routePrefix}/${match.title}/${match.game}/${match.id}`
                            );
                            onClose();
                          }}
                        >
                          <AiOutlineCloseSquare className='min-h-3 min-w-3' />{' '}
                          <span className='truncate'>{match.game}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              );
            })}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <aside
        className={`fixed top-[52px] left-0 z-50 h-[calc(100vh-52px)] w-[250px] transform border-r border-gray-300 bg-[#007082] text-white shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } overflow-y-auto`}
      >
        {/* Cricket */}
        {renderSportSection(
          'Cricket',
          groupedCricket,
          'cricket',
          '/cricket-bet',
          false
        )}
        {/* Football */}
        {renderSportSection(
          'Football',
          groupedSoccer,
          'football',
          '/soccerbet',
          false
        )}
        {/* Tennis */}
        {renderSportSection(
          'Tennis',
          groupedTennis,
          'tennis',
          '/tennis-bet',
          false
        )}
      </aside>
    </>
  );
}

export default SportsSidebar;
