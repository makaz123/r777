import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { getAdmin, userLogout } from '../redux/reducer/authReducer';
import Spinner from './Spinner';
import api from '../redux/api';

const PrivateRoute = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo, loading, error } = useSelector((state) => state.auth);

  const processedUserInfo = useMemo(() => {
    return userInfo ? userInfo : null;
  }, [userInfo]);

  const hasToken = useMemo(() => !!localStorage.getItem('auth'), []);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (err) => {
        if (
          err.response?.status === 401 &&
          err.response?.data?.code === 'SESSION_EXPIRED'
        ) {
          dispatch(userLogout());
          navigate('/login', { replace: true });
        }
        return Promise.reject(err);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!hasToken) {
      return;
    }
    if (!processedUserInfo && !loading) {
      dispatch(getAdmin());
    }
  }, [dispatch, hasToken, processedUserInfo, loading]);

  useEffect(() => {
    if (error && !loading) {
      localStorage.removeItem('auth');
      navigate('/login', { replace: true });
    }
  }, [error, loading, navigate]);

  if (!hasToken) {
    return <Navigate to='/login' replace />;
  }

  if (!processedUserInfo) {
    return loading ? <Spinner /> : <Navigate to='/login' replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
