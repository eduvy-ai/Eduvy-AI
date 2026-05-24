// ─── Notebook Redux Slice ─────────────────────────────────────
// Redux state management for notebook sources, chat, and studio

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import notebookApi from './api'
import type { NotebookState, SourceCreateRequest, ChatMessage, StudioOutputRequest } from './types'

// ── Initial State ──
const initialState: NotebookState = {
  sources: [],
  chatHistory: [],
  studioOutputs: [],
  isLoading: false,
  error: null,
}

// ── Async Thunks ──

// Sources
export const fetchSources = createAsyncThunk(
  'notebook/fetchSources',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await notebookApi.getSources(userId)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch sources')
    }
  }
)

export const addSource = createAsyncThunk(
  'notebook/addSource',
  async ({ userId, source }: { userId: string; source: SourceCreateRequest }, { rejectWithValue }) => {
    try {
      return await notebookApi.saveSource(userId, source)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add source')
    }
  }
)

export const removeSource = createAsyncThunk(
  'notebook/removeSource',
  async ({ userId, sourceId }: { userId: string; sourceId: string }, { rejectWithValue }) => {
    try {
      await notebookApi.deleteSource(userId, sourceId)
      return sourceId
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to remove source')
    }
  }
)

// Chat
export const fetchChatHistory = createAsyncThunk(
  'notebook/fetchChatHistory',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await notebookApi.getChatHistory(userId)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch chat history')
    }
  }
)

export const sendChatMessage = createAsyncThunk(
  'notebook/sendChatMessage',
  async (
    { userId, role, content }: { userId: string; role: 'user' | 'assistant'; content: string },
    { rejectWithValue }
  ) => {
    try {
      return await notebookApi.saveChatMessage(userId, { role, content })
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send message')
    }
  }
)

export const clearChat = createAsyncThunk(
  'notebook/clearChat',
  async (userId: string, { rejectWithValue }) => {
    try {
      await notebookApi.clearChatHistory(userId)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to clear chat')
    }
  }
)

// Studio
export const fetchStudioOutputs = createAsyncThunk(
  'notebook/fetchStudioOutputs',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await notebookApi.getStudioOutputs(userId)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch studio outputs')
    }
  }
)

export const saveStudioOutput = createAsyncThunk(
  'notebook/saveStudioOutput',
  async ({ userId, output }: { userId: string; output: StudioOutputRequest }, { rejectWithValue }) => {
    try {
      return await notebookApi.saveStudioOutput(userId, output)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save studio output')
    }
  }
)

// ── Slice ──
const notebookSlice = createSlice({
  name: 'notebook',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    addMessageLocal: (state, action: PayloadAction<ChatMessage>) => {
      state.chatHistory.push(action.payload)
    },
    clearChatLocal: (state) => {
      state.chatHistory = []
    },
  },
  extraReducers: (builder) => {
    // Sources
    builder
      .addCase(fetchSources.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchSources.fulfilled, (state, action) => {
        state.isLoading = false
        state.sources = action.payload
      })
      .addCase(fetchSources.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(addSource.fulfilled, (state, action) => {
        state.sources.push(action.payload)
      })
      .addCase(removeSource.fulfilled, (state, action) => {
        state.sources = state.sources.filter((s) => s.id !== action.payload)
      })

    // Chat
    builder
      .addCase(fetchChatHistory.fulfilled, (state, action) => {
        state.chatHistory = action.payload
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.chatHistory.push(action.payload)
      })
      .addCase(clearChat.fulfilled, (state) => {
        state.chatHistory = []
      })

    // Studio
    builder
      .addCase(fetchStudioOutputs.fulfilled, (state, action) => {
        state.studioOutputs = action.payload
      })
      .addCase(saveStudioOutput.fulfilled, (state, action) => {
        state.studioOutputs.push(action.payload)
      })
  },
})

export const { clearError, addMessageLocal, clearChatLocal } = notebookSlice.actions
export default notebookSlice.reducer
