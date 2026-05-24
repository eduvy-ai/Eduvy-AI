// ─── Sathi Module Types ───────────────────────────────────────
// Types for Study Squads: chat, doubts, challenges, daily concept

// ── Squad ──
export interface Squad {
  id: string
  name: string
  focus_subject: string
  members: number
  message_count: number
}

export interface SquadMember {
  user_id: string
  name: string
  role: 'leader' | 'member'
  online: boolean
  last_seen_at: string
  standard: string
}

export interface SquadMatchResponse {
  squad_id: string
  status: 'joined' | 'created' | 'already_matched'
}

// ── Messages ──
export type MessageType = 'chat' | 'system' | 'challenge' | 'daily'

export interface SquadMessage {
  id: number
  user_id: string
  display_name: string
  content: string
  msg_type: MessageType
  created_at: string
}

export interface SendMessageRequest {
  content: string
  display_name: string
  msg_type?: MessageType
}

// ── Challenge ──
export interface SquadChallenge {
  id: string
  subject: string
  concept: string
  status: 'active' | 'completed'
}

export interface ChallengeSubmitRequest {
  explanation: string
}

export interface ChallengeSubmitResponse {
  completed: boolean
  xp_awarded: number
}

// ── Doubts Board ──
export interface Doubt {
  id: string
  user_id: string
  user_name: string
  subject: string
  question: string
  answer_count: number
  created_at: string
}

export interface DoubtAnswer {
  id: string
  user_id: string
  user_name: string
  content: string
  upvotes: number
  ai_verdict?: 'correct' | 'partial' | 'incorrect'
  ai_note?: string
  created_at: string
}

export interface PostDoubtRequest {
  subject: string
  question: string
}

export interface PostAnswerRequest {
  content: string
}

export interface DoubtQuota {
  used: number
  limit: number
  remaining: number
}

// ── Daily Concept ──
export interface DailyConcept {
  id: string
  subject: string
  concept: string
  explanation: string
  completed: boolean
}

export interface DailyExplainRequest {
  explanation: string
  xp_override?: number
  ai_verdict?: 'correct' | 'partial' | 'incorrect'
  ai_note?: string
}

// ── Streak ──
export interface SquadStreak {
  streak: number
  last_active: string
}

// ── State ──
export interface SathiState {
  squad: Squad | null
  members: SquadMember[]
  messages: SquadMessage[]
  doubts: Doubt[]
  dailyConcept: DailyConcept | null
  challenge: SquadChallenge | null
  doubtQuota: DoubtQuota | null
  isLoading: boolean
  error: string | null
}
