// ─── Study Coach API Layer ───────────────────────────────────

import axiosInstance from '../../services/axios'
import type { StudyCoachRequest, StudyCoachResponse } from './types'

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
}
