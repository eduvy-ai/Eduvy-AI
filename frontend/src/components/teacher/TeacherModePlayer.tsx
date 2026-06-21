// ─── Teacher Mode Player Component ───────────────────────────────
// Full-screen immersive audio-guided explanation experience.
// Displays content with karaoke word highlighting synced to neural TTS audio.

import { FC, useState, useRef, useEffect, useCallback } from 'react'
import { KaraokeText } from './KaraokeText'
import { BeatControls } from './BeatControls'
import { studyCoachApi } from '../../modules/studycoach/api'
import type { TeacherAudioResponse, TeacherBeat, StudyCoachResponse } from '../../modules/studycoach/types'

interface Props {
  /** Study Coach response to explain */
  studyCoachResponse: StudyCoachResponse
  /** Called when user closes Teacher Mode */
  onClose: () => void
  /** User's preferred language */
  language?: string
}

const SECTION_LABELS: Record<string, { icon: string; label: string }> = {
  overview: { icon: '📖', label: 'Concept Overview' },
  takeaways: { icon: '💡', label: 'Key Takeaways' },
  example: { icon: '🌍', label: 'Real World Example' },
  exam_notes: { icon: '📝', label: 'Exam Notes' },
}

export const TeacherModePlayer: FC<Props> = ({
  studyCoachResponse,
  onClose,
  language = 'English',
}) => {
  const [audioData, setAudioData] = useState<TeacherAudioResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timeUpdateIntervalRef = useRef<number | null>(null)

  // Generate audio on mount
  useEffect(() => {
    const generateAudio = async () => {
      try {
        setIsGenerating(true)
        setError(null)
        
        const response = await studyCoachApi.generateTeacherAudio({
          content: studyCoachResponse.overview,
          full_lesson: true,
          study_coach_response: studyCoachResponse,
          language,
        })
        
        setAudioData(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate audio')
      } finally {
        setIsGenerating(false)
      }
    }
    
    generateAudio()
  }, [studyCoachResponse, language])

  // Current beat
  const currentBeat: TeacherBeat | null = audioData?.beats[currentBeatIndex] ?? null

  // Calculate cumulative time offset for current beat
  const beatStartTimeMs = audioData?.beats
    .slice(0, currentBeatIndex)
    .reduce((acc, beat) => acc + beat.duration_ms, 0) ?? 0

  // Audio playback handlers
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !currentBeat) return
    
    if (isPlaying) {
      audioRef.current.pause()
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
        timeUpdateIntervalRef.current = null
      }
    } else {
      audioRef.current.play()
      // Update time more frequently for smooth highlighting
      timeUpdateIntervalRef.current = window.setInterval(() => {
        if (audioRef.current) {
          const audioTimeMs = audioRef.current.currentTime * 1000
          setCurrentTimeMs(beatStartTimeMs + audioTimeMs)
        }
      }, 50)
    }
    
    setIsPlaying(!isPlaying)
  }, [isPlaying, currentBeat, beatStartTimeMs])

  // Handle audio ended
  const handleAudioEnded = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current)
      timeUpdateIntervalRef.current = null
    }
    
    // Move to next beat if available
    if (audioData && currentBeatIndex < audioData.beats.length - 1) {
      setCurrentBeatIndex(prev => prev + 1)
      setIsPlaying(false)
      // Auto-play next beat after a short pause
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play()
          setIsPlaying(true)
          timeUpdateIntervalRef.current = window.setInterval(() => {
            if (audioRef.current) {
              const newBeatStart = audioData.beats
                .slice(0, currentBeatIndex + 1)
                .reduce((acc, beat) => acc + beat.duration_ms, 0)
              setCurrentTimeMs(newBeatStart + audioRef.current.currentTime * 1000)
            }
          }, 50)
        }
      }, 300)
    } else {
      setIsPlaying(false)
    }
  }, [audioData, currentBeatIndex])

  // Update audio source when beat changes
  useEffect(() => {
    if (currentBeat && audioRef.current) {
      audioRef.current.src = currentBeat.audio_url
      audioRef.current.playbackRate = playbackSpeed
      audioRef.current.load()
    }
  }, [currentBeat?.id, playbackSpeed])

  // Step navigation
  const handleStepBack = useCallback(() => {
    if (currentBeatIndex > 0) {
      setCurrentBeatIndex(prev => prev - 1)
      setIsPlaying(false)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
        timeUpdateIntervalRef.current = null
      }
    }
  }, [currentBeatIndex])

  const handleStepForward = useCallback(() => {
    if (audioData && currentBeatIndex < audioData.beats.length - 1) {
      setCurrentBeatIndex(prev => prev + 1)
      setIsPlaying(false)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
        timeUpdateIntervalRef.current = null
      }
    }
  }, [audioData, currentBeatIndex])

  // Speed change
  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
      }
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        handlePlayPause()
      } else if (e.key === 'ArrowLeft') {
        handleStepBack()
      } else if (e.key === 'ArrowRight') {
        handleStepForward()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePlayPause, handleStepBack, handleStepForward, onClose])

  // Get relative time within current beat for word highlighting
  const beatRelativeTimeMs = currentTimeMs - beatStartTimeMs

  return (
    <div className="fixed inset-0 z-50 bg-app-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-app-border bg-app-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-app-green/20 flex items-center justify-center">
            <span className="text-xl">🎓</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-app-text">Teacher Mode</h1>
            <p className="text-xs text-app-muted">{studyCoachResponse.title}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-app-card2 transition-colors"
          title="Close (Esc)"
        >
          <svg className="w-6 h-6 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          {/* Loading State */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-16 h-16 border-4 border-app-green/30 border-t-app-green rounded-full animate-spin" />
              <p className="text-app-muted">Preparing your lesson...</p>
              <p className="text-xs text-app-muted/60">Generating natural voice narration</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-app-red/15 border border-app-red/30 rounded-xl p-6 text-center">
              <p className="text-app-red mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-app-red/20 hover:bg-app-red/30 rounded-lg text-app-red transition-colors"
              >
                Go Back
              </button>
            </div>
          )}

          {/* Content Display */}
          {audioData && currentBeat && (
            <div className="space-y-6">
              {/* Section Label */}
              <div className="flex items-center gap-2">
                <span className="text-2xl">{SECTION_LABELS[currentBeat.section]?.icon ?? '📚'}</span>
                <span className="text-sm font-semibold text-app-green">
                  {SECTION_LABELS[currentBeat.section]?.label ?? 'Learning'}
                </span>
              </div>

              {/* Text with Karaoke Highlighting */}
              <div className="bg-app-card border border-app-border rounded-2xl p-6">
                <KaraokeText
                  text={currentBeat.text}
                  wordTimings={currentBeat.word_timings}
                  currentTimeMs={beatRelativeTimeMs}
                  isPlaying={isPlaying}
                  accentColor="#00E5A0"
                />
              </div>

              {/* Hidden Audio Element */}
              <audio
                ref={audioRef}
                onEnded={handleAudioEnded}
                preload="auto"
              />
            </div>
          )}
        </div>
      </main>

      {/* Controls Footer */}
      {audioData && (
        <footer className="p-4 border-t border-app-border bg-app-card">
          <div className="max-w-md mx-auto">
            <BeatControls
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onStepBack={handleStepBack}
              onStepForward={handleStepForward}
              playbackSpeed={playbackSpeed}
              onSpeedChange={handleSpeedChange}
              currentBeatIndex={currentBeatIndex}
              totalBeats={audioData.beats.length}
              currentTimeMs={currentTimeMs}
              totalDurationMs={audioData.total_duration_ms}
              disabled={isGenerating}
            />
          </div>
        </footer>
      )}

      {/* Keyboard Hints */}
      <div className="fixed bottom-4 left-4 text-xs text-app-muted/50 hidden md:block">
        <kbd className="px-1.5 py-0.5 bg-app-card2 rounded">Space</kbd> Play/Pause
        <span className="mx-2">|</span>
        <kbd className="px-1.5 py-0.5 bg-app-card2 rounded">←</kbd>
        <kbd className="px-1.5 py-0.5 bg-app-card2 rounded ml-1">→</kbd> Navigate
        <span className="mx-2">|</span>
        <kbd className="px-1.5 py-0.5 bg-app-card2 rounded">Esc</kbd> Close
      </div>
    </div>
  )
}

export default TeacherModePlayer
