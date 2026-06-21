// ─── Inline Explain Button ───────────────────────────────────
// A small button to trigger audio explanation for a single section.

import { FC, useState, useRef } from 'react'
import { studyCoachApi } from '../../modules/studycoach/api'

interface Props {
  /** Content to explain */
  content: string
  /** Section name */
  section?: string
  /** Language for TTS */
  language?: string
  /** Accent color for highlighting */
  accentColor?: string
}

/**
 * Inline button that triggers audio playback with word highlighting.
 * Can be placed next to any text section for quick explanation.
 */
export const InlineExplainButton: FC<Props> = ({
  content,
  section = 'content',
  language = 'English',
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleClick = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    if (audioRef.current?.src) {
      // Resume existing audio
      audioRef.current.play()
      setIsPlaying(true)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await studyCoachApi.generateTeacherAudio({
        content,
        section,
        language,
      })

      if (response.beats.length > 0) {
        const firstBeat = response.beats[0]
        if (audioRef.current) {
          audioRef.current.src = firstBeat.audio_url
          audioRef.current.load()
          await audioRef.current.play()
          setIsPlaying(true)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
  }

  return (
    <div className="inline-flex items-center">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
          transition-all duration-200
          ${isPlaying 
            ? 'bg-app-green text-white shadow-lg shadow-app-green/30' 
            : 'bg-app-card2 text-app-muted hover:text-app-green hover:bg-app-green/10'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title={isPlaying ? 'Pause' : 'Listen to explanation'}
      >
        {isLoading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </>
        ) : isPlaying ? (
          <>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            <span>Pause</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
            <span>Explain</span>
          </>
        )}
      </button>
      
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        preload="none"
      />
      
      {/* Error tooltip */}
      {error && (
        <span className="ml-2 text-xs text-app-red">{error}</span>
      )}
    </div>
  )
}

export default InlineExplainButton
