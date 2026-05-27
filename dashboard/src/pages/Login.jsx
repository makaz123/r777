import React, { useState } from 'react';
import { FaUser, FaEye, FaEyeSlash, FaArrowRight } from 'react-icons/fa';
import brandLogo from '../assets/brand_logo.svg';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAdmin, loginAdmin } from '../redux/reducer/authReducer';
import { hasValidSessionUser } from '../components/PrivateRoute';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    userName: '',
    password: '',
  });
  const [touched, setTouched] = useState({
    userName: false,
    password: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const getPostAuthPath = () => {
    const fromPath = location.state?.from?.pathname;
    return fromPath && fromPath !== '/login' && fromPath !== '/'
      ? fromPath
      : '/home';
  };

  useEffect(() => {
    if (hasValidSessionUser(userInfo)) {
      navigate(getPostAuthPath(), { replace: true });
    }
  }, [userInfo, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await dispatch(loginAdmin(formData)).unwrap();
      toast.success(data.message);
      await dispatch(getAdmin()).unwrap();
      navigate(getPostAuthPath(), { replace: true });
    } catch (error) {
      toast.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePass = (e) => {
    e.preventDefault();
    setShowPassword(!showPassword);
  };

  return (
    <div className='flex h-screen items-center bg-gradient-to-b from-[#022c43] to-[#18b0c8]'>
      <div className='fixed top-1/2 left-1/2 flex w-[84%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg border-4 border-gray-700 bg-black p-7 text-white md:w-[300px]'>
        <img src={brandLogo} alt='logo' className='h-[35px] object-cover' />
        <div className='w-full overflow-hidden rounded pt-5 text-[14px]'>
          <label htmlFor='username'>User Name:</label>
          <input
            type='text'
            placeholder='Username'
            value={formData.userName}
            onChange={(e) =>
              setFormData({ ...formData, userName: e.target.value })
            }
            onBlur={() => setTouched({ ...touched, userName: true })}
            className='mt-2 w-full rounded-sm border border-[#ced4da] bg-white px-2 py-1.5 text-[18px] text-black placeholder-gray-500 focus:outline-none md:py-1 md:text-[14px]'
          />
        </div>

        <div className='w-full overflow-hidden rounded pt-5 text-[14px]'>
          <label htmlFor='password'>Password:</label>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder='Password'
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            onBlur={() => setTouched({ ...touched, password: true })}
            className='mt-2 w-full rounded-sm border border-gray-300 bg-white px-2 py-1.5 text-[18px] text-black placeholder-gray-500 focus:outline-none md:py-1 md:text-[14px]'
          />
        </div>

        <button
          onClick={handleSubmit}
          className='mt-5 flex w-full items-center justify-center rounded border border-[#6fe3f5] bg-gradient-to-b from-[#6fe3f5] to-[#065265] py-2 text-[16px] font-semibold text-white transition-colors hover:bg-[#0077b3]'
        >
          {isLoading ? (
            <span className='flex items-center justify-center gap-2'>
              <svg
                className='h-5 w-5 animate-spin'
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                ></circle>
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                ></path>
              </svg>
              Logging in...
            </span>
          ) : (
            <>LOGIN</>
          )}
        </button>
      </div>
    </div>
  );
};

export default Login;
