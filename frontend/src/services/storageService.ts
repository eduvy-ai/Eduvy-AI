// ─── Storage Service ──────────────────────────────────────────
// TypeScript service for localStorage operations with type safety

// ─── Storage Keys ────────────────────────────────────────────
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'eduvy_token',
  REFRESH_TOKEN: 'eduvy_refresh_token',
  USER_ID: 'eduvy_user_id',
  DEVICE_ID: 'eduvy_device_id',
  LAST_ACTIVE: 'eduvy_last_active',
  STREAK: 'eduvy_streak',
  BHOOL_CARDS: 'eduvy_bhool_cards',
  SETTINGS: 'eduvy_settings',
  ONBOARDING_COMPLETE: 'eduvy_onboarding_complete',
  PREFERRED_LANGUAGE: 'eduvy_language',
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

// ─── Generic Storage Functions ───────────────────────────────

/**
 * Get a value from localStorage
 */
export function getItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return fallback
    return JSON.parse(item) as T
  } catch {
    return fallback
  }
}

/**
 * Get a string value from localStorage (no JSON parsing)
 */
export function getString(key: string, fallback: string = ''): string {
  return localStorage.getItem(key) || fallback
}

/**
 * Set a value in localStorage
 */
export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

/**
 * Set a string value in localStorage (no JSON stringification)
 */
export function setString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

/**
 * Remove a value from localStorage
 */
export function removeItem(key: string): void {
  localStorage.removeItem(key)
}

/**
 * Clear all app-related localStorage items
 */
export function clearAll(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
}

// ─── Auth Storage ────────────────────────────────────────────

export function getAuthToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
}

export function setAuthToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token)
}

export function getUserId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.USER_ID)
}

export function setUserId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.USER_ID, id)
}

export function clearAuth(): void {
  removeItem(STORAGE_KEYS.AUTH_TOKEN)
  removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  removeItem(STORAGE_KEYS.USER_ID)
}

// ─── Device ID ───────────────────────────────────────────────

export function getDeviceId(): string {
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID)
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId)
  }
  return deviceId
}

// ─── Streak Management ───────────────────────────────────────

export interface StreakData {
  current: number
  lastActive: string // ISO date string
}

export function getStreakData(): StreakData {
  return getItem(STORAGE_KEYS.STREAK, { current: 0, lastActive: '' })
}

export function setStreakData(data: StreakData): void {
  setItem(STORAGE_KEYS.STREAK, data)
}

/**
 * Compute streak based on last active date
 * Returns: { streak, resetToday }
 */
export function computeStreak(lastActive: string | null, currentStreak: number): { streak: number; resetToday: boolean } {
  if (!lastActive) {
    return { streak: 1, resetToday: false }
  }

  const last = new Date(lastActive)
  const now = new Date()
  
  // Reset to start of day for comparison
  last.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    // Same day, keep streak
    return { streak: currentStreak, resetToday: false }
  } else if (diffDays === 1) {
    // Next day, increment streak
    return { streak: currentStreak + 1, resetToday: false }
  } else {
    // Missed a day, reset streak
    return { streak: 1, resetToday: true }
  }
}

// ─── Settings ────────────────────────────────────────────────

export interface AppSettings {
  theme: 'dark' | 'light'
  fontSize: 'small' | 'medium' | 'large'
  notifications: boolean
  soundEnabled: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 'medium',
  notifications: true,
  soundEnabled: true,
}

export function getSettings(): AppSettings {
  return getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
}

export function setSettings(settings: Partial<AppSettings>): void {
  const current = getSettings()
  setItem(STORAGE_KEYS.SETTINGS, { ...current, ...settings })
}

export default {
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
}
