// ─── Muqabla API Layer ────────────────────────────────────────
// API calls for Muqabla - Battle Arena

import axiosInstance from '../../services/axios'
import type {
  Battle,
  BattleCreateRequest,
  BattleAnswersRequest,
  BattleAnswersResponse,
  LeaderboardEntry,
} from './types'

export const muqablaApi = {
  // ── Battle Management ──
  createChallenge: async (data: BattleCreateRequest): Promise<Battle> => {
    const response = await axiosInstance.post('/api/muqabla/challenge', data, {
      timeout: 30000, // AI generates questions
    })
    return response.data
  },

  getBattle: async (battleId: string): Promise<Battle> => {
    const response = await axiosInstance.get(`/api/muqabla/battles/${battleId}`)
    return response.data
  },

  joinBattle: async (battleId: string): Promise<Battle> => {
    const response = await axiosInstance.post(`/api/muqabla/battles/${battleId}/join`)
    return response.data
  },

  declineBattle: async (battleId: string): Promise<void> => {
    await axiosInstance.delete(`/api/muqabla/battles/${battleId}/decline`)
  },

  submitAnswers: async (battleId: string, data: BattleAnswersRequest): Promise<BattleAnswersResponse> => {
    const response = await axiosInstance.post(`/api/muqabla/battles/${battleId}/answer`, data)
    return response.data
  },

  // ── Battle Lists ──
  getOpenBattles: async (): Promise<Battle[]> => {
    const response = await axiosInstance.get('/api/muqabla/open')
    return response.data
  },

  getPendingBattles: async (): Promise<Battle[]> => {
    const response = await axiosInstance.get('/api/muqabla/pending')
    return response.data
  },

  getActiveBattles: async (): Promise<Battle[]> => {
    const response = await axiosInstance.get('/api/muqabla/active')
    return response.data
  },

  getHistory: async (): Promise<Battle[]> => {
    const response = await axiosInstance.get('/api/muqabla/history')
    return response.data
  },

  // ── Leaderboards ──
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const response = await axiosInstance.get('/api/muqabla/leaderboard')
    return response.data
  },

  getSchoolLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const response = await axiosInstance.get('/api/muqabla/school-leaderboard')
    return response.data
  },
}

export default muqablaApi
