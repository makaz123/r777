import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getBetHistory } from '../../redux/reducer/betReducer';
import { getUser } from '../../redux/reducer/authReducer';
import { useTranslation } from '../../context/LanguageContext';

function ProfitLoss() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { betHistory, loading, pagination } = useSelector((state) => state.bet);
  const { userInfo } = useSelector((state) => state.auth);

  // Date setup - default to last 4 months
  const currentDate = new Date();
  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(currentDate.getMonth() - 4);
  const formatDate = (date) => date.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(formatDate(fourMonthsAgo));
  const [endDate, setEndDate] = useState(formatDate(currentDate));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [goToPage, setGoToPage] = useState(1);
  const [selectedGame, setSelectedGame] = useState('');

  const fetchProfitLoss = useCallback(() => {
    if (!startDate || !endDate || !userInfo?._id) return;
    dispatch(
      getBetHistory({
        startDate,
        endDate,
        page,
        limit,
        selectedGame,
        selectedVoid: 'settel', // Only show settled bets
      })
    );
  }, [dispatch, startDate, endDate, page, limit, selectedGame, userInfo?._id]);

  useEffect(() => {
    if (!userInfo) {
      dispatch(getUser());
    }
  }, [dispatch, userInfo]);

  useEffect(() => {
    if (userInfo?._id) {
      fetchProfitLoss();
    }
  }, [fetchProfitLoss, userInfo?._id]);

  useEffect(() => {
    setGoToPage(page);
  }, [page]);

  const handleReset = () => {
    setStartDate(formatDate(fourMonthsAgo));
    setEndDate(formatDate(currentDate));
    setSelectedGame('');
    setPage(1);
    setSearchTerm('');
  };

  const handleSubmit = () => {
    setPage(1);
    fetchProfitLoss();
  };

  const getRowColor = (otype) => {
    if (otype === 'back') return 'bg-[#72bbef]';
    if (otype === 'lay') return 'bg-[#faa9ba]';
    return 'bg-white';
  };

  const filteredBets =
    betHistory?.filter((bet) => {
      const matchesSearch =
        !searchTerm ||
        bet.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bet.marketName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bet.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bet.gameName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    }) || [];

  return (
    <div className='w-full overflow-x-auto p-0.5'>
      <div className='w-full border border-[#00000020] bg-[#fff] shadow-[0_0_5px_#a4a4a4]'>
        <div className='bg-[#18b0c8] text-white p-2'>
          <h4 className='text-[16px] font-bold'>
            {t('bet_history', 'Bet Histroy')}
          </h4>
        </div>
        <div className='mb-2 w-full p-2'>
          {/* Top Filters Row */}
          <div className='flex flex-wrap items-center gap-2 mb-3'>
            <select
              name='type'
              id='type'
              className='h-[32px] w-[180px] border border-[#dbdbdb] p-1 text-[13px] outline-none'
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
            >
              <option value=''>{t('sports', 'Sports')}</option>
              <option value='Cricket Game'>{t('cricket', 'Cricket')}</option>
              <option value='Tennis Game'>{t('tennis', 'Tennis')}</option>
              <option value='Soccer Game'>{t('soccer', 'Soccer')}</option>
              <option value='Casino'>{t('casino', 'Casino')}</option>
            </select>
            <input
              type='date'
              className='h-[32px] w-[160px] border border-[#dbdbdb] p-1 text-[13px] outline-none'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <input
              type='date'
              className='h-[32px] w-[160px] border border-[#dbdbdb] p-1 text-[13px] outline-none'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <button
              onClick={handleSubmit}
              className='bg-primary text-primary h-[32px] w-[60px] px-2 text-[14px] font-bold'
            >
              {t('go', 'Go')}
            </button>
            <button
              onClick={handleReset}
              className='bg-primary text-primary h-[32px] w-[60px] px-2 text-[14px] font-bold'
            >
              {t('reset', 'Reset')}
            </button>
          </div>

          <div className='mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-[#eee] pb-2'>
            {/* Search and Icons */}
            <div className='flex items-center gap-2'>
              <input
                type='text'
                placeholder={t('search_placeholder', 'Search')}
                className='h-[30px] w-[150px] border border-[#dbdbdb] p-1 text-[13px] outline-none'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className='h-[30px] border border-[#dbdbdb] px-2 text-[11px] font-bold text-[#1e7e34] bg-[#f8f9fa] hover:bg-[#e2e6ea]'>CSV</button>
              <button className='h-[30px] border border-[#dbdbdb] px-2 text-[11px] font-bold text-[#bd2130] bg-[#f8f9fa] hover:bg-[#e2e6ea]'>PDF</button>
            </div>
            {/* Show Entries */}
            <div className='flex items-center gap-2'>
              <span className='text-[13px] font-[400]'>
                {t('show', 'Show')}
              </span>
              <select
                name='entries'
                id='entries'
                className='h-[30px] border border-[#dbdbdb] p-1 text-[13px] outline-none'
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value='10'>10</option>
                <option value='25'>25</option>
                <option value='50'>50</option>
                <option value='100'>100</option>
              </select>
              <span className='text-[13px] font-[400]'>
                {t('entries', 'entries')}
              </span>
            </div>
          </div>

          <div className='scrollbar-hide overflow-x-auto'>
            <table className='w-full min-w-[1000px] border-collapse text-left'>
              <thead>
                <tr className='bg-[#18b0c8] text-white'>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold whitespace-nowrap'>
                    {t('date', 'Date')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold whitespace-nowrap'>
                    {t('competition', 'Competition')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold whitespace-nowrap'>
                    {t('event', 'Event')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold whitespace-nowrap'>
                    {t('market', 'Market')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold whitespace-nowrap'>
                    {t('runner', 'Runner')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold whitespace-nowrap'>
                    {t('side', 'Side')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold whitespace-nowrap'>
                    {t('line', 'Line')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold whitespace-nowrap'>
                    {t('rate', 'Rate')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold whitespace-nowrap'>
                    {t('amount', 'Amount')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold whitespace-nowrap'>
                    {t('profit_loss', 'Profit/Loss')}
                  </th>
                  <th className='h-[35px] p-2 text-[13px] font-bold whitespace-nowrap'>
                    {t('status', 'Status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan='11'
                      className='h-8 border border-gray-300 p-2 text-center'
                    >
                      {t('loading', 'Loading...')}
                    </td>
                  </tr>
                ) : filteredBets.length > 0 ? (
                  filteredBets.map((bet, index) => (
                    <tr
                      key={index}
                      className={`${getRowColor(bet.otype)} text-black`}
                    >
                      <td className='h-[35px] border-r border-b border-[#ffffff40] px-2 text-[12px]'>
                        {bet.createdAt ? new Date(bet.createdAt).toLocaleString('en-GB') : '-'}
                      </td>
                      <td className='h-[35px] border-r border-b border-[#ffffff40] px-2 text-[12px]'>
                        {bet.gameName || '-'}
                      </td>
                      <td className='h-[35px] border-r border-b border-[#ffffff40] px-2 text-[12px]'>
                        {bet.eventName || '-'}
                      </td>
                      <td className='h-[35px] border-r border-b border-[#ffffff40] px-2 text-[12px]'>
                        {bet.marketName || '-'}
                      </td>
                      <td className='h-[35px] border-r border-b border-[#ffffff40] px-2 text-[12px]'>
                        {bet.teamName || '-'}
                      </td>
                      <td className='h-[35px] border-r border-b border-[#ffffff40] px-2 text-[12px] capitalize'>
                        {bet.otype || '-'}
                      </td>
                      <td className='h-[35px] border-r border-b border-[#ffffff40] px-2 text-[12px]'>
                        {bet.fancyScore || '-'}
                      </td>
                      <td className='h-[35px] border-r border-b border-[#ffffff40] px-2 text-[12px]'>
                        {bet.xValue || '-'}
                      </td>
                      <td className='h-[35px] border-r border-b border-[#ffffff40] px-2 text-[12px]'>
                        {bet.price ? parseFloat(bet.price).toFixed(2) : parseFloat(bet.betAmount).toFixed(2)}
                      </td>
                      <td className={`h-[35px] border-r border-b border-[#ffffff40] px-2 text-[12px] font-semibold ${Number(bet.profitLossChange || bet.resultAmount || 0) >= 0 ? 'text-[#0e9d57]' : 'text-[#e54b60]'}`}>
                        {Number(bet.profitLossChange || bet.resultAmount || 0).toFixed(2)}
                      </td>
                      <td className='h-[35px] border-b border-[#ffffff40] px-2 text-[12px]'>
                        {bet.betResult || 'SETTLED'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan='11'
                      className='h-8 border border-gray-300 p-2 text-center'
                    >
                      {t('no_data_found', 'No data found')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredBets.length > 0 && pagination?.pages > 0 && (
            <div className='mt-4 flex flex-col lg:flex-row items-center justify-between gap-3 text-sm'>
              <div>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} entries
              </div>
              <div className='flex items-center gap-0'>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className='bg-[#75b4bc] text-white px-3 py-1 text-[13px] hover:bg-[#629ea5] disabled:opacity-70 disabled:cursor-not-allowed rounded-l-sm'
                >
                  {t('previous', 'Prev')}
                </button>
                <button
                  disabled={true}
                  className='bg-[#75b4bc] text-white px-3 py-1 text-[13px] border-x border-[#5da1a9]'
                >
                  {page}
                </button>
                <button
                  disabled={page >= (pagination?.pages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                  className='bg-[#75b4bc] text-white px-3 py-1 text-[13px] hover:bg-[#629ea5] disabled:opacity-70 disabled:cursor-not-allowed rounded-r-sm'
                >
                  {t('next', 'Next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfitLoss;
