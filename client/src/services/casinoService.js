import api from '../redux/api.js';

// Start casino game
export const startCasinoGame = async (userName, game_uid, credit_amount) => {
  console.log(userName, game_uid, credit_amount);
  try {
    const response = await api.post('/casino/start', {
      userName,
      game_uid,
      credit_amount,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return; // stop further handling
    }
    console.error('Error starting casino game:', error);
    throw error;
  }
};

// Get user balance (if needed)
export const getUserBalance = async () => {
  try {
    const response = await api.get('/user/balance');
    return response.data;
  } catch (error) {
    console.error('Error getting user balance:', error);
    throw error;
  }
};
