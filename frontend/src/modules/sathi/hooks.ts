// ─── Sathi Hooks ──────────────────────────────────────────────
// Custom React hooks for Study Squads

import { useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import {
  fetchMySquad,
  matchSquad,
  leaveSquad,
  fetchMembers,
  fetchMessages,
  sendMessage,
  fetchChallenge,
  createChallenge,
  fetchDoubts,
  fetchDoubtQuota,
  postDoubt,
  fetchDailyConcept,
  submitDailyExplain,
  addMessageLocal,
  clearSquad,
} from './slice'
import type { SendMessageRequest, PostDoubtRequest, DailyExplainRequest, SquadMessage } from './types'

/**
 * Hook for squad management
 */
export const useSquad = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { squad, members, isLoading, error } = useSelector((state: RootState) => state.sathi)

  const fetch = useCallback(() => dispatch(fetchMySquad()), [dispatch])
  const match = useCallback(() => dispatch(matchSquad()), [dispatch])
  const leave = useCallback((squadId: string) => dispatch(leaveSquad(squadId)), [dispatch])
  const getMembers = useCallback((squadId: string) => dispatch(fetchMembers(squadId)), [dispatch])
  const clear = useCallback(() => dispatch(clearSquad()), [dispatch])

  return { squad, members, isLoading, error, fetch, match, leave, getMembers, clear }
}

/**
 * Hook for squad chat
 */
export const useSquadChat = () => {
  const dispatch = useDispatch<AppDispatch>()
  const messages = useSelector((state: RootState) => state.sathi.messages)

  const fetch = useCallback(
    (squadId: string, sinceId?: number) => dispatch(fetchMessages({ squadId, sinceId })),
    [dispatch]
  )

  const send = useCallback(
    (squadId: string, data: SendMessageRequest) => dispatch(sendMessage({ squadId, data })),
    [dispatch]
  )

  const addLocal = useCallback(
    (message: SquadMessage) => dispatch(addMessageLocal(message)),
    [dispatch]
  )

  return { messages, fetch, send, addLocal }
}

/**
 * Hook for squad challenges
 */
export const useSquadChallenge = () => {
  const dispatch = useDispatch<AppDispatch>()
  const challenge = useSelector((state: RootState) => state.sathi.challenge)

  const fetch = useCallback((squadId: string) => dispatch(fetchChallenge(squadId)), [dispatch])
  const create = useCallback((squadId: string) => dispatch(createChallenge(squadId)), [dispatch])

  return { challenge, fetch, create }
}

/**
 * Hook for doubts board
 */
export const useDoubts = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { doubts, doubtQuota } = useSelector((state: RootState) => state.sathi)

  const fetch = useCallback((squadId: string) => dispatch(fetchDoubts(squadId)), [dispatch])
  const fetchQuota = useCallback((squadId: string) => dispatch(fetchDoubtQuota(squadId)), [dispatch])
  const post = useCallback(
    (squadId: string, data: PostDoubtRequest) => dispatch(postDoubt({ squadId, data })),
    [dispatch]
  )

  return { doubts, doubtQuota, fetch, fetchQuota, post }
}

/**
 * Hook for daily concept
 */
export const useDailyConcept = () => {
  const dispatch = useDispatch<AppDispatch>()
  const dailyConcept = useSelector((state: RootState) => state.sathi.dailyConcept)

  const fetch = useCallback((squadId: string) => dispatch(fetchDailyConcept(squadId)), [dispatch])
  const submit = useCallback(
    (squadId: string, data: DailyExplainRequest) => dispatch(submitDailyExplain({ squadId, data })),
    [dispatch]
  )

  return { dailyConcept, fetch, submit }
}
