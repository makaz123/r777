'use client';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  FaBan,
  FaCheckCircle,
  FaLock,
  FaRegArrowAltCircleUp,
  FaRegFilePdf,
} from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAdmin,
  setCurrentPage,
  updateCreditReference,
  getAllOnlyUserAndDownline,
  withdrawalAndDeposite,
  userSetting,
  getCreditRefHistory,
  updateExploserLimit,
  changePasswordByDownline,
} from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AiOutlineFileExcel } from 'react-icons/ai';

import VirtualTable from '../components/VirtualTable';
export default function AgentLIst() {
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text('User List', 14, 15);

    const filteredUsers = onlyusers.filter((user) =>
      activeTab === 'active'
        ? user.status === 'active'
        : user.status !== 'active'
    );

    const tableData = filteredUsers.map((user) => [
      user.userName,
      user.creditReference || '-',
      user.balance || 0,
      user.exposure || 0,
      user.exposureLimit || 0,
      user.avbalance || 0,
      user.bettingProfitLoss || 0,
      user.status,
    ]);

    autoTable(doc, {
      head: [
        [
          'Username',
          'Credit Ref.',
          'Balance',
          'Exposure',
          'Exposure Limit',
          'Avail. Bal.',
          'Ref. P/L',
          'Status',
        ],
      ],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 136, 204] },
    });

    doc.save(`${activeTab}-users.pdf`);
  };
  const downloadExcel = () => {
    const filteredUsers = onlyusers.filter((user) =>
      activeTab === 'active'
        ? user.status === 'active'
        : user.status !== 'active'
    );

    const tableData = filteredUsers.map((user) => ({
      Username: user.userName,
      'Credit Ref.': user.creditReference || '-',
      Balance: user.balance || 0,
      Exposure: user.exposure || 0,
      'Exposure Limit': user.exposureLimit || 0,
      'Avail. Bal.': user.avbalance || 0,
      'Ref. P/L': user.bettingProfitLoss || 0,
      Status: user.status,
    }));

    // Convert JSON to worksheet
    const worksheet = XLSX.utils.json_to_sheet(tableData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    // Save file
    const fileData = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(fileData, `${activeTab}-users.xlsx`);
  };

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo, currentPage, totalPages, onlyusers } = useSelector(
    (state) => state.auth
  );
  const { id } = useParams();
  const [entries, setEntries] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [creditPopup, setCreditPopup] = useState(false);
  const [patnerPopup, setPatnerPopup] = useState(false);
  const [depositPopup, setDepositPopup] = useState(false);
  const [withdrawPopup, setWithdrawPopup] = useState(false);
  const [settingPopup, setSettingPopup] = useState(false);
  const [currentUser, setcurrentUser] = useState(null);
  const [isFetchingAllUsers, setIsFetchingAllUsers] = useState(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showMetricsOpen, setShowMetricsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [passwordPopup, setPasswordPopup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [type, setType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    userName: '',
    accountType: 'user',
    commition: '',
    balance: null,
    exposureLimit: null,
    creditReference: null,
    rollingCommission: null,
    partnership: null,
    phone: null,
    password: '',
    masterPassword: '',
    status: 'active',
    confirmPassword: '',
  });

  useEffect(() => {
    dispatch(getAdmin());
  }, [dispatch]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      dispatch(setCurrentPage(newPage));
    }
  };

  const handleWithdwalDeposite = async (e) => {
    e.preventDefault();
    try {
      const data = await dispatch(
        withdrawalAndDeposite({ formData, userId: currentUser._id, type })
      ).unwrap();
      toast.success(data.message);
      dispatch(
        getAllOnlyUserAndDownline({
          page: currentPage,
          limit: entries,
          searchQuery,
        })
      );
      dispatch(getAdmin());
      setDepositPopup(false);
      setWithdrawPopup(false);
    } catch (error) {
      toast.error(error);
    }
  };

  const handleSetting = async (e) => {
    e.preventDefault();
    try {
      const result = await dispatch(
        userSetting({
          userId: currentUser._id,
          status: formData.status,
          masterPassword: formData.masterPassword,
        })
      ).unwrap();
      toast.success(result.message);
      setSettingPopup(false);
      dispatch(
        getAllOnlyUserAndDownline({
          page: currentPage,
          limit: entries,
          searchQuery,
        })
      );
    } catch (error) {
      toast.error(error);
    }
  };

  const handleUpdateCredit = async (e) => {
    e.preventDefault();
    try {
      const data = await dispatch(
        updateCreditReference({ formData, userId: currentUser._id })
      ).unwrap();
      toast.success(data.message);
      setCreditPopup(false);
      dispatch(
        getAllOnlyUserAndDownline({
          page: currentPage,
          limit: entries,
          searchQuery,
        })
      );
    } catch (error) {
      toast.error(error);
    }
  };

  const handleUpdateExploserLimit = async (e) => {
    e.preventDefault();
    try {
      const data = await dispatch(
        updateExploserLimit({ formData, userId: currentUser._id })
      ).unwrap();
      toast.success(data.message);
      setPatnerPopup(false);
      dispatch(
        getAllOnlyUserAndDownline({
          page: currentPage,
          limit: entries,
          searchQuery,
        })
      );
    } catch (error) {
      toast.error(error);
    }
  };

  useEffect(() => {
    setIsFetchingAllUsers(true);
    dispatch(
      getAllOnlyUserAndDownline({
        page: currentPage,
        limit: entries,
        searchQuery,
      })
    );
  }, [dispatch, currentPage, entries, searchQuery]);

  const formatNumber = (v) => {
    const num = Math.abs(Number(v));
    if (isNaN(num)) return 0;
    return Number.isInteger(num)
      ? num
      : num.toFixed(v.toString().split('.')[1]?.length === 1 ? 1 : 2);
  };

  const reloadPage = () => {
    window.location.reload();
  };

  const handleChangePassword = async () => {
    if (!currentUser?._id) {
      toast.error('Please select a user first.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Password not match.');
      return;
    }

    if (!formData.masterPassword) {
      toast.error('Please enter master password.');
      return;
    }

    try {
      const result = await dispatch(
        changePasswordByDownline({
          id: currentUser._id,
          masterPassword: formData.masterPassword,
          newPassword,
        })
      ).unwrap();

      toast.success(result.message);
      setPasswordPopup(false);
      setNewPassword('');
      setConfirmPassword('');
      setFormData({ ...formData, masterPassword: '' });
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <>
      <Navbar
        onLogoClick={() => setShowMetrics(true)}
        onNavClick={() => setShowMetrics(false)}
      />

      {showMetrics && (
        <div className='bg-[#2c3e50] p-5 text-white'>
          <div className='flex w-full items-center justify-center'>
            <FaRegArrowAltCircleUp
              size={20}
              onClick={() => setShowMetricsOpen((prev) => !prev)}
              className={showMetricsOpen ? 'rotate-180' : ''}
            />
          </div>

          {showMetricsOpen && (
            <div className='mt-3 grid grid-cols-3 gap-2'>
              <div className='col-span-1 flex justify-between px-5'>
                <div className='flex-1/2'>Total Balance</div>
                <div className='flex-1/2'>
                  INR {formatNumber(userInfo?.totalBalance)}
                </div>
              </div>
              <div className='col-span-1 flex justify-between px-5'>
                <div className='flex-1/2'>Total Exposure</div>
                <div className='flex-1/2'>
                  ({formatNumber(userInfo?.exposure)})
                </div>
              </div>
              <div className='col-span-1 flex justify-between px-5'>
                <div className='flex-1/2'>Available Balance</div>
                <div className='flex-1/2'>
                  {formatNumber(userInfo?.agentAvbalance)}
                </div>
              </div>
              <div className='col-span-1 flex justify-between px-5'>
                <div className='flex-1/2'>Balance</div>
                <div className='flex-1/2'>
                  {formatNumber(userInfo?.avbalance || 0)}
                </div>
              </div>
              <div className='col-span-1 flex justify-between px-5'>
                <div className='flex-1/2'>Total Avail. bal.</div>
                <div className='flex-1/2'>
                  {formatNumber(userInfo?.totalAvbalance)}
                </div>
              </div>
              <div className='col-span-1 flex justify-between px-5'>
                <div className='flex-1/2'>Upline P/L</div>
                <div className='flex-1/2'>
                  ({formatNumber(userInfo?.uplineBettingProfitLoss)})
                </div>
              </div>
            </div>
          )}

          {/* <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
              <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
                Total Balance
              </div>
              <div className='text-[15px] font-semibold'>
                INR {formatNumber(userInfo?.totalBalance)}
              </div>
            </div>
            <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
              <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
                Total Exposure
              </div>
              <div className='text-[15px] font-semibold'>
                INR{' '}
                <span className='text-red-600'>
                  ({formatNumber(userInfo?.exposure)})
                </span>
              </div>
            </div>
            <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
              <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
                Available Balance
              </div>
              <div className='text-[15px] font-semibold'>
                INR {formatNumber(userInfo?.agentAvbalance)}
              </div>
            </div>
            <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
              <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
                Balance
              </div>
              <div className='text-[15px] font-semibold'>
                INR {formatNumber(userInfo?.avbalance || 0)}
              </div>
            </div>
            <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
              <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
                Total Avail. bal.
              </div>
              <div className='text-[15px] font-semibold'>
                INR {formatNumber(userInfo?.totalAvbalance)}
              </div>
            </div>
            <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
              <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
                Upline P/L
              </div>
              <div className='text-[15px] font-semibold'>
                INR{' '}
                <span
                  className={`${
                    userInfo.uplineBettingProfitLoss <= 0
                      ? 'text-red-500'
                      : 'text-green-500'
                  }`}
                >
                  ({formatNumber(userInfo?.uplineBettingProfitLoss)})
                </span>
              </div>
            </div> */}
        </div>
      )}

      <div className='h-fit bg-[#f9f9f9] p-1 px-[15px] md:px-7.5'>
        <div className='my-[13px] flex items-center justify-between'>
          <div className='grid'>
            <div className='text-[20px]'>Client List</div>
            <div className='flex items-center'>
              <input
                type='text'
                className='rounded border border-gray-300 bg-white px-2 py-1 h-fit'
                placeholder='Search...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className='flex w-fit cursor-pointer items-center gap-0.5 rounded-sm bg-red-700 px-2  text-white'
                onClick={downloadPDF}>
                <FaRegFilePdf className='size-4' /> PDF
              </div>
              <div className='flex w-fit cursor-pointer items-center gap-0.5 rounded-sm bg-green-700 px-2  text-white'
                onClick={downloadExcel}>
                <AiOutlineFileExcel className='size-4' /> Excel
              </div>
            </div>
          </div>

          <div className='flex'>
            <div className='mb-2 flex items-center justify-center text-[#333] md:mb-0'>
              <span className='mr-2'>Show</span>
              <select className='rounded border border-gray-300 px-2 py-1'
                value={entries}
                onChange={(e) => setEntries(Number(e.target.value))}>
                <option value='10'>10</option>
                <option value='20'>20</option>
                <option value='50'>50</option>
                <option value='100'>100</option>
                <option value='500'>500</option>
              </select>
              <span className='ml-2'>entries</span>
            </div>

            <button className='flex items-center gap-1 rounded border border-gray-300 bg-[#0088cc] px-[15px] text-[12px] leading-[30px] font-bold text-white'
              onClick={() => navigate('/agent-download-list/insertagent')}>
                Add Client Account
            </button>
            <button className='flex items-center gap-1 rounded border border-gray-300 bg-[#0088cc] px-[15px] text-[12px] leading-[30px] font-bold text-white'
              onClick={() => navigate('/agent-download-list/insertagent')}>
              Inactive List
            </button>

          </div>



          
          
        </div>



        <div className='flex border-b border-gray-300'>
          <div
            className={`cursor-pointer px-4 py-2 ${activeTab === 'active' ? 'border border-gray-300 border-b-white bg-white text-gray-600' : 'text-[#0088cc]'}`}
            onClick={() => setActiveTab('active')}
          >
            Active Users
          </div>
          <div
            className={`cursor-pointer px-4 py-2 ${activeTab === 'deactive' ? 'border border-gray-300 border-b-white bg-white text-gray-600' : 'text-[#0088cc]'}`}
            onClick={() => setActiveTab('deactive')}
          >
            Deactive Users
          </div>
        </div>

        <div className='flex space-x-2'>
          
        </div>

        {/* Main content area with table */}
        {/* Table */}

        <VirtualTable
          data={onlyusers.filter((user) =>
            activeTab === 'active'
              ? user.status === 'active'
              : user.status !== 'active'
          )}
          columns={[
            {
              header: 'Username',
              accessor: 'userName',
              cell: (row) => (
                <span className='block w-fit rounded-[3px] bg-[#444] px-2 py-[1px] text-[14px] text-white uppercase'>
                  {row.userName}
                </span>
              ),
            },
            {
              header: 'Credit Ref.',
              accessor: 'creditReference',
              align: 'right',
              cell: (row) => row.creditReference,
            },
            {
              header: 'Balance',
              accessor: 'balance',
              align: 'right',
              cell: (row) => row.balance || 0,
            },
            {
              header: 'Exposure',
              accessor: 'exposure',
              align: 'right',
              cell: (row) => row.exposure,
            },
            {
              header: 'Exposure Limit',
              accessor: 'exposureLimit',
              align: 'right',
              cell: (row) => row.exposureLimit || 0,
            },
            {
              header: 'Avail. Bal.',
              accessor: 'avbalance',
              align: 'right',
              cell: (row) => row.avbalance || 0,
            },
            {
              header: 'Ref. P/L',
              accessor: 'creditReferenceProfitLoss',
              align: 'right',
              cell: (row) =>
                Number(row.bettingProfitLoss) +
                Number(row.creditReferenceProfitLoss),
            },
            {
              header: 'Account Type',
              accessor: 'role',
              cell: (row) => row.role,
            },
            {
              header: 'Actions',
              accessor: 'action',
              cell: (row) =>
                isFetchingAllUsers ? (
                  <div className='flex gap-1'>
                    <span
                      className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                      onClick={() => {
                        setDepositPopup(true);
                        setcurrentUser(row);
                      }}
                    >
                      D
                    </span>
                    <span
                      className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                      onClick={() => {
                        setWithdrawPopup(true);
                        setcurrentUser(row);
                      }}
                    >
                      W
                    </span>
                    <span
                      className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                      onClick={() => {
                        setPatnerPopup(true);
                        setcurrentUser(row);
                      }}
                    >
                      L
                    </span>
                    <span
                      className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                      onClick={() => {
                        setCreditPopup(true);
                        setcurrentUser(row);
                      }}
                    >
                      C
                    </span>
                    <span
                      className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                      onClick={() => {
                        setPasswordPopup(true);
                        setcurrentUser(row);
                      }}
                    >
                      P
                    </span>
                    <span
                      className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                      onClick={() => {
                        setSettingPopup(true);
                        setcurrentUser(row);
                      }}
                    >
                      S
                    </span>
                  </div>
                ) : null,
            },
          ]}
        />

        {/* Pagination */}
        <div className='mt-4 flex flex-col justify-between gap-3 text-[13px] md:flex-row md:items-center'>
          <div>
            Showing {currentPage} to {totalPages} of {onlyusers?.length} entries
          </div>
          <div className='flex flex-wrap'>
            {/* First Button */}
            <button
              className='pgBtn px-[13px] py-[6.5px]'
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              First
            </button>

            {/* Previous Button */}
            <button
              className='pgBtn ml-[2px] px-[13px] py-[6.5px]'
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            {/* Page Numbers */}
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                className={`ml-[2px] rounded-[2px] border border-[#0088cc] px-[13px] py-[6.5px] leading-none ${
                  currentPage === i + 1 ? 'bg-[#0088cc] text-white' : 'pgBtn'
                }`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            {/* Next Button */}
            <button
              className='pgBtn ml-[2px] px-[13px] py-[6.5px]'
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>

            {/* Last Button */}
            <button
              className='pgBtn ml-[2px] px-[13px] py-[6.5px]'
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </button>
          </div>
        </div>

        {/* Credit reference popup */}
        {creditPopup && (
          <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Credit</span>
                <button
                  onClick={() => setCreditPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-[#0088cc] text-xl text-white'
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateCredit}>
                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Old Credit</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                        value={currentUser.creditReference}
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>New Credit</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            creditReference: e.target.value,
                          })
                        }
                        value={formData.creditReference}
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Master Password</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='password'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            masterPassword: e.target.value,
                          })
                        }
                        value={formData.masterPassword}
                      />
                    </div>
                  </div>
                </div>

                <div className='flex justify-end gap-2 px-[15px]'>
                  <button
                    className='cursor-pointer rounded-sm bg-gray-800 px-3 py-2 text-white'
                    onClick={() => setCreditPopup(false)}
                  >
                    BACK
                  </button>
                  <button className='cursor-pointer rounded-sm bg-[#0088cc] px-3 py-2 text-white'>
                    submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* exposure limit popup */}
        {patnerPopup && (
          <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Exposure Limit</span>
                <button
                  onClick={() => setPatnerPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-[#0088cc] text-xl text-white'
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateExploserLimit}>
                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Old Limit</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                        value={currentUser.exposureLimit}
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>New Limit</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            exposureLimit: e.target.value,
                          })
                        }
                        value={formData.exposureLimit}
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Master Password</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='password'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            masterPassword: e.target.value,
                          })
                        }
                        value={formData.masterPassword}
                      />
                    </div>
                  </div>
                </div>

                <div className='flex justify-end gap-2 px-[15px]'>
                  <button
                    className='cursor-pointer rounded-sm bg-gray-800 px-3 py-2 text-white'
                    onClick={() => setPatnerPopup(false)}
                  >
                    BACK
                  </button>
                  <button className='cursor-pointer rounded-sm bg-[#0088cc] px-3 py-2 text-white'>
                    submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* deposit popup */}
        {depositPopup && (
          <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Deposit</span>
                <button
                  onClick={() => setDepositPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-[#0088cc] text-xl text-white'
                >
                  ×
                </button>
              </div>
              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>{userInfo.userName}</div>
                <div className='col-span-2 flex'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={userInfo.avbalance}
                      readOnly
                    />
                  </div>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={userInfo.avbalance - formData.balance}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>
                  {currentUser.userName}
                </div>
                <div className='col-span-2 flex'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={currentUser.avbalance}
                      readOnly
                    />
                  </div>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={
                        currentUser.avbalance + Number(formData.balance || 0)
                      }
                      readOnly
                    />
                  </div>
                </div>
              </div>
              <form onSubmit={handleWithdwalDeposite}>
                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Amount</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        onChange={(e) =>
                          setFormData({ ...formData, balance: e.target.value })
                        }
                        value={formData.balance}
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Remark</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <textarea
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            remark: e.target.value,
                          })
                        }
                        value={formData.remark}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Master Password</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='password'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            masterPassword: e.target.value,
                          })
                        }
                        value={formData.masterPassword}
                      />
                    </div>
                  </div>
                </div>

                <div className='flex justify-end gap-2 px-[15px]'>
                  <button
                    className='cursor-pointer rounded-sm bg-gray-800 px-3 py-2 text-white'
                    onClick={() => setDepositPopup(false)}
                  >
                    BACK
                  </button>
                  <button
                    className='cursor-pointer rounded-sm bg-[#0088cc] px-3 py-2 text-white'
                    onClick={() => setType('deposite')}
                  >
                    submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* withdraw popup */}
        {withdrawPopup && (
          <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Withdraw</span>
                {/* <span>Banking - Master Balance : {userInfo.avbalance}</span> */}
                <button
                  onClick={() => setWithdrawPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-[#0088cc] text-xl text-white'
                >
                  ×
                </button>
              </div>
              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>{userInfo.userName}</div>
                <div className='col-span-2 flex'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={userInfo.avbalance}
                      readOnly
                    />
                  </div>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={userInfo.avbalance + Number(formData.balance || 0)}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>
                  {currentUser.userName}
                </div>
                <div className='col-span-2 flex'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={currentUser.avbalance}
                      readOnly
                    />
                  </div>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={
                        currentUser.avbalance - Number(formData.balance || 0)
                      }
                      readOnly
                    />
                  </div>
                </div>
              </div>
              <form onSubmit={handleWithdwalDeposite}>
                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Amount</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        onChange={(e) =>
                          setFormData({ ...formData, balance: e.target.value })
                        }
                        value={formData.balance}
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Remark</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <textarea
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            remark: e.target.value,
                          })
                        }
                        value={formData.remark}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Master Password</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='password'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            masterPassword: e.target.value,
                          })
                        }
                        value={formData.masterPassword}
                      />
                    </div>
                  </div>
                </div>

                <div className='flex justify-end gap-2 px-[15px]'>
                  <button
                    className='cursor-pointer rounded-sm bg-gray-800 px-3 py-2 text-white'
                    onClick={() => setWithdrawPopup(false)}
                  >
                    BACK
                  </button>
                  <button
                    className='cursor-pointer rounded-sm bg-[#0088cc] px-3 py-2 text-white'
                    onClick={() => setType('withdrawal')}
                  >
                    submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/*status change popup */}
        {settingPopup && (
          <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Change Status</span>
                <button
                  onClick={() => setSettingPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-[#0088cc] text-xl text-white'
                >
                  ×
                </button>
              </div>

              <div className='mb-4 flex items-center justify-between gap-2 px-[15px] text-[13px]'>
                <span className='ml-2'>{currentUser.name}</span>
              </div>

              {/* Status Buttons */}
              <div className='mb-4 grid grid-cols-3 gap-3 px-[15px]'>
                {/* Active Button */}
                <button
                  onClick={() => setFormData({ ...formData, status: 'active' })}
                  className={`flex flex-col items-center rounded border p-3 ${
                    formData.status === 'active'
                      ? 'bg-green-500 text-white'
                      : 'border-green-500 text-green-600'
                  }`}
                >
                  <FaCheckCircle size={20} />
                  <span>Active</span>
                </button>

                {/* Suspend Button */}
                <button
                  onClick={() =>
                    setFormData({ ...formData, status: 'suspend' })
                  }
                  className={`flex flex-col items-center rounded border p-3 ${
                    formData.status === 'suspend'
                      ? 'bg-red-500 text-white'
                      : 'border-red-500 text-red-600'
                  }`}
                >
                  <FaBan size={20} />
                  <span>Suspend</span>
                </button>

                {/* Locked Button */}
                <button
                  onClick={() => setFormData({ ...formData, status: 'locked' })}
                  className={`flex flex-col items-center rounded border p-3 ${
                    formData.status === 'locked'
                      ? 'bg-gray-700 text-white'
                      : 'border-gray-400 text-gray-700'
                  }`}
                >
                  <FaLock size={20} />
                  <span>Locked</span>
                </button>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>Master Password</div>
                <div className='col-span-2'>
                  <div className='px-[15px]'>
                    <input
                      type='password'
                      className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          masterPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className='flex justify-end gap-2 px-[15px]'>
                <button
                  className='cursor-pointer rounded-sm bg-gray-800 px-3 py-2 text-white'
                  onClick={() => setSettingPopup(false)}
                >
                  BACK
                </button>
                <button
                  className='cursor-pointer rounded-sm bg-[#0088cc] px-3 py-2 text-white'
                  onClick={handleSetting}
                >
                  submit
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* change Password popup */}
        {passwordPopup && (
          <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Password </span>
                <button
                  onClick={() => setPasswordPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-[#0088cc] text-xl text-white'
                >
                  ×
                </button>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>New Password</div>
                <div className='col-span-2'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>Confirm Password</div>
                <div className='col-span-2'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>Master Password</div>
                <div className='col-span-2'>
                  <div className='px-[15px]'>
                    <input
                      type='password'
                      className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          masterPassword: e.target.value,
                        })
                      }
                      value={formData.masterPassword}
                    />
                  </div>
                </div>
              </div>

              <div className='flex justify-end gap-2 px-[15px]'>
                <button
                  className='cursor-pointer rounded-sm bg-gray-800 px-3 py-2 text-white'
                  onClick={() => setPasswordPopup(false)}
                >
                  BACK
                </button>
                <button
                  className='cursor-pointer rounded-sm bg-[#0088cc] px-3 py-2 text-white'
                  onClick={handleChangePassword}
                >
                  submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}
