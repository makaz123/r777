import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearJustLoggedIn } from '../redux/reducer/authReducer';
import api from '../redux/api';

export default function PopupBanner() {
  const dispatch = useDispatch();
  const { userInfo, justLoggedIn } = useSelector((state) => state.auth);
  const [show, setShow] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(null);

  useEffect(() => {
    // Only show if user just exactly logged in
    if (!userInfo || !justLoggedIn) return;

    const fetchPopupBanner = async () => {
      try {
        const response = await api.get('/banner?page=popup');
        if (
          response.data &&
          response.data.banners &&
          response.data.banners.length > 0
        ) {
          // just use the first banner for the popup
          setBannerUrl(response.data.banners[0].imageUrl);
          setShow(true);
        }
      } catch (error) {
        console.error('Failed to fetch popup banner:', error);
      } finally {
        // Clear the flag so it never shows again unless they log out and log back in
        dispatch(clearJustLoggedIn());
      }
    };

    fetchPopupBanner();
  }, [userInfo, justLoggedIn, dispatch]);

  if (!show || !bannerUrl) return null;

  return (
    <div
      className='fixed inset-0 z-[9999] flex items-center justify-center p-4'
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={() => setShow(false)}
    >
      <div
        className='relative mx-auto w-full max-w-4xl'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShow(false)}
          className='absolute top-2 right-3 z-10 cursor-pointer text-3xl font-bold text-white transition hover:text-gray-300'
          aria-label='Close'
        >
          &times;
        </button>
        <img
          src={bannerUrl}
          alt='Promotional Popup'
          className='mx-auto h-auto max-h-[85vh] w-full rounded-lg object-contain shadow-2xl'
        />
      </div>
    </div>
  );
}
