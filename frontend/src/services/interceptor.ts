// ─── Axios Interceptors ───────────────────────────────────────
// Request/Response interceptors for auth token injection and error handling

import axiosInstance from './axios'
import { getAuthToken, clearAuth } from '../shared/utils/localStorage'

// ── Request Interceptor ──
// Automatically attach JWT token to all requests (unless already set)
axiosInstance.interceptors.request.use(
  (config) => {
    // Only add user token if Authorization header is not already set
    // This allows admin API calls to use their own token
    if (!config.headers.Authorization) {
      const token = getAuthToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ── Response Interceptor ──
// Handle global errors like 401 Unauthorized
axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle 401 Unauthorized - only clear user auth, not admin auth
    // Admin API calls should handle their own 401 errors
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      // Only clear user auth for non-admin routes
      if (!url.includes('/api/admin/')) {
        clearAuth()
        // Dispatch event so App can handle redirect
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message)
    }

    // Extract error message from response
    const message = error.response?.data?.detail || 
                    error.response?.data?.message || 
                    error.message || 
                    'An error occurred'
    
    return Promise.reject(new Error(message))
  }
)

export default axiosInstance
