// ─── Muqabla Redux Slice ──────────────────────────────────────
// Redux state management for Battle Arena

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import muqablaApi from './api'
import type { MuqablaState, BattleCreateRequest, BattleAnswersRequest } from './types'

// ── Initial State ──
const initialState: MuqablaState = {
  openBattles: [],
  pendingBattles: [],
  activeBattles: [],
  history: [],
  leaderboard: [],
  schoolLeaderboard: [],
  currentBattle: null,
  isLoading: false,
  error: null,
}

// ── Async Thunks ──

// Battle Management
export const createChallenge = createAsyncThunk(
  'muqabla/createChallenge',
  async (data: BattleCreateRequest, { rejectWithValue }) => {
    try {
      return await muqablaApi.createChallenge(data)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create challenge')
    }
  }
)

export const fetchBattle = createAsyncThunk('muqabla/fetchBattle', async (battleId: string, { rejectWithValue }) => {
  try {
    return await muqablaApi.getBattle(battleId)
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch battle')
  }
})

export const joinBattle = createAsyncThunk('muqabla/joinBattle', async (battleId: string, { rejectWithValue }) => {
  try {
    return await muqablaApi.joinBattle(battleId)
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to join battle')
  }
})

export const declineBattle = createAsyncThunk('muqabla/declineBattle', async (battleId: string, { rejectWithValue }) => {
  try {
    await muqablaApi.declineBattle(battleId)
    return battleId
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to decline battle')
  }
})

export const submitAnswers = createAsyncThunk(
  'muqabla/submitAnswers',
  async ({ battleId, data }: { battleId: string; data: BattleAnswersRequest }, { rejectWithValue }) => {
    try {
      return await muqablaApi.submitAnswers(battleId, data)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to submit answers')
    }
  }
)

// Battle Lists
export const fetchOpenBattles = createAsyncThunk('muqabla/fetchOpenBattles', async (_, { rejectWithValue }) => {
  try {
    return await muqablaApi.getOpenBattles()
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch open battles')
  }
})

export const fetchPendingBattles = createAsyncThunk('muqabla/fetchPendingBattles', async (_, { rejectWithValue }) => {
  try {
    return await muqablaApi.getPendingBattles()
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch pending battles')
  }
})

export const fetchActiveBattles = createAsyncThunk('muqabla/fetchActiveBattles', async (_, { rejectWithValue }) => {
  try {
    return await muqablaApi.getActiveBattles()
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch active battles')
  }
})

export const fetchHistory = createAsyncThunk('muqabla/fetchHistory', async (_, { rejectWithValue }) => {
  try {
    return await muqablaApi.getHistory()
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch history')
  }
})

// Leaderboards
export const fetchLeaderboard = createAsyncThunk('muqabla/fetchLeaderboard', async (_, { rejectWithValue }) => {
  try {
    return await muqablaApi.getLeaderboard()
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch leaderboard')
  }
})

export const fetchSchoolLeaderboard = createAsyncThunk('muqabla/fetchSchoolLeaderboard', async (_, { rejectWithValue }) => {
  try {
    return await muqablaApi.getSchoolLeaderboard()
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch school leaderboard')
  }
})

// ── Slice ──
const muqablaSlice = createSlice({
  name: 'muqabla',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCurrentBattle: (state, action) => {
      state.currentBattle = action.payload
    },
    clearCurrentBattle: (state) => {
      state.currentBattle = null
    },
  },
  extraReducers: (builder) => {
    // Battle Management
    builder
      .addCase(createChallenge.pending, (state) => {
        state.isLoading = true
      })
      .addCase(createChallenge.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentBattle = action.payload
        state.pendingBattles.unshift(action.payload)
      })
      .addCase(createChallenge.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchBattle.fulfilled, (state, action) => {
        state.currentBattle = action.payload
      })
      .addCase(joinBattle.fulfilled, (state, action) => {
        state.currentBattle = action.payload
        // Move from pending to active
        state.pendingBattles = state.pendingBattles.filter((b) => b.id !== action.payload.id)
        state.activeBattles.unshift(action.payload)
      })
      .addCase(declineBattle.fulfilled, (state, action) => {
        state.pendingBattles = state.pendingBattles.filter((b) => b.id !== action.payload)
      })

    // Battle Lists
    builder
      .addCase(fetchOpenBattles.fulfilled, (state, action) => {
        state.openBattles = action.payload
      })
      .addCase(fetchPendingBattles.fulfilled, (state, action) => {
        state.pendingBattles = action.payload
      })
      .addCase(fetchActiveBattles.fulfilled, (state, action) => {
        state.activeBattles = action.payload
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.history = action.payload
      })

    // Leaderboards
    builder
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.leaderboard = action.payload
      })
      .addCase(fetchSchoolLeaderboard.fulfilled, (state, action) => {
        state.schoolLeaderboard = action.payload
      })
  },
})

export const { clearError, setCurrentBattle, clearCurrentBattle } = muqablaSlice.actions
export default muqablaSlice.reducer
