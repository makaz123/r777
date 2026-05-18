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
      setPreviewUrls(files.map(file => URL.createObjectURL(file)));
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
    setSelectedForDelete(prev => 
      prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedForDelete.length === 0) return;
    
    if (!window.confirm('Are you sure you want to delete the selected banners?')) return;

    try {
      setLoading(true);
      const response = await api.delete('/admin/banner', {
        data: { bannerIds: selectedForDelete }
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
      <div className='p-6 max-w-6xl mx-auto'>
        <div className='bg-white rounded shadow-md overflow-hidden mb-8'>
          <div className='bg-gray-800 text-white px-4 py-3'>
            <h2 className='text-lg font-semibold'>Upload Dynamic Banners</h2>
          </div>
        
        <div className='p-6'>
          <p className='text-sm text-gray-600 mb-6'>
            Upload one or multiple banner images here. These images will append to the current slideshow banners on the selected page. You can upload up to 10 images at once.
          </p>

          <div className='mb-6'>
            <label className='block text-gray-700 font-medium mb-2'>
              Target Page
            </label>
            <select 
              value={pageType}
              onChange={(e) => setPageType(e.target.value)}
              className='block w-full text-sm text-gray-700 border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500'
            >
              <option value='home'>Home (Main)</option>
              <option value='cricket'>Cricket</option>
              <option value='football'>Football</option>
              <option value='tennis'>Tennis</option>
              <option value='horse_racing'>Horse Racing</option>
              <option value='greyhound'>Greyhound</option>
              <option value='live_casino'>Live Casino</option>
            </select>
          </div>
          
          <div className='mb-6'>
            <label className='block text-gray-700 font-medium mb-2'>
              Select Banner Images (JPG, PNG)
            </label>
            <input 
              type='file' 
              accept='image/*'
              multiple
              onChange={handleFileChange}
              className='block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded'
            />
          </div>

          {previewUrls.length > 0 && (
            <div className='mb-6'>
              <p className='text-gray-700 font-medium mb-2'>Image Previews to Upload:</p>
              <div className='border rounded p-4 bg-gray-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                {previewUrls.map((url, index) => (
                  <img 
                    key={index}
                    src={url} 
                    alt={`Preview ${index}`} 
                    className='h-[120px] w-full object-cover shadow-sm rounded border border-gray-300'
                  />
                ))}
              </div>
            </div>
          )}

          <div className='flex justify-end'>
            <button
              onClick={handleUpload}
              disabled={loading || selectedFiles.length === 0}
              className={`px-6 py-2 rounded font-medium text-white shadow
                ${loading || selectedFiles.length === 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? 'Uploading...' : 'Upload Banners'}
            </button>
          </div>
        </div>
      </div>

      <div className='bg-white rounded shadow-md overflow-hidden'>
        <div className='bg-gray-800 text-white px-4 py-3 flex justify-between items-center'>
          <h2 className='text-lg font-semibold'>Current Active Banners</h2>
          {selectedForDelete.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className='bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-sm rounded transition'
            >
              Delete Selected ({selectedForDelete.length})
            </button>
          )}
        </div>
        
        <div className='p-6'>
          {existingBanners.length === 0 ? (
            <p className='text-gray-500 text-center py-4'>No dynamic banners uploaded yet. Default banners are currently showing on the frontend.</p>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
              {existingBanners.map((banner) => (
                <div 
                  key={banner._id} 
                  className={`relative border-2 rounded p-2 transition cursor-pointer ${
                    selectedForDelete.includes(banner._id) ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}
                  onClick={() => toggleSelectDelete(banner._id)}
                >
                  <img 
                    src={banner.imageUrl} 
                    alt='Banner' 
                    className='h-[120px] w-full object-cover rounded'
                  />
                  <div className='absolute top-3 left-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow uppercase'>
                    {banner.page || 'home'}
                  </div>
                  <div className='absolute top-3 right-3 bg-white rounded-full p-1 shadow'>
                    <input 
                      type='checkbox' 
                      checked={selectedForDelete.includes(banner._id)}
                      onChange={() => {}} // Handled by parent div click
                      className='w-5 h-5 cursor-pointer accent-red-600'
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
