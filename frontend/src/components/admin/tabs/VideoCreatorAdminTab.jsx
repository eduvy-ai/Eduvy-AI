// VideoCreatorAdminTab.jsx — Admin-only wrapper for VideoCreator
// Uses the admin auth token for API calls instead of the student token.
import { useState } from 'react'
import VideoCreatorTab from '../../tabs/VideoCreatorTab'

export default function VideoCreatorAdminTab({ toast }) {
  const [usePipeline, setUsePipeline] = useState(true)

  return (
    <div className="admin-video-creator">
      <div className="mb-4 p-3 rounded-lg bg-app-green/10 border border-app-green/30">
        <p className="text-app-green text-sm font-medium m-0">
          🎬 Video Creator — Admin Only
        </p>
        <p className="text-app-muted text-xs mt-1 m-0">
          Generate educational whiteboard videos. This feature is restricted to admin and super admin users.
        </p>
      </div>

      {/* Pipeline toggle */}
      <div className="mb-4 flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={usePipeline}
            onChange={(e) => setUsePipeline(e.target.checked)}
            className="w-4 h-4 accent-[#00e5a0] rounded"
          />
          <span className="text-app-text text-sm font-medium">
            Two-Stage Pipeline
          </span>
        </label>
        <span className="text-app-muted text-xs">
          {usePipeline
            ? '✨ Enhanced: Lesson Plan → Script → Video (better quality)'
            : '⚡ Legacy: Single-shot generation (faster)'}
        </span>
      </div>

      <VideoCreatorTab profile={null} isAdmin={true} usePipeline={usePipeline} />
    </div>
  )
}
