// ─── Admin Constants ───────────────────────────────────────────
// Navigation items, role labels, and other constants

import type { AdminRole, AdminSection } from './types'

// ── Local Storage Keys ──
export const ADMIN_TOKEN_KEY = 'eduvyai_admin_token'
export const ADMIN_USER_KEY = 'eduvyai_admin_user'

// ── API Endpoints ──
export const ADMIN_ENDPOINTS = {
  // Auth
  setup: '/api/admin/setup',
  login: '/api/admin/login',
  me: '/api/admin/me',
  changePassword: '/api/admin/change-password',
  
  // Academics
  boards: '/api/admin/boards',
  standards: '/api/admin/standards',
  mediums: '/api/admin/mediums',
  subjects: '/api/admin/subjects',
  curriculum: '/api/admin/curriculum',
  chapters: '/api/admin/chapters',
  
  // Users
  users: '/api/admin/users',
  helpers: '/api/admin/drishti-helpers',
  drishtiStudents: '/api/admin/drishti-students',
  
  // School Teachers (B2B)
  schoolTeachers: '/api/admin/teachers',
  
  // Questions & Media (B2B)
  questions: '/api/admin/questions',
  media: '/api/admin/media',
  
  // Community
  communityStats: '/api/admin/community/stats',
  squads: '/api/admin/squads',
  squadMessages: '/api/admin/squad-messages',
  doubts: '/api/admin/doubts',
  
  // Analytics
  analyticsOverview: '/api/admin/analytics/overview',
  analyticsStudents: '/api/admin/analytics/students',
  analyticsRevenue: '/api/admin/analytics/revenue',
  
  // AI
  aiConfig: '/api/admin/ai-config',
  aiKeys: '/api/admin/ai-keys',
  aiModels: '/api/admin/ai-models',
  aiDashboard: '/api/admin/api-dashboard',
  usageSummary: '/api/admin/usage/summary',
  usageUsers: '/api/admin/usage/users',
  
  // Storage
  storageStats: '/api/storage/stats',
  storageHealth: '/api/storage/health',
} as const

// ── Navigation Structure ──
export interface NavItem {
  key: AdminSection
  label: string
  icon: string  // Phosphor icon name
  children?: { key: string; label: string; path: string }[]
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'ChartLineUp',
  },
  {
    key: 'academics',
    label: 'Academics',
    icon: 'GraduationCap',
    children: [
      { key: 'boards', label: 'Boards', path: '/admin/academics/boards' },
      { key: 'standards', label: 'Standards', path: '/admin/academics/standards' },
      { key: 'mediums', label: 'Mediums', path: '/admin/academics/mediums' },
      { key: 'subjects', label: 'Subjects', path: '/admin/academics/subjects' },
      { key: 'chapters', label: 'Chapters', path: '/admin/academics/chapters' },
    ],
  },
  {
    key: 'content_studio',
    label: 'Content Studio',
    icon: 'PaintBrush',
    children: [
      { key: 'chapter-content', label: 'Chapter Content', path: '/admin/content/chapters' },
      { key: 'questions', label: 'Question Bank', path: '/admin/content/questions' },
      { key: 'media', label: 'Media Library', path: '/admin/content/media' },
    ],
  },
  {
    key: 'students',
    label: 'Students',
    icon: 'Users',
  },
  {
    key: 'teachers',
    label: 'Teachers',
    icon: 'Chalkboard',
    children: [
      { key: 'all-teachers', label: 'All Teachers', path: '/admin/teachers/list' },
      { key: 'assignments', label: 'Assignments', path: '/admin/teachers/assignments' },
      { key: 'performance', label: 'Performance', path: '/admin/teachers/performance' },
    ],
  },
  {
    key: 'parents',
    label: 'Parents',
    icon: 'UsersThree',
  },
  {
    key: 'schools',
    label: 'Schools',
    icon: 'Buildings',
  },
  {
    key: 'community',
    label: 'Community',
    icon: 'ChatCircleDots',
    children: [
      { key: 'squads', label: 'Squads', path: '/admin/community/squads' },
      { key: 'moderation', label: 'Moderation', path: '/admin/community/moderation' },
      { key: 'leaderboard', label: 'Leaderboard', path: '/admin/community/leaderboard' },
    ],
  },
  {
    key: 'assessments',
    label: 'Assessments',
    icon: 'Exam',
  },
  {
    key: 'ai_studio',
    label: 'AI Studio',
    icon: 'Robot',
    children: [
      { key: 'providers', label: 'Providers', path: '/admin/ai/providers' },
      { key: 'prompts', label: 'Prompts', path: '/admin/ai/prompts' },
      { key: 'usage', label: 'Usage', path: '/admin/ai/usage' },
      { key: 'costs', label: 'Costs', path: '/admin/ai/costs' },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: 'ChartBar',
    children: [
      { key: 'overview', label: 'Overview', path: '/admin/analytics/overview' },
      { key: 'students-analytics', label: 'Students', path: '/admin/analytics/students' },
      { key: 'revenue', label: 'Revenue', path: '/admin/analytics/revenue' },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    icon: 'Gear',
    children: [
      { key: 'jobs', label: 'Jobs', path: '/admin/operations/jobs' },
      { key: 'logs', label: 'Logs', path: '/admin/operations/logs' },
      { key: 'storage', label: 'Storage', path: '/admin/operations/storage' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'Wrench',
    children: [
      { key: 'roles', label: 'Roles', path: '/admin/settings/roles' },
      { key: 'permissions', label: 'Permissions', path: '/admin/settings/permissions' },
      { key: 'feature-flags', label: 'Feature Flags', path: '/admin/settings/features' },
    ],
  },
]

// ── Role Labels ──
export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  academic_manager: 'Academic Manager',
  content_manager: 'Content Manager',
  ai_manager: 'AI Manager',
  teacher: 'Teacher',
  school_admin: 'School Admin',
  moderator: 'Moderator',
  support: 'Support',
  finance: 'Finance',
  viewer: 'Viewer',
}

// ── Section Labels ──
export const SECTION_LABELS: Record<AdminSection, string> = {
  dashboard: 'Dashboard',
  academics: 'Academics',
  content_studio: 'Content Studio',
  students: 'Students',
  teachers: 'Teachers',
  parents: 'Parents',
  schools: 'Schools',
  community: 'Community',
  assessments: 'Assessments',
  ai_studio: 'AI Studio',
  analytics: 'Analytics',
  operations: 'Operations',
  settings: 'Settings',
}

// ── Plan Labels ──
export const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: 'text-app-muted' },
  basic: { label: 'Basic', color: 'text-app-blue' },
  pro: { label: 'Pro', color: 'text-app-green' },
  premium: { label: 'Premium', color: 'text-app-yellow' },
}

// ── Status Colors ──
export const STATUS_COLORS = {
  healthy: 'text-app-green',
  degraded: 'text-app-yellow',
  down: 'text-app-red',
  draft: 'text-app-muted',
  review: 'text-app-yellow',
  published: 'text-app-green',
  active: 'text-app-green',
  inactive: 'text-app-muted',
} as const
