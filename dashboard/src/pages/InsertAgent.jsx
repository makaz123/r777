'use client';
import { useMemo, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  clampDownlineSharingPercent,
  getAccountMyKeepPercent,
  getRemainingMySharePercent,
} from '@partnership-utils';
import { LOGIN_PASSWORD_CONFIRM_LABEL } from '../config/featureFlags';
import { addAdmin, getAdmin } from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';

export default function InsertAgent() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [showPassword3, setShowPassword3] = useState(false);

  const roleHierarchy = {
    supperadmin: ['admin', 'white', 'super', 'master', 'agent', 'user'],
    admin: ['white', 'super', 'master', 'agent', 'user'],
    white: ['super', 'master', 'agent', 'user'],
    super: ['master', 'agent', 'user'],
    master: ['agent', 'user'],
    agent: ['user'],
  };

  const allowedRoles = roleHierarchy[userInfo?.role] || [];

  const [formData, setFormData] = useState({
    name: '',
    userName: '',
    accountType: '',
    commition: '',
    balance: null,
    exposureLimit: null,
    creditReference: null,
    rollingCommission: null,
    partnership: null,
    phone: null,
    password: '',
    confirmPassword: '',
    masterPassword: '',
    remark: '',
    status: 'active',
  });
  const isUserAccount = formData.accountType === 'user';
  const [downlineSharingInput, setDownlineSharingInput] = useState('');

  const parentMyShare = useMemo(() => {
    const fromSummary = userInfo?.accountSummary?.mySharePercent;
    if (fromSummary != null && Number.isFinite(Number(fromSummary))) {
      return Number(fromSummary);
    }
    return getAccountMyKeepPercent(userInfo);
  }, [userInfo]);

  const downlineSharingPercent = useMemo(
    () =>
      downlineSharingInput === ''
        ? 0
        : clampDownlineSharingPercent(downlineSharingInput, parentMyShare),
    [downlineSharingInput, parentMyShare]
  );

  const remainingMyShare = useMemo(
    () => getRemainingMySharePercent(parentMyShare, downlineSharingPercent),
    [parentMyShare, downlineSharingPercent]
  );

  const handleDownlineSharingChange = (e) => {
    const raw = e.target.value;
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;

    const capped =
      raw === '' ? '' : String(clampDownlineSharingPercent(raw, parentMyShare));

    setDownlineSharingInput(capped);
    setFormData((prev) => ({
      ...prev,
      partnership: capped === '' ? null : Number(capped),
    }));
  };

  const handleAccountTypeChange = (accountType) => {
    const isUser = accountType === 'user';
    setDownlineSharingInput('');
    setFormData((prev) => ({
      ...prev,
      accountType,
      partnership: isUser ? null : prev.partnership,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.accountType || formData.accountType === 'Select User Type') {
      toast.error('Please select an account type');
      return;
    }
    if (!formData.name?.trim()) {
      toast.error('Client name is required');
      return;
    }
    if (!formData.userName?.trim()) {
      toast.error('User name is required');
      return;
    }
    if (!formData.password) {
      toast.error('Password is required');
      return;
    }
    if (!formData.masterPassword) {
      toast.error(`${LOGIN_PASSWORD_CONFIRM_LABEL} is required`);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Password and Confirm Password do not match');
      return;
    }
    if (!isUserAccount && downlineSharingInput === '') {
      toast.error('Downline sharing is required for agent accounts');
      return;
    }
    if (!isUserAccount && downlineSharingPercent > parentMyShare) {
      toast.error(
        `Downline sharing cannot exceed your my share (${parentMyShare}%)`
      );
      return;
    }
    if (userInfo) {
      try {
        const result = await dispatch(addAdmin(formData)).unwrap();
        toast.success(result.message);
        dispatch(getAdmin());
        navigate('/user-download-list');
      } catch (error) {
        toast.error(
          typeof error === 'string'
            ? error
            : error?.message || 'Failed to create account'
        );
      }
    } else {
      navigate('/login');
    }
  };

  const inputClass =
    'col-span-2 mt-1 w-full basis-full rounded-sm border border-gray-300 bg-white px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:py-1.5 md:text-sm';

  return (
    <>
      <Navbar />
      <div className='scrollbar-hide overflow-y-scroll bg-[#f0f0f5] md:px-[15px] md:py-[13px]'>
        <div className='h-full rounded-lg bg-white px-[15px] py-[7px] min-h-[600px] pb-10'>
          <span className='text-[16px] font-bold'>Add/Edit Client Account</span>

          <form onSubmit={handleSubmit}>
            <div className='mt-6 flex flex-wrap'>
              <div className='w-full md:w-1/2 md:pr-[15px]'>
                <div className='relative rounded-md border border-black p-4'>
                  {/* Title */}
                  <span className='absolute -top-3 left-3 bg-white px-1 text-[14px] font-semibold'>
                    Account Details:
                  </span>

                  {/* Form Row */}
                  <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    {/* Account Type */}
                    <div className='flex flex-col'>
                      <label className='mb-2 text-[13px] font-medium'>
                        Account Type:
                      </label>

                      <select
                        className='rounded-sm border border-gray-300 bg-white px-2 py-1 text-gray-700 outline-none focus:border-[#4ecddd]'
                        onChange={(e) =>
                          handleAccountTypeChange(e.target.value)
                        }
                        value={formData.accountType}
                      >
                        <option>Select User Type</option>
                        {allowedRoles.map((roleOption) => (
                          <option key={roleOption} value={roleOption}>
                            {roleOption === 'white'
                              ? 'Admin'
                              : roleOption === 'admin'
                                ? 'Main Admin'
                                : roleOption.charAt(0).toUpperCase() +
                                  roleOption.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Client Name */}
                    <div className='flex flex-col'>
                      <label className='mb-2 text-[13px] font-medium'>
                        Client Name:
                      </label>

                      <input
                        type='text'
                        placeholder='Client Name'
                        className='rounded-sm border border-gray-300 px-2 py-1 outline-none focus:border-[#4ecddd]'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            name: e.target.value,
                          })
                        }
                        value={formData.name}
                      />
                    </div>
                  </div>
                </div>

                <div className='relative mt-3 rounded-md border border-black px-[15px] pt-2 pb-5'>
                  {/* Title */}
                  <span className='absolute -top-3 left-3 bg-white px-1 text-[14px] font-semibold'>
                    Commission:
                  </span>

                  {/* Form Row */}
                  <div className='grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2'>
                    <div>
                      <div className='mb-2.5 text-center'>
                        Cricket / Soccer / Tennis
                      </div>
                      <div className='mb-4 flex items-center justify-center text-center text-[13px] font-bold'>
                        Commision:M.O
                        <input
                          type='text'
                          className='h-[30px] w-[15%] rounded-sm border border-[#ced4da] px-2 py-[1px] font-light text-gray-500'
                          value={formData.commition}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              commition: e.target.value,
                            })
                          }
                        />
                        <span className='px-0.5 text-[#a1aed4]'>%</span>
                        <span>({formData.commition || 0}%)</span>
                      </div>
                    </div>
                    <div></div>
                  </div>
                </div>
                {!isUserAccount && formData.accountType && (
                  <div className='relative mt-3 rounded-md border border-black px-[15px] pt-2 pb-5'>
                    {/* Title */}
                    <span className='absolute -top-3 left-3 bg-white px-1 text-[14px] font-semibold'>
                      Partnership Sharing:
                    </span>

                    {/* Form Row */}
                    <div className='grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2'>
                      <div>
                        <div className='mb-2.5 text-center'></div>
                        <div className='mb-4 flex items-center justify-center text-center text-[13px] font-bold'>
                          Downline Sharing:
                          <input
                            type='text'
                            inputMode='decimal'
                            className='h-[30px] w-[15%] rounded-sm border border-[#ced4da] px-2 py-[1px] font-light text-gray-500'
                            value={downlineSharingInput}
                            onChange={handleDownlineSharingChange}
                            max={parentMyShare}
                          />
                          <span className='px-0.5 text-[#a1aed4]'>%</span>
                          <span className='ml-1 text-black'>
                            (My Sharing {remainingMyShare}%)
                          </span>
                        </div>
                      </div>
                      <div></div>
                    </div>
                  </div>
                )}
              </div>

              <div className='w-full md:w-1/2 md:pl-[15px] mt-4 md:mt-0'>
                <div className='relative rounded-md border border-black p-4'>
                  {/* Title */}
                  <span className='absolute -top-3 left-3 bg-white px-1 text-[14px] font-semibold'>
                    Personal Details:
                  </span>

                  {/* Form Row */}
                  <div className='grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2'>
                    <div className='flex flex-col'>
                      <label className='mb-2 text-[13px] font-medium'>
                        User Name:
                      </label>

                      <input
                        type='text'
                        className='rounded-sm border border-gray-300 px-2 py-1 outline-none focus:border-[#4ecddd]'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            userName: e.target.value,
                          })
                        }
                        value={formData.userName}
                      />
                    </div>

                    <div className='flex flex-col'>
                      <label className='mb-2 text-[13px] font-medium'>
                        Password:
                      </label>

                      <input
                        type='text'
                        className='rounded-sm border border-gray-300 px-2 py-1 outline-none focus:border-[#4ecddd]'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          })
                        }
                        value={formData.password}
                      />
                    </div>

                    <div className='flex flex-col'>
                      <label className='mb-2 text-[13px] font-medium'>
                        Retype Password:
                      </label>

                      <input
                        type='text'
                        className='rounded-sm border border-gray-300 px-2 py-1 outline-none focus:border-[#4ecddd]'
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className='flex flex-col'>
                      <label className='mb-2 text-[13px] font-medium'>
                        Reference Name:
                      </label>

                      <input
                        type='text'
                        placeholder='Reference Name'
                        className='rounded-sm border border-gray-300 px-2 py-1 outline-none focus:border-[#4ecddd]'
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='mt-7 flex flex-wrap'>
              <div className='w-full md:w-1/2 md:pr-[15px]'>
                <div className='relative rounded-md border border-black p-4'>
                  {/* Title */}
                  <span className='absolute -top-3 left-3 bg-white px-1 text-[14px] font-semibold'>
                    Sport & Casino Balance
                  </span>

                  {/* Form Row */}
                  <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
                    <div className='flex flex-col'>
                      <label className='mb-2 text-[13px] font-medium'>
                        Credit Reference:
                      </label>
                      <input
                        type='text'
                        placeholder='Credit Reference'
                        className='rounded-sm border border-gray-300 px-2 py-1 outline-none focus:border-[#4ecddd]'
                        onChange={(e) => {
                          const crRefValue = e.target.value;
                          let roundedValue = crRefValue;
                          if (crRefValue.includes('.')) {
                            roundedValue = Math.round(
                              parseFloat(crRefValue)
                            ).toString();
                          }
                          setFormData({
                            ...formData,
                            creditReference: roundedValue,
                          });
                        }}
                        value={formData.creditReference}
                      />
                    </div>

                    <div className='flex flex-col'>
                      <label className='mb-2 text-[13px] font-medium'>
                        Add Deposit:
                      </label>
                      <input
                        type='text'
                        placeholder='Amount'
                        className='rounded-sm border border-gray-300 px-2 py-1 outline-none focus:border-[#4ecddd]'
                        onChange={(e) => {
                          const openingValue = e.target.value;
                          if (openingValue.includes('.')) {
                            toast.error('The bank balance must be an integer');
                            return;
                          }
                          setFormData({ ...formData, balance: openingValue });
                        }}
                        value={formData.balance}
                      />
                    </div>

                    <div className='flex flex-col'>
                      <label className='mb-2 text-[13px] font-medium'>
                        Deposit Remark:
                      </label>
                      <input
                        type='text'
                        placeholder='Remark'
                        className='rounded-sm border border-gray-300 px-2 py-1 outline-none focus:border-[#4ecddd]'
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className='w-full md:w-1/2 md:pl-[15px] mt-2 md:mt-0'>
                <div className='grid grid-cols-1 items-end gap-6 md:grid-cols-2'>
                  <div className='flex flex-col'>
                    <label className='mb-2 text-[13px] font-medium'>
                      {LOGIN_PASSWORD_CONFIRM_LABEL}
                    </label>
                    <input
                      type='text'
                      className='flex-1 rounded-sm border border-gray-300 px-2 py-1 outline-none focus:border-[#4ecddd]'
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          masterPassword: e.target.value,
                        })
                      }
                      value={formData.masterPassword}
                    />
                  </div>
                  <div className='flex flex-col'>
                    <button className='w-fit rounded-sm border border-[#146578] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-[19px] py-1 text-white hover:bg-gradient-to-t'>
                      Create Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
