import { useState, useMemo } from 'react';
import { BiSortAlt2 } from 'react-icons/bi';

const VirtualTable = ({
  data = [],
  columns = [],
  summaryRow = null,
  variant = 'default',
}) => {
  const [sortConfig, setSortConfig] = useState(null);
  const isClientList = variant === 'clientList';

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    const { key, direction } = sortConfig;
    const col = columns.find((c) => (c.sortKey || c.accessor) === key);

    return [...data].sort((a, b) => {
      const valA = col?.sortValue ? col.sortValue(a) : a[key];
      const valB = col?.sortValue ? col.sortValue(b) : b[key];

      if (valA == null) return 1;
      if (valB == null) return -1;

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, columns]);

  const handleSort = (col) => {
    const sortKey = col.sortKey || col.accessor;
    if (!sortKey) return;

    setSortConfig((prev) => {
      if (!prev || prev.key !== sortKey) {
        return { key: sortKey, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: sortKey, direction: 'desc' };
      }
      return null;
    });
  };

  const headerClass = 'border-b bg-[#016a82] text-white';

  const rowClass = isClientList
    ? 'odd:bg-white even:bg-[#f5f5f5]'
    : 'odd:bg-[#0000000d]';

  return (
    <div className='scrollbar-hide overflow-x-auto rounded-md'>
      <table className='w-[1500px] border-collapse text-[14px] md:w-full'>
        <thead className={headerClass}>
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                onClick={() => handleSort(col)}
                className={`border-r border-white/30 px-2 py-2.5 text-left text-sm font-semibold ${
                  col.sortKey || col.accessor ? 'cursor-pointer' : ''
                } ${col.align === 'right' ? 'text-right' : ''}`}
              >
                <span
                  className={`flex items-center ${col.align === 'right' ? 'justify-end' : ''}`}
                >
                  {col.header}
                  {(col.sortKey || col.accessor) && (
                    <span className='ml-1 flex text-white'>
                      <BiSortAlt2 size={18} />
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
          {summaryRow && (
            <tr className='border-b border-[#dee2e6] bg-white font-bold text-black'>
              {summaryRow.map((cell, i) => (
                <td
                  key={i}
                  className={`border border-[#dee2e6] px-2 py-2 ${
                    columns[i]?.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          )}
        </thead>

        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className='border border-[#dee2e6] py-6 text-center text-gray-600'
              >
                No Client found under your account.
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => (
              <tr key={row._id || rowIndex} className={rowClass}>
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className={`border border-[#dee2e6] p-2 leading-[16px] ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VirtualTable;
