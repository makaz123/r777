import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getTransactionHistory } from '../../redux/reducer/betReducer';
import { useTranslation } from '../../context/LanguageContext';

const formatStatementDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  h = h ? h : 12; // the hour '0' should be '12'
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year}, ${h}:${min}:${sec} ${ampm}`;
};

const formatMoney = (value) => {
  if (value == null || value === '' || value === 0) return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return '-';
  return n.toFixed(2);
};

const formatBalance = (value) => {
  const n = Number(value || 0);
  return n.toFixed(2);
};

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

function AccountStatement() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { transHistory, accountStatementSummary, loading, pagination } =
    useSelector((state) => state.bet);

  const [reportType, setReportType] = useState('all');
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const mapReportTypeToApiAccountType = (type) => {
    if (type === 'all') return undefined;
    if (type === 'sports') return 'bet';
    return type;
  };

  const fetchStatement = useCallback(() => {
    if (!startDate || !endDate) return;
    dispatch(
      getTransactionHistory({
        startDate,
        endDate,
        page,
        limit,
        accountType: mapReportTypeToApiAccountType(reportType),
      })
    );
  }, [dispatch, startDate, endDate, page, limit, reportType]);

  useEffect(() => {
    if (hasSearched) {
      fetchStatement();
    }
  }, [page, limit, hasSearched]); // only fetch when page/limit/hasSearched change

  const handleSubmit = () => {
    setHasSearched(true);
    if (page === 1) {
      fetchStatement();
    } else {
      setPage(1);
    }
  };

  const handleReset = () => {
    const dStart = new Date();
    dStart.setDate(dStart.getDate() - 1);
    dStart.setHours(0, 0, 0, 0);
    setStartDate(getFormattedDateTime(dStart));

    const dEnd = new Date();
    dEnd.setDate(dEnd.getDate() + 1);
    dEnd.setHours(0, 0, 0, 0);
    setEndDate(getFormattedDateTime(dEnd));

    setReportType('all');
    setPage(1);
    setSearchTerm('');
    setHasSearched(false);
  };

  const filteredData =
    transHistory?.filter((row) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        row.description?.toLowerCase().includes(searchLower) ||
        String(row.credit ?? '').includes(searchTerm) ||
        String(row.debit ?? '').includes(searchTerm)
      );
    }) || [];

  return (
    <div className='w-full p-2 text-sm text-[#333]'>
      <div className='w-full border border-[#00000020] bg-white shadow-[0_0_5px_#a4a4a4]'>
        {/* Header */}
        <div className='bg-[#18b0c8] p-2 text-white'>
          <h4 className='text-[16px] font-bold'>
            {t('account_statement', 'Account Statement')}
          </h4>
        </div>

        <div className='w-full p-3'>
          {/* Top Controls Row */}
          <div className='mb-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-start'>
            {/* Filters */}
            <div className='flex flex-wrap items-center gap-2'>
              <select
                className='h-[32px] w-[180px] border border-[#ccc] p-1 text-[13px] text-[#555] outline-none'
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value='all'>{t('all', 'ALL')}</option>
                <option value='deposit'>
                  {t('balance_report', 'BALANCE REPORT')}
                </option>
                <option value='sports'>
                  {t('game_report', 'GAME REPORT')}
                </option>
                <option value='settlement'>
                  {t('settlement_report', 'SETTLEMENT REPORT')}
                </option>
                <option value='bonus'>
                  {t('bonus_report', 'BONUS REPORT')}
                </option>
              </select>

              <input
                type='datetime-local'
                className='h-[32px] w-[130px] border border-[#ccc] p-1 text-[13px] text-[#555] outline-none'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type='datetime-local'
                className='h-[32px] w-[130px] border border-[#ccc] p-1 text-[13px] text-[#555] outline-none'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              <button
                onClick={handleSubmit}
                className='h-[32px] w-[60px] bg-[#18b0c8] px-2 text-[14px] font-bold text-white'
              >
                {t('go', 'Go')}
              </button>
              <button
                onClick={handleReset}
                className='h-[32px] w-[60px] bg-[#18b0c8] px-2 text-[14px] font-bold text-white'
              >
                {t('reset', 'Reset')}
              </button>
            </div>

            {hasSearched && (
              <div className='border border-[#ccc] bg-white text-[13px]'>
                <div className='flex border-b border-[#ccc]'>
                  <div className='w-[130px] border-r border-[#ccc] p-1.5'>
                    {t('closing_balance', 'Closing Balance')}
                  </div>
                  <div className='w-[100px] p-1.5 font-bold'>
                    {formatBalance(
                      accountStatementSummary?.closingBalance || 0
                    )}
                  </div>
                </div>
                <div className='flex'>
                  <div className='w-[130px] border-r border-[#ccc] p-1.5'>
                    {t('opening_balance', 'Opening Balance')}
                  </div>
                  <div className='w-[100px] p-1.5 font-bold'>
                    {formatBalance(
                      accountStatementSummary?.openingBalance || 0
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {hasSearched && (
            <>
              {/* Search and Entries Row */}
              <div className='mb-2 flex flex-col justify-between gap-3 lg:flex-row lg:items-center'>
                <div className='flex items-center gap-2'>
                  <input
                    type='text'
                    placeholder={t('search_placeholder', 'Search')}
                    className='h-[30px] w-[150px] border border-[#ccc] p-1 text-[13px] text-[#555] outline-none'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button className='h-[30px] border border-[#dbdbdb] bg-[#f8f9fa] px-2 text-[11px] font-bold text-[#1e7e34] hover:bg-[#e2e6ea]'>
                    CSV
                  </button>
                  <button className='h-[30px] border border-[#dbdbdb] bg-[#f8f9fa] px-2 text-[11px] font-bold text-[#bd2130] hover:bg-[#e2e6ea]'>
                    PDF
                  </button>
                </div>

                <div className='flex items-center gap-2'>
                  <span className='text-[13px]'>{t('show', 'Show')}</span>
                  <select
                    className='h-[30px] border border-[#ccc] p-1 text-[13px] text-[#555] outline-none'
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
                      <th className='h-[35px] w-[180px] border-r border-[#ffffff40] p-2 text-left text-[13px] font-bold whitespace-nowrap'>
                        {t('date', 'Date')}
                      </th>
                      <th className='h-[35px] w-[100px] border-r border-[#ffffff40] p-2 text-right text-[13px] font-bold whitespace-nowrap'>
                        {t('credit', 'Credit')}
                      </th>
                      <th className='h-[35px] w-[100px] border-r border-[#ffffff40] p-2 text-right text-[13px] font-bold whitespace-nowrap'>
                        {t('debit', 'Debit')}
                      </th>
                      <th className='h-[35px] w-[100px] border-r border-[#ffffff40] p-2 text-right text-[13px] font-bold whitespace-nowrap'>
                        {t('balance', 'Balance')}
                      </th>
                      <th className='h-[35px] p-2 text-left text-[13px] font-bold whitespace-nowrap'>
                        {t('description', 'Description')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan='5'
                          className='h-8 border-b border-[#eee] p-2 text-center'
                        >
                          {t('loading', 'Loading...')}
                        </td>
                      </tr>
                    ) : filteredData.length > 0 ? (
                      <>
                        {page === 1 && !searchTerm && (
                          <tr className='bg-[#f9f9f9]'>
                            <td className='h-[35px] border-r border-b border-[#eee] px-2 text-[13px]'></td>
                            <td className='h-[35px] border-r border-b border-[#eee] px-2 text-[13px]'></td>
                            <td className='h-[35px] border-r border-b border-[#eee] px-2 text-[13px]'></td>
                            <td className='h-[35px] border-r border-b border-[#eee] px-2 text-right text-[13px] font-bold text-[#0e9d57]'>
                              {formatBalance(
                                accountStatementSummary?.closingBalance || 0
                              )}
                            </td>
                            <td className='h-[35px] border-b border-[#eee] px-2 text-[13px] font-bold'>
                              Closing Balance
                            </td>
                          </tr>
                        )}
                        {filteredData.map((row, index) => (
                          <tr key={index} className='hover:bg-[#f1f1f1]'>
                            <td className='h-[35px] border-r border-b border-[#eee] px-2 text-left text-[13px]'>
                              {formatStatementDate(row.date)}
                            </td>
                            <td
                              className={`h-[35px] border-r border-b border-[#eee] px-2 text-right text-[13px] ${row.credit > 0 ? 'text-[#0e9d57]' : ''}`}
                            >
                              {formatMoney(row.credit)}
                            </td>
                            <td
                              className={`h-[35px] border-r border-b border-[#eee] px-2 text-right text-[13px] ${row.debit > 0 ? 'text-[#e54b60]' : ''}`}
                            >
                              {formatMoney(row.debit)}
                            </td>
                            <td className='h-[35px] border-r border-b border-[#eee] px-2 text-right text-[13px] font-bold text-[#0e9d57]'>
                              {formatBalance(row.balance ?? row.closing)}
                            </td>
                            <td className='h-[35px] border-b border-[#eee] px-2 text-left text-[13px] text-[#333]'>
                              {row.type === 'bet' ? (
                                <span className='cursor-pointer text-[#18b0c8] hover:underline'>
                                  {row.description}
                                </span>
                              ) : row.type === 'commission' ? (
                                <span className='cursor-pointer text-[#18b0c8] hover:underline'>
                                  {row.description}
                                </span>
                              ) : (
                                <span>{row.description}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr>
                        <td
                          colSpan='5'
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
              {!loading && filteredData.length > 0 && pagination?.pages > 0 && (
                <div className='mt-4 flex flex-col items-center justify-between gap-3 text-sm text-[#555] lg:flex-row'>
                  <div>
                    Showing {(page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, pagination.total)} of{' '}
                    {pagination.total} entries
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
                      className='rounded-l-[3px] border border-[#18b0c8] bg-[#18b0c8] px-3 py-1 text-[13px] text-white disabled:cursor-not-allowed disabled:opacity-70'
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
                      disabled={page >= (pagination?.pages || 1)}
                      onClick={() =>
                        setPage((p) => Math.min(p + 1, pagination?.pages || 1))
                      }
                      className='border border-[#18b0c8] bg-[#18b0c8] px-3 py-1 text-[13px] text-white disabled:cursor-not-allowed disabled:opacity-70'
                    >
                      {t('next', 'Next')}
                    </button>
                    <button
                      disabled={page >= (pagination?.pages || 1)}
                      onClick={() => setPage(pagination?.pages || 1)}
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
}

export default AccountStatement;
