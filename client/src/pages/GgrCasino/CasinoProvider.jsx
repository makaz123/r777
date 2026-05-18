import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import LoginPopup from '../../components/auth/LoginPopup';
import { casinoData } from './CasinoData';
import { startCasinoGame } from '../../services/casinoService';
import { motion } from 'framer-motion';
import aviatorBann from '../../assets/aviator-banner.jpg';
import inOutBann from '../../assets/chickenroad-banner.jpg';
import casinopoint100 from '../../assets/casinopoint100.webp';

function CasinoProvider() {
  const navigate = useNavigate();
  const { provider } = useParams();
  const { userInfo } = useSelector((state) => state.auth);

  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [openCasino, setOpenCasino] = useState(true);
  const [loading, setLoading] = useState(false);
  const [gameUrl, setGameUrl] = useState(null);

  const providerKey = (provider || '').toLowerCase();

  const games = useMemo(() => {
    const raw = casinoData.providers[providerKey];
    return Array.isArray(raw) ? raw : [];
  }, [providerKey]);

  const handleGameClick = async (game) => {
    if (!game?.game_uid) return;

    if (!userInfo) {
      setShowLoginPopup(true);
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
        // Option 1: Open inside iframe
        setGameUrl(res.gameUrl);

        // Option 2: Redirect directly
        // window.location.href = res.gameUrl;
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
  const autoLaunchAttempted = useRef(false);

  useEffect(() => {
    setOpenCasino(true);
    autoLaunchAttempted.current = false;
  }, [provider]);

  useEffect(() => {
    if (
      providerKey === 'evolution' &&
      userInfo &&
      userInfo.account !== 'demo' &&
      !autoLaunchAttempted.current
    ) {
      autoLaunchAttempted.current = true;
      handleGameClick({
        game_uid: '8ef39602e589bf9f32fc351b1cbb338b',
      });
    }
  }, [providerKey, userInfo]);
  // Provider not found
  if (!casinoData.providers[providerKey]) {
    return (
      <div className='flex h-[calc(100vh-200px)] flex-col items-center justify-center p-6 text-center'>
        <h2 className='text-lg font-semibold text-gray-200'>
          Provider not found
        </h2>

        <p className='mt-2 text-sm text-gray-400'>
          The provider "{provider}" is not available.
        </p>

        <button
          className='mt-4 rounded bg-yellow-500 px-4 py-2 text-sm font-semibold text-black'
          onClick={() => navigate('/')}
        >
          Go Home
        </button>
      </div>
    );
  }

  // Show game iframe
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
      {/* Banner */}
      {providerKey === 'spribe' && (
        <img src={aviatorBann} alt='Spribe Banner' className='block w-full' />
      )}

      {providerKey === 'inout' && (
        <img src={inOutBann} alt='InOut Banner' className='block w-full' />
      )}

      {/* Loading */}
      {loading && (
        <div className='flex h-40 items-center justify-center text-sm text-white'>
          Launching game...
        </div>
      )}

      {/* Games */}
      {!loading && (
        <>
          {games.length === 0 ? (
            <div className='flex h-40 items-center justify-center text-sm text-gray-400'>
              No games found.
            </div>
          ) : (
            <div className='mt-4 grid grid-cols-3 gap-3 md:grid-cols-6'>
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
        </>
      )}

      {/* Login Popup */}
      <LoginPopup
        open={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
      />

      {openCasino && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed top-0 left-0 z-20 h-full w-full bg-black/60'
          />
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 0 }}
            transition={{ duration: 0.1 }}
            className='fixed top-1/2 left-1/2 z-30 min-h-[200px] w-[80%] max-w-[320px] -translate-x-1/2 -translate-y-1/2'
          >
            <div className='relative'>
              <img src={casinopoint100} alt='' className='max-w-full' />
              <span
                className='absolute top-5 right-5 text-[20px] font-bold'
                onClick={() => setOpenCasino(false)}
              >
                ×
              </span>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

export default CasinoProvider;
