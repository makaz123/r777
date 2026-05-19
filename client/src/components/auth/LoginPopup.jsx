import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  FaUser,
  FaKey,
  FaArrowRight,
  FaRegEye,
  FaRegEyeSlash,
} from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import brandLogo from '../../assets/brand_logo.svg';
import { demoLogin, loginUser } from '../../redux/reducer/authReducer';
import { useTranslation } from '../../context/LanguageContext';

function LoginPopup({ open, onClose, onSuccess }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({ userName: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (open) setFormData({ userName: '', password: '' });
  }, [open]);

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    if (!formData.userName || !formData.password) {
      toast.error(t('please_enter_username_password', 'Please enter username and password'));
      return;
    }
    try {
      setSubmitting(true);
      const response = await dispatch(loginUser(formData));
      if (response.payload?.success) {
        toast.success(response.payload.message || 'Login successful');
        onSuccess?.(response.payload);
        onClose?.();
      } else {
        toast.error(response.payload?.message || 'Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setSubmitting(true);
      const response = await dispatch(demoLogin());
      if (response.payload?.success) {
        toast.success(response.payload.message || 'Demo login successful');
        onSuccess?.(response.payload);
        onClose?.();
      } else {
        toast.error(response.payload?.message || 'Demo login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed top-0 left-0 z-20 h-full w-full bg-black/60'
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className='fixed top-1/2 left-1/2 z-30 w-[95%] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border-[5px] border-[#27a6c3] bg-white px-[15px] py-[10px] shadow-2xl'
          >
            <div className='relative flex items-center justify-center gap-2 text-black'>
              <span className='text-[18px] font-bold'>{t('login', 'Login')}</span>
              <button
                type='button'
                onClick={onClose}
                aria-label='Close'
                className='absolute top-1/2 right-3 -translate-y-1/2 text-xl font-bold'
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleLogin}
              className='flex flex-col gap-3 p-4 text-[14px] text-black'
            >
              <div>
                <div>{t('user_id', 'User ID')}</div>
                <input
                  type='text'
                  placeholder={t('user_id_placeholder', 'user id')}
                  value={formData.userName}
                  onChange={(e) =>
                    setFormData({ ...formData, userName: e.target.value })
                  }
                  className='w-full rounded-xl border border-black px-3 py-2 text-[14px] text-black focus:outline-none'
                  autoFocus
                />
              </div>

              <div>
                <div>{t('password', 'Password')}</div>
                <div className='relative'>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('password', 'Password')}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className='w-full rounded-xl border border-black px-3 py-2 text-[14px] text-black focus:outline-none'
                  />
                  <span
                    className='absolute top-1/2 right-5 -translate-y-1/2 text-gray-500'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
                  </span>
                </div>
              </div>

              <button
                type='submit'
                disabled={submitting}
                className='flex w-full items-center justify-center rounded border-[1px] border-[#065265] bg-gradient-to-b from-[#6fe3f5] to-[#065265] py-2 text-[16px] text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.5)] hover:bg-gradient-to-t'
              >
                {submitting ? t('please_wait', 'Please wait…') : t('login', 'Login')}
              </button>

              <button
                type='button'
                onClick={handleDemoLogin}
                disabled={submitting}
                className='flex w-full items-center justify-center rounded border-[1px] border-[#065265] bg-gradient-to-b from-[#6fe3f5] to-[#065265] py-2 text-[16px] text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.5)] hover:bg-gradient-to-t'
              >
                {t('login_with_demo_id', 'Login with demo ID')}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default LoginPopup;
