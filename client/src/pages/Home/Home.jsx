import React, { useState, useEffect } from 'react';
import MobileNav from '../../components/header/MobileNav';
import Cricket from './Cricket';
import Football from './Football';
import Tennis from './Tennis';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Slider from 'react-slick';
import api from '../../redux/api';

import bann1 from '../../assets/banner/bann1.jpg';
import bann2 from '../../assets/banner/bann2.jpg';
import bann3 from '../../assets/banner/bann3.jpg';
import bann4 from '../../assets/banner/bann4.jpg';
import bann5 from '../../assets/banner/bann5.jpg';
import bann6 from '../../assets/banner/bann6.jpg';
import bann7 from '../../assets/banner/bann7.jpg';
const defaultBanners = [bann1, bann2, bann3, bann4, bann5, bann6, bann7];

function Home() {
  const [dynamicBanners, setDynamicBanners] = useState([]);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await api.get('/banner');
        if (response.data && response.data.banners && response.data.banners.length > 0) {
          setDynamicBanners(response.data.banners.map(b => b.imageUrl));
        }
      } catch (error) {
        console.error('Failed to fetch dynamic banners:', error);
      }
    };
    fetchBanner();
  }, []);

  const bannerSetting = {
    dots: true,
    infinite: true,
    arrows: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
  };

  const bannersToDisplay = dynamicBanners.length > 0 ? dynamicBanners : defaultBanners;

  return (
    <div className='w-full min-w-0 overflow-hidden'>
      <Slider {...bannerSetting}>
        {bannersToDisplay.map((item, i) => (
          <img
            key={i}
            src={item}
            alt='banner'
            className='block h-fit w-full object-cover'
          />
        ))}
      </Slider>
      <Cricket previewLimit={5} viewMorePath='/cricket' showBanner={false} />
      <Football previewLimit={5} viewMorePath='/football' showBanner={false} />
      <Tennis previewLimit={5} viewMorePath='/tennis' showBanner={false} />
    </div>
  );
}

export default Home;
