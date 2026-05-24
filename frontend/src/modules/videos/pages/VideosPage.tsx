// ─── Videos Page ──────────────────────────────────────────────
// Educational videos player
// Uses Redux for user data and delegates to existing UI

import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/store'

// Import existing tab component
// @ts-ignore - JSX component
import VideosTabLegacy from '../../../components/tabs/VideosTab'

/**
 * VideosPage - Redux-connected wrapper for Videos feature
 */
const VideosPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  // Create addXp function (placeholder - XP is managed by backend)
  const addXp = async (_points: number) => {
    // XP is added via backend when actions complete
  }

  return (
    <VideosTabLegacy
      profile={user}
      userId={user?.id || ''}
      addXp={addXp}
    />
  )
}

export default VideosPage
