import React, { useState, useEffect, useRef } from 'react';
import { FiMenu } from 'react-icons/fi';
import { IoMdClose } from 'react-icons/io';
import { FaBell, FaUser } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import r777 from '../../assets/brand_logo.svg';
import balCoin from '../../assets/balCoin.svg';
import accountIcon from '../../assets/icons/Account-Statement.svg';
import plIcon from '../../assets/icons/profit-loss-report.svg';
import historyIcon from '../../assets/icons/bet-history.svg';
import unsettledIcon from '../../assets/icons/unsettle-bet.svg';
import valueIcon from '../../assets/icons/set-button-value.svg';
import rulesIcon from '../../assets/icons/rules.svg';
import passwordIcon from '../../assets/icons/change-password.svg';
import resultIcon from '../../assets/icons/result.svg';
import logoutIcon from '../../assets/icons/log-out.svg';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../redux/api';
import { wsService } from '../../services/WebsocketService';
import {
  getUser,
  loginUser,
  user_reset,
  changePasswordByFirstLogin,
} from '../../redux/reducer/authReducer';
import { bet_reset } from '../../redux/reducer/betReducer';
import ExposureDetails from './ExposureDetails';
import Navbar from './Navbar';
import LoginPopup from '../auth/LoginPopup';
import LanguageSelector from '../language/LanguageSelector';
import { useTranslation } from '../../context/LanguageContext';
import { useUserLockSync } from '../../hooks/useUserLockSync';

