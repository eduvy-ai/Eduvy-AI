// ─── Admin API Layer ───────────────────────────────────────────
// Raw API calls for admin platform - no business logic here

import axiosInstance from '../../services/axios'
import { ADMIN_ENDPOINTS, ADMIN_TOKEN_KEY } from './constants'
import type {
  AdminLoginRequest,
  AdminSetupRequest,
  AdminAuthResponse,
  AdminUser,
  Board,
  Standard,
  Medium,
  Stream,
  Subject,
  CurriculumEntry,
  Chapter,
  StudentUser,
  DrishtiHelper,
  AIRouting,
  AIKeySlot,
  AIUsageSummary,
  AIUserUsage,
  Squad,
  SquadMember,
  SquadMessage,
  SquadDoubt,
  CommunityStats,
  AnalyticsOverview,
  StudentAnalytics,
  RevenueAnalytics,
  Question,
  QuestionCreate,
  QuestionUpdate,
  MediaFile,
  MediaCreate,
  Assessment,
  AssessmentCreate,
  AssessmentUpdate,
  PagedResponse,
} from './types'

// ── Helper: Get admin token ──
const getAdminToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(ADMIN_TOKEN_KEY)
  }
  return null
}

// ── Helper: Create admin axios config ──
const adminConfig = () => {
  const token = getAdminToken()
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
}

// ── Auth APIs ──
export const adminAuthApi = {
  /**
   * Check if admin setup is needed (no admin users exist)
   */
  checkSetup: async (): Promise<{ needs_setup: boolean }> => {
    try {
      await axiosInstance.get(ADMIN_ENDPOINTS.me, adminConfig())
      return { needs_setup: false }
    } catch (error: any) {
      // 401 with specific message means no admin exists
      if (error.response?.status === 401) {
        return { needs_setup: true }
      }
      throw error
    }
  },

  /**
   * Initial admin setup (creates first superadmin)
   */
  setup: async (data: AdminSetupRequest): Promise<AdminAuthResponse> => {
    const response = await axiosInstance.post<AdminAuthResponse>(ADMIN_ENDPOINTS.setup, data)
    return response.data
  },

  /**
   * Admin login
   */
  login: async (data: AdminLoginRequest): Promise<AdminAuthResponse> => {
    const response = await axiosInstance.post<AdminAuthResponse>(ADMIN_ENDPOINTS.login, data)
    return response.data
  },

  /**
   * Get current admin user
   */
  getMe: async (): Promise<AdminUser> => {
    const response = await axiosInstance.get<AdminUser>(ADMIN_ENDPOINTS.me, adminConfig())
    return response.data
  },

  /**
   * Change admin password (required on first login for school admins)
   */
  changePassword: async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.post<{ success: boolean; message: string }>(
      ADMIN_ENDPOINTS.changePassword,
      { new_password: newPassword },
      adminConfig()
    )
    return response.data
  },
}

