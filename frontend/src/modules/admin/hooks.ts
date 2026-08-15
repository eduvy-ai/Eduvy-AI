// ─── Admin Hooks ───────────────────────────────────────────────
// Custom React hooks for admin platform

import { useCallback, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import {
  adminLogin,
  adminSetup,
  initializeAdmin,
  logout,
  clearError,
  setActiveSection,
  toggleSidebar,
  setSidebarCollapsed,
  setSearchQuery,
  fetchBoards,
  fetchStandards,
  fetchMediums,
  fetchSubjects,
  fetchCurriculum,
  fetchChapters,
  fetchStudents,
  fetchHelpers,
  fetchAIConfig,
  fetchAIUsage,
  fetchQuestions,
  fetchMedia,
  fetchAssessments,
  addBoard,
  updateBoard,
  removeBoard,
  addStandard,
  updateStandard,
  removeStandard,
  addMedium,
  updateMedium,
  removeMedium,
  addCurriculumEntry,
  updateCurriculumEntry,
  removeCurriculumEntry,
  addChapter,
  updateChapter,
  removeChapter,
  updateStudentLocal,
  addStudentLocal,
  removeStudents,
  addHelper,
  updateHelper,
  removeHelper,
} from './slice'
import { canAccess, canEdit } from './service'
import type {
  AdminLoginRequest,
  AdminSetupRequest,
  AdminSection,
  Board,
  Standard,
  Medium,
  CurriculumEntry,
  Chapter,
  StudentUser,
  DrishtiHelper,
} from './types'

// ══════════════════════════════════════════════════════════════
// Selector Hooks
// ══════════════════════════════════════════════════════════════

/**
 * Get admin auth state
 */
export const useAdminAuth = () => {
  const dispatch = useDispatch<AppDispatch>()
  const user = useSelector((state: RootState) => state.admin.user)
  const token = useSelector((state: RootState) => state.admin.token)
  const isAuthenticated = useSelector((state: RootState) => state.admin.isAuthenticated)
  const isLoading = useSelector((state: RootState) => state.admin.isLoading)
  const isInitialized = useSelector((state: RootState) => state.admin.isInitialized)
  const error = useSelector((state: RootState) => state.admin.error)

  const handleLogin = useCallback(
    (credentials: AdminLoginRequest) => dispatch(adminLogin(credentials)),
    [dispatch]
  )

  const handleSetup = useCallback(
    (data: AdminSetupRequest) => dispatch(adminSetup(data)),
    [dispatch]
  )

  const handleInitialize = useCallback(() => dispatch(initializeAdmin()), [dispatch])

  const handleLogout = useCallback(() => dispatch(logout()), [dispatch])

  const handleClearError = useCallback(() => dispatch(clearError()), [dispatch])

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    login: handleLogin,
    setup: handleSetup,
    initialize: handleInitialize,
    logout: handleLogout,
    clearError: handleClearError,
  }
}

/**
 * Get current admin user
 */
export const useAdminUser = () => {
  return useSelector((state: RootState) => state.admin.user)
}

/**
 * Check permissions for a section
 */
export const usePermission = (section: AdminSection) => {
  const user = useAdminUser()

  return useMemo(
    () => ({
      canView: canAccess(user, section),
      canEdit: canEdit(user, section),
    }),
    [user, section]
  )
}

/**
 * Check if user has any permission for a section
 */
export const useCanAccess = (section: AdminSection): boolean => {
  const user = useAdminUser()
  return useMemo(() => canAccess(user, section), [user, section])
}

/**
 * Check if user has edit permission for a section
 */
export const useCanEdit = (section: AdminSection): boolean => {
  const user = useAdminUser()
  return useMemo(() => canEdit(user, section), [user, section])
}

// ══════════════════════════════════════════════════════════════
// UI State Hooks
// ══════════════════════════════════════════════════════════════

/**
 * Admin UI state hook
 */
export const useAdminUI = () => {
  const dispatch = useDispatch<AppDispatch>()
  const activeSection = useSelector((state: RootState) => state.admin.activeSection)
  const sidebarCollapsed = useSelector((state: RootState) => state.admin.sidebarCollapsed)
  const searchQuery = useSelector((state: RootState) => state.admin.searchQuery)

  const handleSetSection = useCallback(
    (section: AdminSection) => dispatch(setActiveSection(section)),
    [dispatch]
  )

  const handleToggleSidebar = useCallback(() => dispatch(toggleSidebar()), [dispatch])

  const handleSetSidebarCollapsed = useCallback(
    (collapsed: boolean) => dispatch(setSidebarCollapsed(collapsed)),
    [dispatch]
  )

  const handleSetSearch = useCallback(
    (query: string) => dispatch(setSearchQuery(query)),
    [dispatch]
  )

  return {
    activeSection,
    sidebarCollapsed,
    searchQuery,
    setActiveSection: handleSetSection,
    toggleSidebar: handleToggleSidebar,
    setSidebarCollapsed: handleSetSidebarCollapsed,
    setSearchQuery: handleSetSearch,
  }
}

