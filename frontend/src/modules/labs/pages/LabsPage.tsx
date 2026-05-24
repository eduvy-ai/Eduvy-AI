// ─── Labs Page ────────────────────────────────────────────────
// Interactive learning labs (Quiz, Essay, Podcast, etc.)
// Uses Redux for user data and delegates to existing UI

import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/store'

// Import existing tab component
// @ts-ignore - JSX component
import LabsTabLegacy from '../../../components/tabs/LabsTab'

/**
 * LabsPage - Redux-connected wrapper for Labs feature
 */
const LabsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  // Create addXp function (placeholder - XP is managed by backend)
  const addXp = async (_points: number) => {
    // XP is added via backend when actions complete
  }

  return (
    <LabsTabLegacy
      profile={user}
      userId={user?.id || ''}
      addXp={addXp}
    />
  )
}

export default LabsPage
