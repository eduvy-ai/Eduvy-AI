// ─── Admin Redux Slice ─────────────────────────────────────────
// Redux state management for admin platform

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import adminService, { getAdminToken } from './service'
import adminApi from './api'
import { DEFAULT_ADMIN_STATE } from './types'
import type {
  AdminState,
  AdminSection,
  AdminLoginRequest,
  AdminSetupRequest,
  Board,
  Standard,
  Medium,
  CurriculumEntry,
  Chapter,
  StudentUser,
  DrishtiHelper,
} from './types'

// ── Initial State ──
const initialState: AdminState = {
  ...DEFAULT_ADMIN_STATE,
  token: getAdminToken(),
}

// ══════════════════════════════════════════════════════════════
// Async Thunks
// ══════════════════════════════════════════════════════════════

// ── Auth Thunks ──

export const adminLogin = createAsyncThunk(
  'admin/login',
  async (credentials: AdminLoginRequest, { rejectWithValue }) => {
    try {
      const response = await adminService.login(credentials)
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      return rejectWithValue(message)
    }
  }
)

export const adminSetup = createAsyncThunk(
  'admin/setup',
  async (data: AdminSetupRequest, { rejectWithValue }) => {
    try {
      const response = await adminService.setup(data)
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Setup failed'
      return rejectWithValue(message)
    }
  }
)

export const initializeAdmin = createAsyncThunk(
  'admin/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const token = getAdminToken()
      if (!token) {
        return null
      }
      
      const user = await adminService.getCurrentUser()
      return user
    } catch (error) {
      return rejectWithValue('Session expired')
    }
  }
)

// ── Curriculum Thunks ──

export const fetchBoards = createAsyncThunk(
  'admin/fetchBoards',
  async (_, { rejectWithValue }) => {
    try {
      const boards = await adminApi.boards.getAll()
      return adminService.sortBoards(boards)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch boards'
      return rejectWithValue(message)
    }
  }
)

export const fetchStandards = createAsyncThunk(
  'admin/fetchStandards',
  async (_, { rejectWithValue }) => {
    try {
      const standards = await adminApi.standards.getAll()
      return adminService.sortStandards(standards)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch standards'
      return rejectWithValue(message)
    }
  }
)

export const fetchMediums = createAsyncThunk(
  'admin/fetchMediums',
  async (_, { rejectWithValue }) => {
    try {
      const mediums = await adminApi.mediums.getAll()
      return adminService.sortMediums(mediums)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch mediums'
      return rejectWithValue(message)
    }
  }
)

export const fetchCurriculum = createAsyncThunk(
  'admin/fetchCurriculum',
  async (filters: { board_id?: string; standard_id?: string; medium_id?: string } | undefined, { rejectWithValue }) => {
    try {
      const curriculum = await adminApi.curriculum.getAll(filters)
      return curriculum
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch curriculum'
      return rejectWithValue(message)
    }
  }
)

export const fetchChapters = createAsyncThunk(
  'admin/fetchChapters',
  async (filters: { board?: string; standard?: string; subject?: string } | undefined, { rejectWithValue }) => {
    try {
      const chapters = await adminApi.chapters.getAll(filters)
      return adminService.sortChapters(chapters)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch chapters'
      return rejectWithValue(message)
    }
  }
)

// ── User Management Thunks ──

export const fetchStudents = createAsyncThunk(
  'admin/fetchStudents',
  async (filters: { search?: string; plan?: string; drishti?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const students = await adminApi.users.getAll(filters)
      return students
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch students'
      return rejectWithValue(message)
    }
  }
)

export const fetchHelpers = createAsyncThunk(
  'admin/fetchHelpers',
  async (_, { rejectWithValue }) => {
    try {
      const helpers = await adminApi.helpers.getAll()
      return helpers
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch helpers'
      return rejectWithValue(message)
    }
  }
)

// ── AI Configuration Thunks ──

export const fetchAIConfig = createAsyncThunk(
  'admin/fetchAIConfig',
  async (_, { rejectWithValue }) => {
    try {
      const config = await adminApi.aiConfig.getConfig()
      return config
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch AI config'
      return rejectWithValue(message)
    }
  }
)

export const fetchAIUsage = createAsyncThunk(
  'admin/fetchAIUsage',
  async (days: number = 7, { rejectWithValue }) => {
    try {
      const usage = await adminApi.aiUsage.getSummary(days)
      return usage
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch AI usage'
      return rejectWithValue(message)
    }
  }
)

