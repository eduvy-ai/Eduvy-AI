// ─── Notebook Page ────────────────────────────────────────────
// Main page component for NotebookLM-style feature
// Uses Redux hooks and delegates to existing UI components

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/store'

// Import existing tab component (will be gradually migrated)
// @ts-ignore - JSX component
import NotebookTabLegacy from '../../../components/tabs/NotebookTab'

/**
 * NotebookPage - Redux-connected wrapper for Notebook feature
 * 
 * This component:
 * 1. Gets user data from Redux
 * 2. Passes data as props to the legacy NotebookTab component
 * 3. Will be the foundation for full TypeScript migration
 */
const NotebookPage: React.FC = () => {
  // Get auth state
  const { user } = useSelector((state: RootState) => state.auth)

  // Document context state (required by legacy component)
  const [docCtx, setDocCtx] = useState<string>('')
  const [docName, setDocName] = useState<string>('')

  // Create addXp function (placeholder - XP is managed by backend)
  const addXp = async (_points: number) => {
    // XP is added via backend when actions complete
  }

  // Pass through to legacy component
  return (
    <NotebookTabLegacy
      profile={user}
      userId={user?.id || ''}
      addXp={addXp}
      docCtx={docCtx}
      setDocCtx={setDocCtx}
      docName={docName}
      setDocName={setDocName}
    />
  )
}

export default NotebookPage
