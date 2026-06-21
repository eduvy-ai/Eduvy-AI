// ─── Study Coach API Layer ───────────────────────────────────

import axiosInstance from '../../services/axios'
import type { StudyCoachRequest, StudyCoachResponse, TeacherAudioRequest, TeacherAudioResponse } from './types'

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
    })
    return response.data
  },

  /**
   * Get the audio URL for a specific beat.
   * @deprecated Audio URLs are now returned directly in TeacherAudioResponse.beats[].audio_url
   */
  getTeacherAudioUrl: (userId: string, beatId: string): string => {
    return `/api/ai/teacher-audio/${userId}/${beatId}`
  },
}
