// ─── Axios Interceptors ───────────────────────────────────────
// Request/Response interceptors for auth token injection and error handling

import axiosInstance from './axios'
import { getAuthToken, clearAuth } from '../shared/utils/localStorage'

// ── Request Interceptor ──
// Automatically attach JWT token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
    // Handle 401 Unauthorized - clear auth and redirect to login
    if (error.response?.status === 401) {
      clearAuth()
      // Dispatch event so App can handle redirect
      window.dispatchEvent(new CustomEvent('auth:logout'))
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
