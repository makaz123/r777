import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';

const ProfitLoss = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [totalProfitLoss, setTotalProfitLoss] = useState(0);

  const formatNumber = (value) => Number(value || 0).toFixed(2);

  const loadReport = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (startDate) {
        query.append('startDate', new Date(startDate).toISOString().split('T')[0]);
      }
      if (endDate) {
        query.append('endDate', new Date(endDate).toISOString().split('T')[0]);
      }
      query.append('groupByMarket', 'true');

      const res = await api.get(`/user/profit-loss/history?${query.toString()}`, {
        withCredentials: true,
      });

      const data = res.data?.data?.report || [];
      const total = res.data?.data?.total?.myProfit || 0;
      setReportData(data);
      setTotalProfitLoss(Number(total));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setReportData([]);
    setTotalProfitLoss(0);
  };

  useEffect(() => {
    loadReport();
  }, []);

  const menuItems = [
    { name: 'Account Statement', path: '/AccountStatement' },
    { name: 'Profit Loss Report', path: '/ProfitLoss' },
    { name: 'Bet History', path: '/betlist' },
    { name: 'Unsettled Bet', path: '/unsettled-bet' }, // Assuming path
    { name: 'Set Button Value', path: '/set-button-value' }, // Assuming path
    { name: 'Rules', path: '/rules' }, // Assuming path
    { name: 'Change Password', path: '/ChangePassword' },
    { name: 'Results', path: '/Results' }, // Assuming path
    { name: 'Logout', path: '/logout', icon: true }, // Assuming path
  ];

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen bg-[#e0e0e0] font-sans">
        {/* Sidebar */}
        <div className="w-[200px] flex-shrink-0 bg-white">
          <div className="bg-[#1e88e5] px-3 py-2 text-white font-bold text-[14px]">
            Main Menu
          </div>
          <div className="border border-gray-300">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-3 py-2 text-[13px] border-b border-gray-300 flex items-center gap-2 ${
                  location.pathname === item.path
                    ? 'bg-[#e0f2f1] font-bold text-[#00695c]'
                    : 'hover:bg-gray-100 text-[#333]'
                }`}
              >
                {/* Dummy icon space for visual match */}
                {item.icon ? (
                  <span className="text-red-500 font-bold">{'->]'}</span>
                ) : (
                  <span className="w-4 h-4 bg-gray-200 inline-block rounded-sm"></span>
                )}
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-2">
          <div className="bg-white border border-gray-300 shadow-sm">
            {/* Header */}
            <div className="bg-[#008ba3] px-3 py-1.5 text-white font-bold text-[14px]">
              Profit & Loss Report
            </div>

            {/* Filters */}
            <div className="p-3 border-b border-gray-200 flex flex-wrap items-center gap-2 bg-[#f5f5f5]">
              <input
                type="datetime-local"
                className="border border-gray-300 rounded px-2 py-1 text-[13px] w-[200px] outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="datetime-local"
                className="border border-gray-300 rounded px-2 py-1 text-[13px] w-[200px] outline-none"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <button
                onClick={loadReport}
                disabled={loading}
                className="bg-[#38a3a5] hover:bg-[#2c7a7b] text-white px-4 py-1 rounded shadow-sm text-[13px] transition-colors"
              >
                {loading ? '...' : 'Go'}
              </button>
              <button
                onClick={resetFilters}
                className="bg-[#38a3a5] hover:bg-[#2c7a7b] text-white px-4 py-1 rounded shadow-sm text-[13px] transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#008ba3] text-white">
                    <th className="border-r border-white/20 px-3 py-1.5 text-left font-bold w-1/4">
                      Sport
                    </th>
                    <th className="border-r border-white/20 px-3 py-1.5 text-left font-bold w-1/2">
                      Market Name
                    </th>
                    <th className="px-3 py-1.5 text-right font-bold w-1/4">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="border-r border-gray-200 px-3 py-2 text-[#333]">
                        {row.gameName}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 text-[#333]">
                        {row.marketName}
                      </td>
                      <td className={`px-3 py-2 text-right ${row.myProfit >= 0 ? 'text-[#008000]' : 'text-[#ff0000]'}`}>
                        {formatNumber(row.myProfit)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold border-b border-gray-200">
                    <td className="border-r border-gray-200 px-3 py-2 text-[#333]" colSpan={2}>
                      Total
                    </td>
                    <td className={`px-3 py-2 text-right ${totalProfitLoss >= 0 ? 'text-[#008000]' : 'text-[#ff0000]'}`}>
                      {formatNumber(totalProfitLoss)}
                    </td>
                  </tr>
                  {reportData.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfitLoss;
