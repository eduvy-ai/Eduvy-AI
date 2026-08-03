// ─── Admin Service Layer ───────────────────────────────────────
// Business logic for admin platform - token storage, data transforms

import { adminApi } from './api'
import { ADMIN_TOKEN_KEY, ADMIN_USER_KEY } from './constants'
import { ROLE_PERMISSIONS } from './types'
import type {
  AdminLoginRequest,
  AdminSetupRequest,
  AdminAuthResponse,
  AdminUser,
  AdminRole,
  AdminSection,
  PermissionLevel,
  Board,
  Standard,
  Medium,
  Chapter,
} from './types'

// ── Role Normalization (handles legacy DB values) ──
const normalizeRole = (role: string): AdminRole => {
  const roleMap: Record<string, AdminRole> = {
    'superadmin': 'super_admin',
    'super_admin': 'super_admin',
    'academicmanager': 'academic_manager',
    'academic_manager': 'academic_manager',
    'contentmanager': 'content_manager',
    'content_manager': 'content_manager',
    'aimanager': 'ai_manager',
    'ai_manager': 'ai_manager',
    'admin': 'admin',
    'teacher': 'teacher',
    'moderator': 'moderator',
    'support': 'support',
    'finance': 'finance',
    'viewer': 'viewer',
  }
  return roleMap[role] || 'viewer'
}

// ── Token Management ──
export const setAdminToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
  }
}

export const getAdminToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(ADMIN_TOKEN_KEY)
  }
  return null
}

export const clearAdminAuth = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
  }
}

// ── User Cache ──
export const setCachedAdminUser = (user: AdminUser): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user))
  }
}

export const getCachedAdminUser = (): AdminUser | null => {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(ADMIN_USER_KEY)
    if (cached) {
      try {
        return JSON.parse(cached) as AdminUser
      } catch {
        return null
      }
    }
  }
  return null
}

// ── Permission Helpers ──
export const hasPermission = (
  user: AdminUser | null,
  section: AdminSection,
  requiredLevel: PermissionLevel = 'read'
): boolean => {
  if (!user) return false
  
  // Get permissions from user or fallback to role defaults
  const permissions = user.permissions || ROLE_PERMISSIONS[user.role]
  if (!permissions) return false
  
  const userLevel = permissions[section]
  
  if (requiredLevel === 'none') return true
  if (requiredLevel === 'read') return userLevel === 'read' || userLevel === 'full'
  if (requiredLevel === 'full') return userLevel === 'full'
  
  return false
}

export const canAccess = (user: AdminUser | null, section: AdminSection): boolean => {
  return hasPermission(user, section, 'read')
}

export const canEdit = (user: AdminUser | null, section: AdminSection): boolean => {
  return hasPermission(user, section, 'full')
}

