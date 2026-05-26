// ─── Application Configuration ───────────────────────────────
// Environment variables and app-wide settings

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://eduvyai-api.onrender.com'

export const APP_CONFIG = {
  appName: 'Eduvy-AI',
  version: '1.0.0',
  apiTimeout: 10000,
  tokenKey: 'eduvyai_token',
  profileKey: 'eduvyai_profile',
  deviceIdKey: 'eduvyai_device_id',
} as const
