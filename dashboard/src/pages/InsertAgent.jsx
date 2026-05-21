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
          <div className='px-[15px] bg-[#f0f0f5] py-[13px] h-[calc(100vh-52px)] overflow-y-scroll'>
            <div className='rounded-lg bg-white py-[7px] px-[15px] h-full min-h-[600px]'>
              <span className='text-[16px] font-bold'>Add/Edit Client Account</span>

              <form onSubmit={handleSubmit}>

                <div className='flex mt-6'>
                  <div className='pr-[15px] w-1/2'>
                    <div className="border border-black rounded-md p-4 relative">
                      {/* Title */}
                      <span className="absolute -top-3 left-3 bg-white px-1 font-semibold text-[14px]">
                        Account Details:
                      </span>

                      {/* Form Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Account Type */}
                        <div className="flex flex-col">
                          <label className="mb-2 text-[13px] font-medium">
                            Account Type:
                          </label>

                          <select className="border border-gray-300 rounded-sm px-2 py-1 outline-none focus:border-[#4ecddd] bg-white text-gray-700"
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              accountType: e.target.value,
                            })
                          }
                          value={formData.accountType}
                          >
                            <option>Select User Type</option>
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

                        {/* Client Name */}
                        <div className="flex flex-col">
                          <label className="mb-2 text-[13px] font-medium">
                            Client Name:
                          </label>

                          <input
                            type="text"
                            placeholder="Client Name"
                            className="border border-gray-300 rounded-sm px-2 py-1 outline-none focus:border-[#4ecddd]"
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                userName: e.target.value,
                              })
                            }
                            value={formData.userName}
                          />
                        </div>

                      </div>
                    </div>


                    <div className="border border-black rounded-md px-[15px] pt-2 pb-5 relative mt-3">
                      {/* Title */}
                      <span className="absolute -top-3 left-3 bg-white px-1 font-semibold text-[14px]">
                        Commission:
                      </span>

                      {/* Form Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                        <div>
                          <div className='text-center mb-2.5'>Cricket / Soccer / Tennis</div>
                          <div className='text-center mb-4 flex justify-center items-center font-bold text-[13px]'>Commision:M.O 
                            <input type='text' className='w-[15%] h-[30px] py-[1px] px-2 rounded-sm border border-[#ced4da] text-gray-500 font-light' value={1}/> 
                            <span className='text-[#a1aed4] px-0.5'>%</span>
                            <span>(1%)</span>
                          </div>
                        </div>
                        <div></div>
                      </div>
                    </div>
                  </div>

                  <div className='pl-[15px] w-1/2'>
                    <div className="border border-black rounded-md p-4 relative">
                      {/* Title */}
                      <span className="absolute -top-3 left-3 bg-white px-1 font-semibold text-[14px]">
                        Personal Details:
                      </span>

                      {/* Form Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                        
                        <div className="flex flex-col">
                          <label className="mb-2 text-[13px] font-medium">
                            User Name:
                          </label>

                          <input
                            type="text"
                            className="border border-gray-300 rounded-sm px-2 py-1 outline-none focus:border-[#4ecddd]"
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                userName: e.target.value,
                              })
                            }
                            value={formData.userName}
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="mb-2 text-[13px] font-medium">
                            Password:
                          </label>

                          <input
                            type="text"
                            className="border border-gray-300 rounded-sm px-2 py-1 outline-none focus:border-[#4ecddd]"
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                password: e.target.value,
                              })
                            }
                            value={formData.password}
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="mb-2 text-[13px] font-medium">
                            Retype Password:
                          </label>

                          <input
                            type="text"
                            className="border border-gray-300 rounded-sm px-2 py-1 outline-none focus:border-[#4ecddd]"
                            value={formData.confirmPassword}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                confirmPassword: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="mb-2 text-[13px] font-medium">
                            Reference Name:
                          </label>

                          <input
                            type="text"
                            placeholder="Reference Name"
                            className="border border-gray-300 rounded-sm px-2 py-1 outline-none focus:border-[#4ecddd]"
                          />
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

                <div className='flex mt-7'>
                  <div className='pr-[15px] w-1/2'>
                    <div className="border border-black rounded-md p-4 relative">
                      {/* Title */}
                      <span className="absolute -top-3 left-3 bg-white px-1 font-semibold text-[14px]">
                        Sport & Casino Balance
                      </span>

                      {/* Form Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <div className="flex flex-col">
                          <label className="mb-2 text-[13px] font-medium">
                            Credit Reference:
                          </label>
                          <input
                            type="text"
                            placeholder="Credit Reference"
                            className="border border-gray-300 rounded-sm px-2 py-1 outline-none focus:border-[#4ecddd]"
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

                        <div className="flex flex-col">
                          <label className="mb-2 text-[13px] font-medium">
                            Add Deposit:
                          </label>
                          <input
                            type="text"
                            placeholder="Amount"
                            className="border border-gray-300 rounded-sm px-2 py-1 outline-none focus:border-[#4ecddd]"
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
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="mb-2 text-[13px] font-medium">
                            Deposit Remark:
                          </label>
                          <input
                            type="text"
                            placeholder="Remark"
                            className="border border-gray-300 rounded-sm px-2 py-1 outline-none focus:border-[#4ecddd]"
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className='pl-[15px] w-1/2 '>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6 items-end'>
                      <div className="flex flex-col">
                        <label className="mb-2 text-[13px] font-medium">
                          Master Password
                        </label>
                        <input
                            type="text"
                            className="flex-1 border border-gray-300 rounded-sm px-2 py-1 outline-none focus:border-[#4ecddd]"
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                masterPassword: e.target.value,
                              })
                            }
                            value={formData.masterPassword}
                          />
                      </div>
                      <div className="flex flex-col">
                        <button className='py-1 px-[19px] bg-gradient-to-b from-[#5ecbdd] to-[#146578] border border-[#146578] text-white hover:bg-gradient-to-t rounded-sm w-fit'>Create Account</button>
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
