import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSoccerData } from '../redux/reducer/soccerSlice';
import { formatApiMatchDateTime } from '../utils/formatMatchDateTime';
import {
  getPendingBetAmo,
  fetchSoccerBatingData,
  getBetPerents,
  masterBookReducer,
  masterBookReducerDownline,
} from '../redux/reducer/marketAnalyzeReducer';
import Spinner2 from '../components/Spinner2';
import SoccerOdds from './SoccerComponents/SoccerOdds';
import SoccerOver15 from './SoccerComponents/SoccerOver15';
import SoccerOver5 from './SoccerComponents/SoccerOver_5';
import SoccerOver25 from './SoccerComponents/SoccerOver25';
import MasterBookModal from '../components/MasterBookModal';
import { buildMasterBookBreadcrumbRoot } from '../utils/masterBookUtils';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { host } from '../redux/api';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { getAdmin } from '../redux/reducer/authReducer';
import { motion } from 'framer-motion';
import { MdOutlineKeyboardArrowRight } from 'react-icons/md';
import { FaFilter, FaMinusCircle, FaPlusCircle } from 'react-icons/fa';
import { BsGraphUpArrow } from 'react-icons/bs';
import { TfiMenuAlt } from 'react-icons/tfi';

const MARKET_DATA_REFRESH_MS = 3000;
const PENDING_BETS_REFRESH_MS = 3000;

