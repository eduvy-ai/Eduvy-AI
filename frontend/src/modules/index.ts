// ─── Modules Index ────────────────────────────────────────────
// Re-export all feature modules as namespaces to avoid name collisions
// Import specific items from individual modules when needed

// Re-export individual modules - consumers should import from the specific module
// to avoid naming conflicts (e.g., multiple modules have clearError)

export * as auth from './auth'
export * as profile from './profile'
export * as home from './home'
export * as notebook from './notebook'
export * as videos from './videos'
export * as learntv from './learntv'
export * as sathi from './sathi'
export * as bhool from './bhool'
export * as muqabla from './muqabla'
export * as labs from './labs'
export * as parent from './parent'

// Re-export reducers for rootReducer.ts
export { default as authReducer } from './auth/slice'
export { default as profileReducer } from './profile/slice'
export { default as notebookReducer } from './notebook/slice'
export { default as sathiReducer } from './sathi/slice'
export { default as bhoolReducer } from './bhool/slice'
export { default as muqablaReducer } from './muqabla/slice'

// Re-export API objects for convenience
export { authApi } from './auth'
export { profileApi } from './profile'
export { notebookApi } from './notebook'
export { sathiApi } from './sathi'
export { bhoolApi } from './bhool'
export { muqablaApi } from './muqabla'
export { parentApi } from './parent'
