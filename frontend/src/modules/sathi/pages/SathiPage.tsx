// ─── Sathi Page ───────────────────────────────────────────────
// Main page component for Study Squads feature
// Uses Redux hooks and delegates to existing UI components

import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/store'

// Import existing tab component (will be gradually migrated)
// @ts-ignore - JSX component
import SathiTabLegacy from '../../../components/tabs/SathiTab'

/**
 * SathiPage - Redux-connected wrapper for Study Squads
 * 
 * This component:
 * 1. Gets user data from Redux
 * 2. Passes data as props to the legacy SathiTab component
 * 3. Will be the foundation for full TypeScript migration
 */
const SathiPage: React.FC = () => {
  // Get auth state
  const { user } = useSelector((state: RootState) => state.auth)

  // Create addXp function (placeholder - XP is managed by backend)
  const addXp = async (_points: number) => {
    // XP is added via backend when actions complete
  }

  // Pass through to legacy component
  return (
    <SathiTabLegacy
      profile={user}
      userId={user?.id || ''}
      addXp={addXp}
    />
  )
}

export default SathiPage
