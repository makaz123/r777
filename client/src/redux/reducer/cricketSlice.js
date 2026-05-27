import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import api from '../api';

// Async thunk to fetch cricket data

export const fetchCricketData = createAsyncThunk(
  'cricket/fetchCricketData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cricket/matches'); // Your backend API
      console.log('response', response.data.matches);
      return response.data.matches;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch matches'
      );
    }
  }
);

export const fetchCricketBatingData = createAsyncThunk(
  'cricket/fetchCricketBatingData',
  async (gameid, { rejectWithValue }) => {
    try {
      const response = await api.get(`/cricket/betting?gameid=${gameid}`); // Your backend API
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch matches'
      );
    }
  }
);

// Slice
const cricketSlice = createSlice({
  name: 'cricket',
  initialState: {
    matches: [],
    battingData: [],
    loader: false,
    error: null,
  },
  reducers: {
    resetBattingData: (state) => {
      state.battingData = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCricketData.pending, (state) => {
        state.loader = true;
        state.error = null;
      })
      .addCase(fetchCricketData.fulfilled, (state, action) => {
        state.loader = false;
        state.matches = action.payload.map((match) => {
          // Format date: "12/14/2025 2:45:00 PM" -> "14/12/2025 14:45"
          const formatDate = (dateString) => {
            if (!dateString) return '';

            // Try to parse "MM/DD/YYYY h:mm:ss A" explicitly
            const parts = String(dateString).split(' ');
            if (parts.length === 3) {
              const [datePart, timePart, ampm] = parts;
              const dateSplit = datePart.split('/');
              const timeSplit = timePart.split(':');

              if (dateSplit.length === 3 && timeSplit.length >= 2) {
                const [month, day, year] = dateSplit;
                const [hours, minutes] = timeSplit;

                let hr = parseInt(hours, 10);
                if (ampm.toUpperCase() === 'PM' && hr < 12) hr += 12;
                if (ampm.toUpperCase() === 'AM' && hr === 12) hr = 0;

                return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} ${String(hr).padStart(2, '0')}:${minutes.padStart(2, '0')}`;
              }
            }

            // Fallback for other formats
            const date = new Date(dateString);
            if (isNaN(date)) return dateString;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
          };

          // Helper to convert "0" to "-" or return the value
          const formatOdds = (value) => {
            if (
              value === '0' ||
              value === 0 ||
              value === null ||
              value === undefined
            ) {
              return '-';
            }
            return value;
          };

          return {
            id: match.id,
            title: match.title,
            game: match.match || '',
            time: formatDate(match.date),
            inplay: match.inplay,
            tv: match.tv,
            bm: match.bm,
            f: match.f,
            one: {
              back: formatOdds(match.odds?.[0]?.home),
              lay: formatOdds(match.odds?.[0]?.away),
            },
            x: {
              back: formatOdds(match.odds?.[1]?.home),
              lay: formatOdds(match.odds?.[1]?.away),
            },
            two: {
              back: formatOdds(match.odds?.[2]?.home),
              lay: formatOdds(match.odds?.[2]?.away),
            },
          };
        });
        state.error = null;
      })
      .addCase(fetchCricketData.rejected, (state, action) => {
        state.loader = false;
        state.error = action.payload;
      })
      .addCase(fetchCricketBatingData.pending, (state) => {
        state.loader = true;
        state.error = null;
        state.battingData = [];
      })
      .addCase(fetchCricketBatingData.fulfilled, (state, action) => {
        state.loader = false;
        state.battingData = action.payload.data;
        state.error = null;
      })
      .addCase(fetchCricketBatingData.rejected, (state, action) => {
        state.loader = false;
        state.error = action.payload;
      });
  },
});

export const { resetBattingData } = cricketSlice.actions;
export default cricketSlice.reducer;
