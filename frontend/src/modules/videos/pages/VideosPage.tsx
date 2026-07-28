// ─── Videos Page ──────────────────────────────────────────────
// Educational videos player
// Uses Redux for user data and delegates to existing UI

import React, { useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../../../redux/store'
import { addXpLocal } from '../../auth/slice'
import { apiAddXp } from '../../../api'

// Import existing tab component
// @ts-ignore - JSX component
import VideosTabLegacy from '../../../components/tabs/VideosTab'

/**
 * VideosPage - Redux-connected wrapper for Videos feature
 */
const VideosPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)

  const addXp = useCallback(async (points: number) => {
    if (!user?.id || points <= 0) return
    dispatch(addXpLocal(points))
    try {
      await apiAddXp(user.id, points)
    } catch (err) {
      console.warn('XP sync failed:', err)
    }
  }, [dispatch, user?.id])

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
        Loading...
      </div>
    )
  }

  return (
    <VideosTabLegacy
      profile={user}
      userId={user.id}
      addXp={addXp}
    />
  )
}

export default VideosPage
