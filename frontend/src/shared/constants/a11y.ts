// ─── Drishti — Accessibility Defaults ─────────────────────────
// Accessibility settings for Drishti mode (visually impaired users)

export interface A11ySettings {
  screenReaderMode: boolean
  ttsEnabled: boolean
  ttsSpeed: number // 0.5 slow | 1.0 normal | 1.5 fast
  highContrast: boolean
  voiceInput: boolean
  fontScale: number // 1.0 normal | 1.25 large | 1.5 xlarge
}

export const DEFAULT_A11Y: A11ySettings = {
  screenReaderMode: false,
  ttsEnabled: false,
  ttsSpeed: 1.0,
  highContrast: false,
  voiceInput: false,
  fontScale: 1.0,
}

// Maps profile.language → BCP-47 code for Web Speech API (Indian locales)
export const LANG_TO_SPEECH_CODE: Record<string, string> = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Gujarati: 'gu-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Kannada: 'kn-IN',
  Marathi: 'mr-IN',
  Bengali: 'bn-IN',
  Punjabi: 'pa-IN',
  Odia: 'or-IN',
  Urdu: 'ur-PK',
}
