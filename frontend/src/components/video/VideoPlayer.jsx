// VideoPlayer.jsx — HTML5 video player with download & share
import { useState } from 'react'

export default function VideoPlayer({ videoUrl, thumbUrl, title, shareUrl, onShare }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback: select input
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Player */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-lg">
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={thumbUrl || undefined}
            controls
            className="w-full h-full"
            preload="metadata"
          >
            Your browser does not support video playback.
          </video>
        ) : (
          <div className="flex items-center justify-center w-full h-full text-app-muted text-sm">
            {thumbUrl ? (
              <img src={thumbUrl} alt="Video thumbnail" className="object-cover w-full h-full opacity-60" />
            ) : (
              <span>⏳ Video is being rendered…</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {videoUrl && (
          <a
            href={videoUrl}
            download={`${title || 'video'}.mp4`}
            className="flex items-center gap-2 px-4 py-2 bg-app-green text-app-bg text-sm rounded-lg hover:opacity-80 transition-colors font-semibold"
          >
            ⬇️ Download MP4
          </a>
        )}

        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-2 px-4 py-2 bg-app-blue/20 text-app-blue border border-app-blue/30 text-sm rounded-lg hover:bg-app-blue/30 transition-colors font-semibold"
          >
            🔗 Get Share Link
          </button>
        )}

        {shareUrl && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 min-w-0 text-xs border border-app-border rounded-lg px-3 py-2 bg-app-card2 text-app-muted truncate"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 text-xs bg-app-card2 border border-app-border text-app-text rounded-lg hover:bg-white/10 transition-colors shrink-0"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
