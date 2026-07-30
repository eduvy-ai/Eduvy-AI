// ─── Notebook Page ────────────────────────────────────────────
// Main page component for NotebookLM-style feature
// Uses Redux hooks and delegates to existing UI components

import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../../../redux/store'
import { setDocContext } from '../slice'

// Import existing tab component (will be gradually migrated)
// @ts-ignore - JSX component
import NotebookTabLegacy from '../../../components/tabs/NotebookTab'

/**
 * NotebookPage - Redux-connected wrapper for Notebook feature
 * 
 * This component:
 * 1. Gets user data from Redux
 * 2. Shares docCtx/docName via Redux so Labs can access it
 * 3. Passes data as props to the legacy NotebookTab component
 */
const NotebookPage: React.FC = () => {
  // Get auth state
  const { user } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch()

  // Document context from Redux (shared with Labs)
  const { docCtx, docName } = useSelector((state: RootState) => state.notebook)

  const handleSetDocCtx = (ctx: string) => {
    dispatch(setDocContext({ docCtx: ctx, docName }))
  }
  const handleSetDocName = (name: string) => {
    dispatch(setDocContext({ docCtx, docName: name }))
  }

  // Create addXp function (placeholder - XP is managed by backend)
  const addXp = async (_points: number) => {
    // XP is added via backend when actions complete
  }

  // Pass through to legacy component
  if (!user) return null
  return (
    <NotebookTabLegacy
      profile={user}
      userId={user?.id || ''}
      addXp={addXp}
      docCtx={docCtx}
      setDocCtx={handleSetDocCtx}
      docName={docName}
      setDocName={handleSetDocName}
    />
  )
}

export default NotebookPage
