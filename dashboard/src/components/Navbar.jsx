import { useEffect, useMemo, useState } from 'react';
import {
  IoMdArrowDropdown,
  IoMdClose,
  IoMdRefresh,
  IoMdMenu,
} from 'react-icons/io';
import { AiOutlineLogout } from 'react-icons/ai';
import { NavLink, useLocation } from 'react-router-dom';
import { MdArrowRightAlt, MdLogout } from 'react-icons/md';
import { RiArrowDownSFill } from 'react-icons/ri';
import { FaBullhorn } from 'react-icons/fa';
import logo from '../assets/brand_logo.svg';
import { useDispatch, useSelector } from 'react-redux';
import {
  getAdmin,
  user_reset,
  userLogout,
  changePasswordBySubAdmin,
} from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SportsSidebar from './SportsSidebar';
import AccountSummaryBar from './AccountSummaryBar';
import NotificationBell from './NotificationBell';
import { isSuperAdmin } from '../utils/roleUtils';
import { FEATURES } from '../config/featureFlags';
import varahiLogo from '../assets/icons/varahiLogo.png';
const Navbar = ({ onLogoClick, onNavClick }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo, errorMessage, successMessage, loading, isPasswordChanged } =
    useSelector((state) => state.auth);

  const [activeItem, setActiveItem] = useState('Home');
  const [showPopup, setShowPopup] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const shouldShowPasswordPopup = isPasswordChanged === false;
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [changeFormData, setChangeFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    dispatch(getAdmin());
  }, [dispatch]);

  const changeSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await dispatch(
        changePasswordBySubAdmin({
          oldPassword: changeFormData.oldPassword,
          newPassword: changeFormData.newPassword,
          confirmPassword: changeFormData.confirmPassword,
        })
      );

      if (result.type.endsWith('/fulfilled')) {
        toast.success('Password changed successfully');
        // ✅ Clear form
        setChangeFormData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else if (result.type.endsWith('/rejected')) {
        toast.error(result.payload || 'Failed to change password');
      }
    } catch (error) {
      console.log('Password change error:', error);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/home' },
    { name: 'Clients', path: '/user-download-list' },
    // { name: 'Assign Agent', path: '/agent-download-list' },

    { name: 'Sports Analysis', path: '/my-market' },
    { name: 'Casino Analysis', path: '/casino-analysis' },
    {
      name: 'Settlement',
      submenu: [
        { name: 'User', path: '/user-settlement' },
        { name: 'Master', path: '/master-settlement' },
      ],
    },
    {
      name: 'Reports',
      submenu: [
        { name: 'User Detail', path: '/user-details' },
        { name: 'Account Statement', path: '/AccountStatement' },
        { name: 'Settlement/Balance Report', path: '/SettlementReport' },
        ...(FEATURES.transactionReport
          ? [{ name: 'Transaction Report', path: '/TransactionReport' }]
          : []),
        { name: 'Current Bets', path: '/CurrentBets' },
        { name: 'Profit & Loss Report', path: '/ProfitLossReport' },
        { name: 'Event Profit & Loss Report', path: '/EventLossReport' },
        { name: 'Bet History', path: '/BetHistoryReport' },
        { name: 'Live Bets', path: '/LiveBetsReport' },
        { name: 'Sports Revenue', path: '/SportRevenue' },
        { name: 'IP lookup', path: '/IpLookupReport' },
      ],
    },
    // {
    //   name: 'Cutting',
    //   submenu: [
    //     { name: 'Agent Master', path: '/live-casino?cat=Roulette' },
    //     { name: 'Cutting History', path: '/live-casino?cat=Teenpatti' },
    //   ],
    // },
    {
      name: 'Control',
      submenu: [
        { name: 'Game', path: '/gamebetlock' },
        { name: 'Casino', path: '/casinolock' },
      ],
    },
    { name: 'Banner Settings', path: '/banner-settings', superAdminOnly: true },
    { name: 'Match Control', path: '/match-control', superAdminOnly: true },
    // {
    //   name: 'Live Market',
    //   submenu: [
    //     { name: 'Roulette', path: '/live-casino?cat=Roulette' },
    //     { name: 'Teenpatti', path: '/live-casino?cat=Teenpatti' },
    //     { name: 'Poker', path: '/live-casino?cat=Poker' },
    //     { name: 'Baccarat', path: '/live-casino?cat=Baccarat' },
    //     { name: 'Dragon Tiger', path: '/live-casino?cat=Dragon Tiger' },
    //     { name: '32 Cards', path: '/live-casino?cat=32 Cards' },
    //     { name: 'Andar Bahar', path: '/live-casino?cat=Andar Bahar' },
    //     { name: 'Lucky 7', path: '/live-casino?cat=Lucky 7' },
    //     { name: '3 Card Judgement', path: '/live-casino?cat=3 Card Judgement' },
    //     { name: 'Worli', path: '/live-casino?cat=Worli' },
    //     { name: 'Sports', path: '/live-casino?cat=Sports' },
    //     { name: 'Bollywood', path: '/live-casino?cat=Bollywood' },
    //     { name: 'Lottery', path: '/live-casino?cat=Lottery' },
    //     { name: 'Queen', path: '/live-casino?cat=Queen' },
    //     { name: 'Race', path: '/live-casino?cat=Race' },
    //   ],
    // },
    // {
    //   name: 'Live Virtual Market',
    //   submenu: [
    //     { name: '20-20 Teenpatti', path: '/casino-bet/teen20' },
    //     { name: 'Muflis Teenpatti', path: '/casino-bet/teenmuf' },
    //     { name: '1 Day Teenpatti', path: '/casino-bet/teen' },
    //     { name: 'Lucky 7', path: '/casino-bet/lucky7' },
    //     { name: '1 Day Dragon Tiger', path: '/casino-bet/dt6' },
    //   ],
    // },
  ];

  const logout = async () => {
    setShowLogoutPopup(false);
    try {
      const data = await dispatch(userLogout()).unwrap();
      toast.success(data?.message || 'Logged out successfully');
    } catch (error) {
      toast.error(error);
    } finally {
      localStorage.removeItem('auth');
      dispatch(user_reset());
      navigate('/login', { replace: true });
    }
  };

  const reload = () => {
    dispatch(getAdmin());
  };

  const toggleMobileSubmenu = (itemName, event) => {
    if (mobileSubmenuOpen === itemName) {
      setMobileSubmenuOpen(null);
    } else {
      // Calculate position relative to viewport
      const rect = event.target.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 200; // Approximate dropdown height

      // Position dropdown above if near bottom of screen
      if (rect.bottom + dropdownHeight > viewportHeight) {
        setDropdownPosition({
          top: rect.top - dropdownHeight,
          left: rect.left,
          position: 'fixed',
        });
      } else {
        setDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          position: 'fixed',
        });
      }
      setMobileSubmenuOpen(itemName);
    }
  };

  const visibleNavItems = useMemo(
    () =>
      navItems.filter(
        (item) => !item.superAdminOnly || isSuperAdmin(userInfo?.role)
      ),
    [userInfo?.role]
  );

  const isSubmenuActive = (item) => {
    if (!item.submenu) return false;

    return item.submenu.some((sub) => {
      const currentPath = location.pathname;
      return currentPath === sub.path;
    });
  };

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sportsSidebarOpen, setSportsSidebarOpen] = useState(false);

  return (
    <>
      <div
        className={`sticky top-0 z-10 w-full ${
          location.pathname == '/login' ? 'hidden' : 'block'
        }`}
      >
        {/* Desktop Header */}
        <header className='flex h-[40px] items-center justify-between bg-gradient-to-b from-[#022c43] to-[#18b0c8] md:h-[52px]'>
          <div className='flex h-[40px] items-center md:h-[52px]'>
            <button
              type='button'
              onClick={() => setSportsSidebarOpen((prev) => !prev)}
              className='mr-1 ml-3 cursor-pointer text-white'
              aria-expanded={sportsSidebarOpen}
              aria-label='Toggle sports menu'
            >
              <IoMdMenu className='text-2xl' />
            </button>
            <NavLink
              to='/user-download-list'
              className='h-[25px] md:mr-10 md:h-[32px]'
              onClick={(e) => {
                if (onLogoClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onLogoClick();
                }
              }}
            >
              <img src={logo} alt='logo' className='block h-full' />
            </NavLink>

            <nav className='hidden h-full text-black md:flex'>
              <ul className='relative z-999 mx-auto flex h-full w-full flex-wrap items-center'>
                {visibleNavItems.map((item, i) => (
                  <li
                    key={i}
                    className='relative h-full'
                    onMouseEnter={() => setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {item.path ? (
                      <NavLink
                        to={item.path}
                        className='flex h-full items-center from-[#16a4bc] to-[#16a4bc] px-1.5 text-[14px] whitespace-nowrap text-white transition-colors hover:bg-gradient-to-b'
                        onClick={() => {
                          setActiveItem(item.name);
                          if (onNavClick) onNavClick();
                        }}
                      >
                        {item.name}
                      </NavLink>
                    ) : (
                      <span
                        className={`" flex h-full cursor-pointer items-center gap-[2px] from-[#16a4bc] to-[#16a4bc] px-1.5 py-2 text-[14px] whitespace-nowrap text-white hover:bg-gradient-to-b`}
                      >
                        {item.name}
                        <IoMdArrowDropdown />
                      </span>
                    )}

                    {/* Submenu Dropdown */}
                    {item.submenu && hoveredItem === item.name && (
                      <ul className='absolute top-full left-0 z-20 overflow-visible bg-[#16a4bc] font-semibold whitespace-nowrap text-white shadow-lg'>
                        {item.submenu
                          .filter(
                            (sub) =>
                              !(
                                userInfo?.role === 'agent' &&
                                sub.name === 'Agent Downline List'
                              )
                          )
                          .map((sub, index) => (
                            <li
                              key={index}
                              className='min-w-[200px] border border-[#25b3cd] border-t-[#25b3cd] border-b-[#128ca3] from-[#0c889e] to-[#0c889e] hover:bg-gradient-to-b'
                            >
                              <NavLink
                                to={sub.path}
                                className='block px-3 py-2 text-[13px]'
                                onClick={(e) => {
                                  setActiveItem(item.name);
                                  if (sub.reload) {
                                    e.preventDefault();
                                    navigate(sub.path);
                                    window.location.reload();
                                  }
                                }}
                              >
                                {sub.name}
                              </NavLink>
                            </li>
                          ))}
                      </ul>
                    )}
                  </li>
                ))}
                {/* <li
                  onClick={logout}
                  className='flex flex-1 cursor-pointer items-center justify-end gap-1 px-3 text-[13px] font-semibold whitespace-nowrap text-black transition-colors'
                >
                  Logout <MdLogout />
                </li> */}
              </ul>
            </nav>
          </div>

          <div className='mr-1 flex items-center gap-0.5 md:mr-4 md:gap-1'>
            {userInfo?.role === 'supperadmin' && (
              <img src={varahiLogo} alt='' className='w-[40px] md:w-[50px]' />
            )}
            <div className='relative flex items-center'>
              {/* <p
                className='rounded-sm bg-[#292929] px-1.5 text-[10px] text-white uppercase'
                style={{ boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, .4)' }}
              >
                {userInfo?.role === 'white' ? 'white_label' : userInfo?.role}
              </p> */}

              <p
                className='text-[12px] text-white md:text-sm'
                onClick={() => setShowLogoutPopup((prev) => !prev)}
              >
                {userInfo?.name}
              </p>
              <RiArrowDownSFill size={16} className='text-white' />
              {showLogoutPopup && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className='absolute top-8 right-0 z-999 w-[180px] rounded-md border border-gray-400 bg-white py-1.5'
                >
                  <div className='flex cursor-pointer items-center px-2 py-0.5 text-[14px] text-gray-700 hover:bg-[#18b0c8] hover:text-white'>
                    <MdArrowRightAlt size={22} />{' '}
                    <NavLink to='/ChangePassword'>Change Password</NavLink>
                  </div>
                  <div
                    className='flex cursor-pointer items-center px-2 py-0.5 text-[14px] text-gray-700 hover:bg-[#18b0c8] hover:text-white'
                    onClick={logout}
                  >
                    <MdArrowRightAlt size={22} /> Logout
                  </div>
                </motion.div>
              )}
            </div>
            <NotificationBell role={userInfo?.role} />
          </div>
        </header>

        <AccountSummaryBar />

        {/* Popup */}
        {showPopup && (
          <div className='fixed inset-0 z-50 flex items-center justify-center'>
            <div className='bg-opacity-50 absolute inset-0 bg-black'></div>
            <div className='bg-color relative z-10 mx-4 w-full p-4 text-white shadow-lg md:max-w-lg'>
              <div className='flex items-center justify-between'>
                <h2 className='text-center text-lg font-bold'>
                  Non-Gambling Territories.
                </h2>
                <button
                  onClick={() => setShowPopup(false)}
                  className='bg-color rounded-md p-1 text-xl'
                >
                  <IoMdClose />
                </button>
              </div>
              <hr className='my-2 border-white' />
              <p className='text-sm'>
                Connecting to our site from non-gambling countries, it will be
                User's responsibility to ensure that their use of the service is
                lawful.
              </p>
              <h3 className='my-3 text-center font-bold'>
                Underage gambling is prohibited.
              </h3>
              <p className='text-center text-sm'>
                Please confirm if you are 18 years old and above as of today.
              </p>
              <hr className='my-2 border-white' />
              <div className='mt-4 flex justify-center gap-2'>
                <button
                  className='w-[130px] rounded bg-white py-1 text-black hover:bg-gray-300'
                  onClick={() => setShowPopup(false)}
                >
                  Confirm
                </button>
                <button
                  className='w-[130px] rounded border border-white bg-black py-1 text-white'
                  onClick={() => setShowPopup(false)}
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <SportsSidebar
        isOpen={sportsSidebarOpen}
        onClose={() => setSportsSidebarOpen(false)}
      />

      {shouldShowPasswordPopup && (
        <div className='fixed z-50 flex h-full w-full items-center justify-center bg-black/30'>
          <div className='fixed top-6 left-1/2 w-90 -translate-x-1/2 rounded-lg bg-white shadow-lg md:w-[500px]'>
            <div className='flex items-center justify-between rounded-t-lg bg-gray-700 px-4 py-2 text-white'>
              <h2 className='font-semibold'>Change Password</h2>
            </div>
            <form className='space-y-4 p-6' onSubmit={changeSubmit}>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='relative'>
                  <label className='block text-sm font-medium text-gray-700'>
                    Old Password <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type={showOld ? 'text' : 'password'}
                    placeholder='Old Password..'
                    value={changeFormData.oldPassword}
                    onChange={(e) =>
                      setChangeFormData({
                        ...changeFormData,
                        oldPassword: e.target.value,
                      })
                    }
                    className='mt-1 w-full rounded border px-3 py-2 focus:ring focus:ring-blue-200'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowOld(!showOld)}
                    className='absolute top-9 right-3 text-gray-500'
                  >
                    {showOld ? '🙈' : '👁️'}
                  </button>
                </div>

                <div className='relative'>
                  <label className='block text-sm font-medium text-gray-700'>
                    New Password <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type={showNew ? 'text' : 'password'}
                    placeholder='New Password..'
                    value={changeFormData.newPassword}
                    onChange={(e) =>
                      setChangeFormData({
                        ...changeFormData,
                        newPassword: e.target.value,
                      })
                    }
                    className='mt-1 w-full rounded border px-3 py-2 focus:ring focus:ring-blue-200'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowNew(!showNew)}
                    className='absolute top-9 right-3 text-gray-500'
                  >
                    {showNew ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className='relative'>
                <label className='block text-sm font-medium text-gray-700'>
                  Confirm Password <span className='text-red-500'>*</span>
                </label>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder='Confirm Password..'
                  value={changeFormData.confirmPassword}
                  onChange={(e) =>
                    setChangeFormData({
                      ...changeFormData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className='mt-1 w-full rounded border px-3 py-2 focus:ring focus:ring-blue-200'
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowConfirm(!showConfirm)}
                  className='absolute top-9 right-3 text-gray-500'
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>

              <div className='flex justify-end'>
                <button
                  type='submit'
                  className='rounded bg-gray-800 px-4 py-2 text-white hover:bg-gray-900'
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className='fixed bottom-0 left-0 flex h-[25px] w-full items-center justify-center bg-gradient-to-b from-[#5ecbdd] to-[#146578] text-[14px] text-white z-99'>
        <div className='rfm-marquee-container'>
          <span className='rfm-marquee'>
            <FaBullhorn className='mr-2 inline-block' />
            1️⃣Welcome To
            Our Exchange .....✨✨✨2️⃣ IPL Winner Cup Bookmaker Bets Started In Our Exchange 💫💫💫
          </span>
          <span className='rfm-marquee'>
            <FaBullhorn className='mr-2 inline-block' />
            1️⃣Welcome To
            Our Exchange .....✨✨✨2️⃣ IPL Winner Cup Bookmaker Bets Started In Our Exchange 💫💫💫
          </span>
        </div>
      </div>
    </>
  );
};

export default Navbar;
