// ─── LearnTV Page ─────────────────────────────────────────────
// Live educational TV streaming
// Uses Redux for user data and delegates to existing UI

import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/store'
import { Loader } from '@/shared/components/Loader'

// Import existing tab component
// @ts-ignore - JSX component
import LearnTVTabLegacy from '../../../components/tabs/LearnTVTab'

/**
 * LearnTVPage - Redux-connected wrapper for LearnTV feature
 */
const LearnTVPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader size="lg" />
        <p className="text-app-muted mt-3 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <LearnTVTabLegacy
      profile={user}
    />
  )
}

export default LearnTVPage
