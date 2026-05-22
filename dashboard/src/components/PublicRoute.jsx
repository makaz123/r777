import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAdmin, user_reset } from '../redux/reducer/authReducer';
import RouteLoader from './RouteLoader';
import { hasValidSessionUser } from './PrivateRoute';

/** For /login — redirect to app when session is still valid. */
const PublicRoute = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);
  const [sessionReady, setSessionReady] = useState(false);
  const hasToken = Boolean(localStorage.getItem('auth'));
  const hasProfile = hasValidSessionUser(userInfo);

  useEffect(() => {
    if (!hasToken) {
      setSessionReady(true);
      return;
    }

    if (hasProfile) {
      setSessionReady(true);
      return;
    }

    let cancelled = false;
    setSessionReady(false);

    dispatch(getAdmin())
      .unwrap()
      .catch(() => {
        localStorage.removeItem('auth');
        dispatch(user_reset());
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, hasToken, hasProfile]);

  if (!hasToken) {
    return <Outlet />;
  }

  if (!sessionReady) {
    return <RouteLoader />;
  }

  if (hasValidSessionUser(userInfo)) {
    const fromPath = location.state?.from?.pathname;
    const redirectTo =
      fromPath && fromPath !== '/login' && fromPath !== '/'
        ? fromPath
        : '/home';
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
