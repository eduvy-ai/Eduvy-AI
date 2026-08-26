// ─── Auth Module Types ────────────────────────────────────────
// TypeScript interfaces for authentication

import { PlanType } from '../../shared/constants/plans'

// ── User Profile ──
export interface UserProfile {
  id: string
  email: string
  name: string
  standard: string
  board: string
  stream?: string
  language: string
  displayLanguage: 'medium' | 'english'
  subjects: string[]
  plan: PlanType
  plan_expires_at: string | null
  xp: number
  streak: number
  is_drishti: boolean
  school?: string
  school_id?: number | null
  mobile?: string
  parent_mobile?: string
  created_at?: string
  last_active?: string
}

// ── API Request Types ──
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  standard: string
  board: string
  language: string
  subjects: string[]
  mobile?: string
  parent_mobile?: string
  stream?: string
}

export interface AccountRequestPayload {
  request_type: 'school' | 'individual'
  full_name: string
  email: string
  phone?: string
  school_name?: string
  standard?: string
  board?: string
  stream?: string
  language?: string
  city?: string
  state?: string
  message?: string
}

export interface AccountRequestResponse {
  ok: boolean
  message: string
  request: {
    id: number
    request_type: 'school' | 'individual'
    status: string
    full_name: string
    email: string
    created_at: string | null
  }
}

// ── API Response Types ──
export interface AuthResponse {
  token: string
  profile: UserProfile
  is_admin?: boolean
  must_change_password?: boolean
}

// ── Auth State ──
export interface AuthState {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  mustChangePassword: boolean
}

// ── Default Values ──
export const DEFAULT_PROFILE: Omit<UserProfile, 'id' | 'email'> = {
  name: '',
  standard: 'Class 10',
  board: 'CBSE',
  stream: '',
  language: 'English',
  displayLanguage: 'medium',
  subjects: [],
  plan: 'free',
  plan_expires_at: null,
  xp: 0,
  streak: 0,
  is_drishti: false,
}
