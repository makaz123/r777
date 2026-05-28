import { useState, useEffect } from 'react';
import { FaRegPlusSquare, FaRegMinusSquare } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCricketData } from '../redux/reducer/cricketSlice';
import { fetchSoccerData } from '../redux/reducer/soccerSlice';
import { fetchTennisData } from '../redux/reducer/tennisSlice';
import { MdOutlineArrowDropDown } from 'react-icons/md';
import cricketIcon from '../assets/icons/Cricket.svg';
import soccerIcon from '../assets/icons/Soccer.svg';
import tennisIcon from '../assets/icons/Tennis.svg';
import casinoControlIcon from '../assets/icons/CasinoControl.svg';
import gameControlIcon from '../assets/icons/GameControl.svg';
import reportIcon from '../assets/icons/Reports.svg';
import casinoAnalysisIcon from '../assets/icons/CasinoAnalysis.svg';
import clientIcon from '../assets/icons/Clients.svg';
import marketAnalysisIcon from '../assets/icons/MarketAnalysis.svg';
import settlementIcon from '../assets/icons/Settlement.svg';
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
    routePrefix,
    sportIcon = null
  ) => {
    // console.log('renderSportSection:', { sportName, groupedData, sportKey });
    const titles = Object.keys(groupedData);
    const hasData = titles.length > 0;

    return (
      <>
        <button
          onClick={() => toggleItem(sportKey)}
          className='flex w-full cursor-pointer items-center justify-between gap-1.5 border-b border-[#18b0c8] py-2 pr-1 pl-2 text-white last:border-b-0 hover:bg-[#18b0c8]'
        >
          <span className='flex items-center gap-1.5 text-[12px] font-medium md:text-[14px]'>
            {sportIcon}
            {sportName}
          </span>
          <MdOutlineArrowDropDown size={18} />
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
        className={`fixed top-[40px] left-0 z-50 h-[calc(100vh-40px)] w-[50%] transform border-r border-gray-300 bg-gradient-to-b from-[#007082] to-[#18b0c8] text-white shadow-xl transition-transform duration-300 ease-in-out md:top-[52px] md:h-[calc(100vh-52px)] md:w-[240px] md:bg-[#007082] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } scrollbar-hide overflow-y-auto`}
      >
        <ul className='block md:hidden'>
          <li
            className='border-b border-[#18b0c8] py-2 pr-1 pl-2'
            onClick={() => navigate('/')}
          >
            <span className='flex items-center gap-1.5 text-[12px] font-medium md:text-[14px]'>
              <img src={clientIcon} alt='' className='w-[14px]' /> Dashboard
            </span>
          </li>

          <li
            className='border-b border-[#18b0c8] py-2 pr-1 pl-2'
            onClick={() => navigate('/user-download-list')}
          >
            <span className='flex items-center gap-1.5 text-[12px] font-medium md:text-[14px]'>
              <img src={clientIcon} alt='' className='w-[14px]' /> Client
            </span>
          </li>

          <li
            className='border-b border-[#18b0c8] py-2 pr-1 pl-2'
            onClick={() => navigate('/my-market')}
          >
            <span className='flex items-center gap-1.5 text-[12px] font-medium md:text-[14px]'>
              <img src={marketAnalysisIcon} alt='' className='w-[14px]' />
              Sport Analysis
            </span>
          </li>

          <li
            className='border-b border-[#18b0c8] py-2 pr-1 pl-2'
            onClick={() => navigate('/casino-analysis')}
          >
            <span className='flex items-center gap-1.5 text-[12px] font-medium md:text-[14px]'>
              <img src={casinoAnalysisIcon} alt='' className='w-[14px]' />
              Casino Analysis
            </span>
          </li>

          {/* Settlement Dropdown */}
          <li>
            <button
              type='button'
              onClick={() => setOpenSettlement(!openSettlement)}
              className='flex w-full justify-between border-b border-[#18b0c8] py-2 pr-1 pl-2'
            >
              <span className='flex items-center gap-1.5 text-[12px] font-medium md:text-[14px]'>
                <img src={settlementIcon} alt='' className='w-[14px]' />
                Settlement
              </span>

              <MdOutlineArrowDropDown
                className={`text-xl transition-transform duration-300 ${
                  openSettlement ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openSettlement && (
              <ul>
                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                  onClick={() => navigate('/user-settlement')}
                >
                  User
                </li>

                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
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
              className='flex w-full justify-between border-b border-[#18b0c8] py-2 pr-1 pl-2'
            >
              <span className='flex items-center gap-1.5 text-[12px] font-medium md:text-[14px]'>
                <img src={reportIcon} alt='' className='w-[14px]' />
                Reports
              </span>

              <MdOutlineArrowDropDown
                className={`text-xl transition-transform duration-300 ${
                  openReport ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openReport && (
              <ul>
                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                  onClick={() => navigate('/user-details')}
                >
                  User Detail
                </li>
                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                  onClick={() => navigate('/AccountStatement')}
                >
                  Account Statement
                </li>
                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                  onClick={() => navigate('/SettlementReport')}
                >
                  Settlement/Balance Report
                </li>
                {FEATURES.transactionReport && (
                  <li
                    className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                    onClick={() => navigate('/TransactionReport')}
                  >
                    Transaction Report
                  </li>
                )}
                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                  onClick={() => navigate('/CurrentBets')}
                >
                  Current Bets
                </li>
                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                  onClick={() => navigate('/ProfitLossReport')}
                >
                  Profit & Loss Report
                </li>
                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                  onClick={() => navigate('/EventLossReport')}
                >
                  Event Profit & Loss Report
                </li>
                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                  onClick={() => navigate('/BetHistoryReport')}
                >
                  Bet History
                </li>
                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                  onClick={() => navigate('/LiveBetsReport')}
                >
                  Live Bets
                </li>
                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                  onClick={() => navigate('/SportRevenue')}
                >
                  Sports Revenue
                </li>
                <li
                  className='border-b border-[#18b0c8] py-2 pr-1 pl-4 text-[12px] font-medium md:text-[14px]'
                  onClick={() => navigate('/IpLookupReport')}
                >
                  IP lookup
                </li>
              </ul>
            )}
          </li>

          <li
            className='border-b border-[#18b0c8] py-2 pr-1 pl-2'
            onClick={() => navigate('/gamebetlock')}
          >
            <span className='flex items-center gap-1.5 text-[12px] font-medium md:text-[14px]'>
              <img src={gameControlIcon} alt='' className='w-[14px]' />
              Game Control
            </span>
          </li>

          <li
            className='border-b border-[#18b0c8] py-2 pr-1 pl-2'
            onClick={() => navigate('/casinolock')}
          >
            <span className='flex items-center gap-1.5 text-[12px] font-medium md:text-[14px]'>
              <img src={casinoControlIcon} alt='' className='w-[14px]' />
              Casino Control
            </span>
          </li>
        </ul>
        {/* Cricket */}
        {renderSportSection(
          'Cricket',
          groupedCricket,
          'cricket',
          '/cricket-bet',
          <img src={cricketIcon} alt='' className='w-[14px]' />
        )}
        {/* Football */}
        {renderSportSection(
          'Soccer',
          groupedSoccer,
          'football',
          '/soccerbet',
          <img src={soccerIcon} alt='' className='w-[14px]' />
        )}
        {/* Tennis */}
        {renderSportSection(
          'Tennis',
          groupedTennis,
          'tennis',
          '/tennis-bet',
          <img src={tennisIcon} alt='' className='w-[14px]' />
        )}
      </aside>
    </>
  );
}

export default SportsSidebar;
