import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getAdmin, user_reset } from '../redux/reducer/authReducer';
import RouteLoader from './RouteLoader';
import api, { host } from '../redux/api';
import { updateReduxUserBalance } from '../redux/reducer/authReducer';

/** Full profile from API; JWT decode only has id/role/sessionToken. */
export const hasValidSessionUser = (user) =>
  Boolean(user && (user.userName || user._id || user.id));

const PrivateRoute = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);
  const [sessionReady, setSessionReady] = useState(false);

  const hasToken = Boolean(localStorage.getItem('auth'));
  const hasProfile = hasValidSessionUser(userInfo);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (err) => {
        if (
          err.response?.status === 401 &&
          err.response?.data?.code === 'SESSION_EXPIRED'
        ) {
          localStorage.removeItem('auth');
          dispatch(user_reset());
          navigate('/login', { replace: true });
        }
        return Promise.reject(err);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!hasToken) {
      setSessionReady(true);
      return;
    }

    if (hasProfile) {
      setSessionReady(true);
      dispatch(getAdmin());
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

  useEffect(() => {
    if (!sessionReady || !userInfo?._id) return;

    let ws = null;
    let wsUrl = host;
    // Fix ws:// or wss:// if host is just a path
    if (wsUrl === '/') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}`;
    }
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        ws.send(
          JSON.stringify({ type: 'register', userId: String(userInfo._id) })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'balance_update') {
            dispatch(updateReduxUserBalance({ userId: data.userId, newBalance: data.newBalance }));
          } else if (data.type === 'exposure_update') {
            dispatch(updateReduxUserBalance({ userId: data.userId, newExposure: data.newExposure }));
          } else if (
            data.type === 'user_refresh_needed' &&
            String(data.userId) === String(userInfo._id)
          ) {
            dispatch(getAdmin());
            window.dispatchEvent(new CustomEvent('account-summary-refresh'));
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (ws) ws.close();
    };
  }, [sessionReady, userInfo?._id, dispatch]);

  if (!hasToken) {
    return <Navigate to='/login' replace state={{ from: location }} />;
  }

  if (!sessionReady) {
    return <RouteLoader />;
  }

  if (!hasValidSessionUser(userInfo)) {
    return <Navigate to='/login' replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default PrivateRoute;
