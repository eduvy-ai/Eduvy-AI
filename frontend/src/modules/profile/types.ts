// ─── Profile Module Types ─────────────────────────────────────
// Types for profile management, XP, streak, and mastery

// ── Profile Update ──
export interface ProfileUpdateRequest {
  name?: string
  standard?: string
  board?: string
  language?: string
  displayLanguage?: 'medium' | 'english'
  subjects?: string[]
  school?: string
  mobile?: string
  parent_mobile?: string
  is_drishti?: boolean
}

// ── XP ──
export interface XpResponse {
  xp: number
}

// ── Streak ──
export interface StreakResponse {
  streak: number
}

export interface StreakUpdateRequest {
  streak: number
}

// ── Mastery ──
export interface MasteryScores {
  [subject: string]: number
}

export interface MasteryUpdateRequest {
  subject: string
  score: number
}

// ── Quiz Stats ──
export interface QuizResult {
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  correct: number
  total: number
}

export interface QuizStats {
  [subject: string]: {
    total: number
    correct: number
    accuracy: number
  }
}

// ── Profile State ──
export interface ProfileState {
  mastery: MasteryScores
  quizStats: QuizStats
  isLoading: boolean
  error: string | null
}
