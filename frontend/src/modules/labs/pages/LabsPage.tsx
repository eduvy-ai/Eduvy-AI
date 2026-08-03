// ─── Labs Page ────────────────────────────────────────────────
// Interactive learning labs (Quiz, Essay, Podcast, etc.)
// Uses Redux for user data and delegates to existing UI

import React from 'react'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import type { RootState } from '../../../redux/store'

// Import existing tab component
// @ts-ignore - JSX component
import LabsTabLegacy from '../../../components/tabs/LabsTab'

/**
 * LabsPage - Redux-connected wrapper for Labs feature
 */
const LabsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const location = useLocation()
  
  // Get initial lab from navigation state (e.g., from Practice tab)
  const initialLab = (location.state as { openLab?: string })?.openLab || null

  // Get document context from notebook Redux state (shared with NotebookPage)
  const { docCtx, docName } = useSelector((state: RootState) => state.notebook)

  // Create addXp function (placeholder - XP is managed by backend)
  const addXp = async (_points: number) => {
    // XP is added via backend when actions complete
  }

  if (!user) return null
  return (
    <LabsTabLegacy
      profile={user}
      userId={user?.id || ''}
      addXp={addXp}
      docCtx={docCtx}
      docName={docName}
      initialLab={initialLab}
    />
  )
}

export default LabsPage
