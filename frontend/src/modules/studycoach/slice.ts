// ─── Study Coach Redux Slice ───────────────────────────────────

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { studyCoachApi } from './api'
import type { StudyCoachState, StudyCoachMode, StudyCoachRequest, StudyCoachResponse } from './types'

const initialState: StudyCoachState = {
  response: null,
  isLoading: false,
  error: null,
  currentMode: 'study_coach',
  history: [],
}

// ─── Async Thunks ───────────────────────────────────────────────

export const askStudyCoach = createAsyncThunk<
  StudyCoachResponse,
  StudyCoachRequest,
  { rejectValue: string }
>(
  'studyCoach/ask',
  async (request, { rejectWithValue }) => {
    try {
      const response = await studyCoachApi.ask(request)
      return response
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } }
        const message = axiosError.response?.data?.detail || 'Failed to get response'
        return rejectWithValue(message)
      }
      return rejectWithValue('Failed to connect to Study Coach')
    }
  }
)

// ─── Slice ─────────────────────────────────────────────────────

const studyCoachSlice = createSlice({
  name: 'studyCoach',
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<StudyCoachMode>) => {
      state.currentMode = action.payload
    },
    clearResponse: (state) => {
      state.response = null
      state.error = null
    },
    clearError: (state) => {
      state.error = null
    },
    clearHistory: (state) => {
      state.history = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(askStudyCoach.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(askStudyCoach.fulfilled, (state, action) => {
        state.isLoading = false
        state.response = action.payload
        // Add to history
        state.history.unshift({
          question: action.meta.arg.question,
          response: action.payload,
          timestamp: Date.now(),
        })
        // Keep only last 20 items
        if (state.history.length > 20) {
          state.history = state.history.slice(0, 20)
        }
      })
      .addCase(askStudyCoach.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload || 'An error occurred'
      })
  },
})

export const { setMode, clearResponse, clearError, clearHistory } = studyCoachSlice.actions
export default studyCoachSlice.reducer
