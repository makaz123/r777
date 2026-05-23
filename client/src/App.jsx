import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchDeactivatedMatches } from './redux/reducer/authReducer';
import Login from './pages/auth/Login';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home/Home';
import Home2 from './pages/Home/Home2';
import Cricket from './pages/Home/Cricket';
import Football from './pages/Home/Football';
import Tennis from './pages/Home/Tennis';
import CricketBet from './pages/gamedetails/CricketBet';
import FootballBet from './pages/gamedetails/FootballBet';
import TennisBet from './pages/gamedetails/TennisBet';
import AccountStatement from './pages/other/AccountStatement';
import CurrentBets from './pages/other/CurrentBets';
import UnsettledBet from './pages/other/UnsettledBet';
import ProfitLoss from './pages/other/ProfitLoss';
import ActivityLog from './pages/other/ActivityLog';
import ChangePassword from './pages/other/ChangePassword';
import SetStake from './pages/other/SetStake';
import CasinoResults from './pages/other/CasinoResults';
import PrivateRoute from './redux/PrivateRoute';
import { ToastContainer } from 'react-toastify';
import CasinoList from './pages/Home/ourcasino/CasinoList';
import OurVipCasino from './pages/Home/ourvipcasino/CasinoList';
import OurVirtualCasino from './pages/Home/ourvirtual/CasinoList';
import OurPremCasino from './pages/Home/ourpremcasino/CasinoList';
import CasinoBet from './pages/CasinoBet/casinoBet';
import CasinoProvider from './pages/GgrCasino/CasinoProvider';
import Casino3 from './pages/GgrCasino/Casino3';
import LiveCasino from './pages/GgrCasino/LiveCasino';
import Inplay from './pages/Home/Inplay';
function HomeGate() {
  const userInfo = useSelector((state) => state.auth.userInfo);
  return userInfo ? <Home /> : <Home2 />;
}

function App() {
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    // Fetch deactivated matches/tournaments on app load
    dispatch(fetchDeactivatedMatches());
  }, [dispatch]);

  return (
    <>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route element={<MainLayout />}>
          <Route
            path='/:provider'
            element={<CasinoProvider key={location.pathname} />}
          />
          <Route path='/casino3' element={<Casino3 />} />
          <Route path='/livecasino' element={<LiveCasino />} />
          <Route path='/' element={<HomeGate />} />
          <Route path='inplay' element={<Inplay />} />
          <Route path='cricket' element={<Cricket />} />
          <Route path='football' element={<Football />} />
          <Route path='tennis' element={<Tennis />} />
          <Route path='cricket-bet/*' element={<CricketBet />} />
          <Route path='football-bet/*' element={<FootballBet />} />
          <Route path='tennis-bet/*' element={<TennisBet />} />
          <Route path='casino-bet/:match/:gameid' element={<CasinoBet />} />

          <Route element={<PrivateRoute />}>
            <Route path='account-statement' element={<AccountStatement />} />
            <Route path='bethistroy' element={<CurrentBets />} />
            <Route path='unsettled-bet' element={<UnsettledBet />} />
            <Route path='profit-loss' element={<ProfitLoss />} />
            <Route path='activity-log' element={<ActivityLog />} />
            <Route path='change-password' element={<ChangePassword />} />
            <Route path='set-stake' element={<SetStake />} />
            <Route path='casino-results' element={<CasinoResults />} />
            <Route path='casino-list' element={<CasinoList />} />
            <Route path='casino-list/:category' element={<CasinoList />} />
            <Route path='our-vip-casino' element={<OurVipCasino />} />
            <Route path='our-virtual-casino' element={<OurVirtualCasino />} />
            <Route path='our-prem-casino' element={<OurPremCasino />} />
          </Route>
        </Route>
      </Routes>
      <ToastContainer
        position='top-right'
        autoClose={800}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme='colored'
      />
    </>
  );
}

export default App;
