import React, { useState } from 'react';
import MobileNav from '../../components/header/MobileNav';
import Cricket from './Cricket';
import Football from './Football';
import Tennis from './Tennis';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Slider from 'react-slick';
import bann1 from '../../assets/mainBanner/main-banner0.webp';
import bann2 from '../../assets/mainBanner/main-banner1.webp';
import bann3 from '../../assets/mainBanner/main-banner2.webp';
import bann4 from '../../assets/mainBanner/main-banner3.webp';
import bann5 from '../../assets/mainBanner/main-banner4.webp';
import bann6 from '../../assets/mainBanner/main-banner5.webp';
import pokergif from '../../assets/mainBanner/pokerGif.gif';
import casinogif from '../../assets/mainBanner/casinoGif.gif';
import bonus1 from '../../assets/mainBanner/bonus-1.webp';
import bonus2 from '../../assets/mainBanner/bonus-2.webp';
import bonus3 from '../../assets/mainBanner/bonus-3.webp';
import pgBanner from '../../assets/mainBanner/pg-banner.webp';

import brand1 from '../../assets/footerIcon/evolution.png';
import brand2 from '../../assets/footerIcon/ezugi2.png';
import brand3 from '../../assets/footerIcon/pragmatic-live.png';
import brand4 from '../../assets/footerIcon/betgames.png';
import brand5 from '../../assets/footerIcon/ssg.png';
import brand6 from '../../assets/footerIcon/betsoft.png';
import brand7 from '../../assets/footerIcon/spribe.png';
import brand8 from '../../assets/footerIcon/Evoplay.png';
import brand9 from '../../assets/footerIcon/logo-18plus.svg';
import LoginPopup from '../../components/auth/LoginPopup';

const banner = [bann1, bann2, bann3, bann4, bann5, bann6];
function Home() {
  const [showLoginPopup, setShowLoginPopup] = useState(false);
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
  return (
    <>
      <div className='w-full min-w-0 overflow-hidden'>
        <Slider {...bannerSetting}>
          {banner.map((item, i) => (
            <img
              key={i}
              src={item}
              alt='banner'
              className='block h-auto w-full'
            />
          ))}
        </Slider>
        <div className='p-1 md:p-1.5'>
          <div className='scrollbar-hide mb-1 flex gap-[5px] overflow-x-auto md:mb-2.5 md:grid md:grid-cols-3'>
            <img
              src={bonus1}
              alt=''
              className='w-[49%] flex-shrink-0 md:w-full'
              onClick={() => setShowLoginPopup(true)}
            />

            <img
              src={bonus2}
              alt=''
              className='w-[49%] flex-shrink-0 md:w-full'
              onClick={() => setShowLoginPopup(true)}
            />

            <img
              src={bonus3}
              alt=''
              className='w-[49%] flex-shrink-0 md:w-full'
              onClick={() => setShowLoginPopup(true)}
            />
          </div>

          <div className='mb-2.5 grid gap-1 md:grid-cols-2 md:gap-4'>
            <img src={casinogif} alt='' className='col-span-1 block w-full' />
            <img src={pokergif} alt='' className='col-span-1 block w-full' />
          </div>

          <Cricket
            previewLimit={3}
            viewMorePath='/cricket'
            showBanner={false}
          />
          <Football
            previewLimit={3}
            viewMorePath='/football'
            showBanner={false}
          />
          <Tennis previewLimit={3} viewMorePath='/tennis' showBanner={false} />

          <div className='my-2'>
            <img src={pgBanner} alt='' className='block w-full rounded-md' />
          </div>
        </div>
        <div className='bg-[#045662]'>
          <div className='flex flex-wrap justify-center'>
            <span className='m-2.5 flex h-auto w-[65px] items-center justify-center md:h-[50px] md:w-[110px]'>
              <img src={brand1} alt='' className='h-full object-contain' />
            </span>
            <span className='m-2.5 flex h-auto w-[65px] items-center justify-center md:h-[50px] md:w-[110px]'>
              <img src={brand2} alt='' className='h-full object-contain' />
            </span>
            <span className='m-2.5 flex h-auto w-[65px] items-center justify-center md:h-[50px] md:w-[110px]'>
              <img src={brand3} alt='' className='h-full object-contain' />
            </span>
            <span className='m-2.5 flex h-auto w-[65px] items-center justify-center md:h-[50px] md:w-[110px]'>
              <img src={brand4} alt='' className='h-full object-contain' />
            </span>
            <span className='m-2.5 flex h-auto w-[65px] items-center justify-center md:h-[50px] md:w-[110px]'>
              <img src={brand5} alt='' className='h-full object-contain' />
            </span>
            <span className='m-2.5 flex h-auto w-[65px] items-center justify-center md:h-[50px] md:w-[110px]'>
              <img src={brand6} alt='' className='h-full object-contain' />
            </span>
            <span className='m-2.5 flex h-auto w-[65px] items-center justify-center md:h-[50px] md:w-[110px]'>
              <img src={brand7} alt='' className='h-full object-contain' />
            </span>
            <span className='m-2.5 flex h-auto w-[65px] items-center justify-center md:h-[50px] md:w-[110px]'>
              <img src={brand8} alt='' className='h-full object-contain' />
            </span>
            <span className='m-2.5 h-auto w-[65px] items-center justify-center md:h-[50px] md:w-[110px]'>
              <img src={brand9} alt='' className='h-full object-contain' />
            </span>
          </div>
          <div className='px-5 pb-1 text-center text-[11px] font-bold text-white md:text-[13px]'>
            You must be over 18 years old, or the legal age at which gambling or
            gaming activities are allowed under the law or jurisdiction that
            applies to you. You must reside in a country in which access to
            online gambling to its residents.
          </div>
        </div>
      </div>
      <LoginPopup
        open={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
      />
    </>
  );
}

export default Home;
