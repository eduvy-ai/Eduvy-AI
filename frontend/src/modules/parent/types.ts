// ─── Parent Module Types ──────────────────────────────────────
// Types for Parent Dashboard

// ── PIN ──
export interface ParentPin {
  pin: string
  created_at: string
  expires_at?: string
}

// ── Parent View ──
export interface ParentViewStudent {
  name: string
  standard: string
  board: string
  subjects: string[]
  xp: number
  streak: number
  plan: string
}

export interface ParentViewActivity {
  date: string
  minutes_studied: number
  topics_covered: string[]
  quizzes_taken: number
  quiz_accuracy: number
}

export interface ParentViewMastery {
  subject: string
  score: number
  trend: 'up' | 'down' | 'stable'
}

export interface ParentViewData {
  student: ParentViewStudent
  activities: ParentViewActivity[]
  mastery: ParentViewMastery[]
  insights: string[]
}

// ── State ──
export interface ParentState {
  pin: ParentPin | null
  viewData: ParentViewData | null
  isLoading: boolean
  error: string | null
}
