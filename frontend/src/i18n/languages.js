// ─────────────────────────────────────────────────────────────
// i18n/languages.js — Language metadata and codes
// ─────────────────────────────────────────────────────────────

// Supported languages (display names)
export const SUPPORTED_LANGS = [
  "English", "Hindi", "Gujarati", "Marathi", "Tamil",
  "Telugu", "Kannada", "Bengali", "Punjabi", "Odia", "Urdu"
]

// BCP-47 codes for Web Speech API (TTS/STT)
export const LANG_TO_SPEECH_CODE = {
  English:  'en-IN',
  Hindi:    'hi-IN',
  Gujarati: 'gu-IN',
  Tamil:    'ta-IN',
  Telugu:   'te-IN',
  Kannada:  'kn-IN',
  Marathi:  'mr-IN',
  Bengali:  'bn-IN',
  Punjabi:  'pa-IN',
  Odia:     'or-IN',
  Urdu:     'ur-PK',
}

// Language metadata (native name, script, RTL flag)
export const LANG_META = {
  English:  { native: "English",       script: "Latin",     rtl: false },
  Hindi:    { native: "हिन्दी",          script: "Devanagari", rtl: false },
  Gujarati: { native: "ગુજરાતી",        script: "Gujarati",  rtl: false },
  Marathi:  { native: "मराठी",          script: "Devanagari", rtl: false },
  Tamil:    { native: "தமிழ்",          script: "Tamil",     rtl: false },
  Telugu:   { native: "తెలుగు",         script: "Telugu",    rtl: false },
  Kannada:  { native: "ಕನ್ನಡ",          script: "Kannada",   rtl: false },
  Bengali:  { native: "বাংলা",          script: "Bengali",   rtl: false },
  Punjabi:  { native: "ਪੰਜਾਬੀ",         script: "Gurmukhi",  rtl: false },
  Odia:     { native: "ଓଡ଼ିଆ",          script: "Odia",      rtl: false },
  Urdu:     { native: "اردو",          script: "Nastaliq",  rtl: true  },
}

// ISO 639-1 codes (for APIs that need them)
export const LANG_ISO_CODES = {
  English:  'en',
  Hindi:    'hi',
  Gujarati: 'gu',
  Marathi:  'mr',
  Tamil:    'ta',
  Telugu:   'te',
  Kannada:  'kn',
  Bengali:  'bn',
  Punjabi:  'pa',
  Odia:     'or',
  Urdu:     'ur',
}
