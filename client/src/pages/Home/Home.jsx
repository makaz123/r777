import React from 'react';
import MobileNav from '../../components/header/MobileNav';
import Cricket from './Cricket';
import Football from './Football';
import Tennis from './Tennis';
import BannerSlider from '../../components/BannerSlider';

import bann1 from '../../assets/banner/bann1.jpg';
import bann2 from '../../assets/banner/bann2.jpg';
import bann3 from '../../assets/banner/bann3.jpg';
import bann4 from '../../assets/banner/bann4.jpg';
import bann5 from '../../assets/banner/bann5.jpg';
import bann6 from '../../assets/banner/bann6.jpg';
import bann7 from '../../assets/banner/bann7.jpg';
const defaultBanners = [bann1, bann2, bann3, bann4, bann5, bann6, bann7];

function Home() {
  return (
    <div className='w-full min-w-0 overflow-hidden'>
      <BannerSlider pageType="home" defaultBanner={defaultBanners} />
      <Cricket previewLimit={5} viewMorePath='/cricket' showBanner={false} />
      <Football previewLimit={5} viewMorePath='/football' showBanner={false} />
      <Tennis previewLimit={5} viewMorePath='/tennis' showBanner={false} />
    </div>
  );
}

export default Home;
