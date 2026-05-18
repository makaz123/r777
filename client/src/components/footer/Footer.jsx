import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import menuIcon from '../../assets/icons/menuIcon.svg';
import inplayIcon from '../../assets/icons/inplayIcon.svg';
import homeIcon from '../../assets/icons/homeIcon.svg';
import miniGames from '../../assets/icons/mini_gamesGif.gif';
import LoginPopup from '../auth/LoginPopup';

function Footer({ onMenuClick }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { userInfo } = useSelector((state) => state.auth);
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  const isHomeActive = pathname === '/';
  const isInplayActive = pathname === '/inplay';

  const handleMenuClick = () => {
    if (!userInfo) {
      setShowLoginPopup(true);
      return;
    }
    onMenuClick?.();
  };

  return (
    <>
      <div className='fixed bottom-0 left-0 grid h-[40px] w-full grid-cols-4 items-center justify-items-center rounded-t-lg bg-[#045662] shadow-[0_0_1.3333333333vw_#00000080] sm:h-[78px] md:hidden'>
        {isHomeActive ? (
          <div
            className='col-span-1 w-full cursor-pointer px-2'
            onClick={() => navigate('/')}
          >
            <span className='flex items-center justify-center gap-1 rounded-full bg-[#18adc5] px-2 py-1 text-[12px] text-white sm:text-[14px]'>
              <img src={homeIcon} alt='' className='w-[18px] sm:w-[25px]' />
              Home
            </span>
          </div>
        ) : (
          <div
            className='group col-span-1 w-full cursor-pointer px-2'
            onClick={() => navigate('/')}
          >
            <span className='flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[12px] text-white transition-colors group-hover:bg-[#18adc5] sm:text-[14px]'>
              <img src={homeIcon} alt='' className='w-[18px] sm:w-[25px]' />
              <span className='hidden group-hover:inline'>Home</span>
            </span>
          </div>
        )}

        {isInplayActive ? (
          <div
            className='col-span-1 w-full cursor-pointer px-2'
            onClick={() => navigate('/inplay')}
          >
            <span className='flex items-center justify-center gap-1 rounded-full bg-[#18adc5] px-2 py-1 text-center text-[12px] text-white sm:text-[14px]'>
              <img src={inplayIcon} alt='' className='w-[18px] sm:w-[25px]' />
              Inplay
            </span>
          </div>
        ) : (
          <div
            className='group col-span-1 w-full cursor-pointer px-2'
            onClick={() => navigate('/inplay')}
          >
            <span className='flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[12px] text-white transition-colors group-hover:bg-[#18adc5] sm:text-[14px]'>
              <img src={inplayIcon} alt='' className='w-[18px] sm:w-[25px]' />
              <span className='hidden group-hover:inline'>InPlay</span>
            </span>
          </div>
        )}
        <div className='group col-span-1 w-full cursor-pointer'>
          <span className='flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[12px] text-white transition-colors group-hover:bg-[#18adc5] sm:text-[14px]'>
            <img src={miniGames} alt='' className='w-[18px] sm:w-[25px]' />
            <span className='hidden whitespace-nowrap group-hover:inline'>
              Mini Games
            </span>
          </span>
        </div>
        <div
          className='group col-span-1 w-full cursor-pointer px-2'
          onClick={handleMenuClick}
        >
          <span className='flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[12px] text-white transition-colors group-hover:bg-[#18adc5] sm:text-[14px]'>
            <img src={menuIcon} alt='' className='w-[18px] sm:w-[25px]' />
            <span className='hidden group-hover:inline'>Menu</span>
          </span>
        </div>
      </div>
      <LoginPopup
        open={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
      />
    </>
  );
}

export default Footer;