// ── Board APIs ──
export const boardsApi = {
  getAll: async (): Promise<Board[]> => {
    const response = await axiosInstance.get<Board[]>(ADMIN_ENDPOINTS.boards, adminConfig())
    return response.data
  },

  create: async (data: Board): Promise<Board> => {
    const response = await axiosInstance.post<Board>(ADMIN_ENDPOINTS.boards, data, adminConfig())
    return response.data
  },

  update: async (id: string, data: Partial<Board>): Promise<Board> => {
    const response = await axiosInstance.put<Board>(`${ADMIN_ENDPOINTS.boards}/${id}`, data, adminConfig())
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.boards}/${id}`, adminConfig())
  },

  bulkImport: async (boards: Board[]): Promise<{ inserted: number; updated: number }> => {
    const response = await axiosInstance.post<{ inserted: number; updated: number }>(
      `${ADMIN_ENDPOINTS.boards}/import`,
      boards,
      adminConfig()
    )
    return response.data
  },

  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      `${ADMIN_ENDPOINTS.boards}/bulk-delete`,
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── Standard APIs ──
export const standardsApi = {
  getAll: async (): Promise<Standard[]> => {
    const response = await axiosInstance.get<Standard[]>(ADMIN_ENDPOINTS.standards, adminConfig())
    return response.data
  },

  create: async (data: Standard): Promise<Standard> => {
    const response = await axiosInstance.post<Standard>(ADMIN_ENDPOINTS.standards, data, adminConfig())
    return response.data
  },

  update: async (id: string, data: Partial<Standard>): Promise<Standard> => {
    const response = await axiosInstance.put<Standard>(`${ADMIN_ENDPOINTS.standards}/${id}`, data, adminConfig())
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.standards}/${id}`, adminConfig())
  },

  bulkImport: async (standards: Standard[]): Promise<{ inserted: number; updated: number }> => {
    const response = await axiosInstance.post<{ inserted: number; updated: number }>(
      `${ADMIN_ENDPOINTS.standards}/import`,
      standards,
      adminConfig()
    )
    return response.data
  },

  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      `${ADMIN_ENDPOINTS.standards}/bulk-delete`,
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── Medium APIs ──
export const mediumsApi = {
  getAll: async (): Promise<Medium[]> => {
    const response = await axiosInstance.get<Medium[]>(ADMIN_ENDPOINTS.mediums, adminConfig())
    return response.data
  },

  create: async (data: Medium): Promise<Medium> => {
    const response = await axiosInstance.post<Medium>(ADMIN_ENDPOINTS.mediums, data, adminConfig())
    return response.data
  },

  update: async (id: string, data: Partial<Medium>): Promise<Medium> => {
    const response = await axiosInstance.put<Medium>(`${ADMIN_ENDPOINTS.mediums}/${id}`, data, adminConfig())
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.mediums}/${id}`, adminConfig())
  },

  bulkImport: async (mediums: Medium[]): Promise<{ inserted: number; updated: number }> => {
    const response = await axiosInstance.post<{ inserted: number; updated: number }>(
      `${ADMIN_ENDPOINTS.mediums}/import`,
      mediums,
      adminConfig()
    )
    return response.data
  },

  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      `${ADMIN_ENDPOINTS.mediums}/bulk-delete`,
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── Streams APIs (read-only) ──
export const streamsApi = {
  getAll: async (): Promise<Stream[]> => {
    const response = await axiosInstance.get<Stream[]>(ADMIN_ENDPOINTS.streams, adminConfig())
    return response.data
  },
}

// ── Subject APIs ──
export const subjectsApi = {
  getAll: async (filters?: { board_id?: string; standard_id?: string; stream_id?: string; search?: string; page?: number; page_size?: number }): Promise<PagedResponse<Subject>> => {
    const params = new URLSearchParams()
    if (filters?.board_id) params.append('board_id', filters.board_id)
    if (filters?.standard_id) params.append('standard_id', filters.standard_id)
    if (filters?.stream_id) params.append('stream_id', filters.stream_id)
    if (filters?.search) params.append('search', filters.search)
    params.append('page', String(filters?.page || 1))
    params.append('page_size', String(filters?.page_size || 50))
    
    const url = `${ADMIN_ENDPOINTS.subjects}?${params}`
    const response = await axiosInstance.get<PagedResponse<Subject>>(url, adminConfig())
    return response.data
  },

  create: async (data: Subject): Promise<Subject> => {
    const response = await axiosInstance.post<Subject>(ADMIN_ENDPOINTS.subjects, data, adminConfig())
    return response.data
  },

  update: async (id: string, data: Partial<Subject>): Promise<Subject> => {
    const response = await axiosInstance.put<Subject>(`${ADMIN_ENDPOINTS.subjects}/${id}`, data, adminConfig())
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.subjects}/${id}`, adminConfig())
  },

  bulkImport: async (subjects: Subject[]): Promise<{ inserted: number; updated: number }> => {
    const response = await axiosInstance.post<{ inserted: number; updated: number }>(
      `${ADMIN_ENDPOINTS.subjects}/import`,
      subjects,
      adminConfig()
    )
    return response.data
  },

  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      `${ADMIN_ENDPOINTS.subjects}/bulk-delete`,
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── Curriculum APIs ──
export const curriculumApi = {
  getAll: async (filters?: { board_id?: string; standard_id?: string; medium_id?: string }): Promise<CurriculumEntry[]> => {
    const params = new URLSearchParams()
    if (filters?.board_id) params.append('board_id', filters.board_id)
    if (filters?.standard_id) params.append('standard_id', filters.standard_id)
    if (filters?.medium_id) params.append('medium_id', filters.medium_id)
    
    const url = params.toString() ? `${ADMIN_ENDPOINTS.curriculum}?${params}` : ADMIN_ENDPOINTS.curriculum
    const response = await axiosInstance.get<CurriculumEntry[]>(url, adminConfig())
    return response.data
  },

  create: async (data: Omit<CurriculumEntry, 'id'>): Promise<CurriculumEntry> => {
    const response = await axiosInstance.post<CurriculumEntry>(ADMIN_ENDPOINTS.curriculum, data, adminConfig())
    return response.data
  },

  update: async (id: number, data: Partial<CurriculumEntry>): Promise<CurriculumEntry> => {
    const response = await axiosInstance.put<CurriculumEntry>(`${ADMIN_ENDPOINTS.curriculum}/${id}`, data, adminConfig())
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.curriculum}/${id}`, adminConfig())
  },

  bulkImport: async (entries: Omit<CurriculumEntry, 'id'>[]): Promise<{ created: number; errors: string[] }> => {
    const response = await axiosInstance.post<{ created: number; errors: string[] }>(
      `${ADMIN_ENDPOINTS.curriculum}/import`,
      { rows: entries },
      adminConfig()
    )
    return response.data
  },

  bulkDelete: async (ids: number[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      `${ADMIN_ENDPOINTS.curriculum}/bulk-delete`,
      { ids },
      adminConfig()
    )
    return response.data
  },

  importGlobal: async (): Promise<{ success: boolean; imported: { boards: number; standards: number; mediums: number; subjects: number; curriculum: number; chapters: number } }> => {
    const response = await axiosInstance.post(
      `${ADMIN_ENDPOINTS.curriculum}/import-global`,
      {},
      adminConfig()
    )
    return response.data
  },
}

// ── Chapter APIs ──
export const chaptersApi = {
  getAll: async (filters?: { 
    board_id?: string
    standard_id?: string
    subject_id?: string
    stream_id?: string
    page?: number
    page_size?: number
  }): Promise<PagedResponse<Chapter>> => {
    const params = new URLSearchParams()
    if (filters?.board_id) params.append('board_id', filters.board_id)
    if (filters?.standard_id) params.append('standard_id', filters.standard_id)
    if (filters?.subject_id) params.append('subject_id', filters.subject_id)
    if (filters?.stream_id) params.append('stream_id', filters.stream_id)
    params.append('page', String(filters?.page || 1))
    params.append('page_size', String(filters?.page_size || 50))
    
    const url = `${ADMIN_ENDPOINTS.chapters}?${params}`
    const response = await axiosInstance.get<PagedResponse<Chapter>>(url, adminConfig())
    return response.data
  },

  getById: async (id: number): Promise<Chapter> => {
    const response = await axiosInstance.get<Chapter>(`${ADMIN_ENDPOINTS.chapters}/${id}`, adminConfig())
    return response.data
  },

  create: async (data: Omit<Chapter, 'id' | 'created_at'>): Promise<Chapter> => {
    const response = await axiosInstance.post<Chapter>(ADMIN_ENDPOINTS.chapters, data, adminConfig())
    return response.data
  },

  update: async (id: number, data: Partial<Chapter>): Promise<Chapter> => {
    const response = await axiosInstance.put<Chapter>(`${ADMIN_ENDPOINTS.chapters}/${id}`, data, adminConfig())
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.chapters}/${id}`, adminConfig())
  },

  bulkCreate: async (chapters: Omit<Chapter, 'id' | 'created_at'>[]): Promise<{ created: number }> => {
    const response = await axiosInstance.post<{ created: number }>(
      `${ADMIN_ENDPOINTS.chapters}/bulk`,
      { chapters },
      adminConfig()
    )
    return response.data
  },

  bulkDelete: async (ids: number[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      `${ADMIN_ENDPOINTS.chapters}/bulk-delete`,
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── User Management APIs ──
export const usersApi = {
  getAll: async (filters?: { search?: string; plan?: string; drishti?: boolean; page?: number; page_size?: number }): Promise<PagedResponse<StudentUser>> => {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.plan) params.append('plan', filters.plan)
    if (filters?.drishti !== undefined) params.append('drishti', String(filters.drishti))
    params.append('page', String(filters?.page || 1))
    params.append('page_size', String(filters?.page_size || 50))
    
    const url = `${ADMIN_ENDPOINTS.users}?${params}`
    const response = await axiosInstance.get<PagedResponse<StudentUser>>(url, adminConfig())
    return response.data
  },

  updatePlan: async (userId: string, plan: string, expiresAt?: string): Promise<void> => {
    await axiosInstance.put(
      `${ADMIN_ENDPOINTS.users}/${userId}/plan`,
      { plan, plan_expires_at: expiresAt },
      adminConfig()
    )
  },

  updateDrishti: async (userId: string, isDrishti: boolean): Promise<void> => {
    await axiosInstance.put(
      `${ADMIN_ENDPOINTS.users}/${userId}/drishti?is_drishti=${isDrishti}`,
      null,
      adminConfig()
    )
  },

  updateAIConfig: async (userId: string, provider: string, model: string): Promise<void> => {
    await axiosInstance.put(
      `${ADMIN_ENDPOINTS.users}/${userId}/ai-config`,
      { provider, model },
      adminConfig()
    )
  },

  createDrishtiStudent: async (data: { email: string; password: string; name: string; standard: string; board: string; language?: string }): Promise<StudentUser> => {
    const response = await axiosInstance.post<StudentUser>(
      `${ADMIN_ENDPOINTS.users}/drishti`,
      data,
      adminConfig()
    )
    return response.data
  },

  create: async (data: {
    name: string
    email: string
    password?: string
    standard?: string
    board?: string
    stream?: string  // For Class 11-12
    language?: string
    plan?: string
    send_email?: boolean
  }): Promise<StudentUser> => {
    const response = await axiosInstance.post<StudentUser>(
      ADMIN_ENDPOINTS.users,
      data,
      adminConfig()
    )
    return response.data
  },

  update: async (userId: string, data: {
    name?: string
    email?: string
    standard?: string
    board?: string
    stream?: string  // For Class 11-12
    language?: string
    plan?: string
    plan_expires_at?: string
    is_drishti?: boolean
    is_suspended?: boolean  // Suspend student access
  }): Promise<void> => {
    await axiosInstance.put(
      `${ADMIN_ENDPOINTS.users}/${userId}`,
      data,
      adminConfig()
    )
  },

  bulkImport: async (data: {
    students: Array<{
      name: string
      email: string
      standard?: string
      board?: string
      stream?: string  // For Class 11-12
      language?: string
      plan?: string
    }>
    send_email?: boolean
  }): Promise<{
    success: number
    failed: number
    errors: Array<{ row: number; email: string; error: string }>
    created_students: Array<{ id: string; name: string; email: string; temp_password: string; stream?: string }>
  }> => {
    const response = await axiosInstance.post(
      `${ADMIN_ENDPOINTS.users}/bulk-import`,
      data,
      adminConfig()
    )
    return response.data
  },

  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      `${ADMIN_ENDPOINTS.users}/bulk-delete`,
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── Drishti Helper APIs ──
export const helpersApi = {
  getAll: async (): Promise<DrishtiHelper[]> => {
    const response = await axiosInstance.get<DrishtiHelper[]>(ADMIN_ENDPOINTS.helpers, adminConfig())
    return response.data
  },

  create: async (data: Omit<DrishtiHelper, 'id' | 'helper_token' | 'created_at'>): Promise<DrishtiHelper> => {
    const response = await axiosInstance.post<DrishtiHelper>(ADMIN_ENDPOINTS.helpers, data, adminConfig())
    return response.data
  },

  update: async (id: number, data: Partial<DrishtiHelper>): Promise<DrishtiHelper> => {
    const response = await axiosInstance.put<DrishtiHelper>(`${ADMIN_ENDPOINTS.helpers}/${id}`, data, adminConfig())
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.helpers}/${id}`, adminConfig())
  },

  deletePermanent: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.helpers}/${id}/permanent`, adminConfig())
  },

  getStudents: async (helperId: number): Promise<StudentUser[]> => {
    const response = await axiosInstance.get<StudentUser[]>(
      `${ADMIN_ENDPOINTS.helpers}/${helperId}/students`,
      adminConfig()
    )
    return response.data
  },

  assignStudent: async (helperId: number, studentId: string): Promise<void> => {
    await axiosInstance.post(`${ADMIN_ENDPOINTS.helpers}/${helperId}/assign/${studentId}`, {}, adminConfig())
  },

  unassignStudent: async (helperId: number, studentId: string): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.helpers}/${helperId}/assign/${studentId}`, adminConfig())
  },

  getDrishtiStudents: async (): Promise<StudentUser[]> => {
    const response = await axiosInstance.get<StudentUser[]>(ADMIN_ENDPOINTS.drishtiStudents, adminConfig())
    return response.data
  },

  bulkDelete: async (ids: number[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      `${ADMIN_ENDPOINTS.helpers}/bulk-delete`,
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── School Teachers APIs (B2B) ──
export interface SchoolTeacher {
  id: number
  school_id: number
  name: string
  email: string
  phone: string
  subjects: string[]
  standards: string[]
  is_active: boolean
  notes: string
  created_at: string
  updated_at: string
}

export interface SchoolTeacherCreate {
  name: string
  email: string
  phone?: string
  subjects?: string[]
  standards?: string[]
  notes?: string
}

export const schoolTeachersApi = {
  getAll: async (filters?: { search?: string; page?: number; page_size?: number }): Promise<PagedResponse<SchoolTeacher>> => {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    params.append('page', String(filters?.page || 1))
    params.append('page_size', String(filters?.page_size || 50))
    
    const url = `${ADMIN_ENDPOINTS.schoolTeachers}?${params}`
    const response = await axiosInstance.get<PagedResponse<SchoolTeacher>>(url, adminConfig())
    return response.data
  },

  create: async (data: SchoolTeacherCreate): Promise<SchoolTeacher> => {
    const response = await axiosInstance.post<SchoolTeacher>(ADMIN_ENDPOINTS.schoolTeachers, data, adminConfig())
    return response.data
  },

  update: async (id: number, data: Partial<SchoolTeacherCreate & { is_active?: boolean }>): Promise<SchoolTeacher> => {
    const response = await axiosInstance.put<SchoolTeacher>(`${ADMIN_ENDPOINTS.schoolTeachers}/${id}`, data, adminConfig())
    return response.data
  },

  delete: async (id: number): Promise<{ deleted: boolean }> => {
    const response = await axiosInstance.delete<{ deleted: boolean }>(`${ADMIN_ENDPOINTS.schoolTeachers}/${id}`, adminConfig())
    return response.data
  },

  bulkDelete: async (ids: number[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      `${ADMIN_ENDPOINTS.schoolTeachers}/bulk-delete`,
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── AI Configuration APIs ──

// Backend response types (what the server actually returns)
interface BackendAIConfigResponse {
  routing: Record<string, { provider: string; model: string }>
  key_status: Record<string, boolean>
  key_slots: Record<string, {
    db_slots: Record<string, boolean>
    db_hints: Record<string, string>
    env_count: number
    pool_size: number
  }>
}

export const aiConfigApi = {
  getConfig: async (): Promise<{ routing: AIRouting[]; keys: AIKeySlot[] }> => {
    const response = await axiosInstance.get<BackendAIConfigResponse>(
      ADMIN_ENDPOINTS.aiConfig,
      adminConfig()
    )
    
    // Transform backend format to frontend format
    const data = response.data
    
    // Transform routing dict to array
    const routing: AIRouting[] = Object.entries(data.routing || {}).map(([plan, config]) => ({
      plan,
      provider: config.provider,
      model: config.model,
    }))
    
    // Transform key_slots to flat array
    const keys: AIKeySlot[] = []
    for (const [provider, slots] of Object.entries(data.key_slots || {})) {
      for (const [slotStr, isActive] of Object.entries(slots.db_slots || {})) {
        const slot = parseInt(slotStr)
        const maskedKey = slots.db_hints?.[slotStr] || ''
        if (isActive || maskedKey) {
          keys.push({
            provider,
            slot,
            masked_key: maskedKey,
            is_active: isActive,
          })
        }
      }
    }
    
    return { routing, keys }
  },

  updateRouting: async (routing: AIRouting[]): Promise<void> => {
    // Send each routing update individually (backend expects single plan updates)
    for (const route of routing) {
      await axiosInstance.put(ADMIN_ENDPOINTS.aiConfig, {
        plan: route.plan,
        provider: route.provider,
        model: route.model,
      }, adminConfig())
    }
  },

  addKey: async (provider: string, slot: number, key: string): Promise<void> => {
    await axiosInstance.put(ADMIN_ENDPOINTS.aiKeys, { provider, slot, key }, adminConfig())
  },

  removeKey: async (provider: string, slot: number): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.aiKeys}/${provider}/${slot}`, adminConfig())
  },

  getModels: async (provider: string): Promise<string[]> => {
    const response = await axiosInstance.get<{ provider: string; models: string[] }>(
      `${ADMIN_ENDPOINTS.aiModels}/${provider}`,
      adminConfig()
    )
    return response.data.models
  },

  getDashboard: async (fromDate?: string, toDate?: string): Promise<any> => {
    const params = new URLSearchParams()
    if (fromDate) params.append('from_date', fromDate)
    if (toDate) params.append('to_date', toDate)
    
    const url = params.toString() ? `${ADMIN_ENDPOINTS.aiDashboard}?${params}` : ADMIN_ENDPOINTS.aiDashboard
    const response = await axiosInstance.get(url, adminConfig())
    return response.data
  },
}