function Header({
  onMenuToggle,
  isSidebarOpen,
  showSidebarToggle = true,
  onSidebarViewChange,
  rightMenu: rightMenuProp,
  setRightMenu: setRightMenuProp,
}) {
  const { t } = useTranslation();
  const [isExposureDetailsOpen, setExposureDetailsOpen] = useState(false);
  const [rightMenuInternal, setRightMenuInternal] = useState(false);
  const rightMenu =
    rightMenuProp !== undefined ? rightMenuProp : rightMenuInternal;
  const setRightMenu = setRightMenuProp || setRightMenuInternal;
  const [showBalance, setShowBalance] = useState(true);
  const [showExposure, setShowExposure] = useState(true);
  const openModal = () => setExposureDetailsOpen(true);
  const closeModal = () => setExposureDetailsOpen(false);
  const navigate = useNavigate();

  const handleAccountMenuClick = (options = {}) => {
    setRightMenu(false);
    onSidebarViewChange?.('mainMenu');
    if (options.path) navigate(options.path);
  };
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const dispatch = useDispatch();
  const { userInfo, isPasswordChanged } = useSelector((state) => state.auth);
  const isFullyAuthenticated = userInfo && isPasswordChanged !== false;

  useUserLockSync(Boolean(userInfo?._id));

  useEffect(() => {
    if (!localStorage.getItem('auth')) return;
    dispatch(getUser());
  }, [dispatch]);

  useEffect(() => {
    if (userInfo?._id) {
      wsService.connect(dispatch, String(userInfo._id));
    }
  }, [dispatch, userInfo?._id]);

  const logout = async () => {
    try {
      await api.get('/customer/logout', {
        withCredentials: true,
      });
    } catch (error) {
      console.log(error?.response?.data || error.message);
    } finally {
      localStorage.removeItem('auth');
      localStorage.removeItem('welcomePopupShown');
      dispatch(user_reset());
      dispatch(bet_reset());
      wsService.disconnect();
      setRightMenu(false);
      navigate('/');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideDesktop =
        dropdownRef.current && !dropdownRef.current.contains(event.target);
      const isOutsideMobile =
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(event.target);

      if (isOutsideDesktop && isOutsideMobile) {
        setIsUserDropdownOpen(false);
      }
    };

    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen]);

  return (
    <header className='bg-primary text-primary fixed top-0 left-0 z-10 w-full'>
      <div className='flex h-[66px] items-center justify-between md:h-[78px] md:px-[15px]'>
        <div className='flex h-full flex-1/2 items-center px-[15px]'>
          {showSidebarToggle ? (
            <button
              type='button'
              onClick={onMenuToggle}
              className='text-primary mr-2 rounded text-2xl hover:opacity-80 lg:hidden'
              aria-label='Toggle menu'
              aria-expanded={isSidebarOpen}
            >
              <FiMenu />
            </button>
          ) : null}
          <img
            src={r777}
            alt='r777'
            className='block w-[134px] py-[3px] md:py-[9px]'
            onClick={() => navigate('/')}
          />
        </div>
        <div className='flex flex-1/2 items-center justify-end gap-2 px-1 text-[12px] md:gap-4'>
          <LanguageSelector />
          {isFullyAuthenticated ? (
            <div className='flex flex-col md:flex-row md:items-center md:gap-4'>
              <div className='flex gap-1'>
                <div className='flex flex-col'>
                  <div
                    className='mb-[3px] flex min-w-[80px] justify-center gap-1 rounded-[6px] border-[1px] border-[#72bbef] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-[5px] py-[2px] text-[12px] md:min-w-[100px] md:px-2 md:text-[14px]'
                    onClick={() => setRightMenu(!rightMenu)}
                  >
                    <img
                      src={balCoin}
                      alt=''
                      className='w-[14px] md:w-[18px]'
                    />
                    <span>{userInfo?.avbalance?.toFixed(2)}</span>
                  </div>
                  <div
                    className='flex min-w-[80px] items-end justify-center gap-1 rounded-[6px] border-[1px] border-[#72bbef] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-[5px] py-[2px] text-[12px] md:min-w-[100px] md:px-2 md:text-[14px]'
                    onClick={() => setRightMenu(!rightMenu)}
                  >
                    <span className='text-[12px] font-semibold'>Exp:</span>{' '}
                    {userInfo?.exposure?.toFixed(2)}
                  </div>
                </div>
                {userInfo?.account !== 'demo' && (
                  <div className='hidden min-w-[40px] items-center justify-center gap-1 rounded-[6px] border-[1px] border-[#72bbef] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-2 text-[14px] md:flex'>
                    <FaBell size={20} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              type='button'
              onClick={() => setShowLoginPopup(true)}
              className='flex cursor-pointer items-center justify-center gap-1 rounded-[10px] border-[1px] border-[#72bbef] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-3 py-[8px] text-[14px] font-bold'
            >
              <FaUser /> {t('log_in', 'LOG IN')}
            </button>
          )}
        </div>
      </div>

      <Navbar />
      {userInfo?.account === 'demo' && (
        <div className='fixed top-0 left-1/2 -translate-x-1/2 rounded-b-md bg-red-600 px-8 text-[13px] text-white'>
          {t('demo_account', 'Demo Account')}
        </div>
      )}

      {rightMenu && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRightMenu(false)}
            className='fixed inset-0 z-40 bg-black/70'
          />
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className='fixed top-0 right-0 z-50 h-screen w-[270px] bg-[#005f6b] text-white'
          >
            {/* Close Button */}
            <div
              className='flex w-full justify-end p-2 text-[36px] leading-none text-white'
              onClick={() => setRightMenu(false)}
            >
              ×
            </div>

            <div className='flex items-center gap-2 px-2 pb-2 text-[14px]'>
              <span>
                <FaUser className='text-yellow-300' />
              </span>
              <span className='capitalize'>
                {userInfo?.account === 'demo' ? 'Demo' : userInfo?.userName} - (
                {userInfo?.avbalance?.toFixed(2)})
              </span>
            </div>

            <div className='flex gap-2 px-1.5 pb-2'>
              <div
                className='flex-1 rounded border border-white bg-[#22b8cf] py-1 pl-2 text-[14px]'
                onClick={openModal}
              >
                <p>{t('exposure', 'Exposure')}</p>
                <p className='text-black'>{userInfo?.exposure?.toFixed(2)}</p>
              </div>

              <div className='flex-1 rounded border border-white bg-[#22b8cf] py-1 pl-2 text-[14px]'>
                <p>{t('p_and_l', 'P&L')}</p>
                <p className='text-black'>
                  {(
                    Number(userInfo?.avbalance || 0) -
                    Number(userInfo?.baseBalance || 0) +
                    Math.abs(Number(userInfo?.exposure || 0))
                  ).toFixed(2)}
                </p>
              </div>
            </div>

            {userInfo?.account !== 'demo' && (
              <>
                <div
                  role='button'
                  tabIndex={0}
                  className='flex cursor-pointer items-center gap-[5px] px-2.5 py-2 text-[14px] hover:bg-[#22b8cf]'
                  onClick={() =>
                    handleAccountMenuClick({ path: '/account-statement' })
                  }
                >
                  <span>
                    <img src={accountIcon} alt='' className='w-[18px]' />
                  </span>
                  <span>{t('account_statement', 'Account Statement')}</span>
                </div>
                <div
                  role='button'
                  tabIndex={0}
                  className='flex cursor-pointer items-center gap-[5px] px-2.5 py-2 text-[14px] hover:bg-[#22b8cf]'
                  onClick={() =>
                    handleAccountMenuClick({ path: '/profit-loss' })
                  }
                >
                  <span>
                    <img src={plIcon} alt='' className='w-[18px]' />
                  </span>
                  <span>{t('profit_loss_report', 'Profit Loss Report')}</span>
                </div>
                <div
                  role='button'
                  tabIndex={0}
                  className='flex cursor-pointer items-center gap-[5px] px-2.5 py-2 text-[14px] hover:bg-[#22b8cf]'
                  onClick={() =>
                    handleAccountMenuClick({ path: '/bethistroy' })
                  }
                >
                  <span>
                    <img src={historyIcon} alt='' className='w-[18px]' />
                  </span>
                  <span>{t('bet_history', 'Bet History')}</span>
                </div>
                <div
                  role='button'
                  tabIndex={0}
                  className='flex cursor-pointer items-center gap-[5px] px-2.5 py-2 text-[14px] hover:bg-[#22b8cf]'
                  onClick={() =>
                    handleAccountMenuClick({ path: '/unsettled-bet' })
                  }
                >
                  <span>
                    <img src={unsettledIcon} alt='' className='w-[18px]' />
                  </span>
                  <span>{t('unsettled_bet', 'Unsettled Bet')}</span>
                </div>
                <div
                  role='button'
                  tabIndex={0}
                  className='flex cursor-pointer items-center gap-[5px] px-2.5 py-2 text-[14px] hover:bg-[#22b8cf]'
                  onClick={() => handleAccountMenuClick({ path: '/set-stake' })}
                >
                  <span>
                    <img src={valueIcon} alt='' className='w-[18px]' />
                  </span>
                  <span>{t('set_stake', 'Set Stake')}</span>
                </div>
                <div
                  role='button'
                  tabIndex={0}
                  className='flex cursor-pointer items-center gap-[5px] px-2.5 py-2 text-[14px] hover:bg-[#22b8cf]'
                  onClick={() =>
                    handleAccountMenuClick({ path: '/change-password' })
                  }
                >
                  <span>
                    <img src={passwordIcon} alt='' className='w-[18px]' />
                  </span>
                  <span>{t('change_password_txt', 'Change Password')}</span>
                </div>
                <div
                  role='button'
                  tabIndex={0}
                  className='flex cursor-pointer items-center gap-[5px] px-2.5 py-2 text-[14px] hover:bg-[#22b8cf]'
                  onClick={() =>
                    handleAccountMenuClick({ path: '/casino-results' })
                  }
                >
                  <span>
                    <img src={resultIcon} alt='' className='w-[18px]' />
                  </span>
                  <span>{t('results', 'Results')}</span>
                </div>
              </>
            )}

            <div className='flex items-center gap-[5px] px-2.5 py-2 text-[14px] hover:bg-[#22b8cf]'>
              <span>
                <img src={rulesIcon} alt='' className='w-[18px]' />
              </span>
              <span>{t('rules', 'Rules')}</span>
            </div>
            <div
              className='flex items-center gap-[5px] px-2.5 py-2 text-[14px] hover:bg-[#22b8cf]'
              onClick={logout}
            >
              <span>
                <img src={logoutIcon} alt='' className='w-[18px]' />
              </span>
              <span>{t('logout', 'Logout')}</span>
            </div>
          </motion.div>
        </>
      )}

      {isExposureDetailsOpen && userInfo?.exposure > 0 && (
        <ExposureDetails onClose={closeModal} userId={userInfo?._id} />
      )}
      <LoginPopup
        open={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
      />
    </header>
  );
}

export default Header;
