// ─── Auth API Layer ───────────────────────────────────────────
// Raw API calls for authentication - no business logic here

import axiosInstance from '../../services/axios'
import type { LoginRequest, RegisterRequest, AuthResponse, UserProfile } from './types'

const AUTH_ENDPOINTS = {
  login: '/api/auth/login',
  register: '/api/auth/register',
  me: '/api/auth/me',
} as const

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>(AUTH_ENDPOINTS.login, data)
    return response.data
  },

  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>(AUTH_ENDPOINTS.register, {
      ...data,
      mobile: data.mobile || '',
      parent_mobile: data.parent_mobile || '',
    })
    return response.data
  },

  /**
   * Get current authenticated user profile
   * Returns null if not authenticated
   */
  getMe: async (): Promise<UserProfile | null> => {
    try {
      const response = await axiosInstance.get<UserProfile>(AUTH_ENDPOINTS.me)
      return response.data
    } catch (error) {
      // 401 or 404 means not authenticated
      return null
    }
  },
}

export default authApi
