// ─── Profile API Layer ────────────────────────────────────────
// API calls for profile, XP, streak, mastery, and quiz stats

import axiosInstance from '../../services/axios'
import type {
  ProfileUpdateRequest,
  XpResponse,
  StreakResponse,
  MasteryScores,
  MasteryUpdateRequest,
  QuizResult,
  QuizStats,
} from './types'
import type { UserProfile } from '../auth/types'

export const profileApi = {
  // ── Profile CRUD ──
  updateProfile: async (userId: string, data: ProfileUpdateRequest): Promise<UserProfile> => {
    const response = await axiosInstance.put(`/api/profile/${userId}`, data)
    return response.data
  },

  // ── XP ──
  addXp: async (userId: string, points: number): Promise<XpResponse> => {
    const response = await axiosInstance.post(`/api/profile/${userId}/xp`, { points })
    return response.data
  },

  // ── Streak ──
  updateStreak: async (userId: string, streak: number): Promise<StreakResponse> => {
    const response = await axiosInstance.put<StreakResponse>(`/api/profile/${userId}/streak`, { streak })
    return response.data
  },

  // ── Mastery ──
  getMastery: async (userId: string): Promise<MasteryScores> => {
    const response = await axiosInstance.get(`/api/mastery/${userId}`)
    return response.data
  },

  setMastery: async (userId: string, data: MasteryUpdateRequest): Promise<MasteryScores> => {
    const response = await axiosInstance.put(`/api/mastery/${userId}`, data)
    return response.data
  },

  // ── Quiz Stats ──
  getQuizStats: async (userId: string): Promise<QuizStats> => {
    const response = await axiosInstance.get(`/api/quiz/${userId}/stats`)
    return response.data
  },

  saveQuizResult: async (userId: string, data: QuizResult): Promise<void> => {
    await axiosInstance.post(`/api/quiz/${userId}/result`, data)
  },
}

export default profileApi
