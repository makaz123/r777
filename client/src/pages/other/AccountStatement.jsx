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

function AccountStatement() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { transHistory, accountStatementSummary, loading, pagination } = useSelector(
    (state) => state.bet
  );

  const currentDate = new Date();
  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(currentDate.getMonth() - 4);
  const formatDate = (date) => date.toISOString().split('T')[0];

  const [reportType, setReportType] = useState('all');
  const [startDate, setStartDate] = useState(formatDate(fourMonthsAgo));
  const [endDate, setEndDate] = useState(formatDate(currentDate));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStatement = useCallback(() => {
    if (!startDate || !endDate) return;
    dispatch(
      getTransactionHistory({
        startDate,
        endDate,
        page,
        limit,
        accountType: reportType !== 'all' ? reportType : undefined,
      })
    );
  }, [dispatch, startDate, endDate, page, limit, reportType]);

  useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  const handleSubmit = () => {
    setPage(1);
    fetchStatement();
  };

  const handleReset = () => {
    setStartDate(formatDate(fourMonthsAgo));
    setEndDate(formatDate(currentDate));
    setReportType('all');
    setPage(1);
    setSearchTerm('');
  };

  const filteredData = transHistory?.filter((row) => {
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
        <div className='bg-[#18b0c8] text-white p-2'>
          <h4 className='text-[16px] font-bold'>
            {t('account_statement', 'Account Statement')}
          </h4>
        </div>

        <div className='w-full p-3'>
          {/* Top Controls Row */}
          <div className='flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4'>
            {/* Filters */}
            <div className='flex flex-wrap items-center gap-2'>
              <select
                className='h-[32px] w-[180px] border border-[#ccc] p-1 text-[13px] outline-none text-[#555]'
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value='all'>{t('all', 'ALL')}</option>
                <option value='deposit'>{t('deposit', 'DEPOSIT')}</option>
                <option value='withdraw'>{t('withdraw', 'WITHDRAW')}</option>
                <option value='bet'>{t('bet', 'BET')}</option>
                <option value='commission'>{t('commission', 'COMMISSION')}</option>
              </select>

              <input
                type='datetime-local'
                className='h-[32px] w-[160px] border border-[#ccc] p-1 text-[13px] outline-none text-[#555]'
                value={`${startDate}T00:00`}
                onChange={(e) => setStartDate(e.target.value.split('T')[0])}
              />
              <input
                type='datetime-local'
                className='h-[32px] w-[160px] border border-[#ccc] p-1 text-[13px] outline-none text-[#555]'
                value={`${endDate}T00:00`}
                onChange={(e) => setEndDate(e.target.value.split('T')[0])}
              />

              <button
                onClick={handleSubmit}
                className='bg-[#18b0c8] text-white h-[32px] w-[60px] px-2 text-[14px] font-bold'
              >
                {t('go', 'Go')}
              </button>
              <button
                onClick={handleReset}
                className='bg-[#18b0c8] text-white h-[32px] w-[60px] px-2 text-[14px] font-bold'
              >
                {t('reset', 'Reset')}
              </button>
            </div>

            {/* Balances */}
            <div className='border border-[#ccc] bg-white text-[13px]'>
              <div className='flex border-b border-[#ccc]'>
                <div className='w-[130px] p-1.5 border-r border-[#ccc]'>{t('closing_balance', 'Closing Balance')}</div>
                <div className='w-[100px] p-1.5 font-bold'>{formatBalance(accountStatementSummary?.closingBalance)}</div>
              </div>
              <div className='flex'>
                <div className='w-[130px] p-1.5 border-r border-[#ccc]'>{t('opening_balance', 'Opening Balance')}</div>
                <div className='w-[100px] p-1.5 font-bold'>{formatBalance(accountStatementSummary?.openingBalance)}</div>
              </div>
            </div>
          </div>

          {/* Search and Entries Row */}
          <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2'>
            <div className='flex items-center gap-2'>
              <input
                type='text'
                placeholder={t('search_placeholder', 'Search')}
                className='h-[30px] w-[150px] border border-[#ccc] p-1 text-[13px] outline-none text-[#555]'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className='h-[30px] border border-[#dbdbdb] px-2 text-[11px] font-bold text-[#1e7e34] bg-[#f8f9fa] hover:bg-[#e2e6ea]'>CSV</button>
              <button className='h-[30px] border border-[#dbdbdb] px-2 text-[11px] font-bold text-[#bd2130] bg-[#f8f9fa] hover:bg-[#e2e6ea]'>PDF</button>
            </div>

            <div className='flex items-center gap-2'>
              <span className='text-[13px]'>
                {t('show', 'Show')}
              </span>
              <select
                className='h-[30px] border border-[#ccc] p-1 text-[13px] outline-none text-[#555]'
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
              <span className='text-[13px]'>
                {t('entries', 'entries')}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className='scrollbar-hide overflow-x-auto'>
            <table className='w-full min-w-[900px] border-collapse'>
              <thead>
                <tr className='bg-[#18b0c8] text-white'>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold text-left whitespace-nowrap w-[180px]'>
                    {t('date', 'Date')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold text-right whitespace-nowrap w-[100px]'>
                    {t('credit', 'Credit')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold text-right whitespace-nowrap w-[100px]'>
                    {t('debit', 'Debit')}
                  </th>
                  <th className='h-[35px] border-r border-[#ffffff40] p-2 text-[13px] font-bold text-right whitespace-nowrap w-[100px]'>
                    {t('balance', 'Balance')}
                  </th>
                  <th className='h-[35px] p-2 text-[13px] font-bold text-left whitespace-nowrap'>
                    {t('description', 'Description')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan='5' className='h-8 border-b border-[#eee] p-2 text-center'>
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
                        <td className='h-[35px] border-r border-b border-[#eee] px-2 text-[13px] font-bold text-right text-[#0e9d57]'>
                          {formatBalance(accountStatementSummary?.closingBalance)}
                        </td>
                        <td className='h-[35px] border-b border-[#eee] px-2 text-[13px] font-bold'>
                          Closing Balance
                        </td>
                      </tr>
                    )}
                    {filteredData.map((row, index) => (
                      <tr key={index} className='hover:bg-[#f1f1f1]'>
                        <td className='h-[35px] border-r border-b border-[#eee] px-2 text-[13px] text-left'>
                          {formatStatementDate(row.date)}
                        </td>
                        <td className={`h-[35px] border-r border-b border-[#eee] px-2 text-[13px] text-right ${row.credit > 0 ? 'text-[#0e9d57]' : ''}`}>
                          {formatMoney(row.credit)}
                        </td>
                        <td className={`h-[35px] border-r border-b border-[#eee] px-2 text-[13px] text-right ${row.debit > 0 ? 'text-[#e54b60]' : ''}`}>
                          {formatMoney(row.debit)}
                        </td>
                        <td className='h-[35px] border-r border-b border-[#eee] px-2 text-[13px] text-right font-bold text-[#0e9d57]'>
                          {formatBalance(row.balance)}
                        </td>
                        <td className='h-[35px] border-b border-[#eee] px-2 text-[13px] text-left text-[#333]'>
                          {row.type === 'bet' ? (
                            <span className='text-[#18b0c8] cursor-pointer hover:underline'>
                              {row.description}
                            </span>
                          ) : row.type === 'commission' ? (
                            <span className='text-[#18b0c8] cursor-pointer hover:underline'>
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
                    <td colSpan='5' className='h-8 border-b border-[#eee] p-2 text-center'>
                      {t('no_data_found', 'No data found')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredData.length > 0 && pagination?.pages > 0 && (
            <div className='mt-4 flex flex-col lg:flex-row items-center justify-between gap-3 text-sm text-[#555]'>
              <div>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} entries
              </div>
              <div className='flex items-center gap-0'>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className='bg-[#18b0c8] text-white px-3 py-1 text-[13px] disabled:opacity-70 disabled:cursor-not-allowed border border-[#18b0c8] rounded-l-[3px]'
                >
                  {t('previous', 'Prev')}
                </button>
                <button
                  disabled={true}
                  className='bg-[#18b0c8] text-white px-3 py-1 text-[13px] border-y border-[#18b0c8]'
                >
                  {page}
                </button>
                <button
                  disabled={page >= (pagination?.pages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                  className='bg-[#18b0c8] text-white px-3 py-1 text-[13px] disabled:opacity-70 disabled:cursor-not-allowed border border-[#18b0c8] rounded-r-[3px]'
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

export default AccountStatement;
