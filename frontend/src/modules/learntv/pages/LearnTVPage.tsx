// ─── LearnTV Page ─────────────────────────────────────────────
// Live educational TV streaming
// Uses Redux for user data and delegates to existing UI

import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/store'

// Import existing tab component
// @ts-ignore - JSX component
import LearnTVTabLegacy from '../../../components/tabs/LearnTVTab'

/**
 * LearnTVPage - Redux-connected wrapper for LearnTV feature
 */
const LearnTVPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  return (
    <LearnTVTabLegacy
      profile={user}
    />
  )
}

export default LearnTVPage
