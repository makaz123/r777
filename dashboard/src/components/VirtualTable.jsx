import { useState, useMemo } from 'react';
// import { FaSortUp, FaSortDown } from 'react-icons/fa';
import { BiSortAlt2 } from "react-icons/bi";
const VirtualTable = ({ data = [], columns = [] }) => {
  const [sortConfig, setSortConfig] = useState(null);

  // ✅ Sorting (Frontend only)
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    const { key, direction } = sortConfig;

    return [...data].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      // handle null / undefined safely
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // ✅ Sorting Click
  const handleSort = (col) => {
    if (!col.accessor) return;

    setSortConfig((prev) => {
      if (!prev || prev.key !== col.accessor) {
        return { key: col.accessor, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: col.accessor, direction: 'desc' };
      }
      return null;
    });
  };

  return (
    <div className='rounded-md'>
      <table className='w-full border-collapse'>
        {/* ✅ Header */}
        <thead className='border-b bg-[#016a82] text-white'>
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                onClick={() => handleSort(col)}
                className='cursor-pointer border-r border-white px-2 py-2 text-sm'
              >
                <span className='flex items-center'>
                  {col.header}
                  {/* Sort Icon */}
                  {col.accessor && (
                    <span className='ml-1 flex'>
                        <BiSortAlt2 size={18}/>
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {/* ✅ Body */}
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className='py-4 text-center'>
                No Client found under your account.
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => (
              <tr
                key={row._id || rowIndex}
                className='cursor-pointer odd:bg-[#0000000d]'
              >
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className={`p-2 text-sm border border-[#dee2e6] ${
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
