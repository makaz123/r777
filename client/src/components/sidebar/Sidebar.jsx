import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCricketData } from '../../redux/reducer/cricketSlice';
import { fetchSoccerData } from '../../redux/reducer/soccerSlice';
import { fetchTennisData } from '../../redux/reducer/tennisSlice';
import { providerList } from '../../pages/GgrCasino/CasinoData';
import sportsIcon from '../../assets/sports-icons.png';
import inOutIcon from '../../assets/inout-icon-b.svg';
import aviatorIcon from '../../assets/aviator-icon.svg';
import { AiOutlineCloseSquare, AiOutlinePlusSquare } from 'react-icons/ai';
import { AiOutlineMinusSquare } from 'react-icons/ai';
import accountIcon from '../../assets/icons/Account-Statement.svg';
import plIcon from '../../assets/icons/profit-loss-report.svg';
import historyIcon from '../../assets/icons/bet-history.svg';
import unsettledIcon from '../../assets/icons/unsettle-bet.svg';
import valueIcon from '../../assets/icons/set-button-value.svg';
import rulesIcon from '../../assets/icons/rules.svg';
import passwordIcon from '../../assets/icons/change-password.svg';
import resultIcon from '../../assets/icons/result.svg';
import logoutIcon from '../../assets/icons/log-out.svg';
import { bet_reset } from '../../redux/reducer/betReducer';
import { user_reset } from '../../redux/reducer/authReducer';
import { wsService } from '../../services/WebsocketService';
import api from '../../redux/api';
import { MdOutlineArrowDropDown } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../context/LanguageContext';

const providerSpritePositions = {
  indianpoker: '0px -863px',
  indianpoker2: '0px -1742px',
  rvgames: '0px -1706px',
  spribe: '0px -352px',
  chickenroad: '0px -384px',
  ezugi: '0px -1706px',
  evolution: '0px -1706px',
  livecasino: '0px -863px',
  vivo: '0px -1706px',
  betgames: '0px -1706px',
  casino3: '0px -863px',
};

function groupMatchesByLeague(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return [];

  const map = new Map();
  for (const m of matches) {
    const league = (m.title && String(m.title).trim()) || 'Other';
    if (!map.has(league)) map.set(league, []);
    map.get(league).push(m);
  }

  return [...map.entries()]
    .map(([league, ms]) => ({ league, matches: ms }))
    .sort((a, b) => a.league.localeCompare(b.league));
}

