/**
 * Chapters Module Types
 * TypeScript interfaces for chapter data.
 */

export interface Chapter {
  id: number
  board: string
  standard: string
  subject: string
  chapter_number: number
  chapter_name: string
  description: string | null
  topics: string[]
  is_active: boolean
  created_at: string
}

export interface ChapterWithProgress extends Chapter {
  progress_percent: number
  notes_count: number
  quiz_score: number | null
  last_studied: string | null
}

export interface SubjectWithChapters {
  subject: string
  chapter_count: number
}

export interface ChapterCreate {
  board: string
  standard: string
  subject: string
  chapter_number: number
  chapter_name: string
  description?: string
  topics?: string[]
  is_active?: boolean
}

export interface ChapterUpdate {
  chapter_name?: string
  description?: string
  topics?: string[]
  is_active?: boolean
}

export interface ChapterListParams {
  board?: string
  standard?: string
  subject?: string
  is_active?: boolean
}

export interface ChaptersState {
  chapters: Chapter[]
  chaptersWithProgress: ChapterWithProgress[]
  subjects: SubjectWithChapters[]
  currentChapter: Chapter | null
  isLoading: boolean
  error: string | null
}
