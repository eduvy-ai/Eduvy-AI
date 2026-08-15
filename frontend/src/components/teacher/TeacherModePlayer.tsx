// ─── Teacher Mode Player Component ───────────────────────────────
// Full-screen immersive audio-guided explanation experience.
// Displays content with karaoke word highlighting synced to neural TTS audio.

import { FC, useState, useRef, useEffect, useCallback } from 'react'
import { KaraokeText } from './KaraokeText'
import { BeatControls } from './BeatControls'
import { studyCoachApi } from '../../modules/studycoach/api'
import { fetchAudioBlobUrl } from '../../shared/utils/helpers'
import type { TeacherAudioResponse, TeacherBeat, StudyCoachResponse } from '../../modules/studycoach/types'
import { BookOpen, Lightbulb, GlobeHemisphereWest, ClipboardText, Books, type Icon } from '@phosphor-icons/react'
import { Loader } from '@/shared/components/Loader'

interface Props {
  /** Study Coach response to explain */
  studyCoachResponse: StudyCoachResponse
  /** Called when user closes Teacher Mode */
  onClose: () => void
  /** User's preferred language */
  language?: string
  /** UI translations */
  ui: Record<string, string>
}

const SECTION_ICON: Record<string, Icon> = {
  overview: BookOpen,
  takeaways: Lightbulb,
  example: GlobeHemisphereWest,
  exam_notes: ClipboardText,
}

const SECTION_ICON_DEFAULT: Icon = Books

const SECTION_LABEL_KEYS: Record<string, string> = {
  overview: 'sectionOverview',
  takeaways: 'sectionTakeaways',
  example: 'sectionExample',
  exam_notes: 'sectionExamNotes',
}

export const TeacherModePlayer: FC<Props> = ({
  studyCoachResponse,
  onClose,
  language = 'English',
  ui,
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
      // Fetch audio as blob to bypass WebView cross-origin restrictions
      fetchAudioBlobUrl(currentBeat.audio_url)
        .then(blobUrl => {
          if (audioRef.current) {
            // Revoke previous blob URL to avoid memory leaks
            if (audioRef.current.src.startsWith('blob:')) {
              URL.revokeObjectURL(audioRef.current.src)
            }
            audioRef.current.src = blobUrl
            audioRef.current.playbackRate = playbackSpeed
            audioRef.current.load()
          }
        })
        .catch(err => setError(`Failed to load audio: ${err.message}`))
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
    <div className="fixed inset-0 z-50 bg-app-bg flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-app-border bg-app-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-app-green/20 flex items-center justify-center">
            <span className="text-xl">🎓</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-app-text">{ui.teacherModeTitle}</h1>
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
              <Loader size="lg" />
              <p className="text-app-muted">{ui.preparingLesson}</p>
              <p className="text-xs text-app-muted/60">{ui.generatingNarration}</p>
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
                {ui.goBack}
              </button>
            </div>
          )}

          {/* Content Display */}
          {audioData && currentBeat && (
            <div className="space-y-6">
              {/* Section Label */}
              <div className="flex items-center gap-2">
                {(() => {
                  const IconComponent = SECTION_ICON[currentBeat.section] ?? SECTION_ICON_DEFAULT
                  return <IconComponent size={24} weight="duotone" className="text-app-green" />
                })()}
                <span className="text-sm font-semibold text-app-green">
                  {ui[SECTION_LABEL_KEYS[currentBeat.section]] ?? ui.sectionLearning}
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
                onError={(e) => {
                  const audio = e.currentTarget
                  console.error('Audio error:', audio.error?.message, 'URL:', audio.src)
                  setError(`Audio failed to load: ${audio.error?.message || 'Unknown error'}`)
                }}
                onCanPlay={() => console.log('Audio ready:', currentBeat?.audio_url)}
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
