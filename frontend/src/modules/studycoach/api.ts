// ─── Study Coach API Layer ───────────────────────────────────

import axiosInstance from '../../services/axios'
import type { StudyCoachRequest, StudyCoachResponse, TeacherAudioRequest, TeacherAudioResponse } from './types'

// Types for Coach History
export interface CoachSession {
  id: number
  question: string
  title: string
  subject: string
  mode: string
  is_bookmarked: boolean
  created_at: string
  response_json?: StudyCoachResponse
}

export interface CoachSessionsResponse {
  sessions: CoachSession[]
  total: number
}

export const studyCoachApi = {
  /**
   * Ask Study Coach a question and get a structured learning response.
   */
  ask: async (request: StudyCoachRequest): Promise<StudyCoachResponse> => {
    const response = await axiosInstance.post<StudyCoachResponse>('/api/ai/study-coach', {
      question: request.question,
      mode: request.mode ?? 'study_coach',
      subject_override: request.subject_override,
      chapter_override: request.chapter_override,
      chapter_id: request.chapter_id,
    })
    return response.data
  },

  /**
   * Generate Teacher Mode audio with word-level timing for karaoke highlighting.
   */
  generateTeacherAudio: async (request: TeacherAudioRequest): Promise<TeacherAudioResponse> => {
    const response = await axiosInstance.post<TeacherAudioResponse>('/api/ai/teacher-audio', {
      content: request.content,
      section: request.section ?? 'overview',
      language: request.language ?? 'English',
      full_lesson: request.full_lesson ?? false,
      study_coach_response: request.study_coach_response,
    }, {
      timeout: 180000, // 3 minutes - audio generation with fallbacks takes time
    })
    return response.data
  },

  /**
   * Get the audio URL for a specific beat.
   * @deprecated Audio URLs are now returned directly in TeacherAudioResponse.beats[].audio_url
   */
  getTeacherAudioUrl: (_userId: string, beatId: string): string => {
    return `/api/ai/teacher-audio/${beatId}`
  },

  // ─── Coach History APIs ───────────────────────────────────────

  /**
   * Save a coach session to history.
   */
  saveSession: async (data: {
    question: string
    title: string
    subject: string
    mode: string
    response_json: StudyCoachResponse
  }): Promise<CoachSession> => {
    const response = await axiosInstance.post<CoachSession>('/api/coach/sessions', data)
    return response.data
  },

  /**
   * Get coach session history.
   */
  getSessions: async (params?: {
    limit?: number
    offset?: number
    subject?: string
    bookmarked?: boolean
  }): Promise<CoachSessionsResponse> => {
    const response = await axiosInstance.get<CoachSessionsResponse>('/api/coach/sessions', { params })
    return response.data
  },

  /**
   * Get a single session with full response.
   */
  getSession: async (sessionId: number): Promise<CoachSession> => {
    const response = await axiosInstance.get<CoachSession>(`/api/coach/sessions/${sessionId}`)
    return response.data
  },

  /**
   * Toggle bookmark on a session.
   */
  toggleBookmark: async (sessionId: number, isBookmarked: boolean): Promise<{ id: number; is_bookmarked: boolean }> => {
    const response = await axiosInstance.patch(`/api/coach/sessions/${sessionId}/bookmark`, {
      is_bookmarked: isBookmarked
    })
    return response.data
  },

  /**
   * Delete a session.
   */
  deleteSession: async (sessionId: number): Promise<void> => {
    await axiosInstance.delete(`/api/coach/sessions/${sessionId}`)
  },

  /**
   * Search sessions.
   */
  searchSessions: async (query: string, options?: {
    subject?: string
    bookmarked_only?: boolean
    limit?: number
  }): Promise<CoachSessionsResponse> => {
    const response = await axiosInstance.post<CoachSessionsResponse>('/api/coach/sessions/search', {
      query,
      ...options
    })
    return response.data
  },

  /**
   * Get distinct subjects from sessions.
   */
  getSubjects: async (): Promise<{ subjects: string[] }> => {
    const response = await axiosInstance.get<{ subjects: string[] }>('/api/coach/subjects')
    return response.data
  },
}
