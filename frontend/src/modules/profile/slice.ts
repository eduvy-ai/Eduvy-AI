// ─── Profile Redux Slice ──────────────────────────────────────
// Redux state management for profile, mastery, and quiz stats

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import profileApi from './api'
import type { ProfileState, QuizResult, ProfileUpdateRequest } from './types'


// ── Initial State ──
const initialState: ProfileState = {
  mastery: {},
  quizStats: {},
  isLoading: false,
  error: null,
}

// ── Async Thunks ──

export const updateProfile = createAsyncThunk(
  'profile/update',
  async ({ userId, data }: { userId: string; data: ProfileUpdateRequest }, { rejectWithValue }) => {
    try {
      const profile = await profileApi.updateProfile(userId, data)
      return profile
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update profile')
    }
  }
)

export const addXp = createAsyncThunk(
  'profile/addXp',
  async ({ userId, points }: { userId: string; points: number }, { rejectWithValue }) => {
    try {
      const result = await profileApi.addXp(userId, points)
      return result.xp
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add XP')
    }
  }
)

export const updateStreak = createAsyncThunk(
  'profile/updateStreak',
  async ({ userId, streak }: { userId: string; streak: number }, { rejectWithValue }) => {
    try {
      const result = await profileApi.updateStreak(userId, streak)
      return result.streak
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update streak')
    }
  }
)

export const fetchMastery = createAsyncThunk(
  'profile/fetchMastery',
  async (userId: string, { rejectWithValue }) => {
    try {
      const mastery = await profileApi.getMastery(userId)
      return mastery
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch mastery')
    }
  }
)

export const setMastery = createAsyncThunk(
  'profile/setMastery',
  async (
    { userId, subject, score }: { userId: string; subject: string; score: number },
    { rejectWithValue }
  ) => {
    try {
      const mastery = await profileApi.setMastery(userId, { subject, score })
      return mastery
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to set mastery')
    }
  }
)

export const fetchQuizStats = createAsyncThunk(
  'profile/fetchQuizStats',
  async (userId: string, { rejectWithValue }) => {
    try {
      const stats = await profileApi.getQuizStats(userId)
      return stats
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch quiz stats')
    }
  }
)

export const saveQuizResult = createAsyncThunk(
  'profile/saveQuizResult',
  async ({ userId, result }: { userId: string; result: QuizResult }, { rejectWithValue }) => {
    try {
      await profileApi.saveQuizResult(userId, result)
      return result
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save quiz result')
    }
  }
)

// ── Slice ──
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Mastery
    builder
      .addCase(fetchMastery.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchMastery.fulfilled, (state, action) => {
        state.isLoading = false
        state.mastery = action.payload
      })
      .addCase(fetchMastery.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(setMastery.fulfilled, (state, action) => {
        state.mastery = action.payload
      })

    // Quiz Stats
    builder
      .addCase(fetchQuizStats.fulfilled, (state, action) => {
        state.quizStats = action.payload
      })
  },
})

export const { clearError } = profileSlice.actions
export default profileSlice.reducer
