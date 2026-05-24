// ─── LocalStorage Utilities ───────────────────────────────────
// Auth token and profile storage helpers

const TOKEN_KEY = 'eduvyai_token'
const PROFILE_KEY = 'eduvyai_profile'
const DEVICE_ID_KEY = 'eduvyai_device_id'

// ── Auth Token ──
export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const setAuthToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

// Legacy aliases for compatibility
export const getToken = getAuthToken
export const setToken = (token: string): void => setAuthToken(token)
export const removeToken = (): void => setAuthToken(null)

// ── Profile Cache ──
export const getCachedProfile = <T>(): T | null => {
  const data = localStorage.getItem(PROFILE_KEY)
  if (!data) return null
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

export const setCachedProfile = <T>(profile: T | null): void => {
  if (profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } else {
    localStorage.removeItem(PROFILE_KEY)
  }
}

// Legacy aliases
export const getUser = getCachedProfile
export const setUser = <T>(user: T): void => setCachedProfile(user)
export const removeUser = (): void => setCachedProfile(null)

// ── Device ID (fallback for anonymous users) ──
export const getDeviceId = (): string => {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

// ── Clear All Auth Data ──
export const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PROFILE_KEY)
}

// Legacy alias
export const clearStorage = clearAuth

// ── Generic Storage Helpers ──
export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key)
  if (!data) return defaultValue
  try {
    return JSON.parse(data) as T
  } catch {
    return defaultValue
  }
}

export const setStorageItem = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value))
}

export const removeStorageItem = (key: string): void => {
  localStorage.removeItem(key)
}
