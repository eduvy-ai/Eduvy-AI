// ─── Auth Redux Slice ─────────────────────────────────────────
// Redux state management for authentication

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import authService from './service'
import { getAuthToken } from '../../shared/utils/localStorage'
import type { AuthState, UserProfile, LoginRequest, RegisterRequest } from './types'

// ── Initial State ──
const initialState: AuthState = {
  user: null,
  token: getAuthToken(),
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
}

// ── Async Thunks ──

/**
 * Login thunk
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials)
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      return rejectWithValue(message)
    }
  }
)

/**
 * Register thunk
 */
export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authService.register(data)
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      return rejectWithValue(message)
    }
  }
)

/**
 * Initialize auth - check if user is already logged in
 */
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken()
      if (!token) {
        return null
      }
      
      const user = await authService.getCurrentUser()
      return user
    } catch (error) {
      return rejectWithValue('Session expired')
    }
  }
)

/**
 * Refresh user profile
 */
export const refreshUser = createAsyncThunk(
  'auth/refreshUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getCurrentUser()
      return user
    } catch (error) {
      return rejectWithValue('Failed to refresh user')
    }
  }
)

// ── Slice ──
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Logout - clear auth state
    logout: (state) => {
      authService.logout()
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null
    },
    
    // Update user profile locally
    updateUserLocal: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
    
    // Add XP locally
    addXpLocal: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.xp = (state.user.xp || 0) + action.payload
      }
    },
    
    // Update streak locally
    updateStreakLocal: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.streak = action.payload
      }
    },
  },
  extraReducers: (builder) => {
    // ── Login ──
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.profile
        state.token = action.payload.token
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
    
    // ── Register ──
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.profile
        state.token = action.payload.token
        state.error = null
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
    
    // ── Initialize Auth ──
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false
        state.isInitialized = true
        if (action.payload) {
          state.user = action.payload
          state.isAuthenticated = true
        } else {
          state.token = null
          state.isAuthenticated = false
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false
        state.isInitialized = true
        state.token = null
        state.isAuthenticated = false
      })
    
    // ── Refresh User ──
    builder
      .addCase(refreshUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload
        }
      })
  },
})

// ── Exports ──
export const { logout, clearError, updateUserLocal, addXpLocal, updateStreakLocal } = authSlice.actions
export default authSlice.reducer
