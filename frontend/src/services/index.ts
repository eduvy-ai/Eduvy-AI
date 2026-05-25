// ─── Services Index ───────────────────────────────────────────
// Re-export axios instance and services

export { default as axiosInstance } from './axios'
// Note: interceptor.ts is imported in main.tsx for side effects

// AI Service
export {
  callAI,
  askAI,
  checkStudentQuery,
  parseAIObject,
  parseAIArray,
  getDisplayLang,
  generateQuizQuestions,
  gradeAnswer,
  default as aiService,
} from './aiService'
export type { AICallOptions, AIMessage, AIResponse, UserProfile as AIUserProfile } from './aiService'

// Storage Service
export {
  STORAGE_KEYS,
  getItem,
  getString,
  setItem,
  setString,
  removeItem,
  clearAll,
  getAuthToken,
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
  getUserId,
  setUserId,
  clearAuth,
  getDeviceId,
  getStreakData,
  setStreakData,
  computeStreak,
  getSettings,
  setSettings,
  default as storageService,
} from './storageService'
export type { StorageKey, StreakData, AppSettings } from './storageService'
