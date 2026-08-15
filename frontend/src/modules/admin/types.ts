// ─── Admin Module Types ────────────────────────────────────────
// TypeScript interfaces for admin platform

// ── Role & Permission Types ──
export type AdminRole = 
  | 'super_admin'
  | 'admin'
  | 'academic_manager'
  | 'content_manager'
  | 'ai_manager'
  | 'teacher'
  | 'school_admin'
  | 'moderator'
  | 'support'
  | 'finance'
  | 'viewer'

export type PermissionLevel = 'full' | 'read' | 'none'

export type AdminSection = 
  | 'dashboard'
  | 'academics'
  | 'content_studio'
  | 'students'
  | 'teachers'
  | 'parents'
  | 'schools'
  | 'community'
  | 'assessments'
  | 'ai_studio'
  | 'analytics'
  | 'operations'
  | 'settings'

// ── Admin User ──
export interface AdminUser {
  id: number
  email: string
  name: string
  role: AdminRole
  school_id?: number | null  // null for superadmin, number for school admin
  must_change_password?: boolean  // true on first login for school admins
  curriculum_imported?: boolean
  permissions?: Record<AdminSection, PermissionLevel>
  created_at: string
  last_login?: string
}

// ── Auth Types ──
export interface AdminLoginRequest {
  email: string
  password: string
}

export interface AdminSetupRequest {
  email: string
  password: string
  name: string
}

export interface AdminAuthResponse {
  token: string
  user: AdminUser
}

// ── Curriculum Types ──
export interface Board {
  id: string
  name: string
  sort_order: number
  is_active: boolean
}

export interface Standard {
  id: string
  name: string
  grade_num: number
  sort_order: number
  is_active: boolean
}

export interface Medium {
  id: string
  name: string
  sort_order: number
  is_active: boolean
}

export interface Stream {
  id: string
  name: string
  sort_order: number
  is_active?: boolean
}

export interface Subject {
  id: string
  name: string
  board_id: string
  standard_id: string
  stream_id?: string | null
  board_name?: string
  standard_name?: string
  stream_name?: string | null
  sort_order: number
  is_active: boolean
}

export interface CurriculumEntry {
  id: number
  board_id: string
  standard_id: string
  medium_id: string
  subjects: string[]
  is_active: boolean
}

export interface Chapter {
  id: number
  board_id: string
  standard_id: string
  subject_id: string
  stream_id?: string
  chapter_number: number
  chapter_name: string
  chapter_name_local?: string
  description: string
  topics: string[]
  is_active: boolean
  content_status: 'draft' | 'review' | 'published'
  created_at: string
  // Joined names from FK tables
  board_name?: string
  standard_name?: string
  subject_name?: string
  stream_name?: string
}

// ── User Management Types ──
export interface StudentUser {
  id: string
  email: string
  name: string
  standard: string
  board: string
  stream?: string  // For Class 11-12 (Science, Commerce, Arts)
  language: string
  plan: 'free' | 'basic' | 'pro' | 'premium'
  plan_expires_at: string | null
  xp: number
  streak: number
  is_drishti: boolean
  school_id: number | null
  last_active: string | null
  created_at: string
}

export interface DrishtiHelper {
  id: number
  helper_name: string
  helper_email: string
  helper_type: 'teacher' | 'parent' | 'tutor'
  helper_token: string
  notes: string
  is_active: boolean
  created_at: string
  assigned_count?: number
}

// ── AI Configuration Types ──
export interface AIProvider {
  id: string
  name: string
  is_active: boolean
  key_count: number
  models: string[]
}

export interface AIRouting {
  plan: string
  provider: string
  model: string
}

export interface AIKeySlot {
  provider: string
  slot: number
  masked_key: string
  is_active: boolean
}

export interface AIUsageSummary {
  total_calls: number
  total_prompt_tokens: number
  total_completion_tokens: number
  daily_breakdown: {
    date: string
    calls: number
    prompt_tokens: number
    completion_tokens: number
  }[]
  by_plan: Record<string, { calls: number; users: number }>
}

export interface AIUserUsage {
  user_id: string
  email: string
  name: string
  plan: string
  calls: number
  prompt_tokens: number
  completion_tokens: number
}

// ── Dashboard Types ──
export interface DashboardStats {
  total_students: number
  active_today: number
  total_ai_calls: number
  total_content: number
  pending_moderation: number
  revenue_mtd: number
  new_signups_today: number
  active_subscriptions: number
}

export interface PlatformHealth {
  api_status: 'healthy' | 'degraded' | 'down'
  database_status: 'healthy' | 'degraded' | 'down'
  ai_providers: {
    provider: string
    status: 'healthy' | 'degraded' | 'down'
    latency_ms: number
  }[]
  storage_used_gb: number
  storage_limit_gb: number
}

// ── Analytics Types ──
export interface AnalyticsOverview {
  total_users: number
  active_today: number
  active_7d: number
  active_30d: number
  signups_today: number
  signups_7d: number
  ai_calls_today: number
  ai_calls_7d: number
  paid_subscriptions: number
  by_plan: Record<string, number>
  avg_streak: number
  total_xp: number
}

