/**
 * Chapters Module API
 * API calls for chapter management.
 */

import axiosInstance from '@/services/axios'
import type {
  Chapter,
  ChapterWithProgress,
  SubjectWithChapters,
  ChapterCreate,
  ChapterUpdate,
  ChapterListParams,
} from './types'

const BASE_URL = '/api/chapters'

export const chaptersApi = {
  /**
   * List chapters with optional filters.
   */
  list: async (params?: ChapterListParams): Promise<Chapter[]> => {
    const response = await axiosInstance.get<Chapter[]>(BASE_URL, { params })
    return response.data
  },

  /**
   * Get subjects with chapter counts for a board+standard.
   */
  getSubjects: async (board_id: string, standard_id: string): Promise<SubjectWithChapters[]> => {
    const response = await axiosInstance.get<SubjectWithChapters[]>(
      `${BASE_URL}/subjects`,
      { params: { board_id, standard_id } }
    )
    return response.data
  },

  /**
   * Get a single chapter by ID.
   */
  get: async (chapterId: number): Promise<Chapter> => {
    const response = await axiosInstance.get<Chapter>(`${BASE_URL}/${chapterId}`)
    return response.data
  },

  /**
   * Get chapters with user progress data.
   */
  getWithProgress: async (
    board_id: string,
    standard_id: string,
    subject_id: string
  ): Promise<ChapterWithProgress[]> => {
    const response = await axiosInstance.get<ChapterWithProgress[]>(
      `${BASE_URL}/with-progress`,
      { params: { board_id, standard_id, subject_id } }
    )
    return response.data
  },

  /**
   * Create a new chapter (admin).
   */
  create: async (data: ChapterCreate): Promise<Chapter> => {
    const response = await axiosInstance.post<Chapter>(BASE_URL, data)
    return response.data
  },

  /**
   * Update an existing chapter (admin).
   */
  update: async (chapterId: number, data: ChapterUpdate): Promise<Chapter> => {
    const response = await axiosInstance.put<Chapter>(`${BASE_URL}/${chapterId}`, data)
    return response.data
  },

  /**
   * Delete a chapter (admin).
   */
  delete: async (chapterId: number): Promise<void> => {
    await axiosInstance.delete(`${BASE_URL}/${chapterId}`)
  },

  /**
   * Bulk create chapters (admin).
   */
  bulkCreate: async (chapters: ChapterCreate[]): Promise<{ created: number }> => {
    const response = await axiosInstance.post<{ created: number }>(`${BASE_URL}/bulk`, chapters)
    return response.data
  },
}

export default chaptersApi
