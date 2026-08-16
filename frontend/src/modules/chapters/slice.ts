/**
 * Chapters Module Redux Slice
 * State management for chapters.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import chaptersApi from './api'
import type {
  Chapter,
  ChapterWithProgress,
  SubjectWithChapters,
  ChaptersState,
  ChapterListParams,
} from './types'

// ── Initial State ────────────────────────────────────────────
const initialState: ChaptersState = {
  chapters: [],
  chaptersWithProgress: [],
  subjects: [],
  currentChapter: null,
  isLoading: false,
  error: null,
}

// ── Async Thunks ─────────────────────────────────────────────

/**
 * Fetch chapters with optional filters.
 */
export const fetchChapters = createAsyncThunk(
  'chapters/fetchChapters',
  async (params: ChapterListParams | undefined, { rejectWithValue }) => {
    try {
      return await chaptersApi.list(params)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch chapters'
      return rejectWithValue(message)
    }
  }
)

/**
 * Fetch subjects with chapter counts.
 */
export const fetchSubjects = createAsyncThunk(
  'chapters/fetchSubjects',
  async ({ board_id, standard_id }: { board_id: string; standard_id: string }, { rejectWithValue }) => {
    try {
      return await chaptersApi.getSubjects(board_id, standard_id)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch subjects'
      return rejectWithValue(message)
    }
  }
)

/**
 * Fetch a single chapter by ID.
 */
export const fetchChapter = createAsyncThunk(
  'chapters/fetchChapter',
  async (chapterId: number, { rejectWithValue }) => {
    try {
      return await chaptersApi.get(chapterId)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch chapter'
      return rejectWithValue(message)
    }
  }
)

/**
 * Fetch chapters with user progress.
 */
export const fetchChaptersWithProgress = createAsyncThunk(
  'chapters/fetchChaptersWithProgress',
  async (
    { board_id, standard_id, subject_id }: { board_id: string; standard_id: string; subject_id: string },
    { rejectWithValue }
  ) => {
    try {
      return await chaptersApi.getWithProgress(board_id, standard_id, subject_id)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch chapters with progress'
      return rejectWithValue(message)
    }
  }
)

// ── Slice ────────────────────────────────────────────────────
const chaptersSlice = createSlice({
  name: 'chapters',
  initialState,
  reducers: {
    clearChapters: (state) => {
      state.chapters = []
      state.chaptersWithProgress = []
      state.currentChapter = null
      state.error = null
    },
    clearError: (state) => {
      state.error = null
    },
    setCurrentChapter: (state, action: PayloadAction<Chapter | null>) => {
      state.currentChapter = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchChapters ──
      .addCase(fetchChapters.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchChapters.fulfilled, (state, action: PayloadAction<Chapter[]>) => {
        state.isLoading = false
        state.chapters = action.payload
      })
      .addCase(fetchChapters.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // ── fetchSubjects ──
      .addCase(fetchSubjects.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchSubjects.fulfilled, (state, action: PayloadAction<SubjectWithChapters[]>) => {
        state.isLoading = false
        state.subjects = action.payload
      })
      .addCase(fetchSubjects.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // ── fetchChapter ──
      .addCase(fetchChapter.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchChapter.fulfilled, (state, action: PayloadAction<Chapter>) => {
        state.isLoading = false
        state.currentChapter = action.payload
      })
      .addCase(fetchChapter.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // ── fetchChaptersWithProgress ──
      .addCase(fetchChaptersWithProgress.pending, (state) => {
        state.isLoading = true
        state.error = null
        state.chaptersWithProgress = [] // Clear stale data immediately
      })
      .addCase(fetchChaptersWithProgress.fulfilled, (state, action: PayloadAction<ChapterWithProgress[]>) => {
        state.isLoading = false
        state.chaptersWithProgress = action.payload
      })
      .addCase(fetchChaptersWithProgress.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearChapters, clearError, setCurrentChapter } = chaptersSlice.actions
export default chaptersSlice.reducer
