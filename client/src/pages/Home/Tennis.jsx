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
    className={`mx-[1px] my-[2px] flex h-6 items-center justify-center rounded-sm text-sm font-semibold ${type === 'back' ? 'bg-[#72bbef]' : 'bg-[#faa9ba]'}`}
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
  const deactivatedMatches = useSelector((state) => state.auth?.deactivatedMatches || []);

  console.log('tennis matches', matches);
  useEffect(() => {
    dispatch(fetchTennisData());
  }, [dispatch]);

  useEffect(() => {
    if (!onInplayCountChange) return;
    const count = Array.isArray(matches)
      ? matches.filter((m) => m.inplay && !deactivatedMatches.includes(String(m.id)) && !deactivatedMatches.includes(String(m.title))).length
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
          <div className='hidden grid-cols-[1fr_55px_55px_55px_55px_55px_55px] border border-b-0 border-gray-300 bg-gray-100 font-bold md:grid'>
            <div className='px-2 py-2'></div>
            <div className='col-span-2 text-center'>1</div>
            <div className='col-span-2 text-center'>X</div>
            <div className='col-span-2 text-center'>2</div>
          </div>

          {visibleMatches.map((m) => (
            <div key={m.id} className='border border-t-0 border-gray-300'>
              {/* ================= DESKTOP VIEW ================= */}
              <div
                className='hidden cursor-pointer grid-cols-[1fr_55px_55px_55px_55px_55px_55px] hover:bg-gray-50 md:grid'
                onClick={() =>
                  navigate(`/tennis-bet/${m.game}/${m.id}`, {
                    state: { time: m.time },
                  })
                }
              >
                <div className='flex items-center justify-between gap-2 px-2'>
                  <div className='flex items-center gap-1'>
                    {!showOnlyInplay && (
                      <div className='text-[14px] font-[400] text-[#333]'>
                        {m.time}
                      </div>
                    )}
                    {m.inplay && (
                      <FaCircle className='h-[14px] w-[14px] text-[#33c054]' />
                    )}
                    <div className='text-[14px] font-[400] text-[#333]'>
                      {m.game}
                    </div>
                  </div>
                  <div className='flex items-center gap-[2px]'>
                    {m.tv && <img src={tv} alt='tv' className='h-[17px]' />}
                    {m.bm && <img src={Bm} alt='Bm' className='h-[17px]' />}
                    {m.f && <img src={F} alt='F' className='h-[17px]' />}
                  </div>
                </div>

                <Cell value={m.one.back} type='back' />
                <Cell value={m.one.lay} type='lay' />

                <Cell value={m.x.back} type='back' />
                <Cell value={m.x.lay} type='lay' />

                <Cell value={m.two.back} type='back' />
                <Cell value={m.two.lay} type='lay' />
              </div>

              {/* ================= MOBILE VIEW ================= */}
              <div
                className='space-y-2 bg-white p-2 md:hidden'
                onClick={() =>
                  navigate(`/tennis-bet/${m.game}/${m.id}`, {
                    state: { time: m.time },
                  })
                }
              >
                {/* Game info */}
                <div className='flex items-center justify-between gap-2'>
                  <div>
                    <div className='text-[14px] font-bold text-[#333]'>
                      {m.game}
                    </div>
                    {!showOnlyInplay && (
                      <div className='text-[14px] font-[400] text-[#333]'>
                        {m.time}
                      </div>
                    )}
                  </div>
                  <div className='flex items-center gap-2'>
                    {m.inplay && (
                      <FaCircle className='h-[12px] w-[12px] text-[#28a745]' />
                    )}
                    {m.tv && <img src={tv} alt='tv' className='h-[17px]' />}
                    {m.bm && <img src={Bm} alt='Bm' className='h-[17px]' />}
                    {m.f && <img src={F} alt='F' className='h-[17px]' />}
                  </div>
                </div>

                {/* Odds */}
                <div className='grid grid-cols-3 gap-1'>
                  <div className='grid grid-cols-2 gap-1'>
                    <Cell value={m.one.back} type='back' />
                    <Cell value={m.one.lay} type='lay' />
                  </div>
                  <div className='grid grid-cols-2 gap-1'>
                    <Cell value={m.x.back} type='back' />
                    <Cell value={m.x.lay} type='lay' />
                  </div>
                  <div className='grid grid-cols-2 gap-1'>
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
            className='cursor-pointer px-2 text-[14px] font-semibold text-black hover:underline'
          >
            {t('view_more', 'View More...')}
          </button>
        </div>
      )}
    </div>
  );
}