// ── AI Usage APIs ──
export const aiUsageApi = {
  getSummary: async (days: number = 7): Promise<AIUsageSummary> => {
    const response = await axiosInstance.get<AIUsageSummary>(
      `${ADMIN_ENDPOINTS.usageSummary}?days=${days}`,
      adminConfig()
    )
    return response.data
  },

  getUserUsage: async (days: number = 7): Promise<AIUserUsage[]> => {
    const response = await axiosInstance.get<AIUserUsage[]>(
      `${ADMIN_ENDPOINTS.usageUsers}?days=${days}`,
      adminConfig()
    )
    return response.data
  },
}

// ── Storage APIs ──
export interface StorageStats {
  configured: boolean
  message?: string
  total_bytes?: number
  total_gb?: number
  limit_bytes?: number
  limit_gb?: number
  usage_percent?: number
  remaining_bytes?: number
  remaining_gb?: number
  file_count?: number
  by_category?: Record<string, { bytes: number; count: number }>
  top_users?: { user_id: string; bytes: number; count: number }[]
  is_limit_reached?: boolean
  is_warning?: boolean
}

export interface SyncResult {
  synced: boolean
  added: number
  removed: number
  total_files_r2: number
  total_bytes_r2: number
  total_mb_r2: number
  orphaned_keys?: string[]
  missing_keys?: string[]
  error?: string
}

