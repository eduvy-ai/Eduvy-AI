// ─── Axios Interceptors ───────────────────────────────────────
// Request/Response interceptors for auth token injection and error handling

import axiosInstance from './axios'
import { getAuthToken, clearAuth } from '../shared/utils/localStorage'

// ── Request Interceptor ──
axiosInstance.interceptors.request.use(
  (config) => {
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
axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      if (url.includes('/api/admin/')) {
        // Admin token expired — clear admin auth and redirect
        localStorage.removeItem('eduvyai_admin_token')
        localStorage.removeItem('eduvyai_admin_user')
        window.dispatchEvent(new CustomEvent('auth:admin-logout'))
      } else {
        clearAuth()
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }

    if (!error.response) {
      console.error('Network error:', error.message)
    }

    const message = error.response?.data?.detail || 
                    error.response?.data?.message || 
                    error.message || 
                    'An error occurred'
    
    return Promise.reject(new Error(message))
  }
)

export default axiosInstance
