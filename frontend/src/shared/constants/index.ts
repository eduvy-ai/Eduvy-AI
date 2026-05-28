// ─── Shared Constants Index ───────────────────────────────────
// Re-export all constants

export { COLORS, type ColorKey, type ColorValue } from './colors'
export { DEFAULT_A11Y, LANG_TO_SPEECH_CODE, type A11ySettings } from './a11y'
export { PLANS, planHasTab, planHasLab, type PlanType, type TabKey, type LabKey, type Plan } from './plans'
export { BOARDS, LANGUAGES, CLASSES, SUBJECTS, getSubjectsForClass, type BoardType, type LanguageType, type ClassType } from './curriculum'
export { TEACHER_PERSONAS, LANG_RULES, type TeacherPersona } from './personas'

// Design system tokens
export {
  FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LINE_HEIGHT,
  SPACING, RADIUS, SHADOW, Z, TRANSITION, BREAKPOINT,
  TOUCH, LAYOUT, ds,
} from './design'

// Re-export existing appConstants
export * from './appConstants'