export const storageApi = {
  getStats: async (): Promise<StorageStats> => {
    const response = await axiosInstance.get<StorageStats>(
      ADMIN_ENDPOINTS.storageStats,
      adminConfig()
    )
    return response.data
  },

  getHealth: async (): Promise<{ status: string; can_upload: boolean; usage_percent?: number; remaining_gb?: number; message?: string }> => {
    const response = await axiosInstance.get<{ status: string; can_upload: boolean; usage_percent?: number; remaining_gb?: number; message?: string }>(
      ADMIN_ENDPOINTS.storageHealth
    )
    return response.data
  },

  sync: async (): Promise<SyncResult> => {
    const response = await axiosInstance.post<SyncResult>(
      ADMIN_ENDPOINTS.storageSync,
      {},
      adminConfig()
    )
    return response.data
  },
}

// ── Community APIs ──
export const communityApi = {
  getStats: async (): Promise<CommunityStats> => {
    const response = await axiosInstance.get<CommunityStats>(
      ADMIN_ENDPOINTS.communityStats,
      adminConfig()
    )
    return response.data
  },

  // Squads
  getSquads: async (filters?: { search?: string; page?: number; page_size?: number }): Promise<PagedResponse<Squad>> => {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    params.append('page', String(filters?.page || 1))
    params.append('page_size', String(filters?.page_size || 50))
    
    const url = `${ADMIN_ENDPOINTS.squads}?${params}`
    const response = await axiosInstance.get<PagedResponse<Squad>>(url, adminConfig())
    return response.data
  },

  getSquad: async (id: number): Promise<Squad> => {
    const response = await axiosInstance.get<Squad>(`${ADMIN_ENDPOINTS.squads}/${id}`, adminConfig())
    return response.data
  },

  createSquad: async (data: { name: string; focus_subject?: string; standard?: string; medium?: string }): Promise<Squad> => {
    const response = await axiosInstance.post<Squad>(ADMIN_ENDPOINTS.squads, data, adminConfig())
    return response.data
  },

  updateSquad: async (id: number, data: Partial<{ name: string; focus_subject: string; standard: string; medium: string; is_active: boolean }>): Promise<Squad> => {
    const response = await axiosInstance.put<Squad>(`${ADMIN_ENDPOINTS.squads}/${id}`, data, adminConfig())
    return response.data
  },

  deleteSquad: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.squads}/${id}`, adminConfig())
  },

  bulkDeleteSquads: async (ids: number[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      `${ADMIN_ENDPOINTS.squads}/bulk-delete`,
      { ids },
      adminConfig()
    )
    return response.data
  },

  // Squad Members
  getSquadMembers: async (squadId: number): Promise<SquadMember[]> => {
    const response = await axiosInstance.get<SquadMember[]>(
      `${ADMIN_ENDPOINTS.squads}/${squadId}/members`,
      adminConfig()
    )
    return response.data
  },

  removeSquadMember: async (squadId: number, userId: string): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.squads}/${squadId}/members/${userId}`, adminConfig())
  },

  // Squad Messages
  getSquadMessages: async (squadId: number, limit?: number): Promise<SquadMessage[]> => {
    const response = await axiosInstance.get<SquadMessage[]>(
      `${ADMIN_ENDPOINTS.squads}/${squadId}/messages`,
      { ...adminConfig(), params: { limit } }
    )
    return response.data
  },

  deleteMessage: async (messageId: number): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.squadMessages}/${messageId}`, adminConfig())
  },

  // Doubts
  getDoubts: async (squadId?: number, limit?: number): Promise<SquadDoubt[]> => {
    const response = await axiosInstance.get<SquadDoubt[]>(
      ADMIN_ENDPOINTS.doubts,
      { ...adminConfig(), params: { squad_id: squadId, limit } }
    )
    return response.data
  },

  deleteDoubt: async (doubtId: number): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.doubts}/${doubtId}`, adminConfig())
  },

  bulkDeleteDoubts: async (ids: number[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      `${ADMIN_ENDPOINTS.doubts}/bulk-delete`,
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── Analytics APIs ──
export const analyticsApi = {
  getOverview: async (): Promise<AnalyticsOverview> => {
    const response = await axiosInstance.get<AnalyticsOverview>(
      ADMIN_ENDPOINTS.analyticsOverview,
      adminConfig()
    )
    return response.data
  },

  getStudents: async (): Promise<StudentAnalytics> => {
    const response = await axiosInstance.get<StudentAnalytics>(
      ADMIN_ENDPOINTS.analyticsStudents,
      adminConfig()
    )
    return response.data
  },

  getRevenue: async (): Promise<RevenueAnalytics> => {
    const response = await axiosInstance.get<RevenueAnalytics>(
      ADMIN_ENDPOINTS.analyticsRevenue,
      adminConfig()
    )
    return response.data
  },
}

// ── Export all APIs ──
// ── Questions APIs ──
export interface QuestionListParams {
  chapter_id?: number
  subject_id?: string
  type?: string
  difficulty?: string
  search?: string
  is_active?: boolean
  limit?: number
  offset?: number
}

export const questionsApi = {
  getAll: async (params: QuestionListParams = {}): Promise<PagedResponse<Question>> => {
    const response = await axiosInstance.get<PagedResponse<Question>>(
      '/api/admin/questions',
      { ...adminConfig(), params }
    )
    return response.data
  },

  getById: async (id: string): Promise<Question> => {
    const response = await axiosInstance.get<Question>(`/api/admin/questions/${id}`, adminConfig())
    return response.data
  },

  create: async (data: QuestionCreate): Promise<Question> => {
    const response = await axiosInstance.post<Question>('/api/admin/questions', data, adminConfig())
    return response.data
  },

  update: async (id: string, data: QuestionUpdate): Promise<Question> => {
    const response = await axiosInstance.put<Question>(`/api/admin/questions/${id}`, data, adminConfig())
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/admin/questions/${id}`, adminConfig())
  },

  bulkImport: async (questions: QuestionCreate[]): Promise<{ created: number }> => {
    const response = await axiosInstance.post<{ created: number }>(
      '/api/admin/questions/bulk',
      { questions },
      adminConfig()
    )
    return response.data
  },

  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      '/api/admin/questions/bulk-delete',
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── Media APIs ──
export interface MediaListParams {
  type?: string
  chapter_id?: number
  subject_id?: string
  search?: string
  limit?: number
  offset?: number
}

export const mediaApi = {
  getAll: async (params: MediaListParams = {}): Promise<PagedResponse<MediaFile>> => {
    const response = await axiosInstance.get<PagedResponse<MediaFile>>(
      '/api/admin/media',
      { ...adminConfig(), params }
    )
    return response.data
  },

  getById: async (id: string): Promise<MediaFile> => {
    const response = await axiosInstance.get<MediaFile>(`/api/admin/media/${id}`, adminConfig())
    return response.data
  },

  create: async (data: MediaCreate): Promise<MediaFile> => {
    const response = await axiosInstance.post<MediaFile>('/api/admin/media', data, adminConfig())
    return response.data
  },

  update: async (id: string, data: Partial<MediaCreate>): Promise<MediaFile> => {
    const response = await axiosInstance.put<MediaFile>(`/api/admin/media/${id}`, data, adminConfig())
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/admin/media/${id}`, adminConfig())
  },

  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      '/api/admin/media/bulk-delete',
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── Assessments APIs ──
export interface AssessmentListParams {
  board_id?: string
  standard_id?: string
  subject_id?: string
  chapter_id?: number
  type?: string
  status?: string
  search?: string
  limit?: number
  offset?: number
}

export const assessmentsApi = {
  getAll: async (params: AssessmentListParams = {}): Promise<PagedResponse<Assessment>> => {
    const response = await axiosInstance.get<PagedResponse<Assessment>>(
      '/api/admin/assessments',
      { ...adminConfig(), params }
    )
    return response.data
  },

  getById: async (id: number): Promise<Assessment> => {
    const response = await axiosInstance.get<Assessment>(`/api/admin/assessments/${id}`, adminConfig())
    return response.data
  },

  create: async (data: AssessmentCreate): Promise<Assessment> => {
    const response = await axiosInstance.post<Assessment>('/api/admin/assessments', data, adminConfig())
    return response.data
  },

  update: async (id: number, data: AssessmentUpdate): Promise<Assessment> => {
    const response = await axiosInstance.put<Assessment>(`/api/admin/assessments/${id}`, data, adminConfig())
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/api/admin/assessments/${id}`, adminConfig())
  },

  publish: async (id: number): Promise<Assessment> => {
    const response = await axiosInstance.post<Assessment>(`/api/admin/assessments/${id}/publish`, {}, adminConfig())
    return response.data
  },

  archive: async (id: number): Promise<Assessment> => {
    const response = await axiosInstance.post<Assessment>(`/api/admin/assessments/${id}/archive`, {}, adminConfig())
    return response.data
  },

  bulkDelete: async (ids: number[]): Promise<{ deleted: number }> => {
    const response = await axiosInstance.post<{ deleted: number }>(
      '/api/admin/assessments/bulk-delete',
      { ids },
      adminConfig()
    )
    return response.data
  },
}

// ── Combined Admin API ──
export const adminApi = {
  auth: adminAuthApi,
  boards: boardsApi,
  standards: standardsApi,
  mediums: mediumsApi,
  streams: streamsApi,
  subjects: subjectsApi,
  curriculum: curriculumApi,
  chapters: chaptersApi,
  users: usersApi,
  helpers: helpersApi,
  aiConfig: aiConfigApi,
  aiUsage: aiUsageApi,
  storage: storageApi,
  community: communityApi,
  analytics: analyticsApi,
  questions: questionsApi,
  media: mediaApi,
  assessments: assessmentsApi,
}

export default adminApi
