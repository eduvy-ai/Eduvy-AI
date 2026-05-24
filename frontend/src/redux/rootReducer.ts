// ─── Root Reducer ─────────────────────────────────────────────
// Combines all module reducers into a single root reducer

import { combineReducers } from '@reduxjs/toolkit'
import authReducer from '../modules/auth/slice'
import profileReducer from '../modules/profile/slice'
import notebookReducer from '../modules/notebook/slice'
import sathiReducer from '../modules/sathi/slice'
import bhoolReducer from '../modules/bhool/slice'
import muqablaReducer from '../modules/muqabla/slice'

const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  notebook: notebookReducer,
  sathi: sathiReducer,
  bhool: bhoolReducer,
  muqabla: muqablaReducer,
})

export default rootReducer
