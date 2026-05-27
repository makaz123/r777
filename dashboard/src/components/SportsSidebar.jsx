import { useState, useEffect } from 'react';
import { FaRegPlusSquare, FaRegMinusSquare } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCricketData } from '../redux/reducer/cricketSlice';
import { fetchSoccerData } from '../redux/reducer/soccerSlice';
import { fetchTennisData } from '../redux/reducer/tennisSlice';
import { MdOutlineArrowDropDown } from 'react-icons/md';
import { AiOutlineCloseSquare } from 'react-icons/ai';
import { FEATURES } from '../config/featureFlags';

function SportsSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { matches: cricketMatches } = useSelector((state) => state.cricket);
  const { matches: tennisMatches } = useSelector((state) => state.tennis);
  const { matches: soccerMatches } = useSelector((state) => state.soccer);
  const [openSettlement, setOpenSettlement] = useState(false);
  const [openReport, setOpenReport] = useState(false);

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
          className='flex w-full cursor-pointer items-center justify-between gap-1.5 border-b border-[#18b0c8] px-4 py-1.5 text-white last:border-b-0 hover:bg-[#18b0c8]'
        >
          {sportName} <MdOutlineArrowDropDown />
        </button>
        {isExpanded(sportKey) && hasData && (
          <div className='bg-blue-100 pr-2 pl-4'>
            {titles.map((title) => {
              const titleKey = createTitleKey(sportKey, title);
              const matches = groupedData[title];
              return (
                <>
                  <button
                    onClick={() => toggleItem(titleKey)}
                    className='flex w-full cursor-pointer items-center items-start gap-2 py-[7px] text-[12px] text-black md:text-[14px]'
                  >
                    <span>
                      <ToggleIcon expanded={isExpanded(titleKey)} />
                    </span>
                    <span className='text-left'>{title}</span>{' '}
                  </button>
                  {isExpanded(titleKey) && matches && matches.length > 0 && (
                    <div className='pr-2 pl-2'>
                      {matches.map((match) => (
                        <a
                          href='#'
                          className='flex items-center gap-1 py-1 text-[12px] text-black transition-colors md:text-[14px]'
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(
                              `${routePrefix}/${match.title}/${match.game}/${match.id}`,
                              { state: { time: match.time } }
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
        className={`fixed top-[52px] left-0 z-50 h-[calc(100vh-52px)] w-[200px] transform border-r border-gray-300 bg-gradient-to-b from-[#007082] to-[#18b0c8] text-white shadow-xl transition-transform duration-300 ease-in-out md:w-[250px] md:bg-[#007082] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } overflow-y-auto`}
      >
        <ul className='block md:hidden'>
          <li
            className='border-b border-[#18b0c8] px-4 py-2'
            onClick={() => navigate('/')}
          >
            Dashboard
          </li>

          <li
            className='border-b border-[#18b0c8] px-4 py-2'
            onClick={() => navigate('/user-download-list')}
          >
            Client
          </li>

          <li
            className='border-b border-[#18b0c8] px-4 py-2'
            onClick={() => navigate('/my-market')}
          >
            Sport Analysis
          </li>

          <li
            className='border-b border-[#18b0c8] px-4 py-2'
            onClick={() => navigate('/casino-analysis')}
          >
            Casino Analysis
          </li>

          {/* Settlement Dropdown */}
          <li>
            <button
              type='button'
              onClick={() => setOpenSettlement(!openSettlement)}
              className='flex w-full items-center justify-between border-b border-[#18b0c8] px-4 py-2'
            >
              <span>Settlement</span>

              <MdOutlineArrowDropDown
                className={`text-xl transition-transform duration-300 ${
                  openSettlement ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openSettlement && (
              <ul>
                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/user-settlement')}
                >
                  User
                </li>

                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/master-settlement')}
                >
                  Master
                </li>
              </ul>
            )}
          </li>

          <li>
            <button
              type='button'
              onClick={() => setOpenReport(!openReport)}
              className='flex w-full items-center justify-between border-b border-[#18b0c8] px-4 py-2'
            >
              <span>Reports</span>

              <MdOutlineArrowDropDown
                className={`text-xl transition-transform duration-300 ${
                  openReport ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openReport && (
              <ul>
                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/user-details')}
                >
                  User Detail
                </li>
                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/AccountStatement')}
                >
                  Account Statement
                </li>
                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/SettlementReport')}
                >
                  Settlement/Balance Report
                </li>
                {FEATURES.transactionReport && (
                  <li
                    className='border-b border-[#18b0c8] px-4 py-2'
                    onClick={() => navigate('/TransactionReport')}
                  >
                    Transaction Report
                  </li>
                )}
                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/CurrentBets')}
                >
                  Current Bets
                </li>
                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/ProfitLossReport')}
                >
                  Profit & Loss Report
                </li>
                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/EventLossReport')}
                >
                  Event Profit & Loss Report
                </li>
                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/BetHistoryReport')}
                >
                  Bet History
                </li>
                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/LiveBetsReport')}
                >
                  Live Bets
                </li>
                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/SportRevenue')}
                >
                  Sports Revenue
                </li>
                <li
                  className='border-b border-[#18b0c8] px-4 py-2'
                  onClick={() => navigate('/IpLookupReport')}
                >
                  IP lookup
                </li>
              </ul>
            )}
          </li>

          <li
            className='border-b border-[#18b0c8] px-4 py-2'
            onClick={() => navigate('/gamebetlock')}
          >
            Game Control
          </li>

          <li
            className='border-b border-[#18b0c8] px-4 py-2'
            onClick={() => navigate('/casinolock')}
          >
            Casino Control
          </li>
        </ul>
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
