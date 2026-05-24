// ─── Auth Hooks ───────────────────────────────────────────────
// Custom React hooks for authentication

import { useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import { login, register, logout, initializeAuth, refreshUser, clearError, addXpLocal, updateStreakLocal } from './slice'
import type { LoginRequest, RegisterRequest, UserProfile } from './types'

/**
 * Main auth hook - provides auth state and actions
 */
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>()
  const auth = useSelector((state: RootState) => state.auth)

  const handleLogin = useCallback(
    async (credentials: LoginRequest) => {
      const result = await dispatch(login(credentials))
      return result
    },
    [dispatch]
  )

  const handleRegister = useCallback(
    async (data: RegisterRequest) => {
      const result = await dispatch(register(data))
      return result
    },
    [dispatch]
  )

  const handleLogout = useCallback(() => {
    dispatch(logout())
  }, [dispatch])

  const handleInitialize = useCallback(async () => {
    const result = await dispatch(initializeAuth())
    return result
  }, [dispatch])

  const handleRefresh = useCallback(async () => {
    const result = await dispatch(refreshUser())
    return result
  }, [dispatch])

  const handleClearError = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  return {
    // State
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    isInitialized: auth.isInitialized,
    error: auth.error,
    
    // Actions
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    initialize: handleInitialize,
    refresh: handleRefresh,
    clearError: handleClearError,
  }
}

/**
 * Hook for user profile data
 */
export const useUser = (): UserProfile | null => {
  return useSelector((state: RootState) => state.auth.user)
}

/**
 * Hook for XP management
 */
export const useXp = () => {
  const dispatch = useDispatch<AppDispatch>()
  const user = useSelector((state: RootState) => state.auth.user)
  
  const xp = user?.xp ?? 0

  const addXp = useCallback(
    (points: number) => {
      dispatch(addXpLocal(points))
      // TODO: Also call API to persist XP
    },
    [dispatch]
  )

  return { xp, addXp }
}

/**
 * Hook for streak management
 */
export const useStreak = () => {
  const dispatch = useDispatch<AppDispatch>()
  const user = useSelector((state: RootState) => state.auth.user)
  
  const streak = user?.streak ?? 0

  const updateStreak = useCallback(
    (newStreak: number) => {
      dispatch(updateStreakLocal(newStreak))
      // TODO: Also call API to persist streak
    },
    [dispatch]
  )

  return { streak, updateStreak }
}

/**
 * Hook for checking plan access
 */
export const usePlan = () => {
  const user = useSelector((state: RootState) => state.auth.user)
  
  return {
    plan: user?.plan ?? 'free',
    planExpiresAt: user?.plan_expires_at,
  }
}
