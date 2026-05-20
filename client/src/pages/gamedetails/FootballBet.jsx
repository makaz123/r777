import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSoccerBatingData } from '../../redux/reducer/soccerSlice';
import MatchOdds from './MatchOdds';
import Bookmaker from './Bookmaker';
import OverUnder_05 from './OverUnder_05';
import OverUnder_15 from './OverUnder_15';
import OverUnder_25 from './OverUnder_25';
import OverUnder_35 from './OverUnder_35';
import MatchedBet from './MatchedBet';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';
import {
  createBet,
  createfancyBet,
  getPendingBetAmo,
  getPendingBet,
  messageClear,
} from '../../redux/reducer/betReducer';
import { toast } from 'react-toastify';
import { host } from '../../redux/api';
import { FaTv } from 'react-icons/fa6';
import axios from 'axios';
function FootballBet() {
  const { t } = useTranslation();
  const key_new = import.meta.env.VITE_LIVE_STREAM_KEY_NEW;
  const liveStreamBaseUrl =
    import.meta.env.VITE_LIVE_STREAM_BASE_URLL ||
    'https://test.bulkapi.co.in/api/v1';
  const params = useParams();
  const splat = params['*'];
  let game = '';
  let id = '';
  if (splat) {
    const parts = splat.split('/');
    id = parts[parts.length - 1];
    game = parts.slice(0, parts.length - 1).join('/');
  }
  const location = useLocation();
  const time = location.state?.time;
  const gameid = id;
  const match = game;
  const dispatch = useDispatch();

  const [bettingData, setBettingData] = useState(null);
  const hasCheckedRef = useRef(false);
  const navigate = useNavigate();
  const { loading, successMessage, errorMessage, pendingBetAmounts } =
    useSelector((state) => state.bet);
  const { battingData } = useSelector((state) => state.soccer);
  const { userInfo } = useSelector((state) => state.auth);
  const sharedSocketRef = useRef(null);
  const [showodds, setshowodds] = useState(true);
  const [selectedBet, setSelectedBet] = useState(null);
  const [showLive, setShowLive] = useState(false);
  const [showlivetv, setshowlivetv] = useState(false);
  const [isScoreCardAvailable, setIsScoreCardAvailable] = useState(true);
  const [isCheckingScoreCard, setIsCheckingScoreCard] = useState(false);
  const [liveStreamUrl, setLiveStreamUrl] = useState('');
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  // Extract team names from match title
  const matchTitle = 'Paarl Royals v Joburg Super Kings';
  const teams = matchTitle.split(' v ');
  const team1 = teams[0] || 'Team 1';
  const team2 = teams[1] || 'Team 2';
  console.log(showodds);

  const handleBetSelect = (betData) => {
    setSelectedBet(betData);
  };

  const handleBetChange = (updatedBet) => {
    setSelectedBet(updatedBet);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setshowodds(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!gameid) return;
    const sharedSocket = sharedSocketRef.current;
    if (!sharedSocket || sharedSocket.readyState !== 1) {
      sharedSocketRef.current = new WebSocket(host);
      sharedSocketRef.current.onopen = () => {
        console.log('✅ Socket connected');
        sharedSocketRef.current.send(
          JSON.stringify({
            type: 'subscribe',
            gameid,
            apitype: 'soccer',
            userId: userInfo?._id,
          })
        );
      };
      sharedSocketRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.gameid === gameid) {
            setBettingData(message.data);
          }
        } catch (e) {
          console.error('❌ Message error', e);
        }
      };
      sharedSocketRef.current.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
      sharedSocketRef.current.onclose = () => {
        console.log('Socket closed');
      };
    } else {
      // Already connected, just send subscription
      sharedSocketRef.current.send(
        JSON.stringify({
          type: 'subscribe',
          gameid,
          apitype: 'soccer',
          userId: userInfo?._id,
        })
      );
    }
    return () => {
      // Optionally leave socket open for reuse
    };
  }, [gameid, userInfo?._id]);

  useEffect(() => {
    if (gameid) {
      dispatch(fetchSoccerBatingData(gameid)); // initial
    }
  }, [gameid, dispatch]);
  useEffect(() => {
    setBettingData(battingData);
  }, [battingData]);

  const matchOddsList =
    bettingData?.filter((item) => item.mname === 'MATCH_ODDS') || [];

  const matcUnder5List =
    bettingData?.filter((item) => item.mname === 'OVER_UNDER_05') || [];

  const matcUnder15List =
    bettingData?.filter((item) => item.mname === 'OVER_UNDER_15') || [];

  const matcUnder25List =
    bettingData?.filter((item) => item.mname === 'OVER_UNDER_25') || [];

  const matcUnder35List =
    bettingData?.filter((item) => item.mname === 'OVER_UNDER_35') || [];

  useEffect(() => {
    if (!gameid) return;
    if (!localStorage.getItem('auth')) return;
    dispatch(getPendingBetAmo(gameid));
    dispatch(getPendingBet(gameid));
  }, [dispatch, gameid]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
      dispatch(messageClear());
      setSelectedBet(null);
      if (gameid) {
        dispatch(getPendingBetAmo(gameid));
        dispatch(getPendingBet(gameid));
      }
    }
    if (errorMessage) {
      toast.error(errorMessage);
      dispatch(messageClear());
    }
  }, [successMessage, errorMessage, dispatch, gameid]);

  const checkscorecardavailability = async () => {
    if (!gameid) return;
    setIsCheckingScoreCard(true);
    try {
      const response = await axios.get(
        `${liveStreamBaseUrl}/live-scorecard?key=${key_new}&gmid=${gameid}&sportid=1`
      );
      const html = String(response?.data || '').toLowerCase();
      const isUnavailable =
        html.includes('live score not available') ||
        html.includes('alt="live score not available"');
      setIsScoreCardAvailable(!isUnavailable);
    } catch (error) {
      console.error('error in checking score card availability', error);
      setIsScoreCardAvailable(false);
    } finally {
      setIsCheckingScoreCard(false);
    }
  };

  useEffect(() => {
    checkscorecardavailability();
  }, [gameid]);

  useEffect(() => {
    const fetchLiveStreamUrl = async () => {
      if (!gameid || !key_new) return;

      setIsLoadingStream(true);
      try {
        const response = await axios.get(`${liveStreamBaseUrl}/live-stream`, {
          params: {
            key: key_new,
            gmid: gameid,
          },
        });

        if (response?.data?.url) {
          setLiveStreamUrl(response.data.url);
        } else if (response?.data?.data?.url) {
          setLiveStreamUrl(response.data.data.url);
        } else if (typeof response?.data === 'string') {
          setLiveStreamUrl(response.data);
        }
      } catch (error) {
        console.error('Error fetching live stream URL:', error);
        setLiveStreamUrl(
          `${liveStreamBaseUrl}/live-stream?gmid=${gameid}&key=${key_new}`
        );
      } finally {
        setIsLoadingStream(false);
      }
    };

    fetchLiveStreamUrl();
  }, [gameid, key_new, liveStreamBaseUrl]);

  return (
    <div className='flex gap-px'>
      <div className='ml-0 w-full md:ml-1 lg:w-[calc(100%-352px)]'>
        <div className='flex items-center justify-between bg-[#18adc5] p-1 text-[12px] font-bold text-white lg:text-[15px]'>
          <span>{game}</span>
          <span>{time}</span>
        </div>
        {userInfo?.account !== 'demo' && (
          <>
            <div className='flex cursor-pointer items-center justify-between bg-[#18adc5] p-1 text-[15px] text-white md:hidden'>
              <span className='font-bold'>{t('live_tv', 'Live TV')}</span>
              {/* Toggle */}
              <div
                className={`flex h-[14px] w-[24px] rounded-full p-0.5 transition-all duration-300 ${showlivetv ? 'justify-end bg-green-700' : 'justify-start bg-red-500'}`}
                onClick={() => setshowlivetv((prev) => !prev)}
              >
                <span
                  className={`block h-[10px] w-[10px] rounded-full bg-white transition-all duration-300 ${showlivetv ? 'bg-gray-400' : 'bg-white'}`}
                ></span>
              </div>
            </div>
            {showlivetv && (
              <div className='block w-full md:hidden'>
                {isLoadingStream ? (
                  <div className='flex h-[50vh] w-full items-center justify-center bg-gray-200'>
                    <span>{t('loading', 'Loading stream...')}</span>
                  </div>
                ) : (
                  <iframe
                    src={
                      liveStreamUrl ||
                      `${liveStreamBaseUrl}/live-stream?gmid=${gameid}&key=${key_new}`
                    }
                    title='Watch Live'
                    className='w-full'
                    style={{ height: '50vh' }}
                    allowFullScreen
                    loading='lazy'
                    allow='
                  autoplay;
                  encrypted-media;
                  fullscreen;
                  picture-in-picture;
                  accelerometer;
                  gyroscope
                '
                  />
                )}
              </div>
            )}
            {!showLive && !isCheckingScoreCard && isScoreCardAvailable && (
              <iframe
                // src={`https://score.akamaized.uk/diamond-live-score?gmid=${gameid}`}
                src={`https://tvnew.diamondcricketid.com/getiframe?eventid=${gameid}&sportid=1`}
                allowFullScreen
                className='w-full'
                title='Live Score'
                allow='
                      autoplay;
                      encrypted-media;
                      fullscreen;
                      picture-in-picture;
                      accelerometer;
                      gyroscope
                    '
              />
            )}
          </>
        )}

        <div className='flex items-center justify-around bg-[#343a40] text-[12px] font-bold text-gray-400 lg:hidden'>
          <div
            className={`flex w-full items-center justify-center p-2 ${showodds ? 'bg-gradient-to-b from-[#5ecbdd] to-[#146578] text-white' : ''}`}
            onClick={() => {
              setshowodds(true);
              setShowLive(false);
            }}
          >
            {t('market', 'Market')}
          </div>
          <div
            className={`flex w-full items-center justify-center p-2 ${showodds ? '' : 'bg-gradient-to-b from-[#5ecbdd] to-[#146578] text-white'}`}
            onClick={() => setshowodds(false)}
          >
            {' '}
            {t('open_bets', 'Open Bets')}
          </div>
        </div>

        {!showodds && (
          <div className='block lg:hidden'>
            <MatchedBet gameid={gameid} />
          </div>
        )}

        {/** Match Odds */}
        {matchOddsList.length > 0 && (
          <MatchOdds
            gameid={gameid}
            onBetSelect={handleBetSelect}
            matchOddsList={matchOddsList}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Soccer Game'
            sid={1}
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

        {matcUnder5List.length > 0 && (
          <OverUnder_05
            onBetSelect={handleBetSelect}
            matcUnder5List={matcUnder5List}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            gameid={gameid}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Soccer Game'
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

        {/** Over Under 1.5 */}
        {matcUnder15List.length > 0 && (
          <OverUnder_15
            onBetSelect={handleBetSelect}
            matcUnder15List={matcUnder15List}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            gameid={gameid}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Soccer Game'
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

        {/** Over Under 2.5 */}
        {matcUnder25List.length > 0 && (
          <OverUnder_25
            onBetSelect={handleBetSelect}
            matcUnder25List={matcUnder25List}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            gameid={gameid}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Soccer Game'
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

        {/** Over Under 3.5 */}
        {matcUnder35List.length > 0 && (
          <OverUnder_35
            onBetSelect={handleBetSelect}
            matcUnder35List={matcUnder35List}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            gameid={gameid}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Soccer Game'
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}
      </div>

      <div className='sticky top-0 hidden h-fit lg:block'>
        <div className='w-[350px]'>
          <div className='mb-1'>
            <div className='flex cursor-pointer items-center justify-between bg-[#18adc5] p-1 text-[15px] text-white'>
              <span className='font-bold'>{t('live_tv', 'Live TV')}</span>
              {/* Toggle */}
              <div
                className={`flex h-[14px] w-[24px] rounded-full p-0.5 transition-all duration-300 ${showlivetv ? 'justify-end bg-green-700' : 'justify-start bg-red-500'}`}
                onClick={() => setshowlivetv((prev) => !prev)}
              >
                <span
                  className={`block h-[10px] w-[10px] rounded-full bg-white transition-all duration-300 ${showlivetv ? 'bg-gray-400' : 'bg-white'}`}
                ></span>
              </div>
            </div>
            {showlivetv && (
              <div className='w-full'>
                {isLoadingStream ? (
                  <div className='flex h-[50vh] w-full items-center justify-center bg-gray-200'>
                    <span>{t('loading', 'Loading stream...')}</span>
                  </div>
                ) : (
                  <iframe
                    src={
                      liveStreamUrl ||
                      `${liveStreamBaseUrl}/live-stream?gmid=${gameid}&key=${key_new}`
                    }
                    title='Watch Live'
                    className='w-full'
                    style={{ height: '50vh' }}
                    allowFullScreen
                    loading='lazy'
                    allow='
                      autoplay;
                      encrypted-media;
                      fullscreen;
                      picture-in-picture;
                      accelerometer;
                      gyroscope
                    '
                  />
                )}
              </div>
            )}
          </div>

          <div className='bg-gradient-to-b from-[#5ecbdd] to-[#146578] p-1 text-white'>
            <span className='text-[14px]'>
              {t('matched_bet', 'Matched Bet')}
            </span>
          </div>
          <MatchedBet gameid={gameid} />
        </div>
      </div>
    </div>
  );
}

export default FootballBet;
