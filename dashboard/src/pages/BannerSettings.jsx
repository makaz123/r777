import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../redux/api';
import Navbar from '../components/Navbar';

const BannerSettings = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [existingBanners, setExistingBanners] = useState([]);
  const [selectedForDelete, setSelectedForDelete] = useState([]);

  const [pageType, setPageType] = useState('home');

  const fetchBanners = async () => {
    try {
      // By default fetch all banners across all pages for the admin panel
      const response = await api.get('/banner');
      if (response.data && response.data.banners) {
        setExistingBanners(response.data.banners);
      }
    } catch (error) {
      console.error('Failed to fetch existing banners', error);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      if (files.length > 10) {
        toast.error('You can only upload up to 10 images at a time.');
        return;
      }
      setSelectedFiles(files);
      setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select an image to upload.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('page', pageType);
    selectedFiles.forEach((file) => {
      formData.append('images', file);
    });

    try {
      const response = await api.post(`/admin/banner`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success(`Banners uploaded successfully for ${pageType}!`);
        setSelectedFiles([]);
        setPreviewUrls([]);
        fetchBanners(); // Refresh the list
      } else {
        toast.error('Failed to upload banners.');
      }
    } catch (error) {
      console.error('Error uploading banners:', error);
      toast.error(error.response?.data?.message || 'Error uploading banners.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectDelete = (id) => {
    setSelectedForDelete((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedForDelete.length === 0) return;

    if (
      !window.confirm('Are you sure you want to delete the selected banners?')
    )
      return;

    try {
      setLoading(true);
      const response = await api.delete('/admin/banner', {
        data: { bannerIds: selectedForDelete },
      });

      if (response.data.success) {
        toast.success('Selected banners deleted successfully!');
        setSelectedForDelete([]);
        fetchBanners(); // Refresh
      }
    } catch (error) {
      console.error('Error deleting banners:', error);
      toast.error('Error deleting banners.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className='mx-auto max-w-6xl p-6'>
        <div className='mb-8 overflow-hidden rounded bg-white shadow-md'>
          <div className='bg-gray-800 px-4 py-3 text-white'>
            <h2 className='text-lg font-semibold'>Upload Dynamic Banners</h2>
          </div>

          <div className='p-6'>
            <p className='mb-6 text-sm text-gray-600'>
              Upload one or multiple banner images here. These images will
              append to the current slideshow banners on the selected page. You
              can upload up to 10 images at once.
            </p>

            <div className='mb-6'>
              <label className='mb-2 block font-medium text-gray-700'>
                Target Page
              </label>
              <select
                value={pageType}
                onChange={(e) => setPageType(e.target.value)}
                className='block w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500'
              >
                <option value='home'>Home (Main)</option>
                <option value='popup'>Popup Banner</option>
                <option value='cricket'>Cricket</option>
                <option value='football'>Football</option>
                <option value='tennis'>Tennis</option>
                <option value='horse_racing'>Horse Racing</option>
                <option value='greyhound'>Greyhound</option>
                <option value='live_casino'>Live Casino</option>
              </select>
            </div>

            <div className='mb-6'>
              <label className='mb-2 block font-medium text-gray-700'>
                Select Banner Images (JPG, PNG)
              </label>
              <input
                type='file'
                accept='image/*'
                multiple
                onChange={handleFileChange}
                className='block w-full cursor-pointer rounded border border-gray-300 text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100'
              />
            </div>

            {previewUrls.length > 0 && (
              <div className='mb-6'>
                <p className='mb-2 font-medium text-gray-700'>
                  Image Previews to Upload:
                </p>
                <div className='grid grid-cols-1 gap-4 rounded border bg-gray-50 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {previewUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Preview ${index}`}
                      className='h-[120px] w-full rounded border border-gray-300 object-cover shadow-sm'
                    />
                  ))}
                </div>
              </div>
            )}

            <div className='flex justify-end'>
              <button
                onClick={handleUpload}
                disabled={loading || selectedFiles.length === 0}
                className={`rounded px-6 py-2 font-medium text-white shadow ${
                  loading || selectedFiles.length === 0
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Uploading...' : 'Upload Banners'}
              </button>
            </div>
          </div>
        </div>

        <div className='overflow-hidden rounded bg-white shadow-md'>
          <div className='flex items-center justify-between bg-gray-800 px-4 py-3 text-white'>
            <h2 className='text-lg font-semibold'>Current Active Banners</h2>
            {selectedForDelete.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className='rounded bg-red-600 px-4 py-1 text-sm text-white transition hover:bg-red-700'
              >
                Delete Selected ({selectedForDelete.length})
              </button>
            )}
          </div>

          <div className='p-6'>
            {existingBanners.length === 0 ? (
              <p className='py-4 text-center text-gray-500'>
                No dynamic banners uploaded yet. Default banners are currently
                showing on the frontend.
              </p>
            ) : (
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                {existingBanners.map((banner) => (
                  <div
                    key={banner._id}
                    className={`relative cursor-pointer rounded border-2 p-2 transition ${
                      selectedForDelete.includes(banner._id)
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => toggleSelectDelete(banner._id)}
                  >
                    <img
                      src={banner.imageUrl}
                      alt='Banner'
                      className='h-[120px] w-full rounded object-cover'
                    />
                    <div className='absolute top-3 left-3 rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white uppercase shadow'>
                      {banner.page || 'home'}
                    </div>
                    <div className='absolute top-3 right-3 rounded-full bg-white p-1 shadow'>
                      <input
                        type='checkbox'
                        checked={selectedForDelete.includes(banner._id)}
                        onChange={() => {}} // Handled by parent div click
                        className='h-5 w-5 cursor-pointer accent-red-600'
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BannerSettings;