// ══════════════════════════════════════════════════════════════
// Data Hooks
// ══════════════════════════════════════════════════════════════

/**
 * Boards data hook
 */
export const useBoards = () => {
  const dispatch = useDispatch<AppDispatch>()
  const boards = useSelector((state: RootState) => state.admin.boards)

  const fetch = useCallback(() => dispatch(fetchBoards()), [dispatch])

  const add = useCallback((board: Board) => dispatch(addBoard(board)), [dispatch])

  const update = useCallback((board: Board) => dispatch(updateBoard(board)), [dispatch])

  const remove = useCallback((id: string) => dispatch(removeBoard(id)), [dispatch])

  return {
    boards,
    fetchBoards: fetch,
    addBoard: add,
    updateBoard: update,
    removeBoard: remove,
  }
}

/**
 * Standards data hook
 */
export const useStandards = () => {
  const dispatch = useDispatch<AppDispatch>()
  const standards = useSelector((state: RootState) => state.admin.standards)

  const fetch = useCallback(() => dispatch(fetchStandards()), [dispatch])

  const add = useCallback((standard: Standard) => dispatch(addStandard(standard)), [dispatch])

  const update = useCallback((standard: Standard) => dispatch(updateStandard(standard)), [dispatch])

  const remove = useCallback((id: string) => dispatch(removeStandard(id)), [dispatch])

  return {
    standards,
    fetchStandards: fetch,
    addStandard: add,
    updateStandard: update,
    removeStandard: remove,
  }
}

/**
 * Mediums data hook
 */
export const useMediums = () => {
  const dispatch = useDispatch<AppDispatch>()
  const mediums = useSelector((state: RootState) => state.admin.mediums)

  const fetch = useCallback(() => dispatch(fetchMediums()), [dispatch])

  const add = useCallback((medium: Medium) => dispatch(addMedium(medium)), [dispatch])

  const update = useCallback((medium: Medium) => dispatch(updateMedium(medium)), [dispatch])

  const remove = useCallback((id: string) => dispatch(removeMedium(id)), [dispatch])

  return {
    mediums,
    fetchMediums: fetch,
    addMedium: add,
    updateMedium: update,
    removeMedium: remove,
  }
}

/**
 * Subjects data hook
 */
export const useSubjects = () => {
  const dispatch = useDispatch<AppDispatch>()
  const subjects = useSelector((state: RootState) => state.admin.subjects)

  const fetch = useCallback(
    (filters?: { board_id?: string; standard_id?: string; stream_id?: string }) =>
      dispatch(fetchSubjects(filters)),
    [dispatch]
  )

  return {
    subjects,
    fetchSubjects: fetch,
  }
}

/**
 * Curriculum data hook
 */
export const useCurriculum = () => {
  const dispatch = useDispatch<AppDispatch>()
  const curriculum = useSelector((state: RootState) => state.admin.curriculum)

  const fetch = useCallback(
    (filters?: { board_id?: string; standard_id?: string; medium_id?: string }) =>
      dispatch(fetchCurriculum(filters)),
    [dispatch]
  )

  const add = useCallback((entry: CurriculumEntry) => dispatch(addCurriculumEntry(entry)), [dispatch])

  const update = useCallback((entry: CurriculumEntry) => dispatch(updateCurriculumEntry(entry)), [dispatch])

  const remove = useCallback((id: number) => dispatch(removeCurriculumEntry(id)), [dispatch])

  return {
    curriculum,
    fetchCurriculum: fetch,
    addCurriculumEntry: add,
    updateCurriculumEntry: update,
    removeCurriculumEntry: remove,
  }
}

/**
 * Chapters data hook
 */
export const useChapters = () => {
  const dispatch = useDispatch<AppDispatch>()
  const chapters = useSelector((state: RootState) => state.admin.chapters)

  const fetch = useCallback(
    (filters?: { board_id?: string; standard_id?: string; subject_id?: string; stream_id?: string }) =>
      dispatch(fetchChapters(filters)),
    [dispatch]
  )

  const add = useCallback((chapter: Chapter) => dispatch(addChapter(chapter)), [dispatch])

  const update = useCallback((chapter: Chapter) => dispatch(updateChapter(chapter)), [dispatch])

  const remove = useCallback((id: number) => dispatch(removeChapter(id)), [dispatch])

  return {
    chapters,
    fetchChapters: fetch,
    addChapter: add,
    updateChapter: update,
    removeChapter: remove,
  }
}

/**
 * Students data hook
 */
export const useStudents = () => {
  const dispatch = useDispatch<AppDispatch>()
  const students = useSelector((state: RootState) => state.admin.students)

  const fetch = useCallback(
    (filters?: { search?: string; plan?: string; drishti?: boolean }) =>
      dispatch(fetchStudents(filters)),
    [dispatch]
  )

  const updateLocal = useCallback(
    (student: StudentUser) => dispatch(updateStudentLocal(student)),
    [dispatch]
  )

  const addLocal = useCallback(
    (student: StudentUser) => dispatch(addStudentLocal(student)),
    [dispatch]
  )

  const remove = useCallback((ids: string[]) => dispatch(removeStudents(ids)), [dispatch])

  return {
    students,
    fetchStudents: fetch,
    updateStudentLocal: updateLocal,
    addStudentLocal: addLocal,
    removeStudents: remove,
  }
}

