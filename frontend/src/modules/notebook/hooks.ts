// ─── Notebook Hooks ───────────────────────────────────────────
// Custom React hooks for notebook features

import { useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import {
  fetchSources,
  addSource,
  removeSource,
  fetchChatHistory,
  sendChatMessage,
  clearChat,
  fetchStudioOutputs,
  saveStudioOutput,
  addMessageLocal,
  clearChatLocal,
} from './slice'
import type { SourceCreateRequest, ChatMessage, StudioOutputRequest } from './types'

/**
 * Hook for notebook sources
 */
export const useSources = () => {
  const dispatch = useDispatch<AppDispatch>()
  const sources = useSelector((state: RootState) => state.notebook.sources)
  const isLoading = useSelector((state: RootState) => state.notebook.isLoading)

  const fetch = useCallback(
    (userId: string) => dispatch(fetchSources(userId)),
    [dispatch]
  )

  const add = useCallback(
    (userId: string, source: SourceCreateRequest) => dispatch(addSource({ userId, source })),
    [dispatch]
  )

  const remove = useCallback(
    (userId: string, sourceId: string) => dispatch(removeSource({ userId, sourceId })),
    [dispatch]
  )

  return { sources, isLoading, fetch, add, remove }
}

/**
 * Hook for notebook chat
 */
export const useNotebookChat = () => {
  const dispatch = useDispatch<AppDispatch>()
  const chatHistory = useSelector((state: RootState) => state.notebook.chatHistory)

  const fetch = useCallback(
    (userId: string) => dispatch(fetchChatHistory(userId)),
    [dispatch]
  )

  const send = useCallback(
    (userId: string, role: 'user' | 'assistant', content: string) =>
      dispatch(sendChatMessage({ userId, role, content })),
    [dispatch]
  )

  const addLocal = useCallback(
    (message: ChatMessage) => dispatch(addMessageLocal(message)),
    [dispatch]
  )

  const clear = useCallback(
    (userId: string) => dispatch(clearChat(userId)),
    [dispatch]
  )

  const clearLocal = useCallback(
    () => dispatch(clearChatLocal()),
    [dispatch]
  )

  return { chatHistory, fetch, send, addLocal, clear, clearLocal }
}

/**
 * Hook for notebook studio
 */
export const useStudio = () => {
  const dispatch = useDispatch<AppDispatch>()
  const studioOutputs = useSelector((state: RootState) => state.notebook.studioOutputs)

  const fetch = useCallback(
    (userId: string) => dispatch(fetchStudioOutputs(userId)),
    [dispatch]
  )

  const save = useCallback(
    (userId: string, output: StudioOutputRequest) => dispatch(saveStudioOutput({ userId, output })),
    [dispatch]
  )

  return { studioOutputs, fetch, save }
}
