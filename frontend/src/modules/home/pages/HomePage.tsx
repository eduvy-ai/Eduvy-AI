// ─── Home Page ────────────────────────────────────────────────
// Main dashboard/home page
// Uses Redux for user data and delegates to existing UI

import React, { useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { RootState, AppDispatch } from '../../../redux/store'
import { addXpLocal } from '../../auth/slice'
import { apiAddXp } from '../../../api'

// Import existing tab component
// @ts-ignore - JSX component
import HomeTabLegacy from '../../../components/tabs/HomeTab'

/**
 * HomePage - Redux-connected wrapper for Home dashboard
 */
const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)

  // Add XP to user profile (backend + local Redux)
  const addXp = useCallback(async (points: number) => {
    if (!user?.id || points <= 0) return
    
    // Optimistically update local state
    dispatch(addXpLocal(points))
    
    // Send to backend (fire and forget, no blocking)
    try {
      await apiAddXp(user.id, points)
    } catch (err) {
      // Silent fail - XP sync will catch up on next login
      console.warn('XP sync failed:', err)
    }
  }, [dispatch, user?.id])

  // Navigate to other tabs and save last visited
  const setTab = useCallback((tab: string) => {
    // Save last visited tab for "Continue Learning" feature
    try {
      localStorage.setItem('eduvyai_last_tab', tab)
    } catch {}
    navigate(`/app/${tab}`)
  }, [navigate])

  return (
    <HomeTabLegacy
      profile={user}
      userId={user?.id || ''}
      xp={user?.xp || 0}
      streak={user?.streak || 0}
      addXp={addXp}
      setTab={setTab}
    />
  )
}

export default HomePage
