// ─── Shared Constants Index ───────────────────────────────────
// Re-export all constants

export { COLORS, type ColorKey, type ColorValue } from './colors'
export { DEFAULT_A11Y, LANG_TO_SPEECH_CODE, type A11ySettings } from './a11y'
export { PLANS, planHasTab, planHasLab, type PlanType, type TabKey, type LabKey, type Plan } from './plans'
export { BOARDS, LANGUAGES, CLASSES, SUBJECTS, getSubjectsForClass, type BoardType, type LanguageType, type ClassType } from './curriculum'
export { TEACHER_PERSONAS, LANG_RULES, type TeacherPersona } from './personas'

// Re-export existing appConstants
export * from './appConstants'
