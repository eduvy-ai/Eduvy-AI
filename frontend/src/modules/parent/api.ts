// ─── Parent API Layer ─────────────────────────────────────────
// API calls for Parent Dashboard

import axiosInstance from '../../services/axios'
import axios from 'axios'
import { API_BASE_URL } from '../../config'
import type { ParentPin, ParentViewData } from './types'

export const parentApi = {
  // ── PIN Management (requires auth) ──
  getPin: async (): Promise<ParentPin | null> => {
    try {
      const response = await axiosInstance.get('/api/parent/pin')
      return response.data
    } catch {
      return null
    }
  },

  createPin: async (): Promise<ParentPin> => {
    const response = await axiosInstance.post('/api/parent/pin')
    return response.data
  },

  revokePin: async (): Promise<void> => {
    await axiosInstance.delete('/api/parent/pin')
  },

  // ── Public View (no auth required) ──
  getParentView: async (pin: string): Promise<ParentViewData> => {
    // Use raw axios since this is a public endpoint
    const response = await axios.get<ParentViewData>(
      `${API_BASE_URL}/api/parent/view/${encodeURIComponent(pin)}`,
      { timeout: 10000 }
    )
    return response.data
  },
}

export default parentApi
