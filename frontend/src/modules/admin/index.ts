// ─── Admin Module Index ────────────────────────────────────────
// Re-exports for admin module

// Types
export * from './types'

// Constants
export * from './constants'

// API
export { default as adminApi } from './api'
export * from './api'

// Service
export { default as adminService } from './service'
export * from './service'

// Redux slice
export { default as adminReducer } from './slice'
export * from './slice'

// Hooks
export * from './hooks'
export { default as useAdmin } from './hooks'
