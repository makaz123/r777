import React, { useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCricketData } from '../../redux/reducer/cricketSlice';
import { FaFootballBall } from 'react-icons/fa';
import { IoMdTennisball } from 'react-icons/io';
import { GiCricketBat } from 'react-icons/gi';
import aviatorIcon from '../../assets/aviator-icon.svg';
import sportsIcon from '../../assets/sports-icons.png';
import inOutIcon from '../../assets/inout-iconB.svg';
import { useTranslation } from '../../context/LanguageContext';

function Navbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { matches: cricketMatches } = useSelector((state) => state.cricket);

  useEffect(() => {
    if (!Array.isArray(cricketMatches) || cricketMatches.length === 0) {
      dispatch(fetchCricketData());
    }
  }, [dispatch, cricketMatches]);

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
    return `/cricket-bet/${encodeURIComponent(gameName)}/${row?.id}`;
  }, [cricketMatches]);

  const { matches: soccerMatches } = useSelector((state) => state.soccer);
  const { matches: tennisMatches } = useSelector((state) => state.tennis);

  const inplayCounts = {
    cricket: Array.isArray(cricketMatches)
      ? cricketMatches.filter((m) => m.inplay).length
      : 0,
    soccer: Array.isArray(soccerMatches)
      ? soccerMatches.filter((m) => m.inplay).length
      : 0,
    tennis: Array.isArray(tennisMatches)
      ? tennisMatches.filter((m) => m.inplay).length
      : 0,
  };

  const mainNavItems = [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'inplay', label: 'In-Play', path: '/inplay' },
    { id: 'ipl', label: 'IPL 2026', path: iplBetPath },
    { id: 'cricket', label: 'Cricket', icon: GiCricketBat, path: '/cricket' },
    { id: 'soccer', label: 'Soccer', icon: FaFootballBall, path: '/football' },
    { id: 'tennis', label: 'Tennis', icon: IoMdTennisball, path: '/tennis' },
    { id: 'indianPoker', label: 'Indian Poker', path: '/' },
    { id: 'indianPoker2', label: 'Indian Poker2', path: '/' },
    { id: 'rvGames', label: 'RV Games', path: '/' },
    { id: 'spribe', label: 'Aviator', path: '/spribe' },
    { id: 'inOut', label: 'Chicken Road', path: '/inout' },
    { id: 'ezugi', label: 'Ezugi', path: '/ezugi' },
    { id: 'evolution', label: 'Evolution', path: '/evolution' },
    { id: 'liveCasino', label: 'Live Casino', path: '/livecasino' },
    { id: 'vivo', label: 'Vivo', path: '/' },
    { id: 'betGames', label: 'Betgames', path: '/' },
    { id: 'casino3', label: 'Casino 3', path: '/casino3' },
  ];

  const activeNav = useMemo(() => {
    const path = location.pathname || '/';

    if (path === '/') return 'home';
    if (path.startsWith('/inplay')) return 'inplay';

    if (path.startsWith('/cricket-bet')) {
      return path === iplBetPath ? 'ipl' : 'cricket';
    }
    if (path.startsWith('/cricket')) return 'cricket';

    if (path.startsWith('/football')) return 'soccer';
    if (path.startsWith('/tennis')) return 'tennis';

    if (path.startsWith('/spribe')) return 'aviator';
    if (path.startsWith('/inout')) return 'chickenRoad';
    if (path.startsWith('/evolution')) return 'evolution';
    if (path.startsWith('/ezugi')) return 'ezugi';
    if (path.startsWith('/ezugi')) return 'ezugi';
    if (path.startsWith('/vivo')) return 'vivo';
    if (path.startsWith('/betgames')) return 'betGames';
    if (path.startsWith('/livecasino')) return 'liveCasino';
    if (path.startsWith('/casino3')) return 'casino3';
    if (path.startsWith('/indianpoker2')) return 'indianPoker2';
    if (path.startsWith('/indianpoker')) return 'indianPoker';
    if (path.startsWith('/rvgames')) return 'rvGames';

    return '';
  }, [location.pathname, iplBetPath]);

  const providerSpritePositions = {
    inplay: '0px -1527px',
    ipl: '0px -1775px',
    cricket: '0px -326px',
    soccer: '0px -1026px',
    tennis: '0px -1096px',
    indianPoker: '0px -863px',
    indianPoker2: '0px -1742px',
    rvGames: '0px -1706px',
    spribe: '0px -352px',
    chickenroad: '0px -384px',
    ezugi: '0px -1706px',
    evolution: '0px -1706px',
    liveCasino: '0px -863px',
    vivo: '0px -1706px',
    betGames: '0px -1706px',
    casino3: '0px -863px',
  };

  return (
    <nav className='h-[51px] bg-[#045662] text-[white] xl:h-[40px]'>
      <div className='scrollbar-hide flex h-full overflow-x-scroll xl:overflow-visible'>
        {mainNavItems.map((item) => {
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.path) {
                  navigate(item.path);
                }
              }}
              className={`relative px-[11px] text-[14px] font-bold hover:bg-[#5ecbdd] ${item.id === 'home' ? 'hidden xl:block' : ''
                } ${activeNav === item.id &&
                  item.id !== 'ezugi' &&
                  item.id !== 'ipl'
                  ? 'bg-[#5ecbdd]'
                  : ''
                } ${item.id === 'ezugi' || item.id === 'ipl' ? 'awesome' : ''} `}
            >
              {item.id !== 'spribe' && item.id !== 'inOut' && (
                <span
                  className='block h-6 w-6 flex-shrink-0 bg-no-repeat xl:hidden'
                  style={{
                    backgroundImage: `url(${sportsIcon})`,
                    backgroundPosition: providerSpritePositions[item.id],
                    backgroundSize: '28px auto',
                    width: '28px',
                    height: '24px',
                    margin: 'auto',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              )}
              {item.id === 'spribe' && (
                <span className='flex w-full justify-center xl:hidden'>
                  <img src={aviatorIcon} alt='' className='h-[24px] w-[35px]' />
                </span>
              )}
              {item.id === 'inOut' && (
                <span className='flex w-full justify-center xl:hidden'>
                  <img src={inOutIcon} alt='' className='h-[24px] w-[45px]' />
                </span>
              )}

              <span className='text-[12px] font-[700] whitespace-nowrap uppercase xl:text-[14px] xl:normal-case'>
                {t(item.id, item.label)}
              </span>

              {(item.id === 'cricket' ||
                item.id === 'tennis' ||
                item.id === 'soccer') && (
                  <div className='absolute top-[6px] right-[3px] z-10 flex h-[10px] min-w-[33px] overflow-hidden rounded-[3px] bg-white text-[8px] xl:-top-[6px] xl:right-[3px] xl:h-[12px] xl:text-[10px]'>
                    <span className='flex flex-1 animate-pulse items-center justify-center text-[6px] text-red-500 uppercase xl:text-[8px]'>
                      {t('live', 'Live')}
                    </span>
                    <span className='bg-red-500 px-[3px] py-[1px] leading-none text-white'>
                      {inplayCounts[item.id] ?? 0}
                    </span>
                  </div>
                )}

              {item.id === 'aviator' && (
                <img
                  src={aviatorIcon}
                  alt=''
                  className='absolute -top-[10px] left-1/2 h-[18px] -translate-x-1/2'
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default Navbar;