/**
 * Drishti helpers data hook
 */
export const useHelpers = () => {
  const dispatch = useDispatch<AppDispatch>()
  const helpers = useSelector((state: RootState) => state.admin.helpers)

  const fetch = useCallback(() => dispatch(fetchHelpers()), [dispatch])

  const add = useCallback((helper: DrishtiHelper) => dispatch(addHelper(helper)), [dispatch])

  const update = useCallback((helper: DrishtiHelper) => dispatch(updateHelper(helper)), [dispatch])

  const remove = useCallback((id: number) => dispatch(removeHelper(id)), [dispatch])

  return {
    helpers,
    fetchHelpers: fetch,
    addHelper: add,
    updateHelper: update,
    removeHelper: remove,
  }
}

/**
 * AI configuration hook
 */
export const useAIConfig = () => {
  const dispatch = useDispatch<AppDispatch>()
  const aiRouting = useSelector((state: RootState) => state.admin.aiRouting)
  const aiKeySlots = useSelector((state: RootState) => state.admin.aiKeySlots)
  const aiUsage = useSelector((state: RootState) => state.admin.aiUsage)

  const fetchConfig = useCallback(() => dispatch(fetchAIConfig()), [dispatch])

  const fetchUsage = useCallback((days?: number) => dispatch(fetchAIUsage(days || 7)), [dispatch])

  return {
    aiRouting,
    aiKeySlots,
    aiUsage,
    fetchAIConfig: fetchConfig,
    fetchAIUsage: fetchUsage,
  }
}

/**
 * Dashboard stats hook (placeholder - to be expanded)
 */
export const useDashboardStats = () => {
  const dashboardStats = useSelector((state: RootState) => state.admin.dashboardStats)
  const platformHealth = useSelector((state: RootState) => state.admin.platformHealth)

  return {
    stats: dashboardStats,
    health: platformHealth,
  }
}

// ══════════════════════════════════════════════════════════════
// Content Studio Hooks
// ══════════════════════════════════════════════════════════════

/**
 * Questions data hook
 */
export const useQuestions = () => {
  const dispatch = useDispatch<AppDispatch>()
  const questions = useSelector((state: RootState) => state.admin.questions)
  const questionsTotal = useSelector((state: RootState) => state.admin.questionsTotal)
  const isLoading = useSelector((state: RootState) => state.admin.isLoading)

  const fetch = useCallback(
    (params?: {
      chapter_id?: number
      subject_id?: string
      type?: string
      difficulty?: string
      search?: string
      is_active?: boolean
      limit?: number
      offset?: number
    }) => dispatch(fetchQuestions(params || {})),
    [dispatch]
  )

  return {
    questions,
    total: questionsTotal,
    isLoading,
    fetchQuestions: fetch,
  }
}

/**
 * Media data hook
 */
export const useMedia = () => {
  const dispatch = useDispatch<AppDispatch>()
  const media = useSelector((state: RootState) => state.admin.media)
  const mediaTotal = useSelector((state: RootState) => state.admin.mediaTotal)
  const isLoading = useSelector((state: RootState) => state.admin.isLoading)

  const fetch = useCallback(
    (params?: {
      type?: string
      chapter_id?: number
      subject_id?: string
      search?: string
      limit?: number
      offset?: number
    }) => dispatch(fetchMedia(params || {})),
    [dispatch]
  )

  return {
    media,
    total: mediaTotal,
    isLoading,
    fetchMedia: fetch,
  }
}

/**
 * Assessments data hook
 */
export const useAssessments = () => {
  const dispatch = useDispatch<AppDispatch>()
  const assessments = useSelector((state: RootState) => state.admin.assessments)
  const assessmentsTotal = useSelector((state: RootState) => state.admin.assessmentsTotal)
  const isLoading = useSelector((state: RootState) => state.admin.isLoading)

  const fetch = useCallback(
    (params?: {
      board_id?: string
      standard_id?: string
      subject_id?: string
      chapter_id?: number
      type?: string
      status?: string
      search?: string
      limit?: number
      offset?: number
    }) => dispatch(fetchAssessments(params || {})),
    [dispatch]
  )

  return {
    assessments,
    total: assessmentsTotal,
    isLoading,
    fetchAssessments: fetch,
  }
}

// ══════════════════════════════════════════════════════════════
// Combined Hook
// ══════════════════════════════════════════════════════════════

/**
 * Main admin hook - combines common functionality
 */
export const useAdmin = () => {
  const auth = useAdminAuth()
  const ui = useAdminUI()

  return {
    ...auth,
    ...ui,
  }
}

export default useAdmin
