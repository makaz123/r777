import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { changePasswordBySubAdmin } from '../redux/reducer/authReducer';

const ChangePassword = () => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async () => {
    if (!formData.oldPassword) {
      toast.error('Please enter your current password.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Password not match.');
      return;
    }

    try {
      const result = await dispatch(
        changePasswordBySubAdmin({
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        })
      );

      if (result.type.endsWith('/fulfilled')) {
        toast.success(
          result.payload?.message || 'Password changed successfully'
        );
        setFormData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else if (result.type.endsWith('/rejected')) {
        toast.error(result.payload || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
    }
  };

  return (
    <>
      <Navbar />

      <div className='scrollbar-hide pb-10 md:px-[15px] md:pt-[13px]'>
        <div className='min-h-[600px] rounded-lg bg-white px-3 md:px-[15px] py-[7px]'>
          <div className='pb-4 text-[15px] font-bold'>Change Password</div>
          <div className='w-full max-w-md px-3 md:px-[15px] text-[14px]'>
            <div className='mb-[14px]'>
              <div className='mb-[4px]'>Old Password</div>
              <input
                type='password'
                autoComplete='current-password'
                className='h-[30px] w-full rounded-sm border border-[#ced4da] bg-white px-2.5 py-[6px] outline-none'
                value={formData.oldPassword}
                onChange={(e) =>
                  setFormData({ ...formData, oldPassword: e.target.value })
                }
              />
            </div>
            <div className='mb-[14px]'>
              <div className='mb-[4px]'>New Password</div>
              <input
                type='password'
                autoComplete='new-password'
                className='h-[30px] w-full rounded-sm border border-[#ced4da] bg-white px-2.5 py-[6px] outline-none'
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData({ ...formData, newPassword: e.target.value })
                }
              />
            </div>
            <div className='mb-[14px]'>
              <div className='mb-[4px]'>Retype Password</div>
              <input
                type='password'
                autoComplete='new-password'
                className='h-[30px] w-full rounded-sm border border-[#ced4da] bg-white px-2.5 py-[6px] outline-none'
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
              />
            </div>
            <button
              type='button'
              className='ml-1 w-fit cursor-pointer text-[12px] md:text-[14px] rounded bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-5 py-1 text-white'
              onClick={handleChangePassword}
            >
              Change Password
            </button>
            </div>
        </div>
      </div>


      <div className='mx-[15px] my-[10px] bg-[#f9f9f9] p-2.5'>
        <div className='pb-3 text-[22px]'>Change Password</div>
        <div className='w-full max-w-md px-[15px] text-[14px]'>
          <div className='mb-[14px]'>
            <div className='mb-[7px]'>Current Password</div>
            <input
              type='password'
              autoComplete='current-password'
              className='h-[36px] w-full rounded-sm border border-[#ced4da] bg-white px-2.5 py-[6px]'
              value={formData.oldPassword}
              onChange={(e) =>
                setFormData({ ...formData, oldPassword: e.target.value })
              }
            />
          </div>
          <div className='mb-[14px]'>
            <div className='mb-[7px]'>New Password</div>
            <input
              type='password'
              autoComplete='new-password'
              className='h-[36px] w-full rounded-sm border border-[#ced4da] bg-white px-2.5 py-[6px]'
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
            />
          </div>
          <div className='mb-[14px]'>
            <div className='mb-[7px]'>Confirm New Password</div>
            <input
              type='password'
              autoComplete='new-password'
              className='h-[36px] w-full rounded-sm border border-[#ced4da] bg-white px-2.5 py-[6px]'
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
            />
          </div>
          <button
            type='button'
            className='ml-1 w-fit cursor-pointer rounded bg-[#0088cc] px-3 py-1.5 text-white'
            onClick={handleChangePassword}
          >
            Change Password
          </button>
        </div>
      </div>
    </>
  );
};

export default ChangePassword;