function Sidebar({ onClose, view = 'popular', isOpen = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());

  const { matches: cricketMatches } = useSelector((state) => state.cricket);

  const { matches: tennisMatches } = useSelector((state) => state.tennis);

  const { matches: soccerMatches } = useSelector((state) => state.soccer);

  useEffect(() => {
    dispatch(fetchCricketData());
    dispatch(fetchTennisData());
    dispatch(fetchSoccerData());
  }, [dispatch]);

  const logout = async () => {
    try {
      await api.get('/customer/logout', {
        withCredentials: true,
      });
    } catch (error) {
      console.log(error?.response?.data || error.message);
    } finally {
      localStorage.removeItem('auth');
      dispatch(user_reset());
      dispatch(bet_reset());
      wsService.disconnect();
      navigate('/');
    }
  };

  const iplBetPath = useMemo(() => {
    const matches = Array.isArray(cricketMatches) ? cricketMatches : [];
    const looksLikeIpl = (s) =>
      typeof s === 'string' &&
      (s.toUpperCase().includes('INDIAN PREMIER LEAGUE') || /\bIPL\b/i.test(s));
    const row = matches.find(
      (m) => looksLikeIpl(m.title) || looksLikeIpl(m.game)
    );
    const gameName = String(
      row?.game || row?.title || 'Indian Premier League'
    ).trim();
    if (!row?.id) return '/cricket';
    return `/cricket-bet/${encodeURIComponent(gameName)}/${row.id}`;
  }, [cricketMatches]);

  const sportsNav = useMemo(
    () => [
      {
        key: 'inplay',
        spritePos: '0px -1527px',
        label: 'In-Play',
        path: '/inplay',
      },
      {
        key: 'ipl',
        spritePos: '0px -1775px',
        label: 'IPL 2026',
        path: iplBetPath,
      },
      {
        key: 'cricket',
        label: 'Cricket',
        spritePos: '0px -326px',
        matches: cricketMatches,
        betUrl: (m) => `/cricket-bet/${m.game}/${m.id}`,
        icon: <MdOutlineArrowDropDown size={22} />,
      },
      {
        key: 'tennis',
        label: 'Tennis',
        spritePos: '0px -1096px',
        matches: tennisMatches,
        betUrl: (m) => `/tennis-bet/${m.game}/${m.id}`,
        icon: <MdOutlineArrowDropDown size={22} />,
      },
      {
        key: 'soccer',
        label: 'Soccer',
        spritePos: '0px -1026px',
        matches: soccerMatches,
        betUrl: (m) => `/football-bet/${m.game}/${m.id}`,
        icon: <MdOutlineArrowDropDown size={22} />,
      },
    ],
    [cricketMatches, tennisMatches, soccerMatches, iplBetPath]
  );

  const toggleKey = useCallback((key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const sportKey = (sk) => `nav:sport:${sk}`;
  const innerLeagueKey = (sk, li) => `nav:inner:${sk}:${li}`;

  const handleMatchClick = (sport, match) => {
    navigate(sport.betUrl(match));
    if (onClose) onClose();
  };

  // const handleProviderClick = (key) => {
  //   navigate(`/${key}`);
  //   if (onClose) onClose();
  // };

  const handleSportHeaderClick = (sport) => {
    if (sport.path) {
      navigate(sport.path);
      if (onClose) onClose();
      return;
    }
    toggleKey(sportKey(sport.key));
  };

  const handleProviderClick = (provider) => {
    const path = provider.path ?? `/${provider.key}`;
    navigate(path);
    if (onClose) onClose();
  };

  const handleMainMenuClick = (path) => {
    if (path) navigate(path);
    if (onClose) onClose();
  };

  const showPopular = view !== 'mainMenu';

  const sectionHeader = (title) => (
    <div className='flex items-center justify-between bg-[#27a6c3] px-[7px] py-[2px] text-[14px] font-bold text-white'>
      <span>{title}</span>
      <button
        type='button'
        onClick={() => onClose?.()}
        className='cursor-pointer px-1 text-xl leading-none hover:opacity-80 lg:hidden'
        aria-label='Close menu'
      >
        ×
      </button>
    </div>
  );

  return (
    <>
      <motion.div
        initial={false}
        animate={{
          x: window.innerWidth >= 1024 ? 0 : isOpen ? 0 : -300,

          opacity: window.innerWidth >= 1024 ? 1 : isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.4 }}
        className={`scrollbar-hide fixed top-0 left-0 z-10 h-full w-full overflow-y-auto border-r border-gray-200 bg-[#ececec] sm:w-[270px] md:top-[129px] md:z-1 md:h-[calc(100vh-129px)] lg:sticky lg:w-[15%] xl:top-[117px] xl:h-[calc(100vh-117px)] ${!isOpen ? 'pointer-events-none lg:pointer-events-auto' : ''
          } `}
      >
        {showPopular ? (
          <>
            {(() => {
              const mapKey = (key) => {
                if (key === 'indianpoker') return 'indianPoker';
                if (key === 'indianpoker2') return 'indianPoker2';
                if (key === 'inout' || key === 'chickenroad') return 'inOut';
                if (key === 'livecasino') return 'liveCasino';
                if (key === 'betgames') return 'betGames';
                if (key === 'casino3') return 'casino3';
                return key;
              };
              window.__sidebarMapKey = mapKey; // store globally or pass down
            })()}
            {sectionHeader(t('popular', 'Popular'))}
            <ul className='text-[13px]'>
              {sportsNav.map((sport) => {
                const sk = sportKey(sport.key);
                const isDirectLink = Boolean(sport.path);
                const leagueOpen = !isDirectLink && expandedKeys.has(sk);
                const leagues = groupMatchesByLeague(sport.matches);

                return (
                  <li key={sport.key} className='border-b border-gray-300'>
                    <div
                      role='button'
                      tabIndex={0}
                      className={`flex cursor-pointer items-center gap-2 px-2.5 py-2 text-[#045662] transition-colors hover:bg-[#d4e8ec] ${leagueOpen ? 'bg-[#d8e8eb]' : ''
                        }`}
                      onClick={() => handleSportHeaderClick(sport)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSportHeaderClick(sport);
                        }
                      }}
                    >
                      <span
                        className='inline-block h-6 w-[28px] flex-shrink-0 bg-no-repeat'
                        style={{
                          backgroundImage: `url(${sportsIcon})`,
                          backgroundPosition: sport.spritePos,
                          backgroundSize: '28px auto',
                          backgroundRepeat: 'no-repeat',
                        }}
                      />
                      <span className='flex min-w-0 flex-1 justify-between font-bold'>
                        {t(window.__sidebarMapKey ? window.__sidebarMapKey(sport.key) : sport.key, sport.label)}
                        {sport.icon}
                      </span>
                    </div>

                    {leagueOpen && (
                      <ul className='bg-gray-300'>
                        {leagues.map(({ league, matches: lm }, index) => {
                          const ik = innerLeagueKey(sport.key, index);
                          const innerOpen = expandedKeys.has(ik);

                          return (
                            <li key={ik} className='mr-2 ml-5 py-2'>
                              <div
                                role='button'
                                tabIndex={0}
                                className={`flex cursor-pointer items-center gap-2 border-l-2 border-gray-500 pl-3 text-[#045662]`}
                                onClick={() => toggleKey(ik)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleKey(ik);
                                  }
                                }}
                              >
                                <span className='min-w-0 flex-1 font-semibold'>
                                  {league}
                                </span>
                                {innerOpen ? (
                                  <AiOutlineMinusSquare />
                                ) : (
                                  <AiOutlinePlusSquare />
                                )}
                              </div>

                              {innerOpen && (
                                <ul>
                                  {lm.map((m) => (
                                    <li
                                      key={`${sport.key}-${m.id}-${m.game}`}
                                      className='ml-3 py-2'
                                      role='link'
                                      tabIndex={0}
                                      onClick={() => handleMatchClick(sport, m)}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === 'Enter' ||
                                          e.key === ' '
                                        ) {
                                          e.preventDefault();
                                          handleMatchClick(sport, m);
                                        }
                                      }}
                                    >
                                      <div className='flex cursor-pointer items-center gap-2 border-l-2 border-gray-500 pl-3 text-[#045662]'>
                                        <span className='min-w-0 flex-1 font-semibold'>
                                          {m.game || 'Match'}
                                        </span>
                                        <AiOutlineCloseSquare />
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}

              {/* PROVIDERS */}
              {providerList.map((p) => (
                <li
                  key={p.key}
                  className='flex cursor-pointer items-center gap-2 border-b border-gray-300 px-2.5 py-2 text-[#045662] transition-colors hover:bg-[#19a6c5] hover:text-white'
                  onClick={() => handleProviderClick(p)}
                >
                  {/* SPRITE ICON */}
                  {p.key !== 'spribe' && p.key !== 'inout' && (
                    <span
                      className='inline-block h-6 w-6 flex-shrink-0 bg-no-repeat'
                      style={{
                        backgroundImage: `url(${sportsIcon})`,
                        backgroundPosition: providerSpritePositions[p.key],
                        backgroundSize: '28px auto',
                        width: '28px',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  )}
                  {p.key === 'spribe' && (
                    <span className='w-[28px]'>
                      <img src={aviatorIcon} alt='' className='w-[24px]' />
                    </span>
                  )}
                  {p.key === 'inout' && (
                    <span className='w-[28px]'>
                      <img src={inOutIcon} alt='' className='h-[20px]' />
                    </span>
                  )}
                  <span className='text-sm font-bold'>
                    {t(window.__sidebarMapKey ? window.__sidebarMapKey(p.key) : p.key, p.label)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            {sectionHeader(t('main_menu', 'Main Menu'))}
            <div>
              <div
                role='button'
                tabIndex={0}
                className='flex cursor-pointer items-center gap-[5px] border-b border-gray-300 px-2.5 py-2 text-[14px] text-[#045662] hover:bg-[#22b8cf] hover:text-white'
                onClick={() => handleMainMenuClick('/account-statement')}
              >
                <span>
                  <img src={accountIcon} alt='' className='w-[18px]' />
                </span>
                <span>{t('account_statement', 'Account Statement')}</span>
              </div>
              <div
                role='button'
                tabIndex={0}
                className='flex cursor-pointer items-center gap-[5px] border-b border-gray-300 px-2.5 py-2 text-[14px] text-[#045662] hover:bg-[#22b8cf] hover:text-white'
                onClick={() => handleMainMenuClick('/profit-loss')}
              >
                <span>
                  <img src={plIcon} alt='' className='w-[18px]' />
                </span>
                <span>{t('profit_loss_report', 'Profit Loss Report')}</span>
              </div>
              <div
                role='button'
                tabIndex={0}
                className='flex cursor-pointer items-center gap-[5px] border-b border-gray-300 px-2.5 py-2 text-[14px] text-[#045662] hover:bg-[#22b8cf] hover:text-white'
                onClick={() => handleMainMenuClick('/bethistroy')}
              >
                <span>
                  <img src={historyIcon} alt='' className='w-[18px]' />
                </span>
                <span>{t('bet_history', 'Bet History')}</span>
              </div>
              <div
                role='button'
                tabIndex={0}
                className='flex cursor-pointer items-center gap-[5px] border-b border-gray-300 px-2.5 py-2 text-[14px] text-[#045662] hover:bg-[#22b8cf] hover:text-white'
                onClick={() => handleMainMenuClick('/unsettled-bet')}
              >
                <span>
                  <img src={unsettledIcon} alt='' className='w-[18px]' />
                </span>
                <span>{t('unsettled_bet', 'Unsettled Bet')}</span>
              </div>
              <div
                role='button'
                tabIndex={0}
                className='flex cursor-pointer items-center gap-[5px] border-b border-gray-300 px-2.5 py-2 text-[14px] text-[#045662] hover:bg-[#22b8cf] hover:text-white'
                onClick={() => handleMainMenuClick('/set-stake')}
              >
                <span>
                  <img src={valueIcon} alt='' className='w-[18px]' />
                </span>
                <span>{t('set_stake', 'Set Stake')}</span>
              </div>
              <div
                role='button'
                tabIndex={0}
                className='flex cursor-pointer items-center gap-[5px] border-b border-gray-300 px-2.5 py-2 text-[14px] text-[#045662] hover:bg-[#22b8cf] hover:text-white'
                onClick={() => handleMainMenuClick('/change-password')}
              >
                <span>
                  <img src={passwordIcon} alt='' className='w-[18px]' />
                </span>
                <span>{t('change_password', 'Change Password')}</span>
              </div>
              <div
                role='button'
                tabIndex={0}
                className='flex cursor-pointer items-center gap-[5px] border-b border-gray-300 px-2.5 py-2 text-[14px] text-[#045662] hover:bg-[#22b8cf] hover:text-white'
                onClick={() => handleMainMenuClick('/casino-results')}
              >
                <span>
                  <img src={resultIcon} alt='' className='w-[18px]' />
                </span>
                <span>{t('results', 'Results')}</span>
              </div>
              <div className='flex items-center gap-[5px] border-b border-gray-300 px-2.5 py-2 text-[14px] text-[#045662]'>
                <span>
                  <img src={rulesIcon} alt='' className='w-[18px]' />
                </span>
                <span>{t('rules', 'Rules')}</span>
              </div>
              <div
                role='button'
                tabIndex={0}
                className='flex cursor-pointer items-center gap-[5px] px-2.5 py-2 text-[14px] text-[#045662] hover:bg-[#22b8cf] hover:text-white'
                onClick={logout}
              >
                <span>
                  <img src={logoutIcon} alt='' className='w-[18px]' />
                </span>
                <span>{t('logout', 'Logout')}</span>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}

export default Sidebar;
