// ─── Bhool Redux Slice ────────────────────────────────────────
// Redux state management for Bhool Bazaar

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import bhoolApi from './api'
import type { BhoolState, BhoolCardCreateRequest, BhoolCardUpdateRequest, MarketplaceFilters, ReactionEmoji } from './types'

// ── Initial State ──
const initialState: BhoolState = {
  myCards: [],
  marketplaceCards: [],
  topCards: [],
  collections: [],
  filters: {},
  isLoading: false,
  error: null,
}

// ── Async Thunks ──

// My Cards
export const fetchMyCards = createAsyncThunk('bhool/fetchMyCards', async (_, { rejectWithValue }) => {
  try {
    return await bhoolApi.getMyCards()
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch cards')
  }
})

export const createCard = createAsyncThunk(
  'bhool/createCard',
  async (data: BhoolCardCreateRequest, { rejectWithValue }) => {
    try {
      return await bhoolApi.createCard(data)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create card')
    }
  }
)

export const updateCard = createAsyncThunk(
  'bhool/updateCard',
  async ({ cardId, data }: { cardId: string; data: BhoolCardUpdateRequest }, { rejectWithValue }) => {
    try {
      return await bhoolApi.updateCard(cardId, data)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update card')
    }
  }
)

export const deleteCard = createAsyncThunk('bhool/deleteCard', async (cardId: string, { rejectWithValue }) => {
  try {
    await bhoolApi.deleteCard(cardId)
    return cardId
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete card')
  }
})

// Marketplace
export const fetchMarketplace = createAsyncThunk(
  'bhool/fetchMarketplace',
  async (filters: MarketplaceFilters = {}, { rejectWithValue }) => {
    try {
      return await bhoolApi.getMarketplace(filters)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch marketplace')
    }
  }
)

export const fetchTopCards = createAsyncThunk(
  'bhool/fetchTopCards',
  async (subject: string | undefined, { rejectWithValue }) => {
    try {
      return await bhoolApi.getTopCards(subject)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch top cards')
    }
  }
)

// Collections
export const fetchCollections = createAsyncThunk('bhool/fetchCollections', async (_, { rejectWithValue }) => {
  try {
    return await bhoolApi.getCollections()
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch collections')
  }
})

export const collectCard = createAsyncThunk('bhool/collectCard', async (cardId: string, { rejectWithValue }) => {
  try {
    await bhoolApi.collectCard(cardId)
    return cardId
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to collect card')
  }
})

// Reactions
export const reactToCard = createAsyncThunk(
  'bhool/reactToCard',
  async ({ cardId, emoji }: { cardId: string; emoji: ReactionEmoji }, { rejectWithValue }) => {
    try {
      const result = await bhoolApi.reactToCard(cardId, { emoji })
      return { cardId, reactions: result.reactions }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to react')
    }
  }
)

// ── Slice ──
const bhoolSlice = createSlice({
  name: 'bhool',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setFilters: (state, action: PayloadAction<MarketplaceFilters>) => {
      state.filters = action.payload
    },
  },
  extraReducers: (builder) => {
    // My Cards
    builder
      .addCase(fetchMyCards.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchMyCards.fulfilled, (state, action) => {
        state.isLoading = false
        state.myCards = action.payload
      })
      .addCase(fetchMyCards.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(createCard.fulfilled, (state, action) => {
        state.myCards.unshift(action.payload)
      })
      .addCase(updateCard.fulfilled, (state, action) => {
        const index = state.myCards.findIndex((c) => c.id === action.payload.id)
        if (index !== -1) state.myCards[index] = action.payload
      })
      .addCase(deleteCard.fulfilled, (state, action) => {
        state.myCards = state.myCards.filter((c) => c.id !== action.payload)
      })

    // Marketplace
    builder
      .addCase(fetchMarketplace.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchMarketplace.fulfilled, (state, action) => {
        state.isLoading = false
        state.marketplaceCards = action.payload.cards
      })
      .addCase(fetchMarketplace.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchTopCards.fulfilled, (state, action) => {
        state.topCards = action.payload
      })

    // Collections
    builder.addCase(fetchCollections.fulfilled, (state, action) => {
      state.collections = action.payload
    })

    // Reactions - update card in marketplace
    builder.addCase(reactToCard.fulfilled, (state, action) => {
      const { cardId, reactions } = action.payload
      const card = state.marketplaceCards.find((c) => c.id === cardId)
      if (card) card.reactions = reactions
    })
  },
})

export const { clearError, setFilters } = bhoolSlice.actions
export default bhoolSlice.reducer
