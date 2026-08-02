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

  bulkImport: async (boards: Board[]): Promise<{ imported: number }> => {
    const response = await axiosInstance.post<{ imported: number }>(
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

  bulkImport: async (standards: Standard[]): Promise<{ imported: number }> => {
    const response = await axiosInstance.post<{ imported: number }>(
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

  bulkImport: async (mediums: Medium[]): Promise<{ imported: number }> => {
    const response = await axiosInstance.post<{ imported: number }>(
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

  bulkImport: async (entries: Omit<CurriculumEntry, 'id'>[]): Promise<{ imported: number }> => {
    const response = await axiosInstance.post<{ imported: number }>(
      `${ADMIN_ENDPOINTS.curriculum}/import`,
      entries,
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
}

// ── Chapter APIs ──
export const chaptersApi = {
  getAll: async (filters?: { board?: string; standard?: string; subject?: string }): Promise<Chapter[]> => {
    const params = new URLSearchParams()
    if (filters?.board) params.append('board', filters.board)
    if (filters?.standard) params.append('standard', filters.standard)
    if (filters?.subject) params.append('subject', filters.subject)
    
    const url = params.toString() ? `${ADMIN_ENDPOINTS.chapters}?${params}` : ADMIN_ENDPOINTS.chapters
    const response = await axiosInstance.get<Chapter[]>(url, adminConfig())
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
      chapters,
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
  getAll: async (filters?: { search?: string; plan?: string; drishti?: boolean }): Promise<StudentUser[]> => {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.plan) params.append('plan', filters.plan)
    if (filters?.drishti !== undefined) params.append('drishti', String(filters.drishti))
    
    const url = params.toString() ? `${ADMIN_ENDPOINTS.users}?${params}` : ADMIN_ENDPOINTS.users
    const response = await axiosInstance.get<StudentUser[]>(url, adminConfig())
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
      `${ADMIN_ENDPOINTS.users}/${userId}/drishti`,
      { is_drishti: isDrishti },
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

  createDrishtiStudent: async (data: { email: string; password: string; name: string }): Promise<StudentUser> => {
    const response = await axiosInstance.post<StudentUser>(
      `${ADMIN_ENDPOINTS.users}/drishti`,
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

// ── AI Configuration APIs ──
export const aiConfigApi = {
  getConfig: async (): Promise<{ routing: AIRouting[]; keys: AIKeySlot[] }> => {
    const response = await axiosInstance.get<{ routing: AIRouting[]; keys: AIKeySlot[] }>(
      ADMIN_ENDPOINTS.aiConfig,
      adminConfig()
    )
    return response.data
  },

  updateRouting: async (routing: AIRouting[]): Promise<void> => {
    await axiosInstance.put(`${ADMIN_ENDPOINTS.aiConfig}/routing`, { routing }, adminConfig())
  },

  addKey: async (provider: string, slot: number, key: string): Promise<void> => {
    await axiosInstance.put(ADMIN_ENDPOINTS.aiKeys, { provider, slot, key }, adminConfig())
  },

  removeKey: async (provider: string, slot: number): Promise<void> => {
    await axiosInstance.delete(`${ADMIN_ENDPOINTS.aiKeys}/${provider}/${slot}`, adminConfig())
  },

  getModels: async (provider: string): Promise<string[]> => {
    const response = await axiosInstance.get<string[]>(`${ADMIN_ENDPOINTS.aiModels}/${provider}`, adminConfig())
    return response.data
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

  getUserUsage: async (date?: string): Promise<AIUserUsage[]> => {
    const url = date ? `${ADMIN_ENDPOINTS.usageUsers}?date=${date}` : ADMIN_ENDPOINTS.usageUsers
    const response = await axiosInstance.get<AIUserUsage[]>(url, adminConfig())
    return response.data
  },
}

// ── Storage APIs ──
export const storageApi = {
  getStats: async (): Promise<{ used_gb: number; limit_gb: number; files_count: number }> => {
    const response = await axiosInstance.get<{ used_gb: number; limit_gb: number; files_count: number }>(
      ADMIN_ENDPOINTS.storageStats,
      adminConfig()
    )
    return response.data
  },

  getHealth: async (): Promise<{ status: string; latency_ms: number }> => {
    const response = await axiosInstance.get<{ status: string; latency_ms: number }>(
      ADMIN_ENDPOINTS.storageHealth
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
  getSquads: async (): Promise<Squad[]> => {
    const response = await axiosInstance.get<Squad[]>(ADMIN_ENDPOINTS.squads, adminConfig())
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
export const adminApi = {
  auth: adminAuthApi,
  boards: boardsApi,
  standards: standardsApi,
  mediums: mediumsApi,
  curriculum: curriculumApi,
  chapters: chaptersApi,
  users: usersApi,
  helpers: helpersApi,
  aiConfig: aiConfigApi,
  aiUsage: aiUsageApi,
  storage: storageApi,
  community: communityApi,
  analytics: analyticsApi,
}

export default adminApi