// ── Service Functions ──
export const adminService = {
  /**
   * Check if initial setup is needed
   */
  checkSetup: async (): Promise<boolean> => {
    const result = await adminApi.auth.checkSetup()
    return result.needs_setup
  },

  /**
   * Initial admin setup
   */
  setup: async (data: AdminSetupRequest): Promise<AdminAuthResponse> => {
    const response = await adminApi.auth.setup(data)
    
    // Store token
    setAdminToken(response.token)
    
    // Enrich user with normalized role and permissions
    if (response.user) {
      const role = normalizeRole(response.user.role)
      const enrichedUser: AdminUser = {
        ...response.user,
        role,
        permissions: response.user.permissions || ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer,
      }
      setCachedAdminUser(enrichedUser)
      return { token: response.token, user: enrichedUser }
    }
    
    return response
  },

  /**
   * Admin login
   */
  login: async (credentials: AdminLoginRequest): Promise<AdminAuthResponse> => {
    const response = await adminApi.auth.login(credentials)
    
    // Store token
    setAdminToken(response.token)
    
    // Enrich user with normalized role and permissions
    if (response.user) {
      const role = normalizeRole(response.user.role)
      const enrichedUser: AdminUser = {
        ...response.user,
        role,
        permissions: response.user.permissions || ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer,
      }
      setCachedAdminUser(enrichedUser)
      return { token: response.token, user: enrichedUser }
    }
    
    return response
  },

  /**
   * Get current admin user
   */
  getCurrentUser: async (): Promise<AdminUser | null> => {
    try {
      const user = await adminApi.auth.getMe()
      if (user) {
        // Normalize role and ensure user has permissions
        const role = normalizeRole(user.role)
        const enrichedUser: AdminUser = {
          ...user,
          role,
          permissions: user.permissions || ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer,
        }
        setCachedAdminUser(enrichedUser)
        return enrichedUser
      }
      return null
    } catch {
      return null
    }
  },

  /**
   * Logout
   */
  logout: (): void => {
    clearAdminAuth()
  },

  /**
   * Get cached admin user (synchronous)
   */
  getCachedUser: (): AdminUser | null => {
    return getCachedAdminUser()
  },

  // ── Curriculum Helpers ──
  
  /**
   * Sort boards by sort_order
   */
  sortBoards: (boards: Board[]): Board[] => {
    return [...boards].sort((a, b) => a.sort_order - b.sort_order)
  },

  /**
   * Sort standards by grade_num
   */
  sortStandards: (standards: Standard[]): Standard[] => {
    return [...standards].sort((a, b) => a.grade_num - b.grade_num)
  },

  /**
   * Sort mediums by sort_order
   */
  sortMediums: (mediums: Medium[]): Medium[] => {
    return [...mediums].sort((a, b) => a.sort_order - b.sort_order)
  },

  /**
   * Sort chapters by chapter_number
   */
  sortChapters: (chapters: Chapter[]): Chapter[] => {
    return [...chapters].sort((a, b) => a.chapter_number - b.chapter_number)
  },

  /**
   * Get unique subjects from curriculum entries
   */
  getSubjectsFromCurriculum: (
    curriculum: { subjects: string[] }[],
    _boardId?: string,
    _standardId?: string
  ): string[] => {
    const subjectSet = new Set<string>()
    curriculum.forEach(entry => {
      entry.subjects.forEach(subject => subjectSet.add(subject))
    })
    return Array.from(subjectSet).sort()
  },

  // ── Data Validation ──
  
  /**
   * Validate board data
   */
  validateBoard: (data: Partial<Board>): string | null => {
    if (!data.id?.trim()) return 'Board ID is required'
    if (!data.name?.trim()) return 'Board name is required'
    if (!/^[a-z0-9_]+$/.test(data.id)) return 'Board ID must be lowercase alphanumeric with underscores'
    return null
  },

  /**
   * Validate standard data
   */
  validateStandard: (data: Partial<Standard>): string | null => {
    if (!data.id?.trim()) return 'Standard ID is required'
    if (!data.name?.trim()) return 'Standard name is required'
    if (typeof data.grade_num !== 'number' || data.grade_num < 1) return 'Grade number must be positive'
    return null
  },

  /**
   * Validate chapter data
   */
  validateChapter: (data: Partial<Chapter>): string | null => {
    if (!data.board?.trim()) return 'Board is required'
    if (!data.standard?.trim()) return 'Standard is required'
    if (!data.subject?.trim()) return 'Subject is required'
    if (!data.chapter_name?.trim()) return 'Chapter name is required'
    if (typeof data.chapter_number !== 'number' || data.chapter_number < 1) return 'Chapter number must be positive'
    return null
  },

  // ── Date Helpers ──
  
  /**
   * Format date for display
   */
  formatDate: (dateString: string | null | undefined): string => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  },

  /**
   * Format datetime for display
   */
  formatDateTime: (dateString: string | null | undefined): string => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  },

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  getRelativeTime: (dateString: string | null | undefined): string => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHour = Math.floor(diffMin / 60)
      const diffDay = Math.floor(diffHour / 24)

      if (diffSec < 60) return 'Just now'
      if (diffMin < 60) return `${diffMin}m ago`
      if (diffHour < 24) return `${diffHour}h ago`
      if (diffDay < 7) return `${diffDay}d ago`
      return adminService.formatDate(dateString)
    } catch {
      return dateString
    }
  },

  // ── Number Formatting ──
  
  /**
   * Format large numbers (e.g., 1.2K, 3.4M)
   */
  formatNumber: (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
    return num.toLocaleString()
  },

  /**
   * Format bytes to human readable
   */
  formatBytes: (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  },

  /**
   * Format percentage
   */
  formatPercent: (value: number, decimals: number = 1): string => {
    return `${value.toFixed(decimals)}%`
  },
}

export default adminService