export interface StudentAnalytics {
  by_board: Record<string, number>
  by_standard: Record<string, number>
  by_language: Record<string, number>
  by_school: { school: string; count: number }[]
  drishti_count: number
  top_by_xp: { id: string; name: string; xp: number; streak: number; plan: string; standard: string; board: string }[]
  top_by_streak: { id: string; name: string; xp: number; streak: number; plan: string; standard: string; board: string }[]
  growth_chart: { date: string; count: number }[]
  activity_chart: { date: string; count: number }[]
}

export interface RevenueAnalytics {
  subscriptions_by_plan: Record<string, number>
  expired_subscriptions: number
  expiring_soon: number
  estimated_mrr: number
}

export interface ContentAnalytics {
  total_chapters: number
  published_chapters: number
  total_questions: number
  total_videos: number
  total_flashcards: number
  content_by_subject: Record<string, number>
  engagement_by_chapter: { chapter_id: number; views: number; completion_rate: number }[]
}

// ── Community Types ──
export interface Squad {
  id: number
  name: string
  focus_subject: string
  standard: string
  medium: string
  is_active: boolean
  created_at: string
  member_count?: number
  message_count?: number
  doubt_count?: number
}

export interface SquadMember {
  user_id: string
  name: string
  role: string
  standard: string
  board: string
  xp: number
  streak: number
  joined_at: string
  last_seen_at: string
}

export interface SquadMessage {
  id: number
  user_id: string
  display_name: string
  content: string
  msg_type: string
  created_at: string
}

export interface SquadDoubt {
  id: number
  squad_id: number
  squad_name?: string
  user_id: string
  display_name: string
  subject: string
  question: string
  answer_count: number
  created_at: string
}

export interface CommunityStats {
  active_squads: number
  total_members: number
  messages_this_week: number
  doubts_this_week: number
}

// ── Content Studio Types ──
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'short_answer' | 'long_answer'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type MediaType = 'image' | 'video' | 'audio' | 'document'
export type AssessmentType = 'quiz' | 'mock_test' | 'practice' | 'assignment'
export type AssessmentDifficulty = 'easy' | 'medium' | 'hard' | 'mixed'
export type AssessmentStatus = 'draft' | 'published' | 'archived'

export interface Question {
  id: string
  chapter_id: number
  type: QuestionType
  difficulty: Difficulty
  question: string
  options: string[]
  correct_answer: string
  explanation: string
  tags: string[]
  times_used: number
  correct_count: number
  accuracy_rate: number
  is_active: boolean
  created_by: string
  created_at: string
  // Joined fields
  chapter_name?: string
  subject_name?: string
}

export interface QuestionCreate {
  chapter_id: number
  type: QuestionType
  difficulty: Difficulty
  question: string
  options?: string[]
  correct_answer: string
  explanation?: string
  tags?: string[]
}

export interface QuestionUpdate {
  type?: QuestionType
  difficulty?: Difficulty
  question?: string
  options?: string[]
  correct_answer?: string
  explanation?: string
  tags?: string[]
  is_active?: boolean
}

export interface MediaFile {
  id: string
  name: string
  type: MediaType
  url: string
  thumbnail_url: string
  size_bytes: number
  duration_sec?: number
  dimensions: string
  subject_id?: string
  chapter_id?: number
  usage_count: number
  uploaded_by: string
  uploaded_at: string
  // Joined fields
  chapter_name?: string
  subject_name?: string
}

export interface MediaCreate {
  name: string
  type: MediaType
  url: string
  thumbnail_url?: string
  size_bytes?: number
  duration_sec?: number
  dimensions?: string
  subject_id?: string
  chapter_id?: number
}

export interface Assessment {
  id: number
  title: string
  description: string
  board_id: string
  standard_id: string
  subject_id: string
  chapter_id?: number
  type: AssessmentType
  difficulty: AssessmentDifficulty
  question_ids: string[]
  question_count: number
  time_limit_min?: number
  total_marks: number
  pass_marks: number
  status: AssessmentStatus
  created_by: string
  created_at: string
  published_at?: string
  // Joined fields
  board_name?: string
  standard_name?: string
  subject_name?: string
  chapter_name?: string
}

export interface AssessmentCreate {
  title: string
  description?: string
  board_id: string
  standard_id: string
  subject_id: string
  chapter_id?: number
  type: AssessmentType
  difficulty?: AssessmentDifficulty
  question_ids?: string[]
  time_limit_min?: number
  total_marks?: number
  pass_marks?: number
}

export interface AssessmentUpdate {
  title?: string
  description?: string
  chapter_id?: number
  type?: AssessmentType
  difficulty?: AssessmentDifficulty
  question_ids?: string[]
  time_limit_min?: number
  total_marks?: number
  pass_marks?: number
  status?: AssessmentStatus
}

// Paginated list response
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

