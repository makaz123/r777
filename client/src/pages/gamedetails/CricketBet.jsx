import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchCricketBatingData } from '../../redux/reducer/cricketSlice';
import MatchOdds from './MatchOdds';
import Bookmaker from './Bookmaker';
import TiedMatch from './TiedMatch';
import Normal from './Normal';
import Fancy1 from './Fancy1';
import Khado from './Khado';
import OddEven from './OddEven';
import MatchedBet from './MatchedBet';
import { useTranslation } from '../../context/LanguageContext';

import { getUser } from '../../redux/reducer/authReducer';
import { useDispatch, useSelector } from 'react-redux';
import { FaTv } from 'react-icons/fa6';
import axios from 'axios';
import {
  createBet,
  createfancyBet,
  getPendingBet,
  getPendingBetAmo,
  messageClear,
} from '../../redux/reducer/betReducer';
import { toast } from 'react-toastify';
import { host } from '../../redux/api';
import LiveTv from './LiveTv';
import LiveScore from './LiveScore';
function CricketBet() {
  const { t } = useTranslation();
  const key = import.meta.env.VITE_LIVE_STREAM_KEY;
  const key_new = import.meta.env.VITE_LIVE_STREAM_KEY_NEW;
  const liveStreamBaseUrl =
    import.meta.env.VITE_LIVE_STREAM_BASE_URL || 'https://81habibi.com/api/v1';
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
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [bettingData, setBettingData] = useState(null);
  const [betOdds, setBetOdds] = useState(null);
  const [betAmount, setBetAmount] = useState(0);
  const [loader, setLoader] = useState(false);
  const [showodds, setshowodds] = useState(true);
  const [selectedBet, setSelectedBet] = useState(null);
  const { battingData } = useSelector((state) => state.cricket);
  const { pendingBetAmounts, successMessage, errorMessage } = useSelector(
    (state) => state.bet
  );
  const { userInfo } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    gameId: gameid,
    sid: 4,
    otype: '',
    price: null,
    xValue: '',
    gameType: '',
    gameName: 'Cricket Game',
    teamName: '',
  });
  const [activeSubTab, setActiveSubTab] = useState('Normal');
  const [item, setitem] = useState(null);
  const [showLive, setShowLive] = useState(false);
  const [showlivetv, setshowlivetv] = useState(false);
  const [isScoreCardAvailable, setIsScoreCardAvailable] = useState(true);
  const [isCheckingScoreCard, setIsCheckingScoreCard] = useState(false);
  const [liveStreamUrl, setLiveStreamUrl] = useState('');
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const streamGmid =
    (Array.isArray(bettingData)
      ? bettingData.find((item) => item?.gmid)?.gmid
      : bettingData?.gmid) || gameid;

  const subTabs = [
    { id: 'Normal', name: 'ALL' },
    { id: 'Fancy', name: 'Fancy' },
    { id: 'line', name: 'Line Markets' },
    { id: 'ball', name: 'Ball by Ball' },
    { id: 'meter', name: 'Meter Markets' },
    { id: 'khado', name: 'Khado Markets' },
  ];
  // Extract team names from match title
  const matchTitle = decodeURIComponent(game || 'Team 1 v Team 2');
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

  // ✅ Fetch once before using socket (optional)
  useEffect(() => {
    if (gameid) {
      setLoader(true);
      dispatch(fetchCricketBatingData(gameid)).finally(() => {
        setLoader(false);
      });
    }
  }, [dispatch, gameid]);

  useEffect(() => {
    if (!gameid) return;
    const socket = new WebSocket(host);
    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: 'subscribe',
          gameid,
          apitype: 'cricket',
          userId: userInfo?._id,
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.gameid === gameid) {
          setBettingData(message.data);
        }
      } catch (err) {
        console.error('❌ Error parsing message:', err);
      }
    };

    socket.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
    };

    socket.onclose = () => {
      console.log('❌ WebSocket disconnected');
    };

    return () => socket.close();
  }, [gameid, userInfo?._id]);

  useEffect(() => {
    let intervalId;

    if (gameid) {
      setLoader(true);

      const fetchData = async () => {
        await dispatch(fetchCricketBatingData(gameid));
        setLoader(false);
      };
      fetchData();
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [gameid, dispatch]);

  useEffect(() => {
    setBettingData(battingData);
  }, [battingData]);

  useEffect(() => {
    if (!localStorage.getItem('auth')) return;
    dispatch(getUser());
  }, [dispatch]);

  useEffect(() => {
    if (!gameid) return;
    if (!localStorage.getItem('auth')) return;
    dispatch(getPendingBetAmo(gameid));
    dispatch(getPendingBet(gameid));
  }, [dispatch, gameid]);

  // Show toast messages for success/error (centralized to prevent duplicates)
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
      // const response = await axios.get(
      //   `https://score.akamaized.uk/diamond-live-score?gmid=${gameid}`
      // );
      const response = await axios.get(
        `${liveStreamBaseUrl}/live-score?key=${key_new}&gmid=${gameid}`
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

  // Fetch live stream URL from API
  useEffect(() => {
    const fetchLiveStreamUrl = async () => {
      if (!streamGmid || !key_new) return;

      setIsLoadingStream(true);
      try {
        const response = await axios.get(`${liveStreamBaseUrl}/live-stream`, {
          params: {
            key: key_new,
            gmid: streamGmid,
          },
        });

        // Extract URL from response - adjust based on actual API response structure
        if (response?.data?.url) {
          setLiveStreamUrl(response.data.url);
        } else if (response?.data?.data?.url) {
          setLiveStreamUrl(response.data.data.url);
        } else if (typeof response?.data === 'string') {
          setLiveStreamUrl(response.data);
        }
      } catch (error) {
        console.error('Error fetching live stream URL:', error);
        // Fallback to default URL if API fails
        setLiveStreamUrl(
          `${liveStreamBaseUrl}/live-stream?gmid=${streamGmid}&key=${key_new}`
        );
      } finally {
        setIsLoadingStream(false);
      }
    };

    fetchLiveStreamUrl();
  }, [streamGmid, key_new, liveStreamBaseUrl]);

  console.log('bettting data', bettingData);

  const matchOddsList = Array.isArray(bettingData)
    ? bettingData.filter(
        (item) =>
          item?.mname === 'MATCH_ODDS' || item?.mname === 'TOURNAMENT_WINNER'
      )
    : [];

  console.log('matchodds from cricketbet', matchOddsList);

  const tiedMatchList = Array.isArray(bettingData)
    ? bettingData.filter(
        (item) =>
          item?.mname === 'Tied Match' || item?.mname === 'Bookmaker IPL CUP'
      )
    : [];

  const newtiedMatchList = Array.isArray(bettingData)
    ? bettingData.filter((item) => item?.mname === 'TIED_MATCH')
    : [];

  const BookmakerList = Array.isArray(bettingData)
    ? bettingData.filter((item) => item.mname === 'Bookmaker')
    : [];

  const fancy1List = bettingData?.filter((item) => item.mname === 'fancy1');

  const fancy1Data =
    Array.isArray(fancy1List) && fancy1List.length > 0 && fancy1List[0].section
      ? fancy1List[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          max: sec.max,
          min: sec.min,
          mname: fancy1List[0].mname, // ✅ Access from first item
          status: fancy1List[0].status, // ✅ Access from first item
        }))
      : [];

  console.log('fancy1Data from cricketbet', fancy1Data);

  const NormalList = bettingData?.filter((item) => item.mname === 'Normal');
  const NormalData =
    Array.isArray(NormalList) && NormalList.length > 0 && NormalList[0].section
      ? NormalList[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          max: sec.max,
          min: sec.min,
          mname: NormalList[0].mname, // ✅ Access from first item
          status: sec.gstatus, // ✅ Access from first item
        }))
      : [];

  console.log('NormalData from cricketbet', NormalList);

  const khadoList = bettingData?.filter((item) => item.mname === 'khado');
  const khadoData =
    Array.isArray(khadoList) && khadoList.length > 0 && khadoList[0].section
      ? khadoList[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          max: sec.max,
          min: sec.min,
          mname: khadoList[0].mname, // ✅ Access from first item
          status: sec.gstatus, // ✅ Access from first item
        }))
      : [];

  console.log('khadoData from cricketbet', khadoData);

  const oddEvenList = bettingData?.filter((item) => item.mname === 'oddeven');
  const oddEvenData =
    Array.isArray(oddEvenList) &&
    oddEvenList.length > 0 &&
    oddEvenList[0].section
      ? oddEvenList[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          max: sec.max,
          min: sec.min,
          mname: oddEvenList[0].mname, // ✅ Access from first item
          status: sec.gstatus, // ✅ Access from first item
        }))
      : [];

  console.log('oddEvenData from cricketbet', oddEvenData);

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
                      `${liveStreamBaseUrl}/live-stream?gmid=${streamGmid}&key=${key_new}`
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
                className='h-[26vh] w-full'
                title='Live Score'
                allow='autoplay;
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
            setitem={setitem}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Cricket Game'
            sid={4}
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

        {/** Bookmaker */}
        {BookmakerList.length > 0 && (
          <Bookmaker
            gameid={gameid}
            onBetSelect={handleBetSelect}
            BookmakerList={BookmakerList}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Cricket Game'
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

        {/** Tied Match */}
        {tiedMatchList.length > 0 && (
          <TiedMatch
            onBetSelect={handleBetSelect}
            tiedMatchList={tiedMatchList}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            gameid={gameid}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Cricket Game'
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

        {/** Normal */}
        {NormalData.length > 0 && (
          <Normal
            onBetSelect={handleBetSelect}
            NormalData={NormalData}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            gameid={gameid}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Cricket Game'
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

        {/** Fancy1  */}
        {fancy1Data.length > 0 && (
          <Fancy1
            onBetSelect={handleBetSelect}
            fancy1Data={fancy1Data}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            gameid={gameid}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Cricket Game'
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

        {/** */}
        {khadoData.length > 0 && (
          <Khado
            onBetSelect={handleBetSelect}
            khadoData={khadoData}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            gameid={gameid}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Cricket Game'
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

        {/** OddEven */}
        {oddEvenData.length > 0 && (
          <OddEven
            onBetSelect={handleBetSelect}
            oddEvenData={oddEvenData}
            pendingBetAmounts={pendingBetAmounts}
            selectedBet={selectedBet}
            gameid={gameid}
            team1={team1}
            team2={team2}
            eventName={match}
            gameName='Cricket Game'
            onBetChange={handleBetChange}
            onClose={() => setSelectedBet(null)}
          />
        )}

        {/** New Tied Match */}
        {/* {newtiedMatchList.length > 0 && (
              <TiedMatch
                onBetSelect={handleBetSelect}
                tiedMatchList={newtiedMatchList}
                pendingBetAmounts={pendingBetAmounts}
                selectedBet={selectedBet}
              />
            )} */}
      </div>

      <div className='sticky top-[117px] hidden h-[calc(100vh-118px)] lg:block'>
        <div className='w-[350px]'>
          {userInfo?.account !== 'demo' && (
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
                        `${liveStreamBaseUrl}/live-stream?gmid=${streamGmid}&key=${key_new}`
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
          )}

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

export default CricketBet;
