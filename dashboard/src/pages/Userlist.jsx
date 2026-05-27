'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FaBan, FaCheckCircle, FaLock, FaRegFilePdf } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAdmin,
  setCurrentPage,
  updateCreditReference,
  getDownlineList,
  withdrawalAndDeposite,
  userSetting,
  getCreditRefHistory,
  fetchSubAdminByLevel,
  updateExploserLimit,
  changePasswordByDownline,
  updateUserLock,
} from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AiOutlineFileExcel } from 'react-icons/ai';
import pdfIcon from '../assets/icons/pdf-icon.svg';
import excelIcon from '../assets/icons/csv-icon.svg';
import VirtualTable from '../components/VirtualTable';

export default function Userlist() {
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text('User List', 14, 15);

    const exportUsers =
      (isFetchingAllUsers === false ? users : onlyusers) || [];
    const filteredUsers = exportUsers.filter((user) =>
      activeTab === 'active'
        ? user.status === 'active'
        : user.status !== 'active'
    );

    const exportExposure = (user) => {
      if (user.role !== 'user') return user.exposure || 0;
      if (user.shareExposure != null) return user.shareExposure;
      const gross = Number(user.totalExposure ?? user.exposure ?? 0);
      const pct = Number(user.parentSharePercent ?? user.mySharePercent ?? 100);
      return Math.round(gross * (pct / 100) * 100) / 100;
    };

    const tableData = filteredUsers.map((user) => [
      user.userName,
      user.creditReference || '-',
      user.balance || 0,
      exportExposure(user),
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
    const exportUsers =
      (isFetchingAllUsers === false ? users : onlyusers) || [];
    const filteredUsers = exportUsers.filter((user) =>
      activeTab === 'active'
        ? user.status === 'active'
        : user.status !== 'active'
    );

    const exportExposure = (user) => {
      if (user.role !== 'user') return user.exposure || 0;
      if (user.shareExposure != null) return user.shareExposure;
      const gross = Number(user.totalExposure ?? user.exposure ?? 0);
      const pct = Number(user.parentSharePercent ?? user.mySharePercent ?? 100);
      return Math.round(gross * (pct / 100) * 100) / 100;
    };

    const tableData = filteredUsers.map((user) => ({
      Username: user.userName,
      'Credit Ref.': user.creditReference || '-',
      Balance: user.baseBalance || 0,
      Exposure: exportExposure(user),
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
  const { userInfo, currentPage, totalPages, totalUsers, onlyusers, users } =
    useSelector((state) => state.auth);
  const { id } = useParams();
  const [entries, setEntries] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [patnerPopup, setPatnerPopup] = useState(false);
  const [depositPopup, setDepositPopup] = useState(false);
  const [withdrawPopup, setWithdrawPopup] = useState(false);
  const [settingPopup, setSettingPopup] = useState(false);
  const [currentUser, setcurrentUser] = useState(null);
  const [isFetchingAllUsers, setIsFetchingAllUsers] = useState(null);
  const [activeListCode, setActiveListCode] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [passwordPopup, setPasswordPopup] = useState(false);
  const [lockPopup, setLockPopup] = useState(false);
  const [lockType, setLockType] = useState(null);
  const [pendingLock, setPendingLock] = useState(false);
  const [lockForm, setLockForm] = useState({ remark: '', masterPassword: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Settlement state
  const [settlePopup, setSettlePopup] = useState(false);
  const [settleSelectedUser, setSettleSelectedUser] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleRemarks, setSettleRemarks] = useState('');
  const [settlePassword, setSettlePassword] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [settleUserPL, setSettleUserPL] = useState(0);

  // Exposure modal state
  const [exposurePopup, setExposurePopup] = useState(false);
  const [exposureUserId, setExposureUserId] = useState(null);
  const [exposureData, setExposureData] = useState([]);
  const [isFetchingExposure, setIsFetchingExposure] = useState(false);

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
    const maxPage = Math.max(1, Number(totalPages) || 1);
    if (newPage >= 1 && newPage <= maxPage) {
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
        getDownlineList({
          page: currentPage,
          limit: entries,
          searchQuery,
          listType: 'all',
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
      toast.error('Please enter login password.');
      return;
    }

    const depositAmount = parseFloat(formData.balance);
    const hasDeposit = !Number.isNaN(depositAmount) && depositAmount > 0;

    const newCredStr =
      formData.creditReference === null ||
      formData.creditReference === undefined
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
        getDownlineList({
          page: currentPage,
          limit: entries,
          searchQuery,
          listType: 'all',
        })
      );
      dispatch(getAdmin());
      closeCreditDepositModal();
    } catch (error) {
      toast.error(error);
    }
  };

  const fetchExposureDetails = useCallback(async (userId, showLoader = true) => {
    if (!userId) return;
    try {
      if (showLoader) setIsFetchingExposure(true);
      const res = await api.get(`/admin/exposure-details?userId=${userId}`);
      if (res?.data?.status || res?.data?.meta?.status) {
        setExposureData(res.data.data);
      } else {
        setExposureData([]);
      }
    } catch (error) {
      console.error('Failed to fetch exposure', error);
      if (showLoader) toast.error('Failed to fetch exposure details');
      setExposureData([]);
    } finally {
      if (showLoader) setIsFetchingExposure(false);
    }
  }, []);

  const handleExposureClick = async (userId) => {
    setExposureUserId(userId);
    setExposurePopup(true);
    await fetchExposureDetails(userId, true);
  };

  const closeExposurePopup = () => {
    setExposurePopup(false);
    setExposureUserId(null);
    setExposureData([]);
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
        getDownlineList({
          page: currentPage,
          limit: entries,
          searchQuery,
          listType: 'all',
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
        getDownlineList({
          page: currentPage,
          limit: entries,
          searchQuery,
          listType: 'all',
        })
      );
    } catch (error) {
      toast.error(error);
    }
  };

  useEffect(() => {
    setIsFetchingAllUsers(true);
    setActiveListCode(null);
    dispatch(
      getDownlineList({
        page: currentPage,
        limit: entries,
        searchQuery,
        listType: 'all',
      })
    );
  }, [dispatch, currentPage, entries, searchQuery]);

  /** If list shrinks (search, deletes), avoid staying on an empty page. */
  useEffect(() => {
    const max = Math.max(1, Number(totalPages) || 1);
    if (currentPage > max) {
      dispatch(setCurrentPage(max));
    }
  }, [dispatch, currentPage, totalPages]);

  const reloadUserList = useCallback((options = {}) => {
    const { silent = false } = options;
    if (isFetchingAllUsers === false && activeListCode) {
      dispatch(fetchSubAdminByLevel({ code: activeListCode, silent }));
    } else {
      dispatch(
        getDownlineList({
          page: currentPage,
          limit: entries,
          searchQuery,
          listType: 'all',
          silent,
        })
      );
    }
  }, [
    dispatch,
    isFetchingAllUsers,
    activeListCode,
    currentPage,
    entries,
    searchQuery,
  ]);

  const isAnyBlockingModalOpen =
    patnerPopup ||
    depositPopup ||
    withdrawPopup ||
    settingPopup ||
    passwordPopup ||
    lockPopup ||
    settlePopup;

  // WebSocket (via PrivateRoute) pushes balance/exposure patches; upline gets
  // user_refresh_needed → downline-list-refresh for full row P/L without resetting page.
  useEffect(() => {
    const onListRefresh = () => {
      if (isAnyBlockingModalOpen) return;
      reloadUserList({ silent: true });
    };

    const onUserUpdated = (event) => {
      const updatedId = event.detail?.userId;
      if (
        exposurePopup &&
        exposureUserId &&
        updatedId &&
        String(updatedId) === String(exposureUserId)
      ) {
        fetchExposureDetails(exposureUserId, false);
      }
    };

    window.addEventListener('downline-list-refresh', onListRefresh);
    window.addEventListener('downline-user-updated', onUserUpdated);
    return () => {
      window.removeEventListener('downline-list-refresh', onListRefresh);
      window.removeEventListener('downline-user-updated', onUserUpdated);
    };
  }, [
    reloadUserList,
    isAnyBlockingModalOpen,
    exposurePopup,
    exposureUserId,
    fetchExposureDetails,
  ]);

  const formatNumber = (v) => {
    const num = Math.abs(Number(v));
    if (isNaN(num)) return 0;
    return Number.isInteger(num)
      ? num
      : num.toFixed(v.toString().split('.')[1]?.length === 1 ? 1 : 2);
  };

  const listUsers = useMemo(
    () => (isFetchingAllUsers === false ? users : onlyusers) || [],
    [isFetchingAllUsers, users, onlyusers]
  );

  const paginationSummary = useMemo(() => {
    const total = Number(totalUsers) || 0;
    const size = Number(entries) || 1;
    const page = Number(currentPage) || 1;
    if (total === 0) {
      return { from: 0, to: 0, total: 0 };
    }
    const from = (page - 1) * size + 1;
    const to = Math.min(page * size, total);
    return { from, to, total };
  }, [totalUsers, entries, currentPage]);

  const filteredUsers = useMemo(
    () =>
      listUsers.filter((user) =>
        activeTab === 'active'
          ? user.status === 'active'
          : user.status !== 'active'
      ),
    [listUsers, activeTab]
  );

  const getRowBalance = (row) => Number(row.baseBalance || 0);

  const getRowTotalExposure = (row) => {
    return Number(row.totalExposure ?? row.exposure ?? 0);
  };

  /** Client/Agent exposure at viewer's partnership % (My % on the row). */
  const getRowShareExposure = (row) => {
    if (row.shareExposure != null && !Number.isNaN(Number(row.shareExposure))) {
      return Number(row.shareExposure);
    }
    const gross = getRowTotalExposure(row);
    const pct = Number(row.parentSharePercent ?? row.mySharePercent ?? 100);
    return Math.round(gross * (pct / 100) * 100) / 100;
  };

  const getRowDisplayExposure = (row) => getRowShareExposure(row);

  const getRowAvbalance = (row) => Number(row.avbalance || 0);

  const getRowCurrentPL = (row) => {
    if (row.role !== 'user') {
      // For agents/admins, use backend-enriched currentPL from getDirectSettlementPL
      return Math.round((Number(row.currentPL) || 0) * 100) / 100;
    }
    // For actual users, calculate from avbalance - baseBalance + exposure
    const current =
      getRowAvbalance(row) -
      getRowBalance(row) +
      Math.abs(getRowTotalExposure(row));
    return Math.round(current * 100) / 100;
  };

  /** Pending balance = negative of balance */
  const getRowPendingBal = (row) => {
    const pending = -getRowBalance(row);
    return Math.round(pending * 100) / 100;
  };

  const formatTableMoney = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return '0.00';
    return n.toFixed(2);
  };

  const BalanceCell = ({ value }) => {
    const n = Number(value) || 0;
    if (n === 0) {
      return <span className='text-black font-bold'>{formatTableMoney(0)}</span>;
    }
    return (
      <span className='font-bold text-[#0e7926]'>{formatTableMoney(n)}</span>
    );
  };

  const PendingCell = ({ value }) => {
    const n = Number(value) || 0;
    if (n === 0) {
      return <span className='text-black'>{formatTableMoney(0)}</span>;
    }
    return (
      <span className='font-bold text-[#c7313f]'>{formatTableMoney(n)}</span>
    );
  };

  const openSettleModal = (row, value) => {
    if (!row) return;

    if (row.invite !== userInfo?.code) {
      toast.error('You can only settle with your direct downlines.');
      return;
    }

    setSettleSelectedUser(row);
    setSettleUserPL(value);
    setSettleAmount('');

    if (value > 0) {
      setSettleRemarks(
        `${row.userName} received cash from ${userInfo?.userName || ''}`
      );
    } else {
      setSettleRemarks(
        `${userInfo?.userName || ''} received cash from ${row.userName}`
      );
    }

    setSettlePassword('');
    setSettlePopup(true);
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!settleSelectedUser || !settleAmount || !settlePassword) {
      toast.error('Please fill all required fields.');
      return;
    }

    setIsSettling(true);
    try {
      const payload = {
        userId: settleSelectedUser._id,
        amount: Number(settleAmount),
        remarks: settleRemarks,
        masterPassword: settlePassword,
      };
      const res = await api.post('/sub-admin/settle', payload, {
        withCredentials: true,
      });
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Settled successfully');
        setSettlePopup(false);
        dispatch(getAdmin());
        reloadUserList();
      } else {
        toast.error(res.data.message || 'Settlement failed');
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Settlement failed'
      );
    } finally {
      setIsSettling(false);
    }
  };

  const CurrentPLCell = ({ value, row }) => {
    const n = Number(value) || 0;
    if (n === 0) {
      return <span className='text-black font-bold'>{formatTableMoney(0)}</span>;
    }
    if (n < 0) {
      return (
        <span
          onClick={() => openSettleModal(row, n)}
          className='cursor-pointer rounded-[4px] bg-[#fb6064] px-3 py-[5px] text-white font-bold'
        >
          {formatTableMoney(n)}
        </span>
      );
    }
    return (
      <span
        onClick={() => openSettleModal(row, n)}
        className='cursor-pointer rounded-[4px] bg-[#2fa20e] px-3 py-[5px] text-white font-bold'
      >
        {formatTableMoney(n)}
      </span>
    );
  };

  const ExposureCell = ({ row }) => {
    const gross = getRowTotalExposure(row);
    const exp = getRowDisplayExposure(row);
    const display = exp > 0 ? -exp : exp;
    const n = Number(display) || 0;
    const title =
      Math.abs(gross - exp) > 0.01
        ? `Gross exposure: ${formatTableMoney(gross)}`
        : undefined;

    // Allow clicking for everyone so admins/agents can see their downline's exposure details
    const isClickable = true;

    if (n === 0) {
      return (
        <span
          className={`text-black font-bold ${isClickable ? 'cursor-pointer hover:underline' : ''}`}
          title={title}
          onClick={() => isClickable && handleExposureClick(row._id)}
        >
          {formatTableMoney(0)}
        </span>
      );
    }
    if (n < 0) {
      return (
        <span
          className='cursor-pointer rounded-[4px] bg-[#fb6064] px-3 py-[5px] text-white font-bold'
          title={title}
          onClick={() => isClickable && handleExposureClick(row._id)}
        >
          {formatTableMoney(n)}
        </span>
      );
    }
    return (
      <span
        className='cursor-pointer rounded-[4px] bg-[#2fa20e] px-3 py-[5px] text-white font-bold'
        title={title}
        onClick={() => isClickable && handleExposureClick(row._id)}
      >
        {formatTableMoney(n)}
      </span>
    );
  };

  const roleTypeLabel = (role) => {
    if (role === 'user') return 'Client';
    if (role === 'white') return 'Admin';
    if (role === 'admin') return 'Main Admin';
    if (!role) return '—';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  /** My % / downline keep — matches InsertAgent (my share first, then downline). */
  const formatRowMyPercent = (row) => {
    if (row.role === 'user') {
      const pct =
        row.parentSharePercent ??
        row.mySharePercent ??
        row.viewerShareOnRow ??
        0;
      return `${pct}%`;
    }
    const myShare =
      row.parentSharePercent ?? row.mySharePercent ?? row.viewerShareOnRow ?? 0;
    const downlineKeep =
      row.downlineKeepPercent ?? row.downlineSharePercent ?? 0;
    return `${myShare}% / ${downlineKeep}%`;
  };

  const tableSummaryRow = useMemo(() => {
    const totals = filteredUsers.reduce(
      (acc, row) => {
        acc.creditReference += Number(row.creditReference) || 0;
        acc.balance += getRowBalance(row);
        acc.pendingBal += getRowPendingBal(row);
        acc.avbalance += Number(row.avbalance) || 0;
        acc.currentPL += getRowCurrentPL(row);
        const exp = getRowDisplayExposure(row);
        acc.exposure += exp > 0 ? -exp : exp;
        return acc;
      },
      {
        creditReference: 0,
        balance: 0,
        pendingBal: 0,
        avbalance: 0,
        currentPL: 0,
        exposure: 0,
      }
    );
    return [
      '',
      formatTableMoney(totals.creditReference),
      formatTableMoney(totals.balance),
      formatTableMoney(totals.pendingBal),
      formatTableMoney(totals.avbalance),
      formatTableMoney(totals.currentPL),
      formatTableMoney(totals.exposure),
      '',
      '',
      '',
      '',
      '',
    ];
  }, [filteredUsers]);

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
      toast.error('Please enter login password.');
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
        getDownlineList({
          page: currentPage,
          limit: entries,
          searchQuery,
          listType: 'all',
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
      toast.error('Please enter login password.');
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

  const handleLoadNextLevel = (user, code) => {
    if (user.role !== 'user') {
      setIsFetchingAllUsers(false);
      setActiveListCode(code);
      dispatch(fetchSubAdminByLevel({ code: code }));
    }
  };

  return (
    <>
      <Navbar />

      <div className='h-fit md:px-[15px] md:py-[13px]'>
        <div className='rounded-md bg-white px-4 py-1'>
          <div className='mb-2 items-end justify-between md:flex mt-2'>
            <div className='grid'>
              <div className='text-[15px] font-bold leading-none'>Client List</div>
              <div className='flex items-center gap-1'>
                <input
                  type='text'
                  className='h-fit w-full rounded border border-gray-300 bg-white px-2 py-1 focus:outline-none'
                  placeholder='Search'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <input
                  type='text'
                  className='h-fit w-full rounded border border-gray-300 bg-white px-2 py-1 focus:outline-none'
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

            <div className='mt-1 flex gap-1 md:mt-0'>
              <div className='mb-2 flex items-start justify-center text-[12px] font-semibold text-black md:mb-0 md:text-[14px]'>
                <span className='mr-2'>Show</span>
                <select
                  className='rounded border border-gray-300 px-2 py-1 font-normal text-gray-600'
                  value={entries}
                  onChange={(e) => {
                    setEntries(Number(e.target.value));
                    dispatch(setCurrentPage(1));
                  }}
                >
                  <option value='10'>10</option>
                  <option value='20'>20</option>
                  <option value='25'>25</option>
                  <option value='50'>50</option>
                  <option value='100'>100</option>
                  <option value='500'>500</option>
                </select>
                <span className='ml-2'>entries</span>
              </div>

              <button
                className='flex h-fit items-center rounded border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-2 py-1 text-[10px] text-white md:px-3 md:text-[14px]'
                onClick={() => navigate('/agent-download-list/insertagent')}
              >
                Add Client Account
              </button>

              <button
                className='flex h-fit items-center rounded border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-2 py-1 text-[10px] text-white md:px-3 md:text-[14px]'
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
            variant='clientList'
            data={filteredUsers}
            summaryRow={tableSummaryRow}
            columns={[
              {
                header: 'User Name',
                accessor: 'userName',
                cell: (row) => {
                  const isClient = row.role === 'user';
                  return (
                    <span
                      className={`flex items-center gap-2${!isClient ? ' cursor-pointer' : ''}`}
                      onClick={() => handleLoadNextLevel(row, row.code)}
                    >
                      <span className='inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[#016a82] text-[10px] font-bold text-white'>
                        {isClient ? 'C' : 'A'}
                      </span>
                      <span
                        className={`font-medium text-black ${
                          !isClient
                            ? 'underline decoration-[#016a82] underline-offset-2'
                            : ''
                        }`}
                      >
                        {row.userName}
                      </span>
                    </span>
                  );
                },
              },
              {
                header: 'Credit Reference',
                accessor: 'creditReference',
                align: 'right',
                cell: (row) => {
                  const n = Number(row.creditReference ?? 0) || 0;
                  const colorClass =
                    n < 0 ? 'text-[#c7313f]' : n === 0 ? 'text-black' : 'text-[#0e7926]';
                  return (
                    <span className={`font-bold ${colorClass}`}>
                      {formatTableMoney(n)}
                    </span>
                  );
                },
              },
              {
                header: 'Balance',
                sortKey: 'balance',
                sortValue: (row) => getRowBalance(row),
                align: 'right',
                cell: (row) => <BalanceCell value={getRowBalance(row)} />,
              },
              {
                header: 'Pending Bal.',
                sortKey: 'pendingBal',
                sortValue: (row) => getRowPendingBal(row),
                align: 'right',
                cell: (row) => <PendingCell value={getRowPendingBal(row)} />,
              },
              {
                header: 'Available Bal.',
                accessor: 'avbalance',
                align: 'right',
                cell: (row) => <BalanceCell value={getRowAvbalance(row)} />,
              },
              {
                header: 'Current P&L',
                sortKey: 'currentPL',
                sortValue: (row) => getRowCurrentPL(row),
                align: 'right',
                cell: (row) => (
                  <CurrentPLCell value={getRowCurrentPL(row)} row={row} />
                ),
              },
              {
                header: 'Exposure',
                sortKey: 'shareExposure',
                sortValue: (row) => getRowDisplayExposure(row),
                align: 'right',
                cell: (row) => <ExposureCell row={row} />,
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
                cell: (row) => formatRowMyPercent(row),
              },
              {
                header: 'Type',
                accessor: 'role',
                cell: (row) => (
                  <span className='text-gray-800 capitalize'>
                    {roleTypeLabel(row.role)}
                  </span>
                ),
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
                header: 'Actions',
                cell: (row) => (
                  <div className='flex gap-1'>
                    {isFetchingAllUsers ? (
                      <>
                        <span
                          className='flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-sm bg-[#ff7f50] text-[11px] leading-none font-bold text-white'
                          onClick={() =>
                            navigate('/agent-download-list/insertagent', {
                              state: { editUser: row },
                            })
                          }
                        >
                          U
                        </span>
                        <span
                          className='flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-sm bg-[#008000] text-[11px] leading-none font-bold text-white'
                          onClick={() => openCreditDepositModal(row)}
                        >
                          D/C
                        </span>
                        <span
                          className='flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-sm bg-[#274396] text-[11px] leading-none font-bold text-white'
                          onClick={() => {
                            setWithdrawPopup(true);
                            setcurrentUser(row);
                          }}
                        >
                          W
                        </span>
                        <span
                          className='flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-sm bg-[#ff0] text-[11px] leading-none font-bold text-black'
                          onClick={() => {
                            setPasswordPopup(true);
                            setcurrentUser(row);
                          }}
                        >
                          P
                        </span>
                      </>
                    ) : null}
                    <span 
                      className='flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-sm bg-[#eb99e0] text-[11px] leading-none font-bold text-black'
                      onClick={() => navigate('/gamebetlock', { state: { targetUser: row } })}
                    >
                      GC
                    </span>
                    <span 
                      className='flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-sm bg-[#47ee31] text-[11px] leading-none font-bold text-black'
                      onClick={() => navigate('/casinolock', { state: { targetUser: row } })}
                    >
                      CC
                    </span>
                  </div>
                ),
              },
            ]}
          />

          {/* Pagination */}
          <div className='mt-4 flex flex-col justify-between gap-3 text-[13px] md:flex-row md:items-center'>
            <div>
              Showing {paginationSummary.from} to {paginationSummary.to} of{' '}
              {paginationSummary.total} entries
            </div>
            <div className='flex flex-wrap'>
              {/* First Button */}
              <button
                className='pgBtn rounded-l-sm px-[13px] py-[6.5px]'
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
                    currentPage === i + 1
                      ? 'bg-gradient-to-b from-[#11859c] to-[#181818] text-white'
                      : 'pgBtn'
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
                className='pgBtn rounded-r-sm px-[13px] py-[6.5px]'
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
                    <div className='col-span-1 px-[15px]'>Login Password</div>
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
                  <span className='text-[16px] font-semibold'>
                    Credit / Deposit
                  </span>
                  <button
                    type='button'
                    onClick={closeCreditDepositModal}
                    aria-label='Close'
                    className='text-xl leading-none font-bold text-gray-200'
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
                    <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                      My Available
                    </label>
                    <div className='flex min-w-0 flex-1 flex-wrap items-end gap-8'>
                      <input
                        type='text'
                        readOnly
                        className='min-w-[80px] flex-1 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                        value={userInfo?.avbalance ?? ''}
                      />
                      <div className='flex min-w-[80px] flex-1 flex-col gap-0.5'>
                        <span className='text-[14px]'>After</span>
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
                        <label className='mb-1 block text-[14px] text-gray-950'>
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
                        <label className='mb-1 block text-[14px] text-gray-950'>
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
                      <span className='min-w-[170px] shrink-0 text-[14px] text-gray-950'>
                        {currentUser.userName}
                      </span>
                      <div className='flex min-w-0 flex-1 flex-wrap gap-8'>
                        <input
                          type='text'
                          readOnly
                          className='min-w-[80px] flex-1 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                          value={currentUser.avbalance ?? ''}
                        />
                        <input
                          type='text'
                          readOnly
                          className='min-w-[80px] flex-1 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                          value={
                            Number(currentUser.avbalance || 0) +
                            Number(formData.balance || 0)
                          }
                        />
                      </div>
                    </div>
                    <div className='mb-3 flex flex-wrap items-center gap-2'>
                      <label className='min-w-[170px] shrink-0 text-[14px] text-gray-950'>
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
                      <label className='min-w-[170px] shrink-0 text-[14px] text-gray-950'>
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
                    <label className='min-w-[175px] shrink-0 text-[14px] text-gray-950'>
                      Login Password
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
                    className='text-xl leading-none font-bold text-gray-200'
                  >
                    ×
                  </button>
                </div>
                <div className='space-y-3 bg-sky-50 px-4 py-1'>
                  <div className='flex flex-wrap items-end gap-2'>
                    <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                      {userInfo.userName}
                    </label>
                    <div className='flex flex-1 items-end gap-8'>
                      <div className='w-1/2'>
                        <input
                          type='text'
                          value={userInfo.avbalance}
                          readOnly
                          className='w-full flex-1 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                        />
                      </div>
                      <div className='flex w-1/2 flex-col gap-0.5'>
                        <span className='text-[14px]'>After</span>
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
                    <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                      {currentUser.userName}
                    </label>
                    <div className='flex flex-1 items-end gap-8'>
                      <input
                        type='text'
                        className='w-1/2 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                        value={currentUser.avbalance}
                        readOnly
                      />
                      <input
                        type='text'
                        className='w-1/2 rounded-[2px] border border-gray-500 bg-[#4ecdde] px-2 py-1.5 outline-none'
                        value={
                          currentUser.avbalance - Number(formData.balance || 0)
                        }
                        readOnly
                      />
                    </div>
                  </div>

                  <form onSubmit={handleWithdwalDeposite}>
                    <div className='mb-3 flex flex-wrap items-center gap-2'>
                      <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
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
                      <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
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
                      <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                        Login Password
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

                    <div className='mt-3 flex justify-end gap-2 border-t border-gray-200 py-2'>
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
                  <div className='col-span-1 px-[15px]'>Login Password</div>
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
                    className='text-xl leading-none font-bold text-gray-200'
                  >
                    ×
                  </button>
                </div>

                <form
                  onSubmit={handleLockSubmit}
                  className='bg-sky-50 px-4 pt-4 pb-2'
                >
                  <div className='mb-3 flex items-center gap-3'>
                    <label className='w-[150px] shrink-0 text-[14px] text-gray-900'>
                      Remark
                    </label>
                    <input
                      type='text'
                      className='w-full border border-gray-800 bg-white px-2 py-1 outline-none'
                      value={lockForm.remark}
                      onChange={(e) =>
                        setLockForm({ ...lockForm, remark: e.target.value })
                      }
                    />
                  </div>

                  <div className='mb-2 flex items-center gap-3'>
                    <label className='w-[150px] shrink-0 text-[14px] text-gray-900'>
                      Login Password
                    </label>
                    <input
                      type='password'
                      className='w-full border border-gray-800 bg-white px-2 py-1 outline-none'
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
                      className='rounded border bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1.5 text-[14px] text-white hover:bg-gradient-to-t'
                    >
                      Submit
                    </button>
                    <button
                      type='button'
                      onClick={closeLockPopup}
                      className='rounded border bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-1.5 text-[14px] text-white hover:bg-gradient-to-t'
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
                  <span className='text-[16px] font-semibold'>
                    Change Password
                  </span>
                  <button
                    onClick={() => setPasswordPopup(false)}
                    className='text-xl leading-none font-bold text-gray-200'
                  >
                    ×
                  </button>
                </div>
                <div className='space-y-3 bg-sky-50 px-5 pt-4 pb-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                      New Password
                    </label>
                    <input
                      type='text'
                      className='flex-1 rounded-[2px] border border-gray-500 bg-white px-2 py-1.5 outline-none'
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                      Confirm Password
                    </label>
                    <input
                      type='text'
                      className='flex-1 rounded-[2px] border border-gray-500 bg-white px-2 py-1.5 outline-none'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <label className='min-w-[180px] shrink-0 text-[14px] text-gray-950'>
                      Login Password
                    </label>
                    <input
                      type='password'
                      className='flex-1 rounded-[2px] border border-gray-500 bg-white px-2 py-1.5 outline-none'
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          masterPassword: e.target.value,
                        })
                      }
                      value={formData.masterPassword}
                    />
                  </div>

                  <div className='mt-3 flex justify-end gap-2 border-t border-gray-200 py-1'>
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

          {/* Settlement Modal */}
          {settlePopup && settleSelectedUser && (
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4 }}
                className='w-full max-w-[500px] fixed top-7 overflow-hidden rounded bg-white shadow-lg'
              >
                <div className='bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 text-white text-[18px] font-medium pb-1 flex justify-between items-center'>Settlement <span className='text-[20px] flex font-bold text-gray-300 hover:text-gray-200' onClick={() => setSettlePopup(false)}>×</span></div>
                <form
                  onSubmit={handleSettleSubmit}
                  className='space-y-4 px-4 pt-5 text-[14px] bg-sky-50'
                >
                  <div className='grid grid-cols-2 gap-x-2 gap-y-4'>
                    <div className='font-bold text-gray-800'>User Name:</div>
                    <div className='text-black'>
                      {settleSelectedUser.userName}
                    </div>

                    <div className='font-bold text-gray-800'>
                      My Available Bal
                    </div>
                    <div className='font-bold text-gray-800'>P&L</div>

                    <div className='font-bold text-green-600'>
                      {Number(userInfo?.avbalance || 0).toFixed(2)}
                    </div>
                    <div
                      className={`font-bold ${settleUserPL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {Number(settleUserPL || 0).toFixed(2)}
                    </div>

                    <div className='font-bold text-gray-800'>Exposure</div>
                    <div className='font-bold text-gray-800'>
                      Amount To Settle
                    </div>

                    <div className='text-black'>
                      {Number(
                        settleSelectedUser.shareExposure ??
                          settleSelectedUser.exposure ??
                          0
                      ).toFixed(2)}
                    </div>
                    <div
                      className={`font-bold ${settleUserPL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {Number(settleUserPL || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className='mt-4 flex items-center gap-1'>
                    <label className='w-[140px] font-bold text-gray-800'>
                      Settle Amount
                    </label>
                    <input
                      type='number'
                      step='0.01'
                      className='h-[30px] flex-1 border border-gray-800 px-2 outline-none'
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      required
                    />
                    <button
                      type='button'
                      onClick={() =>
                        setSettleAmount(Math.abs(settleUserPL || 0).toFixed(2))
                      }
                      className='rounded-sm border border-black bg-gradient-to-b from-[#545454] to-[#000] px-2 py-1 text-white hover:opacity-90'
                    >
                      Full Settle
                    </button>
                  </div>

                  <div className='flex items-start gap-1'>
                    <label className='w-[140px] font-bold text-gray-800'>
                      Remarks
                    </label>
                    <textarea
                      rows={3}
                      className='flex-1 border border-gray-800 px-2 py-1 outline-none'
                      value={settleRemarks}
                      onChange={(e) => setSettleRemarks(e.target.value)}
                    />
                  </div>

                  <div className='flex items-center gap-1'>
                    <label className='w-[140px] font-bold text-gray-800'>
                      Master Password
                    </label>
                    <input
                      type='password'
                      className='h-[30px] flex-1 border border-gray-800 px-2 outline-none'
                      value={settlePassword}
                      onChange={(e) => setSettlePassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className='flex justify-end gap-1 py-1.5 border-t border-gray-200'>
                    <button
                      type='submit'
                      disabled={isSettling}
                      className='rounded-[3px] bg-gradient-to-b hover:bg-gradient-to-t from-[#5ecbdd] to-[#146578] px-6 py-1.5 text-white shadow hover:opacity-90 disabled:opacity-50'
                    >
                      {isSettling ? 'Processing...' : 'Submit'}
                    </button>
                    <button
                      type='button'
                      onClick={() => setSettlePopup(false)}
                      className='rounded-[3px] bg-gradient-to-b hover:bg-gradient-to-t from-[#5ecbdd] to-[#146578] px-6 py-1.5 text-white shadow hover:opacity-90'
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Exposure Modal */}
          {exposurePopup && (
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className='w-[90%] fixed top-7 overflow-hidden rounded bg-white shadow-xl'
              >
                <div className='flex items-center justify-between bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 pb-1 text-white leading-none'>
                  <h2 className='text-[18px] font-medium'>User Event Exposure</h2>
                  <button
                    onClick={closeExposurePopup}
                    className='text-[22px] leading-none font-bold text-gray-300 hover:text-gray-100'
                  >
                    ×
                  </button>
                </div>

                <div className='max-h-[80vh] overflow-y-auto bg-gray-50 p-4'>
                  {isFetchingExposure ? (
                    <div className='py-10 text-center'>Loading...</div>
                  ) : exposureData && exposureData.length > 0 ? (
                    <table className='w-full border-collapse border border-gray-300 text-[13px]'>
                      <thead>
                        <tr className='bg-[#434141ba] text-white'>
                          <th className='border border-gray-300 px-2 py-1.5 text-left font-bold'>
                            Event Date & Time
                          </th>
                          <th className='border border-gray-300 px-2 py-1.5 text-left font-bold'>
                            Series Name
                          </th>
                          <th className='border border-gray-300 px-2 py-1.5 text-left font-bold'>
                            Event Name
                          </th>
                          <th className='border border-gray-300 px-2 py-1.5 text-left font-bold'>
                            Market Type
                          </th>
                          <th className='border border-gray-300 px-2 py-1.5 text-right font-bold'>
                            Exposure
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {exposureData.map((item, idx) => (
                          <tr key={idx} className='bg-white'>
                            <td className='border border-gray-300 px-2 py-1.5'>
                              {item.eventDate
                                ? new Date(item.eventDate).toLocaleString(
                                    'en-IN'
                                  )
                                : '—'}
                            </td>
                            <td className='border border-gray-300 px-2 py-1.5'>
                              {item.sportName}
                            </td>
                            <td className='border border-gray-300 px-2 py-1.5'>
                              <span
                                className='cursor-pointer font-bold text-black underline hover:text-blue-600'
                                onClick={() => {
                                  closeExposurePopup();
                                  const sName =
                                    item.sportName?.toLowerCase() || '';
                                  if (
                                    sName === 'cricket' ||
                                    sName === 'tennis' ||
                                    sName === 'soccer'
                                  ) {
                                    navigate(
                                      `/${sName}-bet/${item.sportName}/${item.eventName}/${item.gameId}`
                                    );
                                  } else if (sName === 'casino') {
                                    navigate(`/casino-bet/${item.gameId}`);
                                  } else {
                                    // default fallback
                                    navigate(
                                      `/cricket-bet/Cricket/${item.eventName}/${item.gameId}`
                                    );
                                  }
                                }}
                              >
                                {item.eventName}
                              </span>
                            </td>
                            <td className='border border-gray-300 px-2 py-1.5 uppercase'>
                              {item.marketName}
                            </td>
                            <td className='border border-gray-300 px-2 py-1.5 text-right font-bold text-red-600'>
                              {Number(item.displayExposure).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className='py-10 text-center'>No exposure found.</div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
