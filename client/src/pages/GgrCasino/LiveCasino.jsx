import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import royalCasino from '../../assets/royalcasino-banner.jpg';
import allpro from '../../assets/provider/provider-all.png';
import sm from '../../assets/provider/smartsoft-gaming.png';
import onetouch from '../../assets/provider/onetouch-live.png';
import ezugi from '../../assets/provider/Ezugi.png';
import LoginPopup from '../../components/auth/LoginPopup';
import { casinoData } from './CasinoData';
import { startCasinoGame } from '../../services/casinoService';

const TABS = [
  { id: 'all', label: 'All', icon: allpro },
  { id: 'ezugi', label: 'Ezugi', icon: ezugi },
  { id: 'smartsoft', label: 'Smartsoft Gaming', icon: sm },
  { id: 'onegame', label: 'Onetouch', icon: onetouch },
];

const ezugiGames = casinoData.providers.ezugi ?? [];
const smGames = casinoData.providers.smartsoft ?? [];
const oneGames = casinoData.providers.onegame ?? [];

function getGamesForTab(tabId) {
  switch (tabId) {
    case 'onegame':
      return oneGames;
    case 'smartsoft':
      return smGames;
    case 'ezugi':
      return ezugiGames;
    case 'all':
    default:
      return [...oneGames, ...smGames, ...ezugiGames];
  }
}

function LiveCasino() {
  const { userInfo } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('all');
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gameUrl, setGameUrl] = useState(null);

  const games = useMemo(() => getGamesForTab(activeTab), [activeTab]);

  const handleGameClick = async (game) => {
    if (!game?.game_uid) return;

    if (!userInfo) {
      setShowLoginPopup(true);
      return;
    }

    if (userInfo?.account === 'demo') {
      toast.error('Please Login With Real Id');
      return;
    }

    if ((userInfo?.avbalance ?? 0) <= 0) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      setLoading(true);

      const res = await startCasinoGame(
        userInfo.userName,
        game.game_uid,
        userInfo.avbalance
      );

      if (res?.success) {
        setGameUrl(res.gameUrl);
      } else {
        toast.error(res?.message || 'Failed to launch game');
      }
    } catch (err) {
      toast.error('Game launch failed');
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  if (gameUrl) {
    return (
      <div className='h-screen w-full bg-black'>
        <iframe
          src={gameUrl}
          title='Casino Game'
          className='h-full w-full border-0'
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className='w-full px-2 pb-2'>
      <img
        src={royalCasino}
        alt='Royal Casino Banner'
        className='block w-full'
      />

      <div className='flex overflow-x-auto bg-[#2b2f35] text-white'>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 cursor-pointer flex-col items-center border-r border-[#c51a1b] px-[15px] py-[5px] transition-colors ${isActive ? 'bg-[#c51a1b]' : 'bg-transparent hover:bg-[#3a3f47]'
                }`}
            >
              <img src={tab.icon} alt='' className='w-[30px]' />
              <span className='text-xs whitespace-nowrap sm:text-sm'>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className='flex h-40 items-center justify-center text-sm text-white'>
          Launching game...
        </div>
      ) : games.length === 0 ? (
        <div className='flex h-40 items-center justify-center text-sm text-gray-400'>
          No games found.
        </div>
      ) : (
        <div className='mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 lg:grid-cols-6'>
          {games.map((game) => (
            <div
              key={`${game.id}-${game.game_uid}`}
              onClick={() => handleGameClick(game)}
              className='flex cursor-pointer flex-col'
            >
              <div className='overflow-hidden rounded-md border-[3px] border-[#045662]'>
                <img
                  src={game.icon}
                  alt={game.game_name}
                  loading='lazy'
                  className='block h-[250px] w-full object-cover transition-transform duration-300'
                  onError={(e) => {
                    e.currentTarget.style.opacity = '0.4';
                  }}
                />
              </div>
              <span className='flex w-full items-center justify-center truncate py-2 text-center text-[14px] font-bold'>
                {game.game_name}
              </span>
            </div>
          ))}
        </div>
      )}

      <LoginPopup
        open={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
      />
    </div>
  );
}

export default LiveCasino;
