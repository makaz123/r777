import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {
  createBet,
  getPendingBetAmo,
  messageClear,
} from '../../redux/reducer/betReducer';
import { getUser } from '../../redux/reducer/authReducer';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { fetchTannisBatingData } from '../../redux/reducer/tennisSlice';
import { getPendingBet } from '../../redux/reducer/betReducer';
import MatchOdds from './MatchOdds';
import Bookmaker from './Bookmaker';
import MatchedBet from './MatchedBet';
import { host } from '../../redux/api';
import { FaTv } from 'react-icons/fa6';
import axios from 'axios';
function TennisBet() {
  const key_new = import.meta.env.VITE_LIVE_STREAM_KEY_NEW;
  const liveStreamBaseUrl =
    import.meta.env.VITE_LIVE_STREAM_BASE_URLL ||
    'https://test.bulkapi.co.in/api/v1';
  const { game, id } = useParams();
  const location = useLocation();
  const time = location.state?.time;
  const gameid = id;
  const match = game;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [bettingData, setBettingData] = useState(null);
  const hasCheckedRef = useRef(false);
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
  const { loading, successMessage, errorMessage, pendingBetAmounts } =
    useSelector((state) => state.bet);
  const { battingData } = useSelector((state) => state.tennis);
  const { userInfo } = useSelector((state) => state.auth);
  const sharedSocketRef = useRef(null);

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
            apitype: 'tennis',
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
          apitype: 'tennis',
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
      console.log('The gameId is', gameid);
      dispatch(fetchTannisBatingData(gameid)); // initial
    }
  }, [gameid, dispatch]);

  useEffect(() => {
    setBettingData(battingData);
  }, [battingData]);
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
        `${liveStreamBaseUrl}/live-scorecard?key=${key_new}&gmid=${gameid}&sportid=2`
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

  const matchOddsList = Array.isArray(bettingData)
    ? bettingData.filter((item) => item.mname === 'MATCH_ODDS')
    : [];

  console.log('this is matchOddsList', matchOddsList);

  console.log('bettingData', bettingData);

  return (
    <div className='flex gap-px'>
      <div className='ml-0 w-full md:ml-1 lg:w-[calc(100%-352px)]'>
        <div className='flex items-center justify-between bg-[#18adc5] p-1 text-[12px] font-bold text-white lg:text-[15px]'>
          <span>{game}</span>
          <span>{time}</span>
        </div>
        {userInfo?.account !== 'demo' && (
          <>
          <div className='flex md:hidden cursor-pointer items-center justify-between bg-[#18adc5] p-1 text-[15px] text-white'>
            <span className='font-bold'>Live TV</span>
            {/* Toggle */}
            <div className={`flex h-[14px] w-[24px] rounded-full p-0.5 transition-all duration-300 ${showlivetv ? 'justify-end bg-green-700' : 'justify-start bg-red-500'}`}
              onClick={() => setshowlivetv((prev) => !prev)}>
              <span className={`block h-[10px] w-[10px] rounded-full bg-white transition-all duration-300 ${showlivetv ? 'bg-gray-400' : 'bg-white'}`}></span>
            </div>
          </div>
          {showlivetv && (
            <div className='w-full block md:hidden'>
              {isLoadingStream ? (
                <div className='flex h-[50vh] w-full items-center justify-center bg-gray-200'>
                  <span>Loading stream...</span>
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
              src={`${liveStreamBaseUrl}/live-score?key=${key_new}&gmid=${gameid}`}
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

        <div className='flex items-center justify-around  text-[12px] font-bold lg:hidden bg-[#343a40] text-gray-400'>
          <div className={`flex w-full items-center justify-center  p-2 ${showodds ? 'bg-gradient-to-b from-[#5ecbdd] to-[#146578] text-white' : ''}`}
            onClick={() => {
              setshowodds(true);
              setShowLive(false);
            }}
          >
            Market
          </div>
          <div className={`flex w-full items-center justify-center p-2 ${showodds ? '' : 'bg-gradient-to-b from-[#5ecbdd] to-[#146578] text-white'}`}
            onClick={() => setshowodds(false)}
          > Open Bets
          </div>
        </div>

        {!showodds  && (
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
            gameName='Tennis Game'
            sid={2}
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

      </div>
      <div className='sticky top-0 hidden h-fit lg:block'>
        <div className='w-[350px]'>
          <div className='mb-1'>
            <div className='flex cursor-pointer items-center justify-between bg-[#18adc5] p-1 text-[15px] text-white'>
              <span className='font-bold'>Live TV</span>
              {/* Toggle */}
              <div className={`flex h-[14px] w-[24px] rounded-full p-0.5 transition-all duration-300 ${showlivetv ? 'justify-end bg-green-700' : 'justify-start bg-red-500'}`}
                onClick={() => setshowlivetv((prev) => !prev)}>
                <span className={`block h-[10px] w-[10px] rounded-full bg-white transition-all duration-300 ${showlivetv ? 'bg-gray-400' : 'bg-white'}`}></span>
              </div>
            </div>
            {showlivetv && (
              <div className='w-full'>
                {isLoadingStream ? (
                  <div className='flex h-[50vh] w-full items-center justify-center bg-gray-200'>
                    <span>Loading stream...</span>
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
            <span className='text-[14px]'>Matched Bet</span>
          </div>
          <MatchedBet gameid={gameid} />
        </div>
      </div>
    </div>
  );
}

export default TennisBet;
