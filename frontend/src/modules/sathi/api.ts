// ─── Sathi API Layer ──────────────────────────────────────────
// API calls for Study Squads

import axiosInstance from '../../services/axios'
import type {
  Squad,
  SquadMember,
  SquadMatchResponse,
  SquadMessage,
  SendMessageRequest,
  SquadChallenge,
  ChallengeSubmitRequest,
  ChallengeSubmitResponse,
  Doubt,
  DoubtAnswer,
  PostDoubtRequest,
  PostAnswerRequest,
  DoubtQuota,
  DailyConcept,
  DailyExplainRequest,
  SquadStreak,
} from './types'

export const sathiApi = {
  // ── Squad Management ──
  getMySquad: async (): Promise<{ squad: Squad | null }> => {
    const response = await axiosInstance.get('/api/squads/mine')
    return response.data
  },

  matchSquad: async (): Promise<SquadMatchResponse> => {
    const response = await axiosInstance.post('/api/squads/match')
    return response.data
  },

  leaveSquad: async (squadId: string): Promise<void> => {
    await axiosInstance.delete(`/api/squads/${squadId}/leave`)
  },

  getMembers: async (squadId: string): Promise<{ members: SquadMember[] }> => {
    const response = await axiosInstance.get(`/api/squads/${squadId}/members`)
    return response.data
  },

  // ── Messages ──
  getMessages: async (squadId: string, sinceId = 0): Promise<{ messages: SquadMessage[] }> => {
    const response = await axiosInstance.get(`/api/squads/${squadId}/messages`, {
      params: { since_id: sinceId },
    })
    return response.data
  },

  sendMessage: async (squadId: string, data: SendMessageRequest): Promise<SquadMessage> => {
    const response = await axiosInstance.post(`/api/squads/${squadId}/messages`, data)
    return response.data
  },

  // ── Challenges ──
  getChallenge: async (squadId: string): Promise<{ challenge: SquadChallenge | null }> => {
    const response = await axiosInstance.get(`/api/squads/${squadId}/challenge`)
    return response.data
  },

  createChallenge: async (squadId: string): Promise<SquadChallenge> => {
    const response = await axiosInstance.post(`/api/squads/${squadId}/challenge/create`)
    return response.data
  },

  submitChallenge: async (
    squadId: string,
    challengeId: string,
    data: ChallengeSubmitRequest
  ): Promise<ChallengeSubmitResponse> => {
    const response = await axiosInstance.post(
      `/api/squads/${squadId}/challenge/${challengeId}/submit`,
      data
    )
    return response.data
  },

  // ── Doubts Board ──
  getDoubts: async (squadId: string): Promise<Doubt[]> => {
    const response = await axiosInstance.get(`/api/squads/${squadId}/doubts`)
    return response.data
  },

  getDoubtQuota: async (squadId: string): Promise<DoubtQuota> => {
    const response = await axiosInstance.get(`/api/squads/${squadId}/doubts/quota`)
    return response.data
  },

  postDoubt: async (squadId: string, data: PostDoubtRequest): Promise<Doubt> => {
    const response = await axiosInstance.post(`/api/squads/${squadId}/doubts`, data)
    return response.data
  },

  getAnswers: async (squadId: string, doubtId: string): Promise<DoubtAnswer[]> => {
    const response = await axiosInstance.get(`/api/squads/${squadId}/doubts/${doubtId}/answers`)
    return response.data
  },

  postAnswer: async (squadId: string, doubtId: string, data: PostAnswerRequest): Promise<DoubtAnswer> => {
    const response = await axiosInstance.post(`/api/squads/${squadId}/doubts/${doubtId}/answers`, data)
    return response.data
  },

  upvoteAnswer: async (squadId: string, doubtId: string, answerId: string): Promise<void> => {
    await axiosInstance.post(`/api/squads/${squadId}/doubts/${doubtId}/answers/${answerId}/upvote`)
  },

  patchVerdict: async (
    squadId: string,
    doubtId: string,
    answerId: string,
    aiVerdict: string,
    aiNote: string
  ): Promise<void> => {
    await axiosInstance.patch(`/api/squads/${squadId}/doubts/${doubtId}/answers/${answerId}/verdict`, {
      ai_verdict: aiVerdict,
      ai_note: aiNote,
    })
  },

  // ── Daily Concept ──
  getDailyConcept: async (squadId: string): Promise<DailyConcept> => {
    const response = await axiosInstance.get(`/api/squads/${squadId}/daily`)
    return response.data
  },

  submitDailyExplain: async (squadId: string, data: DailyExplainRequest): Promise<{ xp_awarded: number }> => {
    const response = await axiosInstance.post(`/api/squads/${squadId}/daily/explain`, data)
    return response.data
  },

  // ── Streak ──
  getStreak: async (squadId: string): Promise<SquadStreak> => {
    const response = await axiosInstance.get(`/api/squads/${squadId}/streak`)
    return response.data
  },

  // ── Study Session ──
  startSession: async (
    squadId: string,
    displayName: string,
    minutes = 25
  ): Promise<{ session_id: string }> => {
    const response = await axiosInstance.post(`/api/squads/${squadId}/session/start`, {
      display_name: displayName,
      minutes,
    })
    return response.data
  },
}

export default sathiApi
