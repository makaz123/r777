import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import api from '../redux/api';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

export default function BannerSlider({ pageType, defaultBanner }) {
  const [dynamicBanners, setDynamicBanners] = useState([]);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await api.get(`/banner?page=${pageType}`);
        if (
          response.data &&
          response.data.banners &&
          response.data.banners.length > 0
        ) {
          setDynamicBanners(response.data.banners.map((b) => b.imageUrl));
        }
      } catch (error) {
        console.error(
          `Failed to fetch dynamic banners for ${pageType}:`,
          error
        );
      }
    };
    fetchBanner();
  }, [pageType]);

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

  const bannersToDisplay =
    dynamicBanners.length > 0
      ? dynamicBanners
      : Array.isArray(defaultBanner)
        ? defaultBanner
        : [defaultBanner];

  return (
    <div className='w-full min-w-0 overflow-hidden'>
      <Slider {...bannerSetting}>
        {bannersToDisplay.map((item, i) => (
          <img
            key={i}
            src={item}
            alt={`${pageType} banner`}
            className='block h-auto w-full'
          />
        ))}
      </Slider>
    </div>
  );
}
