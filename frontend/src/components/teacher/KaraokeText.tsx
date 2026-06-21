// ─── Karaoke Text Component ───────────────────────────────────
// Highlights words in sync with audio playback based on word timings.

import { FC, useMemo } from 'react'
import type { WordTiming } from '../../modules/studycoach/types'

interface Props {
  text: string
  wordTimings: WordTiming[]
  currentTimeMs: number
  isPlaying: boolean
  accentColor?: string
}

/**
 * Renders text with karaoke-style word highlighting.
 * Each word gets highlighted when currentTimeMs falls within its timing range.
 */
export const KaraokeText: FC<Props> = ({
  text,
  wordTimings,
  currentTimeMs,
  isPlaying,
  accentColor = '#00E5A0',
}) => {
  // Find the current word index based on time
  const currentWordIndex = useMemo(() => {
    if (!isPlaying || wordTimings.length === 0) return -1
    
    // Binary search for efficiency
    let left = 0
    let right = wordTimings.length - 1
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const timing = wordTimings[mid]
      
      if (currentTimeMs >= timing.start_ms && currentTimeMs < timing.end_ms) {
        return mid
      } else if (currentTimeMs < timing.start_ms) {
        right = mid - 1
      } else {
        left = mid + 1
      }
    }
    
    // If we're past all words, return the last one
    if (wordTimings.length > 0 && currentTimeMs >= wordTimings[wordTimings.length - 1].end_ms) {
      return wordTimings.length - 1
    }
    
    return -1
  }, [wordTimings, currentTimeMs, isPlaying])

  // If no word timings, render plain text
  if (wordTimings.length === 0) {
    return (
      <p className="text-base leading-relaxed text-app-text">
        {text}
      </p>
    )
  }

  // Render with word-level highlighting
  return (
    <p className="text-base leading-loose text-app-text">
      {wordTimings.map((timing, index) => {
        const isCurrentWord = index === currentWordIndex
        const isPastWord = index < currentWordIndex
        
        return (
          <span
            key={`${timing.word}-${index}`}
            className="transition-all duration-100"
            style={{
              backgroundColor: isCurrentWord ? accentColor : 'transparent',
              color: isCurrentWord ? '#000' : isPastWord ? accentColor : 'inherit',
              fontWeight: isCurrentWord ? 800 : isPastWord ? 600 : 'inherit',
              borderRadius: isCurrentWord ? '4px' : '0',
              padding: isCurrentWord ? '2px 6px' : '0',
              boxShadow: isCurrentWord ? `0 0 12px ${accentColor}60` : 'none',
            }}
          >
            {timing.word}
            {/* Add space after each word except the last */}
            {index < wordTimings.length - 1 && ' '}
          </span>
        )
      })}
    </p>
  )
}

export default KaraokeText
