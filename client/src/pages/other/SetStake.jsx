import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { updateQuickStakes } from '../../redux/reducer/authReducer';
import { useTranslation } from '../../context/LanguageContext';

const DEFAULT_VALUES = [100, 500, 1000, 5000, 10000, 50000];

function formatButtonName(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return '';
  if (n >= 100000) return `${n / 100000}L`;
  if (n >= 1000) return `${n / 1000}k`;
  return String(n);
}

function buildRowsFromUser(quickStakes) {
  if (!Array.isArray(quickStakes) || quickStakes.length === 0) {
    return DEFAULT_VALUES.map((value, index) => ({
      id: index + 1,
      name: formatButtonName(value),
      value,
    }));
  }

  const rows = quickStakes.slice(0, 6).map((item, index) => {
    if (typeof item === 'object' && item != null) {
      const value = Number(item.value) || DEFAULT_VALUES[index] || 100;
      const name =
        (item.label && String(item.label).trim()) || formatButtonName(value);
      return { id: index + 1, name, value };
    }
    const value = Number(item) || DEFAULT_VALUES[index] || 100;
    return { id: index + 1, name: formatButtonName(value), value };
  });

  while (rows.length < 6) {
    const value = DEFAULT_VALUES[rows.length] ?? 100;
    rows.push({
      id: rows.length + 1,
      name: formatButtonName(value),
      value,
    });
  }

  return rows;
}

function SetStake() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { userInfo, loading } = useSelector((state) => state.auth);
  const [rows, setRows] = useState(() => buildRowsFromUser(null));

  useEffect(() => {
    if (userInfo?.quickStakes) {
      setRows(buildRowsFromUser(userInfo.quickStakes));
    }
  }, [userInfo?.quickStakes]);

  const handleChange = (index, field, raw) => {
    setRows((prev) => {
      const next = [...prev];
      if (field === 'value') {
        const num = Number(raw) || 0;
        next[index] = { ...next[index], value: num };
      } else {
        next[index] = { ...next[index], name: raw };
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const items = rows.map((row) => ({
      label: String(row.name).trim(),
      value: Number(row.value),
    }));

    if (items.some((i) => !i.label || !i.value || i.value <= 0)) {
      toast.error('All stakes must have a button name and a positive value');
      return;
    }

    try {
      const res = await dispatch(
        updateQuickStakes({ quickStakes: items })
      ).unwrap();
      toast.success(res.message || 'Stakes updated successfully');
    } catch (err) {
      toast.error(err?.message || 'Failed to update stakes');
    }
  };

  return (
    <div className='w-full p-0.5'>
      <div className='w-full border border-[#00000020] bg-white shadow-[0_0_5px_#a4a4a4]'>
        <div className='bg-[#18adc5] px-[7px] py-1.5'>
          <h4 className='text-[14px] font-bold text-white'>{t('set_stake', 'Set Stake')}</h4>
        </div>

        <form onSubmit={handleSubmit} className='p-2'>
          <table className='w-full border-collapse text-[14px] text-[#333]'>
            <thead>
              <tr className='border-b border-[#dbdbdb] bg-[#f5f5f5]'>
                <th className='w-[60px] border border-[#dbdbdb] px-2 py-1.5 text-left font-semibold'>
                  {t('id', 'ID')}
                </th>
                <th className='border border-[#dbdbdb] px-2 py-1.5 text-left font-semibold'>
                  {t('button_name', 'Button Name')}
                </th>
                <th className='border border-[#dbdbdb] px-2 py-1.5 text-left font-semibold'>
                  {t('button_value', 'Button Value')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td className='border border-[#dbdbdb] px-2 py-1 text-center'>
                    {row.id}
                  </td>
                  <td className='border border-[#dbdbdb] p-1'>
                    <input
                      type='text'
                      value={row.name}
                      onChange={(e) =>
                        handleChange(index, 'name', e.target.value)
                      }
                      className='w-full border border-[#dbdbdb] px-1 py-0.5 outline-none'
                    />
                  </td>
                  <td className='border border-[#dbdbdb] p-1'>
                    <input
                      type='number'
                      min={1}
                      value={row.value}
                      onChange={(e) =>
                        handleChange(index, 'value', e.target.value)
                      }
                      className='w-full border border-[#dbdbdb] px-1 py-0.5 outline-none'
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type='submit'
            disabled={loading}
            className='mt-3 rounded-sm bg-[#18adc5] px-6 py-1.5 text-[14px] font-semibold text-white hover:bg-[#159bb0] disabled:opacity-60'
          >
            {loading ? t('submitting', 'Submitting...') : t('submit', 'Submit')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SetStake;
