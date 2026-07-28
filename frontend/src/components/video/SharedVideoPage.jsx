// SharedVideoPage.jsx — Public page to view a shared video (no auth required)
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiVideoPublic } from '../../api.js'
import { API_BASE_URL } from '../../config.ts'
import VideoPlayer from './VideoPlayer.jsx'

function mediaUrl(path) {
  if (!path) return null
  const p = String(path).replace(/\\/g, '/')
  if (/^https?:\/\//i.test(p)) return p
  return `${API_BASE_URL}${p.startsWith('/') ? '' : '/'}${p}`
}

export default function SharedVideoPage() {
  const { token } = useParams()
  const [video, setVideo] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    apiVideoPublic(token)
      .then(setVideo)
      .catch(err => setError(err.message || 'Video not found'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04040e] flex items-center justify-center">
        <div className="text-white/60 text-sm">Loading video…</div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-[#04040e] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-400 text-sm">{error || 'Video not found'}</p>
        <Link to="/" className="text-blue-400 text-sm underline">← Go Home</Link>
      </div>
    )
  }

  const videoUrl = mediaUrl(video.file_path)
  const thumbUrl = mediaUrl(video.thumb_path)

  return (
    <div className="min-h-screen bg-[#04040e] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-white text-lg font-semibold mb-4 font-[Sora]">
          {video.title || 'Shared Video'}
        </h1>
        <VideoPlayer
          videoUrl={videoUrl}
          thumbUrl={thumbUrl}
          title={video.title}
          shareUrl={window.location.href}
        />
        <div className="mt-6 text-center">
          <Link to="/" className="text-blue-400 text-xs underline">
            Powered by Eduvy-AI — Start learning free →
          </Link>
        </div>
      </div>
    </div>
  )
}
