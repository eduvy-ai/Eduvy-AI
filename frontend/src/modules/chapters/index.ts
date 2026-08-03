/**
 * Chapters Module
 * Chapter-centric learning module for the Learn tab.
 */

// Types
export type {
  Chapter,
  ChapterWithProgress,
  SubjectWithChapters,
  ChapterCreate,
  ChapterUpdate,
  ChapterListParams,
  ChaptersState,
} from './types'

// API
export { chaptersApi } from './api'
export { default as chaptersApiDefault } from './api'

// Redux
export {
  default as chaptersReducer,
  fetchChapters,
  fetchSubjects,
  fetchChapter,
  fetchChaptersWithProgress,
  clearChapters,
  clearError,
  setCurrentChapter,
} from './slice'

// Hooks
export {
  useChapters,
  useChaptersBySubject,
  useChaptersWithProgress,
  useSubjectsWithChapters,
  useChapterById,
} from './hooks'
