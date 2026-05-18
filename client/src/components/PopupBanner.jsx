import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../redux/api';

export default function PopupBanner() {
  const { userInfo } = useSelector((state) => state.auth);
  const [show, setShow] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(null);

  useEffect(() => {
    // Only show if user is logged in
    if (!userInfo) return;

    // Check if we've already shown the popup this session
    const hasSeenPopup = sessionStorage.getItem('hasSeenPopup');
    if (hasSeenPopup) return;

    const fetchPopupBanner = async () => {
      try {
        const response = await api.get('/banner?page=popup');
        if (response.data && response.data.banners && response.data.banners.length > 0) {
          // just use the first banner for the popup
          setBannerUrl(response.data.banners[0].imageUrl);
          setShow(true);
          sessionStorage.setItem('hasSeenPopup', 'true');
        }
      } catch (error) {
        console.error('Failed to fetch popup banner:', error);
      }
    };
    
    fetchPopupBanner();
  }, [userInfo]);

  if (!show || !bannerUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={() => setShow(false)}
    >
      <div 
        className="relative max-w-4xl w-full mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => setShow(false)}
          className="absolute top-2 right-3 text-white hover:text-gray-300 transition font-bold text-3xl cursor-pointer z-10"
          aria-label="Close"
        >
          &times;
        </button>
        <img 
          src={bannerUrl} 
          alt="Promotional Popup" 
          className="w-full h-auto object-contain rounded-lg shadow-2xl max-h-[85vh] mx-auto" 
        />
      </div>
    </div>
  );
}
