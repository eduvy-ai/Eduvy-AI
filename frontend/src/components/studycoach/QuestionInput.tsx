// ─── Question Input Component ───────────────────────────────────

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { MODE_INFO, type StudyCoachMode } from '../../modules/studycoach'

interface QuestionInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  placeholder?: string
  currentMode: StudyCoachMode
  onModeChange: (mode: StudyCoachMode) => void
}

const modes: StudyCoachMode[] = [
  'study_coach',
  'study_coach_eli10',
  'study_coach_exam',
  'study_coach_coding',
  'study_coach_revision',
]

const DROPDOWN_HEIGHT = 280 // Approximate height of dropdown (5 items × ~56px)

export default function QuestionInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = 'Ask me anything...',
  currentMode,
  onModeChange,
}: QuestionInputProps) {
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!isLoading && value.trim()) {
          onSubmit()
        }
      }
    },
    [isLoading, value, onSubmit]
  )

  // Calculate dropdown position when opening
  const toggleDropdown = useCallback(() => {
    if (!showModeDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      
      // Open upward if more space above OR not enough space below
      setOpenUpward(spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow)
    }
    setShowModeDropdown(!showModeDropdown)
  }, [showModeDropdown])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentModeInfo = MODE_INFO[currentMode]

  return (
    <div className="relative bg-app-card2 border border-app-border rounded-2xl">
      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={3}
        className="
          w-full px-4 py-3
          bg-transparent
          text-app-text placeholder-app-muted
          focus:outline-none
          disabled:opacity-50 disabled:cursor-not-allowed
          resize-none text-sm rounded-t-2xl
        "
      />

      {/* Bottom Bar: Mode Selector + Send Button */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-app-border bg-app-card rounded-b-2xl">
        {/* Mode Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleDropdown}
            className="
              flex items-center gap-2 px-3 py-1.5 rounded-lg
              bg-app-card2 border border-app-border hover:border-app-green/30
              text-sm text-app-muted hover:text-app-text
              transition-colors
            "
          >
            <span>{currentModeInfo.icon}</span>
            <span className="hidden sm:inline">{currentModeInfo.label}</span>
            <svg className={`w-4 h-4 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Dropdown - smart positioning with scroll */}
          {showModeDropdown && (
            <div 
              className={`
                absolute left-0 w-56 bg-app-card border border-app-border rounded-xl shadow-2xl z-[100]
                max-h-64 overflow-y-auto
                ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'}
              `}
            >
              {modes.map((mode) => {
                const info = MODE_INFO[mode]
                const isActive = mode === currentMode
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      onModeChange(mode)
                      setShowModeDropdown(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl
                      ${isActive
                        ? 'bg-app-green/15 text-app-green'
                        : 'text-app-muted hover:bg-app-card2 hover:text-app-text'
                      }
                    `}
                  >
                    <span className="text-lg">{info.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{info.label}</div>
                      <div className="text-xs text-app-muted">{info.description}</div>
                    </div>
                    {isActive && (
                      <svg className="w-4 h-4 ml-auto text-app-green" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={onSubmit}
          disabled={isLoading || !value.trim()}
          className="
            w-10 h-10 rounded-xl
            bg-gradient-to-br from-app-green to-emerald-400
            text-app-bg font-bold
            flex items-center justify-center
            hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
            transition-opacity duration-200
          "
          title="Send (Enter)"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
