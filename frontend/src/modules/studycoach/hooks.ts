// ─── Study Coach Hooks ───────────────────────────────────────

import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import { askStudyCoach, setMode, clearResponse, clearError, clearHistory } from './slice'
import type { StudyCoachMode, StudyCoachRequest } from './types'

/**
 * Hook for using Study Coach functionality.
 * 
 * @example
 * const { response, isLoading, ask, mode, setMode } = useStudyCoach()
 * 
 * // Ask a question
 * await ask({ question: 'Explain photosynthesis' })
 * 
 * // Change mode
 * setMode('study_coach_exam')
 */
export function useStudyCoach() {
  const dispatch = useDispatch<AppDispatch>()
  const state = useSelector((state: RootState) => state.studyCoach)

  const ask = useCallback(
    async (request: Omit<StudyCoachRequest, 'mode'>) => {
      const fullRequest: StudyCoachRequest = {
        ...request,
        mode: state.currentMode,
      }
      return dispatch(askStudyCoach(fullRequest))
    },
    [dispatch, state.currentMode]
  )

  const changeMode = useCallback(
    (mode: StudyCoachMode) => {
      dispatch(setMode(mode))
    },
    [dispatch]
  )

  const clear = useCallback(() => {
    dispatch(clearResponse())
  }, [dispatch])

  const dismissError = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  const resetHistory = useCallback(() => {
    dispatch(clearHistory())
  }, [dispatch])

  return {
    // State
    response: state.response,
    isLoading: state.isLoading,
    error: state.error,
    mode: state.currentMode,
    history: state.history,
    // Actions
    ask,
    setMode: changeMode,
    clear,
    dismissError,
    resetHistory,
  }
}
