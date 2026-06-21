// ─── Study Coach Types ───────────────────────────────────────

export type StudyCoachMode =
  | 'study_coach'
  | 'study_coach_eli10'
  | 'study_coach_exam'
  | 'study_coach_coding'
  | 'study_coach_revision'

export interface DiagramData {
  type: 'flowchart' | 'mindmap' | 'sequence' | 'classDiagram'
  content: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

export interface Flashcard {
  front: string
  back: string
}

export interface CodeExample {
  language: string
  title: string
  code: string
  explanation: string
}

export interface MemoryAids {
  mnemonics: string[]
  acronyms: string[]
  patterns: string[]
}

export interface UsageInfo {
  calls_today: number
  daily_limit: number
  prompt_tokens: number
  completion_tokens: number
}

export interface StudyCoachRequest {
  question: string
  mode?: StudyCoachMode
  subject_override?: string
  chapter_override?: string
}

export interface StudyCoachResponse {
  title: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  overview: string
  key_takeaways: string[]
  diagram: DiagramData | null
  real_world_example: string
  quiz: QuizQuestion[]
  flashcards: Flashcard[]
  exam_notes: string[]
  related_topics: string[]
  next_topic: string
  // Mode-specific fields
  code_examples?: CodeExample[]
  memory_aids?: MemoryAids
  // Metadata
  mode: StudyCoachMode
  usage?: UsageInfo
}

export interface StudyCoachState {
  response: StudyCoachResponse | null
  isLoading: boolean
  error: string | null
  currentMode: StudyCoachMode
  history: Array<{
    question: string
    response: StudyCoachResponse
    timestamp: number
  }>
}

// ─── Teacher Mode Types ───────────────────────────────────────

export interface WordTiming {
  word: string
  start_ms: number
  end_ms: number
}

export interface TeacherBeat {
  id: string
  text: string
  audio_url: string
  duration_ms: number
  word_timings: WordTiming[]
  section: string
  diagram_id?: string | null
}

export interface TeacherAudioRequest {
  content: string
  section?: string
  language?: string
  full_lesson?: boolean
  study_coach_response?: StudyCoachResponse
}

export interface TeacherAudioResponse {
  beats: TeacherBeat[]
  total_duration_ms: number
  language: string
  cache_key?: string
}

export interface TeacherModeState {
  isPlaying: boolean
  currentBeatIndex: number
  currentWordIndex: number
  playbackSpeed: number
  audioData: TeacherAudioResponse | null
  isGenerating: boolean
}

export const MODE_INFO: Record<StudyCoachMode, { label: string; description: string; icon: string }> = {
  study_coach: {
    label: 'Study Coach',
    description: 'Comprehensive learning experience',
    icon: '📚',
  },
  study_coach_eli10: {
    label: 'Simple Mode',
    description: 'Easy explanations for your level',
    icon: '✨',
  },
  study_coach_exam: {
    label: 'Exam Prep',
    description: 'Board exam focus',
    icon: '📝',
  },
  study_coach_coding: {
    label: 'Coding Coach',
    description: 'Programming with code examples',
    icon: '💻',
  },
  study_coach_revision: {
    label: 'Quick Revision',
    description: 'Fast review with mnemonics',
    icon: '⚡',
  },
}
