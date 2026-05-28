import React, { useEffect, useState, useCallback } from 'react';
import api from '../../redux/api';
import { toast } from 'react-toastify';
import { useTranslation } from '../../context/LanguageContext';
import excelIcon from '../../assets/icons/csv-icon.svg';
import pdfIcon from '../../assets/icons/pdf-icon.svg';

const getFormattedDateTime = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  let hours = '' + d.getHours();
  let minutes = '' + d.getMinutes();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  if (hours.length < 2) hours = '0' + hours;
  if (minutes.length < 2) minutes = '0' + minutes;

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const CurrentBets = () => {
  const { t } = useTranslation();
  const [gameType, setGameType] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return getFormattedDateTime(d);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return getFormattedDateTime(d);
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBets = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      query.append('page', page);
      query.append('limit', limit);

      if (gameType === 'casino') {
        query.append('selectedGame', 'Casino');
      } else {
        query.append('selectedGame', '');
      }

      query.append('selectedVoid', 'settel');

      const res = await api.get(`/user/bet/history?${query.toString()}`, {
        withCredentials: true,
      });

      setRows(res.data?.data || []);
      setTotalPages(res.data?.pagination?.pages || res.data?.totalPages || 1);
      setTotalEntries(
        res.data?.pagination?.total || res.data?.data?.length || 0
      );
    } catch (error) {
      setRows([]);
      toast.error(error?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page, limit, gameType]);

  useEffect(() => {
    if (hasSearched) {
      fetchBets();
    }
  }, [page, limit, hasSearched, fetchBets]);

  const handleSubmit = () => {
    setHasSearched(true);
    if (page === 1) {
      fetchBets();
    } else {
      setPage(1);
    }
  };

  const handleReset = () => {
    setGameType('all');
    const dStart = new Date();
    dStart.setDate(dStart.getDate() - 1);
    dStart.setHours(0, 0, 0, 0);
    setStartDate(getFormattedDateTime(dStart));

    const dEnd = new Date();
    dEnd.setDate(dEnd.getDate() + 1);
    dEnd.setHours(0, 0, 0, 0);
    setEndDate(getFormattedDateTime(dEnd));

    setPage(1);
    setSearchTerm('');
    setHasSearched(false);
    setRows([]);
  };

  const filteredRows =
    rows?.filter((row) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        row.gameName?.toLowerCase().includes(searchLower) ||
        row.eventName?.toLowerCase().includes(searchLower) ||
        row.marketName?.toLowerCase().includes(searchLower) ||
        row.teamName?.toLowerCase().includes(searchLower)
      );
    }) || [];

  return (
    <div className='w-full p-2 text-sm text-[#333]'>
      <div className='w-full border border-[#00000020] bg-white shadow-[0_0_5px_#a4a4a4]'>
        {/* Header */}
        <div className='bg-[#18b0c8] p-2 text-white'>
          <h4 className='text-[16px] font-bold'>{t('bet_histroy', 'Bet Histroy')}</h4>
        </div>

        <div className='w-full p-3'>
          {/* Top Controls Row exactly as screenshot */}
          <div className='mb-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-start'>
            {/* Filters */}
            <div className='flex flex-wrap items-center gap-2'>
              <select
                className='h-[32px] w-[180px] rounded-sm border border-[#ccc] p-1 text-[13px] text-[#555] outline-none'
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
              >
                <option value='all'>{t('sports', 'Sports')}</option>
                <option value='casino'>{t('casino', 'Casino')}</option>
              </select>

              <input
                type='datetime-local'
                className='h-[32px] w-[150px] rounded-sm border border-[#ccc] p-1 text-[13px] text-[#555] outline-none'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type='datetime-local'
                className='h-[32px] w-[150px] rounded-sm border border-[#ccc] p-1 text-[13px] text-[#555] outline-none'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              <button
                onClick={handleSubmit}
                className='h-[32px] w-[60px] rounded-sm bg-[#18b0c8] bg-gradient-to-t from-[#148b9f] to-[#1bb5ce] px-2 text-[14px] font-bold text-white shadow-sm'
              >
                {t('go', 'Go')}
              </button>
              <button
                onClick={handleReset}
                className='h-[32px] w-[60px] rounded-sm bg-[#18b0c8] bg-gradient-to-t from-[#148b9f] to-[#1bb5ce] px-2 text-[14px] font-bold text-white shadow-sm'
              >
                {t('reset', 'Reset')}
              </button>
            </div>
          </div>

          {hasSearched && (
            <>
              {/* Search and Entries Row */}
              <div className='mb-2 flex flex-col justify-between gap-3 lg:flex-row lg:items-center'>
                <div className='flex items-center gap-2'>
                  <input
                    type='text'
                    placeholder={t('search_placeholder', 'Search')}
                    className='h-[30px] w-[150px] rounded-sm border border-[#ccc] p-1 text-[13px] text-[#555] outline-none'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button className='flex h-[30px] items-center rounded-sm border border-[#dbdbdb] bg-[#f8f9fa] px-2 text-[11px] font-bold hover:bg-[#e2e6ea]'>
                    <img src={excelIcon} alt='CSV' className='mr-1 w-4' />
                  </button>
                  <button className='flex h-[30px] items-center rounded-sm border border-[#dbdbdb] bg-[#f8f9fa] px-2 text-[11px] font-bold hover:bg-[#e2e6ea]'>
                    <img src={pdfIcon} alt='PDF' className='mr-1 w-4' />
                  </button>
                </div>

                <div className='flex items-center gap-2'>
                  <span className='text-[13px]'>{t('show', 'Show')}</span>
                  <select
                    className='h-[30px] rounded-sm border border-[#ccc] p-1 text-[13px] text-[#555] outline-none'
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
                  <span className='text-[13px]'>{t('entries', 'entries')}</span>
                </div>
              </div>

              {/* Table */}
              <div className='scrollbar-hide overflow-x-auto'>
                <table className='w-full min-w-[900px] border-collapse'>
                  <thead>
                    <tr className='bg-[#18b0c8] text-white'>
                      <th className='h-[35px] border-r border-[#ffffff40] p-2 text-left text-[13px] font-bold whitespace-nowrap'>
                        {t('date_time', 'Date & Time')}
                      </th>
                      <th className='h-[35px] border-r border-[#ffffff40] p-2 text-left text-[13px] font-bold whitespace-nowrap'>
                        {t('competition', 'Competition')}
                      </th>
                      <th className='h-[35px] border-r border-[#ffffff40] p-2 text-left text-[13px] font-bold whitespace-nowrap'>
                        {t('event', 'Event')}
                      </th>
                      <th className='h-[35px] border-r border-[#ffffff40] p-2 text-left text-[13px] font-bold whitespace-nowrap'>
                        {t('market', 'Market')}
                      </th>
                      <th className='h-[35px] border-r border-[#ffffff40] p-2 text-left text-[13px] font-bold whitespace-nowrap'>
                        {t('runner', 'Runner')}
                      </th>
                      <th className='h-[35px] border-r border-[#ffffff40] p-2 text-left text-[13px] font-bold whitespace-nowrap'>
                        {t('side', 'Side')}
                      </th>
                      <th className='h-[35px] border-r border-[#ffffff40] p-2 text-right text-[13px] font-bold whitespace-nowrap'>
                        {t('line', 'Line')}
                      </th>
                      <th className='h-[35px] border-r border-[#ffffff40] p-2 text-right text-[13px] font-bold whitespace-nowrap'>
                        {t('rate', 'Rate')}
                      </th>
                      <th className='h-[35px] border-r border-[#ffffff40] p-2 text-right text-[13px] font-bold whitespace-nowrap'>
                        {t('amount', 'Amount')}
                      </th>
                      <th className='h-[35px] border-r border-[#ffffff40] p-2 text-right text-[13px] font-bold whitespace-nowrap'>
                        {t('pl', 'PL')}
                      </th>
                      <th className='h-[35px] border-r border-[#ffffff40] p-2 text-right text-[13px] font-bold whitespace-nowrap'>
                        {t('status', 'Status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan='11'
                          className='h-8 border-b border-[#eee] p-2 text-center'
                        >
                          {t('loading', 'Loading...')}
                        </td>
                      </tr>
                    ) : filteredRows.length > 0 ? (
                      filteredRows.map((row, index) => (
                        <tr
                          key={index}
                          className={`hover:bg-[#f1f1f1] ${row.status === 1 ? 'bg-[#72bbef]' : row.status === 2 ? 'bg-[#faa9ba]' : 'odd:bg-[#f9f9f9]'}`}
                        >
                          <td className='h-[35px] border-r border-b border-[#eee] px-2 text-left text-[13px] whitespace-nowrap'>
                            {new Date(row.createdAt).toLocaleString()}
                          </td>
                          <td className='h-[35px] border-r border-b border-[#eee] px-2 text-left text-[13px]'>
                            {row.gameType || '-'}
                          </td>
                          <td
                            className='h-[35px] max-w-[200px] truncate border-r border-b border-[#eee] px-2 text-left text-[13px]'
                            title={row.eventName}
                          >
                            {row.eventName || '-'}
                          </td>
                          <td className='h-[35px] border-r border-b border-[#eee] px-2 text-left text-[13px]'>
                            {row.marketName || '-'}
                          </td>
                          <td className='h-[35px] border-r border-b border-[#eee] px-2 text-left text-[13px]'>
                            {row.teamName || '-'}
                          </td>
                          <td className='h-[35px] border-r border-b border-[#eee] px-2 text-left text-[13px] capitalize'>
                            {row.otype || '-'}
                          </td>
                          <td className='h-[35px] border-r border-b border-[#eee] px-2 text-right text-[13px] font-bold text-black'>
                            {row.fancyScore || '-'}
                          </td>
                          <td className='h-[35px] border-r border-b border-[#eee] px-2 text-right text-[13px] font-bold text-black'>
                            {row.price || row.xValue || 0}
                          </td>
                          <td className='h-[35px] border-r border-b border-[#eee] px-2 text-right text-[13px] font-bold text-black'>
                            {Number(row.betAmount || 0).toFixed(2)}
                          </td>
                          <td
                            className={`h-[35px] border-r border-b border-[#eee] px-2 text-right text-[13px] font-bold ${
                              row.profitLossChange >= 0
                                ? 'text-green-700'
                                : 'text-red-700'
                            }`}
                          >
                            {Number(row.profitLossChange || 0).toFixed(2)}
                          </td>
                          <td className='h-[35px] border-r border-b border-[#eee] px-2 text-right text-[12px] font-bold uppercase'>
                            {row.status === 1
                              ? 'WON'
                              : row.status === 2
                                ? 'LOST'
                                : row.status === 3
                                  ? 'VOID'
                                  : 'DECLARED'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan='11'
                          className='h-8 border-b border-[#eee] p-2 text-center'
                        >
                          {t('no_data_found', 'No data found')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!loading && filteredRows.length > 0 && totalPages > 0 && (
                <div className='mt-4 flex flex-col items-center justify-between gap-3 text-sm text-[#555] lg:flex-row'>
                  <div>
                    Showing {(page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, totalEntries)} of {totalEntries}{' '}
                    entries
                  </div>
                  <div className='flex items-center gap-0'>
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(1)}
                      className='rounded-l-[3px] border border-[#18b0c8] bg-[#18b0c8] px-3 py-1 text-[13px] text-white disabled:cursor-not-allowed disabled:opacity-70'
                    >
                      First
                    </button>
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className='border-y border-[#18b0c8] bg-[#18b0c8] px-3 py-1 text-[13px] text-white disabled:cursor-not-allowed disabled:opacity-70'
                    >
                      {t('previous', 'Prev')}
                    </button>
                    <button
                      disabled={true}
                      className='border-y border-[#18b0c8] bg-[#18b0c8] px-3 py-1 text-[13px] text-white'
                    >
                      {page}
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      className='border-y border-[#18b0c8] bg-[#18b0c8] px-3 py-1 text-[13px] text-white disabled:cursor-not-allowed disabled:opacity-70'
                    >
                      {t('next', 'Next')}
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage(totalPages)}
                      className='rounded-r-[3px] border border-[#18b0c8] bg-[#18b0c8] px-3 py-1 text-[13px] text-white disabled:cursor-not-allowed disabled:opacity-70'
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentBets;
