// ─── Muqabla Module Types ─────────────────────────────────────
// Types for Muqabla - Battle Arena

// ── Battle Status ──
export type BattleStatus = 'pending' | 'active' | 'completed' | 'declined' | 'expired'

// ── Question ──
export interface BattleQuestion {
  id: string
  question: string
  options: string[]
  correct_index?: number // Only revealed after battle ends
}

// ── Battle ──
export interface Battle {
  id: string
  challenger_id: string
  challenger_name: string
  opponent_id?: string
  opponent_name?: string
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  questions: BattleQuestion[]
  status: BattleStatus
  challenger_score?: number
  opponent_score?: number
  winner_id?: string
  created_at: string
  expires_at: string
}

export interface BattleCreateRequest {
  opponent_id?: string // If null, creates an open challenge
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  question_count?: number
}

export interface BattleAnswerSubmission {
  question_id: string
  answer_index: number
}

export interface BattleAnswersRequest {
  answers: BattleAnswerSubmission[]
  time_taken_ms: number
}

export interface BattleAnswersResponse {
  score: number
  correct_count: number
  total: number
  battle_complete: boolean
  winner_id?: string
}

// ── Leaderboard ──
export interface LeaderboardEntry {
  user_id: string
  name: string
  school?: string
  wins: number
  losses: number
  draws: number
  total_battles: number
  win_rate: number
  xp: number
  rank: number
}

// ── State ──
export interface MuqablaState {
  openBattles: Battle[]
  pendingBattles: Battle[]
  activeBattles: Battle[]
  history: Battle[]
  leaderboard: LeaderboardEntry[]
  schoolLeaderboard: LeaderboardEntry[]
  currentBattle: Battle | null
  isLoading: boolean
  error: string | null
}
