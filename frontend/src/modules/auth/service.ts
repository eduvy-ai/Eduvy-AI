// ─── Auth Service Layer ───────────────────────────────────────
// Business logic for authentication - token storage, data transforms

import authApi from './api'
import { setAuthToken, clearAuth, setCachedProfile, getCachedProfile } from '../../shared/utils/localStorage'
import type { LoginRequest, RegisterRequest, AuthResponse, UserProfile } from './types'

export const authService = {
  /**
   * Login and store auth data
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await authApi.login(credentials)
    
    // Store token and profile
    setAuthToken(response.token)
    setCachedProfile(response.profile)
    
    return response
  },

  /**
   * Register and store auth data
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await authApi.register(data)
    
    // Store token and profile
    setAuthToken(response.token)
    setCachedProfile(response.profile)
    
    return response
  },

  /**
   * Get current user, using cache if available
   */
  getCurrentUser: async (): Promise<UserProfile | null> => {
    // Try to get fresh data from API
    const user = await authApi.getMe()
    
    if (user) {
      // Update cache with fresh data
      setCachedProfile(user)
    }
    
    return user
  },

  /**
   * Get cached user profile (synchronous)
   */
  getCachedUser: (): UserProfile | null => {
    return getCachedProfile<UserProfile>()
  },

  /**
   * Logout - clear all auth data
   */
  logout: (): void => {
    clearAuth()
  },

  /**
   * Compute streak based on last active date
   */
  computeStreak: (lastActive: string | null | undefined, currentStreak: number): { streak: number; changed: boolean } => {
    const today = new Date().toISOString().split('T')[0]
    
    if (!lastActive) {
      return { streak: 1, changed: true }
    }
    
    if (lastActive === today) {
      return { streak: currentStreak, changed: false }
    }
    
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
    const newStreak = lastActive === yesterday ? currentStreak + 1 : 1
    
    return { streak: newStreak, changed: true }
  },
}

export default authService
