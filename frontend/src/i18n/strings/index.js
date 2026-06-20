// ─────────────────────────────────────────────────────────────
// i18n/strings/index.js — Combines all string categories
// ─────────────────────────────────────────────────────────────

import { COMMON } from './common.js'
import { AUTH } from './auth.js'
import { ONBOARDING } from './onboarding.js'
import { SETTINGS } from './settings.js'
import { HOME } from './home.js'
import { TABS } from './tabs.js'
import { FORMS } from './forms.js'
import { ERRORS } from './errors.js'
import { NOTEBOOK } from './notebook.js'
import { LABS } from './labs.js'
import { QUIZ } from './quiz.js'
import { BATTLES } from './battles.js'
import { BHOOL } from './bhool.js'
import { SATHI } from './sathi.js'
import { VIDEOS } from './videos.js'
import { PARENT } from './parent.js'

// Build combined UI_STRINGS object per language
const LANGUAGES = ['English', 'Hindi', 'Gujarati', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Punjabi', 'Odia', 'Urdu']

const STRING_MODULES = {
  ...COMMON,
  ...AUTH,
  ...ONBOARDING,
  ...SETTINGS,
  ...HOME,
  ...TABS,
  ...FORMS,
  ...ERRORS,
  ...NOTEBOOK,
  ...LABS,
  ...QUIZ,
  ...BATTLES,
  ...BHOOL,
  ...SATHI,
  ...VIDEOS,
  ...PARENT,
}

// Merge all modules into per-language objects
export const UI_STRINGS = {}

for (const lang of LANGUAGES) {
  UI_STRINGS[lang] = {}
  for (const [key, translations] of Object.entries(STRING_MODULES)) {
    UI_STRINGS[lang][key] = translations[lang] ?? translations.English ?? key
  }
}
