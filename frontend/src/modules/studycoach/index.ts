// ─── Study Coach Module Exports ───────────────────────────────

// Types
export type {
  StudyCoachMode,
  StudyCoachRequest,
  StudyCoachResponse,
  StudyCoachState,
  DiagramData,
  QuizQuestion,
  Flashcard,
  CodeExample,
  MemoryAids,
  UsageInfo,
} from './types'

export { MODE_INFO } from './types'

// API
export { studyCoachApi } from './api'

// Redux
export { default as studyCoachReducer } from './slice'
export { askStudyCoach, setMode, clearResponse, clearError, clearHistory } from './slice'

// Hooks
export { useStudyCoach } from './hooks'
