'use client';
import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Password and Confirm Password do not match');
      return;
    }
    if (userInfo) {
      try {
        const result = await dispatch(addAdmin(formData)).unwrap();
        toast.success(result.message);
        dispatch(getAdmin());
        navigate('/agent-download-list');
      } catch (error) {
        toast.error(error);
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
      <div className='p-1 px-[15px] md:px-5'>
        <div className='my-[13px]'>
          <div className='mx-auto'>
            <div className='add-account rounded-lg bg-white'>
              <div className='pb-2'>
                <span className='text-[26px]'>Add Account</span>
              </div>

              <form
                onSubmit={handleSubmit}
                className='py-3 font-semibold md:px-1'
              >
                <div className='flex gap-x-10'>
                  <div className='flex-1/2'>
                    <div className='bg-[#2c3e50] px-2 py-1 text-[16px] text-white'>
                      Personal Details
                    </div>
                    <div className='my-3 grid grid-cols-2 gap-x-5 gap-y-2'>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Client Name:
                        </span>
                        <input
                          type='text'
                          className={inputClass}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              userName: e.target.value,
                            })
                          }
                          value={formData.userName}
                          placeholder='Add here'
                        />
                      </div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Full Name:
                        </span>
                        <input
                          type='text'
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          value={formData.name}
                          className={inputClass}
                          placeholder='Add here'
                        />
                      </div>

                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Phone:
                        </span>
                        <input
                          type='text'
                          className={inputClass}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          value={formData.phone}
                          placeholder='Add here'
                        />
                      </div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Retype Password:
                        </span>
                        <span className='relative block'>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder='Enter your password...'
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                password: e.target.value,
                              })
                            }
                            value={formData.password}
                            className={`${inputClass} pr-10`}
                          />
                          <button
                            type='button'
                            className='absolute inset-y-0 right-3 flex items-center text-gray-500'
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </span>
                      </div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Confirm Password:
                        </span>
                        <span className='relative block'>
                          <input
                            type={showPassword2 ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                confirmPassword: e.target.value,
                              })
                            }
                            placeholder='Enter your password...'
                            className={`${inputClass} pr-10`}
                          />
                          <button
                            type='button'
                            className='absolute inset-y-0 right-3 flex items-center text-gray-500'
                            onClick={() => setShowPassword2(!showPassword2)}
                          >
                            {showPassword2 ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='flex-1/2'>
                    <div className='bg-[#2c3e50] px-2 py-1 text-[16px] text-white'>
                      Account Details
                    </div>
                    <div className='my-3 grid grid-cols-2 gap-x-5 gap-y-2'>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Account Type:
                        </span>
                        <select
                          className={`${inputClass} text-gray-500 capitalize`}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              accountType: e.target.value,
                            })
                          }
                          value={formData.accountType}
                        >
                          <option value=''>Select A/c Type</option>
                          {allowedRoles.map((roleOption) => (
                            <option key={roleOption} value={roleOption}>
                              {roleOption === 'white'
                                ? 'White_level'
                                : roleOption.charAt(0).toUpperCase() +
                                  roleOption.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Opening Balance:
                        </span>
                        <input
                          type='number'
                          className={inputClass}
                          onChange={(e) => {
                            const openingValue = e.target.value;
                            if (openingValue.includes('.')) {
                              toast.error(
                                'The bank balance must be an integer'
                              );
                              return;
                            }
                            setFormData({ ...formData, balance: openingValue });
                          }}
                          value={formData.balance}
                          placeholder='Add here'
                        />
                      </div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Credit Reference:
                        </span>
                        <input
                          type='number'
                          className={inputClass}
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
                          placeholder='Add here'
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className='mt-5'>
                  <div className='mb-4 w-full bg-[#2c3e50] px-2 py-1 text-[16px] text-white'>
                    Comission Setting
                  </div>
                  <div className='flex items-center border border-b-0 border-gray-300'>
                    <div className='flex-1/4 border-r border-gray-300 px-2 py-2.5 font-light'>
                      Commission
                    </div>
                    <div className='flex-3/4 px-2 py-2.5'>
                      <input
                        type='text'
                        className='w-full bg-white px-2 py-0.5 disabled:cursor-not-allowed disabled:bg-gray-100'
                        placeholder='0'
                        disabled={isUserAccount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            commition: e.target.value,
                          })
                        }
                        value={formData.commition}
                      />
                    </div>
                  </div>
                  {/* Rolling Commission removed — use Commission % only (match odds wins) */}
                </div>

                <div className='mt-5'>
                  <div className='mb-4 w-full bg-[#2c3e50] px-2 py-1 text-[16px] text-white'>
                    Partnership
                  </div>
                  <div className='flex items-center border border-gray-300'>
                    <div className='flex-1/4 border-r border-gray-300 px-2 py-2.5 font-light'>
                      Downline
                    </div>
                    <div className='flex-3/4 px-2 py-2.5'>
                      <input
                        type='text'
                        className='w-full bg-white px-2 py-0.5 disabled:cursor-not-allowed disabled:bg-gray-100'
                        placeholder='0'
                        disabled={isUserAccount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            partnership: e.target.value,
                          })
                        }
                        value={formData.partnership}
                      />
                    </div>
                  </div>
                </div>

                <div className='mt-4 flex gap-x-10'>
                  <div className='flex-1/2'></div>
                  <div className='flex-1/2'>
                    <div className='my-3 grid grid-cols-2 gap-x-5 gap-y-2'>
                      <div></div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Master Password:
                        </span>
                        <span className='relative block'>
                          <input
                            type={showPassword3 ? 'text' : 'password'}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                masterPassword: e.target.value,
                              })
                            }
                            value={formData.masterPassword}
                            placeholder='Enter your password...'
                            className={`${inputClass} pr-10`}
                          />
                          <button
                            type='button'
                            className='absolute inset-y-0 right-3 flex items-center text-gray-500'
                            onClick={() => setShowPassword3(!showPassword3)}
                          >
                            {showPassword3 ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </span>
                        <div className='flex justify-end'>
                          <button className='mt-3 ml-auto w-[140px] rounded-md bg-[#0088cc] px-[10px] py-[5px] text-[14px] text-white'>
                            Create
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
