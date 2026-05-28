import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getUser } from '../redux/reducer/authReducer';
import Header from '../components/header/Header';
import Sidebar from '../components/sidebar/Sidebar';
import Footer from '../components/footer/Footer';
const MAIN_MENU_PATHS = [
  '/account-statement',
  '/bethistroy',
  '/activity-log',
  '/change-password',
  '/casino-results',
  '/set-stake',
];

function MainLayout() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const userInfo = useSelector((state) => state.auth.userInfo);
  const showSidebar = !(pathname === '/' && !userInfo);
  const [sidebarView, setSidebarView] = useState('popular');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [rightMenu, setRightMenu] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsSidebarOpen(false);
  }

  useEffect(() => {
    if (MAIN_MENU_PATHS.includes(pathname)) {
      setSidebarView('mainMenu');
    } else {
      setSidebarView('popular');
    }
  }, [pathname]);

  useEffect(() => {
    if (!userInfo?._id || !localStorage.getItem('auth')) return;
    if (/-bet(\/|$)/.test(pathname)) {
      dispatch(getUser());
    }
  }, [pathname, userInfo?._id, dispatch]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <>
      <Header
        showSidebarToggle={showSidebar}
        isSidebarOpen={isSidebarOpen}
        onMenuToggle={toggleSidebar}
        onSidebarViewChange={setSidebarView}
        rightMenu={rightMenu}
        setRightMenu={setRightMenu}
      />
      <div className='mt-[117px] flex md:mt-[129px] xl:mt-[117px]'>
        {showSidebar && (
          <Sidebar
            view={sidebarView}
            isOpen={isSidebarOpen}
            onClose={closeSidebar}
          />
        )}
        <main className='scrollbar-hide min-w-0 flex-1'>
          <Outlet />
        </main>
      </div>
      <Footer onMenuClick={() => setRightMenu(true)} />
    </>
  );
}

export default MainLayout;
