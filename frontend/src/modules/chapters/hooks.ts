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
    (board_id: string, standard_id: string, stream_id?: string) => {
      dispatch(fetchSubjects({ board_id, standard_id, stream_id }))
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
    (board_id: string, standard_id: string, subject_id: string, stream_id?: string) => {
      dispatch(fetchChaptersWithProgress({ board_id, standard_id, subject_id, stream_id }))
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
export function useChaptersBySubject(board_id: string, standard_id: string, subject_id: string) {
  const dispatch = useDispatch<AppDispatch>()
  const { chapters, isLoading, error } = useSelector((state: RootState) => state.chapters)

  useEffect(() => {
    if (board_id && standard_id && subject_id) {
      dispatch(fetchChapters({ board_id, standard_id, subject_id }))
    }
  }, [dispatch, board_id, standard_id, subject_id])

  return { chapters, isLoading, error }
}

/**
 * Hook to load chapters with progress for the Learn tab.
 */
export function useChaptersWithProgress(
  board_id: string,
  standard_id: string,
  subject_id: string,
  stream_id?: string
) {
  const dispatch = useDispatch<AppDispatch>()
  const { chaptersWithProgress, isLoading, error } = useSelector(
    (state: RootState) => state.chapters
  )

  useEffect(() => {
    if (board_id && standard_id && subject_id) {
      dispatch(fetchChaptersWithProgress({ board_id, standard_id, subject_id, stream_id }))
    }
  }, [dispatch, board_id, standard_id, subject_id, stream_id])

  return { chapters: chaptersWithProgress, isLoading, error }
}

/**
 * Hook to load subjects with chapter counts.
 */
export function useSubjectsWithChapters(board_id: string, standard_id: string, stream_id?: string) {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects, isLoading, error } = useSelector((state: RootState) => state.chapters)

  useEffect(() => {
    if (board_id && standard_id) {
      dispatch(fetchSubjects({ board_id, standard_id, stream_id }))
    }
  }, [dispatch, board_id, standard_id, stream_id])

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
