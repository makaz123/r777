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
  updateUserLock,
} from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AiOutlineFileExcel } from 'react-icons/ai';
import pdfIcon from '../assets/icons/pdf-icon.svg';
import excelIcon from '../assets/icons/csv-icon.svg';
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
  const [lockPopup, setLockPopup] = useState(false);
  const [lockType, setLockType] = useState(null);
  const [pendingLock, setPendingLock] = useState(false);
  const [lockForm, setLockForm] = useState({ remark: '', masterPassword: '' });
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
    remark: '',
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

  const openCreditDepositModal = (row) => {
    setcurrentUser(row);
    setFormData((prev) => ({
      ...prev,
      balance: '',
      remark: '',
      creditReference: '',
      masterPassword: '',
    }));
    setDepositPopup(true);
  };

  const closeCreditDepositModal = () => {
    setDepositPopup(false);
    setFormData((prev) => ({
      ...prev,
      balance: '',
      remark: '',
      creditReference: '',
      masterPassword: '',
    }));
  };

  const handleCreditDepositSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?._id) {
      toast.error('No user selected.');
      return;
    }
    if (!formData.masterPassword) {
      toast.error('Please enter master password.');
      return;
    }

    const depositAmount = parseFloat(formData.balance);
    const hasDeposit = !Number.isNaN(depositAmount) && depositAmount > 0;

    const newCredStr =
      formData.creditReference === null || formData.creditReference === undefined
        ? ''
        : String(formData.creditReference).trim();
    const newCredNum = parseFloat(newCredStr);
    const oldCredNum = parseFloat(currentUser.creditReference);
    const hasCreditChange =
      newCredStr !== '' &&
      !Number.isNaN(newCredNum) &&
      newCredNum !== oldCredNum;

    if (!hasDeposit && !hasCreditChange) {
      toast.error('Enter a deposit amount and/or a new credit reference.');
      return;
    }

    try {
      const successParts = [];
      if (hasCreditChange) {
        const data = await dispatch(
          updateCreditReference({
            formData: {
              creditReference: newCredNum,
              masterPassword: formData.masterPassword,
            },
            userId: currentUser._id,
          })
        ).unwrap();
        if (data?.message) successParts.push(data.message);
      }
      if (hasDeposit) {
        const data = await dispatch(
          withdrawalAndDeposite({
            formData,
            userId: currentUser._id,
            type: 'deposite',
          })
        ).unwrap();
        if (data?.message) successParts.push(data.message);
      }
      toast.success(successParts.join(' ') || 'Saved successfully.');
      dispatch(
        getAllOnlyUserAndDownline({
          page: currentPage,
          limit: entries,
          searchQuery,
        })
      );
      dispatch(getAdmin());
      closeCreditDepositModal();
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

  const getLockFieldValue = (row, type) => {
    if (type === 'betLock') return !!(row.betLock ?? row.bLock);
    return !!row[type];
  };

  const getLockPopupTitle = () => {
    if (lockType === 'betLock') {
      return pendingLock ? 'Bet Lock' : 'Unlock Betting';
    }
    return pendingLock ? 'Lock User' : 'Unlock User';
  };

  const openLockPopup = (row, type) => {
    setcurrentUser(row);
    setLockType(type);
    setPendingLock(!getLockFieldValue(row, type));
    setLockForm({ remark: '', masterPassword: '' });
    setLockPopup(true);
  };

  const closeLockPopup = () => {
    setLockPopup(false);
    setLockType(null);
    setLockForm({ remark: '', masterPassword: '' });
  };

  const handleLockSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?._id) {
      toast.error('No user selected.');
      return;
    }
    if (!lockForm.masterPassword) {
      toast.error('Please enter master password.');
      return;
    }
    try {
      const result = await dispatch(
        updateUserLock({
          userId: currentUser._id,
          lockType,
          lock: pendingLock,
          remark: lockForm.remark,
          masterPassword: lockForm.masterPassword,
        })
      ).unwrap();
      toast.success(result.message);
      closeLockPopup();
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

      <div className='h-fit bg-gray-200 p-4'>
        <div className='rounded-md bg-white px-4 py-1'>
          <div className='mb-2 flex items-center justify-between'>
            <div className='grid'>
              <div className='text-[14px] font-bold'>Client List</div>
              <div className='flex items-center gap-1'>
                <input
                  type='text'
                  className='h-fit rounded border border-gray-300 bg-white px-2 py-1 focus:outline-none'
                  placeholder='Search'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <input
                  type='text'
                    className='h-fit rounded border border-gray-300 bg-white px-2 py-1 focus:outline-none'
                  placeholder='Search by client'
                />
                <img
                  src={pdfIcon}
                  alt=''
                  className='w-[35px]'
                  onClick={downloadPDF}
                />
                <img
                  src={excelIcon}
                  alt=''
                  className='w-[35px]'
                  onClick={downloadExcel}
                />
              </div>
            </div>

            <div className='flex gap-2'>
              <div className='mb-2 flex items-center justify-center font-semibold text-black md:mb-0'>
                <span className='mr-2'>Show</span>
                <select
                  className='rounded border border-gray-300 px-2 py-1'
                  value={entries}
                  onChange={(e) => setEntries(Number(e.target.value))}
                >
                  <option value='10'>10</option>
                  <option value='20'>20</option>
                  <option value='50'>50</option>
                  <option value='100'>100</option>
                  <option value='500'>500</option>
                </select>
                <span className='ml-2'>entries</span>
              </div>

              <button
                className='flex items-center rounded border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-3 py-1 text-[14px] text-white'
                onClick={() => navigate('/agent-download-list/insertagent')}
              >
                Add Client Account
              </button>

              <button
                className='flex items-center rounded border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-3 py-1 text-[14px] text-white'
                onClick={() =>
                  setActiveTab((tab) =>
                    tab === 'active' ? 'deactive' : 'active'
                  )
                }
              >
                {activeTab === 'active' ? 'Inactive List' : 'Active List'}
              </button>
            </div>
          </div>

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
                  <span className='block w-fit rounded-[3px] px-2 py-[1px] text-[14px] text-black'>
                    {row.userName}
                  </span>
                ),
              },
              {
                header: 'Credit Reference',
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
                header: 'Pending Bal.',
                accessor: 'pendingBal',
                align: 'right',
                cell: (row) => row.pendingBal || 0,
              },
              {
                header: 'Available Bal.',
                accessor: 'avbalance',
                align: 'right',
                cell: (row) => row.avbalance || 0,
              },
              {
                header: 'Current P&L',
                accessor: 'currentPL',
                align: 'right',
                cell: (row) => row.currentPL || 0,
              },
              {
                header: 'Exposure',
                accessor: 'exposure',
                align: 'right',
                cell: (row) => row.exposure,
              },
              {
                header: 'U Lock',
                cell: (row) => (
                  <input
                    type='checkbox'
                    checked={getLockFieldValue(row, 'uLock')}
                    readOnly
                    onClick={() => openLockPopup(row, 'uLock')}
                    className='h-5 w-5 cursor-pointer accent-[#146578]'
                  />
                ),
              },
              {
                header: 'B Lock',
                cell: (row) => (
                  <input
                    type='checkbox'
                    checked={getLockFieldValue(row, 'betLock')}
                    readOnly
                    onClick={() => openLockPopup(row, 'betLock')}
                    className='h-5 w-5 cursor-pointer accent-[#146578]'
                  />
                ),
              },
              {
                header: 'My %',
                align: 'right',
                cell: (row) => row.myPercent,
              },
              // {
              //   header: 'Exposure Limit',
              //   accessor: 'exposureLimit',
              //   align: 'right',
              //   cell: (row) => row.exposureLimit || 0,
              // },

              // {
              //   header: 'Ref. P/L',
              //   accessor: 'creditReferenceProfitLoss',
              //   align: 'right',
              //   cell: (row) =>
              //     Number(row.bettingProfitLoss) +
              //     Number(row.creditReferenceProfitLoss),
              // },
              {
                header: 'Type',
                accessor: 'role',
                cell: (row) => row.role,
              },
              {
                header: 'Actions',
                cell: (row) =>
                  isFetchingAllUsers ? (
                    <div className='flex gap-1'>
                      <span
                        className='flex h-[20px] w-[20px] items-center justify-center rounded-sm bg-[#ff7f50] leading-none text-white text-[11px] font-bold'
                      >
                        U
                      </span>
                      <span
                        className='flex h-[20px] w-[20px] items-center justify-center rounded-sm bg-[#008000] leading-none text-white text-[11px] font-bold'
                        onClick={() => openCreditDepositModal(row)}
                      >
                        D/C
                      </span>
                      <span
                        className='flex h-[20px] w-[20px] items-center justify-center rounded-sm bg-[#274396] leading-none text-white text-[11px] font-bold'
                        onClick={() => {
                          setWithdrawPopup(true);
                          setcurrentUser(row);
                        }}
                      >
                        W
                      </span>
                      {/* <span
                        className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                        onClick={() => {
                          setPatnerPopup(true);
                          setcurrentUser(row);
                        }}
                      >
                        L
                      </span> */}
                      {/* C merged into D/C (Credit / Deposit modal) */}
                      <span
                        className='flex h-[20px] w-[20px] items-center justify-center rounded-sm bg-[#ff0] leading-none text-black text-[11px] font-bold'
                        onClick={() => {
                          setPasswordPopup(true);
                          setcurrentUser(row);
                        }}
                      >
                        P
                      </span>
                      <span
                        className='flex h-[20px] w-[20px] items-center justify-center rounded-sm bg-[#eb99e0] leading-none text-black text-[11px] font-bold'
                      >
                        GC
                      </span>
                      <span
                        className='flex h-[20px] w-[20px] items-center justify-center rounded-sm bg-[#47ee31] leading-none text-black text-[11px] font-bold'
                      >
                        CC
                      </span>
                      {/* <span
                        className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                        onClick={() => {
                          setSettingPopup(true);
                          setcurrentUser(row);
                        }}
                      >
                        S
                      </span> */}
                    </div>
                  ) : null,
              },
            ]}
          />

          {/* Pagination */}
          <div className='mt-4 flex flex-col justify-between gap-3 text-[13px] md:flex-row md:items-center'>
            <div>
              Showing {currentPage} to {totalPages} of {onlyusers?.length}{' '}
              entries
            </div>
            <div className='flex flex-wrap'>
              {/* First Button */}
              <button
                className='pgBtn px-[13px] py-[6.5px] rounded-l-sm'
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                First
              </button>

              {/* Previous Button */}
              <button
                className='pgBtn px-[12px] py-[6px]'
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              {/* Page Numbers */}
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  className={`px-[13px] py-[6.5px] leading-none ${
                    currentPage === i + 1 ? 'bg-gradient-to-b from-[#11859c] to-[#181818] text-white' : 'pgBtn'
                  }`}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </button>
              ))}

              {/* Next Button */}
              <button
                className='pgBtn px-[13px] py-[6.5px]'
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>

              {/* Last Button */}
              <button
                className='pgBtn px-[13px] py-[6.5px] rounded-r-sm'
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </button>
            </div>
          </div>

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

          {/* Credit / Deposit popup */}
          {depositPopup && currentUser && (
            <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-black/45 text-[13px]'>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4 }}
                className='absolute top-8 left-1/2 w-full max-w-[500px] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg'
              >
                <div className='flex items-center justify-between bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1 text-white'>
                  <span className='text-[16px] font-semibold'>Credit / Deposit</span>
                  <button
                    type='button'
                    onClick={closeCreditDepositModal}
                    aria-label='Close'
                    className='text-xl leading-none text-gray-200 font-bold'
                    >
                      ×
                  </button>
                </div>

                <form
                  onSubmit={handleCreditDepositSubmit}
                  className='space-y-3 bg-sky-50 px-4 py-2'
                >
                  {/* My Available */}
                  <div className='flex flex-wrap items-end gap-2'>
                    <label className='min-w-[180px] shrink-0  text-gray-950 text-[14px]'>
                      My Available
                    </label>
                    <div className='flex min-w-0 flex-1 flex-wrap items-end gap-8'>
                      <input
                        type='text'
                        readOnly
                        className='min-w-[80px] flex-1 border border-gray-500 rounded-[2px] bg-[#4ecdde] px-2 py-1.5 outline-none'
                        value={userInfo?.avbalance ?? ''}
                      />
                      <div className='flex min-w-[80px] flex-1 flex-col gap-0.5'>
                        <span className='text-[14px]'>
                          After
                        </span>
                        <input
                          type='text'
                          readOnly
                          className='w-full rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                          value={
                            Number(userInfo?.avbalance || 0) -
                            Number(formData.balance || 0)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Credit reference */}
                  <div className='border-2 border-dashed border-gray-800 px-1.5 py-3'>
                    <div className='grid grid-cols-1 gap-8 sm:grid-cols-2'>
                      <div>
                        <label className='mb-1 block text-gray-950 text-[14px]'>
                          Old Cred Ref.
                        </label>
                        <input
                          type='text'
                          readOnly
                          className='w-full rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 text-end outline-none'
                          value={currentUser.creditReference ?? ''}
                        />
                      </div>
                      <div>
                        <label className='mb-1 block text-gray-950 text-[14px]'>
                          New Cred Ref.
                        </label>
                        <input
                          type='text'
                          className='w-full rounded-[2px] border border-gray-500 bg-white px-2 py-1.5 outline-none'
                          placeholder=''
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              creditReference: e.target.value,
                            })
                          }
                          value={formData.creditReference ?? ''}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deposit block */}
                  <div className='border-2 border-dashed border-gray-800 px-1.5 py-3'>
                    
                    <div className='mb-3 flex flex-wrap items-end gap-2'>
                      <span className='min-w-[170px] shrink-0 text-gray-950 text-[14px]'>
                        {currentUser.userName}
                      </span>
                      <div className='flex min-w-0 flex-1 flex-wrap gap-8'>
                        <input
                          type='text'
                          readOnly
                          className='min-w-[80px] flex-1 border border-gray-500 rounded-[2px] bg-[#4ecdde] px-2 py-1.5 outline-none'
                          value={currentUser.avbalance ?? ''}
                        />
                        <input
                          type='text'
                          readOnly
                          className='min-w-[80px] flex-1 border border-gray-500 rounded-[2px] bg-[#4ecdde] px-2 py-1.5 outline-none'
                          value={
                            Number(currentUser.avbalance || 0) +
                            Number(formData.balance || 0)
                          }
                        />
                      </div>
                    </div>
                    <div className='mb-3 flex flex-wrap items-center gap-2'>
                      <label className='min-w-[170px] shrink-0 text-gray-950 text-[14px]'>
                        Add Deposit
                      </label>
                      <input
                        type='number'
                        min={0}
                        step='any'
                        className='min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 outline-none'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            balance: e.target.value,
                          })
                        }
                        value={formData.balance ?? ''}
                      />
                    </div>
                    <div className='flex flex-wrap items-start gap-2'>
                      <label className='min-w-[170px] shrink-0 text-gray-950 text-[14px]'>
                        Remarks
                      </label>
                      <textarea
                        rows={3}
                        className='min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 outline-none'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            remark: e.target.value,
                          })
                        }
                        value={formData.remark ?? ''}
                      />
                    </div>
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <label className='min-w-[175px] shrink-0 text-gray-950 text-[14px]'>
                      Master Password
                    </label>
                    <input
                      type='password'
                      autoComplete='off'
                      className='min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 outline-none'
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          masterPassword: e.target.value,
                        })
                      }
                      value={formData.masterPassword}
                    />
                  </div>

                  <div className='flex justify-end gap-2 pt-1'>
                    <button
                      type='submit'
                      className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                    >
                      Submit
                    </button>
                    <button
                      type='button'
                      onClick={closeCreditDepositModal}
                      className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                    >
                      Cancel
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
                className='absolute top-8 left-1/2 w-full max-w-[500px] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg'
              >
                {/* Header */}
                <div className='flex items-center justify-between bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1 text-white'>
                  <span className='text-[16px] font-semibold'>Withdraw</span>
                  {/* <span>Banking - Master Balance : {userInfo.avbalance}</span> */}
                  <button
                    onClick={() => setWithdrawPopup(false)}
                    className='text-xl leading-none text-gray-200 font-bold'
                  >
                    ×
                  </button>
                </div>
                <div className=' bg-sky-50 px-4 py-1 space-y-3'>
                  <div className='flex flex-wrap items-end gap-2'>
                    <label className='min-w-[180px] shrink-0  text-gray-950 text-[14px]'>
                      {userInfo.userName}
                    </label>
                    <div className='flex flex-1 gap-8 items-end'>
                      <div className='w-1/2'>
                        <input
                          type='text'
                          value={userInfo.avbalance}
                          readOnly
                          className='w-full flex-1 border border-gray-500 rounded-[2px] bg-[#4ecdde] px-2 py-1.5 outline-none'
                        />
                      </div>
                      <div className='w-1/2 flex flex-col gap-0.5'>
                        <span className='text-[14px]'>
                          After
                        </span>
                        <input
                          type='text'
                          className='w-full rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                          value={
                            userInfo.avbalance + Number(formData.balance || 0)
                          }
                          readOnly
                        />
                      </div>
                    </div>
                  </div>


                  <div className='flex flex-wrap items-end gap-2'>
                    <label className='min-w-[180px] shrink-0  text-gray-950 text-[14px]'>
                      {currentUser.userName}
                    </label>
                    <div className='flex flex-1 gap-8 items-end'>
                      <input
                        type='text'
                        className='w-1/2 border border-gray-500 rounded-[2px] bg-[#4ecdde] px-2 py-1.5 outline-none'
                        value={currentUser.avbalance}
                        readOnly
                      />
                      <input
                        type='text'
                        className='w-1/2 border border-gray-500 rounded-[2px] bg-[#4ecdde] px-2 py-1.5 outline-none'
                        value={
                          currentUser.avbalance - Number(formData.balance || 0)
                        }
                        readOnly
                      />

                    </div>
                  </div>
                  
                  <form onSubmit={handleWithdwalDeposite}>
                    <div className='mb-3 flex flex-wrap items-center gap-2'>
                      <label className='min-w-[180px] shrink-0 text-gray-950 text-[14px]'>
                        Amount
                      </label>
                      <input
                        type='text'
                        className='min-w-0 flex-1 border border-gray-700 bg-white px-2 py-1.5 outline-none'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            balance: e.target.value,
                          })
                        }
                        value={formData.balance}
                      />
                    </div>

                    <div className='mb-3 flex flex-wrap items-center gap-2'>
                      <label className='min-w-[180px] shrink-0 text-gray-950 text-[14px]'>
                      Remark
                      </label>
                      <textarea
                        rows={3}
                        className='min-w-0 flex-1 border border-gray-700 bg-white px-2 py-1.5 outline-none'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            remark: e.target.value,
                          })
                        }
                        value={formData.remark}
                      ></textarea>
                    </div>

                    <div className='flex flex-wrap items-center gap-2'>
                      <label className='min-w-[180px] shrink-0 text-gray-950 text-[14px]'>
                        Master Password
                      </label>
                      <input
                        type='password'
                        className='min-w-0 flex-1 border border-gray-700 bg-white px-2 py-1.5 outline-none'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            masterPassword: e.target.value,
                          })
                        }
                        value={formData.masterPassword}
                      />
                    </div>

                    <div className='flex justify-end gap-2 border-t border-gray-200 py-2 mt-3'>
                      <button
                        type='submit'
                        className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                        onClick={() => setType('withdrawal')}
                      >
                        Submit
                      </button>
                      <button
                        type='button'
                        onClick={() => setWithdrawPopup(false)}
                        className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                      >
                        Cancel
                      </button>
                    </div>
                  </form>

                </div>
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
                    onClick={() =>
                      setFormData({ ...formData, status: 'active' })
                    }
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
                    onClick={() =>
                      setFormData({ ...formData, status: 'locked' })
                    }
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

          {/* Lock User popup */}
          {lockPopup && (
            <div className='fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
              <motion.div
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 0 }}

                className='fixed top-8 w-full max-w-[500px] overflow-hidden rounded bg-white shadow-lg'
              >
                <div className='flex items-center justify-between bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1 text-white'>
                  <span className='text-[16px] font-semibold'>
                    {getLockPopupTitle()}
                  </span>
                  <button
                    type='button'
                    onClick={closeLockPopup}
                    className='text-xl leading-none text-gray-200 font-bold'
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleLockSubmit} className='px-4 pt-4 pb-2 bg-sky-50'>
                  <div className='mb-3 flex items-center gap-3'>
                    <label className='w-[150px] shrink-0 text-gray-900 text-[14px]'>
                      Remark
                    </label>
                    <input
                      type='text'
                      className='w-full border border-gray-800 px-2 py-1 outline-none bg-white'
                      value={lockForm.remark}
                      onChange={(e) =>
                        setLockForm({ ...lockForm, remark: e.target.value })
                      }
                    />
                  </div>

                  <div className='mb-2 flex items-center gap-3'>
                    <label className='w-[150px] shrink-0  text-gray-900 text-[14px]'>
                      Master Password
                    </label>
                    <input
                      type='password'
                      className='w-full border border-gray-800 px-2 py-1 outline-none bg-white'
                      value={lockForm.masterPassword}
                      onChange={(e) =>
                        setLockForm({
                          ...lockForm,
                          masterPassword: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className='flex justify-end gap-2 border-t border-gray-300 pt-1'>
                    <button
                      type='submit'
                      className='text-[14px] rounded border bg-gradient-to-b hover:bg-gradient-to-t from-[#5ecbdd] to-[#146578] px-4 py-1.5 text-white'
                    >
                      Submit
                    </button>
                    <button
                      type='button'
                      onClick={closeLockPopup}
                      className='text-[14px] rounded border bg-gradient-to-b hover:bg-gradient-to-t from-[#5ecbdd] to-[#146578] px-4 py-1.5 text-white'
                    >
                      Cancel
                    </button>
                  </div>
                </form>
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
                className='absolute top-8 left-1/2 w-full max-w-[500px] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg'
              >
                {/* Header */}
                <div className='flex items-center justify-between bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1 text-white'>
                  <span className='text-[16px] font-semibold'>Change Password</span>
                  <button
                    onClick={() => setPasswordPopup(false)}
                    className='text-xl leading-none text-gray-200 font-bold'
                  >
                    ×
                  </button>
                </div>
                <div className='bg-sky-50 px-5 pt-4 pb-1 space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <label className='min-w-[180px] shrink-0 text-gray-950 text-[14px]'>
                      New Password
                    </label>
                    <input
                      type='text'
                      className='flex-1 border border-gray-500 rounded-[2px] bg-white px-2 py-1.5 outline-none'
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <label className='min-w-[180px] shrink-0 text-gray-950 text-[14px]'>
                      Confirm Password
                    </label>
                    <input
                      type='text'
                      className='flex-1 border border-gray-500 rounded-[2px] bg-white px-2 py-1.5 outline-none'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <label className='min-w-[180px] shrink-0 text-gray-950 text-[14px]'>
                      Master Password
                    </label>
                    <input
                      type='password'
                      className='flex-1 border border-gray-500 rounded-[2px] bg-white px-2 py-1.5 outline-none'
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          masterPassword: e.target.value,
                        })
                      }
                      value={formData.masterPassword}
                    />
                  </div>

                  <div className='flex justify-end gap-2 border-t border-gray-200 py-1 mt-3'>
                    <button
                      type='submit'
                      className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                      onClick={handleChangePassword}
                    >
                      Submit
                    </button>
                    <button
                      type='button'
                      onClick={() => setPasswordPopup(false)}
                      className='cursor-pointer rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-[14px] text-white hover:bg-gradient-to-t'
                    >
                      Cancel
                    </button>
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
