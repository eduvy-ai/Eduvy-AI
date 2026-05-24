// ─── Notebook API Layer ───────────────────────────────────────
// API calls for notebook sources, chat, and studio

import axiosInstance from '../../services/axios'
import type {
  Source,
  SourceCreateRequest,
  ChatMessage,
  ChatMessageRequest,
  StudioOutput,
  StudioOutputRequest,
} from './types'

export const notebookApi = {
  // ── Sources ──
  getSources: async (userId: string): Promise<Source[]> => {
    const response = await axiosInstance.get(`/api/notebook/${userId}/sources`)
    return response.data
  },

  saveSource: async (userId: string, source: SourceCreateRequest): Promise<Source> => {
    const response = await axiosInstance.post(`/api/notebook/${userId}/sources`, {
      id: source.id,
      name: source.name,
      type: source.type,
      content: source.content,
      icon: source.icon,
      added_at: source.added_at ?? Date.now(),
    })
    return response.data
  },

  deleteSource: async (userId: string, sourceId: string): Promise<void> => {
    await axiosInstance.delete(`/api/notebook/${userId}/sources/${sourceId}`)
  },

  // ── Chat ──
  getChatHistory: async (userId: string): Promise<ChatMessage[]> => {
    const response = await axiosInstance.get(`/api/notebook/${userId}/chat`)
    return response.data
  },

  saveChatMessage: async (userId: string, message: ChatMessageRequest): Promise<ChatMessage> => {
    const response = await axiosInstance.post(`/api/notebook/${userId}/chat`, message)
    return response.data
  },

  clearChatHistory: async (userId: string): Promise<void> => {
    await axiosInstance.delete(`/api/notebook/${userId}/chat`)
  },

  // ── Studio ──
  getStudioOutputs: async (userId: string): Promise<StudioOutput[]> => {
    const response = await axiosInstance.get(`/api/notebook/${userId}/studio`)
    return response.data
  },

  saveStudioOutput: async (userId: string, output: StudioOutputRequest): Promise<StudioOutput> => {
    const response = await axiosInstance.post(`/api/notebook/${userId}/studio`, output)
    return response.data
  },
}

export default notebookApi