// ══════════════════════════════════════════════════════════════
// Slice
// ══════════════════════════════════════════════════════════════

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    // ── Auth ──
    logout: (state) => {
      adminService.logout()
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
    },
    
    clearError: (state) => {
      state.error = null
    },
    
    // ── UI State ──
    setActiveSection: (state, action: PayloadAction<AdminSection>) => {
      state.activeSection = action.payload
    },
    
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    
    // ── Local Data Updates ──
    addBoard: (state, action: PayloadAction<Board>) => {
      state.boards.push(action.payload)
      state.boards = adminService.sortBoards(state.boards)
    },
    
    updateBoard: (state, action: PayloadAction<Board>) => {
      const index = state.boards.findIndex(b => b.id === action.payload.id)
      if (index !== -1) {
        state.boards[index] = action.payload
      }
    },
    
    removeBoard: (state, action: PayloadAction<string>) => {
      state.boards = state.boards.filter(b => b.id !== action.payload)
    },
    
    addStandard: (state, action: PayloadAction<Standard>) => {
      state.standards.push(action.payload)
      state.standards = adminService.sortStandards(state.standards)
    },
    
    updateStandard: (state, action: PayloadAction<Standard>) => {
      const index = state.standards.findIndex(s => s.id === action.payload.id)
      if (index !== -1) {
        state.standards[index] = action.payload
      }
    },
    
    removeStandard: (state, action: PayloadAction<string>) => {
      state.standards = state.standards.filter(s => s.id !== action.payload)
    },
    
    addMedium: (state, action: PayloadAction<Medium>) => {
      state.mediums.push(action.payload)
      state.mediums = adminService.sortMediums(state.mediums)
    },
    
    updateMedium: (state, action: PayloadAction<Medium>) => {
      const index = state.mediums.findIndex(m => m.id === action.payload.id)
      if (index !== -1) {
        state.mediums[index] = action.payload
      }
    },
    
    removeMedium: (state, action: PayloadAction<string>) => {
      state.mediums = state.mediums.filter(m => m.id !== action.payload)
    },
    
    addCurriculumEntry: (state, action: PayloadAction<CurriculumEntry>) => {
      state.curriculum.push(action.payload)
    },
    
    updateCurriculumEntry: (state, action: PayloadAction<CurriculumEntry>) => {
      const index = state.curriculum.findIndex(c => c.id === action.payload.id)
      if (index !== -1) {
        state.curriculum[index] = action.payload
      }
    },
    
    removeCurriculumEntry: (state, action: PayloadAction<number>) => {
      state.curriculum = state.curriculum.filter(c => c.id !== action.payload)
    },
    
    addChapter: (state, action: PayloadAction<Chapter>) => {
      state.chapters.push(action.payload)
      state.chapters = adminService.sortChapters(state.chapters)
    },
    
    updateChapter: (state, action: PayloadAction<Chapter>) => {
      const index = state.chapters.findIndex(c => c.id === action.payload.id)
      if (index !== -1) {
        state.chapters[index] = action.payload
      }
    },
    
    removeChapter: (state, action: PayloadAction<number>) => {
      state.chapters = state.chapters.filter(c => c.id !== action.payload)
    },
    
    updateStudentLocal: (state, action: PayloadAction<StudentUser>) => {
      const index = state.students.findIndex(s => s.id === action.payload.id)
      if (index !== -1) {
        state.students[index] = action.payload
      }
    },
    
    removeStudents: (state, action: PayloadAction<string[]>) => {
      const idsToRemove = new Set(action.payload)
      state.students = state.students.filter(s => !idsToRemove.has(s.id))
    },
    
    addHelper: (state, action: PayloadAction<DrishtiHelper>) => {
      state.helpers.push(action.payload)
    },
    
    updateHelper: (state, action: PayloadAction<DrishtiHelper>) => {
      const index = state.helpers.findIndex(h => h.id === action.payload.id)
      if (index !== -1) {
        state.helpers[index] = action.payload
      }
    },
    
    removeHelper: (state, action: PayloadAction<number>) => {
      state.helpers = state.helpers.filter(h => h.id !== action.payload)
    },
  },
  
  extraReducers: (builder) => {
    // ── Auth ──
    builder
      .addCase(adminLogin.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.token = action.payload.token
        state.user = action.payload.user
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      .addCase(adminSetup.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(adminSetup.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.token = action.payload.token
        state.user = action.payload.user
      })
      .addCase(adminSetup.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      .addCase(initializeAdmin.pending, (state) => {
        state.isLoading = true
      })
      .addCase(initializeAdmin.fulfilled, (state, action) => {
        state.isLoading = false
        state.isInitialized = true
        if (action.payload) {
          state.user = action.payload
          state.isAuthenticated = true
        }
      })
      .addCase(initializeAdmin.rejected, (state) => {
        state.isLoading = false
        state.isInitialized = true
        state.isAuthenticated = false
        state.user = null
        state.token = null
      })
    
    // ── Curriculum ──
    builder
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.boards = action.payload
      })
      .addCase(fetchStandards.fulfilled, (state, action) => {
        state.standards = action.payload
      })
      .addCase(fetchMediums.fulfilled, (state, action) => {
        state.mediums = action.payload
      })
      .addCase(fetchCurriculum.fulfilled, (state, action) => {
        state.curriculum = action.payload
      })
      .addCase(fetchChapters.fulfilled, (state, action) => {
        state.chapters = action.payload
      })
    
    // ── Users ──
    builder
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.students = action.payload
      })
      .addCase(fetchHelpers.fulfilled, (state, action) => {
        state.helpers = action.payload
      })
    
    // ── AI Config ──
    builder
      .addCase(fetchAIConfig.fulfilled, (state, action) => {
        state.aiRouting = action.payload.routing
        state.aiKeySlots = action.payload.keys
      })
      .addCase(fetchAIUsage.fulfilled, (state, action) => {
        state.aiUsage = action.payload
      })
  },
})

// ── Export Actions ──
export const {
  logout,
  clearError,
  setActiveSection,
  toggleSidebar,
  setSidebarCollapsed,
  setSearchQuery,
  addBoard,
  updateBoard,
  removeBoard,
  addStandard,
  updateStandard,
  removeStandard,
  addMedium,
  updateMedium,
  removeMedium,
  addCurriculumEntry,
  updateCurriculumEntry,
  removeCurriculumEntry,
  addChapter,
  updateChapter,
  removeChapter,
  updateStudentLocal,
  removeStudents,
  addHelper,
  updateHelper,
  removeHelper,
} = adminSlice.actions

// ── Export Reducer ──
export default adminSlice.reducer
