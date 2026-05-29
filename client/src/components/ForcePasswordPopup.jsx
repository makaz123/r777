import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { changePasswordByFirstLogin, user_reset } from '../redux/reducer/authReducer';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';
import api from '../redux/api';

const ForcePasswordPopup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [changeFormData, setChangeFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = async () => {
    try {
      await api.get('/customer/logout', {
        withCredentials: true,
      });
      localStorage.removeItem('auth');
      dispatch(user_reset());
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const changeSubmit = async (e) => {
    e.preventDefault();

    if (changeFormData.newPassword !== changeFormData.confirmPassword) {
      toast.error('New Password and Confirm Password must match.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await dispatch(
        changePasswordByFirstLogin({
          oldPassword: changeFormData.oldPassword,
          newPassword: changeFormData.newPassword,
          confirmPassword: changeFormData.confirmPassword,
        })
      );

      if (result.type.endsWith('/fulfilled')) {
        toast.success(
          result.payload?.message || 'Password changed successfully'
        );
      } else if (result.type.endsWith('/rejected')) {
        toast.error(result.payload?.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className='fixed top-0 left-0 z-40 h-full w-full bg-black/60'
      />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className='fixed top-1/2 left-1/2 z-50 w-[95%] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border-[5px] border-[#27a6c3] bg-white px-[15px] py-[10px] shadow-2xl'
      >
        <div className='relative flex items-center justify-center gap-2 text-black'>
          <span className='text-[18px] font-bold'>
            Set Password
          </span>
          <button
            type='button'
            aria-label='Close'
            onClick={handleClose}
            className='absolute top-1/2 right-3 -translate-y-1/2 text-xl font-bold'
          >
            ×
          </button>
        </div>

        <form
          onSubmit={changeSubmit}
          className='flex flex-col gap-3 p-4 text-[14px] text-black'
        >
          <div>
            <div>Old Password</div>
            <div className='relative'>
              <input
                type={showOld ? 'text' : 'password'}
                placeholder='Old Password'
                value={changeFormData.oldPassword}
                onChange={(e) =>
                  setChangeFormData({
                    ...changeFormData,
                    oldPassword: e.target.value,
                  })
                }
                className='w-full rounded-xl border border-black px-3 py-2 text-[14px] text-black focus:outline-none'
                required
              />
              <span
                className='absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer text-gray-500'
                onClick={() => setShowOld(!showOld)}
              >
                {showOld ? <FaRegEye /> : <FaRegEyeSlash />}
              </span>
            </div>
          </div>

          <div>
            <div>New Password</div>
            <div className='relative'>
              <input
                type={showNew ? 'text' : 'password'}
                placeholder='New Password'
                value={changeFormData.newPassword}
                onChange={(e) =>
                  setChangeFormData({
                    ...changeFormData,
                    newPassword: e.target.value,
                  })
                }
                className='w-full rounded-xl border border-black px-3 py-2 text-[14px] text-black focus:outline-none'
                required
              />
              <span
                className='absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer text-gray-500'
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <FaRegEye /> : <FaRegEyeSlash />}
              </span>
            </div>
          </div>

          <div>
            <div>Confirm Password</div>
            <div className='relative'>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder='Confirm Password'
                value={changeFormData.confirmPassword}
                onChange={(e) =>
                  setChangeFormData({
                    ...changeFormData,
                    confirmPassword: e.target.value,
                  })
                }
                className='w-full rounded-xl border border-black px-3 py-2 text-[14px] text-black focus:outline-none'
                required
              />
              <span
                className='absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer text-gray-500'
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <FaRegEye /> : <FaRegEyeSlash />}
              </span>
            </div>
          </div>

          <button
            type='submit'
            disabled={submitting}
            className='mt-2 flex w-full items-center justify-center rounded border-[1px] border-[#065265] bg-gradient-to-b from-[#6fe3f5] to-[#065265] py-2 text-[16px] text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.5)] hover:bg-gradient-to-t disabled:opacity-70'
          >
            {submitting ? 'Please wait…' : 'Submit'}
          </button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};

export default ForcePasswordPopup;
