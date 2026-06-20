// ─── Video Creator Page ───────────────────────────────────────
// Redux-connected wrapper for the Video Creator tab component.
// Follows the same pattern as TutorPage.

import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/store'

// @ts-ignore - JSX component
import VideoCreatorTab from '../../../components/tabs/VideoCreatorTab'

const VideoCreatorPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  // @ts-expect-error - JSX component accepts any profile shape
  return <VideoCreatorTab profile={user} />
}

export default VideoCreatorPage
