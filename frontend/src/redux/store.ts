// ─── Redux Store Configuration ────────────────────────────────
// Central store setup with Redux Toolkit

import { configureStore } from '@reduxjs/toolkit'
import rootReducer from './rootReducer'

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ['auth/login/fulfilled', 'auth/register/fulfilled'],
      },
    }),
  devTools: import.meta.env.DEV,
})

// Infer types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
