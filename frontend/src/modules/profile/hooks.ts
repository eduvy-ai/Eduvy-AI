// ─── Profile Hooks ────────────────────────────────────────────
// Custom React hooks for profile management

import { useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import {
  updateProfile,

  fetchMastery,
  setMastery,
  fetchQuizStats,
  saveQuizResult,
} from './slice'
import type { ProfileUpdateRequest, QuizResult } from './types'

/**
 * Hook for profile updates
 */
export const useProfile = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error } = useSelector((state: RootState) => state.profile)

  const update = useCallback(
    async (userId: string, data: ProfileUpdateRequest) => {
      return dispatch(updateProfile({ userId, data }))
    },
    [dispatch]
  )

  return { update, isLoading, error }
}

/**
 * Hook for mastery scores
 */
export const useMastery = () => {
  const dispatch = useDispatch<AppDispatch>()
  const mastery = useSelector((state: RootState) => state.profile.mastery)

  const fetch = useCallback(
    async (userId: string) => {
      return dispatch(fetchMastery(userId))
    },
    [dispatch]
  )

  const set = useCallback(
    async (userId: string, subject: string, score: number) => {
      return dispatch(setMastery({ userId, subject, score }))
    },
    [dispatch]
  )

  return { mastery, fetch, set }
}

/**
 * Hook for quiz stats
 */
export const useQuizStats = () => {
  const dispatch = useDispatch<AppDispatch>()
  const quizStats = useSelector((state: RootState) => state.profile.quizStats)

  const fetch = useCallback(
    async (userId: string) => {
      return dispatch(fetchQuizStats(userId))
    },
    [dispatch]
  )

  const save = useCallback(
    async (userId: string, result: QuizResult) => {
      return dispatch(saveQuizResult({ userId, result }))
    },
    [dispatch]
  )

  return { quizStats, fetch, save }
}
