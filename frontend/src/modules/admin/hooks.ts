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
  fetchCurriculum,
  fetchChapters,
  fetchStudents,
  fetchHelpers,
  fetchAIConfig,
  fetchAIUsage,
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
  const { user, token, isAuthenticated, isLoading, isInitialized, error } = useSelector(
    (state: RootState) => state.admin
  )

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
  const { activeSection, sidebarCollapsed, searchQuery } = useSelector(
    (state: RootState) => state.admin
  )

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
    (filters?: { board?: string; standard?: string; subject?: string }) =>
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

  const remove = useCallback((ids: string[]) => dispatch(removeStudents(ids)), [dispatch])

  return {
    students,
    fetchStudents: fetch,
    updateStudentLocal: updateLocal,
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
  const { aiRouting, aiKeySlots, aiUsage } = useSelector((state: RootState) => state.admin)

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
  const { dashboardStats, platformHealth } = useSelector((state: RootState) => state.admin)

  return {
    stats: dashboardStats,
    health: platformHealth,
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
