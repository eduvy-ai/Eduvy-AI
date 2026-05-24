// ─── Bhool API Layer ──────────────────────────────────────────
// API calls for Bhool Bazaar - Mistake Marketplace

import axiosInstance from '../../services/axios'
import type {
  BhoolCard,
  BhoolCardCreateRequest,
  BhoolCardUpdateRequest,
  MarketplaceFilters,
  MarketplaceResponse,
  BhoolCollection,
  ReactionRequest,
} from './types'

export const bhoolApi = {
  // ── My Cards ──
  getMyCards: async (): Promise<BhoolCard[]> => {
    const response = await axiosInstance.get('/api/bhool/cards/mine')
    return response.data
  },

  createCard: async (data: BhoolCardCreateRequest): Promise<BhoolCard> => {
    const response = await axiosInstance.post('/api/bhool/cards', data)
    return response.data
  },

  updateCard: async (cardId: string, data: BhoolCardUpdateRequest): Promise<BhoolCard> => {
    const response = await axiosInstance.put(`/api/bhool/cards/${cardId}`, data)
    return response.data
  },

  deleteCard: async (cardId: string): Promise<void> => {
    await axiosInstance.delete(`/api/bhool/cards/${cardId}`)
  },

  // ── Marketplace ──
  getMarketplace: async (filters: MarketplaceFilters = {}): Promise<MarketplaceResponse> => {
    const params = new URLSearchParams()
    if (filters.subject) params.set('subject', filters.subject)
    if (filters.standard) params.set('standard', filters.standard)
    if (filters.sort) params.set('sort', filters.sort)
    if (filters.offset !== undefined) params.set('offset', String(filters.offset))
    if (filters.limit !== undefined) params.set('limit', String(filters.limit))

    const response = await axiosInstance.get(`/api/bhool/marketplace?${params}`)
    return response.data
  },

  getTopCards: async (subject?: string): Promise<BhoolCard[]> => {
    const params = subject ? `?subject=${encodeURIComponent(subject)}` : ''
    const response = await axiosInstance.get(`/api/bhool/marketplace/top${params}`)
    return response.data
  },

  // ── Collections ──
  getCollections: async (): Promise<BhoolCollection[]> => {
    const response = await axiosInstance.get('/api/bhool/collections')
    return response.data
  },

  collectCard: async (cardId: string): Promise<{ collected: boolean }> => {
    const response = await axiosInstance.post(`/api/bhool/cards/${cardId}/collect`)
    return response.data
  },

  // ── Reactions ──
  reactToCard: async (cardId: string, data: ReactionRequest): Promise<{ reactions: Record<string, number> }> => {
    const response = await axiosInstance.post(`/api/bhool/cards/${cardId}/react`, data)
    return response.data
  },
}

export default bhoolApi
