// ─── Muqabla Page ─────────────────────────────────────────────
// Main page component for Battle Arena
// Uses Redux hooks and delegates to existing UI components

import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/store'

// Import existing tab component (will be gradually migrated)
// @ts-ignore - JSX component
import MuqablaTabLegacy from '../../../components/tabs/MuqablaTab'

/**
 * MuqablaPage - Redux-connected wrapper for Battle Arena
 * 
 * This component:
 * 1. Gets user data from Redux
 * 2. Passes data as props to the legacy MuqablaTab component
 * 3. Will be the foundation for full TypeScript migration
 */
const MuqablaPage: React.FC = () => {
  // Get auth state
  const { user } = useSelector((state: RootState) => state.auth)

  // Pass through to legacy component
  return (
    <MuqablaTabLegacy
      profile={user}
      userId={user?.id || ''}
    />
  )
}

export default MuqablaPage
