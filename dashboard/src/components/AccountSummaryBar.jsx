import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

const MetricTooltipRow = ({
  label,
  tooltip,
  children,
  alignTooltip = 'center',
}) => (
  <p className='group relative block w-fit'>
    <span className='relative inline-block cursor-help'>
      <span className='text-white/90'>{label}</span>
      <span
        className={`pointer-events-none absolute top-full z-[100] mt-2 hidden w-max min-w-[220px] max-w-[300px] group-hover:block ${
          alignTooltip === 'right'
            ? 'right-0 translate-x-0'
            : alignTooltip === 'left'
              ? 'left-0'
              : 'left-1/2 -translate-x-1/2'
        }`}
      >
        <span className='relative block rounded-md bg-black px-3 py-2.5 text-center text-xs leading-snug text-white shadow-xl'>
          <span
            className='absolute -top-1.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[7px] border-x-transparent border-b-black'
            aria-hidden
          />
          {tooltip}
        </span>
      </span>
    </span>
    {children}
  </p>
);

const AccountSummaryBar = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { userInfo, downlineViewer } = useSelector((state) => state.auth);

  if (location.pathname === '/login' || !userInfo) {
    return null;
  }

  const formatMoney = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return '0.00';
    return n.toFixed(2);
  };

  const plColorClass = (v) =>
    Number(v) >= 0 ? 'text-green-400' : 'text-red-400';

  const summary = userInfo?.accountSummary;
  const roleDisplay =
    summary?.userType ||
    (userInfo?.role === 'white'
      ? 'White Label'
      : userInfo?.role?.charAt(0).toUpperCase() + userInfo?.role?.slice(1));

  return (
    <div className='relative z-20 w-full overflow-visible bg-[#016a82] text-sm text-white'>
      <div className='flex w-full items-center justify-center py-2'>
        <button
          type='button'
          aria-expanded={open}
          aria-label={open ? 'Collapse account summary' : 'Expand account summary'}
          onClick={() => setOpen((prev) => !prev)}
          className='flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#016a82] transition hover:bg-gray-100'
        >
          <FaChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {open && (
        <div className='px-4 pb-4 pt-0'>
          <div className='grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-5'>
            <div className='space-y-1'>
              <MetricTooltipRow label='User ID : ' tooltip='Your username.'>
                <span className='font-medium'>
                  {summary?.userId ?? userInfo?.userName}
                </span>
              </MetricTooltipRow>
              <MetricTooltipRow label='User Type : ' tooltip='Your user role.'>
                <span className='font-medium'>{roleDisplay}</span>
              </MetricTooltipRow>
            </div>

            <div className='space-y-1'>
              <MetricTooltipRow
                label='Given Bal : '
                tooltip='Aapko Upper Se Diya Gaya Balance.'
              >
                <span
                  className={plColorClass(
                    summary?.givenBal ?? userInfo?.creditReference
                  )}
                >
                  {formatMoney(
                    summary?.givenBal ?? userInfo?.creditReference ?? 0
                  )}
                </span>
              </MetricTooltipRow>
              <MetricTooltipRow
                label='Available : '
                tooltip='Aapke Client Ko Dene Ke Baad Bacha Hua Balance.'
              >
                <span
                  className={plColorClass(
                    summary?.available ?? userInfo?.avbalance
                  )}
                >
                  {formatMoney(summary?.available ?? userInfo?.avbalance ?? 0)}
                </span>
              </MetricTooltipRow>
            </div>

            <div className='space-y-1'>
              <MetricTooltipRow
                label='Up Line (dena) : '
                tooltip={
                  summary?.uplineTooltip ??
                  'Upper Level Ke Saath Hisab Ka Len-Den.'
                }
              >
                <span
                  className={plColorClass(
                    summary?.uplineDena ?? downlineViewer?.uplinePL ?? 0
                  )}
                >
                  {formatMoney(
                    summary?.uplineDena ?? downlineViewer?.uplinePL ?? 0
                  )}
                </span>
              </MetricTooltipRow>
              <MetricTooltipRow
                label='Down Line (dena) : '
                tooltip={
                  summary?.downlineTooltip ??
                  'Down Line Ke Saath Hisab Ka Len-Den.'
                }
              >
                <span
                  className={plColorClass(
                    summary?.downlineDena ??
                      downlineViewer?.totalPL ??
                      userInfo?.uplineBettingProfitLoss ??
                      0
                  )}
                >
                  {formatMoney(
                    summary?.downlineDena ??
                      downlineViewer?.totalPL ??
                      userInfo?.uplineBettingProfitLoss ??
                      0
                  )}
                </span>
              </MetricTooltipRow>
            </div>

            <div className='space-y-1'>
              <MetricTooltipRow
                label='Current P&L : '
                tooltip='Upline + Downline Ka Bina Settle Kiya Hua Profit & Loss Account.'
              >
                <span
                  className={plColorClass(
                    summary?.currentWeekPL ?? downlineViewer?.myPL ?? 0
                  )}
                >
                  {formatMoney(summary?.currentWeekPL ?? 0)}
                </span>
              </MetricTooltipRow>
              <MetricTooltipRow
                label='Exposure : '
                tooltip='Your current market exposure with all kind of games that your clients are playing currently.'
              >
                <span
                  className={plColorClass(
                    summary?.exposureDisplay ??
                      summary?.myShareExposure ??
                      0
                  )}
                >
                  {formatMoney(
                    summary?.exposureDisplay ??
                      summary?.myShareExposure ??
                      0
                  )}
                </span>
              </MetricTooltipRow>
            </div>

            <div className='space-y-1 md:col-span-1'>
              <MetricTooltipRow
                label='My P&L : '
                tooltip='Mera Profit & Loss Account.'
                alignTooltip='center'
              >
                <span
                  className={`font-semibold ${plColorClass(
                    summary?.myPLTillDate ?? downlineViewer?.myPL ?? 0
                  )}`}
                >
                  {formatMoney(
                    summary?.myPLTillDate ?? downlineViewer?.myPL ?? 0
                  )}
                </span>
              </MetricTooltipRow>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSummaryBar;
