/**
 * Chapters Module Hooks
 * Custom React hooks for chapter data access.
 */

import { useCallback, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '@/redux/store'
import {
  fetchChapters,
  fetchSubjects,
  fetchChapter,
  fetchChaptersWithProgress,
  clearChapters,
  clearError,
  setCurrentChapter,
} from './slice'
import type { Chapter, ChapterListParams } from './types'

/**
 * Hook for accessing chapters state and actions.
 */
export function useChapters() {
  const dispatch = useDispatch<AppDispatch>()
  const {
    chapters,
    chaptersWithProgress,
    subjects,
    currentChapter,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.chapters)

  const loadChapters = useCallback(
    (params?: ChapterListParams) => {
      dispatch(fetchChapters(params))
    },
    [dispatch]
  )

  const loadSubjects = useCallback(
    (board: string, standard: string) => {
      dispatch(fetchSubjects({ board, standard }))
    },
    [dispatch]
  )

  const loadChapter = useCallback(
    (chapterId: number) => {
      dispatch(fetchChapter(chapterId))
    },
    [dispatch]
  )

  const loadChaptersWithProgress = useCallback(
    (board: string, standard: string, subject: string) => {
      dispatch(fetchChaptersWithProgress({ board, standard, subject }))
    },
    [dispatch]
  )

  const clear = useCallback(() => {
    dispatch(clearChapters())
  }, [dispatch])

  const dismissError = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  const selectChapter = useCallback(
    (chapter: Chapter | null) => {
      dispatch(setCurrentChapter(chapter))
    },
    [dispatch]
  )

  return {
    // State
    chapters,
    chaptersWithProgress,
    subjects,
    currentChapter,
    isLoading,
    error,
    // Actions
    loadChapters,
    loadSubjects,
    loadChapter,
    loadChaptersWithProgress,
    selectChapter,
    clear,
    dismissError,
  }
}

/**
 * Hook to load chapters for a specific subject on mount.
 */
export function useChaptersBySubject(board: string, standard: string, subject: string) {
  const dispatch = useDispatch<AppDispatch>()
  const { chapters, isLoading, error } = useSelector((state: RootState) => state.chapters)

  useEffect(() => {
    if (board && standard && subject) {
      dispatch(fetchChapters({ board, standard, subject }))
    }
  }, [dispatch, board, standard, subject])

  return { chapters, isLoading, error }
}

/**
 * Hook to load chapters with progress for the Learn tab.
 */
export function useChaptersWithProgress(board: string, standard: string, subject: string) {
  const dispatch = useDispatch<AppDispatch>()
  const { chaptersWithProgress, isLoading, error } = useSelector(
    (state: RootState) => state.chapters
  )

  useEffect(() => {
    if (board && standard && subject) {
      dispatch(fetchChaptersWithProgress({ board, standard, subject }))
    }
  }, [dispatch, board, standard, subject])

  return { chapters: chaptersWithProgress, isLoading, error }
}

/**
 * Hook to load subjects with chapter counts.
 */
export function useSubjectsWithChapters(board: string, standard: string) {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects, isLoading, error } = useSelector((state: RootState) => state.chapters)

  useEffect(() => {
    if (board && standard) {
      dispatch(fetchSubjects({ board, standard }))
    }
  }, [dispatch, board, standard])

  return { subjects, isLoading, error }
}

/**
 * Hook to load a single chapter by ID.
 */
export function useChapterById(chapterId: number | null) {
  const dispatch = useDispatch<AppDispatch>()
  const { currentChapter, isLoading, error } = useSelector(
    (state: RootState) => state.chapters
  )

  useEffect(() => {
    if (chapterId) {
      dispatch(fetchChapter(chapterId))
    }
  }, [dispatch, chapterId])

  return { chapter: currentChapter, isLoading, error }
}

export default useChapters
