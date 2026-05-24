// ─── Sathi Redux Slice ────────────────────────────────────────
// Redux state management for Study Squads

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import sathiApi from './api'
import type {
  SathiState,
  SquadMessage,
  SendMessageRequest,
  PostDoubtRequest,
  DailyExplainRequest,
} from './types'

// ── Initial State ──
const initialState: SathiState = {
  squad: null,
  members: [],
  messages: [],
  doubts: [],
  dailyConcept: null,
  challenge: null,
  doubtQuota: null,
  isLoading: false,
  error: null,
}

// ── Async Thunks ──

// Squad Management
export const fetchMySquad = createAsyncThunk('sathi/fetchMySquad', async (_, { rejectWithValue }) => {
  try {
    const { squad } = await sathiApi.getMySquad()
    return squad
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch squad')
  }
})

export const matchSquad = createAsyncThunk('sathi/matchSquad', async (_, { rejectWithValue }) => {
  try {
    return await sathiApi.matchSquad()
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to match squad')
  }
})

export const leaveSquad = createAsyncThunk('sathi/leaveSquad', async (squadId: string, { rejectWithValue }) => {
  try {
    await sathiApi.leaveSquad(squadId)
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to leave squad')
  }
})

export const fetchMembers = createAsyncThunk('sathi/fetchMembers', async (squadId: string, { rejectWithValue }) => {
  try {
    const { members } = await sathiApi.getMembers(squadId)
    return members
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch members')
  }
})

// Messages
export const fetchMessages = createAsyncThunk(
  'sathi/fetchMessages',
  async ({ squadId, sinceId = 0 }: { squadId: string; sinceId?: number }, { rejectWithValue }) => {
    try {
      const { messages } = await sathiApi.getMessages(squadId, sinceId)
      return messages
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch messages')
    }
  }
)

export const sendMessage = createAsyncThunk(
  'sathi/sendMessage',
  async ({ squadId, data }: { squadId: string; data: SendMessageRequest }, { rejectWithValue }) => {
    try {
      return await sathiApi.sendMessage(squadId, data)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send message')
    }
  }
)

// Challenges
export const fetchChallenge = createAsyncThunk('sathi/fetchChallenge', async (squadId: string, { rejectWithValue }) => {
  try {
    const { challenge } = await sathiApi.getChallenge(squadId)
    return challenge
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch challenge')
  }
})

export const createChallenge = createAsyncThunk('sathi/createChallenge', async (squadId: string, { rejectWithValue }) => {
  try {
    return await sathiApi.createChallenge(squadId)
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to create challenge')
  }
})

// Doubts
export const fetchDoubts = createAsyncThunk('sathi/fetchDoubts', async (squadId: string, { rejectWithValue }) => {
  try {
    return await sathiApi.getDoubts(squadId)
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch doubts')
  }
})

export const fetchDoubtQuota = createAsyncThunk('sathi/fetchDoubtQuota', async (squadId: string, { rejectWithValue }) => {
  try {
    return await sathiApi.getDoubtQuota(squadId)
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch doubt quota')
  }
})

export const postDoubt = createAsyncThunk(
  'sathi/postDoubt',
  async ({ squadId, data }: { squadId: string; data: PostDoubtRequest }, { rejectWithValue }) => {
    try {
      return await sathiApi.postDoubt(squadId, data)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to post doubt')
    }
  }
)

// Daily Concept
export const fetchDailyConcept = createAsyncThunk('sathi/fetchDailyConcept', async (squadId: string, { rejectWithValue }) => {
  try {
    return await sathiApi.getDailyConcept(squadId)
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch daily concept')
  }
})

export const submitDailyExplain = createAsyncThunk(
  'sathi/submitDailyExplain',
  async ({ squadId, data }: { squadId: string; data: DailyExplainRequest }, { rejectWithValue }) => {
    try {
      return await sathiApi.submitDailyExplain(squadId, data)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to submit explanation')
    }
  }
)

// ── Slice ──
const sathiSlice = createSlice({
  name: 'sathi',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    addMessageLocal: (state, action: PayloadAction<SquadMessage>) => {
      state.messages.push(action.payload)
    },
    clearSquad: (state) => {
      state.squad = null
      state.members = []
      state.messages = []
      state.doubts = []
      state.challenge = null
      state.dailyConcept = null
    },
  },
  extraReducers: (builder) => {
    // Squad
    builder
      .addCase(fetchMySquad.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchMySquad.fulfilled, (state, action) => {
        state.isLoading = false
        state.squad = action.payload
      })
      .addCase(fetchMySquad.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(leaveSquad.fulfilled, (state) => {
        state.squad = null
        state.members = []
        state.messages = []
      })

    // Members
    builder.addCase(fetchMembers.fulfilled, (state, action) => {
      state.members = action.payload
    })

    // Messages
    builder
      .addCase(fetchMessages.fulfilled, (state, action) => {
        // Merge new messages (avoid duplicates)
        const existingIds = new Set(state.messages.map((m) => m.id))
        const newMessages = action.payload.filter((m) => !existingIds.has(m.id))
        state.messages = [...state.messages, ...newMessages]
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload)
      })

    // Challenge
    builder
      .addCase(fetchChallenge.fulfilled, (state, action) => {
        state.challenge = action.payload
      })
      .addCase(createChallenge.fulfilled, (state, action) => {
        state.challenge = action.payload
      })

    // Doubts
    builder
      .addCase(fetchDoubts.fulfilled, (state, action) => {
        state.doubts = action.payload
      })
      .addCase(fetchDoubtQuota.fulfilled, (state, action) => {
        state.doubtQuota = action.payload
      })
      .addCase(postDoubt.fulfilled, (state, action) => {
        state.doubts.unshift(action.payload)
      })

    // Daily Concept
    builder.addCase(fetchDailyConcept.fulfilled, (state, action) => {
      state.dailyConcept = action.payload
    })
  },
})

export const { clearError, addMessageLocal, clearSquad } = sathiSlice.actions
export default sathiSlice.reducer
