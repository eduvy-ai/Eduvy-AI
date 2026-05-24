// ─── Auth Module Index ────────────────────────────────────────
// Re-export all auth module exports

// Types
export type { UserProfile, LoginRequest, RegisterRequest, AuthResponse, AuthState } from './types'
export { DEFAULT_PROFILE } from './types'

// API
export { authApi } from './api'

// Service
export { authService } from './service'

// Redux slice
export { default as authReducer } from './slice'
export { login, register, logout, initializeAuth, refreshUser, clearError, addXpLocal, updateStreakLocal } from './slice'

// Hooks
export { useAuth, useUser, useXp, useStreak, usePlan } from './hooks'
