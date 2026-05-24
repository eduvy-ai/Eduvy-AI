// ─── Home Page ────────────────────────────────────────────────
// Main dashboard/home page
// Uses Redux for user data and delegates to existing UI

import React from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { RootState } from '../../../redux/store'

// Import existing tab component
// @ts-ignore - JSX component
import HomeTabLegacy from '../../../components/tabs/HomeTab'

/**
 * HomePage - Redux-connected wrapper for Home dashboard
 */
const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)

  // Create addXp function (placeholder - XP is managed by backend)
  const addXp = async (_points: number) => {
    // XP is added via backend when actions complete
  }

  // Navigate to other tabs
  const setTab = (tab: string) => {
    navigate(`/app/${tab}`)
  }

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
