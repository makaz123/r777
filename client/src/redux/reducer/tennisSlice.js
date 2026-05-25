import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// import axios from "axios";
import api from '../api'; // Adjust the import based on your project structure

export const fetchTennisData = createAsyncThunk(
  'tennis/fetchTennisData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/tennis'); // Your backend API

      console.log('response', response);

      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch matches'
      );
    }
  }
);

export const fetchTannisBatingData = createAsyncThunk(
  'cricket/fetchTannisBatingData',
  async (gameid, { rejectWithValue }) => {
    try {
      const response = await api.get(`/tannis/betting?gameid=${gameid}`); // Your backend API
      // console.log("response", response.data);

      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch matches'
      );
    }
  }
);

// Create the slice
const tennisSlice = createSlice({
  name: 'tennis',
  initialState: {
    matches: [],
    data: [],
    battingData: [],
    loading: false,
    tesnnisError: null,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTennisData.pending, (state) => {
        state.loading = true;
        state.tesnnisError = null;
      })
      .addCase(fetchTennisData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.matches = action.payload.map((match) => {
          // Format date: "1/23/2026 11:00:00 AM" -> "23/01/2026 11:00"
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
            inplay: match.iplay,
            tv: match.tv,
            bm: match.bm,
            f: match.f,
            time: formatDate(match.date),
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
      .addCase(fetchTennisData.rejected, (state, action) => {
        state.loading = false;
        state.tesnnisError = action.error.message;
      })
      .addCase(fetchTannisBatingData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTannisBatingData.fulfilled, (state, action) => {
        state.loading = false;
        state.battingData = action.payload.data;
        state.error = null;
      })
      .addCase(fetchTannisBatingData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default tennisSlice.reducer;
