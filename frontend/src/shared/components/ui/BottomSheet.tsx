import React, { useEffect, useCallback, useRef } from 'react'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  snapPoints?: ('content' | 'half' | 'full')[]
  className?: string
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null)

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--t-overlay)] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Bottom sheet'}
        className={`relative bg-t-surface border-t border-t-border rounded-t-3xl max-h-[85dvh] overflow-y-auto animate-slide-up pb-[env(safe-area-inset-bottom,0px)] ${className}`}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-t-surface z-10">
          <div className="w-10 h-1 rounded-full bg-t-border-strong" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3">
            <h3 className="text-h3 font-semibold text-t-text">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-t-surface-hover text-t-text-muted hover:text-t-text transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}

export default BottomSheet
