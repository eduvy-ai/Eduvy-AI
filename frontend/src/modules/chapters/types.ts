/**
 * Chapters Module Types
 * TypeScript interfaces for chapter data.
 */

export interface Chapter {
  id: number
  board_id: string
  standard_id: string
  subject_id: string
  chapter_number: number
  chapter_name: string
  chapter_name_local?: string
  description: string | null
  topics: string[]
  is_active: boolean
  created_at: string
  // Joined names from FK tables
  board_name?: string
  standard_name?: string
  subject_name?: string
}

export interface ChapterWithProgress extends Chapter {
  progress_percent: number
  notes_count: number
  quiz_score: number | null
  last_studied: string | null
}

export interface SubjectWithChapters {
  subject_id: string
  subject_name: string
  chapter_count: number
}

export interface ChapterCreate {
  board_id: string
  standard_id: string
  subject_id: string
  chapter_number: number
  chapter_name: string
  chapter_name_local?: string
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
  board_id?: string
  standard_id?: string
  subject_id?: string
  stream_id?: string
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
