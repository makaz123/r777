import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTennisData } from '../../redux/reducer/tennisSlice';
import { FaCircle } from 'react-icons/fa';
import { GiTv } from 'react-icons/gi';
import Bm from '../../assets/bm-icon1.svg';
import F from '../../assets/fancy-icon1.svg';
import tv from '../../assets/tv.svg';
import banner from '../../assets/banner/Tennis-banner.jpg';
import BannerSlider from '../../components/BannerSlider';
import { useTranslation } from '../../context/LanguageContext';

const Cell = ({ value, type }) => (
  <div
    className={`flex w-[49%] mr-[1%] h-6 items-center justify-center rounded-sm text-sm font-semibold ${type === 'back' ? 'bg-[#72bbef]' : 'bg-[#faa9ba]'}`}
  >
    {value}
  </div>
);

export default function Tennis({
  previewLimit,
  viewMorePath = '/tennis',
  showBanner = true,
  showOnlyInplay = false,
  onInplayCountChange,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { matches, loader, error } = useSelector((state) => state.tennis);
  const deactivatedMatches = useSelector(
    (state) => state.auth?.deactivatedMatches || []
  );

  console.log('tennis matches', matches);
  useEffect(() => {
    dispatch(fetchTennisData());
  }, [dispatch]);

  useEffect(() => {
    if (!onInplayCountChange) return;
    const count = Array.isArray(matches)
      ? matches.filter(
          (m) =>
            m.inplay &&
            !deactivatedMatches.includes(String(m.id)) &&
            !deactivatedMatches.includes(String(m.title))
        ).length
      : 0;
    onInplayCountChange(count);
  }, [matches, deactivatedMatches, onInplayCountChange]);

  const activeMatches = Array.isArray(matches)
    ? matches.filter(
        (m) =>
          !deactivatedMatches.includes(String(m.id)) &&
          !deactivatedMatches.includes(String(m.title))
      )
    : [];

  const filteredMatches = showOnlyInplay
    ? activeMatches.filter((m) => m.inplay)
    : activeMatches;
  const visibleMatches =
    previewLimit != null && Array.isArray(filteredMatches)
      ? filteredMatches.slice(0, previewLimit)
      : filteredMatches;
  const hasMore =
    previewLimit != null &&
    Array.isArray(filteredMatches) &&
    filteredMatches.length > previewLimit;

  return (
    <div className='w-full text-sm text-gray-900'>
      {/* DESKTOP HEADER */}
      {showBanner && <BannerSlider pageType='tennis' defaultBanner={banner} />}
      <div className='mt-2 flex h-[28px] items-center bg-[#18adc5] pl-[7px] font-bold text-white'>
        {t('tennis', 'Tennis')}
      </div>

      {/* ROWS */}
      {visibleMatches?.length > 0 ? (
        <>
          <div className='hidden font-bold md:flex my-[2px]'>
            <div className='px-2 py-2 w-[63%]'></div>
            <div className='col-span-2 text-center w-[12%]'>1</div>
            <div className='col-span-2 text-center w-[12%]'>x</div>
            <div className='col-span-2 text-center w-[12%]'>2</div>
          </div>

          {visibleMatches.map((m) => (
            <div key={m.id} className='border-y border-gray-300'>
              {/* ================= DESKTOP VIEW ================= */}
              <div
                className='hidden cursor-pointer hover:bg-gray-50 md:flex'
                onClick={() =>
                  navigate(`/tennis-bet/${m.game}/${m.id}`, {
                    state: { time: m.time },
                  })
                }
              >
                <div className='flex items-center justify-between pl-1.5 pr-1 w-[63%]'>
                  <div className='flex items-center gap-1 text-[14px] font-semibold'>
                    {!showOnlyInplay && (
                      <>
                        <div className='text-[#333]'>
                          {m.time}
                        </div>
                        <span>
                          |
                        </span>
                      </>
                    )}
                    {m.inplay && (
                      <FaCircle className='h-[12px] w-[12px] text-[#33c054]' />
                    )}
                    <div className='text-[#333]'>
                      {m.game}
                    </div>
                  </div>
                  <div className='flex items-center gap-[2px]'>
                    {m.tv && <img src={tv} alt='tv' className='h-[17px]' />}
                    {m.bm && <img src={Bm} alt='Bm' className='h-[17px]' />}
                    {m.f && <img src={F} alt='F' className='h-[17px]' />}
                  </div>
                </div>

                <div className='w-[12%] flex py-[2px] px-[1px]'>
                  <Cell value={m.one.back} type='back' />
                  <Cell value={m.one.lay} type='lay' />
                </div>
                <div className='w-[12%] flex py-[2px] px-[1px]'>
                  <Cell value={m.x.back} type='back' />
                  <Cell value={m.x.lay} type='lay' />
                </div>
                <div className='w-[12%] flex py-[2px] px-[1px]'>
                  <Cell value={m.two.back} type='back' />
                  <Cell value={m.two.lay} type='lay' />
                </div>
                <div className='w-[1%]'></div>
              </div>

              {/* ================= MOBILE VIEW ================= */}
              <div className='space-y-2 bg-white p-1 md:hidden'>
                {/* Game info */}
                <div className='mb-0 flex items-start justify-between gap-2'
                  onClick={() =>
                    navigate(`/tennis-bet/${m.game}/${m.id}`, {
                      state: { time: m.time },
                    })
                  }
                >
                  <div>
                    <div className='text-[14px] font-bold'>
                      {m.game}
                    </div>
                    {!showOnlyInplay && (
                      <div className='text-[14px] font-[400] text-[#545454] py-1'>
                        {m.time}
                      </div>
                    )}
                  </div>
                  <div className='flex items-center gap-[1px] pt-1'>
                    {m.inplay && (
                      <FaCircle className='h-[12px] w-[12px] text-[#28a745]' />
                    )}
                    {m.tv && <img src={tv} alt='tv' className='h-[14px]' />}
                    {m.bm && <img src={Bm} alt='Bm' className='h-[14px]' />}
                    {m.f && <img src={F} alt='F' className='h-[14px]' />}
                  </div>
                </div>

                {/* Odds */}
                <div
                  className='flex gap-[2px]'
                  onClick={() =>
                    navigate(`/tennis-bet/${m.game}/${m.id}`, {
                      state: { time: m.time },
                    })
                  }
                >
                  <div className='flex w-[100%]'>
                    <Cell value={m.one.back} type='back' />
                    <Cell value={m.one.lay} type='lay' />
                  </div>
                  <div className='flex w-[100%]'>
                    <Cell value={m.x.back} type='back' />
                    <Cell value={m.x.lay} type='lay' />
                  </div>
                  <div className='flex w-[100%]'>
                    <Cell value={m.two.back} type='back' />
                    <Cell value={m.two.lay} type='lay' />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className='border border-gray-300 bg-white p-1 text-[14px] font-bold text-black'>
          {t('no_live_events_txt', 'has no live event.')}
        </div>
      )}

      {hasMore && (
        <div className='flex justify-end border border-t-0 border-gray-300 bg-white py-1'>
          <button
            type='button'
            onClick={() => navigate(viewMorePath)}
            className='cursor-pointer px-2 text-[14px] md:font-semibold text-black hover:underline'
          >
            {t('view_more', 'View More...')}
          </button>
        </div>
      )}
    </div>
  );
}
