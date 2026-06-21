// ─── Beat Controls Component ───────────────────────────────────
// Playback controls for Teacher Mode: play/pause, step, speed, progress.

import { FC } from 'react'

interface Props {
  isPlaying: boolean
  onPlayPause: () => void
  onStepBack: () => void
  onStepForward: () => void
  playbackSpeed: number
  onSpeedChange: (speed: number) => void
  currentBeatIndex: number
  totalBeats: number
  currentTimeMs: number
  totalDurationMs: number
  disabled?: boolean
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5]

export const BeatControls: FC<Props> = ({
  isPlaying,
  onPlayPause,
  onStepBack,
  onStepForward,
  playbackSpeed,
  onSpeedChange,
  currentBeatIndex,
  totalBeats,
  currentTimeMs,
  totalDurationMs,
  disabled = false,
}) => {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progressPercent = totalDurationMs > 0 ? (currentTimeMs / totalDurationMs) * 100 : 0

  return (
    <div className="bg-app-card border border-app-border rounded-2xl p-4 space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-2 bg-app-card2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-app-green to-emerald-400 transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-app-muted">
          <span>{formatTime(currentTimeMs)}</span>
          <span>{formatTime(totalDurationMs)}</span>
        </div>
      </div>

      {/* Beat Indicators */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalBeats }).map((_, index) => (
          <div
            key={index}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
              index === currentBeatIndex
                ? 'bg-app-green scale-125 shadow-lg shadow-app-green/30'
                : index < currentBeatIndex
                ? 'bg-app-green/50'
                : 'bg-app-muted/30'
            }`}
          />
        ))}
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Step Back */}
        <button
          onClick={onStepBack}
          disabled={disabled || currentBeatIndex === 0}
          className="p-3 rounded-full bg-app-card2 hover:bg-app-card2/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous beat"
        >
          <svg className="w-5 h-5 text-app-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          disabled={disabled}
          className="p-4 rounded-full bg-app-green hover:bg-app-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-app-green/20"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Step Forward */}
        <button
          onClick={onStepForward}
          disabled={disabled || currentBeatIndex >= totalBeats - 1}
          className="p-3 rounded-full bg-app-card2 hover:bg-app-card2/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next beat"
        >
          <svg className="w-5 h-5 text-app-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Speed Control */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-app-muted">Speed:</span>
        <div className="flex gap-1">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              disabled={disabled}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                playbackSpeed === speed
                  ? 'bg-app-green text-white font-semibold'
                  : 'bg-app-card2 text-app-muted hover:text-app-text'
              } disabled:opacity-50`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Beat Counter */}
      <div className="text-center text-xs text-app-muted">
        Beat {currentBeatIndex + 1} of {totalBeats}
      </div>
    </div>
  )
}

export default BeatControls