export default function Soccerbet() {
  const [bettingData, setBettingData] = useState(null);
  const dispatch = useDispatch();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isFromMarket = searchParams.get('from') === 'market';
  const { gameid } = useParams() || {};
  const { gameName } = useParams() || {};
  const { gameTitle } = useParams() || {};
  const { match } = useParams() || {};
  const [url, setUrl] = useState('');
  const [scoreUrl, setScoreUrl] = useState(false);
  const [masterpopup, setMasterpopup] = useState(false);
  const [userMasterpopup, setUserMasterpopup] = useState(false);
  const [liveBets, setLiveBets] = useState([]);
  const [userBet, setUserBet] = useState([]);
  const [storedGameType, setStoredGameType] = useState(null);
  const [storedMatchOddsList, setStoredMatchOddsList] = useState([]);
  const [teamHeaders, setTeamHeaders] = useState([]);
  const [showMasterDownline, setShowMasterDownline] = useState(false);
  const [masterDownline, setMasterDownline] = useState([]);
  const [masterBookBreadcrumb, setMasterBookBreadcrumb] = useState([]);
  const [viewMoreDetail, setViewMoreDetail] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [amountFilter, setAmountFilter] = useState('');
  const [marketNameFilter, setMarketNameFilter] = useState('');
  const { userInfo } = useSelector((state) => state.auth);
  const { matches: soccerMatches } = useSelector((state) => state.soccer);
  const [showlivetv, setshowlivetv] = useState(false);

  const matchStartTime = useMemo(() => {
    if (location.state?.time) return location.state.time;
    const listed = soccerMatches?.find((m) => String(m.id) === String(gameid));
    if (listed?.time) return listed.time;
    if (listed?.date) return formatApiMatchDateTime(listed.date);
    return null;
  }, [location.state?.time, soccerMatches, gameid]);

  const {
    loading,
    battingData,
    betsData,
    betPerantsData,
    masterData,
    masterDataDownline,
    pendingBet,
  } = useSelector((state) => state.market);

  const [isComboBookOpen, setIsComboBookOpen] = useState(true);

  const filteredBetsData = Array.isArray(betsData)
    ? betsData.filter((item) => {
        let matchesAmount = true;
        if (amountFilter) {
          const amount =
            item.otype === 'lay'
              ? parseFloat(item.betAmount)
              : parseFloat(item.price);
          matchesAmount = amount >= parseFloat(amountFilter);
        }
        let matchesMarket = true;
        if (marketNameFilter) {
          matchesMarket = item.gameType
            ?.toLowerCase()
            .includes(marketNameFilter.toLowerCase());
        }
        return matchesAmount && matchesMarket;
      })
    : [];

  useEffect(() => {
    dispatch(fetchSoccerData());
  }, [dispatch]);

  useEffect(() => {
    if (!gameid) return;

    const socket = new WebSocket(host);

    socket.onopen = () => {
      socket.send(
        JSON.stringify({ type: 'subscribe', gameid, apitype: 'soccer' })
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
  }, [gameid]);

  useEffect(() => {
    if (!gameid) return;

    const fetchData = () => dispatch(fetchSoccerBatingData(gameid));
    fetchData();
    const intervalId = setInterval(fetchData, MARKET_DATA_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [dispatch, gameid]);

  useEffect(() => {
    setBettingData(battingData);
  }, [battingData]);

  useEffect(() => {
    dispatch(getAdmin());
  }, [dispatch]);

  const matchOddsList =
    bettingData?.filter((item) => item.mname === 'MATCH_ODDS') || [];

  const matchOdd = Array.isArray(betsData)
    ? betsData.filter((item) => item?.gameType === 'Match Odds')
    : [];

  const matcUnder5List =
    bettingData?.filter((item) => item.mname === 'OVER_UNDER_05') || [];

  const matcUnder5 = Array.isArray(betsData)
    ? betsData.filter((item) => item?.gameType === 'OVER_UNDER_05')
    : [];

  const matcUnder15List =
    bettingData?.filter((item) => item.mname === 'OVER_UNDER_15') || [];

  const matcUnder15 = Array.isArray(betsData)
    ? betsData.filter((item) => item?.gameType === 'OVER_UNDER_15')
    : [];

  const matcUnder25List =
    bettingData?.filter((item) => item.mname === 'OVER_UNDER_25') || [];

  const matcUnder25 = Array.isArray(betsData)
    ? betsData.filter((item) => item?.gameType === 'OVER_UNDER_25')
    : [];

  useEffect(() => {
    dispatch(getPendingBetAmo(gameid));
    if (!gameid) return;

    const intervalId = setInterval(() => {
      dispatch(getPendingBetAmo(gameid));
    }, PENDING_BETS_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [dispatch, gameid]);

  useEffect(() => {
    document.body.style.overflow = masterpopup ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [masterpopup]);

  const hendalUserBetsData = (gameType, code, matchOddsList) => {
    const userBet = Array.isArray(betsData)
      ? betsData.filter(
          (item) => item?.gameType === gameType || item?.gameType === code
        )
      : [];

    // Extract teams from matchOddsList
    const teams = Array.isArray(matchOddsList[0]?.section)
      ? matchOddsList[0].section.map((sec) => sec.nat)
      : [];
    setTeamHeaders(teams); // Set teams to render in table header
    setUserBet(userBet);
  };

  const fetchMasterBookAtLevel = async (userId) => {
    const finalGameType = storedGameType;
    const finalMatchOddsList = storedMatchOddsList;

    const teams = Array.isArray(finalMatchOddsList[0]?.section)
      ? finalMatchOddsList[0].section.map((sec) => sec.nat)
      : [];
    setTeamHeaders(teams);

    if (!userId) {
      dispatch({ type: 'RESET_MASTER_BOOK' });
      await dispatch(
        masterBookReducer({ userId: '', gameid, gameType: finalGameType })
      );
      return;
    }

    await dispatch(
      masterBookReducerDownline({ userId, gameid, gameType: finalGameType })
    );
  };

  const hemdelMasterBook = async (userId, gameType, matchOddsList) => {
    try {
      setMasterDownline([]);
      setShowMasterDownline(true);
      setMasterBookBreadcrumb(buildMasterBookBreadcrumbRoot(userInfo));

      const finalGameType = gameType || storedGameType;
      const finalMatchOddsList = matchOddsList?.length
        ? matchOddsList
        : storedMatchOddsList;

      if (gameType && matchOddsList) {
        setStoredGameType(gameType);
        setStoredMatchOddsList(matchOddsList);
      }

      const teams = Array.isArray(finalMatchOddsList[0]?.section)
        ? finalMatchOddsList[0].section.map((sec) => sec.nat)
        : [];
      setTeamHeaders(teams);

      dispatch({ type: 'RESET_MASTER_BOOK' });

      await dispatch(
        masterBookReducer({ userId, gameid, gameType: finalGameType })
      );
    } catch (error) {
      console.log(error);
    }
  };

  const hemdelMasterBookDownline = async (userId, userName) => {
    try {
      setMasterDownline([]);
      setMasterBookBreadcrumb((prev) => [
        ...prev,
        { id: userId, userName: userName || 'User' },
      ]);
      await fetchMasterBookAtLevel(userId);
    } catch (error) {
      console.log(error);
    }
  };

  const handleMasterBookBreadcrumbClick = async (index) => {
    try {
      setMasterDownline([]);
      let targetUserId = '';
      setMasterBookBreadcrumb((prev) => {
        const next = prev.slice(0, index + 1);
        targetUserId = index === 0 ? '' : (next[index]?.id ?? '');
        return next;
      });
      await fetchMasterBookAtLevel(targetUserId);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (masterData?.length > 0) {
      setMasterDownline(masterData); //  For first-level data
    }
  }, [masterData]);

  useEffect(() => {
    if (masterDataDownline?.length > 0) {
      setMasterDownline(masterDataDownline); //  For downline drill
    }
  }, [masterDataDownline]);

  useEffect(() => {
    const fetchVideoUrl = async () => {
      try {
        const response = await axios.get(
          `https://live.cricketid.xyz/directStream?gmid=${gameid}&key=a1bett20252026`
        );
        const data = response?.data;
        setUrl(data?.tv_url);
      } catch (error) {
        console.error(
          'Video API Error:',
          error?.response?.data || error.message
        );
      }
    };
    if (gameid) {
      fetchVideoUrl();
    }
  }, [gameid]);

  const [popup, setPopup] = useState(false);
  const handelpopup = async (id) => {
    setPopup(true);
    await dispatch(getBetPerents(id));
  };

  // Inside your React functional component (e.g., in a file like MyComponent.jsx)

  const formatToK = (num) => {
    if (!num || num < 1000) return num;
    const n = Number(num);
    return `${n / 1000}k`;
  };

  const pratnerShip = (role, amount, part) => {
    const roundedAmount = Math.round(amount * 100) / 100; // Round to 2 decimals
    if (role === 'user') {
      return roundedAmount;
    } else {
      return Math.round(roundedAmount * ((100 - part) / 100) * 100) / 100;
    }
  };
  const filteredBetOdd = betsData
    ?.filter((item) =>
      searchTerm
        ? item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.gameType?.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    )
    .slice(0, entriesPerPage);

  const calculatedComboBookData = (() => {
    const teams = matchOddsList?.[0]?.section?.map((sec) => sec.nat) || [];
    if (!teams.length || !pendingBet || pendingBet.length === 0) return [];

    const comboBets = pendingBet.filter(
      (b) =>
        b.gameType !== 'Normal' && !b.gameType?.toLowerCase().includes('fancy')
    );

    const results = teams.map((team) => {
      let netOutcome = 0;
      comboBets.forEach((bet) => {
        const isBetOnThisTeam =
          bet.teamName?.toLowerCase() === team.toLowerCase();
        const betAmount = parseFloat(bet.totalBetAmount) || 0;
        const stake = parseFloat(bet.totalPrice) || 0;

        if (bet.otype === 'back') {
          if (isBetOnThisTeam) {
            netOutcome += betAmount;
          } else {
            netOutcome -= stake;
          }
        } else if (bet.otype === 'lay') {
          if (isBetOnThisTeam) {
            netOutcome -= stake;
          } else {
            netOutcome += betAmount;
          }
        }
      });
      return {
        teamName: team,
        netOutcome: Math.round(netOutcome * 100) / 100,
      };
    });

    return results.map((item) => {
      let ratio = null;
      let otherTeam = null;
      if (item.netOutcome !== 0 && results.length >= 2) {
        const opposite = results.find(
          (r) =>
            r.teamName !== item.teamName &&
            ((item.netOutcome > 0 && r.netOutcome < 0) ||
              (item.netOutcome < 0 && r.netOutcome > 0))
        );
        if (opposite && opposite.netOutcome !== 0) {
          ratio = Math.abs(item.netOutcome / opposite.netOutcome);
          otherTeam = opposite.teamName;
        }
      }
      return { ...item, betAverage: ratio, averageRelativeTeam: otherTeam };
    });
  })();
  return (
    <div className='relative'>
      <Navbar />

      {loading ? (
        <div className='py-4 text-center'>
          <Spinner2 />
        </div>
      ) : (
        <div className='flex w-full flex-col gap-4 bg-[#fbfbfc] p-1 md:flex-row md:p-5'>
          <div className='sm:w-full md:w-[60%]'>
            <div className='flex items-center justify-between bg-[#18b0c8] px-[5px] py-[3px] text-[14px] font-bold text-white'>
              <span className='flex items-center'>
                {gameTitle} - {gameName}
              </span>
              <span>{matchStartTime || '—'}</span>
            </div>
            <div className='mt-2 flex items-center justify-between bg-[#27a6c3] px-2.5 py-[3px] text-[14px] text-white'>
              <div className='flex items-center gap-1'>
                <span className='font-bold'>Combo Book</span>
              </div>
              <div
                className='cursor-pointer'
                onClick={() => setIsComboBookOpen(!isComboBookOpen)}
              >
                {isComboBookOpen ? (
                  <FaMinusCircle className='text-[18px]' />
                ) : (
                  <FaPlusCircle className='text-[18px]' />
                )}
              </div>
            </div>
            {isComboBookOpen && (
              <table className='w-full'>
                <tbody>
                  {calculatedComboBookData &&
                  calculatedComboBookData.length > 0 ? (
                    calculatedComboBookData.map((item, index) => {
                      const isPositive = item.netOutcome >= 0;
                      const colorClass = isPositive
                        ? 'text-green-500'
                        : 'text-red-500';
                      return (
                        <tr
                          key={index}
                          className='border-y border-gray-200 text-[14px] leading-[22px]'
                        >
                          <td className='py-0.5 pl-3 font-bold'>
                            {item.teamName}
                            {item.betAverage !== null && (
                              <span className='ml-1 text-[11px] font-normal tracking-tight text-[#4d6a8a]'>
                                [{item.averageRelativeTeam} :{' '}
                                {item.betAverage.toFixed(2)}]
                              </span>
                            )}
                          </td>
                          <td className='px-1 py-0.5 text-right'>
                            <span
                              className={`inline-block w-[155px] max-w-[240px] font-bold ${colorClass}`}
                            >
                              {item.netOutcome}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className='border-y border-gray-200 text-[14px] leading-[22px]'>
                      <td
                        colSpan={2}
                        className='px-3 py-0.5 text-center text-gray-500'
                      >
                        No Combo Book Data Available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            <div className='mx-auto text-[13px]'>
              {/* odds match data */}
              <SoccerOdds
                matchOddsList={matchOddsList}
                onBookClick={() =>
                  hemdelMasterBook(
                    '',
                    matchOdd[0]?.gameType || 'Match Odds',
                    matchOddsList
                  )
                }
              />

              <SoccerOver5
                matcUnder5List={matcUnder5List}
                onBookClick={() =>
                  hemdelMasterBook(
                    '',
                    matcUnder5[0]?.gameType || matcUnder5List[0]?.mname,
                    matcUnder5List
                  )
                }
              />
              <SoccerOver15
                matcUnder15List={matcUnder15List}
                onBookClick={() =>
                  hemdelMasterBook(
                    '',
                    matcUnder15[0]?.gameType || matcUnder15List[0]?.mname,
                    matcUnder15List
                  )
                }
              />

              <SoccerOver25
                matcUnder25List={matcUnder25List}
                onBookClick={() =>
                  hemdelMasterBook(
                    '',
                    matcUnder25[0]?.gameType || matcUnder25List[0]?.mname,
                    matcUnder25List
                  )
                }
              />
            </div>
          </div>
          <div className='md-mt-0 sm:w-full md:w-[40%]'>
            <div className='mb-3'>
              <div className='flex cursor-pointer items-center justify-between bg-[#016a82] px-1 py-0.5 text-[13px] text-white'>
                <span className='font-bold'>Live TV</span>
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
                <div className='block aspect-video w-full'>
                  <iframe
                    src={`https://81habibi.com/api/v1/live-stream?gmid=${gameid}&key=gk_db1cb19180dd6dc5657140d56d29c138099808c7a1196c52`}
                    title='Watch Live'
                    className='h-full w-full'
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
                </div>
              )}
            </div>

            <div className='bg-[#27a6c3] px-2.5 py-[3px]'>
              <div className='flex items-center justify-between'>
                <div className='flex gap-2'>
                  <div className='flex items-center gap-1 text-[12px] text-white'>
                    Odds{' '}
                    <span className='flex h-[15px] w-[14px] items-center justify-center rounded-sm border border-[#636363] bg-[#636363] text-[9px] leading-none'>
                      {matchOdd?.length || 0}
                    </span>
                  </div>
                  <div className='flex items-center gap-1 text-[12px] text-white'>
                    BM{' '}
                    <span className='flex h-[15px] w-[14px] items-center justify-center rounded-sm border border-[#636363] bg-[#636363] text-[9px] leading-none'>
                      0
                    </span>
                  </div>
                  <div className='flex items-center gap-1 text-[12px] text-white'>
                    Fancy{' '}
                    <span className='flex h-[15px] w-[14px] items-center justify-center rounded-sm border border-[#636363] bg-[#636363] text-[9px] leading-none'>
                      0
                    </span>
                  </div>
                  <div className='hidden items-center gap-2 rounded-[5px] border border-black bg-gradient-to-b from-[#545454] to-[#000] px-[7px] py-[3px] text-[12px] text-white md:flex'>
                    Reset <FaFilter className='text-white' size={10} />
                  </div>
                </div>
                <div className='hidden gap-2 md:flex'>
                  <div className='flex items-center gap-2 rounded-[5px] border border-black bg-gradient-to-b from-[#545454] to-[#000] px-[7px] py-[5px] text-[12px] text-white'>
                    P&L <BsGraphUpArrow className='text-white' size={12} />
                  </div>
                  <div className='flex items-center gap-2 rounded-[5px] border border-black bg-gradient-to-b from-[#545454] to-[#000] px-[7px] py-[5px] text-[12px] text-white'>
                    All Bets <TfiMenuAlt className='text-white' size={12} />
                  </div>
                </div>
              </div>
              <div className='mt-1.5 grid grid-cols-2 gap-1'>
                <input
                  type='text'
                  className='col-span-1 w-full rounded border border-[#ced4da] bg-white px-2 py-1 text-[#495057] outline-none'
                  placeholder='Filter by Amount from'
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                />
                <input
                  type='text'
                  className='col-span-1 w-full rounded border border-[#ced4da] bg-white px-2 py-1 text-[#495057] outline-none'
                  placeholder='Filter by Market Name'
                  value={marketNameFilter}
                  onChange={(e) => setMarketNameFilter(e.target.value)}
                />
              </div>
            </div>

            <table className='mt-[1px] w-full'>
              <thead>
                <tr className='bg-[#016a82] text-[12px] text-white'>
                  <th className='px-[3px] py-[2px] text-left font-medium'>
                    UserName
                  </th>
                  <th className='px-[3px] py-[2px] text-left font-medium'>
                    Market
                  </th>
                  <th className='px-[3px] py-[2px] text-left font-medium'>
                    Runner
                  </th>
                  <th className='px-[3px] py-[2px] text-left font-medium'>
                    Rate
                  </th>
                  <th className='px-[3px] py-[2px] text-left font-medium'>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBetsData.map((item, index) => (
                  <tr
                    key={index}
                    className={`border-y border-white text-[12px] ${item.otype === 'back' ? 'bg-[#72bbef]' : 'bg-[#faa9ba]'}`}
                  >
                    <td className='px-[3px] py-[2px]'>{item.userName}</td>
                    <td className='px-[3px] py-[2px]'>{item.gameType}</td>
                    <td className='px-[3px] py-[2px]'>{item.teamName}</td>
                    <td className='px-[3px] py-[2px] font-semibold'>
                      {item.gameType === 'Normal' ? `${item.fancyScore}/` : ''}
                      {item.xValue}
                    </td>
                    <td className='px-[3px] py-[2px] font-semibold'>
                      {item.otype === 'lay' ? item.betAmount : item.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* {!isFromMarket && (
                  <>
                    <div className='mt-4 flex min-h-[42px] cursor-pointer items-center justify-between rounded-t-md bg-[#2c3e50b3] px-3 py-1 text-white uppercase'>
                      <span>My Bets</span>
                      <div
                        className='h-full rounded-sm bg-[#2c3e50] px-2.5 py-1.5'
                        onClick={() => setViewMoreDetail(true)}
                      >
                        View More
                      </div>
                    </div>

                    <div className='bg-white'>
                      {betsData.length > 0 ? (
                        <div className=''>
                          <div className='grid grid-cols-10 border-b border-gray-400 bg-white px-2 py-2 text-[14px] font-bold'>
                            <div className='col-span-4'>UserName</div>
                            <div className='col-span-4'>Nation</div>
                            <div className='col-span-1'>Rate</div>
                            <div className='col-span-1 text-right'>Amount</div>
                          </div>

                          {filteredBetsData.map((item, index) => (
                            <div
                              key={index}
                              className={`${item.otype === 'back' ? 'border-[#89c9f8] bg-[#b6defa]' : 'border-[#f8e8eb] bg-[#f8e8eb]'} border px-2 py-1 text-sm`}
                            >
                              <div className='flex items-center justify-between'>
                                <div className='font-bold'>{item.gameType}</div>
                                <div className='text-[10px] text-gray-600 uppercase'>
                                  {formatApiMatchDateTime(item.date)}
                                </div>
                              </div>
                              <div
                                className={`${item.otype === 'back' ? ' bg-[#beddf4]' : 'bg-[#f8e8eb]'} grid grid-cols-10 gap-2 text-sm`}
                              >
                                <div className='col-span-4 text-[14px]'>
                                  {item.userName}
                                </div>
                                <div className='col-span-4 text-[14px] uppercase'>
                                  {item.teamName}
                                </div>
                                <div className='col-span-1 text-[14px]'>
                                  {item.gameType === 'Normal'
                                    ? `${item.fancyScore}/`
                                    : ''}
                                  {item.xValue}
                                </div>
                                <div className='col-span-1 text-right text-[14px]'>
                                  {item.otype === 'lay'
                                    ? item.betAmount
                                    : item.price}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='items-center py-8 text-center'>
                          <h2>There are no any bet.</h2>
                        </div>
                      )}
                    </div>
                  </>
                )} */}

            {/* {isFromMarket && (
                  <div className='mt-4 bg-white'>
                    <div className='flex min-h-[42px] cursor-pointer items-center rounded-t-md bg-[#2c3e50b3] px-3 py-1 text-white uppercase'>
                      Book
                    </div>
                    <div className='flex w-full justify-between p-4'>
                      <button
                        className='bg-dark w-[47%] cursor-pointer rounded-md px-4 py-1 font-semibold text-white'
                        onClick={() => setMasterpopup(true)}
                      >
                        Master Book
                      </button>
                      <button
                        className='bg-dark w-[47%] cursor-pointer rounded-md px-4 py-1 font-semibold text-white'
                        onClick={() => setUserMasterpopup(true)}
                      >
                        User Book
                      </button>
                    </div>
                  </div>
                )} */}

            {/* {isFromMarket && (
                  <div className='mt-4 bg-white'>
                    <div className='flex min-h-[42px] cursor-pointer items-center rounded-t-md bg-[#2c3e50b3] px-3 py-1 text-white uppercase'>
                      <div className='flex w-2/3 justify-between p-0 md:w-[60%] md:p-4'>
                        <div className='flex gap-2 md:gap-5'>
                          <span className='mt-4 md:mt-1'>Live Bet</span>
                          <div className='inline-flex items-center'>
                            <label className='relative flex cursor-pointer items-center'>
                              <input
                                type='checkbox'
                                className='peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 bg-white shadow transition-all checked:border-slate-800 checked:bg-slate-800 hover:shadow-md'
                                id='uncheck'
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setLiveBets(betsData);
                                  } else {
                                    setLiveBets([]);
                                  }
                                }}
                              />
                              <span className='pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform bg-white text-blue-500 opacity-0 peer-checked:opacity-100'>
                                <svg
                                  xmlns='http://www.w3.org/2000/svg'
                                  className='h-3.5 w-3.5'
                                  viewBox='0 0 20 20'
                                  fill='currentColor'
                                  stroke='currentColor'
                                  strokeWidth={1}
                                >
                                  <path
                                    fillRule='evenodd'
                                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                    clipRule='evenodd'
                                  />
                                </svg>
                              </span>
                            </label>
                          </div>
                        </div>
                        <div className='flex gap-2 md:gap-5'>
                          <span className='mt-4 md:mt-1'>Partnership Book</span>
                          <div className='inline-flex items-center'>
                            <label className='relative flex cursor-pointer items-center'>
                              <input
                                type='checkbox'
                                className='peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 bg-white shadow transition-all checked:border-slate-800 checked:bg-slate-800 hover:shadow-md'
                                id='check'
                              />
                              <span className='pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform bg-white text-blue-500 opacity-0 peer-checked:opacity-100'>
                                <svg
                                  xmlns='http://www.w3.org/2000/svg'
                                  className='h-3.5 w-3.5'
                                  viewBox='0 0 20 20'
                                  fill='currentColor'
                                  stroke='currentColor'
                                  strokeWidth={1}
                                >
                                  <path
                                    fillRule='evenodd'
                                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                    clipRule='evenodd'
                                  />
                                </svg>
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div
                        className='flex w-1/3 justify-end p-4 text-end md:w-[40%]'
                        onClick={() => setViewMoreDetail(true)}
                      >
                        View More
                      </div>
                    </div>
                    {liveBets.length > 0 ? (
                      <div className='w-full border-t border-gray-300 p-2'>
                        <div className='grid grid-cols-10 border-b border-gray-400 bg-white py-2 text-[11px]'>
                          <div className='col-span-4'>Market Name</div>
                          <div className='col-span-2'>Odds</div>
                          <div className='col-span-2'>Stake</div>
                          <div className='col-span-2'>Username</div>
                        </div>

                        {liveBets.map((item, index) => (
                          <div
                            key={index}
                            className={`${item.otype === 'back' ? 'border-[#89c9f8] bg-[#b6defa]' : 'border-[#f8e8eb] bg-[#f8e8eb]'} border px-2 py-1 text-sm`}
                          >
                            <div>
                              <p className='text-[10px] text-gray-600'>
                                Time: {item.date}
                              </p>
                            </div>
                            <div
                              className={`${item.otype === 'back' ? ' bg-[#beddf4]' : 'bg-[#f8e8eb]'} grid grid-cols-10 items-center gap-2 text-sm`}
                            >
                              <div className='col-span-4'>
                                <div className='flex items-center gap-2'>
                                  <div
                                    className={`${item.otype === 'back' ? 'bg-[#79c0f4] ' : 'bg-[#faa9ba]'} rounded px-2 py-1 text-[10px] font-bold text-white`}
                                  >
                                    {item.otype}
                                  </div>
                                  <div className='flex flex-col'>
                                    <span className='text-[10px] text-gray-400'>
                                      {item.teamName}
                                    </span>
                                    <span className='text-[11px] font-semibold'>
                                      {item.gameType}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className='col-span-2 text-[11px]'>
                                <div>
                                  {item.gameType === 'Normal'
                                    ? `${item.fancyScore}/`
                                    : ''}
                                  {item.xValue}
                                </div>
                              </div>
                              <div className='col-span-2 text-[11px]'>
                                <div>
                                  {item.otype === 'lay'
                                    ? item.betAmount
                                    : item.price}
                                </div>
                              </div>
                              <div className='col-span-2 text-[11px]'>
                                <div>
                                  <div
                                    className='cursor-pointer text-gray-700 underline'
                                    onClick={() => handelpopup(item.userId)}
                                  >
                                    {item.userName}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='items-center py-8 text-center'>
                        <h2>There are no any bet.</h2>
                      </div>
                    )}
                  </div>
                )} */}

            {/* view more popup */}

            {viewMoreDetail && (
              <div className='modal-overlay fixed h-full'>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className='absolute top-7 left-1/2 max-w-[96%] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg md:w-full md:max-w-6xl'
                >
                  {/* Header */}
                  <div className='bg-color flex items-center justify-between px-2 py-2.5 text-white'>
                    <h4 className='text-[15px] font-semibold'>View More Bet</h4>
                    <button
                      className='text-md font-bold text-white'
                      onClick={() => setViewMoreDetail(false)}
                    >
                      ×
                    </button>
                  </div>

                  {/* Body */}

                  <div className='p-4'>
                    {loading ? (
                      <div className='flex items-center justify-center py-10'>
                        <div className='h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent'>
                          Loading...
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className='mb-4 flex flex-col justify-between text-[13px] md:flex-row'>
                          <div className='mb-2 flex items-center justify-center text-[#333] md:mb-0'>
                            <span className='mr-2'>Show</span>
                            <select
                              className='rounded border border-gray-300 px-2 py-1'
                              value={entriesPerPage}
                              onChange={(e) =>
                                setEntriesPerPage(Number(e.target.value))
                              }
                            >
                              <option value='2'>2</option>
                              <option value='5'>5</option>
                              <option value='10'>10</option>
                            </select>
                            <span className='ml-2'>entries</span>
                          </div>
                          <div className='flex items-center justify-center'>
                            <span className='mr-2'>Search</span>
                            <input
                              type='text'
                              className='rounded border border-gray-300 px-2 py-1'
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>

                        <table className='block w-full border-collapse overflow-x-auto border border-gray-300 md:table'>
                          <thead className='bg-gray-200'>
                            <tr>
                              <th className='border border-gray-300 px-[10px] py-[9px]'>
                                UserName
                              </th>
                              <th className='border border-gray-300 px-[10px] py-[9px]'>
                                Nation
                              </th>
                              <th className='border border-gray-300 px-[10px] py-[9px]'>
                                Amount
                              </th>
                              <th className='border border-gray-300 px-[10px] py-[9px]'>
                                User Rate
                              </th>
                              <th className='border border-gray-300 px-[10px] py-[9px]'>
                                Place Date
                              </th>
                              <th className='border border-gray-300 px-[10px] py-[9px]'>
                                Match Date
                              </th>
                              <th className='border border-gray-300 px-[10px] py-[9px]'>
                                Game Type
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredBetOdd?.length > 0 ? (
                              filteredBetOdd.map((item, index) => (
                                <tr
                                  key={index}
                                  className={`text-center ${item.otype === 'back' ? 'bg-[#72bbef]' : 'bg-[#faa9ba]'}`}
                                >
                                  <td
                                    className='border border-gray-300 p-2 text-blue-500 uppercase underline'
                                    onClick={() => handelpopup(item.userId)}
                                  >
                                    {item.userName}
                                  </td>
                                  <td className='border border-gray-300 px-[10px] py-[9px]'>
                                    {item.teamName}
                                  </td>
                                  <td className='border border-gray-300 p-2'>
                                    {item.price}
                                  </td>
                                  <td className='border border-gray-300 px-[10px] py-[9px]'>
                                    {item.xValue}
                                  </td>
                                  <td className='border border-gray-300 px-[10px] py-[9px] uppercase'>
                                    {formatApiMatchDateTime(item.createdAt)}
                                  </td>
                                  <td className='border border-gray-300 px-[10px] py-[9px] uppercase'>
                                    {formatApiMatchDateTime(item.updatedAt)}
                                  </td>
                                  <td className='border border-gray-300 px-[10px] py-[9px] uppercase'>
                                    {item.gameType}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan='7'
                                  className='border border-gray-300 px-[10px] py-[9px] text-center'
                                >
                                  No Detail found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {/* master list popup */}

            {masterpopup && (
              <div className='modal-overlay fixed top-10 left-[25%] h-full'>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className='modal-content h-fit w-[95%] md:w-[50%]'
                >
                  <div className='modal-header bg-color flex justify-between'>
                    <span> Market List</span>
                    <span
                      className='text-lg'
                      onClick={() => setMasterpopup(false)}
                    >
                      {' '}
                      X
                    </span>
                  </div>
                  <div className='modal-body p-4'>
                    <div className='border border-gray-300'>
                      {matchOdd?.length > 0 && (
                        <h2
                          className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                          onClick={() =>
                            hemdelMasterBook(
                              '',
                              matchOdd[0]?.gameType,
                              matchOddsList
                            )
                          }
                        >
                          {matchOdd[0]?.gameType}
                        </h2>
                      )}
                      {matcUnder5?.length > 0 && (
                        <h2
                          className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                          onClick={() =>
                            hemdelMasterBook(
                              '',
                              matcUnder5[0]?.gameType,
                              matcUnder5List
                            )
                          }
                        >
                          {matcUnder5[0]?.gameType}
                        </h2>
                      )}
                      {matcUnder15?.length > 0 && (
                        <h2
                          className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                          onClick={() =>
                            hemdelMasterBook(
                              '',
                              matcUnder15[0]?.gameType,
                              matcUnder15List
                            )
                          }
                        >
                          {matcUnder15[0]?.gameType}
                        </h2>
                      )}
                      {matcUnder25?.length > 0 && (
                        <h2
                          className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                          onClick={() =>
                            hemdelMasterBook(
                              '',
                              matcUnder25[0]?.gameType,
                              matcUnder25List
                            )
                          }
                        >
                          {matcUnder25[0]?.gameType}
                        </h2>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* user master list popup */}

            {userMasterpopup && (
              <div className='modal-overlay fixed top-10 left-[25%] h-full'>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className='modal-content h-fit w-[95%] md:w-[50%]'
                >
                  <div className='modal-header bg-color flex justify-between'>
                    <span> Market List</span>
                    <span
                      className='text-2xl'
                      onClick={() => setUserMasterpopup(false)}
                    >
                      {' '}
                      X
                    </span>
                  </div>
                  <div className='modal-body p-4'>
                    <div className='border border-gray-300'>
                      {matchOdd?.length > 0 && (
                        <h2
                          className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                          onClick={() =>
                            hendalUserBetsData(
                              matchOdd[0]?.gameType,
                              userInfo.code,
                              matchOddsList
                            )
                          }
                        >
                          {matchOdd[0]?.gameType}
                        </h2>
                      )}
                      {matcUnder5?.length > 0 && (
                        <h2
                          className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                          onClick={() =>
                            hendalUserBetsData(
                              matcUnder5[0]?.gameType,
                              userInfo.code,
                              matcUnder5List
                            )
                          }
                        >
                          {matcUnder5[0]?.gameType}
                        </h2>
                      )}
                      {matcUnder15?.length > 0 && (
                        <h2
                          className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                          onClick={() =>
                            hendalUserBetsData(
                              matcUnder15[0]?.gameType,
                              userInfo.code,
                              matcUnder15List
                            )
                          }
                        >
                          {matcUnder15[0]?.gameType}
                        </h2>
                      )}
                      {matcUnder25?.length > 0 && (
                        <h2
                          className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                          onClick={() =>
                            hendalUserBetsData(
                              matcUnder25[0]?.gameType,
                              userInfo.code,
                              matcUnder25List
                            )
                          }
                        >
                          {matcUnder25[0]?.gameType}
                        </h2>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* user Book popup */}
            {userBet?.length > 0 && (
              <div className='modal-overlay1 fixed top-10 left-[25%] h-full'>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className='modal-content h-fit w-[95%] md:w-[30%]'
                >
                  <div className='modal-header bg-color flex justify-between'>
                    <span> Master Book</span>
                    <span className='text-2xl' onClick={() => setUserBet(null)}>
                      {' '}
                      X
                    </span>
                  </div>
                  <div className='modal-body p-4'>
                    <div className='overflow-x-auto'>
                      <table className='w-full border-collapse'>
                        <thead>
                          <tr className='bg-gray-200 text-center'>
                            <th className='border border-gray-300 p-2 text-left'>
                              <div className='flex items-center justify-center text-[13px]'>
                                Username
                              </div>
                            </th>
                            <th className='border border-gray-300 p-2 text-left'>
                              <div className='flex items-center justify-center text-[13px]'>
                                Role
                              </div>
                            </th>
                            {teamHeaders.map((team, index) => (
                              <th
                                key={index}
                                className='border border-gray-300 p-2 text-left'
                              >
                                <div className='flex items-center justify-center text-[13px]'>
                                  {team}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {loading && (
                            <tr>
                              <td
                                colSpan={6}
                                className='border border-gray-300 p-4 text-center'
                              >
                                Loading...
                              </td>
                            </tr>
                          )}
                          {!loading && userBet?.length > 0 ? (
                            userBet.map((item, index) => (
                              <tr
                                key={index}
                                className='text-center text-sm font-semibold hover:bg-gray-100'
                              >
                                <td className='cursor-pointer border border-gray-300 p-2 text-[#2789ce]'>
                                  {item.userName}
                                </td>

                                <td className='border border-gray-300 p-2'>
                                  {item.userRole}
                                </td>

                                {/* Loop through team headers for dynamic columns */}
                                {teamHeaders.map((team, i) => {
                                  // Check if bet matches any team in the current match
                                  const isMatchedTeam =
                                    item.teamName?.toLowerCase() ===
                                    team?.toLowerCase();
                                  const betMatchesAnyTeam = teamHeaders.some(
                                    (t) =>
                                      item.teamName?.toLowerCase() ===
                                      t?.toLowerCase()
                                  );

                                  // If bet doesn't belong to this match, show 0
                                  if (!betMatchesAnyTeam) {
                                    return (
                                      <td
                                        key={i}
                                        className='border border-gray-300 p-2'
                                      >
                                        <span className='text-gray-400'>0</span>
                                      </td>
                                    );
                                  }

                                  // Calculate display value
                                  let displayValue;
                                  if (item.otype === 'back') {
                                    displayValue = isMatchedTeam
                                      ? item.betAmount || 0 // Profit if this team wins
                                      : -(item.price || 0); // Loss if other team wins
                                  } else {
                                    // lay
                                    displayValue = isMatchedTeam
                                      ? -(item.price || 0) // Liability if this team wins
                                      : item.betAmount || 0; // Profit if other team wins
                                  }

                                  // Round to 2 decimal places
                                  const roundedValue =
                                    Math.round(displayValue * 100) / 100;

                                  // Color based on actual value (positive = green, negative = red)
                                  const colorClass =
                                    roundedValue >= 0
                                      ? 'text-green-500'
                                      : 'text-red-500';

                                  return (
                                    <td
                                      key={i}
                                      className='border border-gray-300 p-2'
                                    >
                                      <span className={colorClass}>
                                        {roundedValue}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={6}
                                className='border border-gray-300 p-4 text-center'
                              >
                                No data available in table
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* user bet presents popup */}
          </div>
          <div>
            {popup && (
              <div className='bg-opacity-50 fixed inset-0 z-9999 flex items-start justify-center bg-[#0000005d]'>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className='mt-7 w-[96%] rounded-lg bg-white shadow-lg md:w-150'
                >
                  {/* Header */}
                  <div className='bg-color flex items-center justify-between px-4 py-1.5 font-bold text-white'>
                    <span>Parent List</span>
                    <button
                      onClick={() => setPopup(false)}
                      className='text-xl text-white'
                    >
                      ×
                    </button>
                  </div>

                  {/* Commission List */}
                  <div className='space-y-2 p-4'>
                    {[...betPerantsData].reverse().map((item, index) => (
                      <div
                        key={index}
                        className='flex items-center justify-center border border-gray-300 px-4 py-2 text-center font-semibold'
                      >
                        <span>{item.userName}</span>
                        <span>
                          <span>({item.role.toUpperCase()})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      )}

      <MasterBookModal
        open={showMasterDownline}
        marketName={storedGameType}
        teamHeaders={teamHeaders}
        rows={masterDownline}
        loading={loading}
        breadcrumbPath={masterBookBreadcrumb}
        onBreadcrumbClick={handleMasterBookBreadcrumbClick}
        onClose={() => {
          setMasterDownline([]);
          setMasterBookBreadcrumb([]);
          setShowMasterDownline(false);
        }}
        onUsernameClick={hemdelMasterBookDownline}
      />
    </div>
  );
}
