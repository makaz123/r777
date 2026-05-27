import { Fragment } from 'react';
import { motion } from 'framer-motion';
import {
  getMasterBookCellDisplay,
  hasMasterBookDownline,
  getMasterBookBreakdown,
} from '../utils/masterBookUtils';

const MasterBookModal = ({
  open,
  onClose,
  marketName = '',
  teamHeaders = [],
  rows = [],
  loading = false,
  breadcrumbPath = [],
  onBreadcrumbClick,
  onUsernameClick,
  overlayClassName = 'modal-overlay1 fixed top-10 left-[25%] z-[9999] h-full',
  modalClassName = 'modal-content h-fit w-[90%] rounded-lg bg-white shadow-lg ',
}) => {
  if (!open) return null;

  const colSpan = Math.max(2 + teamHeaders.length, 3);
  const viewerPartnership = breadcrumbPath.length > 0 
    ? Number(breadcrumbPath[breadcrumbPath.length - 1]?.partnership || 0) 
    : 0;

  return (
    <div className={overlayClassName}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4 }}
        className={modalClassName}
      >
        <div className='bg-gradient-to-b from-[#5ecbdd] to-[#146578] flex items-center justify-between border-b leading-none px-4 text-white'>
          <span className='font-semibold text-[18px]'>
            User Master Book
            {marketName ? ` - ${marketName}` : ''}
          </span>
          <span className='cursor-pointer text-2xl text-gray-300' onClick={onClose}>
            ×
          </span>
        </div>

        <div className='px-9 pb-8 bg-[#f0f8ff]'>
          <div className='flex flex-wrap items-center gap-1 py-2 text-[18px]'>
            <span className='text-gray-700'>User :</span>
            {breadcrumbPath.length > 0 ? (
              breadcrumbPath.map((crumb, index) => {
                const isLast = index === breadcrumbPath.length - 1;
                const isClickable = !isLast && onBreadcrumbClick;

                return (
                  <Fragment key={crumb.id || `${crumb.userName}-${index}`}>
                    {index > 0 && (
                      <span className='text-gray-500 select-none text-[12px] font-bold'>{'>'}</span>
                    )}
                    {isClickable ? (
                      <button
                        type='button'
                        className='text-blue-600 hover:underline text-[14px]'
                        onClick={() => onBreadcrumbClick(index)}
                      >
                        {crumb.userName}
                      </button>
                    ) : (
                      <span className={isLast ? 'font-medium text-gray-900' : ''}>
                        {crumb.userName}
                      </span>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <span className='font-medium text-gray-900'>—</span>
            )}
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse'>
              <thead>
                <tr className='bg-[#016a82] text-center text-sm text-white'>
                  <th className='border-r border-white p-2 text-left font-normal'>No.</th>
                  <th className='border-r border-white p-2 text-left font-normal'>Username</th>
                  {teamHeaders.map((team, idx) => (
                    <th
                      key={idx}
                      className='border-r border-white last:border-r-0 p-2 text-left font-normal whitespace-nowrap'
                    >
                      {team}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={colSpan} className='p-4 text-center'>
                      Loading...
                    </td>
                  </tr>
                )}

                {!loading && rows.length > 0 ? (
                  rows.map((item, index) => {
                    const canDrillDown = hasMasterBookDownline(item);

                    return (
                      <Fragment key={item.id ?? index}>
                        <tr className='text-sm border border-gray-200'>
                          <td className='border-r border-gray-200 p-2'>{index + 1}</td>
                          <td
                            className={`border-r border-gray-200 p-2 ${
                              canDrillDown
                                ? 'cursor-pointer text-blue-600 hover:underline'
                                : ''
                            }`}
                            onClick={() => {
                              if (canDrillDown) {
                                onUsernameClick?.(item.id, item.userName);
                              }
                            }}
                          >
                            {item.userName}
                          </td>
                          {teamHeaders.map((team, i) => {
                            const { total } = getMasterBookBreakdown(item, team, viewerPartnership);

                            return (
                              <td
                                key={i}
                                className='border-r border-gray-200 last:border-r-0 p-2 text-right font-bold'
                              >
                                <span className={total.class}>{total.value}</span>
                              </td>
                            );
                          })}
                        </tr>
                        <tr className='bg-[#ced7df] border-b border-gray-200'>
                          <td className='border-r border-gray-200 p-2'></td>
                          <td className='border-r border-gray-200 p-2 font-bold'>Total</td>
                          {teamHeaders.map((team, i) => {
                            const { total } = getMasterBookBreakdown(item, team, viewerPartnership);
                            return (
                              <td key={i} className='border-r border-gray-200 last:border-r-0 p-2 text-right font-bold'>
                                <span className={total.class}>{total.value}</span>
                              </td>
                            );
                          })}
                        </tr>
                        <tr className='bg-[#ced7df] border-b border-gray-200'>
                          <td className='border-r border-gray-200 p-2'></td>
                          <td className='border-r border-gray-200 p-2 font-bold'>Up Line</td>
                          {teamHeaders.map((team, i) => {
                            const { upline } = getMasterBookBreakdown(item, team, viewerPartnership);
                            return (
                              <td key={i} className='border-r border-gray-200 last:border-r-0 p-2 text-right font-bold'>
                                <span className={upline.class}>{upline.value}</span>
                              </td>
                            );
                          })}
                        </tr>
                        <tr className='bg-[#ced7df]'>
                          <td className='border-r border-gray-200 p-2'></td>
                          <td className='border-r border-gray-200 p-2 font-bold'>P/L</td>
                          {teamHeaders.map((team, i) => {
                            const { pl } = getMasterBookBreakdown(item, team, viewerPartnership);
                            return (
                              <td key={i} className='border-r border-gray-200 last:border-r-0 p-2 text-right font-bold'>
                                <span className={pl.class}>{pl.value}</span>
                              </td>
                            );
                          })}
                        </tr>
                      </Fragment>
                    );
                  })
                ) : (
                  !loading && (
                    <tr>
                      <td colSpan={colSpan} className='py-4 text-center'>
                        No data available
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MasterBookModal;
