// ─────────────────────────────────────────────────────────────
// i18n/index.js — Main localization module
// Exports: li(), t(), LANGS, LANG_CODES, getCurrentLang()
// ─────────────────────────────────────────────────────────────

import { SUPPORTED_LANGS, LANG_TO_SPEECH_CODE, LANG_META } from './languages.js'
import { UI_STRINGS } from './strings/index.js'

export { SUPPORTED_LANGS, LANG_TO_SPEECH_CODE, LANG_META }
export { UI_STRINGS }

// ─── Primary Translation Helper ───────────────────────────────
// Usage: li(profile.language).loginBtn → "Login" / "लॉगिन" / etc.
export const li = (lang) => UI_STRINGS[lang] || UI_STRINGS.English

// ─── Direct Key Accessor ──────────────────────────────────────
// Usage: t('loginBtn', 'Hindi') → "लॉगिन"
// Supports dot notation: t('auth.login', 'Hindi')
export const t = (key, lang = 'English') => {
  const strings = UI_STRINGS[lang] || UI_STRINGS.English
  
  // Support dot notation for nested keys
  if (key.includes('.')) {
    const parts = key.split('.')
    let value = strings
    for (const part of parts) {
      value = value?.[part]
      if (value === undefined) break
    }
    if (value !== undefined) return value
  }
  
  // Direct key lookup
  if (strings[key] !== undefined) return strings[key]
  
  // Fallback to English
  const fallback = UI_STRINGS.English
  if (key.includes('.')) {
    const parts = key.split('.')
    let value = fallback
    for (const part of parts) {
      value = value?.[part]
      if (value === undefined) break
    }
    return value ?? key
  }
  
  return fallback[key] ?? key
}

// ─── Get All Available Languages ──────────────────────────────
export const getAvailableLanguages = () => SUPPORTED_LANGS

// ─── Check if RTL Language ────────────────────────────────────
export const isRTL = (lang) => LANG_META[lang]?.rtl ?? false

// ─── Get Language Display Name ────────────────────────────────
export const getLangDisplayName = (lang) => LANG_META[lang]?.native ?? lang
