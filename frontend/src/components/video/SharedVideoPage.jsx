// SharedVideoPage.jsx — Public page to view a shared video (no auth required)
import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { apiVideoPublic } from '../../api.js'
import { li } from '../../i18n/index.js'
import { SUPPORTED_LANGS } from '../../i18n/languages.js'
import { mediaUrl } from '../../shared/utils/helpers'
import VideoPlayer from './VideoPlayer.jsx'

function detectLang() {
  const browserLang = (navigator.language || '').split('-')[0].toLowerCase()
  const mapping = { hi: 'Hindi', gu: 'Gujarati', mr: 'Marathi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', bn: 'Bengali', pa: 'Punjabi', or: 'Odia', ur: 'Urdu' }
  return mapping[browserLang] || 'English'
}

export default function SharedVideoPage() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const [video, setVideo] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const langParam = searchParams.get('lang')
  const lang = (langParam && SUPPORTED_LANGS.includes(langParam)) ? langParam : detectLang()
  const ui = li(lang)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    apiVideoPublic(token)
      .then(setVideo)
      .catch(err => setError(err.message || ui.videoNotFound || 'Video not found'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D1F] flex items-center justify-center">
        <div className="text-white/60 text-sm">{ui.loadingVideo || 'Loading video…'}</div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-[#0D0D1F] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-400 text-sm">{error || ui.videoNotFound || 'Video not found'}</p>
        <Link to="/" className="text-blue-400 text-sm underline">{ui.goHome || '← Go Home'}</Link>
      </div>
    )
  }

  const videoUrl = mediaUrl(video.file_path)
  const thumbUrl = mediaUrl(video.thumb_path)

  return (
    <div className="min-h-screen bg-[#0D0D1F] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-white text-lg font-semibold mb-4 font-[Sora]">
          {video.title || ui.sharedVideo || 'Shared Video'}
        </h1>
        <VideoPlayer
          videoUrl={videoUrl}
          thumbUrl={thumbUrl}
          title={video.title}
          shareUrl={window.location.href}
          lang={lang}
        />
        <div className="mt-6 text-center">
          <Link to="/" className="text-blue-400 text-xs underline">
            {ui.poweredByEduvy || 'Powered by Eduvy-AI — Start learning free →'}
          </Link>
        </div>
      </div>
    </div>
  )
}
