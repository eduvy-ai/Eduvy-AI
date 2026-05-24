// ─── Tutor Page ───────────────────────────────────────────────
// AI Tutor chat interface
// Uses Redux for user data and delegates to existing UI

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/store'

// Import existing tab component
// @ts-ignore - JSX component
import TutorTabLegacy from '../../../components/tabs/TutorTab'

/**
 * TutorPage - Redux-connected wrapper for AI Tutor
 */
const TutorPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  
  // Document context for tutor (shared with notebook)
  const [docCtx] = useState<string>('')

  // Create addXp function (placeholder - XP is managed by backend)
  const addXp = async (_points: number) => {
    // XP is added via backend when actions complete
  }

  return (
    <TutorTabLegacy
      profile={user}
      userId={user?.id || ''}
      addXp={addXp}
      docCtx={docCtx}
    />
  )
}

export default TutorPage
