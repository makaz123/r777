import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getUser } from '../redux/reducer/authReducer';

/**
 * Refetch user profile when the tab regains focus so lock/unlock changes apply
 * without a full page reload (also complements WebSocket user_refresh_needed).
 */
export function useUserLockSync(enabled = true) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!enabled || !localStorage.getItem('auth')) return;

    const refresh = () => {
      dispatch(getUser());
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [dispatch, enabled]);
}
