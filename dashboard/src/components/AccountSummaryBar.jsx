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
        className={`pointer-events-none absolute top-full z-[100] mt-2 hidden w-max max-w-[300px] min-w-[220px] group-hover:block ${
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

  /** Down Line = Direct downlines net balance (partnership % applied). */
  const downlineAmount = Number(
    userInfo?.accountSummary?.downlineDena ??
      userInfo?.accountSummary?.downlineClientPL ??
      downlineViewer?.totalPL ??
      0
  );
  const uplineAmount = Number(
    userInfo?.accountSummary?.uplineSharePL ??
      userInfo?.accountSummary?.uplineDena ??
      downlineViewer?.uplinePL ??
      0
  );
  const weekPLAmount = Number(summary?.currentWeekPL ?? 0);

  const downlineLenDena =
    userInfo?.accountSummary?.downlineClientLenDena ??
    (downlineAmount > 0.005
      ? 'dena'
      : downlineAmount < -0.005
        ? 'lena'
        : 'clear');
  const uplineLenDena =
    userInfo?.accountSummary?.uplineLenDena ??
    (uplineAmount > 0.005 ? 'dena' : uplineAmount < -0.005 ? 'lena' : 'clear');

  const downlineTooltip =
    summary?.downlineTooltip ??
    (downlineLenDena === 'lena'
      ? 'Down Line: Direct downline accounts ka outstanding settlement balance — aapko lena hai.'
      : downlineLenDena === 'dena'
        ? 'Down Line: Direct downline accounts ka outstanding settlement balance — aapko dena hai.'
        : 'Down line settled — koi outstanding balance nahi.');

  const uplineTooltip =
    summary?.uplineTooltip ??
    (uplineLenDena === 'clear'
      ? 'Up line settled — koi outstanding upline partnership due nahi.'
      : uplineLenDena === 'dena'
        ? 'Upline partnership due (dena) — cash settlement reduces this amount.'
        : 'Upline partnership collectable (lena) — cash settlement reduces this amount.');

  const isClientRole = userInfo?.role === 'user';
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
          aria-label={
            open ? 'Collapse account summary' : 'Expand account summary'
          }
          onClick={() => setOpen((prev) => !prev)}
          className='flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white text-[#016a82] transition hover:bg-gray-100'
        >
          <FaChevronDown
            className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {open && (
        <div className='px-4 pt-0 pb-4'>
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
                tooltip={
                  isClientRole
                    ? 'Aapko Upper Se Diya Gaya Balance.'
                    : 'Aapne Niche Diya Gaya Balance.'
                }
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
              {!['supperadmin'].includes(
                userInfo?.role
              ) && (
                <>
                  <MetricTooltipRow
                    label={`Up Line (${uplineLenDena}) : `}
                    tooltip={uplineTooltip}
                  >
                    <span
                      className={
                        uplineLenDena === 'clear'
                          ? 'text-green-400'
                          : plColorClass(uplineAmount)
                      }
                    >
                      {formatMoney(uplineAmount)}
                    </span>
                  </MetricTooltipRow>
                </>
              )}
              <MetricTooltipRow
                label={`Down Line (${downlineLenDena}) : `}
                tooltip={summary?.downlineTooltip ?? downlineTooltip}
              >
                <span className={plColorClass(downlineAmount)}>
                  {formatMoney(downlineAmount)}
                </span>
              </MetricTooltipRow>
            </div>

            {isClientRole ? (
              <div className='space-y-1'>
                <MetricTooltipRow
                  label='Current P&L : '
                  tooltip='Available minus balance when exposure is zero.'
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
                  label='My Exposure : '
                  tooltip='Shows ONLY your percentage exposure (Total Exposure x My %)'
                >
                  <span
                    className={plColorClass(
                      summary?.exposureDisplay ?? summary?.myShareExposure ?? 0
                    )}
                  >
                    {formatMoney(
                      summary?.exposureDisplay ?? summary?.myShareExposure ?? 0
                    )}
                  </span>
                </MetricTooltipRow>
              </div>
            ) : (
              <div className='space-y-1'>
                <MetricTooltipRow
                  label='Week P&L : '
                  tooltip='Is week ka P/L. Jab Up Line aur Down Line dono clear hon, Week P&L bhi 0.'
                >
                  <span className={plColorClass(weekPLAmount)}>
                    {formatMoney(weekPLAmount)}
                  </span>
                </MetricTooltipRow>
                {/* <MetricTooltipRow
                  label='My Share : '
                  tooltip='Your partnership percentage share.'
                >
                  <span className='font-semibold text-blue-300'>
                    {summary?.mySharePercent ?? 0}%
                  </span>
                </MetricTooltipRow> */}
              </div>
            )}

            <div className='space-y-1 md:col-span-1'>
              <MetricTooltipRow
                label='Dashboard P&L : '
                tooltip='Shows ONLY your percentage (P x My % / 100). Lifetime betting P&L from downline.'
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
