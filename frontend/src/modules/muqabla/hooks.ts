// ─── Muqabla Hooks ────────────────────────────────────────────
// Custom React hooks for Battle Arena

import { useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import {
  createChallenge,
  fetchBattle,
  joinBattle,
  declineBattle,
  submitAnswers,
  fetchOpenBattles,
  fetchPendingBattles,
  fetchActiveBattles,
  fetchHistory,
  fetchLeaderboard,
  fetchSchoolLeaderboard,
  setCurrentBattle,
  clearCurrentBattle,
} from './slice'
import type { BattleCreateRequest, BattleAnswersRequest, Battle } from './types'

/**
 * Hook for battle management
 */
export const useBattle = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { currentBattle, isLoading, error } = useSelector((state: RootState) => state.muqabla)

  const create = useCallback(
    (data: BattleCreateRequest) => dispatch(createChallenge(data)),
    [dispatch]
  )

  const fetch = useCallback((battleId: string) => dispatch(fetchBattle(battleId)), [dispatch])

  const join = useCallback((battleId: string) => dispatch(joinBattle(battleId)), [dispatch])

  const decline = useCallback((battleId: string) => dispatch(declineBattle(battleId)), [dispatch])

  const submit = useCallback(
    (battleId: string, data: BattleAnswersRequest) => dispatch(submitAnswers({ battleId, data })),
    [dispatch]
  )

  const setCurrent = useCallback((battle: Battle | null) => dispatch(setCurrentBattle(battle)), [dispatch])
  const clearCurrent = useCallback(() => dispatch(clearCurrentBattle()), [dispatch])

  return {
    currentBattle,
    isLoading,
    error,
    create,
    fetch,
    join,
    decline,
    submit,
    setCurrent,
    clearCurrent,
  }
}

/**
 * Hook for battle lists
 */
export const useBattleLists = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { openBattles, pendingBattles, activeBattles, history } = useSelector(
    (state: RootState) => state.muqabla
  )

  const fetchOpen = useCallback(() => dispatch(fetchOpenBattles()), [dispatch])
  const fetchPending = useCallback(() => dispatch(fetchPendingBattles()), [dispatch])
  const fetchActive = useCallback(() => dispatch(fetchActiveBattles()), [dispatch])
  const fetchHist = useCallback(() => dispatch(fetchHistory()), [dispatch])

  const fetchAll = useCallback(() => {
    fetchOpen()
    fetchPending()
    fetchActive()
  }, [fetchOpen, fetchPending, fetchActive])

  return {
    openBattles,
    pendingBattles,
    activeBattles,
    history,
    fetchOpen,
    fetchPending,
    fetchActive,
    fetchHistory: fetchHist,
    fetchAll,
  }
}

/**
 * Hook for leaderboards
 */
export const useLeaderboard = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { leaderboard, schoolLeaderboard } = useSelector((state: RootState) => state.muqabla)

  const fetch = useCallback(() => dispatch(fetchLeaderboard()), [dispatch])
  const fetchSchool = useCallback(() => dispatch(fetchSchoolLeaderboard()), [dispatch])

  return { leaderboard, schoolLeaderboard, fetch, fetchSchool }
}