// ── Admin State ──
export interface AdminState {
  // Auth
  user: AdminUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  
  // Data
  boards: Board[]
  standards: Standard[]
  mediums: Medium[]
  subjects: Subject[]
  curriculum: CurriculumEntry[]
  chapters: Chapter[]
  students: StudentUser[]
  helpers: DrishtiHelper[]
  squads: Squad[]
  doubts: SquadDoubt[]
  communityStats: CommunityStats | null
  
  // Content Studio
  questions: Question[]
  questionsTotal: number
  media: MediaFile[]
  mediaTotal: number
  assessments: Assessment[]
  assessmentsTotal: number
  
  // AI Config
  aiProviders: AIProvider[]
  aiRouting: AIRouting[]
  aiKeySlots: AIKeySlot[]
  aiUsage: AIUsageSummary | null
  
  // Dashboard
  dashboardStats: DashboardStats | null
  platformHealth: PlatformHealth | null
  
  // UI State
  activeSection: AdminSection
  sidebarCollapsed: boolean
  searchQuery: string
}

// ── Default Values ──
export const DEFAULT_ADMIN_STATE: AdminState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  
  boards: [],
  standards: [],
  mediums: [],
  subjects: [],
  curriculum: [],
  chapters: [],
  students: [],
  helpers: [],
  squads: [],
  doubts: [],
  communityStats: null,
  
  questions: [],
  questionsTotal: 0,
  media: [],
  mediaTotal: 0,
  assessments: [],
  assessmentsTotal: 0,
  
  aiProviders: [],
  aiRouting: [],
  aiKeySlots: [],
  aiUsage: null,
  
  dashboardStats: null,
  platformHealth: null,
  
  activeSection: 'dashboard',
  sidebarCollapsed: false,
  searchQuery: '',
}

// ── RBAC Matrix ──
export const ROLE_PERMISSIONS: Record<AdminRole, Record<AdminSection, PermissionLevel>> = {
  super_admin: {
    dashboard: 'full', academics: 'full', content_studio: 'full', students: 'full',
    teachers: 'full', parents: 'full', schools: 'full', community: 'full', assessments: 'full',
    ai_studio: 'full', analytics: 'full', operations: 'full', settings: 'full',
  },
  admin: {
    dashboard: 'full', academics: 'full', content_studio: 'full', students: 'full',
    teachers: 'full', parents: 'full', schools: 'full', community: 'full', assessments: 'full',
    ai_studio: 'full', analytics: 'full', operations: 'full', settings: 'read',
  },
  academic_manager: {
    dashboard: 'full', academics: 'full', content_studio: 'full', students: 'full',
    teachers: 'full', parents: 'none', schools: 'read', community: 'none', assessments: 'full',
    ai_studio: 'none', analytics: 'full', operations: 'none', settings: 'none',
  },
  content_manager: {
    dashboard: 'full', academics: 'read', content_studio: 'full', students: 'none',
    teachers: 'none', parents: 'none', schools: 'none', community: 'none', assessments: 'full',
    ai_studio: 'none', analytics: 'full', operations: 'none', settings: 'none',
  },
  ai_manager: {
    dashboard: 'full', academics: 'none', content_studio: 'none', students: 'none',
    teachers: 'none', parents: 'none', schools: 'none', community: 'none', assessments: 'none',
    ai_studio: 'full', analytics: 'full', operations: 'none', settings: 'none',
  },
  teacher: {
    dashboard: 'full', academics: 'read', content_studio: 'read', students: 'read',
    teachers: 'none', parents: 'none', schools: 'none', community: 'none', assessments: 'read',
    ai_studio: 'none', analytics: 'read', operations: 'none', settings: 'none',
  },
  school_admin: {
    dashboard: 'full', academics: 'full', content_studio: 'full', students: 'full',
    teachers: 'full', parents: 'full', schools: 'full', community: 'full', assessments: 'full',
    ai_studio: 'read', analytics: 'full', operations: 'read', settings: 'read',
  },
  moderator: {
    dashboard: 'full', academics: 'none', content_studio: 'none', students: 'read',
    teachers: 'none', parents: 'none', schools: 'none', community: 'full', assessments: 'none',
    ai_studio: 'none', analytics: 'none', operations: 'none', settings: 'none',
  },
  support: {
    dashboard: 'full', academics: 'none', content_studio: 'none', students: 'full',
    teachers: 'none', parents: 'full', schools: 'read', community: 'full', assessments: 'none',
    ai_studio: 'none', analytics: 'none', operations: 'none', settings: 'none',
  },
  finance: {
    dashboard: 'full', academics: 'none', content_studio: 'none', students: 'none',
    teachers: 'none', parents: 'none', schools: 'read', community: 'none', assessments: 'none',
    ai_studio: 'none', analytics: 'full', operations: 'none', settings: 'none',
  },
  viewer: {
    dashboard: 'full', academics: 'read', content_studio: 'read', students: 'read',
    teachers: 'read', parents: 'read', schools: 'read', community: 'read', assessments: 'read',
    ai_studio: 'none', analytics: 'read', operations: 'none', settings: 'none',
  },
}
